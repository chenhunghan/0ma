import { useEffect, useRef } from "react";
import { useMutation } from "@tanstack/react-query";
import { Channel, invoke } from "@tauri-apps/api/core";
import * as log from "@tauri-apps/plugin-log";
import type { PtyEvent } from "./types";

/**
 * Hook for connecting to an existing terminal session.
 *
 * xterm.js removed — the channel.onmessage callback currently logs data.
 * Wire in the replacement terminal's write method here.
 */
export function useTerminalSessionConnect() {
  const channelRef = useRef<Channel<PtyEvent> | null>(null);

  // Cleanup listener on unmount
  useEffect(() => () => {
      if (channelRef.current) {
        channelRef.current.onmessage = () => {};
      }
    }, []);

  const mutation = useMutation({
    mutationFn: async (targetSessionId: string): Promise<string> => {
      // Silence the old listener before attaching a new session
      if (channelRef.current) {
        channelRef.current.onmessage = () => {};
      }

      // 1. Create channel for output
      const channel = new Channel<PtyEvent>();
      channel.onmessage = (msg) => {
        // TODO: wire replacement terminal write here
        log.debug(`[pty-output] ${msg.data}`);
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
