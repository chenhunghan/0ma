import { useEffect } from 'react';
import { WebglAddon } from '@xterm/addon-webgl';
import * as log from "@tauri-apps/plugin-log";
import { ExtendedTerminal } from './types';

/**
 * Hook for managing secondary/optional xterm.js addons.
 * Primary addons (like FitAddon) are initialized directly in useXterm.
 */
export function useXtermAddons(
    terminal: ExtendedTerminal | null,
    useWebgl?: boolean
) {
    useEffect(() => {
        if (!terminal) return;

        // Optionally initialize WebGL
        if (useWebgl) {
            try {
                const webglAddon = new WebglAddon();
                terminal.loadAddon(webglAddon);
            } catch (e) {
                log.warn(`WebGL addon failed to load: ${e}`);
            }
        }
    }, [terminal, useWebgl]);
}
