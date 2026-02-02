import type { RefObject } from "react";
import { useEffect, useRef, useCallback } from "react";
import type { Terminal } from "@xterm/xterm";
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
   * Get xterm core internals for dimension calculations.
   * This matches FitAddon's approach.
   */
  const getXtermCore = useCallback(() => {
    if (!terminal?.element) {return null;}

    const core = (
      terminal as unknown as {
        _core?: {
          _renderService?: {
            dimensions?: { css?: { cell?: { width: number; height: number } } };
          };
          viewport?: { scrollBarWidth: number };
        };
      }
    )._core;

    return core ?? null;
  }, [terminal]);

  /**
   * Calculate cols/rows from container dimensions.
   * Matches FitAddon's proposeDimensions() exactly.
   */
  const calculateDimensions = useCallback(() => {
    const termElement = terminal?.element;
    const parentElement = termElement?.parentElement;
    if (!termElement || !parentElement) {return null;}

    const core = getXtermCore();
    const dims = core?._renderService?.dimensions;
    if (!dims?.css?.cell?.width || !dims?.css?.cell?.height) {return null;}
    if (dims.css.cell.width === 0 || dims.css.cell.height === 0) {return null;}

    // Get scrollbar width from xterm's viewport
    // Always use at least TERMINAL_METRICS.scrollbarWidth if scrollback is enabled,
    // Since viewport.scrollBarWidth may not be initialized yet
    const scrollbarWidth =
      terminal.options.scrollback === 0
        ? 0
        : Math.max(core?.viewport?.scrollBarWidth ?? 0, TERMINAL_METRICS.scrollbarWidth);

    // Use containerRef dimensions directly (more reliable than parentElement)
    const container = containerRef.current;
    if (!container) {return null;}
    const parentHeight = container.clientHeight;
    const parentWidth = container.clientWidth;

    // FitAddon uses getComputedStyle on terminal element for padding
    const elementStyle = window.getComputedStyle(termElement);
    const paddingTop = parseInt(elementStyle.getPropertyValue("padding-top"));
    const paddingBottom = parseInt(elementStyle.getPropertyValue("padding-bottom"));
    const paddingLeft = parseInt(elementStyle.getPropertyValue("padding-left"));
    const paddingRight = parseInt(elementStyle.getPropertyValue("padding-right"));

    const availableHeight = parentHeight - paddingTop - paddingBottom;
    const availableWidth = parentWidth - paddingLeft - paddingRight - scrollbarWidth;

    // Debug logging
    log.debug(
      `[useTerminalResize] parent=${parentWidth}x${parentHeight} padding=${paddingLeft},${paddingRight},${paddingTop},${paddingBottom} scrollbar=${scrollbarWidth} cell=${dims.css.cell.width}x${dims.css.cell.height} => ${Math.floor(availableWidth / dims.css.cell.width)}x${Math.floor(availableHeight / dims.css.cell.height)}`,
    );

    if (availableWidth <= 0 || availableHeight <= 0) {return null;}

    const cols = Math.max(
      TERMINAL_METRICS.minimumCols,
      Math.floor(availableWidth / dims.css.cell.width),
    );
    // Subtract 3 rows to ensure last line is always visible
    const rawRows = Math.floor(availableHeight / dims.css.cell.height);
    const rows = Math.max(TERMINAL_METRICS.minimumRows, rawRows - 3);

    return { cols, rows };
  }, [terminal, getXtermCore]);

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
      if (!terminal || !containerRef.current) {return false;}

      const container = containerRef.current;
      if (container.clientWidth <= 0 || container.clientHeight <= 0) {return false;}

      try {
        // Remember scroll position
        const buffer = terminal.buffer?.active;
        const wasAtBottom = buffer ? buffer.viewportY >= buffer.baseY : true;

        // Calculate new dimensions
        const dimensions = calculateDimensions();
        if (!dimensions) {return false;}

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

          // Log actual element dimensions after resize
          const termEl = terminal.element;
          if (termEl) {
            const termRect = termEl.getBoundingClientRect();
            const containerRect = container.getBoundingClientRect();
            const viewport = termEl.querySelector(".xterm-viewport") as HTMLElement | null;
            const screen = termEl.querySelector(".xterm-screen") as HTMLElement | null;
            log.debug(
              `[useTerminalResize] AFTER resize: rows=${terminal.rows} termEl=${Math.round(termRect.height)}px container=${Math.round(containerRect.height)}px viewport=${viewport?.clientHeight ?? "?"}px screen=${screen?.clientHeight ?? "?"}px`,
            );
          }
        }

        // Refresh display (prevents content cutoff)
        if ((forceRefresh || colsChanged || rowsChanged) && terminal.rows > 0) {
          terminal.refresh(0, terminal.rows - 1);
          if (wasAtBottom) {
            terminal.scrollToBottom();
          }
        }

        return colsChanged || rowsChanged;
      } catch (error) {
        log.debug(`Terminal fit error: ${error}`);
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
    if (!container || !terminal) {return;}

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
    if (!terminal || !isActive) {return;}

    // When becoming active, force fit with delay
    const rafId = requestAnimationFrame(() => {
      fitTerminal(true);
      triggerPulse(200);
    });

    return () => cancelAnimationFrame(rafId);
  }, [terminal, isActive, fitTerminal, triggerPulse]);

  /**
   * Wait for xterm to be ready with valid dimensions.
   * Returns a promise that resolves when dimensions are available.
   */
  const waitForReady = useCallback((): Promise<boolean> => new Promise((resolve) => {
      let attempts = 0;
      const maxAttempts = 50; // ~500ms max wait

      const check = () => {
        attempts++;
        const dims = calculateDimensions();
        log.debug(
          `[useTerminalResize] waitForReady check #${attempts}: dims=${dims ? `${dims.cols}x${dims.rows}` : "null"}`,
        );
        if (dims && dims.cols > 0 && dims.rows > 0) {
          log.debug(
            `[useTerminalResize] Ready after ${attempts} attempts: ${dims.cols}x${dims.rows}`,
          );
          fitTerminal(true);
          resolve(true);
          return;
        }
        if (attempts >= maxAttempts) {
          log.warn("[useTerminalResize] Timed out waiting for dimensions");
          resolve(false);
          return;
        }
        requestAnimationFrame(check);
      };

      requestAnimationFrame(check);
    }), [calculateDimensions, fitTerminal]);

  return {
    fitTerminal,
    onDragEnd,
    onDragStart,
    waitForReady,
  };
}
