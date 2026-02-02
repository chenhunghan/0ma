import { invoke } from "@tauri-apps/api/core";
import type { LimaConfig } from "../types/LimaConfig";
import { useMutation, useQueryClient } from "@tanstack/react-query";

export interface LimaOperationLogs {
  logs: string[];
}

export function useLimaInstance() {
  const queryClient = useQueryClient();

  const createMutation = useMutation({
    mutationFn: async ({ config, instanceName }: { config: LimaConfig; instanceName: string }) => await invoke<string>("create_lima_instance_cmd", {
        config,
        instanceName,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["instances"] });
    },
  });

  const startMutation = useMutation({
    mutationFn: async (instanceName: string) => await invoke<string>("start_lima_instance_cmd", { instanceName }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["instances"] });
    },
  });

  const stopMutation = useMutation({
    mutationFn: async (instanceName: string) => await invoke<string>("stop_lima_instance_cmd", { instanceName }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["instances"] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (instanceName: string) => await invoke<string>("delete_lima_instance_cmd", { instanceName }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["instances"] });
    },
  });

  const clearStatus = () => {
    createMutation.reset();
    startMutation.reset();
    stopMutation.reset();
    deleteMutation.reset();
  };

  return {
    // Create instance mutation
    createInstance: createMutation.mutate,
    createError: createMutation.error,

    // Start instance mutation
    startInstance: startMutation.mutate,
    startError: startMutation.error,

    // Stop instance mutation
    stopInstance: stopMutation.mutate,
    stopError: stopMutation.error,

    // Delete instance mutation
    deleteInstance: deleteMutation.mutate,
    deleteError: deleteMutation.error,

    // General utilities
    clearStatus,
  };
}
