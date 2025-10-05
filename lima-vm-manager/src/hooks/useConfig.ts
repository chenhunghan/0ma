import { useState, useEffect, useCallback } from 'react';
import type { AppConfig } from '../types';
import { configAPI, safeAPICall } from '../services/api';

export const useConfig = () => {
  const [config, setConfig] = useState<AppConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch configuration
  const fetchConfig = useCallback(async () => {
    setLoading(true);
    setError(null);

    const result = await safeAPICall(
      () => configAPI.get(),
      (errorMessage) => setError(errorMessage)
    );

    if (result) {
      setConfig(result);
    }
    setLoading(false);
  }, []);

  // Update configuration
  const updateConfig = useCallback(async (
    newConfig: Partial<AppConfig>,
    reason?: string
  ) => {
    if (!config) return false;

    const updatedConfig = { ...config, ...newConfig };

    const result = await safeAPICall(
      () => configAPI.update(updatedConfig, reason),
      (errorMessage) => setError(errorMessage)
    );

    if (result !== null) {
      setConfig(updatedConfig);
      return true;
    }
    return false;
  }, [config]);

  // Reset configuration to defaults
  const resetConfig = useCallback(async () => {
    const result = await safeAPICall(
      () => configAPI.reset(),
      (errorMessage) => setError(errorMessage)
    );

    if (result !== null) {
      await fetchConfig();
      return true;
    }
    return false;
  }, [fetchConfig]);

  // Export configuration
  const exportConfig = useCallback(async (path: string) => {
    return await safeAPICall(
      () => configAPI.export(path),
      (errorMessage) => setError(errorMessage)
    ) !== null;
  }, []);

  // Import configuration
  const importConfig = useCallback(async (path: string) => {
    const result = await safeAPICall(
      () => configAPI.import(path),
      (errorMessage) => setError(errorMessage)
    );

    if (result !== null) {
      await fetchConfig();
      return true;
    }
    return false;
  }, [fetchConfig]);

  // Get configuration info
  const getConfigInfo = useCallback(async () => {
    return await safeAPICall(
      () => configAPI.getInfo(),
      (errorMessage) => setError(errorMessage)
    );
  }, []);

  // Update theme
  const updateTheme = useCallback(async (theme: 'light' | 'dark' | 'system') => {
    return await updateConfig({ general: { ...config?.general, theme } }, 'Theme changed');
  }, [config, updateConfig]);

  // Update log level
  const updateLogLevel = useCallback(async (level: 'debug' | 'info' | 'warn' | 'error') => {
    return await updateConfig({ general: { ...config?.general, log_level: level } }, 'Log level changed');
  }, [config, updateConfig]);

  // Update auto-start setting
  const updateAutoStart = useCallback(async (autoStart: boolean) => {
    return await updateConfig({ general: { ...config?.general, auto_start: autoStart } }, 'Auto-start setting changed');
  }, [config, updateConfig]);

  // Update update checking
  const updateCheckUpdates = useCallback(async (checkUpdates: boolean) => {
    return await updateConfig({ general: { ...config?.general, check_updates: checkUpdates } }, 'Update checking setting changed');
  }, [config, updateConfig]);

  // Update VM management settings
  const updateVMManagementConfig = useCallback(async (vmConfig: Partial<AppConfig['vm_management']>) => {
    if (!config) return false;

    const updatedConfig = {
      ...config,
      vm_management: { ...config.vm_management, ...vmConfig }
    };

    return await updateConfig(updatedConfig, 'VM management settings updated');
  }, [config, updateConfig]);

  // Update monitoring settings
  const updateMonitoringConfig = useCallback(async (monitoringConfig: Partial<AppConfig['monitoring']>) => {
    if (!config) return false;

    const updatedConfig = {
      ...config,
      monitoring: { ...config.monitoring, ...monitoringConfig }
    };

    return await updateConfig(updatedConfig, 'Monitoring settings updated');
  }, [config, updateConfig]);

  // Update logging settings
  const updateLoggingConfig = useCallback(async (loggingConfig: Partial<AppConfig['logging']>) => {
    if (!config) return false;

    const updatedConfig = {
      ...config,
      logging: { ...config.logging, ...loggingConfig }
    };

    return await updateConfig(updatedConfig, 'Logging settings updated');
  }, [config, updateConfig]);

  // Update UI settings
  const updateUIConfig = useCallback(async (uiConfig: Partial<AppConfig['ui']>) => {
    if (!config) return false;

    const updatedConfig = {
      ...config,
      ui: { ...config.ui, ...uiConfig }
    };

    return await updateConfig(updatedConfig, 'UI settings updated');
  }, [config, updateConfig]);

  // Clear error
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  // Initial fetch
  useEffect(() => {
    fetchConfig();
  }, [fetchConfig]);

  return {
    config,
    loading,
    error,
    fetchConfig,
    updateConfig,
    resetConfig,
    exportConfig,
    importConfig,
    getConfigInfo,
    updateTheme,
    updateLogLevel,
    updateAutoStart,
    updateCheckUpdates,
    updateVMManagementConfig,
    updateMonitoringConfig,
    updateLoggingConfig,
    updateUIConfig,
    clearError,
  };
};