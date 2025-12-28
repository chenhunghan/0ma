import React, { useEffect, useRef } from 'react';
import { terminalManager } from '../services/TerminalManager';
import { Terminal, ITerminalOptions } from '@xterm/xterm';
import { AttachAddon } from '@xterm/addon-attach';
import { invoke } from '@tauri-apps/api/core';
import { LogSession } from '../types/LogSession';

interface TerminalWithCore extends Terminal {
    _core: {
        _renderService: {
            dimensions: {
                canvasWidth: number;
                canvasHeight: number;
            };
        };
    };
}

interface SingleLogViewerProps {
    session: LogSession;
}

const TERM_CONFIG = {
    fontFamily: '"Fira Code", Menlo, Monaco, "Courier New", monospace',
    fontSize: 11,
    lineHeight: 1.15,
    theme: {
        background: '#0a0a0a', // Slightly lighter/different than shell to distinguish
        foreground: '#d4d4d8',
        cursor: 'transparent', // Hide cursor
        selectionBackground: '#27272a',
        black: '#000000',
        red: '#ef4444',
        green: '#10b981',
        yellow: '#f59e0b',
        blue: '#3b82f6',
        magenta: '#d946ef',
        cyan: '#06b6d4',
        white: '#e4e4e7',
        brightBlack: '#71717a',
        brightRed: '#f87171',
        brightGreen: '#34d399',
        brightYellow: '#fbbf24',
        brightBlue: '#60a5fa',
        brightMagenta: '#e879f9',
        brightCyan: '#22d3ee',
        brightWhite: '#ffffff',
    }
};

export const SingleLogViewer: React.FC<SingleLogViewerProps> = ({ session }) => {
    const terminalContainerRef = useRef<HTMLDivElement>(null);
    const socketRef = useRef<WebSocket | null>(null);

    useEffect(() => {
        if (!terminalContainerRef.current) return;

        const termInstance = terminalManager.getOrCreate(session.id, {
            cursorBlink: false,
            fontSize: TERM_CONFIG.fontSize,
            fontFamily: TERM_CONFIG.fontFamily,
            lineHeight: TERM_CONFIG.lineHeight,
            theme: TERM_CONFIG.theme,
            allowProposedApi: true,
            cursorStyle: 'underline', // Should be hidden by transparent color
            disableStdin: true, // Read-only
        } as ITerminalOptions);

        const { term, fitAddon } = termInstance;
        term.open(terminalContainerRef.current);

        const safeFit = () => {
            if (!terminalContainerRef.current) return;
            if (terminalContainerRef.current.clientWidth === 0 ||
                terminalContainerRef.current.clientHeight === 0 ||
                !terminalContainerRef.current.offsetParent) {
                return;
            }

            try {
                const core = (term as TerminalWithCore)._core;
                if (!core || !core._renderService || !core._renderService.dimensions) {
                    return;
                }
                fitAddon.fit();

                // Send resize command to backend
                if (socketRef.current?.readyState === WebSocket.OPEN) {
                    socketRef.current.send(JSON.stringify({
                        type: 'resize',
                        cols: term.cols,
                        rows: term.rows
                    }));
                }
            } catch (e) {
                console.debug("Log Terminal fit skipped:", e);
            }
        };

        requestAnimationFrame(() => {
            safeFit();
        });

        // Backend Connection Logic
        if (!termInstance.initialized) {
            termInstance.initialized = true;

            const setupConnection = async () => {
                try {
                    // Use new K8s Log Handler
                    const port = await invoke<number>('get_k8s_log_port');
                    const socket = new WebSocket(`ws://127.0.0.1:${port}`);
                    socketRef.current = socket;

                    socket.onopen = () => {
                        term.writeln(`\x1b[34m[Connecting to K8s Log Service for ${session.pod} in ${session.namespace}...]\x1b[0m`);

                        // Handshake for Log Service
                        socket.send(JSON.stringify({
                            instance: session.instanceName,
                            pod: session.pod,
                            namespace: session.namespace
                        }));

                        // Attach addon
                        const attachAddon = new AttachAddon(socket);
                        // AttachAddon handles read/write automatically.
                        // Since disableStdin is true on xterm, user input won't be sent.
                        term.loadAddon(attachAddon);

                        // Initial resize
                        socket.send(JSON.stringify({
                            type: 'resize',
                            cols: term.cols,
                            rows: term.rows
                        }));
                    };

                    socket.onerror = (err) => {
                        console.error("Log WebSocket error:", err);
                        term.writeln("\r\n\x1b[31m[CONNECTION ERROR: FAILED TO CONNECT TO LOG SERVICE]\x1b[0m");
                    };

                    socket.onclose = () => {
                        term.writeln("\r\n\x1b[33m[LOG SESSION ENDED]\x1b[0m");
                        termInstance.initialized = false;
                    };

                } catch (err) {
                    console.error("Failed to get log port:", err);
                    term.writeln("\r\n\x1b[31m[ERROR: LOG SERVICE MIGHT NOT BE RUNNING]\x1b[0m");
                }
            };

            setupConnection();
        }

        const resizeObserver = new ResizeObserver(() => {
            requestAnimationFrame(safeFit);
        });

        if (terminalContainerRef.current) {
            resizeObserver.observe(terminalContainerRef.current);
        }

        return () => {
            resizeObserver.disconnect();
        };
    }, [session.id, session.instanceName, session.pod, session.namespace]);

    return <div className="h-full w-full pl-1 pt-1 overflow-hidden" ref={terminalContainerRef} />;
};
