import { useEffect, useRef } from "react";
import { useMutation } from "@tanstack/react-query";
import { Channel, invoke } from "@tauri-apps/api/core";
import * as log from "@tauri-apps/plugin-log";
import type { FrankenTermWeb } from "src/wasm/frankenterm-web/FrankenTerm";
import type { PtyEvent, SpawnOptions } from "./types";

const textEncoder = new TextEncoder();
const textDecoder = new TextDecoder();

/**
 * Hook for spawning a new terminal session.
 * Feeds PTY output into FrankenTermWeb and drains reply bytes back.
 */
export function useTerminalSessionSpawn(
  term: FrankenTermWeb | null,
  cols: number,
  rows: number,
) {
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
    mutationFn: async (options: SpawnOptions): Promise<string> => {
      // Silence the old listener before attaching a new session
      if (channelRef.current) {
        channelRef.current.onmessage = () => {};
      }

      // 1. Spawn PTY process with FrankenTerm's geometry
      const sid = await invoke<string>("spawn_pty_cmd", {
        args: options.args,
        cols,
        command: options.command,
        cwd: options.cwd,
        rows,
      });

      // 2. Create channel for output
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
            invoke("write_pty_cmd", { sessionId: sid, data }).catch((e) =>
              log.error(`[spawn] reply write failed: ${e}`),
            );
          }
        }
      };

      // 3. Attach channel to session
      await invoke("attach_pty_cmd", { channel, sessionId: sid });
      channelRef.current = channel;

      return sid;
    },
  });

  return {
    isSpawned: mutation.isSuccess,
    isSpawning: mutation.isPending,
    sessionId: mutation.data ?? null,
    spawn: mutation.mutate,
    spawnError: mutation.error,
  };
}
