import { invoke } from "@tauri-apps/api/core";
import { useQuery } from "@tanstack/react-query";
import type { LimaInstance } from "../types/LimaInstance";

export function useLimaInstances() {
  const {
    data: instances = [],
    isLoading,
    error,
    refetch: loadInstances,
  } = useQuery({
    queryFn: async () => {
      const registeredInstances = await invoke<LimaInstance[]>("get_all_lima_instances_cmd");
      return registeredInstances;
    },
    queryKey: ["instances"],
    refetchOnWindowFocus: "always",
    staleTime: 30_000, // Consider data stale after 30 seconds
  });

  return {
    error,
    instances,
    isLoading,
    loadInstances,
    refreshInstances: loadInstances,
  };
}
