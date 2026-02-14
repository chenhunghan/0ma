import { useEffect, useRef } from "react";
import { useMutation } from "@tanstack/react-query";
import { Channel, invoke } from "@tauri-apps/api/core";
import * as log from "@tauri-apps/plugin-log";
import type { FrankenTermWeb } from "src/wasm/frankenterm-web/FrankenTerm";
import type { PtyEvent, SpawnOptions } from "./types";

const textEncoder = new TextEncoder();
const textDecoder = new TextDecoder();

function feedPendingChunks(term: FrankenTermWeb, pendingChunks: Uint8Array[]) {
  while (pendingChunks.length > 0) {
    const chunk = pendingChunks.shift();
    if (chunk) {
      term.feed(chunk);
    }
  }
}

function sendReplyBytes(sessionId: string, source: "spawn", term: FrankenTermWeb) {
  const replies = term.drainReplyBytes();
  for (let i = 0; i < replies.length; i++) {
    const chunk = replies[i] as Uint8Array;
    if (chunk.length > 0) {
      const data = textDecoder.decode(chunk);
      invoke("write_pty_cmd", { sessionId, data }).catch((e) =>
        log.error(`[${source}] reply write failed: ${e}`),
      );
    }
  }
}

function flushDeferredOutput(
  source: "spawn",
  sessionId: string,
  term: FrankenTermWeb | null,
  pendingChunks: Uint8Array[],
) {
  if (!term || pendingChunks.length === 0) return true;
  try {
    feedPendingChunks(term, pendingChunks);
    sendReplyBytes(sessionId, source, term);
    return true;
  } catch (e) {
    log.debug(`[${source}] deferred feed skipped due transient re-entry: ${e}`);
    return false;
  }
}

/**
 * Hook for spawning a new terminal session.
 * Feeds PTY output into FrankenTermWeb and drains reply bytes back.
 */
export function useTerminalSessionSpawn(term: FrankenTermWeb | null, cols: number, rows: number) {
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
      const pendingChunks: Uint8Array[] = [];
      let flushScheduled = false;
      const flushPending = () => {
        flushScheduled = false;
        const flushed = flushDeferredOutput("spawn", sid, termRef.current, pendingChunks);
        if (!flushed && pendingChunks.length > 0 && !flushScheduled) {
          flushScheduled = true;
          queueMicrotask(flushPending);
        }
      };
      channel.onmessage = (msg) => {
        const t = termRef.current;
        if (!t) return;

        // Defer to microtask to avoid re-entering WASM while render() is on stack.
        pendingChunks.push(textEncoder.encode(msg.data));
        if (!flushScheduled) {
          flushScheduled = true;
          queueMicrotask(flushPending);
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
