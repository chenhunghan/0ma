import type { RefObject } from "react";
import { useCallback, useEffect, useRef, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import * as log from "@tauri-apps/plugin-log";
import type { Terminal } from "@xterm/xterm";
import { TERMINAL_METRICS } from "./config";

/**
 * Wait this long after the last ResizeObserver event before doing anything.
 * Both term.resize() and resize_pty_cmd fire together — once.
 */
const RESIZE_DEBOUNCE_MS = 200;

/**
 * Calculate terminal dimensions following VS Code's approach:
 * all math in device-pixel space to match xterm's internal canvas rounding.
 */
// oxlint-disable-next-line max-statements
function computeDimensions(term: Terminal, container: HTMLElement) {
  const core = (term as any)._core;
  const cellDims = core._renderService?.dimensions?.css?.cell;
  if (!cellDims || cellDims.width === 0 || cellDims.height === 0) return null;

  const dpr = window.devicePixelRatio || 1;
  const lineHeight = term.options.lineHeight ?? 1;
  const letterSpacing = term.options.letterSpacing ?? 0;

  // Reverse-engineer base char metrics from xterm's composite cell dims
  const charHeight = cellDims.height / lineHeight;
  const charWidth = cellDims.width - Math.round(letterSpacing) / dpr;

  // Read padding from xterm's element
  const xtermEl = term.element;
  let padH = 0;
  let padV = 0;
  if (xtermEl) {
    const style = getComputedStyle(xtermEl);
    padH = parseInt(style.paddingLeft) + parseInt(style.paddingRight);
    padV = parseInt(style.paddingTop) + parseInt(style.paddingBottom);
  }

  // Available space in CSS pixels, then scale to device pixels
  const availWidth = container.clientWidth - padH - TERMINAL_METRICS.scrollbarWidth;
  const availHeight = container.clientHeight - padV;

  // VS Code: getXtermScaledDimensions — all math in device pixel space
  const scaledWidthAvailable = availWidth * dpr;
  const scaledCharWidth = charWidth * dpr + letterSpacing;
  const cols = Math.max(
    TERMINAL_METRICS.minimumCols,
    Math.floor(scaledWidthAvailable / scaledCharWidth),
  );

  const scaledHeightAvailable = availHeight * dpr;
  const scaledCharHeight = Math.ceil(charHeight * dpr);
  const scaledLineHeight = Math.floor(scaledCharHeight * lineHeight);
  const rows = Math.max(
    TERMINAL_METRICS.minimumRows,
    Math.floor(scaledHeightAvailable / scaledLineHeight),
  );

  return { cols, rows, cellWidth: cellDims.width, cellHeight: cellDims.height };
}

/**
 * Hook that observes the container for size changes and calls
 * term.resize(), then notifies the PTY backend.
 *
 * Both resize and PTY notification are deferred until resizing stops to avoid
 * intermediate reflows that corrupt the terminal display.
 */
export function useXtermResize(
  term: Terminal | null,
  containerRef: RefObject<HTMLDivElement | null>,
  sessionId: string | null,
) {
  const [dims, setDims] = useState<{
    cols: number;
    rows: number;
    cellWidth: number;
    cellHeight: number;
  }>({ cols: 80, rows: 24, cellWidth: 9, cellHeight: 18 });
  const timerRef = useRef(0);
  const lastColsRows = useRef({ cols: 0, rows: 0 });
  const sessionIdRef = useRef(sessionId);
  sessionIdRef.current = sessionId;

  const fitAndNotify = useCallback(() => {
    const container = containerRef.current;
    if (!term || !container) return;

    const newDims = computeDimensions(term, container);
    if (!newDims) return;
    if (
      newDims.cols === lastColsRows.current.cols &&
      newDims.rows === lastColsRows.current.rows
    )
      return;

    lastColsRows.current = { cols: newDims.cols, rows: newDims.rows };

    // Resize xterm's internal grid
    term.resize(newDims.cols, newDims.rows);

    log.debug(`[useXtermResize] Resized: ${newDims.cols}x${newDims.rows}`);

    // Notify PTY backend
    const sid = sessionIdRef.current;
    if (sid) {
      invoke("resize_pty_cmd", {
        sessionId: sid,
        cols: newDims.cols,
        rows: newDims.rows,
      }).catch((e) => log.error(`[useXtermResize] resize_pty_cmd failed: ${e}`));
    }

    setDims(newDims);
  }, [term, containerRef]);

  useEffect(() => {
    const container = containerRef.current;
    if (!term || !container) return;

    // Reset tracking so initial fit always runs
    lastColsRows.current = { cols: 0, rows: 0 };

    // Initial fit (synchronous, no PTY notification — spawn/connect sends initial dims)
    const initial = computeDimensions(term, container);
    if (initial) {
      term.resize(initial.cols, initial.rows);
      lastColsRows.current = { cols: initial.cols, rows: initial.rows };
      setDims(initial);
    }

    let initFired = false;
    const observer = new ResizeObserver(() => {
      if (!initFired) {
        initFired = true;
        return; // skip first fire — init already handled above
      }
      clearTimeout(timerRef.current);
      timerRef.current = window.setTimeout(fitAndNotify, RESIZE_DEBOUNCE_MS);
    });
    observer.observe(container);

    return () => {
      clearTimeout(timerRef.current);
      observer.disconnect();
    };
  }, [term, containerRef, fitAndNotify]);

  return dims;
}
