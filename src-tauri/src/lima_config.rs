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
    /// Minimum version of Lima required (e.g., "2.0.0")
    #[serde(rename = "minimumLimaVersion", skip_serializing_if = "Option::is_none")]
    pub minimum_lima_version: Option<String>,
    /// VM type (e.g., "vz", "qemu", "krunkit")
    #[serde(rename = "vmType", skip_serializing_if = "Option::is_none")]
    pub vm_type: Option<String>,
    /// CPU configuration (e.g., 4)
    #[serde(skip_serializing_if = "Option::is_none")]
    pub cpus: Option<u32>,
    /// Memory configuration (e.g., "4GiB", "8GB")
    #[serde(skip_serializing_if = "Option::is_none")]
    pub memory: Option<String>,
    /// Disk configuration (e.g., "100GiB", "50GiB")
    #[serde(skip_serializing_if = "Option::is_none")]
    pub disk: Option<String>,
    /// Image configurations
    /// e.g.
    /// - location: "https://cloud-images.ubuntu.com/releases/noble/release/ubuntu-24.04-server-cloudimg-arm64.img"
    ///   arch: "aarch64"
    #[serde(skip_serializing_if = "skip_vec_none")]
    pub images: Option<Vec<Image>>,
    /// Mount points configuration
    /// e.g.
    /// - location: "~"
    ///   mountPoint: "/mnt/shared"
    ///   writable: true
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
    #[serde(rename = "copyToHost", skip_serializing_if = "skip_vec_none")]
    pub copy_to_host: Option<Vec<CopyToHost>>,

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

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_lima_config_all_fields_mutation_and_serialization() {
        // Create a new config with all fields populated
        let mut config = LimaConfig {
            minimum_lima_version: Some("2.0.0".to_string()),
            vm_type: Some("vz".to_string()),
            images: Some(vec![Image {
                location: "https://cloud-images.ubuntu.com/releases/noble/release/ubuntu-24.04-server-cloudimg-arm64.img".to_string(),
                arch: Some("aarch64".to_string()),
                digest: Some("sha256:1234567890".to_string()),
            }]),
            cpus: Some(4),
            memory: Some("4GiB".to_string()),
            disk: Some("100GiB".to_string()),
            mounts: Some(vec![Mount {
                location: Some("/tmp/lima".to_string()),
                mount_point: Some("/mnt/shared".to_string()),
                writable: Some(true),
                sshfs: Some(SshfsConfig {
                    cache: Some(true),
                    follow_symlinks: Some(false),
                    sftp_read_dirs: Some(true),
                }),
                ninep: None,
            }]),
            containerd: Some(ContainerdConfig {
                system: false,
                user: false,
            }),
            provision: Some(vec![Provision {
                mode: "system".to_string(),
                script: "#!/bin/bash\necho 'Hello World'".to_string(),
            }]),
            probes: Some(vec![Probe {
                description: "k0s to be running".to_string(),
                script: "#!/bin/bash\ntest -f /var/lib/k0s/pki/admin.conf".to_string(),
                hint: Some("Check k0s logs".to_string()),
            }]),
            copy_to_host: Some(vec![CopyToHost {
                guest: "/var/lib/k0s/pki/admin.conf".to_string(),
                host: "{{.Dir}}/copied-from-guest/kubeconfig.yaml".to_string(),
                delete_on_stop: Some(true),
            }]),
        };

        // Mutate all fields
        config.minimum_lima_version = Some("2.1.0".to_string());
        config.vm_type = Some("qemu".to_string());
        config.cpus = Some(8);
        config.memory = Some("8GiB".to_string());
        config.disk = Some("200GiB".to_string());

        // Update images
        if let Some(ref mut images) = config.images {
            images[0].arch = Some("x86_64".to_string());
        }

        // Update mounts
        if let Some(ref mut mounts) = config.mounts {
            mounts[0].writable = Some(false);
        }

        // Update containerd
        config.containerd = Some(ContainerdConfig {
            system: true,
            user: true,
        });

        // Update provision
        if let Some(ref mut provision) = config.provision {
            provision[0].script = "#!/bin/bash\necho 'Updated Script'".to_string();
        }

        // Update probes
        if let Some(ref mut probes) = config.probes {
            probes[0].hint = Some("Updated hint".to_string());
        }

        // Update copy_to_host
        if let Some(ref mut copy_to_host) = config.copy_to_host {
            copy_to_host[0].delete_on_stop = Some(false);
        }

        // Serialize to YAML
        let yaml = config.to_yaml().expect("Failed to serialize to YAML");
        
        // Verify YAML is valid and can be deserialized
        let deserialized: LimaConfig = LimaConfig::from_yaml(&yaml).expect("Failed to deserialize YAML");

        // Assert all mutated values are as expected
        assert_eq!(deserialized.minimum_lima_version, Some("2.1.0".to_string()));
        assert_eq!(deserialized.vm_type, Some("qemu".to_string()));
        assert_eq!(deserialized.cpus, Some(8));
        assert_eq!(deserialized.memory, Some("8GiB".to_string()));
        assert_eq!(deserialized.disk, Some("200GiB".to_string()));

        // Verify nested fields
        assert!(deserialized.images.is_some());
        let images = deserialized.images.unwrap();
        assert_eq!(images[0].arch, Some("x86_64".to_string()));

        assert!(deserialized.mounts.is_some());
        let mounts = deserialized.mounts.unwrap();
        assert_eq!(mounts[0].writable, Some(false));

        assert!(deserialized.containerd.is_some());
        let containerd = deserialized.containerd.unwrap();
        assert_eq!(containerd.system, true);
        assert_eq!(containerd.user, true);

        assert!(deserialized.provision.is_some());
        let provision = deserialized.provision.unwrap();
        assert_eq!(provision[0].script, "#!/bin/bash\necho 'Updated Script'");

        assert!(deserialized.probes.is_some());
        let probes = deserialized.probes.unwrap();
        assert_eq!(probes[0].hint, Some("Updated hint".to_string()));

        assert!(deserialized.copy_to_host.is_some());
        let copy_to_host = deserialized.copy_to_host.unwrap();
        assert_eq!(copy_to_host[0].delete_on_stop, Some(false));
    }

    #[test]
    fn test_lima_config_from_yaml_to_yaml() {
        let yaml_input = r#"
vmType: "vz"
cpus: 4
memory: "4GiB"
disk: "100GiB"
images:
- location: https://cloud-images.ubuntu.com/releases/noble/release/ubuntu-24.04-server-cloudimg-arm64.img
  arch: aarch64
mounts: []
containerd:
  system: false
  user: false
minimumLimaVersion: 2.0.0
copyToHost:
- guest: "/var/lib/k0s/pki/admin.conf"
  host: "{{.Dir}}/copied-from-guest/kubeconfig.yaml"
  deleteOnStop: true
provision:
- mode: system
  script: |
    #!/bin/bash
    set -eux -o pipefail
    command -v k0s >/dev/null 2>&1 && exit 0
    curl -sfL https://get.k0s.sh | sh
probes:
- description: "k0s to be running"
  script: |
    #!/bin/bash
    set -eux -o pipefail
    timeout 30s bash -c "until sudo test -f /var/lib/k0s/pki/admin.conf; do sleep 3; done"
  hint: |
    The k0s control plane is not ready yet.
"#;

        // Parse from YAML
        let config = LimaConfig::from_yaml(yaml_input).expect("Failed to parse YAML");
        
        println!("Parsed config - copy_to_host: {:?}", config.copy_to_host);

        // Verify all fields
        assert_eq!(config.vm_type, Some("vz".to_string()));
        assert_eq!(config.cpus, Some(4));
        assert_eq!(config.memory, Some("4GiB".to_string()));
        assert_eq!(config.disk, Some("100GiB".to_string()));
        assert_eq!(config.minimum_lima_version, Some("2.0.0".to_string()));

        // Verify images
        assert!(config.images.is_some());
        let images = config.images.as_ref().unwrap();
        assert_eq!(images.len(), 1);
        assert_eq!(images[0].arch, Some("aarch64".to_string()));

        // Verify containerd
        assert!(config.containerd.is_some());
        let containerd = config.containerd.as_ref().unwrap();
        assert_eq!(containerd.system, false);
        assert_eq!(containerd.user, false);

        // Verify provision
        assert!(config.provision.is_some());
        let provision = config.provision.as_ref().unwrap();
        assert_eq!(provision.len(), 1);
        assert_eq!(provision[0].mode, "system");

        // Verify probes
        assert!(config.probes.is_some());
        let probes = config.probes.as_ref().unwrap();
        assert_eq!(probes.len(), 1);
        assert_eq!(probes[0].description, "k0s to be running");

        // Verify copy_to_host
        assert!(config.copy_to_host.is_some(), "copy_to_host should be Some after parsing");
        let copy_to_host = config.copy_to_host.as_ref().unwrap();
        assert_eq!(copy_to_host.len(), 1);
        assert_eq!(copy_to_host[0].guest, "/var/lib/k0s/pki/admin.conf");
        assert_eq!(copy_to_host[0].delete_on_stop, Some(true));

        // Serialize back to YAML
        let yaml_output = config.to_yaml().expect("Failed to serialize to YAML");
        println!("Serialized YAML:\n{}", yaml_output);

        // Parse again to ensure round-trip works
        let config2 = LimaConfig::from_yaml(&yaml_output).expect("Failed to parse round-trip YAML");
        assert_eq!(config2.vm_type, config.vm_type);
        assert_eq!(config2.cpus, config.cpus);
        assert_eq!(config2.memory, config.memory);
    }

    #[test]
    fn test_substitute_variables() {
        let mut config = LimaConfig {
            minimum_lima_version: None,
            vm_type: None,
            images: None,
            cpus: None,
            memory: None,
            disk: None,
            mounts: None,
            containerd: None,
            provision: None,
            probes: None,
            copy_to_host: Some(vec![CopyToHost {
                guest: "/var/lib/k0s/pki/admin.conf".to_string(),
                host: "{{.Dir}}/copied-from-guest/kubeconfig.yaml".to_string(),
                delete_on_stop: Some(true),
            }]),
        };

        let vars = TemplateVars {
            dir: "/home/user/.lima/instance".to_string(),
            home: "/home/user".to_string(),
            user: "testuser".to_string(),
        };

        config.substitute_variables(&vars);

        // Verify substitution
        let copy_to_host = config.copy_to_host.as_ref().unwrap();
        assert_eq!(
            copy_to_host[0].host,
            "/home/user/.lima/instance/copied-from-guest/kubeconfig.yaml"
        );
    }

    #[test]
    fn test_mount_with_sshfs_config() {
        let mount = Mount {
            location: Some("/tmp/lima".to_string()),
            mount_point: Some("/mnt/shared".to_string()),
            writable: Some(true),
            sshfs: Some(SshfsConfig {
                cache: Some(true),
                follow_symlinks: Some(false),
                sftp_read_dirs: Some(true),
            }),
            ninep: None,
        };

        let mut config = LimaConfig::default();
        config.mounts = Some(vec![mount]);

        let yaml = config.to_yaml().expect("Failed to serialize");
        let parsed = LimaConfig::from_yaml(&yaml).expect("Failed to parse");

        let mounts = parsed.mounts.unwrap();
        assert_eq!(mounts[0].location, Some("/tmp/lima".to_string()));
        assert_eq!(mounts[0].writable, Some(true));
        assert!(mounts[0].sshfs.is_some());
        let sshfs = mounts[0].sshfs.as_ref().unwrap();
        assert_eq!(sshfs.cache, Some(true));
    }

    #[test]
    fn test_mount_with_ninep_config() {
        let mount = Mount {
            location: Some("/tmp/lima".to_string()),
            mount_point: Some("/mnt/shared".to_string()),
            writable: Some(true),
            sshfs: None,
            ninep: Some(NinePConfig {
                security_model: Some("mapped-xattr".to_string()),
                protocol_version: Some("9p2000.L".to_string()),
                msize: Some(8192),
                cache_size: Some(1024),
                io_size: Some(4096),
            }),
        };

        let mut config = LimaConfig::default();
        config.mounts = Some(vec![mount]);

        let yaml = config.to_yaml().expect("Failed to serialize");
        let parsed = LimaConfig::from_yaml(&yaml).expect("Failed to parse");

        let mounts = parsed.mounts.unwrap();
        assert!(mounts[0].ninep.is_some());
        let ninep = mounts[0].ninep.as_ref().unwrap();
        assert_eq!(ninep.security_model, Some("mapped-xattr".to_string()));
        assert_eq!(ninep.msize, Some(8192));
    }

    #[test]
    fn test_empty_optional_fields_are_skipped() {
        let config = LimaConfig {
            minimum_lima_version: None,
            vm_type: Some("vz".to_string()),
            images: Some(vec![]),
            cpus: Some(4),
            memory: None,
            disk: None,
            mounts: Some(vec![]),
            containerd: None,
            provision: Some(vec![]),
            probes: Some(vec![]),
            copy_to_host: Some(vec![]),
        };

        let yaml = config.to_yaml().expect("Failed to serialize");
        
        // Empty vecs should not appear in YAML
        assert!(!yaml.contains("images: []"));
        assert!(!yaml.contains("mounts: []"));
        assert!(!yaml.contains("provision: []"));
        assert!(!yaml.contains("probes: []"));
        assert!(!yaml.contains("copyToHost: []"));
        
        // Fields with values should appear
        assert!(yaml.contains("vmType: vz"));
        assert!(yaml.contains("cpus: 4"));
    }

    #[test]
    fn test_default_lima_config() {
        let config = LimaConfig::default();
        
        assert_eq!(config.minimum_lima_version, None);
        assert_eq!(config.vm_type, None);
        assert!(config.images.is_some());
        assert!(config.mounts.is_some());
        assert!(config.containerd.is_some());
        assert!(config.provision.is_some());
        assert!(config.probes.is_some());
        assert!(config.copy_to_host.is_some());
        assert_eq!(config.cpus, None);
        assert_eq!(config.memory, None);
        assert_eq!(config.disk, None);
    }
}

