import { invoke } from "@tauri-apps/api/core";
import { useEffect, useState } from "react";

export interface InstanceInfo {
  name: string;
  created_at: string;
  config_path: string;
  status?: string;
}

export function useInstanceRegistry() {
  const [instances, setInstances] = useState<InstanceInfo[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadInstances = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const registeredInstances = await invoke<InstanceInfo[]>("get_registered_instances");
      setInstances(registeredInstances);
    } catch (err) {
      setError(String(err));
    } finally {
      setIsLoading(false);
    }
  };

  const isInstanceRegistered = async (instanceName: string): Promise<boolean> => {
    try {
      return await invoke<boolean>("is_instance_registered", { instanceName });
    } catch (err) {
      console.error("Failed to check if instance is registered:", err);
      return false;
    }
  };

  // Load instances on mount
  useEffect(() => {
    loadInstances();
  }, []);

  return {
    instances,
    isLoading,
    error,
    loadInstances,
    isInstanceRegistered,
  };
}