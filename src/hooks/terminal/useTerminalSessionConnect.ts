import { useRef, useEffect } from 'react';
import { useMutation } from '@tanstack/react-query';
import { invoke, Channel } from '@tauri-apps/api/core';
import { Terminal } from '@xterm/xterm';
import { PtyEvent } from './types';

/**
 * Hook for connecting to an existing terminal session
 */
export function useTerminalSessionConnect(terminal: Terminal | null) {
    const channelRef = useRef<Channel<PtyEvent> | null>(null);

    // Cleanup listener on unmount. We use a "soft unplug" (empty function) 
    // because Tauri v2 Channels don't have an explicit unlisten/close on the frontend.
    // This stops the UI from processing data while letting the PTY stay alive.
    useEffect(() => {
        return () => {
            if (channelRef.current) {
                channelRef.current.onmessage = () => { };
            }
        };
    }, []);

    const mutation = useMutation({
        mutationFn: async (targetSessionId: string): Promise<string> => {
            if (!terminal) throw new Error("Terminal not initialized");

            // Silence the old listener before attaching a new session to this terminal instance.
            // This prevents "ghost output" from previous sessions appearing in the view.
            if (channelRef.current) {
                channelRef.current.onmessage = () => { };
            }

            // 1. Create channel for output
            const channel = new Channel<PtyEvent>();
            channel.onmessage = (msg) => {
                terminal.write(msg.data);
                terminal.scrollToBottom();
            };

            // 2. Attach channel to existing session
            await invoke('attach_pty_cmd', { sessionId: targetSessionId, channel });
            channelRef.current = channel;

            return targetSessionId;
        },
        onError: (error) => {
            terminal?.write(`\r\nError connecting to session: ${error}\r\n`);
        },
    });

    return {
        sessionId: mutation.data ?? null,
        connect: mutation.mutate,
        isConnecting: mutation.isPending,
        connectError: mutation.error,
        isConnected: mutation.isSuccess,
    };
}
