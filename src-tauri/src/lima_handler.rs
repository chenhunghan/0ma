use crate::lima_service;

#[tauri::command]
pub fn lima_version_cmd() -> Result<String, String> {
    lima_service::get_lima_version()
}

#[tauri::command]
pub fn get_system_capabilities_cmd() -> lima_service::SystemCapabilities {
    lima_service::get_system_capabilities()
}
