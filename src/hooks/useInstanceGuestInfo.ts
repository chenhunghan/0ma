import { useQuery } from "@tanstack/react-query";
import { invoke } from "@tauri-apps/api/core";

export interface GuestInfo {
  engine: string;
}

/**
 * Hook to get guest-specific info (like container engine)
 */
export function useInstanceGuestInfo(instanceName: string, enabled = true) {
  return useQuery({
    enabled: enabled && !!instanceName,
    queryFn: async () => {
      return await invoke<GuestInfo>("get_instance_guest_info_cmd", { instanceName });
    },
    queryKey: ["instance-guest-info", instanceName],
    staleTime: 300000, // Guest configuration rarely changes
  });
}
