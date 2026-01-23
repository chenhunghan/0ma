import { useEffect, RefObject } from 'react';
import * as log from "@tauri-apps/plugin-log";
import { ExtendedTerminal } from './types';

/**
 * Hook for managing terminal fitting and resize observation.
 * Optimized for smooth dragging and animations of unknown duration.
 */
export function useXtermFit(
    containerRef: RefObject<HTMLDivElement | null>,
    terminal: ExtendedTerminal | null
) {
    useEffect(() => {
        if (!containerRef.current || !terminal || !terminal.fitAddon) return;

        const fitAddon = terminal.fitAddon;
        const element = containerRef.current;
        let lastDimensions = { cols: 0, rows: 0 };
        let pulseTimer: ReturnType<typeof setInterval> | null = null;

        const fitTerminal = () => {
            try {
                if (element.clientWidth <= 0 || element.clientHeight <= 0) return;

                fitAddon.fit();

                const currentDimensions = { cols: terminal.cols, rows: terminal.rows };
                const changed = currentDimensions.cols !== lastDimensions.cols ||
                    currentDimensions.rows !== lastDimensions.rows;

                lastDimensions = currentDimensions;
                return changed;
            } catch (e) {
                log.debug(`Terminal fit error: ${e}`);
                return false;
            }
        };

        // A "pulse" check ensures we follow animations even if ResizeObserver misses frames
        const triggerPulse = (durationMs = 500) => {
            if (pulseTimer) clearInterval(pulseTimer);

            // Check every 16ms (~60fps) for the duration of the expected animation
            const start = Date.now();
            pulseTimer = setInterval(() => {
                fitTerminal();
                if (Date.now() - start > durationMs) {
                    if (pulseTimer) clearInterval(pulseTimer);
                }
            }, 16);
        };

        // 1. Initial fit
        requestAnimationFrame(() => fitTerminal());

        // 2. Continuous resize observation (handles most drags)
        const resizeObserver = new ResizeObserver(() => {
            fitTerminal();
            // Start a short pulse to catch the end of the layout shift
            triggerPulse(200);
        });

        // 3. Fallback for CSS transitions/animations
        const onTransitionEnd = () => fitTerminal();

        element.addEventListener('transitionend', onTransitionEnd);
        element.addEventListener('animationend', onTransitionEnd);
        resizeObserver.observe(element);

        return () => {
            if (pulseTimer) clearInterval(pulseTimer);
            resizeObserver.disconnect();
            element.removeEventListener('transitionend', onTransitionEnd);
            element.removeEventListener('animationend', onTransitionEnd);
        };
    }, [containerRef, terminal]);
}
