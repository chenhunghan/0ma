use crate::instance_registry_service::{
    get_all_lima_instances, get_disk_usage, DiskUsage, LimaInstance,
};
use tauri::AppHandle;

/// Get all registered ZeroMa instances with their current status
/// Returns instances directly from limactl list --json (the source of truth)
#[tauri::command]
pub async fn get_all_lima_instances_cmd(_app: AppHandle) -> Result<Vec<LimaInstance>, String> {
    // Get instances from limactl (source of truth)
    let instances = get_all_lima_instances().await?;

    Ok(instances)
}

/// Check if an instance is registered
#[tauri::command]
pub async fn is_instance_registered_cmd(
    _app: AppHandle,
    instance_name: String,
) -> Result<bool, String> {
    let instances = get_all_lima_instances().await?;
    Ok(instances.iter().any(|inst| inst.name == instance_name))
}

/// Get disk usage for a Lima instance
#[tauri::command]
pub async fn get_instance_disk_usage_cmd(instance_name: String) -> Result<DiskUsage, String> {
    get_disk_usage(&instance_name).await
}

/// Get the internal IP address of a Lima instance
#[tauri::command]
pub async fn get_instance_ip_cmd(instance_name: String) -> Result<String, String> {
    crate::instance_registry_service::get_instance_ip(&instance_name).await
}
