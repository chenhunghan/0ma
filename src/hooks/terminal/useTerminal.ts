import { RefObject } from 'react';
import { Terminal } from '@xterm/xterm';
import { useTerminalSpawn } from './useTerminalSpawn';
import { useTerminalConnect } from './useTerminalConnect';
import { useTerminalClose } from './useTerminalClose';

/**
 * Combined hook for convenience, providing spawn, connect, and close functionality.
 */
export function useTerminal(terminalRef: RefObject<Terminal | null>) {
    const spawnHook = useTerminalSpawn(terminalRef);
    const connectHook = useTerminalConnect(terminalRef);
    const closeHook = useTerminalClose();

    // Derive sessionId from whichever action succeeded
    const sessionId = spawnHook.sessionId ?? connectHook.sessionId;

    return {
        sessionId,

        // Spawn
        spawn: spawnHook.spawn,
        isSpawning: spawnHook.isSpawning,
        spawnError: spawnHook.spawnError,

        // Connect
        connect: connectHook.connect,
        isConnecting: connectHook.isConnecting,
        connectError: connectHook.connectError,

        // Close
        close: closeHook.close,
        isClosing: closeHook.isClosing,
        closeError: closeHook.closeError,

        // Combined states
        isLoading: spawnHook.isSpawning || connectHook.isConnecting || closeHook.isClosing,
        isReady: spawnHook.isSpawned || connectHook.isConnected,
    };
}
