import { useEffect, useRef } from 'react';
import { useXterm } from '../hooks/useXterm';
import { useTerminal } from '../hooks/terminal';
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
    const { terminalRef } = useXterm(containerRef);
    const {
        sessionId: hookSessionId,
        spawn,
        connect,
        isReady
    } = useTerminal(terminalRef);

    const isInitializingRef = useRef(false);

    useEffect(() => {
        if (isReady || isInitializingRef.current) return;

        const initSession = async () => {
            isInitializingRef.current = true;
            try {
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
            } catch (error) {
                log.error(`[Terminal] Failed to init session: ${error}`);
            } finally {
                isInitializingRef.current = false;
            }
        };

        // Delay slightly to ensure terminal is opened and resized
        const timeout = setTimeout(initSession, 100);
        return () => clearTimeout(timeout);
    }, [propsSessionId, initialCommand, initialArgs, cwd, connect, spawn, isReady]);

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
