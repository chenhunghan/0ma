import { useRef, useEffect } from "react";
import { useMutation } from "@tanstack/react-query";
import { invoke, Channel } from "@tauri-apps/api/core";
import { Terminal } from "@xterm/xterm";
import { PtyEvent, SpawnOptions } from "./types";

/**
 * Hook for spawning a new terminal session
 */
export function useTerminalSessionSpawn(terminal: Terminal | null) {
  const channelRef = useRef<Channel<PtyEvent> | null>(null);

  // Cleanup listener on unmount. We use a "soft unplug" (empty function)
  // because Tauri v2 Channels don't have an explicit unlisten/close on the frontend.
  // This stops the UI from processing data while letting the PTY stay alive.
  useEffect(() => {
    return () => {
      if (channelRef.current) {
        channelRef.current.onmessage = () => {};
      }
    };
  }, []);

  const mutation = useMutation({
    mutationFn: async (options: SpawnOptions): Promise<string> => {
      if (!terminal) throw new Error("Terminal not initialized");

      // Silence the old listener before attaching a new session to this terminal instance.
      // This prevents "ghost output" from previous sessions appearing in the view.
      if (channelRef.current) {
        channelRef.current.onmessage = () => {};
      }

      // 1. Spawn PTY process
      const sid = await invoke<string>("spawn_pty_cmd", {
        command: options.command,
        args: options.args,
        cwd: options.cwd,
        rows: terminal.rows,
        cols: terminal.cols,
      });

      // 2. Create channel for output
      const channel = new Channel<PtyEvent>();
      channel.onmessage = (msg) => {
        // Sticky scroll: only scroll if the user is already at the bottom
        const isAtBottom = terminal.buffer.active.viewportY >= terminal.buffer.active.baseY;
        terminal.write(msg.data);
        if (isAtBottom) {
          terminal.scrollToBottom();
        }
      };

      // 3. Attach channel to session
      await invoke("attach_pty_cmd", { sessionId: sid, channel });
      channelRef.current = channel;

      return sid;
    },
  });

  return {
    sessionId: mutation.data ?? null,
    spawn: mutation.mutate,
    isSpawning: mutation.isPending,
    spawnError: mutation.error,
    isSpawned: mutation.isSuccess,
  };
}
