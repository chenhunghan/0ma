import { useEffect, useRef } from "react";
import { useXterm, useTerminalSession } from "../hooks/terminal";
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

  const { fitTerminal, onDragEnd } = useTerminalResize({
    containerRef,
    terminal,
    isActive,
  });

  // Subscribe to drag end events
  useEffect(() => {
    return subscribeDragEnd(onDragEnd);
  }, [subscribeDragEnd, onDragEnd]);

  useEffect(() => {
    if (!terminal || isReady) return;

    // Fit terminal before spawning/connecting
    fitTerminal(true);

    if (propsSessionId) {
      log.debug(`[Terminal] connecting to session ${propsSessionId}`);
      connect(propsSessionId);
    } else {
      log.debug(`[Terminal] spawning session ${initialCommand}`);
      spawn({
        command: initialCommand,
        args: initialArgs,
        cwd,
      });
    }
  }, [
    terminal,
    propsSessionId,
    initialCommand,
    initialArgs,
    cwd,
    connect,
    spawn,
    isReady,
    fitTerminal,
  ]);

  // Lift sessionId up when created
  useEffect(() => {
    if (hookSessionId && !propsSessionId && onSessionCreated) {
      onSessionCreated(hookSessionId);
    }
  }, [hookSessionId, propsSessionId, onSessionCreated]);

  return <div ref={containerRef} className="h-full w-full min-h-0 min-w-0 overflow-hidden" />;
}
