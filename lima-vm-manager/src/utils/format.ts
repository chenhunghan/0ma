import type { VM, VMStatus, CLITool, AppEvent, EventPriority } from '../types';

// VM Status utilities
export const getVMStatusColor = (status: VMStatus): string => {
  switch (status) {
    case 'Running':
      return 'text-green-600 bg-green-100';
    case 'Stopped':
      return 'text-gray-600 bg-gray-100';
    case 'Starting':
      return 'text-blue-600 bg-blue-100';
    case 'Stopping':
      return 'text-yellow-600 bg-yellow-100';
    case 'Error':
      return 'text-red-600 bg-red-100';
    case 'Suspended':
      return 'text-purple-600 bg-purple-100';
    default:
      return 'text-gray-600 bg-gray-100';
  }
};

export const getVMStatusIcon = (status: VMStatus): string => {
  switch (status) {
    case 'Running':
      return '▶️';
    case 'Stopped':
      return '⏹️';
    case 'Starting':
      return '⏳';
    case 'Stopping':
      return '🛑';
    case 'Error':
      return '❌';
    case 'Suspended':
      return '⏸️';
    default:
      return '❓';
  }
};

// VM Action utilities
export const getAvailableVMActions = (status: VMStatus): Array<'start' | 'stop' | 'restart' | 'delete'> => {
  switch (status) {
    case 'Running':
      return ['stop', 'restart', 'delete'];
    case 'Stopped':
      return ['start', 'delete'];
    case 'Starting':
      return []; // No actions during transition
    case 'Stopping':
      return []; // No actions during transition
    case 'Error':
      return ['start', 'delete']; // Allow restart via start action
    case 'Suspended':
      return ['start', 'delete'];
    default:
      return [];
  }
};

// File size formatting
export const formatBytes = (bytes: number, decimals = 2): string => {
  if (bytes === 0) return '0 B';

  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];

  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
};

// Memory formatting (MB to GB)
export const formatMemory = (mb: number): string => {
  if (mb < 1024) {
    return `${mb} MB`;
  }
  return `${(mb / 1024).toFixed(1)} GB`;
};

// CPU usage formatting
export const formatCpuUsage = (usage: number): string => {
  return `${Math.round(usage)}%`;
};

// Network formatting
export const formatNetworkSpeed = (bytesPerSecond: number): string => {
  return `${formatBytes(bytesPerSecond)}/s`;
};

// Time formatting
export const formatDuration = (seconds: number): string => {
  if (seconds < 60) {
    return `${seconds}s`;
  }

  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) {
    return `${minutes}m ${seconds % 60}s`;
  }

  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  return `${hours}h ${remainingMinutes}m`;
};

export const formatDate = (dateString: string): string => {
  const date = new Date(dateString);
  return date.toLocaleString();
};

export const formatRelativeTime = (dateString: string): string => {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSecs = Math.floor(diffMs / 1000);

  if (diffSecs < 60) {
    return 'just now';
  }

  const diffMins = Math.floor(diffSecs / 60);
  if (diffMins < 60) {
    return `${diffMins} minute${diffMins > 1 ? 's' : ''} ago`;
  }

  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) {
    return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
  }

  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) {
    return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
  }

  return formatDate(dateString);
};

// CLI Tool utilities
export const getCLIToolStatusColor = (tool: CLITool): string => {
  if (!tool.is_available) {
    return 'text-red-600 bg-red-100';
  }

  switch (tool.status) {
    case 'available':
      return 'text-green-600 bg-green-100';
    case 'outdated':
      return 'text-yellow-600 bg-yellow-100';
    case 'error':
      return 'text-red-600 bg-red-100';
    default:
      return 'text-gray-600 bg-gray-100';
  }
};

export const getCLIToolStatusIcon = (tool: CLITool): string => {
  if (!tool.is_available) {
    return '❌';
  }

  switch (tool.status) {
    case 'available':
      return '✅';
    case 'outdated':
      return '⚠️';
    case 'error':
      return '❌';
    default:
      return '❓';
  }
};

// Event utilities
export const getEventPriorityColor = (priority: EventPriority): string => {
  switch (priority) {
    case 'critical':
      return 'text-red-600 bg-red-100';
    case 'high':
      return 'text-orange-600 bg-orange-100';
    case 'normal':
      return 'text-blue-600 bg-blue-100';
    case 'low':
      return 'text-gray-600 bg-gray-100';
    default:
      return 'text-gray-600 bg-gray-100';
  }
};

export const getEventPriorityIcon = (priority: EventPriority): string => {
  switch (priority) {
    case 'critical':
      return '🔴';
    case 'high':
      return '🟠';
    case 'normal':
      return '🔵';
    case 'low':
      return '⚪';
    default:
      return '⚪';
  }
};

// VM resource calculations
export const calculateResourceUsage = (vm: VM): {
  cpu: number;
  memory: number;
  disk: number;
} => {
  return {
    cpu: vm.cpu_usage || 0,
    memory: vm.memory_usage || 0,
    disk: vm.disk_usage || 0,
  };
};

export const getResourceHealthColor = (usage: number): string => {
  if (usage >= 90) return 'text-red-600';
  if (usage >= 70) return 'text-yellow-600';
  return 'text-green-600';
};

// Validation utilities
export const validateVMName = (name: string): { valid: boolean; error?: string } => {
  if (!name.trim()) {
    return { valid: false, error: 'VM name is required' };
  }

  if (name.length < 3) {
    return { valid: false, error: 'VM name must be at least 3 characters' };
  }

  if (name.length > 50) {
    return { valid: false, error: 'VM name must be less than 50 characters' };
  }

  // Check for invalid characters
  if (!/^[a-zA-Z0-9_-]+$/.test(name)) {
    return { valid: false, error: 'VM name can only contain letters, numbers, hyphens, and underscores' };
  }

  return { valid: true };
};

export const validateIPAddress = (ip: string): boolean => {
  const ipv4Regex = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
  const ipv6Regex = /^(?:[0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}$/;
  return ipv4Regex.test(ip) || ipv6Regex.test(ip);
};

// Search and filter utilities
export const searchVMs = (vms: VM[], query: string): VM[] => {
  if (!query.trim()) return vms;

  const lowercaseQuery = query.toLowerCase();
  return vms.filter(vm =>
    vm.name.toLowerCase().includes(lowercaseQuery) ||
    vm.id.toLowerCase().includes(lowercaseQuery) ||
    (vm.ip_address && vm.ip_address.toLowerCase().includes(lowercaseQuery)) ||
    (vm.template && vm.template.toLowerCase().includes(lowercaseQuery))
  );
};

export const filterVMsByStatus = (vms: VM[], statuses: VMStatus[]): VM[] => {
  if (statuses.length === 0) return vms;
  return vms.filter(vm => statuses.includes(vm.status));
};

// Sorting utilities
export const sortVMsByName = (vms: VM[], ascending = true): VM[] => {
  return [...vms].sort((a, b) => {
    const comparison = a.name.localeCompare(b.name);
    return ascending ? comparison : -comparison;
  });
};

export const sortVMsByStatus = (vms: VM[]): VM[] => {
  const statusOrder = ['Running', 'Starting', 'Stopping', 'Suspended', 'Stopped', 'Error'];
  return [...vms].sort((a, b) => {
    const aIndex = statusOrder.indexOf(a.status);
    const bIndex = statusOrder.indexOf(b.status);
    return aIndex - bIndex;
  });
};

export const sortVMsByCreatedDate = (vms: VM[], ascending = true): VM[] => {
  return [...vms].sort((a, b) => {
    const aDate = new Date(a.created_at).getTime();
    const bDate = new Date(b.created_at).getTime();
    return ascending ? aDate - bDate : bDate - aDate;
  });
};