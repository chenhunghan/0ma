/**
 * Hook stub for handling terminal resize events (terminal -> PTY).
 *
 * xterm.js removed — terminal.onResize() no longer available.
 * Wire in the replacement terminal's resize event here.
 */
export function useTerminalSessionResize(_sessionId: string | null) {
  // No-op until replacement terminal is wired in
}
