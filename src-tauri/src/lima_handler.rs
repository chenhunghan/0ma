use crate::lima_service;

#[tauri::command]
pub async fn lima_version_cmd() -> Result<String, String> {
    lima_service::get_lima_version()
}

#[tauri::command]
pub async fn get_system_capabilities_cmd() -> lima_service::SystemCapabilities {
    lima_service::get_system_capabilities()
}

#[tauri::command]
pub async fn check_lima_installed_cmd() -> bool {
    lima_service::find_lima_executable().is_some()
}

#[tauri::command]
pub async fn install_lima_cmd() -> Result<String, String> {
    lima_service::install_lima().await
}
