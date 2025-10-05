// Core type definitions for Lima VM Manager frontend

export interface VM {
  id: string;
  name: string;
  status: VMStatus;
  state: VMState;
  ip_address?: string;
  cpu_usage?: number;
  memory_usage?: number;
  disk_usage?: number;
  created_at: string;
  updated_at: string;
  template?: string;
  config?: VMConfig;
  resources?: VMResources;
  health?: VMHealth;
}

export type VMStatus = 'Running' | 'Stopped' | 'Starting' | 'Stopping' | 'Error' | 'Suspended';
export type VMState = 'Running' | 'Stopped' | 'Paused' | 'Error';

export interface VMConfig {
  name: string;
  template: string;
  cpus?: number;
  memory?: number;
  disk?: number;
  network?: VMNetworkConfig;
  mounts?: VMMountConfig[];
  environment?: Record<string, string>;
  ports?: VMPortConfig[];
}

export interface VMNetworkConfig {
  share_default?: boolean;
  socket?: string;
}

export interface VMMountConfig {
  location: string;
  writable: boolean;
}

export interface VMPortConfig {
  guest: number;
  host: number;
  proto: 'tcp' | 'udp';
}

export interface VMResources {
  cpus: number;
  memory: number;
  disk: number;
  network_rx: number;
  network_tx: number;
}

export interface VMHealth {
  status: 'healthy' | 'warning' | 'critical';
  checks: HealthCheck[];
  last_check: string;
}

export interface HealthCheck {
  name: string;
  status: 'pass' | 'warn' | 'fail';
  message?: string;
  timestamp: string;
}

// CLI Tool types
export interface CLITool {
  name: string;
  version?: string;
  path: string;
  is_available: boolean;
  status: CLIStatus;
  last_check: string;
}

export type CLIStatus = 'available' | 'unavailable' | 'outdated' | 'error';

export interface CLIToolsStatus {
  limactl: CLITool;
  kubectl: CLITool;
  git: CLITool;
  docker: CLITool;
  qemu: CLITool;
}

// Configuration types
export interface AppConfig {
  general: GeneralConfig;
  vm_management: VMManagementConfig;
  monitoring: MonitoringConfig;
  logging: LoggingConfig;
  ui: UIConfig;
}

export interface GeneralConfig {
  theme: Theme;
  log_level: LogLevel;
  auto_start: boolean;
  check_updates: boolean;
  data_dir: string;
}

export type Theme = 'light' | 'dark' | 'system';
export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export interface VMManagementConfig {
  default_template: string;
  auto_save_configs: boolean;
  backup_interval_hours: number;
  max_backups: number;
  default_resources: VMResourceDefaults;
}

export interface VMResourceDefaults {
  cpus: number;
  memory: number; // in MB
  disk: number; // in GB
}

export interface MonitoringConfig {
  enabled: boolean;
  refresh_interval_seconds: number;
  history_retention_hours: number;
  alert_thresholds: AlertThresholds;
}

export interface AlertThresholds {
  cpu_warning: number;
  cpu_critical: number;
  memory_warning: number;
  memory_critical: number;
  disk_warning: number;
  disk_critical: number;
}

export interface LoggingConfig {
  level: LogLevel;
  format: LogFormat;
  file_enabled: boolean;
  file_path?: string;
  max_file_size_mb: number;
  max_files: number;
}

export type LogFormat = 'json' | 'text';

export interface UIConfig {
  theme: Theme;
  window_state: WindowState;
  layout: LayoutConfig;
}

export interface WindowState {
  width: number;
  height: number;
  maximized: boolean;
  theme: Theme;
}

export interface LayoutConfig {
  sidebar_width: number;
  show_sidebar: boolean;
  compact_mode: boolean;
}

// Event and notification types
export interface AppEvent {
  id: string;
  category: EventCategory;
  type: string;
  message: string;
  source: string;
  timestamp: string;
  priority: EventPriority;
  data?: Record<string, any>;
}

export type EventCategory =
  | 'vm_lifecycle'
  | 'system_error'
  | 'user_action'
  | 'config_change'
  | 'log_created'
  | 'cli_tool_detection'
  | 'state_change';

export type EventPriority = 'low' | 'normal' | 'high' | 'critical';

export interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  timestamp: string;
  auto_close?: boolean;
  actions?: NotificationAction[];
  read: boolean;
}

export type NotificationType = 'info' | 'success' | 'warning' | 'error';

export interface NotificationAction {
  label: string;
  action: () => void;
  variant?: 'primary' | 'secondary' | 'danger';
}

// System info types
export interface SystemInfo {
  platform: string;
  arch: string;
  limactl_version?: string;
  kubectl_version?: string;
  docker_version?: string;
  git_version?: string;
  qemu_version?: string;
  total_memory_mb: number;
  available_memory_mb: number;
  cpu_count: number;
  disk_space_gb: number;
  available_disk_gb: number;
}

// Template types
export interface VMTemplate {
  name: string;
  description: string;
  category: string;
  default_resources: VMResourceDefaults;
  supported_features: string[];
  requirements: TemplateRequirements;
  config_example: VMConfig;
}

export interface TemplateRequirements {
  min_memory_mb: number;
  min_disk_gb: number;
  min_cpus: number;
  required_tools: string[];
}

// API Response types
export interface APIResponse<T = any> {
  success: boolean;
  data?: T;
  error?: APIError;
}

export interface APIError {
  code: string;
  message: string;
  details?: Record<string, any>;
}

// Component prop types
export interface TableColumn<T = any> {
  key: keyof T | string;
  title: string;
  sortable?: boolean;
  width?: string;
  render?: (value: any, record: T) => React.ReactNode;
}

export interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  size?: 'small' | 'medium' | 'large' | 'fullscreen';
}

export interface ButtonProps {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
  size?: 'small' | 'medium' | 'large';
  disabled?: boolean;
  loading?: boolean;
  icon?: React.ReactNode;
  onClick?: () => void;
  children: React.ReactNode;
}

export interface InputProps {
  type?: 'text' | 'password' | 'email' | 'number';
  value?: string;
  placeholder?: string;
  disabled?: boolean;
  error?: string;
  label?: string;
  required?: boolean;
  onChange?: (value: string) => void;
}

// Utility types
export type Optional<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;
export type RequiredBy<T, K extends keyof T> = T & Required<Pick<T, K>>;
export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};