use crate::models::{
    VirtualMachine, VMStatus, VMConfiguration, VMResources, VMNetwork, VMStorage,
    VMRuntime, VMMetadata, VMArchitecture, VMOperatingSystem, NetworkMode,
    PortForward, PortProtocol, NetworkInterface, InterfaceType, InterfaceStatus,
    DiskImage, MountPoint, HostProcess, DaemonStatus, SSHConnection, VMRuntimeMetrics,
    HealthStatus, NetworkIO, VMOperationResult, OperationError, VMListResponse, VMFilter, SharedDirectory
};
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::path::PathBuf;
use std::process::Command;
use std::sync::Mutex;
use std::time::Duration;
use tauri::State;
use thiserror::Error;
use chrono::Utc;
use regex::Regex;

/// VM management service errors
#[derive(Debug, Error)]
pub enum VMError {
    #[error("limactl command failed: {0}")]
    LimaCommandFailed(String),
    #[error("VM not found: {0}")]
    VMNotFound(String),
    #[error("VM operation failed: {0}")]
    OperationFailed(String),
    #[error("Configuration error: {0}")]
    ConfigurationError(String),
    #[error("IO error: {0}")]
    Io(#[from] std::io::Error),
    #[error("Parse error: {0}")]
    ParseError(String),
    #[error("Timeout error: {0}")]
    TimeoutError(String),
}

/// VM management service
pub struct VMManagementService {
    limactl_path: PathBuf,
    cache: Mutex<HashMap<String, VirtualMachine>>,
    cache_timeout: Duration,
}

impl VMManagementService {
    /// Create a new VM management service
    pub fn new() -> Result<Self, VMError> {
        let limactl_path = Self::find_limactl()?;
        Ok(Self {
            limactl_path,
            cache: Mutex::new(HashMap::new()),
            cache_timeout: Duration::from_secs(30),
        })
    }

    /// Find limactl executable in PATH
    fn find_limactl() -> Result<PathBuf, VMError> {
        let output = Command::new("which")
            .arg("limactl")
            .output()
            .map_err(|e| VMError::LimaCommandFailed(format!("Failed to execute which: {}", e)))?;

        if output.status.success() {
            let path_str = String::from_utf8(output.stdout)
                .map_err(|e| VMError::ParseError(format!("Invalid UTF-8 in limactl path: {}", e)))?
                .trim()
                .to_string();
            Ok(PathBuf::from(path_str))
        } else {
            Err(VMError::LimaCommandFailed("limactl not found in PATH".to_string()))
        }
    }

    /// List all VM instances
    pub fn list_vms(&self, filter: Option<VMFilter>) -> Result<Vec<VirtualMachine>, VMError> {
        let output = Command::new(&self.limactl_path)
            .arg("list")
            .arg("--json")
            .output()
            .map_err(|e| VMError::LimaCommandFailed(format!("Failed to list VMs: {}", e)))?;

        if !output.status.success() {
            let error = String::from_utf8_lossy(&output.stderr);
            return Err(VMError::LimaCommandFailed(format!("limactl list failed: {}", error)));
        }

        let json_str = String::from_utf8(output.stdout)
            .map_err(|e| VMError::ParseError(format!("Invalid UTF-8 in list output: {}", e)))?;

        let lima_instances: Vec<LimaInstance> = serde_json::from_str(&json_str)
            .map_err(|e| VMError::ParseError(format!("Failed to parse limactl list output: {}", e)))?;

        let mut vms = Vec::new();
        for lima_vm in lima_instances {
            let vm = self.convert_lima_instance_to_vm(&lima_vm)?;
            if let Some(ref filter) = filter {
                if self.vm_matches_filter(&vm, filter) {
                    vms.push(vm);
                }
            } else {
                vms.push(vm);
            }
        }

        Ok(vms)
    }

    /// Get detailed information about a specific VM
    pub fn get_vm_details(&self, vm_name: &str) -> Result<VirtualMachine, VMError> {
        // Check cache first
        {
            let cache = self.cache.lock().unwrap();
            if let Some(cached_vm) = cache.get(vm_name) {
                // TODO: Check cache timeout
                return Ok(cached_vm.clone());
            }
        }

        // Fetch from limactl
        let output = Command::new(&self.limactl_path)
            .arg("show")
            .arg("--json")
            .arg(vm_name)
            .output()
            .map_err(|e| VMError::LimaCommandFailed(format!("Failed to get VM details: {}", e)))?;

        if !output.status.success() {
            let error = String::from_utf8_lossy(&output.stderr);
            return Err(VMError::VMNotFound(format!("VM '{}' not found: {}", vm_name, error)));
        }

        let json_str = String::from_utf8(output.stdout)
            .map_err(|e| VMError::ParseError(format!("Invalid UTF-8 in show output: {}", e)))?;

        let lima_vm: LimaShowOutput = serde_json::from_str(&json_str)
            .map_err(|e| VMError::ParseError(format!("Failed to parse limactl show output: {}", e)))?;

        let vm = self.convert_lima_show_to_vm(vm_name, &lima_vm)?;

        // Update cache
        {
            let mut cache = self.cache.lock().unwrap();
            cache.insert(vm_name.to_string(), vm.clone());
        }

        Ok(vm)
    }

    /// Start a VM
    pub fn start_vm(&self, vm_name: &str, force: bool) -> Result<VMOperationResult, VMError> {
        let start_time = std::time::Instant::now();

        let mut cmd = Command::new(&self.limactl_path);
        cmd.arg("start");
        if force {
            cmd.arg("--tty=false"); // Don't allocate TTY
        }
        cmd.arg(vm_name);

        let output = cmd.output()
            .map_err(|e| VMError::OperationFailed(format!("Failed to start VM: {}", e)))?;

        let duration = start_time.elapsed();
        let success = output.status.success();

        let message = if success {
            format!("VM '{}' started successfully", vm_name)
        } else {
            let error = String::from_utf8_lossy(&output.stderr);
            format!("Failed to start VM '{}': {}", vm_name, error)
        };

        let result = VMOperationResult {
            success,
            message: message.clone(),
            duration_ms: duration.as_millis() as u64,
            data: None,
            error: if !success {
                Some(OperationError {
                    code: "START_FAILED".to_string(),
                    message: message,
                    details: Some(String::from_utf8_lossy(&output.stderr).to_string()),
                    stack_trace: None,
                })
            } else {
                None
            },
        };

        // Clear cache on successful operation
        if success {
            let mut cache = self.cache.lock().unwrap();
            cache.remove(vm_name);
        }

        Ok(result)
    }

    /// Stop a VM
    pub fn stop_vm(&self, vm_name: &str, force: bool) -> Result<VMOperationResult, VMError> {
        let start_time = std::time::Instant::now();

        let mut cmd = Command::new(&self.limactl_path);
        cmd.arg("stop");
        if force {
            cmd.arg("--force");
        }
        cmd.arg(vm_name);

        let output = cmd.output()
            .map_err(|e| VMError::OperationFailed(format!("Failed to stop VM: {}", e)))?;

        let duration = start_time.elapsed();
        let success = output.status.success();

        let message = if success {
            format!("VM '{}' stopped successfully", vm_name)
        } else {
            let error = String::from_utf8_lossy(&output.stderr);
            format!("Failed to stop VM '{}': {}", vm_name, error)
        };

        let result = VMOperationResult {
            success,
            message: message.clone(),
            duration_ms: duration.as_millis() as u64,
            data: None,
            error: if !success {
                Some(OperationError {
                    code: "STOP_FAILED".to_string(),
                    message: message,
                    details: Some(String::from_utf8_lossy(&output.stderr).to_string()),
                    stack_trace: None,
                })
            } else {
                None
            },
        };

        // Clear cache on successful operation
        if success {
            let mut cache = self.cache.lock().unwrap();
            cache.remove(vm_name);
        }

        Ok(result)
    }

    /// Restart a VM
    pub fn restart_vm(&self, vm_name: &str, force: bool) -> Result<VMOperationResult, VMError> {
        let start_time = std::time::Instant::now();

        let mut cmd = Command::new(&self.limactl_path);
        cmd.arg("stop");
        if force {
            cmd.arg("--force");
        }
        cmd.arg(vm_name);

        let stop_output = cmd.output()
            .map_err(|e| VMError::OperationFailed(format!("Failed to stop VM for restart: {}", e)))?;

        if !stop_output.status.success() && !force {
            let error = String::from_utf8_lossy(&stop_output.stderr);
            return Err(VMError::OperationFailed(format!("Failed to stop VM for restart: {}", error)));
        }

        // Start the VM
        let start_cmd = Command::new(&self.limactl_path)
            .arg("start")
            .arg("--tty=false")
            .arg(vm_name)
            .output()
            .map_err(|e| VMError::OperationFailed(format!("Failed to start VM during restart: {}", e)))?;

        let duration = start_time.elapsed();
        let success = start_cmd.status.success();

        let message = if success {
            format!("VM '{}' restarted successfully", vm_name)
        } else {
            let error = String::from_utf8_lossy(&start_cmd.stderr);
            format!("Failed to restart VM '{}': {}", vm_name, error)
        };

        let result = VMOperationResult {
            success,
            message: message.clone(),
            duration_ms: duration.as_millis() as u64,
            data: None,
            error: if !success {
                Some(OperationError {
                    code: "RESTART_FAILED".to_string(),
                    message: message,
                    details: Some(String::from_utf8_lossy(&start_cmd.stderr).to_string()),
                    stack_trace: None,
                })
            } else {
                None
            },
        };

        // Clear cache on successful operation
        if success {
            let mut cache = self.cache.lock().unwrap();
            cache.remove(vm_name);
        }

        Ok(result)
    }

    /// Delete a VM
    pub fn delete_vm(&self, vm_name: &str, force: bool) -> Result<VMOperationResult, VMError> {
        let start_time = std::time::Instant::now();

        let mut cmd = Command::new(&self.limactl_path);
        cmd.arg("delete");
        if force {
            cmd.arg("--force");
        }
        cmd.arg(vm_name);

        let output = cmd.output()
            .map_err(|e| VMError::OperationFailed(format!("Failed to delete VM: {}", e)))?;

        let duration = start_time.elapsed();
        let success = output.status.success();

        let message = if success {
            format!("VM '{}' deleted successfully", vm_name)
        } else {
            let error = String::from_utf8_lossy(&output.stderr);
            format!("Failed to delete VM '{}': {}", vm_name, error)
        };

        let result = VMOperationResult {
            success,
            message: message.clone(),
            duration_ms: duration.as_millis() as u64,
            data: None,
            error: if !success {
                Some(OperationError {
                    code: "DELETE_FAILED".to_string(),
                    message: message,
                    details: Some(String::from_utf8_lossy(&output.stderr).to_string()),
                    stack_trace: None,
                })
            } else {
                None
            },
        };

        // Remove from cache on successful operation
        if success {
            let mut cache = self.cache.lock().unwrap();
            cache.remove(vm_name);
        }

        Ok(result)
    }

    /// Create a new VM instance
    pub fn create_vm(&self, vm_name: &str, _template: String, _config_overrides: HashMap<String, serde_yaml::Value>) -> Result<VMOperationResult, VMError> {
        let start_time = std::time::Instant::now();

        // TODO: Implement VM creation with configuration overrides
        // This would involve creating a config file and running limactl create

        let duration = start_time.elapsed();
        let message = format!("VM '{}' creation not yet implemented", vm_name);

        let result = VMOperationResult {
            success: false,
            message: message.clone(),
            duration_ms: duration.as_millis() as u64,
            data: None,
            error: Some(OperationError {
                code: "NOT_IMPLEMENTED".to_string(),
                message,
                details: Some("VM creation functionality will be implemented in a future task".to_string()),
                stack_trace: None,
            }),
        };

        Ok(result)
    }

    /// Get VM status
    pub fn get_vm_status(&self, vm_name: &str) -> Result<VMStatus, VMError> {
        let output = Command::new(&self.limactl_path)
            .arg("list")
            .arg("--json")
            .arg(vm_name)
            .output()
            .map_err(|e| VMError::LimaCommandFailed(format!("Failed to get VM status: {}", e)))?;

        if !output.status.success() {
            return Err(VMError::VMNotFound(format!("VM '{}' not found", vm_name)));
        }

        let json_str = String::from_utf8(output.stdout)
            .map_err(|e| VMError::ParseError(format!("Invalid UTF-8 in status output: {}", e)))?;

        let instances: Vec<LimaInstance> = serde_json::from_str(&json_str)
            .map_err(|e| VMError::ParseError(format!("Failed to parse VM status: {}", e)))?;

        if let Some(instance) = instances.first() {
            Ok(self.convert_lima_status(&instance.status))
        } else {
            Err(VMError::VMNotFound(format!("VM '{}' not found in list output", vm_name)))
        }
    }

    // Helper methods

    fn convert_lima_instance_to_vm(&self, lima_vm: &LimaInstance) -> Result<VirtualMachine, VMError> {
        let status = self.convert_lima_status(&lima_vm.status);

        let vm = VirtualMachine {
            id: lima_vm.name.clone(),
            name: lima_vm.name.clone(),
            status: status.clone(),
            config: VMConfiguration {
                template: lima_vm.template.clone().unwrap_or_else(|| "default".to_string()),
                arch: self.parse_architecture(&lima_vm.arch),
                os: VMOperatingSystem::Linux, // Default assumption
                version: lima_vm.version.clone().unwrap_or_else(|| "unknown".to_string()),
                auto_start: false, // Would need to read from config
                config_file: PathBuf::new(),
                working_dir: PathBuf::new(),
                settings: HashMap::new(),
            },
            resources: VMResources {
                memory_mb: lima_vm.cpus * 2048, // Rough estimate
                cpu_count: lima_vm.cpus,
                disk_size_gb: 60, // Default estimate
                utilization: None,
            },
            network: VMNetwork {
                mode: crate::models::vm::NetworkMode::Shared,
                ip_address: lima_vm.address.clone(),
                mac_address: None,
                port_forwards: Vec::new(),
                dns_servers: vec!["8.8.8.8".to_string()],
                interfaces: Vec::new(),
            },
            storage: VMStorage {
                disk_path: PathBuf::new(),
                additional_disks: Vec::new(),
                mount_points: Vec::new(),
                filesystem: "ext4".to_string(),
            },
            runtime: VMRuntime {
                pid: if matches!(status, VMStatus::Running) { Some(0) } else { None },
                host_process: HostProcess::default(),
                lima_daemon: DaemonStatus {
                    running: matches!(status, VMStatus::Running),
                    pid: None,
                    version: None,
                    socket_path: None,
                },
                ssh: SSHConnection {
                    port: if matches!(status, VMStatus::Running) { Some(22) } else { None },
                    username: Some("lima".to_string()),
                    key_path: None,
                    connected: matches!(status, VMStatus::Running),
                    last_attempt: None,
                },
                metrics: VMRuntimeMetrics::default(),
            },
            shared_directories: Vec::new(),
            metadata: VMMetadata {
                created_at: Utc::now(), // Would need to get from actual creation time
                modified_at: Utc::now(),
                last_started_at: None,
                last_stopped_at: None,
                total_runtime_seconds: 0,
                start_count: 0,
                tags: Vec::new(),
                notes: None,
            },
        };

        Ok(vm)
    }

    fn convert_lima_show_to_vm(&self, vm_name: &str, lima_vm: &LimaShowOutput) -> Result<VirtualMachine, VMError> {
        // This would provide more detailed information from limactl show
        // For now, fall back to a basic implementation
        let status = if lima_vm.status == "Running" {
            VMStatus::Running
        } else {
            VMStatus::Stopped
        };

        let vm = VirtualMachine {
            id: vm_name.to_string(),
            name: vm_name.to_string(),
            status,
            config: VMConfiguration::default(),
            resources: VMResources::default(),
            network: VMNetwork::default(),
            storage: VMStorage::default(),
            runtime: VMRuntime::default(),
            shared_directories: Vec::new(),
            metadata: VMMetadata::default(),
        };

        Ok(vm)
    }

    fn convert_lima_status(&self, lima_status: &str) -> VMStatus {
        match lima_status {
            "Running" => VMStatus::Running,
            "Stopped" => VMStatus::Stopped,
            "Stopping" => VMStatus::Stopping,
            "Starting" => VMStatus::Starting,
            _ => VMStatus::Unknown,
        }
    }

    fn parse_architecture(&self, arch_str: &str) -> VMArchitecture {
        match arch_str {
            "x86_64" => VMArchitecture::X86_64,
            "aarch64" | "arm64" => VMArchitecture::Arm64,
            "arm" => VMArchitecture::Arm,
            _ => VMArchitecture::Unknown,
        }
    }

    fn vm_matches_filter(&self, vm: &VirtualMachine, filter: &VMFilter) -> bool {
        if let Some(ref status_filter) = filter.status {
            if vm.status != *status_filter {
                return false;
            }
        }

        if let Some(ref name_pattern) = filter.name_pattern {
            let regex = Regex::new(name_pattern).unwrap_or_else(|_| {
                Regex::new(&regex::escape(name_pattern)).unwrap()
            });
            if !regex.is_match(&vm.name) {
                return false;
            }
        }

        if let Some(ref tags) = filter.tags {
            if !tags.iter().all(|tag| vm.metadata.tags.contains(tag)) {
                return false;
            }
        }

        if let Some(ref arch_filter) = filter.arch {
            if vm.config.arch != *arch_filter {
                return false;
            }
        }

        if let Some(ref os_filter) = filter.os {
            if vm.config.os != *os_filter {
                return false;
            }
        }

        true
    }

    /// Clear the VM cache
    pub fn clear_cache(&self) {
        let mut cache = self.cache.lock().unwrap();
        cache.clear();
    }

    /// Get limactl version
    pub fn get_limactl_version(&self) -> Result<String, VMError> {
        let output = Command::new(&self.limactl_path)
            .arg("--version")
            .output()
            .map_err(|e| VMError::LimaCommandFailed(format!("Failed to get limactl version: {}", e)))?;

        if output.status.success() {
            let version = String::from_utf8(output.stdout)
                .map_err(|e| VMError::ParseError(format!("Invalid UTF-8 in version output: {}", e)))?
                .trim()
                .to_string();
            Ok(version)
        } else {
            Err(VMError::LimaCommandFailed("Failed to get limactl version".to_string()))
        }
    }
}

impl Default for VMManagementService {
    fn default() -> Self {
        Self::new().unwrap_or_else(|_| {
            Self {
                limactl_path: PathBuf::from("limactl"),
                cache: Mutex::new(HashMap::new()),
                cache_timeout: Duration::from_secs(30),
            }
        })
    }
}

// Lima API response structures
#[derive(Debug, Clone, Serialize, Deserialize)]
struct LimaInstance {
    pub name: String,
    pub status: String,
    pub ssh_local_port: Option<u16>,
    pub arch: String,
    pub cpus: u32,
    pub memory: Option<u64>,
    pub disk: Option<u64>,
    pub dir: Option<String>,
    pub template: Option<String>,
    pub version: Option<String>,
    pub address: Option<String>,
    pub runtime: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
struct LimaShowOutput {
    pub status: String,
    pub dir: String,
    pub vm_type: String,
    pub arch: String,
    pub cpus: u32,
    pub memory: u64,
    pub disk: u64,
    pub template: String,
    pub version: String,
    pub ssh_local_port: u16,
    pub ssh_host_port: u16,
    pub ssh_guest_port: u16,
    pub ssh_address: String,
    pub networks: Vec<LimaNetwork>,
    pub mounts: Vec<LimaMount>,
    pub ssh_config: LimaSSHConfig,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
struct LimaNetwork {
    pub lima: String,
    pub guest: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
struct LimaMount {
    pub host: String,
    pub guest: String,
    pub writable: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
struct LimaSSHConfig {
    pub local_port: u16,
    pub host_port: u16,
    pub guest_port: u16,
    pub address: String,
}

// Tauri commands for VM management
#[tauri::command]
pub async fn list_vms(
    filter: Option<VMFilter>,
    state: State<'_, VMManagementService>,
) -> Result<VMListResponse, String> {
    match state.list_vms(filter.clone()) {
        Ok(vms) => {
            let total_count = vms.len();
            Ok(VMListResponse {
                vms,
                total_count,
                filter,
                pagination: None,
            })
        },
        Err(e) => Err(e.to_string()),
    }
}

#[tauri::command]
pub async fn get_vm_details(
    vm_name: String,
    state: State<'_, VMManagementService>,
) -> Result<VirtualMachine, String> {
    state.get_vm_details(&vm_name).map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn start_vm(
    vm_name: String,
    force: bool,
    state: State<'_, VMManagementService>,
) -> Result<VMOperationResult, String> {
    state.start_vm(&vm_name, force).map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn stop_vm(
    vm_name: String,
    force: bool,
    state: State<'_, VMManagementService>,
) -> Result<VMOperationResult, String> {
    state.stop_vm(&vm_name, force).map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn restart_vm(
    vm_name: String,
    force: bool,
    state: State<'_, VMManagementService>,
) -> Result<VMOperationResult, String> {
    state.restart_vm(&vm_name, force).map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn delete_vm(
    vm_name: String,
    force: bool,
    state: State<'_, VMManagementService>,
) -> Result<VMOperationResult, String> {
    state.delete_vm(&vm_name, force).map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn create_vm(
    vm_name: String,
    template: String,
    config_overrides: HashMap<String, serde_yaml::Value>,
    state: State<'_, VMManagementService>,
) -> Result<VMOperationResult, String> {
    state.create_vm(&vm_name, template, config_overrides).map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn get_vm_status(
    vm_name: String,
    state: State<'_, VMManagementService>,
) -> Result<VMStatus, String> {
    state.get_vm_status(&vm_name).map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn get_limactl_version(
    state: State<'_, VMManagementService>,
) -> Result<String, String> {
    state.get_limactl_version().map_err(|e| e.to_string())
}

/// Get available VM templates from limactl
#[tauri::command]
pub async fn get_available_templates() -> Result<Vec<String>, String> {
    // For now, return common Lima templates
    // In a real implementation, this could query `limactl list-templates`
    Ok(vec![
        "ubuntu".to_string(),
        "alpine".to_string(),
        "debian".to_string(),
        "archlinux".to_string(),
        "fedora".to_string(),
        "opensuse".to_string(),
        "rockylinux".to_string(),
        "centos".to_string(),
    ])
}

/// Get system information for VM creation
#[tauri::command]
pub async fn get_system_info() -> Result<serde_json::Value, String> {
    let system_info = serde_json::json!({
        "arch": std::env::consts::ARCH,
        "os": std::env::consts::OS,
        "family": std::env::consts::FAMILY,
    });
    Ok(system_info)
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::collections::HashMap;

    #[test]
    fn test_vm_service_creation() {
        let service = VMManagementService::default();
        assert_eq!(service.limactl_path, PathBuf::from("limactl"));
    }

    #[test]
    fn test_status_conversion() {
        let service = VMManagementService::default();
        assert_eq!(service.convert_lima_status("Running"), VMStatus::Running);
        assert_eq!(service.convert_lima_status("Stopped"), VMStatus::Stopped);
        assert_eq!(service.convert_lima_status("Unknown"), VMStatus::Unknown);
    }

    #[test]
    fn test_architecture_parsing() {
        let service = VMManagementService::default();
        assert_eq!(service.parse_architecture("x86_64"), VMArchitecture::X86_64);
        assert_eq!(service.parse_architecture("aarch64"), VMArchitecture::Arm64);
        assert_eq!(service.parse_architecture("arm"), VMArchitecture::Arm);
        assert_eq!(service.parse_architecture("unknown"), VMArchitecture::Unknown);
    }

    #[test]
    fn test_vm_filtering() {
        let service = VMManagementService::default();
        let vm = VirtualMachine {
            id: "test-vm".to_string(),
            name: "Test VM".to_string(),
            status: VMStatus::Running,
            config: VMConfiguration::default(),
            resources: VMResources::default(),
            network: VMNetwork::default(),
            storage: VMStorage::default(),
            runtime: VMRuntime::default(),
            shared_directories: Vec::new(),
            metadata: VMMetadata {
                tags: vec!["test".to_string(), "development".to_string()],
                ..Default::default()
            },
        };

        // Test status filter
        let filter = VMFilter {
            status: Some(VMStatus::Running),
            name_pattern: None,
            tags: None,
            arch: None,
            os: None,
        };
        assert!(service.vm_matches_filter(&vm, &filter));

        // Test name pattern filter
        let filter = VMFilter {
            status: None,
            name_pattern: Some("Test".to_string()),
            tags: None,
            arch: None,
            os: None,
        };
        assert!(service.vm_matches_filter(&vm, &filter));

        // Test tag filter
        let filter = VMFilter {
            status: None,
            name_pattern: None,
            tags: Some(vec!["test".to_string()]),
            arch: None,
            os: None,
        };
        assert!(service.vm_matches_filter(&vm, &filter));

        // Test multiple filters
        let filter = VMFilter {
            status: Some(VMStatus::Running),
            name_pattern: Some("Test".to_string()),
            tags: Some(vec!["test".to_string()]),
            arch: None,
            os: None,
        };
        assert!(service.vm_matches_filter(&vm, &filter));
    }
}