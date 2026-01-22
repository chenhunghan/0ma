import { useMutation } from '@tanstack/react-query';
import { invoke } from '@tauri-apps/api/core';

/**
 * Hook for closing a terminal session
 */
export function useTerminalClose() {
    const mutation = useMutation({
        mutationFn: async (sessionId: string): Promise<void> => {
            await invoke('close_pty_cmd', { sessionId });
        },
    });

    return {
        close: mutation.mutate,
        isClosing: mutation.isPending,
        closeError: mutation.error,
        isClosed: mutation.isSuccess,
    };
}
