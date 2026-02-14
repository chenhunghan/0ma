import { useEffect, useRef } from "react";
import { useMutation } from "@tanstack/react-query";
import { Channel, invoke } from "@tauri-apps/api/core";
import * as log from "@tauri-apps/plugin-log";
import type { FrankenTermWeb } from "src/wasm/frankenterm-web/FrankenTerm";
import type { PtyEvent } from "./types";

const textEncoder = new TextEncoder();
const textDecoder = new TextDecoder();

/**
 * Hook for connecting to an existing terminal session.
 * Feeds PTY output into FrankenTermWeb and drains reply bytes back.
 */
export function useTerminalSessionConnect(term: FrankenTermWeb | null) {
  const channelRef = useRef<Channel<PtyEvent> | null>(null);
  const termRef = useRef(term);
  termRef.current = term;

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
        const t = termRef.current;
        if (!t) return;

        // PtyEvent.data is String; FrankenTerm.feed() expects Uint8Array
        const bytes = textEncoder.encode(msg.data);
        t.feed(bytes);

        // Drain terminal reply bytes (cursor position reports, etc.)
        const replies = t.drainReplyBytes();
        for (let i = 0; i < replies.length; i++) {
          const chunk = replies[i] as Uint8Array;
          if (chunk.length > 0) {
            const data = textDecoder.decode(chunk);
            invoke("write_pty_cmd", { sessionId: targetSessionId, data }).catch((e) =>
              log.error(`[connect] reply write failed: ${e}`),
            );
          }
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
