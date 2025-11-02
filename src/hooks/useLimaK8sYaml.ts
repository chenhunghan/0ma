import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { invoke } from "@tauri-apps/api/core";

export function useLimaK8sYaml() {
  const queryClient = useQueryClient();

  // Read Lima k8s YAML
  const {
    data: limaK8sYamlContent,
    error: limaK8sYamlError,
    isLoading: isLoadingLimaK8sYaml,
    refetch: refetchLimaK8sYaml,
  } = useQuery({
    queryKey: ["lima_k8s_yaml"],
    queryFn: async () => {
      return await invoke<string>("read_lima_k8s_yaml");
    },
  });

  // Write Lima k8s YAML
  const writeLimaK8sYamlMutation = useMutation({
    mutationFn: async (content: string) => {
      await invoke("write_lima_k8s_yaml", { content });
    },
    onSuccess: async () => {
      // Invalidate and refetch the Lima k8s YAML after writing
      await queryClient.invalidateQueries({ queryKey: ["lima_k8s_yaml"] });
    },
  });

  // Get Lima k8s YAML path
  const getLimaK8sYamlPath = async () => {
    return await invoke<string>("get_lima_k8s_yaml_path_cmd");
  };

  return {
    limaK8sYamlContent,
    limaK8sYamlError,
    isLoadingLimaK8sYaml,
    refetchLimaK8sYaml,
    writeLimaK8sYaml: writeLimaK8sYamlMutation.mutate,
    isWritingLimaK8sYaml: writeLimaK8sYamlMutation.isPending,
    writeLimaK8sYamlError: writeLimaK8sYamlMutation.error,
    getLimaK8sYamlPath,
  };
}
