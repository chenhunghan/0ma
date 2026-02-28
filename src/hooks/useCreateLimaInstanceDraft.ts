import { useCallback, useEffect } from "react";
import { useTauriStore, useTauriStoreValue } from "src/providers/tauri-store-provider";
import type { InstanceTemplate, LimaConfig } from "src/types/LimaConfig";
import { useDefaultDockerLimaConfig } from "./useDefaultDockerLimaConfig";
import { useDefaultK0sLimaConfig } from "./useDefaultK0sLimaConfig";

const NEW_INSTANCE_DRAFT_KEY = "newLimaInstanceDraft";
const NEW_INSTANCE_NAME_KEY = "newLimaInstanceName";
const NEW_INSTANCE_TEMPLATE_KEY = "newLimaInstanceTemplate";

const DEFAULT_TEMPLATE: InstanceTemplate = "docker";

const generateInstanceName = () => `0ma-${Math.random().toString(36).substring(2, 6)}`;

/**
 * Hook to manage a draft Lima configuration for creating a NEW instance.
 * Stored in Tauri Store under a fixed key.
 *
 * Fetches both Docker and Kubernetes defaults upfront so template switching is instant.
 */
export function useCreateLimaInstanceDraft() {
  const { set } = useTauriStore();

  // Fetch both default configurations unconditionally — react-query caches both
  const { defaultConfig: dockerDefault, isLoading: isLoadingDocker } =
    useDefaultDockerLimaConfig("0ma");
  const { defaultConfig: k8sDefault, isLoading: isLoadingK8s } = useDefaultK0sLimaConfig("0ma");

  const { data: draftConfig, isLoading: isLoadingStoreConfig } =
    useTauriStoreValue<LimaConfig>(NEW_INSTANCE_DRAFT_KEY);

  const { data: instanceName, isLoading: isLoadingStoreName } =
    useTauriStoreValue<string>(NEW_INSTANCE_NAME_KEY);

  const { data: currentTemplate, isLoading: isLoadingStoreTemplate } =
    useTauriStoreValue<InstanceTemplate>(NEW_INSTANCE_TEMPLATE_KEY);

  const template: InstanceTemplate = currentTemplate || DEFAULT_TEMPLATE;

  const activeDefault = template === "kubernetes" ? k8sDefault : dockerDefault;

  // Initialize the draft from the active template's default config.
  useEffect(() => {
    if (activeDefault && !draftConfig) {
      set(NEW_INSTANCE_DRAFT_KEY, activeDefault);
    }
  }, [activeDefault, draftConfig, set]);

  // Initialize template if missing.
  useEffect(() => {
    if (!isLoadingStoreTemplate && !currentTemplate) {
      set(NEW_INSTANCE_TEMPLATE_KEY, DEFAULT_TEMPLATE);
    }
  }, [currentTemplate, isLoadingStoreTemplate, set]);

  // If store name is missing, initialize it.
  useEffect(() => {
    if (!isLoadingStoreName && !instanceName) {
      set(NEW_INSTANCE_NAME_KEY, generateInstanceName());
    }
  }, [instanceName, isLoadingStoreName, set]);

  // Combined loading state
  const isLoading =
    isLoadingStoreConfig ||
    isLoadingStoreName ||
    isLoadingStoreTemplate ||
    isLoadingDocker ||
    isLoadingK8s ||
    !draftConfig ||
    !instanceName;

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

  const setTemplate = useCallback(
    (t: InstanceTemplate) => {
      set(NEW_INSTANCE_TEMPLATE_KEY, t);
      const newDefault = t === "kubernetes" ? k8sDefault : dockerDefault;
      if (newDefault) {
        set(NEW_INSTANCE_DRAFT_KEY, newDefault);
      }
    },
    [set, dockerDefault, k8sDefault],
  );

  const resetDraft = useCallback(() => {
    const defaultForReset = dockerDefault;
    if (defaultForReset) {
      set(NEW_INSTANCE_DRAFT_KEY, defaultForReset);
      set(NEW_INSTANCE_NAME_KEY, generateInstanceName());
      set(NEW_INSTANCE_TEMPLATE_KEY, DEFAULT_TEMPLATE);
    }
  }, [set, dockerDefault]);

  return {
    draftConfig: draftConfig,
    instanceName: instanceName || "",
    isLoading,
    resetDraft,
    setInstanceName,
    setTemplate,
    template,
    updateDraftConfig,
    updateField,
  };
}
