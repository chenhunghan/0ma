import { useEffect } from "react";
import { Terminal } from "@xterm/xterm";
import { invoke } from "@tauri-apps/api/core";
import * as log from "@tauri-apps/plugin-log";
import debounce from "lodash/debounce";

/**
 * Hook for handling terminal resize events (terminal -> PTY)
 */
export function useTerminalSessionResize(terminal: Terminal | null, sessionId: string | null) {
  useEffect(() => {
    if (!terminal || !sessionId) return;

    // Use debounce to prevent spamming the backend PTY during smooth drag/animations.
    // 100ms is a good balance between responsiveness and PTY stability.
    const debouncedResize = debounce((size: { rows: number; cols: number }) => {
      invoke("resize_pty_cmd", { sessionId, rows: size.rows, cols: size.cols })
        .then(() => log.debug(`Resized PTY to ${size.rows}x${size.cols}`))
        .catch((e) => log.error("Failed to resize_pty:", e));
    }, 100);

    const disposable = terminal.onResize((size) => {
      debouncedResize(size);
    });

    return () => {
      disposable.dispose();
      debouncedResize.cancel();
    };
  }, [terminal, sessionId]);
}
