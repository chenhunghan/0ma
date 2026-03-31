import type { RefObject } from "react";
import { useEffect, useRef, useState } from "react";
import { Terminal } from "@xterm/xterm";
import { WebglAddon } from "@xterm/addon-webgl";
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
export function useXterm(containerRef: RefObject<HTMLDivElement | null>, fontSize?: number) {
  const [term, setTerm] = useState<Terminal | null>(null);
  const [geometry, setGeometry] = useState<TermGeometry | null>(null);
  const disposedRef = useRef(false);
  const fontSizeRef = useRef(fontSize);

  // Create terminal once (fontSize used only for initial creation)
  // oxlint-disable-next-line max-statements
  useEffect(() => {
    disposedRef.current = false;
    const container = containerRef.current;
    if (!container) return;

    const initialFontSize = fontSizeRef.current;
    const options = initialFontSize ? { ...XTERM_OPTIONS, fontSize: initialFontSize } : XTERM_OPTIONS;
    const t = new Terminal(options);
    t.open(container);

    // GPU-accelerated rendering via WebGL, falls back to DOM if unavailable
    try {
      const webgl = new WebglAddon();
      webgl.onContextLoss(() => {
        webgl.dispose();
        log.warn("[useXterm] WebGL context lost, falling back to DOM renderer");
      });
      t.loadAddon(webgl);
      log.debug("[useXterm] WebGL renderer loaded");
    } catch (e) {
      log.warn(`[useXterm] WebGL unavailable, using DOM renderer: ${e}`);
    }

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

  // Update font size at runtime without recreating the terminal
  useEffect(() => {
    if (!term || !fontSize || fontSize === fontSizeRef.current) return;
    fontSizeRef.current = fontSize;
    term.options.fontSize = fontSize;
    term.refresh(0, term.rows - 1);
  }, [term, fontSize]);

  return { term, geometry };
}
