use tauri::AppHandle;
use crate::instance_registry_service::{
    InstanceInfo,
    DiskUsage,
    load_instance_registry,
    sync_registry_from_lima,
    get_disk_usage,
};

/// Get all registered ZeroMa instances with their current status
/// Syncs the registry from limactl list --json (the source of truth)
#[tauri::command]
pub async fn get_registered_instances_cmd(app: AppHandle) -> Result<Vec<InstanceInfo>, String> {
    // Sync registry from limactl
    let registry = sync_registry_from_lima(&app)?;

    // Convert to sorted vector
    let mut instances: Vec<InstanceInfo> = registry.into_values().collect();
    instances.sort_by(|a, b| a.name.cmp(&b.name));

    Ok(instances)
}

/// Check if an instance is registered
#[tauri::command]
pub async fn is_instance_registered_cmd(app: AppHandle, instance_name: String) -> Result<bool, String> {
    let registry = load_instance_registry(&app)?;
    Ok(registry.contains_key(&instance_name))
}

/// Get disk usage for a Lima instance
#[tauri::command]
pub async fn get_instance_disk_usage_cmd(instance_name: String) -> Result<DiskUsage, String> {
    get_disk_usage(&instance_name)
}
