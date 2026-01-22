import { useRef } from 'react';
import { useMutation } from '@tanstack/react-query';
import { invoke, Channel } from '@tauri-apps/api/core';
import { Terminal } from '@xterm/xterm';
import { useTerminalSessionData } from './useTerminalSessionData';
import { useTerminalSessionResize } from './useTerminalSessionResize';
import { PtyEvent, SpawnOptions } from './types';

/**
 * Hook for spawning a new terminal session
 */
export function useTerminalSessionSpawn(terminal: Terminal | null) {
    const channelRef = useRef<Channel<PtyEvent> | null>(null);

    const mutation = useMutation({
        mutationFn: async (options: SpawnOptions): Promise<string> => {
            if (!terminal) throw new Error("Terminal not initialized");

            // 1. Spawn PTY process
            const sid = await invoke<string>('spawn_pty_cmd', {
                command: options.command,
                args: options.args,
                cwd: options.cwd,
                rows: terminal.rows,
                cols: terminal.cols,
            });

            // 2. Create channel for output
            const channel = new Channel<PtyEvent>();
            channel.onmessage = (msg) => {
                terminal.write(msg.data);
                terminal.scrollToBottom();
            };

            // 3. Attach channel to session
            await invoke('attach_pty_cmd', { sessionId: sid, channel });
            channelRef.current = channel;

            return sid;
        },
        onError: (error) => {
            terminal?.write(`\r\nError spawning shell: ${error}\r\n`);
        },
    });

    // Setup I/O listeners
    const sessionId = mutation.data ?? null;
    useTerminalSessionData(terminal, sessionId);
    useTerminalSessionResize(terminal, sessionId);

    return {
        sessionId,
        spawn: mutation.mutate,
        spawnAsync: mutation.mutateAsync,
        isSpawning: mutation.isPending,
        spawnError: mutation.error,
        isSpawned: mutation.isSuccess,
    };
}
