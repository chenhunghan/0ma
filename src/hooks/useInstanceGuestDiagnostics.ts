import { useQuery } from "@tanstack/react-query";
import { invoke } from "@tauri-apps/api/core";

export interface GuestDiagnostics {
  os_pretty_name: string;
  kernel_version: string;
}

/**
 * Hook to get rich guest diagnostics (OS, Kernel)
 */
export function useInstanceGuestDiagnostics(instanceName: string, enabled = true) {
  return useQuery({
    enabled: enabled && Boolean(instanceName),
    queryFn: async () => await invoke<GuestDiagnostics>("get_instance_guest_diagnostics_cmd", { instanceName }),
    queryKey: ["instance-guest-diagnostics", instanceName],
    staleTime: 3_600_000, // Diagnostics (OS/Kernel) don't change during a session
  });
}
