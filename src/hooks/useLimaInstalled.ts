import { useQuery } from "@tanstack/react-query";
import { invoke } from "@tauri-apps/api/core";

export function useLimaInstalled() {
  const { data: isInstalled, isLoading } = useQuery({
    queryKey: ["lima_installed"],
    queryFn: () => invoke<boolean>("check_lima_installed_cmd"),
    retry: false,
  });

  return {
    isLimaInstalled: isInstalled ?? true, // assume installed while loading
    isLoading,
  };
}
