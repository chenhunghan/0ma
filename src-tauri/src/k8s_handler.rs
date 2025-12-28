use crate::k8s_service::{get_k8s_pods, Pod};

#[tauri::command]
pub async fn get_k8s_pods_cmd(instance_name: String) -> Result<Vec<Pod>, String> {
    get_k8s_pods(&instance_name).map_err(|e| e.to_string())
}
