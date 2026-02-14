import type { RefObject } from "react";
import { useCallback, useEffect, useRef, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import * as log from "@tauri-apps/plugin-log";
import type { FrankenTermWeb } from "src/wasm/frankenterm-web/FrankenTerm";
import { CELL_WIDTH, CELL_HEIGHT } from "./config";

/**
 * Wait this long after the last ResizeObserver event before doing anything.
 * Both fitToContainer() and resize_pty_cmd fire together — once.
 */
const RESIZE_DEBOUNCE_MS = 200;

/** Attempt fitToContainer, return new geometry or null on failure / no-op. */
function tryFit(
  term: FrankenTermWeb,
  w: number,
  h: number,
  lastPixelSize: React.RefObject<{ w: number; h: number }>,
) {
  // Skip when container is hidden (0×0) — e.g. inactive tab
  if (w === 0 || h === 0) return null;

  // Skip if pixel size hasn't changed (avoids flash on tab switch)
  if (w === lastPixelSize.current.w && h === lastPixelSize.current.h) return null;
  lastPixelSize.current = { w, h };

  const dpr = window.devicePixelRatio || 1;
  try {
    const geo = term.fitToContainer(w, h, dpr);
    const cols = geo.cols as number;
    const rows = geo.rows as number;
    return {
      cols,
      rows,
      cellWidth: w / cols,
      cellHeight: h / rows,
    };
  } catch (e) {
    log.error(`[useFrankenTermResize] fitToContainer error: ${e}`);
    return null;
  }
}

/**
 * Hook that observes the container for size changes and calls
 * FrankenTermWeb.fitToContainer(), then notifies the PTY backend.
 *
 * Both fit and PTY notification are deferred until resizing stops to avoid
 * intermediate reflows that corrupt the terminal display.
 */
export function useFrankenTermResize(
  term: FrankenTermWeb | null,
  containerRef: RefObject<HTMLDivElement | null>,
  sessionId: string | null,
) {
  const [dims, setDims] = useState<{
    cols: number;
    rows: number;
    cellWidth: number;
    cellHeight: number;
  }>({ cols: 80, rows: 24, cellWidth: CELL_WIDTH, cellHeight: CELL_HEIGHT });
  const timerRef = useRef(0);
  const lastPixelSize = useRef<{ w: number; h: number }>({ w: 0, h: 0 });
  const sessionIdRef = useRef(sessionId);
  sessionIdRef.current = sessionId;

  const fitAndNotify = useCallback(() => {
    const container = containerRef.current;
    if (!term || !container) return;

    const newGeo = tryFit(term, container.clientWidth, container.clientHeight, lastPixelSize);
    if (!newGeo) return;

    setDims((prev) => {
      if (prev.cols === newGeo.cols && prev.rows === newGeo.rows) return prev;

      log.debug(`[useFrankenTermResize] Resized: ${newGeo.cols}x${newGeo.rows}`);

      const sid = sessionIdRef.current;
      if (sid) {
        invoke("resize_pty_cmd", { sessionId: sid, cols: newGeo.cols, rows: newGeo.rows }).catch(
          (e) => log.error(`[useFrankenTermResize] resize_pty_cmd failed: ${e}`),
        );
      }

      return newGeo;
    });
  }, [term, containerRef]);

  useEffect(() => {
    const container = containerRef.current;
    if (!term || !container) return;

    // Reset pixel tracking so initial fit always runs
    lastPixelSize.current = { w: 0, h: 0 };

    // Initial fit (synchronous, no PTY notification — spawn/connect sends initial dims)
    const initial = tryFit(term, container.clientWidth, container.clientHeight, lastPixelSize);
    if (initial) {
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
    // sessionId intentionally NOT in deps — accessed via ref to avoid
    // re-subscribing the observer when sessionId changes
  }, [term, containerRef, fitAndNotify]);

  return dims;
}
