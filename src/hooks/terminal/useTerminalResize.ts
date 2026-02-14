import type { RefObject } from "react";
import { useCallback } from "react";

interface UseTerminalResizeOptions {
  containerRef: RefObject<HTMLDivElement | null>;
  terminal: unknown;
  isActive?: boolean;
}

/**
 * Hook stub — xterm.js has been removed.
 * Keeps the same public API so callers don't break.
 * A replacement terminal library will provide real resize logic.
 */
export function useTerminalResize(_options: UseTerminalResizeOptions) {
  const fitTerminal = useCallback(() => false, []);
  const onDragEnd = useCallback(() => {}, []);
  const onDragStart = useCallback(() => {}, []);
  const waitForReady = useCallback((): Promise<boolean> => Promise.resolve(false), []);

  return { fitTerminal, onDragEnd, onDragStart, waitForReady };
}
