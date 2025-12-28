use crate::k8s_log_service::K8sLogService;
use std::sync::OnceLock;
use tauri::command;

static LOG_PORT: OnceLock<u16> = OnceLock::new();

pub fn init() {
    tauri::async_runtime::spawn(async {
        match K8sLogService::start().await {
            Ok((port, _handle)) => {
                let _ = LOG_PORT.set(port);
            }
            Err(e) => eprintln!("Failed to start K8s Log Service: {}", e),
        }
    });
}

#[command]
pub fn get_k8s_log_port() -> Result<u16, String> {
    LOG_PORT
        .get()
        .copied()
        .ok_or_else(|| "K8s Log Service not initialized".to_string())
}
