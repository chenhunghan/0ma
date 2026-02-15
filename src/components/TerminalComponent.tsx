import { useEffect, useRef } from "react";
import {
  useFrankenTerm,
  useFrankenTermInput,
  useFrankenTermResize,
  useTerminalSession,
} from "../hooks/terminal";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import * as log from "@tauri-apps/plugin-log";
import type { FrankenTermWeb } from "src/wasm/frankenterm-web/FrankenTerm";

interface Props {
  sessionId?: string;
  onSessionCreated?: (sessionId: string) => void;
  onCwdChanged?: (cwd: string) => void;
  initialCommand: string;
  initialArgs: string[];
  cwd: string;
}

interface SessionRestoreData {
  historyText: string | null;
  cwd: string | null;
}

function cleanupTauriListener(unlistenPromise: Promise<() => void>) {
  void unlistenPromise
    .then((unlisten) => Promise.resolve(unlisten()))
    .catch(() => {
      // Listener may have already been disposed
    });
}

function enqueueTermFeed(term: FrankenTermWeb, text: string) {
  const bytes = new TextEncoder().encode(text);
  queueMicrotask(() => {
    try {
      term.feed(bytes);
    } catch (e) {
      log.debug(`[TerminalComponent] deferred feed skipped due transient re-entry: ${e}`);
    }
  });
}

export function TerminalComponent({
  sessionId: propsSessionId,
  onSessionCreated,
  onCwdChanged,
  initialCommand,
  initialArgs,
  cwd,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const { term, geometry, canvasRef } = useFrankenTerm(containerRef);
  const spawnedRef = useRef(false);
  const restoredRef = useRef(false);

  // Session management (spawn/connect) — uses initial geometry for spawn dims
  const {
    sessionId: hookSessionId,
    spawn,
    connect,
    connectError,
    isReady,
  } = useTerminalSession(term, geometry?.cols ?? 80, geometry?.rows ?? 24);

  // Resize hook: observes container and notifies PTY
  const dims = useFrankenTermResize(term, containerRef, hookSessionId ?? null);

  // Input hook: keyboard/mouse/paste → FrankenTerm → PTY
  const { updateGeometry } = useFrankenTermInput(term, hookSessionId, canvasRef);

  // Keep input hook geometry in sync with resize
  useEffect(() => {
    updateGeometry(dims.cols, dims.cellWidth, dims.cellHeight);
  }, [dims.cols, dims.cellWidth, dims.cellHeight, updateGeometry]);

  // Spawn or reconnect when term is ready (fire once)
  useEffect(() => {
    if (!term || !geometry || isReady || spawnedRef.current) return;
    spawnedRef.current = true;

    log.debug(`[TerminalComponent] term ready: ${geometry.cols}x${geometry.rows}`);

    if (propsSessionId) {
      // Try to re-attach to a live session (survives HMR, tab switch, etc.)
      log.debug(`[TerminalComponent] attempting reconnect to ${propsSessionId}`);
      connect(propsSessionId);
    } else {
      log.debug(`[TerminalComponent] spawning: ${initialCommand}`);
      spawn({ args: initialArgs, command: initialCommand, cwd });
    }
  }, [term, geometry, propsSessionId, initialCommand, initialArgs, cwd, connect, spawn, isReady]);

  // If reconnect failed (session gone after app restart), restore from disk + spawn new shell
  useEffect(() => {
    if (!connectError || !term || !propsSessionId || restoredRef.current) return;
    restoredRef.current = true;

    log.debug(`[TerminalComponent] reconnect failed, restoring from disk`);
    invoke<SessionRestoreData>("load_session_restore_cmd", { sessionId: propsSessionId })
      .then((restore) => {
        if (restore.historyText && term) {
          enqueueTermFeed(term, restore.historyText);
        }
        return restore.cwd ?? cwd;
      })
      .catch((e) => {
        log.debug(`No persisted restore data for ${propsSessionId}: ${e}`);
        return cwd;
      })
      .then((restoredCwd) => {
        spawn({ args: initialArgs, command: initialCommand, cwd: restoredCwd });
      })
      .finally(() => {
        invoke("delete_session_history_cmd", { sessionId: propsSessionId }).catch(() => {});
      });
  }, [connectError, term, propsSessionId, spawn, initialArgs, initialCommand, cwd]);

  // Lift sessionId up when created or replaced (e.g. after restore-spawn on restart)
  useEffect(() => {
    if (hookSessionId && hookSessionId !== propsSessionId && onSessionCreated) {
      onSessionCreated(hookSessionId);
    }
  }, [hookSessionId, propsSessionId, onSessionCreated]);

  // Listen for CWD changes from backend
  useEffect(() => {
    const sessionId = hookSessionId;
    if (!sessionId || !onCwdChanged) return;

    const unlisten = listen<{ sessionId: string; cwd: string }>("pty-cwd-changed", (event) => {
      if (event.payload.sessionId === sessionId) {
        onCwdChanged(event.payload.cwd);
      }
    });
    return () => {
      cleanupTauriListener(unlisten);
    };
  }, [hookSessionId, onCwdChanged]);

  // Show message when the PTY process exits (e.g. user typed `exit`)
  useEffect(() => {
    const sessionId = hookSessionId;
    if (!sessionId || !term) return;

    const unlisten = listen<{ sessionId: string }>("pty-exited", (event) => {
      if (event.payload.sessionId === sessionId) {
        const msg = "\r\n\x1b[90m[Process exited]\x1b[0m\r\n";
        enqueueTermFeed(term, msg);
      }
    });
    return () => {
      cleanupTauriListener(unlisten);
    };
  }, [hookSessionId, term]);

  // Re-attach to live session on HMR (channel silenced in cleanup) or wake from sleep.
  // Fires on every effect setup — after HMR this recreates the dead channel,
  // after initial spawn this is a harmless no-op (re-subscribes to same session).
  useEffect(() => {
    const sessionId = hookSessionId;
    if (!sessionId) return;

    connect(sessionId);

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        connect(sessionId);
      }
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [hookSessionId, connect]);

  return (
    <div ref={containerRef} className="h-full w-full min-h-0 min-w-0 overflow-hidden bg-black" />
  );
}
