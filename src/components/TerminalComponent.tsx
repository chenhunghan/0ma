import { useEffect, useRef } from 'react';
import { Terminal } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import { TerminalAdapter } from 'src/lib/terminal-adapter';
import '@xterm/xterm/css/xterm.css';

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

        const term = new Terminal({
            cursorBlink: true,
            fontFamily: '"Fira Code Variable", "Fira Code", monospace',
            fontSize: 14,
            lineHeight: 1.15,
            scrollOnUserInput: true,
            theme: {
                background: '#09090b', // zinc-950
                foreground: '#fafafa', // zinc-50
            },
            allowProposedApi: true,
        });

        const fitAddon = new FitAddon();
        term.loadAddon(fitAddon);

        term.open(containerRef.current);

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
        <div className={`h-full w-full overflow-hidden`}>
            <div ref={containerRef} className="h-full w-full" />
        </div>
    );
}
