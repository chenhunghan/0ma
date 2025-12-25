import { useQuery } from "@tanstack/react-query";
import { invoke } from "@tauri-apps/api/core";
import { LimaConfig } from "../types/LimaConfig";

export function useDefaultK0sLimaConfig(instanceName: string) {
  const {
    data: defaultConfig,
    error,
    isLoading,
    refetch,
  } = useQuery({
    queryKey: ["default_k0s_lima_config", instanceName],
    queryFn: async () => {
      return await invoke<LimaConfig>("get_default_k0s_lima_config_yaml_cmd", { instanceName });
    },
    enabled: !!instanceName, // Only fetch if instanceName is provided
  });

  return {
    defaultConfig,
    error,
    isLoading,
    refetch,
  };
}
