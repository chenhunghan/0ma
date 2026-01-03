import { useCallback, useEffect } from "react";
import { useTauriStore, useTauriStoreValue } from "src/providers/tauri-store-provider";
import { LimaConfig } from "src/types/LimaConfig";
import { useDefaultK0sLimaConfig } from "./useDefaultK0sLimaConfig";

const CREATE_INSTANCE_DRAFT_KEY = "createInstanceDraft";

/**
 * Hook to manage a draft Lima configuration for creating a NEW instance.
 * Stored in Tauri Store under a fixed key.
 * 
 * Uses 'default' as a placeholder name to fetch the default structure.
 */
export function useCreateLimaInstanceDraft() {
    const { set } = useTauriStore();

    // Fetch dynamic default configuration
    const {
        defaultConfig,
        isLoading: isLoadingDefault
    } = useDefaultK0sLimaConfig("default");

    const {
        data: draftConfig,
        isLoading: isLoadingStore,
    } = useTauriStoreValue<LimaConfig>(CREATE_INSTANCE_DRAFT_KEY);

    // If store draft is missing but default is loaded, initialize it.
    useEffect(() => {
        if (!isLoadingStore && !draftConfig && defaultConfig && !isLoadingDefault) {
            set(CREATE_INSTANCE_DRAFT_KEY, defaultConfig);
        }
    }, [draftConfig, isLoadingStore, defaultConfig, isLoadingDefault, set]);

    // Combined loading state: Store loading, Defaults loading, or Draft not yet populated in Store
    const isLoading = isLoadingStore || isLoadingDefault || !draftConfig;

    const updateField = useCallback((field: keyof LimaConfig, value: unknown) => {
        if (draftConfig) {
            set(CREATE_INSTANCE_DRAFT_KEY, { ...draftConfig, [field]: value });
        }
    }, [draftConfig, set]);

    const updateDraftConfig = useCallback((newConfig: LimaConfig) => {
        set(CREATE_INSTANCE_DRAFT_KEY, newConfig);
    }, [set]);

    const resetDraft = useCallback(() => {
        if (defaultConfig) {
            set(CREATE_INSTANCE_DRAFT_KEY, defaultConfig);
        }
    }, [set, defaultConfig]);

    return {
        draftConfig: draftConfig,
        isLoading,
        updateField,
        updateDraftConfig,
        resetDraft,
    };
}
