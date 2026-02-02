import { useMutation } from "@tanstack/react-query";
import { invoke } from "@tauri-apps/api/core";
import * as log from "@tauri-apps/plugin-log";

/**
 * Hook for closing a terminal session
 */
export function useTerminalSessionClose() {
  const mutation = useMutation({
    mutationFn: async (sessionId: string) => {
      await invoke("close_pty_cmd", { sessionId });
    },
    onSuccess: (_, sessionId) => {
      log.info(`Closed PTY session: ${sessionId}`);
    },
    onError: (error, sessionId) => {
      log.error(`Failed to close PTY session ${sessionId}: ${error}`);
    },
  });

  return {
    close: mutation.mutate,
    isClosing: mutation.isPending,
    closeError: mutation.error,
  };
}
