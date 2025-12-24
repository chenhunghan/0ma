use tauri::AppHandle;
use crate::instance_registry_service::{
    InstanceInfo,
    load_instance_registry,
    sync_registry_from_lima,
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
