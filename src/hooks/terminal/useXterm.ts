import { useEffect, useRef, useMemo, RefObject } from 'react';
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
    const terminalRef = useRef<Terminal | null>(null);

    // Merge options with defaults
    const memoOptions = useMemo(() => ({
        ...TERM_CONFIG,
        ...options
    }), [JSON.stringify(options)]);

    const { hideCursor, useWebgl, ...terminalOptions } = memoOptions;

    // Initialize terminal
    useEffect(() => {
        if (!containerRef.current) return;

        const term = new Terminal(terminalOptions);
        term.open(containerRef.current);

        if (hideCursor) {
            // ANSI escape sequence to hide current cursor (?25l)
            term.write('\x1b[?25l');
        }

        terminalRef.current = term;

        return () => {
            term.dispose();
            terminalRef.current = null;
        };
    }, [containerRef, hideCursor, memoOptions]); // Re-initialize if container or critical options change

    // Manage addons
    const { fitAddonRef } = useXtermAddons(terminalRef, useWebgl);

    // Manage automatic fitting
    useXtermFit(containerRef, terminalRef, fitAddonRef);

    return { terminalRef, fitAddonRef };
}
