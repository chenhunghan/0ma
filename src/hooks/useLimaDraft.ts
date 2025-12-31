import { useMemo, useCallback, useEffect } from "react";
import { useLimaYaml } from "./useLimaYaml";
import { useTauriStore, useTauriStoreValue } from "../providers/tauri-store-provider";
import { LimaConfig } from "../types/LimaConfig";

/**
 * Hook to manage a draft Lima configuration stored in Tauri Store.
 * Computes 'isDirty' by comparing draft with actual config from limactl.
 */
export function useLimaDraft(instanceName: string) {
    const {
        limaConfig: actualConfig,
        isLoadingLima,
        writeLimaYaml,
        isWritingLima,
        writeLimaError
    } = useLimaYaml(instanceName);

    const { set } = useTauriStore();

    // Use a per-instance key to prevent drafts from leaking across different instances
    const draftKey = `draftLimaConfig:${instanceName}`;
    const { data: draftConfig, isLoading: isLoadingDraft } = useTauriStoreValue<LimaConfig>(draftKey);

    // Initialize draft from actual config if draft is missing
    useEffect(() => {
        if (!isLoadingDraft && actualConfig && !draftConfig) {
            set(draftKey, actualConfig);
        }
    }, [actualConfig, draftConfig, isLoadingDraft, set, draftKey]);

    // Derived dirty state
    // Currently only tracks cpus, memory, disk, vmType
    const isDirty = useMemo(() => {
        if (!actualConfig || !draftConfig) return false;

        return (
            actualConfig.cpus !== draftConfig.cpus ||
            actualConfig.memory !== draftConfig.memory ||
            actualConfig.disk !== draftConfig.disk ||
            actualConfig.vmType !== draftConfig.vmType
        );
    }, [actualConfig, draftConfig]);

    const updateField = useCallback((field: keyof LimaConfig, value: unknown) => {
        const currentBase = draftConfig || actualConfig;
        if (currentBase) {
            set(draftKey, { ...currentBase, [field]: value });
        }
    }, [draftConfig, actualConfig, set, draftKey]);

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
        draftConfig,
        actualConfig,
        isDirty,
        isLoading: isLoadingLima || isLoadingDraft,
        isApplying: isWritingLima,
        applyError: writeLimaError,
        updateField,
        resetDraft,
        applyDraft,
    };
}
