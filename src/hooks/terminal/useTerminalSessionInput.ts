import { useEffect } from 'react';
import { Terminal } from '@xterm/xterm';
import { emit } from '@tauri-apps/api/event';
import * as log from "@tauri-apps/plugin-log";

/**
 * Hook for handling terminal input data (terminal -> PTY)
 */
export function useTerminalSessionInput(
    terminal: Terminal | null,
    sessionId: string | null
) {
    useEffect(() => {
        if (!terminal || !sessionId) return;

        const disposable = terminal.onData((data) => {
            emit('pty-input', { sessionId, data })
                .catch((e) => log.error("Failed to emit pty-input:", e));
        });

        return () => disposable.dispose();
    }, [terminal, sessionId]);
}
