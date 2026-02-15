import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { invoke } from "@tauri-apps/api/core";
import type { LimaConfig } from "../types/LimaConfig";

export function useLimaYaml(instanceName: string | null) {
  const queryClient = useQueryClient();

  const {
    data: limaConfig,
    error: limaError,
    isLoading: isLoadingLima,
    refetch: refetchLima,
  } = useQuery({
    enabled: Boolean(instanceName),
    queryFn: async () => await invoke<LimaConfig>("read_lima_yaml_cmd", { instanceName }),
    queryKey: ["lima_yaml", instanceName], // Only fetch if instanceName is provided
  });

  // Write Lima YAML
  const writeLimaYamlMutation = useMutation({
    mutationFn: async (config: LimaConfig) => {
      await invoke("write_lima_yaml_cmd", { config, instanceName });
    },
    onSuccess: async () => {
      // Invalidate and refetch the Lima YAML after writing
      await queryClient.invalidateQueries({ queryKey: ["lima_yaml", instanceName] });
      // Also invalidate instances query so the UI reflects updated metadata (cpus, memory, disk)
      await queryClient.invalidateQueries({ queryKey: ["instances"] });
    },
  });

  // Get Lima YAML path
  const {
    data: limaYamlPath,
    error: limaYamlPathError,
    isLoading: isLoadingLimaYamlPath,
    refetch: fetchLimaYamlPath,
  } = useQuery({
    enabled: false,
    queryFn: async () => await invoke<string>("get_lima_yaml_path_cmd", { instanceName }),
    queryKey: ["lima_yaml_path", instanceName], // Don't auto-fetch on mount
  });

  // Reset Lima YAML to bundled version
  const resetLimaYamlMutation = useMutation({
    mutationFn: async () => await invoke<LimaConfig>("reset_lima_yaml_cmd", { instanceName }),
    onSuccess: async (newConfig) => {
      // Update the cache with the new config
      queryClient.setQueryData(["lima_yaml", instanceName], newConfig);
    },
  });

  return {
    fetchLimaYamlPath,
    isLoadingLima,
    isLoadingLimaYamlPath,
    isResettingLima: resetLimaYamlMutation.isPending,
    isWritingLima: writeLimaYamlMutation.isPending,
    limaConfig,
    limaError,
    limaYamlPath,
    limaYamlPathError,
    refetchLima,
    resetLimaError: resetLimaYamlMutation.error,
    resetLimaYaml: resetLimaYamlMutation.mutate,
    writeLimaError: writeLimaYamlMutation.error,
    writeLimaYaml: writeLimaYamlMutation.mutate,
    writeLimaYamlAsync: writeLimaYamlMutation.mutateAsync,
  };
}
