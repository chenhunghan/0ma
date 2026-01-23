import { useEffect, useRef } from 'react';
import { useXterm, useTerminalSession } from '../hooks/terminal';
import '@xterm/xterm/css/xterm.css';
import * as log from "@tauri-apps/plugin-log";

interface Props {
    sessionId?: string;
    onSessionCreated?: (sessionId: string) => void;
    initialCommand: string;
    initialArgs: string[];
    cwd: string;
}

export function TerminalComponent({
    sessionId: propsSessionId,
    onSessionCreated,
    initialCommand,
    initialArgs,
    cwd
}: Props) {
    const containerRef = useRef<HTMLDivElement>(null);
    const { terminal } = useXterm(containerRef);
    const {
        sessionId: hookSessionId,
        spawn,
        connect,
        isReady
    } = useTerminalSession(terminal);

    useEffect(() => {
        if (!terminal || isReady) return;

        if (propsSessionId) {
            log.debug(`[Terminal] connecting to session ${propsSessionId}`);
            connect(propsSessionId);
        } else {
            log.debug(`[Terminal] spawning session ${initialCommand}`);
            spawn({
                command: initialCommand,
                args: initialArgs,
                cwd
            });
        }
    }, [terminal, propsSessionId, initialCommand, initialArgs, cwd, connect, spawn, isReady]);

    // Lift sessionId up when created
    useEffect(() => {
        if (hookSessionId && !propsSessionId && onSessionCreated) {
            onSessionCreated(hookSessionId);
        }
    }, [hookSessionId, propsSessionId, onSessionCreated]);

    return (
        <div ref={containerRef} className="h-full w-full overflow-hidden" />
    );
}
