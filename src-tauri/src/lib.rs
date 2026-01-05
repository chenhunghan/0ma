use std::path::Path;
use std::process::Command;

use tauri::image::Image;
use tauri::menu::{Menu, MenuItem};
use tauri::tray::{TrayIconBuilder, TrayIconEvent};
use tauri::{Listener, Manager};

mod instance_registry_handler;
mod instance_registry_service;
mod k8s_handler;
mod k8s_log_handler; // Added log handler module
mod k8s_log_service; // Added log service module
mod k8s_service;
mod lima_config;
mod lima_config_handler;
mod lima_config_service;
mod lima_instance_handler;
mod lima_instance_service;
mod state;
mod terminal_handler;
mod terminal_service;
mod tray_handler;
mod yaml_handler;

// Note: We use limactl directly instead of lima wrapper script
const COMMON_LIMA_EXEC_PATHS: &[&str] = &[
    "/opt/homebrew/bin/limactl",
    "/usr/local/bin/limactl",
    "/opt/local/bin/limactl",
    "/usr/bin/limactl",
    "limactl",
];

/// Find the lima executable in common installation paths
pub fn find_lima_executable() -> Option<String> {
    for path in COMMON_LIMA_EXEC_PATHS {
        if *path == "limactl" {
            // Try using PATH
            if Command::new(path).arg("--version").output().is_ok() {
                return Some(path.to_string());
            }
        } else if Path::new(path).exists() {
            return Some(path.to_string());
        }
    }

    None
}

#[tauri::command]
fn lima_version_cmd() -> Result<String, String> {
    // Find limactl executable
    let lima_cmd = find_lima_executable()
        .ok_or_else(|| "Lima (limactl) not found. Please ensure lima is installed in /usr/local/bin, /opt/homebrew/bin, or is in your PATH.".to_string())?;

    // Try to execute 'limactl --version' to get the version string
    match Command::new(&lima_cmd).arg("--version").output() {
        Ok(output) => {
            if output.status.success() {
                // Convert stdout to string and trim whitespace
                String::from_utf8(output.stdout)
                    .map(|s| {
                        let trimmed = s.trim();
                        // Extract version number from "limactl version X.Y.Z"
                        trimmed
                            .split_whitespace()
                            .last()
                            .unwrap_or(trimmed)
                            .to_string()
                    })
                    .map_err(|e| format!("Failed to parse limactl version output: {}", e))
            } else {
                // If command failed, return stderr as error
                let error_msg = String::from_utf8_lossy(&output.stderr).trim().to_string();
                Err(if error_msg.is_empty() {
                    "limactl --version command failed".to_string()
                } else {
                    error_msg
                })
            }
        }
        Err(e) => Err(format!("Failed to execute lima command: {}", e)),
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(
            tauri_plugin_log::Builder::new()
                .level(if cfg!(debug_assertions) {
                    tauri_plugin_log::log::LevelFilter::Debug
                } else {
                    tauri_plugin_log::log::LevelFilter::Info
                })
                .build(),
        )
        .plugin(tauri_plugin_store::Builder::new().build())
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .setup(|app| {
            app.manage(state::AppState {
                // Initialize last_tray_menu_refresh to 60 seconds ago to ensure the first refresh happens immediately
                last_tray_menu_refresh: std::sync::Mutex::new(std::time::Instant::now() - std::time::Duration::from_secs(60)),
            });

            let handle = app.handle().clone();
            k8s_log_handler::init();

            let quit_i = MenuItem::with_id(app, "quit", "Quit", true, None::<&str>)?;
            let dashboard_i = MenuItem::with_id(app, "dashboard", "Dashboard", true, None::<&str>)?;
            let menu = Menu::with_items(app, &[&dashboard_i, &quit_i])?;

            let _tray = TrayIconBuilder::with_id("main")
                .icon(
                    Image::from_bytes(include_bytes!("../icons/tray-icon.png"))
                        .expect("tray icon not found"),
                )
                .menu(&menu)
                .show_menu_on_left_click(true)
                .on_menu_event(|app, event| {
                    let id = event.id.as_ref();
                    match id {
                        "quit" => {
                            std::process::exit(0);
                        }
                        "dashboard" => {
                            if let Some(window) = app.get_webview_window("main") {
                                let _ = window.show();
                                let _ = window.set_focus();
                            }
                        }
                        _ => {
                            if let Some(name) = id.strip_prefix("start:") {
                                let name = name.to_string();
                                log::debug!("Tray action: Starting instance '{}'", name);
                                let handle = app.clone();
                                tauri::async_runtime::spawn(async move {
                                    let _ = lima_instance_service::start_lima_instance(
                                        handle.clone(),
                                        name,
                                    )
                                    .await;
                                });
                            } else if let Some(name) = id.strip_prefix("stop:") {
                                let name = name.to_string();
                                log::debug!("Tray action: Stopping instance '{}'", name);
                                let handle = app.clone();
                                tauri::async_runtime::spawn(async move {
                                    let _ = lima_instance_service::stop_lima_instance(
                                        handle.clone(),
                                        name,
                                    )
                                    .await;
                                });
                            } else if let Some(name) = id.strip_prefix("delete:") {
                                let name = name.to_string();
                                log::debug!("Tray action: Deleting instance '{}'", name);
                                let handle = app.clone();
                                tauri::async_runtime::spawn(async move {
                                    // Note: Direct delete from tray might be risky, but following user request
                                    let _ = lima_instance_service::delete_lima_instance(
                                        handle.clone(),
                                        name,
                                    )
                                    .await;
                                });
                            }
                        }
                    }
                })
                .on_tray_icon_event(|_tray, event| {
                    // "Hover" event on the tray icon
                    if let TrayIconEvent::Enter { .. } = event {
                        let handle = _tray.app_handle();
                        let should_refresh = {
                            let state = handle.state::<state::AppState>();
                            let mut _should_refresh = false;
                            if let Ok(mut last_refresh) = state.last_tray_menu_refresh.lock() {
                                let elapsed = last_refresh.elapsed();
                                if elapsed > std::time::Duration::from_secs(5) {
                                    log::info!("Triggering tray refresh (last refresh was {:?} ago)", elapsed);
                                    *last_refresh = std::time::Instant::now();
                                    _should_refresh = true;
                                } else {
                                    log::debug!("Tray refresh skipped (debounce: last refresh was {:?} ago)", elapsed);
                                }
                            }
                            _should_refresh
                        };

                        if should_refresh {
                            let task_handle = handle.clone();
                            tauri::async_runtime::spawn(async move {
                                let _ = tray_handler::refresh_tray_menu(&task_handle).await;
                            });
                        }
                    }
                })
                .icon_as_template(true)
                .build(app)?;

            // Listen for any instance changes in the frontend to keep tray menu in sync
            let h = app.handle().clone();
            app.listen("lima-instance-create-success", move |_| {
                let h = h.clone();
                tauri::async_runtime::spawn(async move {
                    log::debug!("Event 'lima-instance-create-success' received, refreshing tray");
                    let _ = tray_handler::refresh_tray_menu(&h).await;
                });
            });
            let h = app.handle().clone();
            app.listen("lima-instance-start-success", move |_| {
                let h = h.clone();
                tauri::async_runtime::spawn(async move {
                    log::debug!("Event 'lima-instance-start-success' received, refreshing tray");
                    let _ = tray_handler::refresh_tray_menu(&h).await;
                });
            });
            let h = app.handle().clone();
            app.listen("lima-instance-stop-success", move |_| {
                let h = h.clone();
                tauri::async_runtime::spawn(async move {
                    log::debug!("Event 'lima-instance-stop-success' received, refreshing tray");
                    let _ = tray_handler::refresh_tray_menu(&h).await;
                });
            });
            let h = app.handle().clone();
            app.listen("lima-instance-delete-success", move |_| {
                let h = h.clone();
                tauri::async_runtime::spawn(async move {
                    log::debug!("Event 'lima-instance-delete-success' received, refreshing tray");
                    let _ = tray_handler::refresh_tray_menu(&h).await;
                });
            });

            tauri::async_runtime::spawn(async move {
                match terminal_service::TerminalService::start().await {
                    Ok((port, _join_handle)) => {
                        handle.manage(terminal_handler::TerminalState {
                            port: std::sync::Mutex::new(Some(port)),
                        });
                    }
                    Err(e) => {
                        log::error!("Failed to start terminal service: {}", e);
                    }
                }
            });
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            lima_version_cmd,
            terminal_handler::get_terminal_port,
            lima_config_handler::read_lima_yaml_cmd,
            lima_config_handler::write_lima_yaml_cmd,
            lima_config_handler::get_lima_yaml_path_cmd,
            lima_config_handler::reset_lima_yaml_cmd,
            lima_config_handler::get_default_k0s_lima_config_yaml_cmd,
            lima_config_handler::get_kubeconfig_path_cmd,
            lima_config_handler::convert_config_to_yaml_cmd,
            instance_registry_handler::get_all_lima_instances_cmd,
            instance_registry_handler::is_instance_registered_cmd,
            instance_registry_handler::get_instance_disk_usage_cmd,
            instance_registry_handler::get_instance_ip_cmd,
            instance_registry_handler::get_instance_uptime_cmd,
            instance_registry_handler::get_instance_guest_diagnostics_cmd,
            lima_instance_handler::create_lima_instance_cmd,
            lima_instance_handler::start_lima_instance_cmd,
            lima_instance_handler::stop_lima_instance_cmd,
            lima_instance_handler::delete_lima_instance_cmd,
            k8s_handler::get_k8s_pods_cmd,
            k8s_handler::get_k8s_services_cmd,
            k8s_log_handler::get_k8s_log_port
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
