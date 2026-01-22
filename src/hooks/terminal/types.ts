import { Terminal } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';

export interface PtyEvent {
    data: string;
}

export interface SpawnOptions {
    command: string;
    args: string[];
    cwd: string;
}

/**
 * Extended Terminal type to include custom properties like FitAddon.
 * This allows us to retrieve addons directly from the terminal instance
 * instead of passing around refs.
 */
export interface ExtendedTerminal extends Terminal {
    fitAddon?: FitAddon;
}
