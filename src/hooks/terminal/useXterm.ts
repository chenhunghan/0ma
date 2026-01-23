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
    options: ITerminalOptions = TERM_CONFIG
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
        // We recreate the terminal if options change.
    }, [containerRef, options]);

    // Manage automatic fitting
    useXtermFit(containerRef, terminal);

    return { terminal, terminalRef };
}
