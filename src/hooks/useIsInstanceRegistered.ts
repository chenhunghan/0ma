import { invoke } from "@tauri-apps/api/core";
import { useQuery } from "@tanstack/react-query";

/**
 * Hook to check if an instance is registered
 */
export function useIsInstanceRegistered(instanceName: string, enabled = true) {
  return useQuery({
    enabled: enabled && Boolean(instanceName),
    queryFn: async () => await invoke<boolean>("is_instance_registered_cmd", { instanceName }),
    queryKey: ["instance-registered", instanceName],
    staleTime: 10_000, // Consider data stale after 10 seconds
  });
}
