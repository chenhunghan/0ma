import { useEffect, useRef } from "react";
import { useMutation } from "@tanstack/react-query";
import { Channel, invoke } from "@tauri-apps/api/core";
import * as log from "@tauri-apps/plugin-log";
import type { FrankenTermWeb } from "src/wasm/frankenterm-web/FrankenTerm";
import type { PtyEvent } from "./types";

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

function sendReplyBytes(sessionId: string, source: "connect", term: FrankenTermWeb) {
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
  source: "connect",
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
 * Hook for connecting to an existing terminal session.
 * Feeds PTY output into FrankenTermWeb and drains reply bytes back.
 */
export function useTerminalSessionConnect(term: FrankenTermWeb | null) {
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
      const pendingChunks: Uint8Array[] = [];
      let flushScheduled = false;
      const flushPending = () => {
        flushScheduled = false;
        const flushed = flushDeferredOutput(
          "connect",
          targetSessionId,
          termRef.current,
          pendingChunks,
        );
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
