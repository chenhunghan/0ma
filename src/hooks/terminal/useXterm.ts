import { useEffect, useRef, useMemo, useState, RefObject } from 'react';
import { Terminal } from '@xterm/xterm';
import { useXtermAddons } from './useXtermAddons';
import { useXtermFit } from './useXtermFit';
import { UseXtermOptions, TERM_CONFIG } from './config';

/**
 * Modernized useXterm hook that orchestrates terminal initialization,
 * addon loading, and automatic fitting.
 */
export function useXterm(
    containerRef: RefObject<HTMLDivElement | null>,
    options: UseXtermOptions = {}
) {
    const [terminal, setTerminal] = useState<Terminal | null>(null);
    const terminalRef = useRef<Terminal | null>(null);

    // Merge options with defaults
    const memoOptions = useMemo(() => ({
        ...TERM_CONFIG,
        ...options
    }), [JSON.stringify(options)]);

    const terminalOptions = useMemo(() => {
        const { hideCursor: _, useWebgl: __, ...rest } = memoOptions;
        return rest;
    }, [memoOptions]);

    // Initialize terminal
    useEffect(() => {
        if (!containerRef.current) return;

        const term = new Terminal(terminalOptions);
        term.open(containerRef.current);

        if (hideCursor) {
            // ANSI escape sequence to hide current cursor (?25l)
            term.write('\x1b[?25l');
        }

        setTerminal(term);
        terminalRef.current = term;

        return () => {
            term.dispose();
            setTerminal(null);
            terminalRef.current = null;
        };
    }, [containerRef, hideCursor, terminalOptions]); // Stabilized via useMemo

    // Manage addons
    const { fitAddonRef } = useXtermAddons(terminal, useWebgl);

    // Manage automatic fitting
    useXtermFit(containerRef, terminal, fitAddonRef);

    return { terminal, terminalRef, fitAddonRef };
}
