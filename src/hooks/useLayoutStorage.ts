import { useCallback, useMemo } from "react";
import { useTauriStore, useTauriStoreValue } from "src/providers/tauri-store-provider";

export const defaultAppTabValue = "lima";

export function useLayoutStorage() {
    const { set, isLoadingStore } = useTauriStore();

    const { data: resizableLayout } = useTauriStoreValue<Record<string, string>>("resizable-layouts");

    // The key to store the active top-level app tab (lima, k8s, config)
    const { data: tabs, isFetched } = useTauriStoreValue<Record<string, string>>("app-tabs");

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

    const activeTab = tabs?.["activeTab"] || defaultAppTabValue;
    const setActiveTab = useCallback((value: string) => {
        set("app-tabs", {
            ...(tabs || {}),
            "activeTab": value
        });
    }, [tabs, set]);

    return {
        resizableLayoutStorage,
        activeTab,
        setActiveTab,
        isLoadingActiveTabs: !isFetched,
        isLoadingStore,
    };
}
