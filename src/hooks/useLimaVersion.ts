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
    queryFn: async () => {
      return await invoke<string>("lima_version");
    },
    enabled: false, // Don't auto-fetch on mount
    retry: false, // Don't retry on error
  });

  return {
    limaVersion,
    limaVersionError,
    isLoadingLimaVersion,
    checkLimaVersion,
  };
}
