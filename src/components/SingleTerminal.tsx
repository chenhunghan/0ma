import React, { useEffect, useRef } from 'react';
import { InstanceStatus } from '../types/InstanceStatus';
import { terminalManager } from '../services/TerminalManager';
import { Terminal, ITerminalOptions } from '@xterm/xterm';
import { AttachAddon } from '@xterm/addon-attach';
import { invoke } from '@tauri-apps/api/core';

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

export interface SingleTerminalProps {
    id: string; // Unique ID for persistence
    instanceName: string;
    status: InstanceStatus;
    isLogs?: boolean;
}

const TERM_CONFIG = {
    fontFamily: '"Fira Code", Menlo, Monaco, "Courier New", monospace',
    fontSize: 12,
    lineHeight: 1.2,
    theme: {
        background: '#000000',
        foreground: '#d4d4d8',
        cursor: '#10b981',
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

export const SingleTerminal: React.FC<SingleTerminalProps> = ({
    id,
    instanceName,
    status,
    isLogs = false
}) => {
    const terminalContainerRef = useRef<HTMLDivElement>(null);
    const socketRef = useRef<WebSocket | null>(null);

    useEffect(() => {
        if (!terminalContainerRef.current) return;

        const termInstance = terminalManager.getOrCreate(id, {
            cursorBlink: !isLogs,
            fontSize: isLogs ? 11 : TERM_CONFIG.fontSize,
            fontFamily: TERM_CONFIG.fontFamily,
            lineHeight: isLogs ? 1.15 : TERM_CONFIG.lineHeight,
            theme: TERM_CONFIG.theme,
            allowProposedApi: true,
            cursorStyle: 'block',
            disableStdin: isLogs,
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

                // If interactive, send resize command to backend
                if (!isLogs && socketRef.current?.readyState === WebSocket.OPEN) {
                    socketRef.current.send(JSON.stringify({
                        type: 'resize',
                        cols: term.cols,
                        rows: term.rows
                    }));
                }
            } catch (e) {
                console.debug("Terminal fit skipped:", e);
            }
        };

        requestAnimationFrame(() => {
            safeFit();
            if (!isLogs) term.focus();
        });

        // Backend Connection Logic
        if (!termInstance.initialized && status === InstanceStatus.Running && !isLogs) {
            termInstance.initialized = true;

            const setupConnection = async () => {
                try {
                    const port = await invoke<number>('get_terminal_port');
                    const socket = new WebSocket(`ws://127.0.0.1:${port}`);
                    socketRef.current = socket;

                    socket.onopen = () => {
                        // First message is the instance name
                        socket.send(instanceName);

                        // Attach addon
                        const attachAddon = new AttachAddon(socket);
                        term.loadAddon(attachAddon);

                        // Initial resize
                        socket.send(JSON.stringify({
                            type: 'resize',
                            cols: term.cols,
                            rows: term.rows
                        }));
                    };

                    socket.onerror = (err) => {
                        console.error("Terminal WebSocket error:", err);
                        term.writeln("\r\n\x1b[31m[CONNECTION ERROR: FAILED TO CONNECT TO BACKEND TERMINAL SERVICE]\x1b[0m");
                    };

                    socket.onclose = () => {
                        term.writeln("\r\n\x1b[33m[SESSION ENDED]\x1b[0m");
                        termInstance.initialized = false;
                    };

                } catch (err) {
                    console.error("Failed to get terminal port:", err);
                    term.writeln("\r\n\x1b[31m[ERROR: TERMINAL SERVICE NOT AVAILABLE]\x1b[0m");
                }
            };

            setupConnection();
        }

        // Mock Logs simulation if isLogs
        if (isLogs && !termInstance.initialized && status === InstanceStatus.Running) {
            termInstance.initialized = true;
            term.writeln("\x1b[34m[STREAMING SYSTEM LOGS...]\x1b[0m");

            termInstance.intervalId = setInterval(() => {
                const now = new Date().toISOString();
                const ms = Math.floor(Math.random() * 200);
                const methods = ['GET', 'POST', 'PUT'];
                const method = methods[Math.floor(Math.random() * methods.length)];
                term.writeln(`[${now}] INFO: Incoming request ${method} /api/v1/data - 200 (${ms}ms)`);
            }, 2000);
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
    }, [id, instanceName, status, isLogs]);

    return <div className="h-full w-full pl-1 pt-1 overflow-hidden" ref={terminalContainerRef} />;
};
