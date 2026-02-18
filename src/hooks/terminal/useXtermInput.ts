import { useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import * as log from "@tauri-apps/plugin-log";
import type { Terminal } from "@xterm/xterm";

/**
 * Hook that wires xterm's input events to the PTY backend.
 *
 * xterm handles keyboard, mouse, paste, and focus events internally
 * and emits already-encoded terminal data via onData/onBinary.
 *
 * When sessionId is null (read-only mode), no input is wired.
 */
export function useXtermInput(term: Terminal | null, sessionId: string | null): void {
  useEffect(() => {
    if (!term || !sessionId) return;

    // xterm fires onData with already-encoded terminal input strings
    const dataDisposable = term.onData((data: string) => {
      invoke("write_pty_cmd", { sessionId, data }).catch((e) =>
        log.error(`[useXtermInput] write_pty_cmd failed: ${e}`),
      );
    });

    // xterm fires onBinary for binary data (e.g., from mouse protocol)
    const binaryDisposable = term.onBinary((data: string) => {
      invoke("write_pty_cmd", { sessionId, data }).catch((e) =>
        log.error(`[useXtermInput] write_pty_cmd binary failed: ${e}`),
      );
    });

    return () => {
      dataDisposable.dispose();
      binaryDisposable.dispose();
    };
  }, [term, sessionId]);
}
