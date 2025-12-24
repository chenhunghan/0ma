use std::fs;
use std::path::PathBuf;
use std::process::Command;
use std::collections::HashMap;
use std::time::{SystemTime, UNIX_EPOCH};
use tauri::{AppHandle, Manager};
use serde::{Deserialize, Serialize};
use crate::find_lima_executable;
use crate::lima_config::LimaConfig;

/// Instance registry to track ZeroMa-managed instances
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct InstanceInfo {
    pub name: String,
    // Timestamps as Unix epoch milliseconds (as strings)
    pub created_at: String,
    pub updated_at: Option<String>,
    pub status: Option<String>,
    /// Full Lima configuration read from limactl list --json
    #[serde(skip_serializing_if = "Option::is_none")]
    pub config: Option<LimaConfig>,
}

/// Lima instance structure from limactl list --json
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LimaInstance {
    pub name: String,
    pub status: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub config: Option<LimaConfig>,
    // We can add more fields as needed
}

/// Disk usage information
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DiskUsage {
    pub total: String,
    pub used: String,
    pub available: String,
    pub use_percent: String,
}

impl InstanceInfo {
    pub fn new(name: String) -> Self {
        let timestamp = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .unwrap_or_default()
            .as_millis();
        Self {
            name,
            created_at: timestamp.to_string(),
            updated_at: None,
            status: None,
            config: None,
        }
    }
}

/// Get the path to the instance registry file
fn get_instance_registry_path(app: &AppHandle) -> Result<PathBuf, String> {
    let app_data_dir = app
        .path()
        .app_data_dir()
        .map_err(|e| format!("Failed to get app data directory: {}", e))?;

    Ok(app_data_dir.join("instances.json"))
}

/// Load the instance registry
pub fn load_instance_registry(app: &AppHandle) -> Result<HashMap<String, InstanceInfo>, String> {
    let registry_path = get_instance_registry_path(app)?;

    if registry_path.exists() {
        let content = fs::read_to_string(&registry_path)
            .map_err(|e| format!("Failed to read instance registry: {}", e))?;
        serde_json::from_str(&content)
            .map_err(|e| format!("Failed to parse instance registry: {}", e))
    } else {
        Ok(HashMap::new())
    }
}

/// Save the instance registry
pub fn save_instance_registry(app: &AppHandle, registry: &HashMap<String, InstanceInfo>) -> Result<(), String> {
    let registry_path = get_instance_registry_path(app)?;

    // Ensure parent directory exists
    if let Some(parent) = registry_path.parent() {
        fs::create_dir_all(parent)
            .map_err(|e| format!("Failed to create instance registry directory: {}", e))?;
    }

    let content = serde_json::to_string_pretty(registry)
        .map_err(|e| format!("Failed to serialize instance registry: {}", e))?;

    fs::write(&registry_path, content)
        .map_err(|e| format!("Failed to write instance registry: {}", e))
}

/// Register a new instance
pub fn register_instance(app: &AppHandle, instance_info: InstanceInfo) -> Result<(), String> {
    let mut registry = load_instance_registry(app)?;
    registry.insert(instance_info.name.clone(), instance_info);
    save_instance_registry(app, &registry)
}

/// Unregister an instance
pub fn unregister_instance(app: &AppHandle, instance_name: &str) -> Result<(), String> {
    let mut registry = load_instance_registry(app)?;
    registry.remove(instance_name);
    save_instance_registry(app, &registry)
}

/// Get all Lima instances from limactl list --json
fn get_lima_instances() -> Result<Vec<LimaInstance>, String> {
    let lima_cmd = find_lima_executable()
        .ok_or_else(|| "Lima (limactl) not found. Please ensure lima is installed.".to_string())?;
    
    let output = Command::new(&lima_cmd)
        .args(["list", "--format", "json"])
        .output()
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
        match serde_json::from_str::<LimaInstance>(line) {
            Ok(instance) => instances.push(instance),
            Err(e) => {
                eprintln!("Warning: Failed to parse Lima instance JSON: {}", e);
                continue;
            }
        }
    }
    
    Ok(instances)
}

/// Sync the registry from limactl list (source of truth)
/// This function:
/// 1. Gets all instances from limactl list --json
/// 2. Updates existing instances with current status
/// 3. Removes instances that no longer exist
/// 4. Adds new instances that aren't in the registry yet (if they exist in Lima)
pub fn sync_registry_from_lima(app: &AppHandle) -> Result<HashMap<String, InstanceInfo>, String> {
    let mut registry = load_instance_registry(app)?;
    let lima_instances = get_lima_instances()?;
    
    // Create a map of Lima instances for quick lookup
    let lima_map: HashMap<String, LimaInstance> = lima_instances
        .into_iter()
        .map(|inst| (inst.name.clone(), inst))
        .collect();
    
    let timestamp = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap_or_default()
        .as_millis()
        .to_string();
    
    // Update existing instances and remove ones that no longer exist
    registry.retain(|name, info| {
        if let Some(lima_inst) = lima_map.get(name) {
            info.status = Some(lima_inst.status.clone());
            info.config = lima_inst.config.clone();
            info.updated_at = Some(timestamp.clone());
            true
        } else {
            // Instance no longer exists in Lima, remove it
            false
        }
    });
    
    // Add new instances from Lima that aren't in our registry
    for (name, lima_inst) in lima_map {
        if !registry.contains_key(&name) {
            let mut info = InstanceInfo::new(name.clone());
            info.status = Some(lima_inst.status);
            info.config = lima_inst.config;
            info.updated_at = Some(timestamp.clone());
            registry.insert(name, info);
        }
    }
    
    // Save the updated registry
    save_instance_registry(app, &registry)?;
    
    Ok(registry)
}

/// Get disk usage for a Lima instance by running df inside the instance
pub fn get_disk_usage(instance_name: &str) -> Result<DiskUsage, String> {
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
            "/"
        ])
        .output()
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
        return Err(format!("Failed to parse disk usage: expected 4 columns, got {}", parts.len()));
    }

    Ok(DiskUsage {
        total: parts[0].to_string(),
        used: parts[1].to_string(),
        available: parts[2].to_string(),
        use_percent: parts[3].to_string(),
    })
}
