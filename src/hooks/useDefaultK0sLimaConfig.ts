import { useQuery } from "@tanstack/react-query";
import { invoke } from "@tauri-apps/api/core";
import { debug } from "@tauri-apps/plugin-log";
import { LimaConfig } from "../types/LimaConfig";

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
    queryKey: ["default_k0s_lima_config", instanceName, installHelm, installLocalPathProvisioner],
    queryFn: async () => {
      const config = await invoke<LimaConfig>("get_default_k0s_lima_config_yaml_cmd", {
        instanceName,
        installHelm,
        installLocalPathProvisioner,
      });
      debug(`Fetched default k0s Lima config: ${JSON.stringify(config)} ${JSON.stringify({ installHelm, installLocalPathProvisioner })}`);
      return config;
    },
    enabled: !!instanceName, // Only fetch if instanceName is provided
  });

  return {
    defaultConfig,
    error,
    isLoading: isLoading || !isFetched,
    refetch,
  };
}
