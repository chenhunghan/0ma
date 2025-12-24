import { invoke } from "@tauri-apps/api/core";
import { useQuery } from "@tanstack/react-query";

/**
 * Hook to check if an instance is registered
 */
export function useIsInstanceRegistered(instanceName: string, enabled = true) {
  return useQuery({
    queryKey: ["instance-registered", instanceName],
    queryFn: async () => {
      return await invoke<boolean>("is_instance_registered_cmd", { instanceName });
    },
    enabled: enabled && !!instanceName,
    staleTime: 10000, // Consider data stale after 10 seconds
  });
}
