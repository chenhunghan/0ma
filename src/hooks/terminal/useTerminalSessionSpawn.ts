import { useEffect, useRef } from "react";
import { useMutation } from "@tanstack/react-query";
import { Channel, invoke } from "@tauri-apps/api/core";
import type { Terminal } from "@xterm/xterm";
import type { PtyEvent, SpawnOptions } from "./types";

/**
 * Hook for spawning a new terminal session.
 * Feeds PTY output into xterm via term.write().
 */
export function useTerminalSessionSpawn(term: Terminal | null, cols: number, rows: number) {
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
    mutationFn: async (options: SpawnOptions): Promise<string> => {
      // Silence the old listener before attaching a new session
      if (channelRef.current) {
        channelRef.current.onmessage = () => {};
      }

      // 1. Spawn PTY process
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
        if (t) {
          t.write(msg.data);
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
