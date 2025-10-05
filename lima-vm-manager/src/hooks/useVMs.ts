import { useState, useEffect, useCallback } from 'react';
import type { VM, VMStatus } from '../types';
import { vmAPI, safeAPICall } from '../services/api';

export const useVMs = () => {
  const [vms, setVMs] = useState<VM[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch all VMs
  const fetchVMs = useCallback(async () => {
    setLoading(true);
    setError(null);

    const result = await safeAPICall(
      () => vmAPI.list(),
      (errorMessage) => setError(errorMessage)
    );

    if (result) {
      setVMs(result);
    }
    setLoading(false);
  }, []);

  // Start VM
  const startVM = useCallback(async (vmId: string) => {
    const result = await safeAPICall(
      () => vmAPI.start(vmId),
      (errorMessage) => setError(errorMessage)
    );

    if (result !== null) {
      // Refresh VM list after successful operation
      await fetchVMs();
      return true;
    }
    return false;
  }, [fetchVMs]);

  // Stop VM
  const stopVM = useCallback(async (vmId: string) => {
    const result = await safeAPICall(
      () => vmAPI.stop(vmId),
      (errorMessage) => setError(errorMessage)
    );

    if (result !== null) {
      // Refresh VM list after successful operation
      await fetchVMs();
      return true;
    }
    return false;
  }, [fetchVMs]);

  // Restart VM
  const restartVM = useCallback(async (vmId: string) => {
    const result = await safeAPICall(
      () => vmAPI.restart(vmId),
      (errorMessage) => setError(errorMessage)
    );

    if (result !== null) {
      // Refresh VM list after successful operation
      await fetchVMs();
      return true;
    }
    return false;
  }, [fetchVMs]);

  // Delete VM
  const deleteVM = useCallback(async (vmId: string) => {
    const result = await safeAPICall(
      () => vmAPI.delete(vmId),
      (errorMessage) => setError(errorMessage)
    );

    if (result !== null) {
      // Remove VM from local state immediately
      setVMs(prev => prev.filter(vm => vm.id !== vmId));
      return true;
    }
    return false;
  }, []);

  // Get VM details
  const getVMDetails = useCallback(async (vmId: string) => {
    return await safeAPICall(
      () => vmAPI.getDetails(vmId),
      (errorMessage) => setError(errorMessage)
    );
  }, []);

  // Create VM
  const createVM = useCallback(async (config: any) => {
    const result = await safeAPICall(
      () => vmAPI.create(config),
      (errorMessage) => setError(errorMessage)
    );

    if (result) {
      // Refresh VM list after successful creation
      await fetchVMs();
      return result;
    }
    return null;
  }, [fetchVMs]);

  // Get VM status
  const getVMStatus = useCallback(async (vmId: string): Promise<VMStatus | null> => {
    return await safeAPICall(
      () => vmAPI.getStatus(vmId),
      (errorMessage) => setError(errorMessage)
    );
  }, []);

  // Filter VMs by status
  const getVMsByStatus = useCallback((status: VMStatus) => {
    return vms.filter(vm => vm.status === status);
  }, [vms]);

  // Get running VMs count
  const getRunningVMsCount = useCallback(() => {
    return vms.filter(vm => vm.status === 'Running').length;
  }, [vms]);

  // Get stopped VMs count
  const getStoppedVMsCount = useCallback(() => {
    return vms.filter(vm => vm.status === 'Stopped').length;
  }, [vms]);

  // Find VM by ID
  const getVMById = useCallback((vmId: string) => {
    return vms.find(vm => vm.id === vmId);
  }, [vms]);

  // Clear error
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  // Initial fetch
  useEffect(() => {
    fetchVMs();
  }, [fetchVMs]);

  return {
    vms,
    loading,
    error,
    fetchVMs,
    startVM,
    stopVM,
    restartVM,
    deleteVM,
    getVMDetails,
    createVM,
    getVMStatus,
    getVMsByStatus,
    getRunningVMsCount,
    getStoppedVMsCount,
    getVMById,
    clearError,
  };
};