import { useRef } from 'react';
import { useMutation } from '@tanstack/react-query';
import { invoke, Channel } from '@tauri-apps/api/core';
import { Terminal } from '@xterm/xterm';
import { useTerminalSessionData } from './useTerminalSessionData';
import { useTerminalSessionResize } from './useTerminalSessionResize';
import { PtyEvent } from './types';

/**
 * Hook for connecting to an existing terminal session
 */
export function useTerminalSessionConnect(terminal: Terminal | null) {
    const channelRef = useRef<Channel<PtyEvent> | null>(null);

    const mutation = useMutation({
        mutationFn: async (targetSessionId: string): Promise<string> => {
            if (!terminal) throw new Error("Terminal not initialized");

            // Create channel for output
            const channel = new Channel<PtyEvent>();
            channel.onmessage = (msg) => {
                terminal.write(msg.data);
                terminal.scrollToBottom();
            };

            // Attach channel to existing session
            await invoke('attach_pty_cmd', { sessionId: targetSessionId, channel });
            channelRef.current = channel;

            return targetSessionId;
        },
        onError: (error) => {
            terminal?.write(`\r\nError connecting to session: ${error}\r\n`);
        },
    });

    // Setup I/O listeners
    const sessionId = mutation.data ?? null;
    useTerminalSessionData(terminal, sessionId);
    useTerminalSessionResize(terminal, sessionId);

    return {
        sessionId,
        connect: mutation.mutate,
        isConnecting: mutation.isPending,
        connectError: mutation.error,
        isConnected: mutation.isSuccess,
    };
}
