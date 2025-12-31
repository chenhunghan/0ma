import { createContext, useContext, useCallback, useMemo } from 'react';
import { load, Store } from '@tauri-apps/plugin-store';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

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

export const defaultGlobalStoreFileName = 'app.json';
export const queryKeyForValue = 'tauri-store-value';

export function TauriStoreProvider({ children, storeFileName = defaultGlobalStoreFileName }: TauriStoreProviderProps) {
    const queryClient = useQueryClient();

    const { data: store, isLoading: isLoadingStore, error: errorLoadingStore } = useQuery({
        queryKey: ['tauri-store', storeFileName],
        queryFn: async () => {
            return await load(storeFileName, { autoSave: false, defaults: {} });
        },
        initialData: null,
    });

    const { mutate: saveMutation, isPending: isSaving, error: errorSave } = useMutation({
        mutationFn: async () => {
            if (store) {
                await store.save();
            }
        },
    });

    const save = useCallback(() => {
        saveMutation();
    }, [saveMutation]);

    const { mutate: setMutation, isPending: isSetting, error: errorSet } = useMutation({
        mutationFn: async ({ key, value }: { key: string, value: unknown }) => {
            if (store) {
                await store.set(key, value);
            }
        },
        onSuccess: (_, { key }) => {
            queryClient.invalidateQueries({ queryKey: [queryKeyForValue, storeFileName, key] });
        },
    });

    const set = useCallback((key: string, value: unknown) => {
        setMutation({ key, value });
    }, [setMutation]);

    const { mutate: removeMutation, isPending: isRemoving, error: errorRemove } = useMutation({
        mutationFn: async (key: string) => {
            if (store) {
                await store.delete(key);
            }
        },
        onSuccess: (_, key) => {
            queryClient.invalidateQueries({ queryKey: [queryKeyForValue, storeFileName, key] });
        },
    });

    const remove = useCallback((key: string) => {
        removeMutation(key);
    }, [removeMutation]);

    const contextValue = useMemo(() => ({
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
        storeFileName
    }), [
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
        storeFileName
    ]);

    return (
        <TauriStoreContext.Provider value={contextValue}>
            {children}
        </TauriStoreContext.Provider>
    );
}

export function useTauriStore() {
    const context = useContext(TauriStoreContext);
    if (context === undefined) {
        throw new Error('useTauriStore must be used within a TauriStoreProvider');
    }
    return context;
}

export function useTauriStoreValue<T = unknown>(key: string) {
    const { store, storeFileName } = useTauriStore();

    return useQuery({
        queryKey: [queryKeyForValue, storeFileName, key],
        queryFn: async () => {
            if (!store) return null;
            const val = await store.get<T>(key);
            return val ?? null; // Ensure we return null instead of undefined for cleaner React handling
        },
        enabled: !!store,
        initialData: null,
    });
}
