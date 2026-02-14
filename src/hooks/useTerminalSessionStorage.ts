import { useCallback, useEffect, useRef } from "react";
import { useTauriStore, useTauriStoreValue } from "src/providers/tauri-store-provider";
import type { TabGroup } from "src/components/TermTabs";
import * as log from "@tauri-apps/plugin-log";

const STORE_KEY = "terminal-sessions";

export interface PersistedTerminalState {
  limaTabs: TabGroup[];
  limaActive: string;
  limaMaxTabId: number;
  limaMaxTermId: number;
}

/**
 * Hook to persist and restore terminal tab/session state using the Tauri store.
 *
 * On mount, reads persisted state from the store.
 * Provides a `persist()` callback to save the current state.
 */
export function useTerminalSessionStorage() {
  const { set } = useTauriStore();
  const { data: stored, isFetched } = useTauriStoreValue<PersistedTerminalState>(STORE_KEY);

  const persistedRef = useRef(false);

  const persist = useCallback(
    (state: PersistedTerminalState) => {
      set(STORE_KEY, state);
    },
    [set],
  );

  // Log restoration
  useEffect(() => {
    if (isFetched && stored && !persistedRef.current) {
      persistedRef.current = true;
      log.debug(
        `[useTerminalSessionStorage] Restored ${stored.limaTabs?.length ?? 0} tab(s)`,
      );
    }
  }, [isFetched, stored]);

  return {
    restoredState: isFetched ? stored : null,
    isFetched,
    persist,
  };
}
