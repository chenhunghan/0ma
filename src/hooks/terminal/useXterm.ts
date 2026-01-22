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

    // Memoize options correctly to avoid dependency array warnings
    const memoOptions = useMemo(() => ({
        ...TERM_CONFIG,
        ...options
    }), [options]); // Depend on options directly

    const { hideCursor, useWebgl } = memoOptions;

    // Separate the part of options that actually goes into the xterm constructor
    const terminalOptions = useMemo(() => {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
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

        // We set state in an effect to allow sibling hooks to reactively
        // receive the terminal instance once it's initialized and opened.
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setTerminal(term);
        terminalRef.current = term;

        return () => {
            term.dispose();
            setTerminal(null);
            terminalRef.current = null;
        };
    }, [containerRef, hideCursor, terminalOptions]);

    // Manage addons
    const { fitAddonRef } = useXtermAddons(terminal, useWebgl);

    // Manage automatic fitting
    useXtermFit(containerRef, terminal, fitAddonRef);

    return { terminal, terminalRef, fitAddonRef };
}
