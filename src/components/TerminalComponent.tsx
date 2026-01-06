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
    // Internal adapter reference tracked via closure in useEffect

    useEffect(() => {
        if (!containerRef.current) return;

        const term = new Terminal(TERM_CONFIG);

        const fitAddon = new FitAddon();
        term.loadAddon(fitAddon);

        term.open(containerRef.current);

        // Load WebGL addon after opening the terminal
        try {
            const webglAddon = new WebglAddon();
            webglAddon.onContextLoss(() => {
                webglAddon.dispose();
            });
            term.loadAddon(webglAddon);
        } catch (e) {
            log.warn(`WebGL Addon failed to load, falling back to DOM renderer: ${e}`);
        }

        const fitTerminal = (): { cols: number, rows: number } | null => {
            if (!containerRef.current) return null;
            const dims = fitAddon.proposeDimensions();
            // Stricter check: ignore tiny dimensions that likely occur during transitions/animations
            if (dims && dims.cols && dims.rows && dims.cols >= 20 && dims.rows >= 5) {
                term.resize(dims.cols, dims.rows - 2);
                return { cols: dims.cols, rows: dims.rows };
            }
            return null;
        };

        const waitForFit = async (): Promise<void> => {
            let lastDims = null;
            let stableCount = 0;

            // Poll for stability
            // We want dimensions to be non-null and STABLE for at least 2 consecutive checks
            // to ensure layout has settled (handling flexbox/resize observer variance).
            // Increased to 300 retries (~5s) to handle slow initial layout/tab switching.
            for (let i = 0; i < 300; i++) {
                if (!containerRef.current) return;

                const currentDims = fitTerminal();

                if (currentDims) {
                    if (lastDims && lastDims.cols === currentDims.cols && lastDims.rows === currentDims.rows) {
                        stableCount++;
                    } else {
                        stableCount = 0;
                    }
                    lastDims = currentDims;
                } else {
                    stableCount = 0;
                    lastDims = null;
                }

                if (stableCount >= 2) {
                    // Stable for 2+ frames (approx 32ms), proceed
                    return;
                }

                await new Promise(resolve => requestAnimationFrame(() => resolve(undefined)));
            }
            log.warn('[Terminal] fitTerminal failed to stabilize dimensions after 5s');
        };

        const { initialCommand, initialArgs, cwd, sessionId: currentSessionId, onSessionCreated } = settingsRef.current;

        const initSession = async () => {
            log.debug('[Terminal] waiting for fit...');
            // Wait for valid dimensions before doing anything with PTY
            // This is critical to prevent "spawn large -> resize small" or "write to wrong width" issues
            await waitForFit();

            const newAdapter = new TerminalAdapter(term);

            if (currentSessionId) {
                log.debug(`[Terminal] connecting to session ${currentSessionId}`);
                await newAdapter.connect(currentSessionId);
            } else {
                log.debug(`[Terminal] spawning session ${initialCommand}`);
                await newAdapter.spawn(initialCommand, initialArgs, cwd);
                if (newAdapter.sessionId && onSessionCreated) {
                    onSessionCreated(newAdapter.sessionId);
                }
            }

            // Re-fit after spawn/connect just in case
            requestAnimationFrame(() => {
                fitTerminal();
            });

            // Register adapter for cleanup (we can't do this in the effect return easily if we don't store it)
            // But we can store it in a ref or just rely on the fact that we need to clean it up.
            // Wait, we need to access `newAdapter` in cleanup. 
            // We should use a ref for the adapter to ensure cleanup works even if initSession is async.
            adapterRef.current = newAdapter;
        };
        initSession();

        // Observer to refit on resize
        const resizeObserver = new ResizeObserver(() => {
            requestAnimationFrame(() => {
                fitTerminal();
            });
        });

        resizeObserver.observe(containerRef.current);

        return () => {
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
