import { invoke } from "@tauri-apps/api/core";
import { useQuery } from "@tanstack/react-query";

export function useK8sAvailable(instanceName: string | null) {
  return useQuery({
    queryKey: ["k8s-available", instanceName],
    // only check k0s for now
    queryFn: () => invoke<boolean>("check_k0s_available_cmd", { instanceName }),
    enabled: Boolean(instanceName),
    staleTime: 60_000,
    refetchOnWindowFocus: false,
    retry: false,
  });
}
