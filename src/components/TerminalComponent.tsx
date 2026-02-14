import { useEffect, useRef } from "react";
import {
  useFrankenTerm,
  useFrankenTermInput,
  useFrankenTermResize,
  useTerminalSession,
} from "../hooks/terminal";
import * as log from "@tauri-apps/plugin-log";

interface Props {
  sessionId?: string;
  onSessionCreated?: (sessionId: string) => void;
  initialCommand: string;
  initialArgs: string[];
  cwd: string;
  isActive?: boolean;
}

export function TerminalComponent({
  sessionId: propsSessionId,
  onSessionCreated,
  initialCommand,
  initialArgs,
  cwd,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const { term, geometry, canvasRef } = useFrankenTerm(containerRef);
  const spawnedRef = useRef(false);

  // Session management (spawn/connect) — uses initial geometry for spawn dims
  const {
    sessionId: hookSessionId,
    spawn,
    connect,
    isReady,
    connectError,
  } = useTerminalSession(
    term,
    geometry?.cols ?? 80,
    geometry?.rows ?? 24,
  );

  // Resize hook: observes container and notifies PTY
  const dims = useFrankenTermResize(term, containerRef, hookSessionId ?? null);

  // Input hook: keyboard/mouse/paste → FrankenTerm → PTY
  const { updateCols } = useFrankenTermInput(term, hookSessionId, canvasRef);

  // Keep input hook cols in sync with resize
  useEffect(() => {
    updateCols(dims.cols);
  }, [dims.cols, updateCols]);

  // Spawn/connect when term is ready (fire once)
  useEffect(() => {
    if (!term || !geometry || isReady || spawnedRef.current) return;
    spawnedRef.current = true;

    log.debug(`[TerminalComponent] term ready: ${geometry.cols}x${geometry.rows}`);

    if (propsSessionId) {
      log.debug(`[TerminalComponent] connecting to session ${propsSessionId}`);
      connect(propsSessionId);
    } else {
      log.debug(`[TerminalComponent] spawning: ${initialCommand}`);
      spawn({ args: initialArgs, command: initialCommand, cwd });
    }
  }, [term, geometry, propsSessionId, initialCommand, initialArgs, cwd, connect, spawn, isReady]);

  // Fallback: if connect failed (stale session from persistence), spawn a new one
  useEffect(() => {
    if (!connectError || !term || !geometry) return;

    log.warn(`[TerminalComponent] connect failed, spawning new session: ${connectError}`);
    spawn({ args: initialArgs, command: initialCommand, cwd });
  }, [connectError, term, geometry, spawn, initialArgs, initialCommand, cwd]);

  // Lift sessionId up when created
  useEffect(() => {
    if (hookSessionId && !propsSessionId && onSessionCreated) {
      onSessionCreated(hookSessionId);
    }
  }, [hookSessionId, propsSessionId, onSessionCreated]);

  return <div ref={containerRef} className="h-full w-full min-h-0 min-w-0 overflow-hidden bg-black" />;
}
