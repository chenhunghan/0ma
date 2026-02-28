use crate::k8s_service::{check_k0s_available, get_k8s_pods, get_k8s_services, Pod, Service};

#[tauri::command]
pub async fn check_k0s_available_cmd(instance_name: String) -> Result<bool, String> {
    check_k0s_available(&instance_name)
}

#[tauri::command]
pub async fn get_k8s_pods_cmd(instance_name: String) -> Result<Vec<Pod>, String> {
    get_k8s_pods(&instance_name).map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn get_k8s_services_cmd(instance_name: String) -> Result<Vec<Service>, String> {
    get_k8s_services(&instance_name).map_err(|e| e.to_string())
}
