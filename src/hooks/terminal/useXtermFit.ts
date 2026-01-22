import { useEffect, RefObject } from 'react';
import * as log from "@tauri-apps/plugin-log";
import { ExtendedTerminal } from './types';

/**
 * Hook for managing terminal fitting and resize observation.
 * Retrieves the FitAddon directly from the ExtendedTerminal instance.
 */
export function useXtermFit(
    containerRef: RefObject<HTMLDivElement | null>,
    terminal: ExtendedTerminal | null
) {
    useEffect(() => {
        if (!containerRef.current || !terminal || !terminal.fitAddon) return;

        const fitAddon = terminal.fitAddon;
        const element = containerRef.current;

        const fitTerminal = () => {
            try {
                fitAddon.fit();
            } catch (e) {
                log.debug(`Terminal fit error: ${e}`);
            }
        };

        // Initial fit
        requestAnimationFrame(fitTerminal);

        // Handle resize
        const resizeObserver = new ResizeObserver(() => {
            requestAnimationFrame(fitTerminal);
        });

        resizeObserver.observe(element);

        return () => {
            resizeObserver.disconnect();
        };
    }, [containerRef, terminal]);
}
