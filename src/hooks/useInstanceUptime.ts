import { useQuery } from "@tanstack/react-query";
import { invoke } from "@tauri-apps/api/core";

/**
 * Hook to get the uptime of a Lima instance
 */
export function useInstanceUptime(instanceName: string, enabled = true) {
  return useQuery({
    queryKey: ["instance-uptime", instanceName],
    queryFn: async () => await invoke<string>("get_instance_uptime_cmd", { instanceName }),
    enabled: enabled && Boolean(instanceName),
    staleTime: 10_000, // Uptime changes every second, but we don't need to refresh that often
    refetchInterval: 60_000, // Refresh every minute
  });
}
