use tauri::{Emitter, Listener, Manager};

mod instance_registry_handler;
mod instance_registry_service;
mod k8s_handler;
mod k8s_service;
mod lima_config;
mod lima_config_handler;
mod lima_config_service;
mod lima_handler;
mod lima_instance_handler;
mod lima_instance_service;
mod lima_service;
mod state;
mod terminal_manager;
mod terminal_persistence;
mod tray_handler;
mod yaml_handler;

pub use lima_service::find_lima_executable;
const SESSION_AUTOSAVE_INTERVAL_SECS: u64 = 5;

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
                last_tray_menu_refresh: std::sync::Mutex::new(
                    std::time::Instant::now() - std::time::Duration::from_secs(60),
                ),
                is_window_visible: std::sync::atomic::AtomicBool::new(true),
                is_window_focused: std::sync::atomic::AtomicBool::new(true),
            });
            let pty_manager = terminal_manager::PtyManager::new();
            app.manage(pty_manager);

            // Listen for pty-input events
            let pty_manager = app.state::<terminal_manager::PtyManager>().inner().clone();
            let handle = app.handle().clone();
            handle.listen("pty-input", move |event| {
                #[derive(serde::Deserialize)]
                struct PtyInputPayload {
                    #[serde(rename = "sessionId")]
                    session_id: String,
                    data: String,
                }

                if let Ok(payload) = serde_json::from_str::<PtyInputPayload>(event.payload()) {
                    if let Err(e) = pty_manager.write(&payload.session_id, &payload.data) {
                        log::error!("Failed to write to PTY: {}", e);
                    }
                } else {
                    log::error!("Failed to parse pty-input payload: {}", event.payload());
                }
            });

            tray_handler::setup_tray(app)?;
            tray_handler::setup_listeners(app);

            // Persist terminal histories when the process is stopped from the terminal
            // (for example `make dev` -> Ctrl+C).
            let pty_for_signal = app.state::<terminal_manager::PtyManager>().inner().clone();
            let app_data_for_signal = app
                .path()
                .app_data_dir()
                .expect("failed to get app data dir");
            let app_handle_for_signal = app.handle().clone();
            ctrlc::set_handler(move || {
                log::info!("Termination signal received; saving terminal sessions");
                if let Err(e) = pty_for_signal.save_all_sessions(&app_data_for_signal) {
                    log::error!("Failed to save sessions on signal: {}", e);
                }
                let _ = app_handle_for_signal.emit("app-will-quit", ());
                std::thread::sleep(std::time::Duration::from_millis(200));
                std::process::exit(0);
            })?;

            // Periodic auto-save of terminal session history.
            // Ensures history is persisted even on ungraceful exits
            let pty_for_timer = app.state::<terminal_manager::PtyManager>().inner().clone();
            let app_data_for_timer = app
                .path()
                .app_data_dir()
                .expect("failed to get app data dir");
            std::thread::spawn(move || loop {
                std::thread::sleep(std::time::Duration::from_secs(
                    SESSION_AUTOSAVE_INTERVAL_SECS,
                ));
                if let Err(e) = pty_for_timer.save_all_sessions(&app_data_for_timer) {
                    log::error!("Auto-save sessions failed: {}", e);
                }
            });

            // Clean up old session history files (older than 7 days)
            let app_data_for_cleanup = app
                .path()
                .app_data_dir()
                .expect("failed to get app data dir");
            std::thread::spawn(move || {
                terminal_persistence::cleanup_old_histories(
                    &app_data_for_cleanup,
                    std::time::Duration::from_secs(7 * 24 * 3600),
                );
            });

            Ok(())
        })
        .on_window_event(|window, event| {
            // click the red "Close" button $(x)$, intercepts CloseRequested,
            // calls window.hide(), and cancels the app termination.
            if let tauri::WindowEvent::CloseRequested { api, .. } = event {
                let _ = window.hide();
                api.prevent_close();
                let handle = window.app_handle();
                let state = handle.state::<state::AppState>();
                state.on_window_close_requested();

                log::debug!("Window close requested - hiding window and updating AppState");
                let h = handle.clone();
                tauri::async_runtime::spawn(async move {
                    let _ = tray_handler::refresh_tray_menu(&h).await;
                });
            } else if let tauri::WindowEvent::Focused(focused) = event {
                let handle = window.app_handle();
                let state = handle.state::<state::AppState>();
                state.on_window_focused(*focused);

                log::debug!("Window focus changed: focused={}", focused);
                let h = handle.clone();
                tauri::async_runtime::spawn(async move {
                    let _ = tray_handler::refresh_tray_menu(&h).await;
                });
            }
        })
        .invoke_handler(tauri::generate_handler![
            lima_handler::lima_version_cmd,
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
            terminal_manager::spawn_pty_cmd,
            terminal_manager::attach_pty_cmd,
            terminal_manager::write_pty_cmd,
            terminal_manager::resize_pty_cmd,
            terminal_manager::close_pty_cmd,
            terminal_manager::save_all_sessions_cmd,
            terminal_manager::load_session_history_cmd,
            terminal_manager::load_session_restore_cmd,
            terminal_manager::delete_session_history_cmd
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
