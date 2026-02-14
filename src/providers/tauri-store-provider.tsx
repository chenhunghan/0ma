import { createContext, useCallback, useContext, useMemo } from "react";
import type { Store } from "@tauri-apps/plugin-store";
import { load } from "@tauri-apps/plugin-store";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { defaultGlobalStoreFileName, queryKeyForValue } from "./tauri-store-constants";

interface TauriStoreContextType {
  store: Store | null;
  isLoadingStore: boolean;
  errorLoadingStore: Error | null;
  save: () => void;
  isSaving: boolean;
  errorSave: Error | null;
  set: (key: string, value: unknown) => void;
  isSetting: boolean;
  errorSet: Error | null;
  remove: (key: string) => void;
  isRemoving: boolean;
  errorRemove: Error | null;
  storeFileName: string;
}

const TauriStoreContext = createContext<TauriStoreContextType | undefined>(undefined);

interface TauriStoreProviderProps {
  children: React.ReactNode;
  storeFileName?: string;
}

export function TauriStoreProvider({
  children,
  storeFileName = defaultGlobalStoreFileName,
}: TauriStoreProviderProps) {
  const queryClient = useQueryClient();

  const {
    data: store,
    isLoading: isLoadingStore,
    error: errorLoadingStore,
  } = useQuery({
    initialData: null,
    queryFn: async () => await load(storeFileName, { autoSave: false, defaults: {} }),
    queryKey: ["tauri-store", storeFileName],
  });

  const {
    mutate: saveMutation,
    isPending: isSaving,
    error: errorSave,
  } = useMutation({
    mutationFn: async () => {
      if (store) {
        await store.save();
      }
    },
  });

  const save = useCallback(() => {
    saveMutation();
  }, [saveMutation]);

  const {
    mutate: setMutation,
    isPending: isSetting,
    error: errorSet,
  } = useMutation({
    mutationFn: async ({ key, value }: { key: string; value: unknown }) => {
      if (store) {
        await store.set(key, value);
        await store.save();
      }
    },
    onSuccess: (_, { key }) => {
      queryClient.invalidateQueries({ queryKey: [queryKeyForValue, storeFileName, key] });
    },
  });

  const set = useCallback(
    (key: string, value: unknown) => {
      setMutation({ key, value });
    },
    [setMutation],
  );

  const {
    mutate: removeMutation,
    isPending: isRemoving,
    error: errorRemove,
  } = useMutation({
    mutationFn: async (key: string) => {
      if (store) {
        await store.delete(key);
        await store.save();
      }
    },
    onSuccess: (_, key) => {
      queryClient.invalidateQueries({ queryKey: [queryKeyForValue, storeFileName, key] });
    },
  });

  const remove = useCallback(
    (key: string) => {
      removeMutation(key);
    },
    [removeMutation],
  );

  const contextValue = useMemo(
    () => ({
      errorLoadingStore,
      errorRemove,
      errorSave,
      errorSet,
      isLoadingStore,
      isRemoving,
      isSaving,
      isSetting,
      remove,
      save,
      set,
      store,
      storeFileName,
    }),
    [
      store,
      isLoadingStore,
      errorLoadingStore,
      save,
      isSaving,
      errorSave,
      set,
      isSetting,
      errorSet,
      remove,
      isRemoving,
      errorRemove,
      storeFileName,
    ],
  );

  return <TauriStoreContext.Provider value={contextValue}>{children}</TauriStoreContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useTauriStore() {
  const context = useContext(TauriStoreContext);
  if (context === undefined) {
    throw new Error("useTauriStore must be used within a TauriStoreProvider");
  }
  return context;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useTauriStoreValue<T = unknown>(key: string) {
  const { store, storeFileName } = useTauriStore();

  return useQuery({
    enabled: Boolean(store),
    initialData: null,
    queryFn: async () => {
      if (!store) {
        return null;
      }
      const value = await store.get<T>(key);
      return value ?? null;
    },
    queryKey: [queryKeyForValue, storeFileName, key],
  });
}
