// Learn more about Tauri commands at https://tauri.app/develop/calling-rust/
pub mod models;
pub mod services;
#[cfg(test)]
pub mod testing;
#[cfg(test)]
pub mod tests;

use services::{vm_management::VMManagementService, vm_monitoring::VMMonitoringService, vm_config::VMConfigService};
use std::sync::Arc;

#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    // Initialize VM management service
    let vm_service = VMManagementService::new()
        .expect("Failed to initialize VM management service");
    let vm_service = Arc::new(vm_service);

    // Initialize VM monitoring service
    let monitoring_service = VMMonitoringService::new(Arc::clone(&vm_service));
    let monitoring_service = Arc::new(monitoring_service);

    // Initialize VM configuration service
    let config_service = VMConfigService::new(
        std::path::PathBuf::from("/Users/chh/.lima-vm-manager/configs")
    )
        .expect("Failed to initialize VM configuration service");
    let config_service = Arc::new(config_service);

    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .manage(vm_service)
        .manage(monitoring_service)
        .manage(config_service)
        .invoke_handler(tauri::generate_handler![
            // General commands
            greet,

            // VM Management commands
            services::vm_management::list_vms,
            services::vm_management::get_vm_details,
            services::vm_management::start_vm,
            services::vm_management::stop_vm,
            services::vm_management::restart_vm,
            services::vm_management::delete_vm,
            services::vm_management::create_vm,
            services::vm_management::get_vm_status,
            services::vm_management::get_limactl_version,
            services::vm_management::get_available_templates,
            services::vm_management::get_system_info,

            // VM Monitoring commands
            services::vm_monitoring::get_monitoring_stats,
            services::vm_monitoring::get_vm_resource_data,
            services::vm_monitoring::get_vm_health_data,
            services::vm_monitoring::start_vm_monitoring,
            services::vm_monitoring::stop_vm_monitoring,

            // CLI Detection commands
            services::cli_detection::detect_cli_tools,
            services::cli_detection::get_cli_tool_status,
            services::cli_detection::refresh_cli_tools,

            // VM Configuration commands
            services::vm_config::validate_vm_config,
            services::vm_config::get_vm_templates,
            services::vm_config::get_vm_template,
            services::vm_config::create_vm_config_from_template,
            services::vm_config::save_vm_config,
            services::vm_config::load_vm_config,
            services::vm_config::get_vm_config_history,
            services::vm_config::create_vm_config_backup,
            services::vm_config::get_vm_config_backups,
            services::vm_config::restore_vm_config_from_backup,
            services::vm_config::get_vm_config_stats,
            services::vm_config::delete_vm_config,
            services::vm_config::clone_vm_config,
            services::vm_config::export_vm_config,
            services::vm_config::import_vm_config,

            // Configuration commands
            services::config::get_app_config,
            services::config::update_app_config,
            services::config::reset_config_to_defaults,
            services::config::export_config,
            services::config::import_config,
            services::config::get_config_info
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
