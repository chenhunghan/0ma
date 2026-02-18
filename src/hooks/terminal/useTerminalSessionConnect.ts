import { useEffect, useRef } from "react";
import { useMutation } from "@tanstack/react-query";
import { Channel, invoke } from "@tauri-apps/api/core";
import type { Terminal } from "@xterm/xterm";
import type { PtyEvent } from "./types";

/**
 * Hook for connecting to an existing terminal session.
 * Feeds PTY output into xterm via term.write().
 */
export function useTerminalSessionConnect(term: Terminal | null) {
  const channelRef = useRef<Channel<PtyEvent> | null>(null);
  const termRef = useRef(term);
  termRef.current = term;

  // Cleanup listener on unmount
  useEffect(
    () => () => {
      if (channelRef.current) {
        channelRef.current.onmessage = () => {};
      }
    },
    [],
  );

  const mutation = useMutation({
    mutationFn: async (targetSessionId: string): Promise<string> => {
      // Silence the old listener before attaching a new session
      if (channelRef.current) {
        channelRef.current.onmessage = () => {};
      }

      // 1. Create channel for output
      const channel = new Channel<PtyEvent>();
      channel.onmessage = (msg) => {
        const t = termRef.current;
        if (t) {
          t.write(msg.data);
        }
      };

      // 2. Attach channel to existing session
      await invoke("attach_pty_cmd", { channel, sessionId: targetSessionId });
      channelRef.current = channel;

      return targetSessionId;
    },
  });

  return {
    connect: mutation.mutate,
    connectError: mutation.error,
    isConnected: mutation.isSuccess,
    isConnecting: mutation.isPending,
    sessionId: mutation.data ?? null,
  };
}
