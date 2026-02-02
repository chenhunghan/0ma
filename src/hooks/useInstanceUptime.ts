import { useQuery } from "@tanstack/react-query";
import { invoke } from "@tauri-apps/api/core";

/**
 * Hook to get the uptime of a Lima instance
 */
export function useInstanceUptime(instanceName: string, enabled = true) {
  return useQuery({
    queryKey: ["instance-uptime", instanceName],
    queryFn: async () => {
      return await invoke<string>("get_instance_uptime_cmd", { instanceName });
    },
    enabled: enabled && !!instanceName,
    staleTime: 10000, // Uptime changes every second, but we don't need to refresh that often
    refetchInterval: 60000, // Refresh every minute
  });
}
