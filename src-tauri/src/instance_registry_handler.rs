use std::collections::HashMap;
use std::time::{SystemTime, UNIX_EPOCH};
use tauri::AppHandle;
use crate::instance_registry_service::{
    InstanceInfo,
    load_instance_registry,
    save_instance_registry,
    get_instance_status,
};

/// Get all registered ZeroMa instances with their current status
/// Also cleans up instances that no longer exist in Lima
#[tauri::command]
pub async fn get_registered_instances_cmd(app: AppHandle) -> Result<Vec<InstanceInfo>, String> {
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
pub async fn is_instance_registered_cmd(app: AppHandle, instance_name: String) -> Result<bool, String> {
    let registry = load_instance_registry(&app)?;
    Ok(registry.contains_key(&instance_name))
}
