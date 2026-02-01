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

        const parsePixels = (value: string) => {
            const parsed = Number.parseInt(value, 10);
            return Number.isFinite(parsed) ? parsed : 0;
        };

        const fitUsingClientSize = () => {
            const termElement = terminal.element;
            if (!termElement) return false;

            const core = (terminal as unknown as {
                _core?: { _renderService?: { dimensions?: { css?: { cell?: { width: number; height: number } } } } }
            })._core;
            const cell = core?._renderService?.dimensions?.css?.cell;
            if (!cell || cell.width <= 0 || cell.height <= 0) return false;

            const termStyle = window.getComputedStyle(termElement);
            const paddingH = parsePixels(termStyle.getPropertyValue("padding-left")) +
                parsePixels(termStyle.getPropertyValue("padding-right"));
            const paddingV = parsePixels(termStyle.getPropertyValue("padding-top")) +
                parsePixels(termStyle.getPropertyValue("padding-bottom"));

            const scrollbarWidth = terminal.options.scrollback === 0
                ? 0
                : terminal.options.overviewRuler?.width ?? 14;

            const availableWidth = Math.max(0, element.clientWidth - paddingH - scrollbarWidth);
            const availableHeight = Math.max(0, element.clientHeight - paddingV);

            if (availableWidth <= 0 || availableHeight <= 0) return false;

            const cols = Math.max(2, Math.floor(availableWidth / cell.width));
            const rows = Math.max(1, Math.floor(availableHeight / cell.height));

            if (cols !== terminal.cols || rows !== terminal.rows) {
                terminal.resize(cols, rows);
                return true;
            }

            return false;
        };

        const fitTerminal = (forceRefresh = false) => {
            try {
                if (element.clientWidth <= 0 || element.clientHeight <= 0) return;

                const buffer = terminal.buffer?.active;
                const wasAtBottom = buffer ? buffer.viewportY >= buffer.baseY : true;

                fitAddon.fit();
                const adjusted = fitUsingClientSize();

                const currentDimensions = { cols: terminal.cols, rows: terminal.rows };
                const changed = currentDimensions.cols !== lastDimensions.cols ||
                    currentDimensions.rows !== lastDimensions.rows;

                if ((forceRefresh || changed || adjusted) && terminal.rows > 0) {
                    terminal.refresh(0, terminal.rows - 1);
                    if (wasAtBottom) {
                        terminal.scrollToBottom();
                    }
                }

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

        const fitRef = (forceRefresh = false) => {
            fitTerminal(forceRefresh);
            if (forceRefresh) {
                triggerPulse(200);
            }
        };
        terminal.fit = fitRef;

        // 1. Initial fit
        requestAnimationFrame(() => {
            fitTerminal(true);
            triggerPulse(600);
        });

        // 2. Continuous resize observation (handles most drags)
        const resizeObserver = new ResizeObserver(() => {
            fitTerminal(true);
            // Start a short pulse to catch the end of the layout shift
            triggerPulse(200);
        });

        // 3. Fallback for CSS transitions/animations
        const onTransitionEnd = () => fitTerminal(true);

        element.addEventListener('transitionend', onTransitionEnd);
        element.addEventListener('animationend', onTransitionEnd);
        const panelElement = element.closest('[data-panel]') as HTMLElement | null;
        const observedElements = new Set<HTMLElement>([element]);
        if (panelElement && panelElement !== element) {
            observedElements.add(panelElement);
        }
        observedElements.forEach((target) => resizeObserver.observe(target));

        return () => {
            if (animationFrameId) cancelAnimationFrame(animationFrameId);
            resizeObserver.disconnect();
            element.removeEventListener('transitionend', onTransitionEnd);
            element.removeEventListener('animationend', onTransitionEnd);
            if (terminal.fit === fitRef) {
                terminal.fit = undefined;
            }
        };
    }, [containerRef, terminal]);
}
