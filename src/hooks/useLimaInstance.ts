import { invoke } from "@tauri-apps/api/core";
import { LimaConfig } from "../types/LimaConfig";
import { useEffect, useState } from "react";
import { listen } from "@tauri-apps/api/event";
import { useMutation, useQueryClient } from "@tanstack/react-query";

export interface LimaOperationLogs {
  logs: string[];
}

export function useLimaInstance() {
  const queryClient = useQueryClient();
  const [operationLogs, setOperationLogs] = useState<LimaOperationLogs>({
    logs: [],
  });

  // Listen for Lima instance events
  useEffect(() => {
    const setupListeners = async () => {
      // Listen for create event
      const unlistenCreate = await listen<string>("lima-instance-create", (event) => {
        setOperationLogs({
          logs: [event.payload],
        });
      });

      // Listen for create success event
      const unlistenCreateSuccess = await listen<string>("lima-instance-create-success", () => {
        // Invalidate instances query to refresh the list
        queryClient.invalidateQueries({ queryKey: ["instances"] });
      });

      // Listen for start event
      const unlistenStart = await listen<string>("lima-instance-start", (event) => {
        setOperationLogs({
          logs: [event.payload],
        });
      });

      // Listen for stop event
      const unlistenStop = await listen<string>("lima-instance-stop", (event) => {
        setOperationLogs({
          logs: [event.payload],
        });
      });

      // Listen for delete event
      const unlistenDelete = await listen<string>("lima-instance-delete", (event) => {
        setOperationLogs({
          logs: [event.payload],
        });
      });

      // Listen for output events
      const unlistenOutput = await listen<string>("lima-instance-output", (event) => {
        setOperationLogs(prev => ({
          logs: [...prev.logs, event.payload],
        }));
      });

      // Listen for start success event
      const unlistenStartSuccess = await listen<string>("lima-instance-start-success", () => {
        // Invalidate instances query to refresh the list
        queryClient.invalidateQueries({ queryKey: ["instances"] });
      });

      // Listen for stop success event
      const unlistenStopSuccess = await listen<string>("lima-instance-stop-success", () => {
        // Invalidate instances query to refresh the list
        queryClient.invalidateQueries({ queryKey: ["instances"] });
      });

      // Listen for delete success event
      const unlistenDeleteSuccess = await listen<string>("lima-instance-delete-success", () => {
        // Invalidate instances query to refresh the list
        queryClient.invalidateQueries({ queryKey: ["instances"] });
      });

      // Listen for error events
      const unlistenError = await listen<string>("lima-instance-error", (event) => {
        console.error("Lima instance error:", event.payload);
        // Invalidate instances query to refresh the list
        queryClient.invalidateQueries({ queryKey: ["instances"] });
      });

      // Return cleanup function
      return () => {
        unlistenCreate();
        unlistenCreateSuccess();
        unlistenStart();
        unlistenStop();
        unlistenDelete();
        unlistenOutput();
        unlistenStartSuccess();
        unlistenStopSuccess();
        unlistenDeleteSuccess();
        unlistenError();
      };
    };

    const cleanup = setupListeners();

    return () => {
      cleanup.then(fn => fn());
    };
  }, [queryClient]);

  const createMutation = useMutation({
    mutationFn: async ({ config, instanceName }: { config: LimaConfig; instanceName: string }) => {
      return await invoke<string>("create_lima_instance_cmd", {
        config,
        instanceName
      });
    },
    onMutate: () => {
      setOperationLogs({
        logs: [],
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["instances"] });
    },
  });

  const startMutation = useMutation({
    mutationFn: async (instanceName: string) => {
      return await invoke<string>("start_lima_instance_cmd", { instanceName });
    },
    onMutate: () => {
      setOperationLogs({
        logs: [],
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["instances"] });
    },
  });

  const stopMutation = useMutation({
    mutationFn: async (instanceName: string) => {
      return await invoke<string>("stop_lima_instance_cmd", { instanceName });
    },
    onMutate: () => {
      setOperationLogs({
        logs: [],
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["instances"] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (instanceName: string) => {
      return await invoke<string>("delete_lima_instance_cmd", { instanceName });
    },
    onMutate: () => {
      setOperationLogs({
        logs: [],
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["instances"] });
    },
  });

  const clearStatus = () => {
    setOperationLogs({
      logs: [],
    });
    createMutation.reset();
    startMutation.reset();
    stopMutation.reset();
    deleteMutation.reset();
  };

  return {
    // Streaming logs from lifecycle operations (create/start/stop/delete)
    operationLogs,
    
    // Create instance mutation
    createInstance: createMutation.mutate,
    isCreating: createMutation.isPending,
    createError: createMutation.error,
    
    // Start instance mutation
    startInstance: startMutation.mutate,
    isStarting: startMutation.isPending,
    startError: startMutation.error,
    
    // Stop instance mutation
    stopInstance: stopMutation.mutate,
    isStopping: stopMutation.isPending,
    stopError: stopMutation.error,
    
    // Delete instance mutation
    deleteInstance: deleteMutation.mutate,
    isDeleting: deleteMutation.isPending,
    deleteError: deleteMutation.error,
    
    // General utilities
    clearStatus,
    isProcessing: createMutation.isPending || startMutation.isPending || stopMutation.isPending || deleteMutation.isPending,
  };
}