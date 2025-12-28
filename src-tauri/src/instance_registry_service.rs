use crate::find_lima_executable;
use crate::lima_config::LimaConfig;
use serde::{Deserialize, Serialize};
use tokio::process::Command;

/// Kubernetes information
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct K8sInfo {
    pub version: String,
    pub nodes: u32,
    pub pods: u32,
    pub services: u32,
    pub status: String, // 'Ready' | 'NotReady' | 'Unknown'
}

/// Lima instance structure from limactl list --json
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LimaInstance {
    pub name: String,
    pub status: String,
    pub cpus: u32,
    pub memory: String,
    pub disk: String,
    pub arch: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub version: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub k8s: Option<K8sInfo>,
}

/// Raw output from limactl list --json
#[derive(Debug, Clone, Serialize, Deserialize)]
struct LimaListOutput {
    name: String,
    status: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    config: Option<LimaConfig>,
    #[serde(skip_serializing_if = "Option::is_none")]
    dir: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    arch: Option<String>,
    #[serde(rename = "limaVersion", skip_serializing_if = "Option::is_none")]
    lima_version: Option<String>,
}

/// Disk usage information
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DiskUsage {
    pub total: String,
    pub used: String,
    pub available: String,
    pub use_percent: String,
}

/// Guest information (engine, etc)
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GuestInfo {
    pub engine: String,
}

/// Get all Lima instances from limactl list --json (async)
async fn get_lima_instances() -> Result<Vec<LimaInstance>, String> {
    let lima_cmd = find_lima_executable()
        .ok_or_else(|| "Lima (limactl) not found. Please ensure lima is installed.".to_string())?;

    let output = Command::new(&lima_cmd)
        .args(["list", "--format", "json"])
        .output()
        .await
        .map_err(|e| format!("Failed to run limactl list: {}", e))?;

    if !output.status.success() {
        let stderr = String::from_utf8_lossy(&output.stderr);
        return Err(format!("Failed to list Lima instances: {}", stderr));
    }

    let stdout = String::from_utf8_lossy(&output.stdout);
    let stdout = stdout.trim();

    if stdout.is_empty() {
        return Ok(vec![]);
    }

    // limactl list --format json returns newline-delimited JSON (NDJSON)
    // Each line is a separate JSON object representing one instance
    let mut instances = Vec::new();
    for line in stdout.lines() {
        let line = line.trim();
        if line.is_empty() {
            continue;
        }
        match serde_json::from_str::<LimaListOutput>(line) {
            Ok(raw) => {
                // Extract config only for metadata extraction
                let config = raw.config.as_ref();

                // Extract architecture
                let arch = raw.arch.unwrap_or_else(|| {
                    // Default to current system architecture
                    #[cfg(target_arch = "aarch64")]
                    {
                        "aarch64".to_string()
                    }
                    #[cfg(target_arch = "x86_64")]
                    {
                        "x86_64".to_string()
                    }
                });

                // Extract CPUs from config if available
                let cpus = config.and_then(|c| c.cpus).unwrap_or(0);

                // Extract memory from config (already has unit)
                let memory = config
                    .and_then(|c| c.memory.clone())
                    .unwrap_or_else(|| "-".to_string());

                // Extract disk from config (already has unit)
                let disk = config
                    .and_then(|c| c.disk.clone())
                    .unwrap_or_else(|| "-".to_string());

                let instance = LimaInstance {
                    name: raw.name,
                    status: raw.status,
                    cpus,
                    memory,
                    disk,
                    arch,
                    version: raw.lima_version,
                    k8s: None, // K8s info would need to be fetched separately
                };
                instances.push(instance);
            }
            Err(e) => {
                eprintln!("Warning: Failed to parse Lima instance JSON: {}", e);
                continue;
            }
        }
    }

    Ok(instances)
}

/// Get all Lima instances from limactl list --json (the source of truth)
pub async fn get_all_lima_instances() -> Result<Vec<LimaInstance>, String> {
    let mut instances = get_lima_instances().await?;

    // Sort instances by name
    instances.sort_by(|a, b| a.name.cmp(&b.name));

    Ok(instances)
}

/// Get disk usage for a Lima instance by running df inside the instance (async)
pub async fn get_disk_usage(instance_name: &str) -> Result<DiskUsage, String> {
    let lima_cmd = find_lima_executable()
        .ok_or_else(|| "Lima (limactl) not found. Please ensure lima is installed.".to_string())?;

    // Use --output for reliable parsing, avoiding locale and formatting issues
    // -BG ensures sizes are in gigabytes for consistency
    let output = Command::new(&lima_cmd)
        .args([
            "shell",
            instance_name,
            "df",
            "-BG",
            "--output=size,used,avail,pcent",
            "/",
        ])
        .output()
        .await
        .map_err(|e| format!("Failed to run df command: {}", e))?;

    if !output.status.success() {
        let stderr = String::from_utf8_lossy(&output.stderr);
        return Err(format!("Failed to get disk usage: {}", stderr));
    }

    let stdout = String::from_utf8_lossy(&output.stdout);
    // Parse df output, expecting two lines: header and data
    // Example output:
    //   Size  Used Avail Use%
    //    38G    3G   36G   6%
    let lines: Vec<&str> = stdout.lines().collect();

    if lines.len() < 2 {
        return Err(format!("Unexpected df output format: {}", stdout));
    }

    // Get the data line (skip header)
    let data_line = lines[1];
    let parts: Vec<&str> = data_line.split_whitespace().collect();

    if parts.len() < 4 {
        return Err(format!(
            "Failed to parse disk usage: expected 4 columns, got {}",
            parts.len()
        ));
    }

    Ok(DiskUsage {
        total: parts[0].to_string(),
        used: parts[1].to_string(),
        available: parts[2].to_string(),
        use_percent: parts[3].to_string(),
    })
}

/// Get the internal IP address of a Lima instance (async)
pub async fn get_instance_ip(instance_name: &str) -> Result<String, String> {
    let lima_cmd = find_lima_executable()
        .ok_or_else(|| "Lima (limactl) not found. Please ensure lima is installed.".to_string())?;

    let output = Command::new(&lima_cmd)
        .args(["shell", instance_name, "hostname", "-I"])
        .output()
        .await
        .map_err(|e| format!("Failed to run hostname command: {}", e))?;

    if !output.status.success() {
        let stderr = String::from_utf8_lossy(&output.stderr);
        return Err(format!("Failed to get instance IP: {}", stderr));
    }

    let stdout = String::from_utf8_lossy(&output.stdout);
    Ok(stdout.trim().to_string())
}

/// Get instance uptime (async)
pub async fn get_uptime(instance_name: &str) -> Result<String, String> {
    let lima_cmd = find_lima_executable()
        .ok_or_else(|| "Lima (limactl) not found. Please ensure lima is installed.".to_string())?;

    let output = Command::new(&lima_cmd)
        .args(["shell", instance_name, "uptime", "-p"])
        .output()
        .await
        .map_err(|e| format!("Failed to run uptime command: {}", e))?;

    if !output.status.success() {
        let stderr = String::from_utf8_lossy(&output.stderr);
        return Err(format!("Failed to get uptime: {}", stderr));
    }

    let stdout = String::from_utf8_lossy(&output.stdout);
    Ok(stdout.trim().replace("up ", "").to_string())
}

/// Get guest information like container engine
pub async fn get_guest_info(instance_name: &str) -> Result<GuestInfo, String> {
    let lima_cmd = find_lima_executable()
        .ok_or_else(|| "Lima (limactl) not found. Please ensure lima is installed.".to_string())?;

    // Check for common engines/orchestrators in order
    let engines = ["k0s", "nerdctl", "docker", "podman"];
    let mut detected_engine = "none".to_string();

    for engine in engines {
        let output = Command::new(&lima_cmd)
            .args(["shell", instance_name, "command", "-v", engine])
            .output()
            .await;

        if let Ok(out) = output {
            if out.status.success() {
                detected_engine = engine.to_string();
                break;
            }
        }
    }

    Ok(GuestInfo {
        engine: detected_engine,
    })
}
