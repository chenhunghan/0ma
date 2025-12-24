import { invoke } from "@tauri-apps/api/core";
import { useQuery } from "@tanstack/react-query";
import { LimaConfig } from "../types/lima-config";

/**
 * Info of an instance stored in the registry
 */
export interface InstanceInfo {
  name: string;
  created_at: string;
  updated_at?: string;
  status?: string;
  /** Full Lima configuration read from limactl list --json */
  config?: LimaConfig;
}

export function useInstanceRegistry() {
  const {
    data: instances = [],
    isLoading,
    error,
    refetch: loadInstances
  } = useQuery({
    queryKey: ["instances"],
    queryFn: async () => {
      const registeredInstances = await invoke<InstanceInfo[]>("get_registered_instances_cmd");
      return registeredInstances;
    },
    staleTime: 5000, // Consider data stale after 5 seconds
    refetchInterval: false, // Don't auto-refetch - we use event-based refreshes
    refetchOnWindowFocus: true, // Let React Query handle window focus automatically (v5 uses visibilitychange)
    refetchOnReconnect: true, // Auto-refetch when network reconnects
  });

  return {
    instances,
    isLoading,
    error,
    loadInstances,
    refreshInstances: loadInstances,
  };
}