import { useQuery } from "@tanstack/react-query";
import { invoke } from "@tauri-apps/api/core";

interface SystemCapabilities {
  arch: string;
  macosVersion: string;
  krunkitAvailable: boolean;
}

export function useSystemCapabilities() {
  const { data, isLoading } = useQuery({
    queryKey: ["system_capabilities"],
    queryFn: () => invoke<SystemCapabilities>("get_system_capabilities_cmd"),
    staleTime: Infinity,
  });

  const isKrunkitSupported = Boolean(
    data &&
      data.arch === "aarch64" &&
      parseFloat(data.macosVersion) >= 14.0 &&
      data.krunkitAvailable,
  );

  return { capabilities: data, isLoading, isKrunkitSupported };
}
