import { useQuery } from "@tanstack/react-query";
import { invoke } from "@tauri-apps/api/core";
import { LimaConfig } from "../types/LimaConfig";

/**
 * Placeholder default config in case fetching from backend fails
 */
export const ClIENT_DEFAULT_CONFIG: LimaConfig = {
  vmType: "",
  cpus: 0,
  memory: "",
  disk: "",
  images: [],
  mounts: [],
  minimumLimaVersion: "",
  copyToHost: [],
  provision: [],
  probes: []
}

export function useDefaultK0sLimaConfig(
  instanceName: string,
  installHelm: boolean = true,
  installLocalPathProvisioner: boolean = true,
) {
  const {
    data: defaultConfig,
    error,
    isLoading,
    refetch,
  } = useQuery({
    queryKey: ["default_k0s_lima_config", instanceName, installHelm, installLocalPathProvisioner],
    queryFn: async () => {
      const config = await invoke<LimaConfig>("get_default_k0s_lima_config_yaml_cmd", {
        instanceName,
        installHelm,
        installLocalPathProvisioner,
      });
      console.debug("Fetched default k0s Lima config:", config, { installHelm, installLocalPathProvisioner });
      return config;
    },
    enabled: !!instanceName, // Only fetch if instanceName is provided
    initialData: ClIENT_DEFAULT_CONFIG,
  });

  return {
    defaultConfig,
    error,
    isLoading,
    refetch,
  };
}
