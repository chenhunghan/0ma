import { invoke } from "@tauri-apps/api/core";
import { LimaConfig } from "../types/lima-config";
import { useEffect, useState } from "react";
import { listen } from "@tauri-apps/api/event";

export interface LimaInstanceStatus {
  isStarting: boolean;
  output: string[];
  error: string | null;
  success: string | null;
  currentInstanceName: string | null;
}

export function useLimaInstance() {
  const [instanceStatus, setInstanceStatus] = useState<LimaInstanceStatus>({
    isStarting: false,
    output: [],
    error: null,
    success: null,
    currentInstanceName: null,
  });

  
  // Listen for Lima instance events
  useEffect(() => {
    const setupListeners = async () => {
      // Listen for start event
      const unlistenStart = await listen<string>("lima-instance-start", (event) => {
        setInstanceStatus(prev => ({
          ...prev,
          isStarting: true,
          output: [event.payload],
          error: null,
          success: null,
        }));
      });

      // Listen for stop event
      const unlistenStop = await listen<string>("lima-instance-stop", (event) => {
        setInstanceStatus(prev => ({
          ...prev,
          isStarting: true,
          output: [event.payload],
          error: null,
          success: null,
        }));
      });

      // Listen for delete event
      const unlistenDelete = await listen<string>("lima-instance-delete", (event) => {
        setInstanceStatus(prev => ({
          ...prev,
          isStarting: true,
          output: [event.payload],
          error: null,
          success: null,
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
      const unlistenSuccess = await listen<string>("lima-instance-success", (event) => {
        setInstanceStatus(prev => ({
          ...prev,
          isStarting: false,
          success: event.payload,
          error: null,
        }));
      });

      // Listen for stop success event
      const unlistenStopSuccess = await listen<string>("lima-instance-stop-success", (event) => {
        setInstanceStatus(prev => ({
          ...prev,
          isStarting: false,
          success: event.payload,
          error: null,
        }));
      });

      // Listen for delete success event
      const unlistenDeleteSuccess = await listen<string>("lima-instance-delete-success", (event) => {
        setInstanceStatus(prev => ({
          ...prev,
          isStarting: false,
          success: event.payload,
          error: null,
        }));
      });

      // Listen for error events
      const unlistenError = await listen<string>("lima-instance-error", (event) => {
        setInstanceStatus(prev => ({
          ...prev,
          isStarting: false,
          error: event.payload,
          success: null,
        }));
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
  }, []);

  const startInstance = async (config: LimaConfig, instanceName: string) => {
    setInstanceStatus({
      isStarting: true,
      output: [],
      error: null,
      success: null,
      currentInstanceName: instanceName,
    });

    try {
      await invoke<string>("create_lima_instance", {
        config,
        instanceName
      });
    } catch (error) {
      setInstanceStatus(prev => ({
        ...prev,
        isStarting: false,
        error: String(error),
        success: null,
      }));
    }
  };

  const stopInstance = async (instanceName: string) => {
    setInstanceStatus(prev => ({
      ...prev,
      isStarting: true,
      output: [`Stopping instance ${instanceName}...`],
      error: null,
      success: null,
    }));

    try {
      await invoke<string>("stop_lima_instance", { instanceName });
    } catch (error) {
      setInstanceStatus(prev => ({
        ...prev,
        isStarting: false,
        error: String(error),
        success: null,
      }));
    }
  };

  const deleteInstance = async (instanceName: string) => {
    setInstanceStatus(prev => ({
      ...prev,
      isStarting: true,
      output: [`Deleting instance ${instanceName}...`],
      error: null,
      success: null,
    }));

    try {
      await invoke<string>("delete_lima_instance", { instanceName });
    } catch (error) {
      setInstanceStatus(prev => ({
        ...prev,
        isStarting: false,
        error: String(error),
        success: null,
      }));
    }
  };

  const clearStatus = () => {
    setInstanceStatus({
      isStarting: false,
      output: [],
      error: null,
      success: null,
      currentInstanceName: null,
    });
  };

  return {
    instanceStatus,
    startInstance,
    stopInstance,
    deleteInstance,
    clearStatus,
    isCreatingInstance: instanceStatus.isStarting,
  };
}