import { useEffect, useRef } from "react";
import { useTerminalSession, useXterm } from "../hooks/terminal";
import { useTerminalResize } from "../hooks/terminal/useTerminalResize";
import { useTerminalResizeContext } from "src/contexts/useTerminalResizeContext";
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
  isActive = true,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const { terminal } = useXterm(containerRef);
  const { sessionId: hookSessionId, spawn, connect, isReady } = useTerminalSession(terminal);
  const { subscribeDragEnd } = useTerminalResizeContext();

  const { onDragEnd, waitForReady } = useTerminalResize({
    containerRef,
    isActive,
    terminal,
  });

  // Subscribe to drag end events
  useEffect(() => subscribeDragEnd(onDragEnd), [subscribeDragEnd, onDragEnd]);

  // Spawn/connect session
  useEffect(() => {
    log.debug(`[Terminal] useEffect: isReady=${isReady}`);
    if (isReady) {return;}

    let cancelled = false;

    // TODO: replace waitForReady with new terminal lib readiness check
    waitForReady().then((ready) => {
      log.debug(`[Terminal] waitForReady resolved: ready=${ready} cancelled=${cancelled}`);
      if (cancelled || !ready) {
        // Fallback: spawn immediately with default dims
        if (cancelled) {return;}
        if (propsSessionId) {
          connect(propsSessionId);
        } else {
          spawn({ args: initialArgs, command: initialCommand, cwd });
        }
        return;
      }

      if (propsSessionId) {
        log.debug(`[Terminal] connecting to session ${propsSessionId}`);
        connect(propsSessionId);
      } else {
        log.debug(`[Terminal] spawning session ${initialCommand}`);
        spawn({ args: initialArgs, command: initialCommand, cwd });
      }
    });

    return () => {
      cancelled = true;
    };
  }, [
    propsSessionId,
    initialCommand,
    initialArgs,
    cwd,
    connect,
    spawn,
    isReady,
    waitForReady,
  ]);

  // Lift sessionId up when created
  useEffect(() => {
    if (hookSessionId && !propsSessionId && onSessionCreated) {
      onSessionCreated(hookSessionId);
    }
  }, [hookSessionId, propsSessionId, onSessionCreated]);

  return <div ref={containerRef} className="h-full w-full min-h-0 min-w-0" />;
}
