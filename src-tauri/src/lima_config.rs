use serde::{Deserialize, Serialize};
use std::collections::HashMap;

/// Helper function to skip serializing empty Vec<Option> fields
fn skip_vec_none<T>(vec: &Option<Vec<T>>) -> bool {
    match vec {
        Some(v) => v.is_empty(),
        None => true,
    }
}

/// Represents a complete Lima configuration file
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LimaConfig {
    /// Minimum version of Lima required
    #[serde(rename = "minimumLimaVersion", skip_serializing_if = "Option::is_none")]
    pub minimum_lima_version: Option<String>,
    /// Instance name
    #[serde(skip_serializing_if = "Option::is_none")]
    pub name: Option<String>,
    /// Base image template
    pub base: String,
    /// Mount points configuration
    #[serde(skip_serializing_if = "skip_vec_none")]
    pub mounts: Option<Vec<Mount>>,
    /// Network configuration
    #[serde(skip_serializing_if = "skip_vec_none")]
    pub networks: Option<Vec<Network>>,
    /// Port forwarding configuration
    #[serde(skip_serializing_if = "skip_vec_none")]
    pub port_forwards: Option<Vec<PortForward>>,
    /// Containerd configuration
    #[serde(skip_serializing_if = "Option::is_none")]
    pub containerd: Option<ContainerdConfig>,
    /// DNS configuration
    #[serde(skip_serializing_if = "Option::is_none")]
    pub dns: Option<DnsConfig>,
    /// Environment variables
    #[serde(skip_serializing_if = "Option::is_none")]
    pub env: Option<HashMap<String, String>>,
    /// Provisioning scripts
    #[serde(skip_serializing_if = "skip_vec_none")]
    pub provision: Option<Vec<Provision>>,
    /// Health probes
    #[serde(skip_serializing_if = "skip_vec_none")]
    pub probes: Option<Vec<Probe>>,
    /// Files to copy from guest to host
    #[serde(skip_serializing_if = "skip_vec_none")]
    pub copy_to_host: Option<Vec<CopyToHost>>,
    /// Files to copy from host to guest
    #[serde(skip_serializing_if = "skip_vec_none")]
    pub copy_from_host: Option<Vec<CopyFromHost>>,
    /// Message to display after instance is ready
    #[serde(skip_serializing_if = "Option::is_none")]
    pub message: Option<String>,
    /// CPU configuration
    #[serde(skip_serializing_if = "Option::is_none")]
    pub cpus: Option<u32>,
    /// Memory configuration (in bytes)
    #[serde(skip_serializing_if = "Option::is_none")]
    pub memory: Option<u64>,
    /// Disk configuration
    #[serde(skip_serializing_if = "Option::is_none")]
    pub disk: Option<String>,
    /// SSH configuration
    #[serde(skip_serializing_if = "Option::is_none")]
    pub ssh: Option<SshConfig>,
}

/// Mount configuration
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Mount {
    /// Mount point location (optional, defaults to inferred)
    #[serde(skip_serializing_if = "Option::is_none")]
    pub location: Option<String>,
    /// Mount point on the host
    #[serde(rename = "mountPoint", skip_serializing_if = "Option::is_none")]
    pub mount_point: Option<String>,
    /// Whether mount is writable
    #[serde(skip_serializing_if = "Option::is_none")]
    pub writable: Option<bool>,
    /// SSHFS mount options
    #[serde(skip_serializing_if = "Option::is_none")]
    pub sshfs: Option<SshfsConfig>,
    /// 9p mount options
    #[serde(skip_serializing_if = "Option::is_none")]
    pub ninep: Option<NinePConfig>,
}

/// SSHFS mount configuration
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SshfsConfig {
    /// Cache write operations
    #[serde(skip_serializing_if = "Option::is_none")]
    pub cache: Option<bool>,
    /// Follow symlinks on host
    #[serde(skip_serializing_if = "Option::is_none")]
    pub follow_symlinks: Option<bool>,
    /// SFTP read buffer size
    #[serde(skip_serializing_if = "Option::is_none")]
    pub sftp_read_dirs: Option<bool>,
}

/// 9p mount configuration
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct NinePConfig {
    /// Security model
    #[serde(skip_serializing_if = "Option::is_none")]
    pub security_model: Option<String>,
    /// Protocol version
    #[serde(skip_serializing_if = "Option::is_none")]
    pub protocol_version: Option<String>,
    /// Cache size
    #[serde(skip_serializing_if = "Option::is_none")]
    pub msize: Option<u32>,
    /// Number of threads
    #[serde(skip_serializing_if = "Option::is_none")]
    pub cache_size: Option<u32>,
    /// I/O size
    #[serde(skip_serializing_if = "Option::is_none")]
    pub io_size: Option<u32>,
}

/// Containerd configuration
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ContainerdConfig {
    /// Whether to install system-wide containerd
    pub system: bool,
    /// Whether to configure user-specific containerd
    pub user: bool,
}

/// Provisioning configuration
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Provision {
    /// Provision mode: "system", "user", or "dependency"
    pub mode: String,
    /// Provisioning script
    pub script: String,
}

/// Health probe configuration
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Probe {
    /// Probe description
    pub description: String,
    /// Probe script to execute
    pub script: String,
    /// Hint to display if probe fails
    #[serde(skip_serializing_if = "Option::is_none")]
    pub hint: Option<String>,
}

/// File copy from guest to host
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CopyToHost {
    /// Path in the guest VM
    pub guest: String,
    /// Path on the host (may contain template variables)
    pub host: String,
    /// Whether to delete file on VM stop
    #[serde(rename = "deleteOnStop", skip_serializing_if = "Option::is_none")]
    pub delete_on_stop: Option<bool>,
}

/// File copy from host to guest
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CopyFromHost {
    /// Path on the host
    pub host: String,
    /// Path in the guest VM
    pub guest: String,
}

/// Network configuration
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Network {
    /// Network name
    pub name: String,
    /// VNL (Virtual Network Link) configuration
    #[serde(skip_serializing_if = "Option::is_none")]
    pub vnl: Option<String>,
    /// Switch name
    #[serde(skip_serializing_if = "Option::is_none")]
    pub switch: Option<String>,
}

/// Port forwarding configuration
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PortForward {
    /// Guest port
    #[serde(skip_serializing_if = "Option::is_none")]
    pub guest: Option<u32>,
    /// Host port
    #[serde(skip_serializing_if = "Option::is_none")]
    pub host: Option<u32>,
    /// Guest IP address
    #[serde(rename = "guestIP", skip_serializing_if = "Option::is_none")]
    pub guest_ip: Option<String>,
    /// Host IP address
    #[serde(rename = "hostIP", skip_serializing_if = "Option::is_none")]
    pub host_ip: Option<String>,
    /// Protocol (tcp/udp)
    #[serde(skip_serializing_if = "Option::is_none")]
    pub proto: Option<String>,
    /// Whether to ignore (skip) this port forward
    #[serde(skip_serializing_if = "Option::is_none")]
    pub ignore: Option<bool>,
    /// Reverse port forward (from guest to host)
    #[serde(skip_serializing_if = "Option::is_none")]
    pub reverse: Option<bool>,
}

/// DNS configuration
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DnsConfig {
    /// List of DNS servers
    #[serde(skip_serializing_if = "skip_vec_none")]
    pub addresses: Option<Vec<String>>,
}

/// SSH configuration
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SshConfig {
    /// Local SSH port
    #[serde(rename = "localPort", skip_serializing_if = "Option::is_none")]
    pub local_port: Option<u32>,
    /// Load dot SSH config
    #[serde(rename = "loadDotSSH", skip_serializing_if = "Option::is_none")]
    pub load_dot_ssh: Option<bool>,
    /// Forward SSH agent
    #[serde(rename = "forwardAgent", skip_serializing_if = "Option::is_none")]
    pub forward_agent: Option<bool>,
    /// Forward X11
    #[serde(rename = "forwardX11", skip_serializing_if = "Option::is_none")]
    pub forward_x11: Option<bool>,
}

/// Template variables that can be substituted in the config
#[derive(Debug, Clone)]
pub struct TemplateVars {
    /// Instance directory
    pub dir: String,
    /// User home directory
    pub home: String,
    /// Username
    pub user: String,
}

impl Default for LimaConfig {
    fn default() -> Self {
        Self {
            minimum_lima_version: None,
            name: None,
            base: "template://_images/ubuntu-lts".to_string(),
            mounts: Some(vec![]),
            networks: Some(vec![]),
            port_forwards: Some(vec![]),
            containerd: Some(ContainerdConfig {
                system: true,
                user: false,
            }),
            dns: None,
            env: None,
            provision: Some(vec![]),
            probes: Some(vec![]),
            copy_to_host: Some(vec![]),
            copy_from_host: Some(vec![]),
            message: None,
            cpus: None,
            memory: None,
            disk: None,
            ssh: None,
        }
    }
}

impl LimaConfig {
    /// Create a new Lima config with default values
    #[allow(dead_code)]
    pub fn new() -> Self {
        Self::default()
    }

    /// Substitute template variables in the configuration
    pub fn substitute_variables(&mut self, vars: &TemplateVars) {
        // Substitute in copyToHost paths
        if let Some(copy_to_host) = &mut self.copy_to_host {
            for copy in copy_to_host {
                copy.host = copy.host.replace("{{.Dir}}", &vars.dir);
                copy.host = copy.host.replace("{{.Home}}", &vars.home);
                copy.host = copy.host.replace("{{.User}}", &vars.user);
            }
        }

        // Substitute in copyFromHost paths
        if let Some(copy_from_host) = &mut self.copy_from_host {
            for copy in copy_from_host {
                copy.host = copy.host.replace("{{.Dir}}", &vars.dir);
                copy.host = copy.host.replace("{{.Home}}", &vars.home);
                copy.host = copy.host.replace("{{.User}}", &vars.user);
            }
        }

        // Substitute in message
        if let Some(message) = &mut self.message {
            *message = message.replace("{{.Dir}}", &vars.dir);
            *message = message.replace("{{.Home}}", &vars.home);
            *message = message.replace("{{.User}}", &vars.user);
        }
    }

    /// Read YAML content and parse into LimaConfig
    pub fn from_yaml(content: &str) -> Result<Self, serde_yml::Error> {
        serde_yml::from_str(content)
    }

    /// Convert LimaConfig to YAML string
    #[allow(dead_code)]
    pub fn to_yaml(&self) -> Result<String, serde_yml::Error> {
        serde_yml::to_string(self)
    }

    /// Convert LimaConfig to pretty YAML string
    pub fn to_yaml_pretty(&self) -> Result<String, serde_yml::Error> {
        serde_yml::to_string(self)
    }
}

