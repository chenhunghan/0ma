use crate::lima_config::LimaConfig;
use crate::lima_instance_service;
use tauri::AppHandle;

#[tauri::command]
pub async fn create_lima_instance_cmd(
    app: AppHandle,
    config: LimaConfig,
    instance_name: String,
) -> Result<String, String> {
    lima_instance_service::create_lima_instance(app, config, instance_name).await
}

#[tauri::command]
pub async fn start_lima_instance_cmd(
    app: AppHandle,
    instance_name: String,
) -> Result<String, String> {
    lima_instance_service::start_lima_instance(app, instance_name).await
}

#[tauri::command]
pub async fn stop_lima_instance_cmd(
    app: AppHandle,
    instance_name: String,
) -> Result<String, String> {
    lima_instance_service::stop_lima_instance(app, instance_name).await
}

#[tauri::command]
pub async fn delete_lima_instance_cmd(
    app: AppHandle,
    instance_name: String,
) -> Result<String, String> {
    lima_instance_service::delete_lima_instance(app, instance_name).await
}
