import { useEffect, RefObject } from 'react';
import { Terminal } from '@xterm/xterm';
import { invoke } from '@tauri-apps/api/core';
import * as log from "@tauri-apps/plugin-log";

/**
 * Hook for handling terminal resize events (terminal -> PTY)
 */
export function useTerminalResize(
    terminalRef: RefObject<Terminal | null>,
    sessionId: string | null
) {
    useEffect(() => {
        const terminal = terminalRef.current;
        if (!terminal || !sessionId) return;

        const disposable = terminal.onResize((size) => {
            invoke('resize_pty_cmd', { sessionId, rows: size.rows, cols: size.cols })
                .catch((e) => log.error("Failed to resize_pty:", e));
        });

        return () => disposable.dispose();
    }, [terminalRef, sessionId]);
}
