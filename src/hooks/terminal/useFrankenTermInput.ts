import type { RefObject } from "react";
import { useEffect, useRef } from "react";
import { invoke } from "@tauri-apps/api/core";
import * as log from "@tauri-apps/plugin-log";
import type { FrankenTermWeb } from "src/wasm/frankenterm-web/FrankenTerm";
import { CELL_WIDTH, CELL_HEIGHT } from "./config";

const textDecoder = new TextDecoder();

/**
 * Drain encoded input bytes from FrankenTerm and send to PTY via write_pty_cmd.
 */
function flushInputBytes(term: FrankenTermWeb, sessionId: string) {
  const chunks = term.drainEncodedInputBytes();
  for (let i = 0; i < chunks.length; i++) {
    const chunk = chunks[i] as Uint8Array;
    if (chunk.length > 0) {
      const data = textDecoder.decode(chunk);
      invoke("write_pty_cmd", { sessionId, data }).catch((e) =>
        log.error(`[flushInputBytes] write_pty_cmd failed: ${e}`),
      );
    }
  }
}

/**
 * Convert mouse event to cell coordinates using FrankenTerm cell dimensions.
 */
function cellCoordsFromMouse(e: MouseEvent): [number, number] {
  const canvas = e.target as HTMLCanvasElement;
  const rect = canvas.getBoundingClientRect();
  const x = Math.floor((e.clientX - rect.left) / CELL_WIDTH);
  const y = Math.floor((e.clientY - rect.top) / CELL_HEIGHT);
  return [Math.max(0, x), Math.max(0, y)];
}

/**
 * Hook that wires keyboard, mouse, paste, and focus events from the canvas
 * to FrankenTermWeb, then flushes encoded input bytes to the PTY.
 */
export function useFrankenTermInput(
  term: FrankenTermWeb | null,
  sessionId: string | null,
  canvasRef: RefObject<HTMLCanvasElement | null>,
) {
  const colsRef = useRef(80);
  const selectionStartRef = useRef(-1);
  const selectingRef = useRef(false);
  const skipFocusFlushRef = useRef(true);

  // Track current cols for selection offset calculation
  useEffect(() => {
    if (!term) return;
    try {
      const vs = term.viewportState();
      if (vs?.gridRows) {
        // fitToContainer returns geometry; use it when available
      }
    } catch {
      // ignore
    }
  }, [term]);

  // oxlint-disable-next-line max-statements
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!term || !sessionId || !canvas) return;

    // Reset focus skip on new session
    skipFocusFlushRef.current = true;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Cmd/Ctrl+C with selection → copy to clipboard
      if ((e.metaKey || e.ctrlKey) && e.key === "c") {
        const text = term.copySelection();
        if (text) {
          navigator.clipboard.writeText(text);
          e.preventDefault();
          return;
        }
      }
      // Cmd/Ctrl+V → let browser paste event fire
      if ((e.metaKey || e.ctrlKey) && e.key === "v") {
        return;
      }
      e.preventDefault();
      term.input({
        kind: "key",
        phase: "down",
        key: e.key,
        code: e.code,
        repeat: e.repeat,
        shiftKey: e.shiftKey,
        ctrlKey: e.ctrlKey,
        altKey: e.altKey,
        metaKey: e.metaKey,
      });
      flushInputBytes(term, sessionId);
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      term.input({
        kind: "key",
        phase: "up",
        key: e.key,
        code: e.code,
        repeat: false,
        shiftKey: e.shiftKey,
        ctrlKey: e.ctrlKey,
        altKey: e.altKey,
        metaKey: e.metaKey,
      });
      flushInputBytes(term, sessionId);
    };

    const handleMouseDown = (e: MouseEvent) => {
      const [x, y] = cellCoordsFromMouse(e);
      if (e.button === 0) {
        selectionStartRef.current = y * colsRef.current + x;
        selectingRef.current = true;
        term.clearSelection();
      }
      term.input({
        kind: "mouse",
        phase: "down",
        x,
        y,
        button: e.button,
        shiftKey: e.shiftKey,
        ctrlKey: e.ctrlKey,
        altKey: e.altKey,
        metaKey: e.metaKey,
      });
      flushInputBytes(term, sessionId);
    };

    const handleMouseUp = (e: MouseEvent) => {
      const [x, y] = cellCoordsFromMouse(e);
      selectingRef.current = false;
      term.input({
        kind: "mouse",
        phase: "up",
        x,
        y,
        button: e.button,
        shiftKey: e.shiftKey,
        ctrlKey: e.ctrlKey,
        altKey: e.altKey,
        metaKey: e.metaKey,
      });
      flushInputBytes(term, sessionId);
    };

    const handleMouseMove = (e: MouseEvent) => {
      const [x, y] = cellCoordsFromMouse(e);
      if (selectingRef.current && e.buttons === 1) {
        const selectionEnd = y * colsRef.current + x;
        term.setSelectionRange(selectionStartRef.current, selectionEnd);
      }
      term.input({
        kind: "mouse",
        phase: e.buttons ? "drag" : "move",
        x,
        y,
        button: e.button,
        shiftKey: e.shiftKey,
        ctrlKey: e.ctrlKey,
        altKey: e.altKey,
        metaKey: e.metaKey,
      });
      flushInputBytes(term, sessionId);
    };

    const handleWheel = (e: WheelEvent) => {
      const [x, y] = cellCoordsFromMouse(e);
      term.input({
        kind: "wheel",
        x,
        y,
        dx: Math.sign(e.deltaX),
        dy: Math.sign(e.deltaY),
        shiftKey: e.shiftKey,
        ctrlKey: e.ctrlKey,
        altKey: e.altKey,
        metaKey: e.metaKey,
      });
      flushInputBytes(term, sessionId);
    };

    const handlePaste = (e: ClipboardEvent) => {
      const text = e.clipboardData?.getData("text");
      if (text) {
        term.pasteText(text);
        flushInputBytes(term, sessionId);
      }
    };

    const handleFocus = () => {
      term.input({ kind: "focus", focused: true });
      if (skipFocusFlushRef.current) {
        skipFocusFlushRef.current = false;
        // Drain the focus escape sequence but don't send to PTY
        term.drainEncodedInputBytes();
        return;
      }
      flushInputBytes(term, sessionId);
    };

    const handleBlur = () => {
      term.input({ kind: "focus", focused: false });
      flushInputBytes(term, sessionId);
    };

    canvas.addEventListener("keydown", handleKeyDown);
    canvas.addEventListener("keyup", handleKeyUp);
    canvas.addEventListener("mousedown", handleMouseDown);
    canvas.addEventListener("mouseup", handleMouseUp);
    canvas.addEventListener("mousemove", handleMouseMove);
    canvas.addEventListener("wheel", handleWheel, { passive: true });
    canvas.addEventListener("paste", handlePaste);
    canvas.addEventListener("focus", handleFocus);
    canvas.addEventListener("blur", handleBlur);

    return () => {
      canvas.removeEventListener("keydown", handleKeyDown);
      canvas.removeEventListener("keyup", handleKeyUp);
      canvas.removeEventListener("mousedown", handleMouseDown);
      canvas.removeEventListener("mouseup", handleMouseUp);
      canvas.removeEventListener("mousemove", handleMouseMove);
      canvas.removeEventListener("wheel", handleWheel);
      canvas.removeEventListener("paste", handlePaste);
      canvas.removeEventListener("focus", handleFocus);
      canvas.removeEventListener("blur", handleBlur);
    };
  }, [term, sessionId, canvasRef]);

  /** Update cols for selection offset calculation (call after resize). */
  const updateCols = (cols: number) => {
    colsRef.current = cols;
  };

  return { updateCols };
}
