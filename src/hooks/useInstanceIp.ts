import { useQuery } from "@tanstack/react-query";
import { invoke } from "@tauri-apps/api/core";

/**
 * Hook to get the internal IP address of a Lima instance
 */
export function useInstanceIp(instanceName: string, enabled = true) {
  return useQuery({
    queryKey: ["instance-ip", instanceName],
    queryFn: async () => {
      return await invoke<string>("get_instance_ip_cmd", { instanceName });
    },
    enabled: enabled && !!instanceName,
    staleTime: 60000, // IP usually doesn't change, keep for 1 minute
    refetchInterval: 300000, // Refresh every 5 minutes
  });
}
