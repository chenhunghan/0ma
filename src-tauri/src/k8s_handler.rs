use crate::k8s_service::{get_k8s_pods, get_k8s_services, Pod, Service};

#[tauri::command]
pub async fn get_k8s_pods_cmd(instance_name: String) -> Result<Vec<Pod>, String> {
    get_k8s_pods(&instance_name).map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn get_k8s_services_cmd(instance_name: String) -> Result<Vec<Service>, String> {
    get_k8s_services(&instance_name).map_err(|e| e.to_string())
}
