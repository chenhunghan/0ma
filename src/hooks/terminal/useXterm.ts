import type { RefObject } from "react";
import { useEffect, useRef, useState } from "react";
import { Terminal } from "@xterm/xterm";
import * as log from "@tauri-apps/plugin-log";
import { XTERM_OPTIONS } from "./config";
import "@xterm/xterm/css/xterm.css";

export interface TermGeometry {
  cols: number;
  rows: number;
  cellWidthPx: number;
  cellHeightPx: number;
}

/**
 * Hook that creates and manages an xterm Terminal instance.
 *
 * - Creates the Terminal with configured options
 * - Attaches to the container div via term.open()
 * - Returns the term instance and initial geometry
 */
export function useXterm(containerRef: RefObject<HTMLDivElement | null>) {
  const [term, setTerm] = useState<Terminal | null>(null);
  const [geometry, setGeometry] = useState<TermGeometry | null>(null);
  const disposedRef = useRef(false);

  // oxlint-disable-next-line max-statements
  useEffect(() => {
    disposedRef.current = false;
    const container = containerRef.current;
    if (!container) return;

    const t = new Terminal(XTERM_OPTIONS);
    t.open(container);

    // Read actual cell dimensions from xterm internals (VS Code pattern)
    const core = (t as any)._core;
    const cellDims = core._renderService?.dimensions?.css?.cell;
    const cellW = cellDims?.width ?? 9;
    const cellH = cellDims?.height ?? 18;

    const cols = t.cols;
    const rows = t.rows;

    log.debug(`[useXterm] Initialized: ${cols}x${rows} (${cellW}x${cellH}px/cell)`);

    setTerm(t);
    setGeometry({ cols, rows, cellWidthPx: cellW, cellHeightPx: cellH });

    t.focus();

    return () => {
      disposedRef.current = true;
      t.dispose();
      setTerm(null);
      setGeometry(null);
    };
  }, [containerRef]);

  return { term, geometry };
}
