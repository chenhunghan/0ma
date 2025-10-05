use serde::{Deserialize, Serialize};
use std::path::PathBuf;

/// Application configuration structure
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AppConfig {
    /// General application settings
    pub general: GeneralConfig,
    /// VM management settings
    pub vm: VMConfig,
    /// UI settings
    pub ui: UIConfig,
    /// Network settings
    pub network: NetworkConfig,
}

/// General application configuration
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GeneralConfig {
    /// Whether to start the app automatically on system startup
    pub auto_start: bool,
    /// Whether to show the app in system tray
    pub show_tray_icon: bool,
    /// Whether to start minimized to tray
    pub start_minimized: bool,
    /// Application theme
    pub theme: AppTheme,
    /// Log level
    pub log_level: LogLevel,
    /// Default VM settings
    pub default_vm_name: String,
    /// Data directory for VMs and configurations
    pub data_directory: PathBuf,
}

/// Virtual Machine configuration
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct VMConfig {
    /// Default memory allocation in MB
    pub default_memory_mb: u32,
    /// Default CPU count
    pub default_cpu_count: u32,
    /// Default disk size in GB
    pub default_disk_size_gb: u32,
    /// Auto-start VMs on app launch
    pub auto_start_vms: Vec<String>,
    /// VM instance configurations
    pub instances: Vec<VMInstance>,
    /// Network configuration
    pub network_mode: NetworkMode,
    /// Share directories with host
    pub shared_directories: Vec<SharedDirectory>,
}

/// User Interface configuration
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UIConfig {
    /// Main window dimensions
    pub window_width: u32,
    pub window_height: u32,
    /// Window position
    pub window_x: Option<i32>,
    pub window_y: Option<i32>,
    /// Whether to remember window position
    pub remember_window_position: bool,
    /// Refresh interval for VM status (in seconds)
    pub refresh_interval_seconds: u32,
    /// Show advanced options
    pub show_advanced_options: bool,
    /// Language preference
    pub language: String,
}

/// Network configuration
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct NetworkConfig {
    /// Proxy settings
    pub proxy_enabled: bool,
    pub proxy_url: Option<String>,
    pub proxy_port: Option<u16>,
    /// DNS settings
    pub dns_servers: Vec<String>,
    /// Network timeouts
    pub connection_timeout_seconds: u32,
}

/// Virtual Machine instance configuration
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct VMInstance {
    /// Unique identifier for the VM
    pub id: String,
    /// Display name
    pub name: String,
    /// VM status
    pub status: VMStatus,
    /// Memory allocation in MB
    pub memory_mb: u32,
    /// CPU count
    pub cpu_count: u32,
    /// Disk size in GB
    pub disk_size_gb: u32,
    /// Network mode
    pub network_mode: NetworkMode,
    /// Shared directories
    pub shared_directories: Vec<SharedDirectory>,
    /// Auto-start setting
    pub auto_start: bool,
    /// Last known state
    pub last_state: Option<VMState>,
}

/// Shared directory configuration
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SharedDirectory {
    /// Host path
    pub host_path: PathBuf,
    /// Mount point in VM
    pub mount_point: PathBuf,
    /// Whether it's read-only
    pub read_only: bool,
}

/// VM current state information
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct VMState {
    /// Current status
    pub status: VMStatus,
    /// IP address (if running)
    pub ip_address: Option<String>,
    /// Last updated timestamp
    pub last_updated: chrono::DateTime<chrono::Utc>,
}

/// Application theme options
#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum AppTheme {
    Light,
    Dark,
    Auto,
}

/// Log level options
#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum LogLevel {
    Error,
    Warn,
    Info,
    Debug,
    Trace,
}

/// VM status enumeration
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub enum VMStatus {
    Running,
    Stopped,
    Paused,
    Starting,
    Stopping,
    Error,
    Unknown,
}

/// Network mode options
#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum NetworkMode {
    Bridged,
    Shared,
    Host,
    None,
}

impl Default for AppConfig {
    fn default() -> Self {
        Self {
            general: GeneralConfig::default(),
            vm: VMConfig::default(),
            ui: UIConfig::default(),
            network: NetworkConfig::default(),
        }
    }
}

impl Default for GeneralConfig {
    fn default() -> Self {
        Self {
            auto_start: false,
            show_tray_icon: true,
            start_minimized: true,
            theme: AppTheme::Auto,
            log_level: LogLevel::Info,
            default_vm_name: "default".to_string(),
            data_directory: dirs::home_dir()
                .unwrap_or_else(|| PathBuf::from("~"))
                .join(".lima-vm-manager"),
        }
    }
}

impl Default for VMConfig {
    fn default() -> Self {
        Self {
            default_memory_mb: 4096,
            default_cpu_count: 2,
            default_disk_size_gb: 60,
            auto_start_vms: Vec::new(),
            instances: Vec::new(),
            network_mode: NetworkMode::Shared,
            shared_directories: Vec::new(),
        }
    }
}

impl Default for UIConfig {
    fn default() -> Self {
        Self {
            window_width: 1024,
            window_height: 768,
            window_x: None,
            window_y: None,
            remember_window_position: true,
            refresh_interval_seconds: 5,
            show_advanced_options: false,
            language: "en".to_string(),
        }
    }
}

impl Default for NetworkConfig {
    fn default() -> Self {
        Self {
            proxy_enabled: false,
            proxy_url: None,
            proxy_port: None,
            dns_servers: vec!["8.8.8.8".to_string(), "8.8.4.4".to_string()],
            connection_timeout_seconds: 30,
        }
    }
}

impl Default for AppTheme {
    fn default() -> Self {
        Self::Auto
    }
}

impl Default for LogLevel {
    fn default() -> Self {
        Self::Info
    }
}

impl Default for VMStatus {
    fn default() -> Self {
        Self::Unknown
    }
}

impl Default for NetworkMode {
    fn default() -> Self {
        Self::Shared
    }
}