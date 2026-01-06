import { useEffect, useRef } from 'react';
import { Terminal } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import { TerminalAdapter } from 'src/lib/terminal-adapter';
import '@xterm/xterm/css/xterm.css';

interface Props {
    className?: string;
    sessionId?: string;
    onSessionCreated?: (sessionId: string) => void;
    initialCommand: string;
    initialArgs: string[];
    cwd: string;
}

export function TerminalComponent({
    className,
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

        const term = new Terminal({
            cursorBlink: true,
            fontFamily: '"Fira Code", monospace',
            fontSize: 14,
            theme: {
                background: '#09090b', // zinc-950
                foreground: '#fafafa', // zinc-50
            },
            allowProposedApi: true,
        });

        const fitAddon = new FitAddon();
        term.loadAddon(fitAddon);

        term.open(containerRef.current);
        fitAddon.fit();

        const newAdapter = new TerminalAdapter(term);
        const { initialCommand, initialArgs, cwd, sessionId: currentSessionId, onSessionCreated: notifyCreated } = settingsRef.current;

        const initSession = async () => {
            if (currentSessionId) {
                await newAdapter.connect(currentSessionId);
            } else {
                await newAdapter.spawn(initialCommand, initialArgs, cwd);
                if (newAdapter.sessionId && notifyCreated) {
                    notifyCreated(newAdapter.sessionId);
                }
            }
        };
        initSession();

        // Observer to refit on resize
        const resizeObserver = new ResizeObserver(() => {
            // requestAnimationFrame to throttle/debounce slightly
            requestAnimationFrame(() => {
                fitAddon.fit();
            });
        });

        resizeObserver.observe(containerRef.current);

        return () => {
            resizeObserver.disconnect();
            // We do NOT close the PTY here to allow persistence
            newAdapter.dispose();
            term.dispose();
        };
    }, []);

    return <div ref={containerRef} className={`h-full w-full ${className || ''}`} />;
}
