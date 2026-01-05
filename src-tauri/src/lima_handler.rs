use crate::lima_service;

#[tauri::command]
pub fn lima_version_cmd() -> Result<String, String> {
    lima_service::get_lima_version()
}
