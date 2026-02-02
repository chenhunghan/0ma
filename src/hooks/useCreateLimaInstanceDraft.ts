import { useCallback, useEffect } from "react";
import { useTauriStore, useTauriStoreValue } from "src/providers/tauri-store-provider";
import { LimaConfig } from "src/types/LimaConfig";
import { useDefaultK0sLimaConfig } from "./useDefaultK0sLimaConfig";

const NEW_INSTANCE_DRAFT_KEY = "newLimaInstanceDraft";
const NEW_INSTANCE_NAME_KEY = "newLimaInstanceName";

const generateInstanceName = () => `0ma-${Math.random().toString(36).substring(2, 6)}`;

/**
 * Hook to manage a draft Lima configuration for creating a NEW instance.
 * Stored in Tauri Store under a fixed key.
 *
 * Uses 'default' as a placeholder name to fetch the default structure.
 */
export function useCreateLimaInstanceDraft() {
  const { set } = useTauriStore();

  // Fetch dynamic default configuration
  const { defaultConfig, isLoading: isLoadingDefault } = useDefaultK0sLimaConfig("0ma");

  const { data: draftConfig, isLoading: isLoadingStoreConfig } =
    useTauriStoreValue<LimaConfig>(NEW_INSTANCE_DRAFT_KEY);

  const { data: instanceName, isLoading: isLoadingStoreName } =
    useTauriStoreValue<string>(NEW_INSTANCE_NAME_KEY);

  // If store draft is missing but default is loaded, initialize it.
  useEffect(() => {
    if (!isLoadingStoreConfig && !draftConfig && defaultConfig && !isLoadingDefault) {
      set(NEW_INSTANCE_DRAFT_KEY, defaultConfig);
    }
  }, [draftConfig, isLoadingStoreConfig, defaultConfig, isLoadingDefault, set]);

  // If store name is missing, initialize it.
  useEffect(() => {
    if (!isLoadingStoreName && !instanceName) {
      set(NEW_INSTANCE_NAME_KEY, generateInstanceName());
    }
  }, [instanceName, isLoadingStoreName, set]);

  // Combined loading state: Store loading, Defaults loading, or Draft/Name not yet populated in Store
  const isLoading =
    isLoadingStoreConfig || isLoadingStoreName || isLoadingDefault || !draftConfig || !instanceName;

  const updateField = useCallback(
    (field: keyof LimaConfig, value: unknown) => {
      if (draftConfig) {
        set(NEW_INSTANCE_DRAFT_KEY, { ...draftConfig, [field]: value });
      }
    },
    [draftConfig, set],
  );

  const setInstanceName = useCallback(
    (name: string) => {
      set(NEW_INSTANCE_NAME_KEY, name);
    },
    [set],
  );

  const updateDraftConfig = useCallback(
    (newConfig: LimaConfig) => {
      set(NEW_INSTANCE_DRAFT_KEY, newConfig);
    },
    [set],
  );

  const resetDraft = useCallback(() => {
    if (defaultConfig) {
      set(NEW_INSTANCE_DRAFT_KEY, defaultConfig);
      set(NEW_INSTANCE_NAME_KEY, generateInstanceName());
    }
  }, [set, defaultConfig]);

  return {
    draftConfig: draftConfig,
    instanceName: instanceName || "",
    setInstanceName,
    isLoading,
    updateField,
    updateDraftConfig,
    resetDraft,
  };
}
