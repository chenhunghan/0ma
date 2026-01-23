import { useEffect, RefObject } from 'react';
import * as log from "@tauri-apps/plugin-log";
import { ExtendedTerminal } from './types';

/**
 * Hook for managing terminal fitting and resize observation.
 * Optimized for smooth dragging and animations using GPU-synced pulses.
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
        let animationFrameId: number | null = null;
        let stableCount = 0;

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

        const triggerPulse = (durationMs = 500) => {
            if (animationFrameId) cancelAnimationFrame(animationFrameId);
            stableCount = 0;
            const start = Date.now();

            const pulse = () => {
                const changed = fitTerminal();
                if (changed) {
                    stableCount = 0;
                } else {
                    stableCount++;
                }

                // Stop if stable for 10 frames (~160ms) OR duration exceeded
                if (stableCount > 10 || Date.now() - start > durationMs) {
                    animationFrameId = null;
                    return;
                }

                animationFrameId = requestAnimationFrame(pulse);
            };

            animationFrameId = requestAnimationFrame(pulse);
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
            if (animationFrameId) cancelAnimationFrame(animationFrameId);
            resizeObserver.disconnect();
            element.removeEventListener('transitionend', onTransitionEnd);
            element.removeEventListener('animationend', onTransitionEnd);
        };
    }, [containerRef, terminal]);
}
