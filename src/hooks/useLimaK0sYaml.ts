import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { invoke } from "@tauri-apps/api/core";

export function useLimaK0sYaml() {
  const queryClient = useQueryClient();

  // Read Lima k0s YAML
  const {
    data: limaK0sYamlContent,
    error: limaK0sYamlError,
    isLoading: isLoadingLimaK0sYaml,
    refetch: refetchLimaK0sYaml,
  } = useQuery({
    queryKey: ["lima_k0s_yaml"],
    queryFn: async () => {
      return await invoke<string>("read_lima_k0s_yaml");
    },
  });

  // Write Lima k0s YAML
  const writeLimaK0sYamlMutation = useMutation({
    mutationFn: async (content: string) => {
      await invoke("write_lima_k0s_yaml", { content });
    },
    onSuccess: async () => {
      // Invalidate and refetch the Lima k0s YAML after writing
      await queryClient.invalidateQueries({ queryKey: ["lima_k0s_yaml"] });
    },
  });

  // Get Lima k0s YAML path
  const {
    data: limaK0sYamlPath,
    error: limaK0sYamlPathError,
    isLoading: isLoadingLimaK0sYamlPath,
    refetch: fetchLimaK0sYamlPath,
  } = useQuery({
    queryKey: ["lima_k0s_yaml_path"],
    queryFn: async () => {
      return await invoke<string>("get_lima_k0s_yaml_path_cmd");
    },
    enabled: false, // Don't auto-fetch on mount
  });

  // Reset Lima k0s YAML to bundled version
  const resetLimaK0sYamlMutation = useMutation({
    mutationFn: async () => {
      await invoke("reset_lima_k0s_yaml");
    },
    onSuccess: async () => {
      // Invalidate and refetch the Lima k0s YAML after resetting
      await queryClient.invalidateQueries({ queryKey: ["lima_k0s_yaml"] });
    },
  });

  return {
    limaK0sYamlContent,
    limaK0sYamlError,
    isLoadingLimaK0sYaml,
    refetchLimaK0sYaml,
    writeLimaK0sYaml: writeLimaK0sYamlMutation.mutate,
    isWritingLimaK0sYaml: writeLimaK0sYamlMutation.isPending,
    writeLimaK0sYamlError: writeLimaK0sYamlMutation.error,
    limaK0sYamlPath,
    limaK0sYamlPathError,
    isLoadingLimaK0sYamlPath,
    fetchLimaK0sYamlPath,
    resetLimaK0sYaml: resetLimaK0sYamlMutation.mutate,
    isResettingLimaK0sYaml: resetLimaK0sYamlMutation.isPending,
    resetLimaK0sYamlError: resetLimaK0sYamlMutation.error,
  };
}
