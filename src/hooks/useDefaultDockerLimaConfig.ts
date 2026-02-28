import { useQuery } from "@tanstack/react-query";
import { invoke } from "@tauri-apps/api/core";
import type { LimaConfig } from "../types/LimaConfig";

export function useDefaultDockerLimaConfig(instanceName: string) {
  const {
    data: defaultConfig,
    error,
    isLoading,
    isFetched,
    refetch,
  } = useQuery({
    enabled: Boolean(instanceName),
    queryFn: async () => {
      const config = await invoke<LimaConfig>("get_default_docker_lima_config_yaml_cmd", {
        instanceName,
      });
      return config;
    },
    queryKey: ["default_docker_lima_config", instanceName],
  });

  return {
    defaultConfig,
    error,
    isLoading: isLoading || !isFetched,
    refetch,
  };
}
