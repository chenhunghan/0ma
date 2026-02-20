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
 * Row compensation for sub-pixel rounding accumulation.
 * The device-pixel-space math uses Math.ceil on char height and Math.floor on
 * line height — each step adds a fraction of a pixel per row. Over 30+ rows
 * those fractions accumulate enough to push the last row past the container
 * boundary, clipping it. Subtracting this value (in row units) from the
 * calculated row count keeps every visible row fully within bounds.
 */
const ROW_ROUNDING_COMPENSATION_DEFAULT = 1.6;
/**
 * Reduced compensation for upper-row terminals in multi-row layouts (>5 panes).
 * Upper rows have less accumulated rounding error because the resizable panel
 * boundary absorbs some of the sub-pixel slack.
 */
const ROW_ROUNDING_COMPENSATION_UPPER = 0.1;

/**
 * Calculate terminal dimensions following VS Code's approach:
 * all math in device-pixel space to match xterm's internal canvas rounding.
 * Used for initial fit only.
 */
// oxlint-disable-next-line max-statements
function computeDimensions(term: Terminal, container: HTMLElement, compensation: number) {
  const core = (term as any)._core;
  const cellDims = core._renderService?.dimensions?.css?.cell;
  if (!cellDims || cellDims.width === 0 || cellDims.height === 0) return null;

  // Ignore resizes when the container is display: none (e.g. inactive tabs)
  // This prevents the PTY from aggressively resizing to 1x1 and destroying layout
  if (container.clientWidth === 0 || container.clientHeight === 0) return null;

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
  const availWidth = container.clientWidth - padH;
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
    Math.floor(scaledHeightAvailable / scaledLineHeight - compensation),
  );

  return { cols, rows, cellWidth: cellDims.width, cellHeight: cellDims.height };
}

/**
 * Lightweight resize used by ResizeObserver after initial fit.
 * Reads cell dimensions directly from xterm's render service and
 * does simple division — no device-pixel scaling needed for ongoing resizes.
 */
function safeFit(term: Terminal, compensation: number) {
  const core = (term as any)._core;
  const cellHeight: number = core._renderService?.dimensions?.css?.cell?.height;
  const cellWidth: number = core._renderService?.dimensions?.css?.cell?.width;
  const container = term.element?.parentElement;
  if (!container || !cellHeight || !cellWidth) return null;

  // Ignore resizes when the container is display: none (e.g. inactive tabs)
  // This prevents the PTY from aggressively resizing to 1x1 and destroying layout
  if (container.clientWidth === 0 || container.clientHeight === 0) return null;

  const xtermEl = term.element;
  let padH = 0;
  if (xtermEl) {
    const style = getComputedStyle(xtermEl);
    padH = parseInt(style.paddingLeft) + parseInt(style.paddingRight);
  }

  const cols = Math.max(1, Math.floor((container.clientWidth - padH) / cellWidth));
  const rows = Math.max(1, Math.floor(container.clientHeight / cellHeight - compensation));

  return { cols, rows, cellWidth, cellHeight };
}

/**
 * Hook that observes the container for size changes and calls
 * term.resize(), then notifies the PTY backend.
 *
 * Uses computeDimensions() (VS Code device-pixel approach) for the initial fit,
 * and safeFit() (simple cell-dimension division) for ongoing ResizeObserver resizes.
 */
export function useXtermResize(
  term: Terminal | null,
  containerRef: RefObject<HTMLDivElement | null>,
  sessionId: string | null,
  isUpperRow = false,
) {
  const compensation = isUpperRow
    ? ROW_ROUNDING_COMPENSATION_UPPER
    : ROW_ROUNDING_COMPENSATION_DEFAULT;
  const [dims, setDims] = useState<{
    cols: number;
    rows: number;
    cellWidth: number;
    cellHeight: number;
  }>({ cols: 80, rows: 24, cellWidth: 9, cellHeight: 18 });
  const timerRef = useRef(0);
  const sessionIdRef = useRef(sessionId);
  sessionIdRef.current = sessionId;

  const fitAndNotify = useCallback(() => {
    if (!term) return;

    const result = safeFit(term, compensation);
    if (!result) return;
    if (result.cols === term.cols && result.rows === term.rows) return;

    term.resize(result.cols, result.rows);

    log.debug(`[useXtermResize] Resized: ${result.cols}x${result.rows}`);

    // Notify PTY backend
    const sid = sessionIdRef.current;
    if (sid) {
      invoke("resize_pty_cmd", {
        sessionId: sid,
        cols: result.cols,
        rows: result.rows,
      }).catch((e) => log.error(`[useXtermResize] resize_pty_cmd failed: ${e}`));
    }

    setDims(result);
  }, [term, compensation]);

  // Sync PTY size when sessionId becomes available (e.g. after spawn or reconnect)
  // This is crucial because the initial fit might happen before the PTY is spawned,
  // causing the PTY to get stuck at default 80x24 dims until the user resizes.
  useEffect(() => {
    if (term && sessionId) {
      invoke("resize_pty_cmd", {
        sessionId,
        cols: term.cols,
        rows: term.rows,
      }).catch((e) => log.error(`[useXtermResize] initial resize_pty_cmd failed: ${e}`));
    }
  }, [term, sessionId]);

  useEffect(() => {
    const container = containerRef.current;
    if (!term || !container) return;

    // Initial fit — VS Code approach (conservative rounding in device-pixel space)
    const initial = computeDimensions(term, container, compensation);
    if (initial) {
      term.resize(initial.cols, initial.rows);
      setDims(initial);
    }

    const observer = new ResizeObserver(() => {
      clearTimeout(timerRef.current);
      timerRef.current = window.setTimeout(fitAndNotify, RESIZE_DEBOUNCE_MS);
    });
    observer.observe(container);

    return () => {
      clearTimeout(timerRef.current);
      observer.disconnect();
    };
  }, [term, containerRef, fitAndNotify, compensation]);

  return dims;
}
