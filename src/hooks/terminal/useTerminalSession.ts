import type { FrankenTermWeb } from "src/wasm/frankenterm-web/FrankenTerm";
import { useTerminalSessionSpawn } from "./useTerminalSessionSpawn";
import { useTerminalSessionConnect } from "./useTerminalSessionConnect";

/**
 * Combined hook for convenience, providing spawn and connect functionality.
 * Session termination is handled separately via useTerminalSessionClose.
 *
 * Input and resize are handled by useFrankenTermInput and useFrankenTermResize
 * at the component level (they need canvas/container refs).
 */
export function useTerminalSession(term: FrankenTermWeb | null, cols: number, rows: number) {
  const spawnHook = useTerminalSessionSpawn(term, cols, rows);
  const connectHook = useTerminalSessionConnect(term);

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

    // Combined states
    isLoading: spawnHook.isSpawning || connectHook.isConnecting,
    isReady: spawnHook.isSpawned || connectHook.isConnected,
  };
}
