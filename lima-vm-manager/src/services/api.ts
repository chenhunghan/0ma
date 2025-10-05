import { invoke } from '@tauri-apps/api/core';
import type {
  VM,
  VMConfig,
  VMTemplate,
  SystemInfo,
  CLIToolsStatus,
  AppConfig,
  AppEvent,
  APIResponse,
} from '../types';

// VM Management API
export const vmAPI = {
  // List all VMs
  list: async (): Promise<VM[]> => {
    return await invoke('list_vms');
  },

  // Get VM details
  getDetails: async (vmId: string): Promise<VM> => {
    return await invoke('get_vm_details', { vmId });
  },

  // Start VM
  start: async (vmId: string): Promise<void> => {
    return await invoke('start_vm', { vmId });
  },

  // Stop VM
  stop: async (vmId: string): Promise<void> => {
    return await invoke('stop_vm', { vmId });
  },

  // Restart VM
  restart: async (vmId: string): Promise<void> => {
    return await invoke('restart_vm', { vmId });
  },

  // Delete VM
  delete: async (vmId: string): Promise<void> => {
    return await invoke('delete_vm', { vmId });
  },

  // Create new VM
  create: async (config: VMConfig): Promise<VM> => {
    return await invoke('create_vm', { config });
  },

  // Get VM status
  getStatus: async (vmId: string): Promise<string> => {
    return await invoke('get_vm_status', { vmId });
  },

  // Get available templates
  getTemplates: async (): Promise<VMTemplate[]> => {
    return await invoke('get_available_templates');
  },

  // Get system info
  getSystemInfo: async (): Promise<SystemInfo> => {
    return await invoke('get_system_info');
  },

  // Get limactl version
  getLimaVersion: async (): Promise<string> => {
    return await invoke('get_limactl_version');
  },
};

// VM Monitoring API
export const monitoringAPI = {
  // Get monitoring stats
  getStats: async (): Promise<any> => {
    return await invoke('get_monitoring_stats');
  },

  // Get VM resource data
  getResourceData: async (vmId: string): Promise<any> => {
    return await invoke('get_vm_resource_data', { vmId });
  },

  // Get VM health data
  getHealthData: async (vmId: string): Promise<any> => {
    return await invoke('get_vm_health_data', { vmId });
  },

  // Start VM monitoring
  startMonitoring: async (vmId: string): Promise<void> => {
    return await invoke('start_vm_monitoring', { vmId });
  },

  // Stop VM monitoring
  stopMonitoring: async (vmId: string): Promise<void> => {
    return await invoke('stop_vm_monitoring', { vmId });
  },
};

// CLI Detection API
export const cliAPI = {
  // Detect CLI tools
  detect: async (): Promise<CLIToolsStatus> => {
    return await invoke('detect_cli_tools');
  },

  // Get CLI tool status
  getToolStatus: async (toolName: string): Promise<any> => {
    return await invoke('get_cli_tool_status', { toolName });
  },

  // Refresh CLI tools
  refresh: async (): Promise<CLIToolsStatus> => {
    return await invoke('refresh_cli_tools');
  },
};

// Configuration API
export const configAPI = {
  // Get app config
  get: async (): Promise<AppConfig> => {
    return await invoke('get_app_config');
  },

  // Update app config
  update: async (config: AppConfig, reason?: string): Promise<void> => {
    return await invoke('update_app_config', { config, reason });
  },

  // Reset to defaults
  reset: async (): Promise<void> => {
    return await invoke('reset_config_to_defaults');
  },

  // Export config
  export: async (path: string): Promise<void> => {
    return await invoke('export_config', { path });
  },

  // Import config
  import: async (path: string): Promise<void> => {
    return await invoke('import_config', { path });
  },

  // Get config info
  getInfo: async (): Promise<any> => {
    return await invoke('get_config_info');
  },
};

// VM Configuration API
export const vmConfigAPI = {
  // Validate VM config
  validate: async (config: VMConfig): Promise<any> => {
    return await invoke('validate_vm_config', { config });
  },

  // Get VM templates
  getTemplates: async (): Promise<VMTemplate[]> => {
    return await invoke('get_vm_templates');
  },

  // Get specific VM template
  getTemplate: async (templateName: string): Promise<VMTemplate> => {
    return await invoke('get_vm_template', { templateName });
  },

  // Create VM config from template
  createFromTemplate: async (
    templateName: string,
    vmName: string,
    overrides?: Partial<VMConfig>
  ): Promise<VMConfig> => {
    return await invoke('create_vm_config_from_template', {
      templateName,
      vmName,
      overrides,
    });
  },

  // Save VM config
  save: async (vmName: string, config: VMConfig): Promise<void> => {
    return await invoke('save_vm_config', { vmName, config });
  },

  // Load VM config
  load: async (vmName: string): Promise<VMConfig> => {
    return await invoke('load_vm_config', { vmName });
  },

  // Get VM config history
  getHistory: async (vmName: string): Promise<any[]> => {
    return await invoke('get_vm_config_history', { vmName });
  },

  // Create VM config backup
  createBackup: async (vmName: string, reason?: string): Promise<any> => {
    return await invoke('create_vm_config_backup', { vmName, reason });
  },

  // Get VM config backups
  getBackups: async (vmName: string): Promise<any[]> => {
    return await invoke('get_vm_config_backups', { vmName });
  },

  // Restore VM config from backup
  restoreFromBackup: async (vmName: string, backupId: string): Promise<void> => {
    return await invoke('restore_vm_config_from_backup', { vmName, backupId });
  },

  // Get VM config stats
  getStats: async (vmName?: string): Promise<any> => {
    return await invoke('get_vm_config_stats', { vmName });
  },

  // Delete VM config
  delete: async (vmName: string): Promise<void> => {
    return await invoke('delete_vm_config', { vmName });
  },

  // Clone VM config
  clone: async (sourceVmName: string, targetVmName: string): Promise<VMConfig> => {
    return await invoke('clone_vm_config', { sourceVmName, targetVmName });
  },

  // Export VM config
  export: async (vmName: string, path: string): Promise<void> => {
    return await invoke('export_vm_config', { vmName, path });
  },

  // Import VM config
  import: async (vmName: string, path: string): Promise<VMConfig> => {
    return await invoke('import_vm_config', { vmName, path });
  },
};

// Event API (placeholder for future event system)
export const eventAPI = {
  // Subscribe to events
  subscribe: async (categories: string[]): Promise<string> => {
    // This will be implemented when the event system is connected to frontend
    return 'subscription-id';
  },

  // Unsubscribe from events
  unsubscribe: async (subscriptionId: string): Promise<void> => {
    // This will be implemented when the event system is connected to frontend
  },

  // Get event stats
  getStats: async (): Promise<any> => {
    // This will be implemented when the event system is connected to frontend
    return {};
  },
};

// Utility function for error handling
export const handleAPIError = (error: any): string => {
  if (typeof error === 'string') {
    return error;
  }

  if (error?.message) {
    return error.message;
  }

  if (error?.error) {
    return error.error;
  }

  return 'An unexpected error occurred';
};

// Utility function for API calls with error handling
export const safeAPICall = async <T>(
  apiCall: () => Promise<T>,
  onError?: (error: string) => void
): Promise<T | null> => {
  try {
    return await apiCall();
  } catch (error) {
    const errorMessage = handleAPIError(error);
    console.error('API call failed:', errorMessage);
    if (onError) {
      onError(errorMessage);
    }
    return null;
  }
};