import { useTerminalSessionSpawn } from "./useTerminalSessionSpawn";
import { useTerminalSessionConnect } from "./useTerminalSessionConnect";
import { useTerminalSessionInput } from "./useTerminalSessionInput";
import { useTerminalSessionResize } from "./useTerminalSessionResize";

/**
 * Combined hook for convenience, providing spawn and connect functionality.
 * Session termination is handled separately via useTerminalSessionClose.
 *
 * terminal parameter is currently unused (xterm.js removed).
 * It will be replaced by the new terminal library instance.
 */
export function useTerminalSession(_terminal: unknown) {
  const spawnHook = useTerminalSessionSpawn();
  const connectHook = useTerminalSessionConnect();

  // Derive sessionId from whichever action succeeded
  const sessionId = spawnHook.sessionId ?? connectHook.sessionId;

  // Orchestrate I/O listeners here at the top level
  useTerminalSessionInput(sessionId);
  useTerminalSessionResize(sessionId);

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

    // Combined states
    isLoading: spawnHook.isSpawning || connectHook.isConnecting,
    isReady: spawnHook.isSpawned || connectHook.isConnected,
  };
}
