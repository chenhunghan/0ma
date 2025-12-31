import { useMemo } from "react";
import { useTauriStore, useTauriStoreValue } from "src/providers/tauri-store-provider";

export function useLayoutStorage() {
    const { set, isLoadingStore } = useTauriStore();

    const { data: resizableLayout } = useTauriStoreValue<Record<string, string>>("resizable-layouts");

    const resizableLayoutStorage = useMemo(() => ({
        getItem: (name: string): string | null => {
            return resizableLayout?.[name] || null;
        },
        setItem: (name: string, value: string): void => {
            set("resizable-layouts", {
                ...(resizableLayout || {}),
                [name]: value
            });
        }
    }), [resizableLayout, set]);

    return { resizableLayoutStorage, isLoadingStore };
}
