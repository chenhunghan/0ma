import { useQuery } from "@tanstack/react-query";
import { invoke } from "@tauri-apps/api/core";

export function useLimaVersion() {
  const {
    data: limaVersion,
    error: limaVersionError,
    isLoading: isLoadingLimaVersion,
    refetch: checkLimaVersion,
  } = useQuery({
    queryKey: ["lima_version"],
    queryFn: async () => await invoke<string>("lima_version_cmd"),
    enabled: false, // Don't auto-fetch on mount
    retry: false, // Don't retry on error
  });

  return {
    checkLimaVersion,
    isLoadingLimaVersion,
    limaVersion,
    limaVersionError,
  };
}
