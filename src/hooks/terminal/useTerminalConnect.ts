import { useRef, RefObject } from 'react';
import { useMutation } from '@tanstack/react-query';
import { invoke, Channel } from '@tauri-apps/api/core';
import { Terminal } from '@xterm/xterm';
import { useTerminalData } from './useTerminalData';
import { useTerminalResize } from './useTerminalResize';
import { PtyEvent } from './types';

/**
 * Hook for connecting to an existing terminal session
 */
export function useTerminalConnect(terminalRef: RefObject<Terminal | null>) {
    const channelRef = useRef<Channel<PtyEvent> | null>(null);

    const mutation = useMutation({
        mutationFn: async (targetSessionId: string): Promise<string> => {
            const terminal = terminalRef.current;
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
            terminalRef.current?.write(`\r\nError connecting to session: ${error}\r\n`);
        },
    });

    // Setup I/O listeners
    const sessionId = mutation.data ?? null;
    useTerminalData(terminalRef, sessionId);
    useTerminalResize(terminalRef, sessionId);

    return {
        sessionId,
        connect: mutation.mutate,
        isConnecting: mutation.isPending,
        connectError: mutation.error,
        isConnected: mutation.isSuccess,
    };
}
