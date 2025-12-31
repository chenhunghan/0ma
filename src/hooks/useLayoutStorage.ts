import { useMemo } from "react";
import { useTauriStore, useTauriStoreValue } from "src/providers/tauri-store-provider";

export function useLayoutStorage() {
    const { set, isLoadingStore } = useTauriStore();
    // Store all layouts in a single dictionary key
    const { data: layouts } = useTauriStoreValue<Record<string, string>>("resizable-layouts");

    const storage = useMemo(() => ({
        getItem: (name: string): string | null => {
            return layouts?.[name] || null;
        },
        setItem: (name: string, value: string): void => {
            set("resizable-layouts", {
                ...(layouts || {}),
                [name]: value
            });
        }
    }), [layouts, set]);

    return { storage, isLoadingStore };
}
