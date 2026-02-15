import { useQuery } from "@tanstack/react-query";
import { invoke } from "@tauri-apps/api/core";

interface SystemCapabilities {
  arch: string;
  macosVersion: string;
  krunkitAvailable: boolean;
  krunkitDriverAvailable: boolean;
}

export function useSystemCapabilities() {
  const { data, isLoading } = useQuery({
    queryKey: ["system_capabilities"],
    queryFn: () => invoke<SystemCapabilities>("get_system_capabilities_cmd"),
    staleTime: Infinity,
    refetchOnWindowFocus: "always",
  });

  const isAppleSilicon = data?.arch === "aarch64";
  const isMacOS14Plus = parseFloat(data?.macosVersion ?? "0") >= 14.0;
  const isKrunkitSupported = Boolean(
    data && isAppleSilicon && isMacOS14Plus && data.krunkitAvailable && data.krunkitDriverAvailable,
  );

  const krunkitMissingReasons: string[] = [];
  if (data && !isKrunkitSupported) {
    if (!isAppleSilicon) krunkitMissingReasons.push("Apple Silicon required");
    if (!isMacOS14Plus) krunkitMissingReasons.push("macOS 14+ required");
    if (!data.krunkitAvailable)
      krunkitMissingReasons.push(
        "krunkit not installed (brew tap slp/krunkit && brew install krunkit)",
      );
    if (!data.krunkitDriverAvailable) krunkitMissingReasons.push("Lima krunkit driver not found");
  }

  return { capabilities: data, isLoading, isKrunkitSupported, krunkitMissingReasons };
}
