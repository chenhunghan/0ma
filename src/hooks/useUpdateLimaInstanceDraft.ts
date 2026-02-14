import { useCallback, useEffect, useMemo } from "react";
import { isEqual } from "lodash";
import { useLimaYaml } from "./useLimaYaml";
import { useTauriStore, useTauriStoreValue } from "src/providers/tauri-store-provider";
import type { LimaConfig } from "src/types/LimaConfig";

import { useSelectedInstance } from "src/hooks/useSelectedInstance";

/**
 * Hook to manage a draft Lima configuration stored in Tauri Store to update an existing instance.
 * Computes 'isDirty' by comparing draft with actual config from limactl.
 */
export function useUpdateLimaInstanceDraft() {
  const { selectedName: instanceName } = useSelectedInstance();
  const {
    limaConfig: actualConfig,
    isLoadingLima,
    writeLimaYaml,
    isWritingLima,
    writeLimaError,
  } = useLimaYaml(instanceName);

  const { set } = useTauriStore();

  // Use a per-instance key to prevent drafts from leaking across different instances
  const draftKey = `updateLimaInstanceDraft:${instanceName}`;
  const {
    data: draftConfig,
    isLoading: isLoadingDraft,
    isFetched,
  } = useTauriStoreValue<LimaConfig>(draftKey);

  // Initialize draft from actual config if draft is missing
  useEffect(() => {
    if (isFetched && actualConfig && !draftConfig) {
      set(draftKey, actualConfig);
    }
  }, [isFetched, actualConfig, draftConfig, set, draftKey]);

  // Derived dirty state
  const isDirty = useMemo(() => {
    if (!actualConfig || !draftConfig) {
      return false;
    }
    return !isEqual(actualConfig, draftConfig);
  }, [actualConfig, draftConfig]);

  const updateField = useCallback(
    (field: keyof LimaConfig, value: unknown) => {
      const currentBase = draftConfig || actualConfig;
      if (currentBase) {
        set(draftKey, { ...currentBase, [field]: value });
      }
    },
    [draftConfig, actualConfig, set, draftKey],
  );

  const updateDraftConfig = useCallback(
    (newConfig: LimaConfig) => {
      set(draftKey, newConfig);
    },
    [set, draftKey],
  );

  const resetDraft = useCallback(() => {
    if (actualConfig) {
      set(draftKey, actualConfig);
    }
  }, [actualConfig, set, draftKey]);

  const applyDraft = useCallback(() => {
    if (draftConfig) {
      writeLimaYaml(draftConfig);
    }
  }, [draftConfig, writeLimaYaml]);

  return {
    actualConfig,
    applyDraft,
    applyError: writeLimaError,
    draftConfig,
    isApplying: isWritingLima,
    isDirty,
    isLoading: isLoadingLima || isLoadingDraft,
    resetDraft,
    updateDraftConfig,
    updateField,
  };
}
