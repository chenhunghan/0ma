use serde::{Deserialize, Serialize};

/// Helper function to skip serializing empty Vec<Option> fields
fn skip_vec_none<T>(vec: &Option<Vec<T>>) -> bool {
    match vec {
        Some(v) => v.is_empty(),
        None => true,
    }
}

/// Image configuration
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Image {
    /// Image location (URL or file path)
    pub location: String,
    /// Architecture (e.g., "aarch64", "x86_64")
    #[serde(skip_serializing_if = "Option::is_none")]
    pub arch: Option<String>,
    /// Digest for image verification
    #[serde(skip_serializing_if = "Option::is_none")]
    pub digest: Option<String>,
}

/// Represents a complete Lima configuration file
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LimaConfig {
    /// Minimum version of Lima required
    #[serde(rename = "minimumLimaVersion", skip_serializing_if = "Option::is_none")]
    pub minimum_lima_version: Option<String>,
    /// VM type (e.g., "vz", "qemu")
    #[serde(rename = "vmType", skip_serializing_if = "Option::is_none")]
    pub vm_type: Option<String>,
    /// Image configurations
    #[serde(skip_serializing_if = "skip_vec_none")]
    pub images: Option<Vec<Image>>,
    /// Mount points configuration
    #[serde(skip_serializing_if = "skip_vec_none")]
    pub mounts: Option<Vec<Mount>>,
    /// Containerd configuration
    #[serde(skip_serializing_if = "Option::is_none")]
    pub containerd: Option<ContainerdConfig>,
    /// Provisioning scripts
    #[serde(skip_serializing_if = "skip_vec_none")]
    pub provision: Option<Vec<Provision>>,
    /// Health probes
    #[serde(skip_serializing_if = "skip_vec_none")]
    pub probes: Option<Vec<Probe>>,
    /// Files to copy from guest to host
    #[serde(skip_serializing_if = "skip_vec_none")]
    pub copy_to_host: Option<Vec<CopyToHost>>,
    /// CPU configuration
    #[serde(skip_serializing_if = "Option::is_none")]
    pub cpus: Option<u32>,
    /// Memory configuration (e.g., "4GiB", "8GB")
    #[serde(skip_serializing_if = "Option::is_none")]
    pub memory: Option<String>,
    /// Disk configuration
    #[serde(skip_serializing_if = "Option::is_none")]
    pub disk: Option<String>,
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
            vm_type: None,
            images: Some(vec![]),
            mounts: Some(vec![]),
            containerd: Some(ContainerdConfig {
                system: false,
                user: false,
            }),
            provision: Some(vec![]),
            probes: Some(vec![]),
            copy_to_host: Some(vec![]),
            cpus: None,
            memory: None,
            disk: None,
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

