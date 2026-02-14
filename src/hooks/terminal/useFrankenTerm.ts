import type { RefObject } from "react";
import { useEffect, useRef, useState } from "react";
import * as log from "@tauri-apps/plugin-log";
import type { FrankenTermWeb } from "src/wasm/frankenterm-web/FrankenTerm";
import { CELL_WIDTH, CELL_HEIGHT, FRANKENTERM_INIT_OPTIONS } from "./config";

export interface TermGeometry {
  cols: number;
  rows: number;
  cellWidthPx: number;
  cellHeightPx: number;
}

/**
 * Hook that creates and manages a FrankenTermWeb WASM instance.
 *
 * - Creates a <canvas> inside the container div
 * - Loads WASM, initializes FrankenTermWeb with WebGPU
 * - Runs a requestAnimationFrame render loop
 * - Returns the term instance and initial geometry
 */
export function useFrankenTerm(containerRef: RefObject<HTMLDivElement | null>) {
  const [term, setTerm] = useState<FrankenTermWeb | null>(null);
  const [geometry, setGeometry] = useState<TermGeometry | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const rafRef = useRef<number>(0);
  const disposedRef = useRef(false);

  useEffect(() => {
    disposedRef.current = false;
    const container = containerRef.current;
    if (!container) return;

    // Create canvas element inside container
    const canvas = document.createElement("canvas");
    canvas.style.display = "block";
    canvas.style.width = "100%";
    canvas.style.height = "100%";
    canvas.style.imageRendering = "pixelated";
    canvas.style.touchAction = "none";
    canvas.style.userSelect = "none";
    canvas.style.outline = "none";
    canvas.tabIndex = 0;
    container.appendChild(canvas);
    canvasRef.current = canvas;

    let termInstance: FrankenTermWeb | null = null;

    // oxlint-disable-next-line max-statements
    (async () => {
      // Dynamic import to avoid issues when WASM isn't built yet
      const { default: init, FrankenTermWeb } =
        await import("src/wasm/frankenterm-web/FrankenTerm");
      await init();
      if (disposedRef.current) return;

      const dpr = window.devicePixelRatio || 1;
      const initialCols = Math.max(1, Math.floor(container.clientWidth / CELL_WIDTH));
      const initialRows = Math.max(1, Math.floor(container.clientHeight / CELL_HEIGHT));

      const t = new FrankenTermWeb();
      await t.init(canvas, {
        ...FRANKENTERM_INIT_OPTIONS,
        cols: initialCols,
        rows: initialRows,
        dpr,
      });
      if (disposedRef.current) {
        t.destroy();
        return;
      }

      // Sync geometry with actual container
      const geo = t.fitToContainer(container.clientWidth, container.clientHeight, dpr);
      termInstance = t;

      log.debug(
        `[useFrankenTerm] Initialized: ${geo.cols}x${geo.rows} (${geo.cellWidthPx}x${geo.cellHeightPx}px/cell)`,
      );

      setTerm(t);
      setGeometry({
        cols: geo.cols,
        rows: geo.rows,
        cellWidthPx: geo.cellWidthPx ?? CELL_WIDTH,
        cellHeightPx: geo.cellHeightPx ?? CELL_HEIGHT,
      });

      // Start render loop — stop on error to avoid flooding a poisoned WASM instance
      const renderLoop = () => {
        if (disposedRef.current) return;
        try {
          t.render();
        } catch (e) {
          log.error(`[useFrankenTerm] render error (loop stopped): ${e}`);
          return;
        }
        rafRef.current = requestAnimationFrame(renderLoop);
      };
      rafRef.current = requestAnimationFrame(renderLoop);

      // Focus canvas for keyboard input
      canvas.focus();
    })().catch((e) => {
      log.error(`[useFrankenTerm] init failed: ${e}`);
    });

    return () => {
      disposedRef.current = true;
      cancelAnimationFrame(rafRef.current);
      if (termInstance) {
        termInstance.destroy();
      }
      if (canvas.parentNode) {
        canvas.parentNode.removeChild(canvas);
      }
      canvasRef.current = null;
      setTerm(null);
      setGeometry(null);
    };
  }, [containerRef]);

  return { term, geometry, canvasRef };
}
