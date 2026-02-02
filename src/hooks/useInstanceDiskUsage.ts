import { invoke } from "@tauri-apps/api/core";
import { useQuery } from "@tanstack/react-query";

export interface DiskUsage {
  total: string;
  used: string;
  available: string;
  use_percent: string;
}

/**
 * Hook to get disk usage for an instance
 */
export function useInstanceDiskUsage(instanceName: string, enabled = true) {
  return useQuery({
    queryKey: ["instance-disk-usage", instanceName],
    queryFn: async () => await invoke<DiskUsage>("get_instance_disk_usage_cmd", { instanceName }),
    enabled: enabled && Boolean(instanceName),
    staleTime: 5000, // Disk usage changes frequently, keep fresh
    refetchInterval: 30_000, // Auto-refresh every 30 seconds
  });
}
