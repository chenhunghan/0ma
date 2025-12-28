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
        queryKey: ["instance-guest-diagnostics", instanceName],
        queryFn: async () => {
            return await invoke<GuestDiagnostics>("get_instance_guest_diagnostics_cmd", { instanceName });
        },
        enabled: enabled && !!instanceName,
        staleTime: 3600000, // Diagnostics (OS/Kernel) don't change during a session
    });
}
