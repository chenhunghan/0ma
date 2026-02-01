import { useEffect, useRef, useCallback, RefObject } from "react";
import { Terminal } from "@xterm/xterm";
import * as log from "@tauri-apps/plugin-log";
import { TERMINAL_METRICS } from "./config";

interface UseTerminalResizeOptions {
  containerRef: RefObject<HTMLDivElement | null>;
  terminal: Terminal | null;
  isActive?: boolean;
}

/**
 * Hook for managing terminal resize without FitAddon.
 *
 * IMPORTANT: This hook only calls terminal.resize() and terminal.refresh().
 * PTY resize is handled separately by useTerminalSessionResize which
 * listens to terminal.onResize events.
 */
export function useTerminalResize({
  containerRef,
  terminal,
  isActive = true,
}: UseTerminalResizeOptions) {
  const lastDimensionsRef = useRef({ cols: 0, rows: 0 });
  const animationFrameIdRef = useRef<number | null>(null);
  const stableCountRef = useRef(0);
  const isDraggingRef = useRef(false);

  /**
   * Get cell dimensions from xterm's internal render service.
   * This is more accurate than measuring a separate element.
   */
  const getCellDimensions = useCallback(() => {
    if (!terminal?.element) return null;

    const core = (
      terminal as unknown as {
        _core?: {
          _renderService?: { dimensions?: { css?: { cell?: { width: number; height: number } } } };
        };
      }
    )._core;
    const cell = core?._renderService?.dimensions?.css?.cell;

    if (cell?.width && cell.width > 0 && cell?.height && cell.height > 0) {
      return { width: cell.width, height: cell.height };
    }

    return null;
  }, [terminal]);

  /**
   * Calculate cols/rows from container dimensions.
   * Ported from useXtermFit.ts fitUsingClientSize().
   */
  const calculateDimensions = useCallback(() => {
    const container = containerRef.current;
    const termElement = terminal?.element;
    if (!container || !termElement) return null;

    const cell = getCellDimensions();
    if (!cell) return null;

    // Get padding from computed style
    const termStyle = window.getComputedStyle(termElement);
    const parsePixels = (value: string) => {
      const parsed = parseInt(value, 10);
      return Number.isFinite(parsed) ? parsed : 0;
    };
    const paddingH = parsePixels(termStyle.paddingLeft) + parsePixels(termStyle.paddingRight);
    const paddingV = parsePixels(termStyle.paddingTop) + parsePixels(termStyle.paddingBottom);

    // Get scrollbar width
    const terminalOptions = terminal.options as {
      overviewRuler?: { width?: number };
      scrollback?: number;
    };
    const scrollbarWidth =
      terminal.options.scrollback === 0
        ? 0
        : (terminalOptions.overviewRuler?.width ?? TERMINAL_METRICS.scrollbarWidth);

    // Calculate available space
    const availableWidth = Math.max(0, container.clientWidth - paddingH - scrollbarWidth);
    const availableHeight = Math.max(0, container.clientHeight - paddingV);

    if (availableWidth <= 0 || availableHeight <= 0) return null;

    // Calculate cols and rows
    const cols = Math.max(TERMINAL_METRICS.minimumCols, Math.floor(availableWidth / cell.width));
    const rows = Math.max(TERMINAL_METRICS.minimumRows, Math.floor(availableHeight / cell.height));

    return { cols, rows };
  }, [containerRef, terminal, getCellDimensions]);

  /**
   * Fit terminal to container.
   * Only calls terminal.resize() - PTY resize handled by useTerminalSessionResize.
   *
   * VSCode patterns implemented:
   * - NaN validation before resize
   * - Separate col-only and row-only resize for performance
   * - Post-resize refresh()
   */
  const fitTerminal = useCallback(
    (forceRefresh = false) => {
      if (!terminal || !containerRef.current) return false;

      const container = containerRef.current;
      if (container.clientWidth <= 0 || container.clientHeight <= 0) return false;

      try {
        // Remember scroll position
        const buffer = terminal.buffer?.active;
        const wasAtBottom = buffer ? buffer.viewportY >= buffer.baseY : true;

        // Calculate new dimensions
        const dimensions = calculateDimensions();
        if (!dimensions) return false;

        const { cols, rows } = dimensions;

        // VSCode pattern: Validate dimensions (prevent NaN)
        if (isNaN(cols) || isNaN(rows) || cols < 1 || rows < 1) {
          log.debug(`Invalid dimensions: cols=${cols}, rows=${rows}`);
          return false;
        }

        const last = lastDimensionsRef.current;
        const colsChanged = cols !== last.cols;
        const rowsChanged = rows !== last.rows;

        // VSCode pattern: Separate col-only and row-only resize for performance
        // Row-only changes don't need horizontal reflow
        if (colsChanged && rowsChanged) {
          // Full resize
          terminal.resize(cols, rows);
        } else if (colsChanged) {
          // Column-only resize
          terminal.resize(cols, terminal.rows);
        } else if (rowsChanged) {
          // Row-only resize (more efficient - no horizontal reflow)
          terminal.resize(terminal.cols, rows);
        }

        if (colsChanged || rowsChanged) {
          lastDimensionsRef.current = { cols, rows };
        }

        // Refresh display (prevents content cutoff)
        if ((forceRefresh || colsChanged || rowsChanged) && terminal.rows > 0) {
          terminal.refresh(0, terminal.rows - 1);
          if (wasAtBottom) {
            terminal.scrollToBottom();
          }
        }

        return colsChanged || rowsChanged;
      } catch (e) {
        log.debug(`Terminal fit error: ${e}`);
        return false;
      }
    },
    [terminal, containerRef, calculateDimensions],
  );

  /**
   * Start a pulse of RAF calls to catch animation end.
   */
  const triggerPulse = useCallback(
    (durationMs = 500) => {
      if (animationFrameIdRef.current) {
        cancelAnimationFrame(animationFrameIdRef.current);
      }
      stableCountRef.current = 0;
      const start = Date.now();

      const pulse = () => {
        const changed = fitTerminal();
        if (changed) {
          stableCountRef.current = 0;
        } else {
          stableCountRef.current++;
        }

        // Stop if stable for 10 frames (~160ms) OR duration exceeded
        if (stableCountRef.current > 10 || Date.now() - start > durationMs) {
          animationFrameIdRef.current = null;
          return;
        }

        animationFrameIdRef.current = requestAnimationFrame(pulse);
      };

      animationFrameIdRef.current = requestAnimationFrame(pulse);
    },
    [fitTerminal],
  );

  /**
   * Called when drag ends - flush any pending resize.
   */
  const onDragEnd = useCallback(() => {
    isDraggingRef.current = false;
    // Force refresh and longer pulse to ensure final state is captured
    fitTerminal(true);
    triggerPulse(300);
  }, [fitTerminal, triggerPulse]);

  /**
   * Called when drag starts.
   */
  const onDragStart = useCallback(() => {
    isDraggingRef.current = true;
  }, []);

  // Setup ResizeObserver and event listeners
  useEffect(() => {
    const container = containerRef.current;
    if (!container || !terminal) return;

    // Initial fit
    requestAnimationFrame(() => {
      fitTerminal(true);
      triggerPulse(600);
    });

    // ResizeObserver for container size changes
    const resizeObserver = new ResizeObserver(() => {
      fitTerminal(true);
      triggerPulse(200);
    });

    // Observe container and parent panel if exists
    resizeObserver.observe(container);
    const panelElement = container.closest("[data-panel]") as HTMLElement | null;
    if (panelElement && panelElement !== container) {
      resizeObserver.observe(panelElement);
    }

    // CSS transition/animation fallback
    const onTransitionEnd = () => fitTerminal(true);
    container.addEventListener("transitionend", onTransitionEnd);
    container.addEventListener("animationend", onTransitionEnd);

    return () => {
      if (animationFrameIdRef.current) {
        cancelAnimationFrame(animationFrameIdRef.current);
      }
      resizeObserver.disconnect();
      container.removeEventListener("transitionend", onTransitionEnd);
      container.removeEventListener("animationend", onTransitionEnd);
    };
  }, [containerRef, terminal, fitTerminal, triggerPulse]);

  // Handle visibility changes (isActive prop)
  useEffect(() => {
    if (!terminal || !isActive) return;

    // When becoming active, force fit with delay
    const rafId = requestAnimationFrame(() => {
      fitTerminal(true);
      triggerPulse(200);
    });

    return () => cancelAnimationFrame(rafId);
  }, [terminal, isActive, fitTerminal, triggerPulse]);

  return {
    fitTerminal,
    onDragStart,
    onDragEnd,
  };
}
