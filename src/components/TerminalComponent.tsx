import { useEffect, useRef } from "react";
import { useTerminalSession, useXterm } from "../hooks/terminal";
import { useTerminalResize } from "../hooks/terminal/useTerminalResize";
import { useTerminalResizeContext } from "src/contexts/useTerminalResizeContext";
import "@xterm/xterm/css/xterm.css";
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

  // Wait for terminal dimensions to be ready, then spawn/connect
  useEffect(() => {
    log.debug(`[Terminal] useEffect: terminal=${Boolean(terminal)} isReady=${isReady}`);
    if (!terminal || isReady) {return;}

    let cancelled = false;

    log.debug("[Terminal] Calling waitForReady...");
    // Wait for xterm to initialize dimensions before spawning
    waitForReady().then((ready) => {
      log.debug(`[Terminal] waitForReady resolved: ready=${ready} cancelled=${cancelled}`);
      if (cancelled || !ready) {return;}

      if (propsSessionId) {
        log.debug(`[Terminal] connecting to session ${propsSessionId}`);
        connect(propsSessionId);
      } else {
        log.debug(`[Terminal] spawning session ${initialCommand}`);
        spawn({
          args: initialArgs,
          command: initialCommand,
          cwd,
        });
      }
    });

    return () => {
      cancelled = true;
    };
  }, [
    terminal,
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
