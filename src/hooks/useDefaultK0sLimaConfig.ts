import { useQuery } from "@tanstack/react-query";
import { invoke } from "@tauri-apps/api/core";
import type { LimaConfig } from "../types/LimaConfig";

export function useDefaultK0sLimaConfig(
  instanceName: string,
  installHelm: boolean = true,
  installLocalPathProvisioner: boolean = true,
) {
  const {
    data: defaultConfig,
    error,
    isLoading,
    isFetched,
    refetch,
  } = useQuery({
    enabled: !!instanceName,
    queryFn: async () => {
      const config = await invoke<LimaConfig>("get_default_k0s_lima_config_yaml_cmd", {
        instanceName,
        installHelm,
        installLocalPathProvisioner,
      });
      return config;
    },
    queryKey: ["default_k0s_lima_config", instanceName, installHelm, installLocalPathProvisioner], // Only fetch if instanceName is provided
  });

  return {
    defaultConfig,
    error,
    isLoading: isLoading || !isFetched,
    refetch,
  };
}
