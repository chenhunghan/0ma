import { invoke } from "@tauri-apps/api/core";
import { LimaConfig } from "../types/lima-config";
import { useEffect, useState } from "react";
import { listen } from "@tauri-apps/api/event";
import { useMutation, useQueryClient } from "@tanstack/react-query";

export interface LimaInstanceStatus {
  output: string[];
}

export function useLimaInstance() {
  const queryClient = useQueryClient();
  const [instanceStatus, setInstanceStatus] = useState<LimaInstanceStatus>({
    output: [],
  });

  // Listen for Lima instance events
  useEffect(() => {
    const setupListeners = async () => {
      // Listen for start event
      const unlistenStart = await listen<string>("lima-instance-start", (event) => {
        setInstanceStatus(prev => ({
          ...prev,
          output: [event.payload],
        }));
      });

      // Listen for stop event
      const unlistenStop = await listen<string>("lima-instance-stop", (event) => {
        setInstanceStatus(prev => ({
          ...prev,
          output: [event.payload],
        }));
      });

      // Listen for delete event
      const unlistenDelete = await listen<string>("lima-instance-delete", (event) => {
        setInstanceStatus(prev => ({
          ...prev,
          output: [event.payload],
        }));
      });

      // Listen for output events
      const unlistenOutput = await listen<string>("lima-instance-output", (event) => {
        setInstanceStatus(prev => ({
          ...prev,
          output: [...prev.output, event.payload],
        }));
      });

      // Listen for success event
      const unlistenSuccess = await listen<string>("lima-instance-success", () => {
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
        unlistenStart();
        unlistenStop();
        unlistenDelete();
        unlistenOutput();
        unlistenSuccess();
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

  const startMutation = useMutation({
    mutationFn: async ({ config, instanceName }: { config: LimaConfig; instanceName: string }) => {
      return await invoke<string>("create_lima_instance_cmd", {
        config,
        instanceName
      });
    },
    onMutate: () => {
      setInstanceStatus({
        output: [],
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
    onMutate: (instanceName) => {
      setInstanceStatus({
        output: [`Stopping instance ${instanceName}...`],
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
    onMutate: (instanceName) => {
      setInstanceStatus({
        output: [`Deleting instance ${instanceName}...`],
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["instances"] });
    },
  });

  const clearStatus = () => {
    setInstanceStatus({
      output: [],
    });
    startMutation.reset();
    stopMutation.reset();
    deleteMutation.reset();
  };

  return {
    // Instance status (for streaming output/success messages)
    instanceStatus,
    
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
    isProcessing: startMutation.isPending || stopMutation.isPending || deleteMutation.isPending,
  };
}