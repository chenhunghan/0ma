import { useEffect, useRef } from 'react';
import { Terminal } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import { TerminalAdapter } from 'src/lib/terminal-adapter';
import { WebglAddon } from '@xterm/addon-webgl';
import '@xterm/xterm/css/xterm.css';
import * as log from "@tauri-apps/plugin-log";

const TERM_CONFIG = {
    cursorBlink: false,
    cursorStyle: 'bar' as const,
    fontFamily: '"FiraCode Nerd Font", monospace',
    fontSize: 12,
    lineHeight: 1.15,
    scrollOnUserInput: true,
    theme: {
        background: '#000000',
        foreground: '#d4d4d8', // zinc-300
        cursor: 'transparent',
        selectionBackground: '#27272a', // zinc-800
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
    },
    allowProposedApi: true,
};

interface Props {
    sessionId?: string;
    onSessionCreated?: (sessionId: string) => void;
    initialCommand: string;
    initialArgs: string[];
    cwd: string;
}

export function TerminalComponent({
    sessionId,
    onSessionCreated,
    initialCommand,
    initialArgs,
    cwd
}: Props) {
    const containerRef = useRef<HTMLDivElement>(null);
    // Capture initial props in a ref to satisfy linter stability checks
    const settingsRef = useRef({ initialCommand, initialArgs, cwd, sessionId, onSessionCreated });
    const adapterRef = useRef<TerminalAdapter | null>(null);
    const isMountedRef = useRef(false);
    const isInitializingRef = useRef(false);

    useEffect(() => {
        isMountedRef.current = true;
        if (!containerRef.current) return;

        const term = new Terminal(TERM_CONFIG);
        const fitAddon = new FitAddon();
        term.loadAddon(fitAddon);
        term.open(containerRef.current);

        const fitTerminal = (): { cols: number, rows: number } | null => {
            if (!containerRef.current || !isMountedRef.current) return null;
            try {
                const dims = fitAddon.proposeDimensions();
                if (dims && dims.cols && dims.rows && dims.cols >= 2 && dims.rows >= 2) {
                    term.resize(dims.cols, dims.rows);
                    return { cols: dims.cols, rows: dims.rows };
                }
            } catch (e) {
                // Ignore fit errors on unmounted/hidden elements
            }
            return null;
        };

        const attemptInitSession = async () => {
            if (adapterRef.current || isInitializingRef.current || !isMountedRef.current) return;

            // Only initialize if we can fit the terminal (implies visibility)
            const dims = fitTerminal();
            if (!dims) return;

            isInitializingRef.current = true;
            const { initialCommand, initialArgs, cwd, sessionId: currentSessionId, onSessionCreated } = settingsRef.current;

            try {
                const newAdapter = new TerminalAdapter(term);

                if (currentSessionId) {
                    log.debug(`[Terminal] connecting to session ${currentSessionId}`);
                    await newAdapter.connect(currentSessionId);
                } else {
                    log.debug(`[Terminal] spawning session ${initialCommand}`);
                    await newAdapter.spawn(initialCommand, initialArgs, cwd);
                    // Only invoke callback if we are still mounted
                    if (isMountedRef.current && newAdapter.sessionId && onSessionCreated) {
                        onSessionCreated(newAdapter.sessionId);
                    }
                }

                if (isMountedRef.current) {
                    adapterRef.current = newAdapter;
                    // Final fit after content might have loaded
                    requestAnimationFrame(() => fitTerminal());
                } else {
                    newAdapter.dispose();
                }
            } catch (error) {
                log.error(`[Terminal] Failed to init session: ${error}`);
            } finally {
                isInitializingRef.current = false;
            }
        };

        // Observer to refit on resize and trigger init when visible
        const resizeObserver = new ResizeObserver(() => {
            requestAnimationFrame(() => {
                fitTerminal();
                attemptInitSession();
            });
        });

        resizeObserver.observe(containerRef.current);

        // Initial check
        requestAnimationFrame(attemptInitSession);

        return () => {
            isMountedRef.current = false;
            resizeObserver.disconnect();
            if (adapterRef.current) {
                adapterRef.current.dispose();
            }
            term.dispose();
        };
    }, []);

    // Outer div for padding, Inner div for xterm (no padding, so FitAddon measures correctly)
    return (
        <div ref={containerRef} className={`h-full w-full overflow-hidden`} />
    );
}
