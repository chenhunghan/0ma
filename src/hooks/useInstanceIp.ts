import { useQuery } from "@tanstack/react-query";
import { invoke } from "@tauri-apps/api/core";

export interface NetworkInterface {
  name: string;
  ip: string;
}

/**
 * Hook to get the network interfaces and IP addresses of a Lima instance
 */
export function useInstanceIp(instanceName: string, enabled = true) {
  return useQuery({
    queryKey: ["instance-ip", instanceName],
    queryFn: async () =>
      await invoke<NetworkInterface[]>("get_instance_ip_cmd", { instanceName }),
    enabled: enabled && Boolean(instanceName),
    staleTime: 60_000, // IP usually doesn't change, keep for 1 minute
    refetchInterval: 300_000, // Refresh every 5 minutes
  });
}
