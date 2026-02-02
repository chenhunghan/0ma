import { useCallback, useMemo } from "react";
import type { LimaInstance } from "../types/LimaInstance";
import { useTauriStore, useTauriStoreValue } from "src/providers/tauri-store-provider";
import { useLimaInstances } from "./useLimaInstances";

const SELECTED_INSTANCE_KEY = "selected-instance-name";

export function useSelectedInstance() {
  const { instances, isLoading: isLoadingInstances, error } = useLimaInstances();
  const { set } = useTauriStore();
  const { data: persistedName, isFetched: isPersistedNameFetched } =
    useTauriStoreValue<string>(SELECTED_INSTANCE_KEY);

  // Derive the current selection from live instances and the persisted name.
  // This handles external deletions, renames, and initial fallbacks automatically.
  const selectedName = useMemo(() => {
    if (isLoadingInstances || !isPersistedNameFetched) {return null;}

    // 1. Try to use the persisted name if it's still valid
    const stillExists = instances.some((i: LimaInstance) => i.name === persistedName);
    if (persistedName && stillExists) {
      return persistedName;
    }

    // 2. Fallback to the first available instance if nothing is persisted or it was deleted
    return instances.length > 0 ? instances[0].name : null;
  }, [instances, isLoadingInstances, persistedName, isPersistedNameFetched]);

  const setSelectedName = useCallback(
    (name: string | null) => {
      set(SELECTED_INSTANCE_KEY, name);
    },
    [set],
  );

  const isLoading = isLoadingInstances || (!isPersistedNameFetched && instances.length > 0);
  const selectedInstance = useMemo(() => instances.find((i) => i.name === selectedName), [instances, selectedName]);

  return {
    error,
    isLoading,
    selectedInstance,
    selectedName,
    setSelectedName,
  };
}
