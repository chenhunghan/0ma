use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::path::PathBuf;
use chrono::{DateTime, Utc};
use super::config::SharedDirectory;

/// Virtual Machine instance with comprehensive state information
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct VirtualMachine {
    /// Unique identifier for the VM
    pub id: String,
    /// Human-readable name
    pub name: String,
    /// Current operational status
    pub status: VMStatus,
    /// VM configuration
    pub config: VMConfiguration,
    /// Resource allocation
    pub resources: VMResources,
    /// Network configuration
    pub network: VMNetwork,
    /// Storage information
    pub storage: VMStorage,
    /// Runtime state information
    pub runtime: VMRuntime,
    /// Shared directories
    pub shared_directories: Vec<SharedDirectory>,
    /// Metadata
    pub metadata: VMMetadata,
}

/// VM operational status with detailed state information
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub enum VMStatus {
    /// VM is running and operational
    Running,
    /// VM is stopped and powered off
    Stopped,
    /// VM is paused/suspended
    Paused,
    /// VM is starting up
    Starting,
    /// VM is shutting down
    Stopping,
    /// VM encountered an error
    Error(String),
    /// VM status is unknown or cannot be determined
    Unknown,
}

/// Comprehensive VM configuration
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct VMConfiguration {
    /// Lima template used to create this VM
    pub template: String,
    /// VM architecture
    pub arch: VMArchitecture,
    /// Operating system type
    pub os: VMOperatingSystem,
    /// VM version/instance type
    pub version: String,
    /// Auto-start setting
    pub auto_start: bool,
    /// Configuration file path
    pub config_file: PathBuf,
    /// Working directory
    pub working_dir: PathBuf,
    /// Custom configuration settings
    pub settings: HashMap<String, serde_yaml::Value>,
}

/// VM resource allocation specifications
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct VMResources {
    /// Memory allocation in megabytes
    pub memory_mb: u32,
    /// CPU count
    pub cpu_count: u32,
    /// Disk size in gigabytes
    pub disk_size_gb: u32,
    /// Resource utilization (when VM is running)
    pub utilization: Option<ResourceUtilization>,
}

/// Current resource utilization metrics
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ResourceUtilization {
    /// CPU usage percentage (0-100)
    pub cpu_percent: f64,
    /// Memory usage in megabytes
    pub memory_used_mb: u32,
    /// Memory usage percentage (0-100)
    pub memory_percent: f64,
    /// Disk usage in gigabytes
    pub disk_used_gb: f64,
    /// Disk usage percentage (0-100)
    pub disk_percent: f64,
    /// Network I/O statistics
    pub network_io: NetworkIO,
    /// Last updated timestamp
    pub last_updated: DateTime<Utc>,
}

/// VM network configuration and status
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct VMNetwork {
    /// Network mode (bridged, shared, etc.)
    pub mode: NetworkMode,
    /// IP address (when running)
    pub ip_address: Option<String>,
    /// MAC address
    pub mac_address: Option<String>,
    /// Port forwarding rules
    pub port_forwards: Vec<PortForward>,
    /// DNS configuration
    pub dns_servers: Vec<String>,
    /// Network interface details
    pub interfaces: Vec<NetworkInterface>,
}

/// VM storage configuration
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct VMStorage {
    /// Disk image path
    pub disk_path: PathBuf,
    /// Additional disk images
    pub additional_disks: Vec<DiskImage>,
    /// Mount points
    pub mount_points: Vec<MountPoint>,
    /// Filesystem type
    pub filesystem: String,
}

/// Runtime information for the VM
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct VMRuntime {
    /// Process ID (when running)
    pub pid: Option<u32>,
    /// Host process details
    pub host_process: HostProcess,
    /// Lima daemon status
    pub lima_daemon: DaemonStatus,
    /// SSH connection details
    pub ssh: SSHConnection,
    /// Runtime metrics
    pub metrics: VMRuntimeMetrics,
}

/// VM metadata and timestamps
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct VMMetadata {
    /// Creation timestamp
    pub created_at: DateTime<Utc>,
    /// Last modification timestamp
    pub modified_at: DateTime<Utc>,
    /// Last started timestamp
    pub last_started_at: Option<DateTime<Utc>>,
    /// Last stopped timestamp
    pub last_stopped_at: Option<DateTime<Utc>>,
    /// Total running time in seconds
    pub total_runtime_seconds: u64,
    /// Number of times started
    pub start_count: u64,
    /// Tags and labels
    pub tags: Vec<String>,
    /// Notes
    pub notes: Option<String>,
}

/// VM architecture types
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub enum VMArchitecture {
    X86_64,
    Arm64,
    Arm,
    Unknown,
}

/// Operating system types
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub enum VMOperatingSystem {
    Linux,
    MacOS,
    Windows,
    Other(String),
}

/// Network modes
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub enum NetworkMode {
    Bridged,
    Shared,
    Host,
    None,
    UserDefined(String),
}

/// Port forwarding rule
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PortForward {
    /// Local port on host
    pub local_port: u16,
    /// Remote port in VM
    pub remote_port: u16,
    /// Protocol (tcp/udp)
    pub protocol: PortProtocol,
    /// Guest IP address (optional)
    pub guest_ip: Option<String>,
    /// Host IP address (optional)
    pub host_ip: Option<String>,
    /// Rule description
    pub description: Option<String>,
}

/// Port protocols
#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum PortProtocol {
    TCP,
    UDP,
    Both,
}

/// Network interface information
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct NetworkInterface {
    /// Interface name
    pub name: String,
    /// IP address
    pub ip_address: Option<String>,
    /// MAC address
    pub mac_address: Option<String>,
    /// Interface type
    pub interface_type: InterfaceType,
    /// Status
    pub status: InterfaceStatus,
}

/// Network interface types
#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum InterfaceType {
    Ethernet,
    WiFi,
    Loopback,
    Bridge,
    Other(String),
}

/// Network interface status
#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum InterfaceStatus {
    Up,
    Down,
    Unknown,
}

/// Disk image information
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DiskImage {
    /// Disk path
    pub path: PathBuf,
    /// Disk size in GB
    pub size_gb: u32,
    /// Disk format (qcow2, raw, etc.)
    pub format: String,
    /// Mount point (if mounted)
    pub mount_point: Option<PathBuf>,
    /// Read-only flag
    pub read_only: bool,
}

/// Mount point information
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MountPoint {
    /// Device or image path
    pub device: String,
    /// Mount path in VM
    pub path: PathBuf,
    /// Filesystem type
    pub filesystem: String,
    /// Mount options
    pub options: Vec<String>,
    /// Read-only flag
    pub read_only: bool,
}

/// Host process information
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct HostProcess {
    /// Command line used to start the VM
    pub command_line: Option<String>,
    /// Working directory
    pub working_directory: Option<PathBuf>,
    /// Environment variables
    pub environment: HashMap<String, String>,
    /// Process start time
    pub start_time: Option<DateTime<Utc>>,
}

/// Lima daemon status
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DaemonStatus {
    /// Whether daemon is running
    pub running: bool,
    /// Daemon PID
    pub pid: Option<u32>,
    /// Daemon version
    pub version: Option<String>,
    /// Socket path
    pub socket_path: Option<PathBuf>,
}

/// SSH connection details
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SSHConnection {
    /// SSH port
    pub port: Option<u16>,
    /// SSH username
    pub username: Option<String>,
    /// SSH key path
    pub key_path: Option<PathBuf>,
    /// Connection status
    pub connected: bool,
    /// Last connection attempt
    pub last_attempt: Option<DateTime<Utc>>,
}

/// VM runtime metrics
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct VMRuntimeMetrics {
    /// Boot time in milliseconds
    pub boot_time_ms: Option<u64>,
    /// Shutdown time in milliseconds
    pub shutdown_time_ms: Option<u64>,
    /// Number of crashes
    pub crash_count: u32,
    /// Last crash timestamp
    pub last_crash: Option<DateTime<Utc>>,
    /// Health check status
    pub health_status: HealthStatus,
}

/// Health check status
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub enum HealthStatus {
    Healthy,
    Warning(String),
    Critical(String),
    Unknown,
}

/// Network I/O statistics
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct NetworkIO {
    /// Bytes received
    pub bytes_rx: u64,
    /// Bytes transmitted
    pub bytes_tx: u64,
    /// Packets received
    pub packets_rx: u64,
    /// Packets transmitted
    pub packets_tx: u64,
    /// Errors received
    pub errors_rx: u64,
    /// Errors transmitted
    pub errors_tx: u64,
}

/// VM operation request/response structures
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct VMOperationRequest {
    /// VM ID or name
    pub vm_id: String,
    /// Operation type
    pub operation: VMOperation,
    /// Operation parameters
    pub parameters: HashMap<String, String>,
    /// Force operation flag
    pub force: bool,
    /// Timeout in seconds
    pub timeout: Option<u32>,
}

/// VM operation types
#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum VMOperation {
    Start,
    Stop,
    Restart,
    Pause,
    Resume,
    Delete,
    Clone,
    Snapshot,
    Restore,
    Configure,
}

/// VM operation result
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct VMOperationResult {
    /// Whether operation succeeded
    pub success: bool,
    /// Operation message
    pub message: String,
    /// Operation duration in milliseconds
    pub duration_ms: u64,
    /// Additional data
    pub data: Option<serde_yaml::Value>,
    /// Error details (if failed)
    pub error: Option<OperationError>,
}

/// Operation error details
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct OperationError {
    /// Error code
    pub code: String,
    /// Error message
    pub message: String,
    /// Error details
    pub details: Option<String>,
    /// Stack trace (if available)
    pub stack_trace: Option<String>,
}

/// VM list response
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct VMListResponse {
    /// List of VMs
    pub vms: Vec<VirtualMachine>,
    /// Total count
    pub total_count: usize,
    /// Filter criteria used
    pub filter: Option<VMFilter>,
    /// Pagination information
    pub pagination: Option<PaginationInfo>,
}

/// VM filter criteria
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct VMFilter {
    /// Status filter
    pub status: Option<VMStatus>,
    /// Name pattern filter
    pub name_pattern: Option<String>,
    /// Tag filter
    pub tags: Option<Vec<String>>,
    /// Architecture filter
    pub arch: Option<VMArchitecture>,
    /// OS filter
    pub os: Option<VMOperatingSystem>,
}

/// Pagination information
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PaginationInfo {
    /// Current page number
    pub page: u32,
    /// Items per page
    pub per_page: u32,
    /// Total items available
    pub total: u32,
    /// Total pages
    pub total_pages: u32,
}

// Default implementations
impl Default for VirtualMachine {
    fn default() -> Self {
        Self {
            id: "default".to_string(),
            name: "Default VM".to_string(),
            status: VMStatus::Stopped,
            config: VMConfiguration::default(),
            resources: VMResources::default(),
            network: VMNetwork::default(),
            storage: VMStorage::default(),
            runtime: VMRuntime::default(),
            shared_directories: Vec::new(),
            metadata: VMMetadata::default(),
        }
    }
}

impl Default for VMStatus {
    fn default() -> Self {
        Self::Unknown
    }
}

impl Default for VMConfiguration {
    fn default() -> Self {
        Self {
            template: "default".to_string(),
            arch: VMArchitecture::X86_64,
            os: VMOperatingSystem::Linux,
            version: "1.0".to_string(),
            auto_start: false,
            config_file: PathBuf::new(),
            working_dir: PathBuf::new(),
            settings: HashMap::new(),
        }
    }
}

impl Default for VMResources {
    fn default() -> Self {
        Self {
            memory_mb: 4096,
            cpu_count: 2,
            disk_size_gb: 60,
            utilization: None,
        }
    }
}

impl Default for VMNetwork {
    fn default() -> Self {
        Self {
            mode: NetworkMode::Shared,
            ip_address: None,
            mac_address: None,
            port_forwards: Vec::new(),
            dns_servers: vec!["8.8.8.8".to_string()],
            interfaces: Vec::new(),
        }
    }
}

impl Default for VMStorage {
    fn default() -> Self {
        Self {
            disk_path: PathBuf::new(),
            additional_disks: Vec::new(),
            mount_points: Vec::new(),
            filesystem: "ext4".to_string(),
        }
    }
}

impl Default for VMRuntime {
    fn default() -> Self {
        Self {
            pid: None,
            host_process: HostProcess::default(),
            lima_daemon: DaemonStatus::default(),
            ssh: SSHConnection::default(),
            metrics: VMRuntimeMetrics::default(),
        }
    }
}

impl Default for VMMetadata {
    fn default() -> Self {
        Self {
            created_at: Utc::now(),
            modified_at: Utc::now(),
            last_started_at: None,
            last_stopped_at: None,
            total_runtime_seconds: 0,
            start_count: 0,
            tags: Vec::new(),
            notes: None,
        }
    }
}

impl Default for HostProcess {
    fn default() -> Self {
        Self {
            command_line: None,
            working_directory: None,
            environment: HashMap::new(),
            start_time: None,
        }
    }
}

impl Default for DaemonStatus {
    fn default() -> Self {
        Self {
            running: false,
            pid: None,
            version: None,
            socket_path: None,
        }
    }
}

impl Default for SSHConnection {
    fn default() -> Self {
        Self {
            port: None,
            username: None,
            key_path: None,
            connected: false,
            last_attempt: None,
        }
    }
}

impl Default for VMRuntimeMetrics {
    fn default() -> Self {
        Self {
            boot_time_ms: None,
            shutdown_time_ms: None,
            crash_count: 0,
            last_crash: None,
            health_status: HealthStatus::Unknown,
        }
    }
}

impl Default for NetworkIO {
    fn default() -> Self {
        Self {
            bytes_rx: 0,
            bytes_tx: 0,
            packets_rx: 0,
            packets_tx: 0,
            errors_rx: 0,
            errors_tx: 0,
        }
    }
}

impl Default for HealthStatus {
    fn default() -> Self {
        Self::Unknown
    }
}

impl Default for VMArchitecture {
    fn default() -> Self {
        Self::Unknown
    }
}

impl Default for VMOperatingSystem {
    fn default() -> Self {
        Self::Linux
    }
}

impl Default for NetworkMode {
    fn default() -> Self {
        Self::Shared
    }
}

impl Default for PortProtocol {
    fn default() -> Self {
        Self::TCP
    }
}

impl Default for InterfaceType {
    fn default() -> Self {
        Self::Ethernet
    }
}

impl Default for InterfaceStatus {
    fn default() -> Self {
        Self::Unknown
    }
}