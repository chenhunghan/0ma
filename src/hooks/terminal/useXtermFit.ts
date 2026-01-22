import { useEffect, RefObject } from 'react';
import { Terminal } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import * as log from "@tauri-apps/plugin-log";

/**
 * Hook for managing terminal fitting and resize observation.
 */
export function useXtermFit(
    containerRef: RefObject<HTMLDivElement | null>,
    terminalRef: RefObject<Terminal | null>,
    fitAddonRef: RefObject<FitAddon | null>
) {
    useEffect(() => {
        if (!containerRef.current || !terminalRef.current || !fitAddonRef.current) return;

        const fitAddon = fitAddonRef.current;
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
    }, [containerRef, terminalRef, fitAddonRef]);
}
