import { useEffect } from "react";
import type { Terminal } from "@xterm/xterm";
import { invoke } from "@tauri-apps/api/core";
import * as log from "@tauri-apps/plugin-log";
import debounce from "lodash/debounce";

/**
 * Hook for handling terminal resize events (terminal -> PTY)
 */
export function useTerminalSessionResize(terminal: Terminal | null, sessionId: string | null) {
  useEffect(() => {
    if (!terminal || !sessionId) {return;}

    // Use debounce to prevent spamming the backend PTY during smooth drag/animations.
    // 100ms is a good balance between responsiveness and PTY stability.
    const debouncedResize = debounce((size: { rows: number; cols: number }) => {
      invoke("resize_pty_cmd", { cols: size.cols, rows: size.rows, sessionId })
        .then(() => log.debug(`Resized PTY to ${size.rows}x${size.cols}`))
        .catch((error) => log.error("Failed to resize_pty:", error));
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
