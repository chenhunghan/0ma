import { Terminal } from '@xterm/xterm';
import { useTerminalSessionSpawn } from './useTerminalSessionSpawn';
import { useTerminalSessionConnect } from './useTerminalSessionConnect';
import { useTerminalSessionClose } from './useTerminalSessionClose';
import { useTerminalSessionData } from './useTerminalSessionData';
import { useTerminalSessionResize } from './useTerminalSessionResize';

/**
 * Combined hook for convenience, providing spawn, connect, and close functionality.
 */
export function useTerminalSession(terminal: Terminal | null) {
    const spawnHook = useTerminalSessionSpawn(terminal);
    const connectHook = useTerminalSessionConnect(terminal);
    const closeHook = useTerminalSessionClose();

    // Derive sessionId from whichever action succeeded
    const sessionId = spawnHook.sessionId ?? connectHook.sessionId;

    // Orchestrate I/O listeners here at the top level
    useTerminalSessionData(terminal, sessionId);
    useTerminalSessionResize(terminal, sessionId);

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
