import { useEffect, useRef, RefObject } from 'react';
import { Terminal } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import { WebglAddon } from '@xterm/addon-webgl';
import * as log from "@tauri-apps/plugin-log";

/**
 * Hook for managing xterm.js addons (Fit and optionally WebGL).
 */
export function useXtermAddons(
    terminalRef: RefObject<Terminal | null>,
    useWebgl?: boolean
) {
    const fitAddonRef = useRef<FitAddon | null>(null);

    useEffect(() => {
        const term = terminalRef.current;
        if (!term) return;

        // Initialize FitAddon
        const fitAddon = new FitAddon();
        term.loadAddon(fitAddon);
        fitAddonRef.current = fitAddon;

        // Optionally initialize WebGL
        if (useWebgl) {
            try {
                const webglAddon = new WebglAddon();
                term.loadAddon(webglAddon);
            } catch (e) {
                log.warn(`WebGL addon failed to load: ${e}`);
            }
        }

        return () => {
            // Addons are disposed when the terminal is disposed
        };
    }, [terminalRef, useWebgl]);

    return { fitAddonRef };
}
