import { invoke } from "@tauri-apps/api/core";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback, useState } from "react";

export function useEnvSetup(selectedName?: string | null) {
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [envShPath, setEnvShPath] = useState("");
  const [instanceName, setInstanceName] = useState<string | null>(null);

  const { data: envShExists } = useQuery({
    queryKey: ["envShExists", selectedName],
    queryFn: () =>
      invoke<boolean>("check_env_sh_exists_cmd", {
        instanceName: selectedName!,
      }),
    enabled: !!selectedName,
    refetchOnWindowFocus: true,
  });

  const writeEnvSh = useMutation({
    mutationFn: async (name: string) => {
      const exists = await invoke<boolean>("check_env_sh_exists_cmd", {
        instanceName: name,
      });
      if (exists) return null;
      return invoke<string>("write_env_sh_cmd", { instanceName: name });
    },
    onSuccess: (path) => {
      if (path) {
        setEnvShPath(path);
        setDialogOpen(true);
        queryClient.invalidateQueries({ queryKey: ["envShExists"] });
      }
    },
  });

  const appendToProfile = useMutation({
    mutationFn: async (name: string) =>
      invoke<string>("append_env_to_shell_profile_cmd", {
        instanceName: name,
      }),
  });

  const triggerEnvSetup = useCallback(
    (name: string) => {
      setInstanceName(name);
      writeEnvSh.mutate(name);
    },
    [writeEnvSh],
  );

  const handleAddToProfile = useCallback(() => {
    if (instanceName) {
      appendToProfile.mutate(instanceName);
    }
  }, [instanceName, appendToProfile]);

  const handleClose = useCallback(() => {
    setDialogOpen(false);
    appendToProfile.reset();
  }, [appendToProfile]);

  return {
    triggerEnvSetup,
    dialogOpen,
    setDialogOpen,
    envShPath,
    instanceName,
    handleAddToProfile,
    handleClose,
    profileMessage: appendToProfile.data ?? null,
    profileError: appendToProfile.error,
    isAddingToProfile: appendToProfile.isPending,
    envShExists: envShExists ?? true,
  };
}
