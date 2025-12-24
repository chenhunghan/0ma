use std::fs;
use std::path::PathBuf;
use std::process::Command;
use std::collections::HashMap;
use std::time::{SystemTime, UNIX_EPOCH};    
use tauri::{AppHandle, Manager};
use serde::{Deserialize, Serialize};
use crate::find_lima_executable;

/// Instance registry to track ZeroMa-managed instances
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct InstanceInfo {
    pub name: String,
    // Timestamps as Unix epoch milliseconds (as strings)
    pub created_at: String,
    pub updated_at: Option<String>,
    pub config_path: String,
    pub status: Option<String>,
}

impl InstanceInfo {
    pub fn new(name: String, config_path: String) -> Self {
        let timestamp = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .unwrap_or_default()
            .as_millis();
        Self {
            name,
            created_at: timestamp.to_string(),
            updated_at: None,
            config_path,
            status: None,
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
fn load_instance_registry(app: &AppHandle) -> Result<HashMap<String, InstanceInfo>, String> {
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
fn save_instance_registry(app: &AppHandle, registry: &HashMap<String, InstanceInfo>) -> Result<(), String> {
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
pub(crate) fn register_instance(app: &AppHandle, instance_info: InstanceInfo) -> Result<(), String> {
    let mut registry = load_instance_registry(app)?;
    registry.insert(instance_info.name.clone(), instance_info);
    save_instance_registry(app, &registry)
}

/// Unregister an instance
pub(crate) fn unregister_instance(app: &AppHandle, instance_name: &str) -> Result<(), String> {
    let mut registry = load_instance_registry(app)?;
    registry.remove(instance_name);
    save_instance_registry(app, &registry)
}

/// Get the status of a specific Lima instance
fn get_instance_status(instance_name: &str) -> Result<String, String> {
    let lima_cmd = find_lima_executable()
        .ok_or_else(|| "Lima (limactl) not found. Please ensure lima is installed.".to_string())?;
    
    let output = Command::new(&lima_cmd)
        .args(["list", "--format", "{{.Status}}", instance_name])
        .output()
        .map_err(|e| format!("Failed to run limactl list: {}", e))?;

    if output.status.success() {
        let status = String::from_utf8_lossy(&output.stdout).trim().to_string();
        Ok(if status.is_empty() { "Unknown".to_string() } else { status.to_string() })
    } else {
        // If command fails with non-zero exit, instance doesn't exist
        Err(format!("Instance '{}' not found", instance_name))
    }
}

/// Get all registered ZeroMa instances with their current status
/// Also cleans up instances that no longer exist in Lima
#[tauri::command]
pub async fn get_registered_instances(app: AppHandle) -> Result<Vec<InstanceInfo>, String> {
    let registry = load_instance_registry(&app)?;

    // Check each instance and update status
    let mut instances_with_status: Vec<InstanceInfo> = Vec::new();
    let mut updated_registry: HashMap<String, InstanceInfo> = HashMap::new();

    for (name, mut instance) in registry {
        match get_instance_status(&name) {
            Ok(status) => {
                instance.status = Some(status);
                // Update timestamp when status is updated
                let timestamp = SystemTime::now()
                    .duration_since(UNIX_EPOCH)
                    .unwrap_or_default()
                    .as_millis();
                instance.updated_at = Some(timestamp.to_string());
                instances_with_status.push(instance.clone());
                updated_registry.insert(name, instance);
            }
            Err(_) => {
                // Instance doesn't exist in Lima anymore - skip it
            }
        }
    }

    // Save the cleaned registry
    save_instance_registry(&app, &updated_registry)?;

    Ok(instances_with_status)
}

/// Check if an instance is registered
#[tauri::command]
pub async fn is_instance_registered(app: AppHandle, instance_name: String) -> Result<bool, String> {
    let registry = load_instance_registry(&app)?;
    Ok(registry.contains_key(&instance_name))
}
