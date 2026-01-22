import { useEffect, useRef, RefObject } from 'react';
import { Terminal, ITerminalOptions } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import { WebglAddon } from '@xterm/addon-webgl';
import * as log from "@tauri-apps/plugin-log";

interface UseXtermOptions extends ITerminalOptions {
    hideCursor?: boolean;
    useWebgl?: boolean;
}

const TERM_CONFIG = {
    cursorBlink: false,
    cursorStyle: 'bar' as const,
    fontFamily: '"FiraCode Nerd Font", monospace',
    fontSize: 12,
    lineHeight: 1.15,
    scrollOnUserInput: true,
    theme: {
        background: '#000000',
        foreground: '#d4d4d8', // zinc-300
        cursor: 'transparent',
        selectionBackground: '#27272a', // zinc-800
        black: '#000000',
        red: '#ef4444',
        green: '#10b981',
        yellow: '#f59e0b',
        blue: '#3b82f6',
        magenta: '#d946ef',
        cyan: '#06b6d4',
        white: '#e4e4e7',
        brightBlack: '#71717a',
        brightRed: '#f87171',
        brightGreen: '#34d399',
        brightYellow: '#fbbf24',
        brightBlue: '#60a5fa',
        brightMagenta: '#e879f9',
        brightCyan: '#22d3ee',
        brightWhite: '#ffffff',
    },
    allowProposedApi: true,
};

export function useXterm(
    containerRef: RefObject<HTMLDivElement | null>,
    options: UseXtermOptions = {}
) {
    const terminalRef = useRef<Terminal | null>(null);
    const fitAddonRef = useRef<FitAddon | null>(null);

    const optionsRef = useRef({
        ...TERM_CONFIG,
        ...options,
    });
    // Note: We don't update optionsRef.current during render.
    // Terminal initialization typically happens once.

    useEffect(() => {
        if (!containerRef.current) return;

        const { hideCursor, useWebgl, ...terminalOptions } = optionsRef.current;

        // Create terminal instance
        const term = new Terminal(terminalOptions);
        const fitAddon = new FitAddon();
        term.loadAddon(fitAddon);

        // Load WebGL addon if requested
        if (useWebgl) {
            try {
                const webglAddon = new WebglAddon();
                term.loadAddon(webglAddon);
            } catch (e) {
                log.warn(`WebGL addon failed to load: ${e}`);
            }
        }

        term.open(containerRef.current);

        // Hide cursor if requested
        if (hideCursor) {
            // ANSI escape sequence to hide the cursor (?25l)
            term.write('\x1b[?25l');
        }

        terminalRef.current = term;
        fitAddonRef.current = fitAddon;

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

        resizeObserver.observe(containerRef.current);

        return () => {
            resizeObserver.disconnect();
            term.dispose();
            terminalRef.current = null;
            fitAddonRef.current = null;
        };
    }, [containerRef]); // Only depend on containerRef

    return { terminalRef, fitAddonRef };
}
