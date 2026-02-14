import type { RefObject } from "react";

/**
 * Hook stub — xterm.js has been removed.
 * The container ref is still accepted so callers keep their layout div.
 * A replacement terminal library will be wired in here.
 */
export function useXterm(
  _containerRef: RefObject<HTMLDivElement | null>,
  _options?: Record<string, unknown>,
) {
  return { terminal: null };
}
