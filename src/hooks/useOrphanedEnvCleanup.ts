import { invoke } from "@tauri-apps/api/core";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useCallback, useState } from "react";

export function useOrphanedEnvCleanup() {
  const [dismissed, setDismissed] = useState(false);

  const { data: orphanedNames = [] } = useQuery({
    queryKey: ["orphaned-env-entries"],
    queryFn: () => invoke<string[]>("detect_orphaned_env_entries_cmd"),
    staleTime: Infinity,
    enabled: !dismissed,
  });

  const cleanup = useMutation({
    mutationFn: (instanceNames: string[]) =>
      invoke<void>("cleanup_orphaned_env_entries_cmd", { instanceNames }),
    onSuccess: () => {
      setDismissed(true);
    },
  });

  const handleCleanup = useCallback(() => {
    if (orphanedNames.length > 0) {
      cleanup.mutate(orphanedNames);
    }
  }, [orphanedNames, cleanup]);

  const handleDismiss = useCallback(() => {
    setDismissed(true);
  }, []);

  return {
    orphanedNames,
    dialogOpen: !dismissed && orphanedNames.length > 0,
    handleCleanup,
    handleDismiss,
    isCleaning: cleanup.isPending,
    cleanupError: cleanup.error,
  };
}
