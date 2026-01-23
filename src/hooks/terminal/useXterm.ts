import { useEffect, useRef, useState, RefObject } from 'react';
import { Terminal, ITerminalOptions } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import { useXtermFit } from './useXtermFit';
import { TERM_CONFIG } from './config';
import { ExtendedTerminal } from './types';

/**
 * Modernized useXterm hook that orchestrates terminal initialization,
 * addon loading, and automatic fitting.
 */
export function useXterm(
    containerRef: RefObject<HTMLDivElement | null>,
    hideCursor: boolean = false,
    options: ITerminalOptions = TERM_CONFIG,
) {
    const [terminal, setTerminal] = useState<ExtendedTerminal | null>(null);
    const terminalRef = useRef<ExtendedTerminal | null>(null);

    // Initialize terminal
    useEffect(() => {
        if (!containerRef.current) return;

        // 1. Create the terminal instance
        const term = new Terminal(options) as ExtendedTerminal;

        // 2. Pre-attach the FitAddon
        const fitAddon = new FitAddon();
        term.loadAddon(fitAddon);
        term.fitAddon = fitAddon;

        // 3. Open terminal in container
        term.open(containerRef.current);

        if (hideCursor) {
            // ANSI escape sequence to hide current cursor (?25l)
            term.write('\x1b[?25l');
        }

        /**
         * We MUST set state here so that other reactive hooks (like useTerminalSession)
         * can receive the terminal instance and start their work. 
         * 
         * The 'set-state-in-effect' warning is expected here because xterm.js is an 
         * imperative library that MUST wait for the DOM (useEffect) to be initialized.
         */
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setTerminal(term);
        terminalRef.current = term;

        return () => {
            term.dispose();
            setTerminal(null);
            terminalRef.current = null;
        };
        // We recreate the terminal if options or hideCursor change fundamentally.
    }, [containerRef, options, hideCursor]);

    // Manage automatic fitting
    useXtermFit(containerRef, terminal);

    return { terminal, terminalRef };
}
