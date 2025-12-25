import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { invoke } from "@tauri-apps/api/core";
import { LimaConfig } from "../types/LimaConfig";

export function useLimaYaml(instanceName: string) {
  const queryClient = useQueryClient();

  const {
    data: limaConfig,
    error: limaError,
    isLoading: isLoadingLima,
    refetch: refetchLima,
  } = useQuery({
    queryKey: ["lima_yaml", instanceName],
    queryFn: async () => {
      return await invoke<LimaConfig>("read_lima_yaml_cmd", { instanceName });
    },
    enabled: !!instanceName, // Only fetch if instanceName is provided
  });

  // Write Lima YAML
  const writeLimaYamlMutation = useMutation({
    mutationFn: async (config: LimaConfig) => {
      await invoke("write_lima_yaml_cmd", { instanceName, config });
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
    queryKey: ["lima_yaml_path", instanceName],
    queryFn: async () => {
      return await invoke<string>("get_lima_yaml_path_cmd", { instanceName });
    },
    enabled: false, // Don't auto-fetch on mount
  });

  // Reset Lima YAML to bundled version
  const resetLimaYamlMutation = useMutation({
    mutationFn: async () => {
      return await invoke<LimaConfig>("reset_lima_yaml_cmd", { instanceName });
    },
    onSuccess: async (newConfig) => {
      // Update the cache with the new config
      queryClient.setQueryData(["lima_yaml", instanceName], newConfig);
    },
  });

  return {
    limaConfig,
    limaError,
    isLoadingLima,
    refetchLima,
    writeLimaYaml: writeLimaYamlMutation.mutate,
    isWritingLima: writeLimaYamlMutation.isPending,
    writeLimaError: writeLimaYamlMutation.error,
    limaYamlPath,
    limaYamlPathError,
    isLoadingLimaYamlPath,
    fetchLimaYamlPath,
    resetLimaYaml: resetLimaYamlMutation.mutate,
    isResettingLima: resetLimaYamlMutation.isPending,
    resetLimaError: resetLimaYamlMutation.error,
  };
}
