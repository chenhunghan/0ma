import { useEffect, useRef } from "react";
import { useMutation } from "@tanstack/react-query";
import { Channel, invoke } from "@tauri-apps/api/core";
import * as log from "@tauri-apps/plugin-log";
import type { PtyEvent, SpawnOptions } from "./types";

/**
 * Hook for spawning a new terminal session.
 *
 * xterm.js removed — the channel.onmessage callback currently logs data.
 * Wire in the replacement terminal's write method here.
 */
export function useTerminalSessionSpawn() {
  const channelRef = useRef<Channel<PtyEvent> | null>(null);

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

      // 1. Spawn PTY process (default 80x24 until replacement terminal provides dims)
      const sid = await invoke<string>("spawn_pty_cmd", {
        args: options.args,
        cols: 80,
        command: options.command,
        cwd: options.cwd,
        rows: 24,
      });

      // 2. Create channel for output
      const channel = new Channel<PtyEvent>();
      channel.onmessage = (msg) => {
        // TODO: wire replacement terminal write here
        log.debug(`[pty-output] ${msg.data}`);
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
