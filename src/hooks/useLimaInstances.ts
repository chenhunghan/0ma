import { invoke } from "@tauri-apps/api/core";
import { useQuery } from "@tanstack/react-query";
import { LimaInstance } from '../types/LimaInstance';

export function useLimaInstances() {
  const {
    data: instances = [],
    isLoading,
    error,
    refetch: loadInstances
  } = useQuery({
    queryKey: ["instances"],
    queryFn: async () => {
      const registeredInstances = await invoke<LimaInstance[]>("get_all_lima_instances_cmd");
      return registeredInstances;
    },
    staleTime: 30000, // Consider data stale after 30 seconds
  });

  return {
    instances,
    isLoading,
    error,
    loadInstances,
    refreshInstances: loadInstances,
  };
}