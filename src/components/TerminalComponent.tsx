import { useEffect, useRef } from 'react';
import { Terminal } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import { TerminalAdapter } from 'src/lib/terminal-adapter';
import { WebglAddon } from '@xterm/addon-webgl';
import '@xterm/xterm/css/xterm.css';

const TERM_CONFIG = {
    cursorBlink: false,
    cursorStyle: 'bar' as const,
    fontFamily: '"JetBrains Mono Variable", monospace',
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
            console.warn('WebGL Addon failed to load, falling back to DOM renderer', e);
        }

        const fitTerminal = () => {
            const dims = fitAddon.proposeDimensions();
            if (dims && dims.cols && dims.rows) {
                // Resize to calculated dimensions
                // Manually subtract 2 rows to ensure the last line is never cut off
                term.resize(dims.cols, dims.rows - 2);
            }
        };

        // Initial fit with rAF
        requestAnimationFrame(() => {
            fitTerminal();
        });

        const newAdapter = new TerminalAdapter(term);
        const { initialCommand, initialArgs, cwd, sessionId: currentSessionId, onSessionCreated } = settingsRef.current;

        const initSession = async () => {
            if (currentSessionId) {
                await newAdapter.connect(currentSessionId);
            } else {
                await newAdapter.spawn(initialCommand, initialArgs, cwd);
                if (newAdapter.sessionId && onSessionCreated) {
                    onSessionCreated(newAdapter.sessionId);
                }
            }
            requestAnimationFrame(() => {
                fitTerminal();
            });
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
            newAdapter.dispose();
            term.dispose();
        };
    }, []);

    // Outer div for padding, Inner div for xterm (no padding, so FitAddon measures correctly)
    return (
        <div ref={containerRef} className={`h-full w-full overflow-hidden`} />
    );
}
