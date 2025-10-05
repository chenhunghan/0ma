// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod models;
mod services;

use services::{
    cli_detection::{CLIDetectionService, detect_cli_tools, get_cli_tool_status, refresh_cli_tools},
    config::{ConfigService, get_app_config, update_app_config, reset_config_to_defaults, export_config, import_config, get_config_info},
    logging::{LoggingService, LoggingConfig, init_global_logger, get_log_stats, get_recent_logs, update_logging_config, get_logging_config, clear_log_buffer, rotate_logs}
};
use tauri::{
    menu::{Menu, MenuItem, PredefinedMenuItem},
    tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent},
    Manager, WindowEvent, WebviewWindow,
};

// Tauri command to show the main window
#[tauri::command]
fn show_window(window: WebviewWindow) {
    if let Err(e) = window.show() {
        eprintln!("Failed to show window: {}", e);
    }
    if let Err(e) = window.set_focus() {
        eprintln!("Failed to focus window: {}", e);
    }
}

// Tauri command to hide the main window
#[tauri::command]
fn hide_window(window: WebviewWindow) {
    if let Err(e) = window.hide() {
        eprintln!("Failed to hide window: {}", e);
    }
}

// Tauri command to toggle window visibility
#[tauri::command]
fn toggle_window(window: WebviewWindow) {
    if window.is_visible().unwrap_or(false) {
        hide_window(window);
    } else {
        show_window(window);
    }
}

fn main() {
    // Initialize logging service first
    let logging_config = LoggingConfig::default();
    if let Err(e) = init_global_logger(logging_config) {
        eprintln!("Failed to initialize logging: {}", e);
    }

    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![
            show_window,
            hide_window,
            toggle_window,
            detect_cli_tools,
            get_cli_tool_status,
            refresh_cli_tools,
            get_app_config,
            update_app_config,
            reset_config_to_defaults,
            export_config,
            import_config,
            get_config_info,
            // Logging commands
            get_log_stats,
            get_recent_logs,
            update_logging_config,
            get_logging_config,
            clear_log_buffer,
            rotate_logs
        ])
        .setup(|app| {
            let app_handle = app.handle();

            // Initialize CLI detection service
            let cli_detection_service = CLIDetectionService::new();
            app.manage(cli_detection_service);

            // Initialize configuration service
            let config_service = ConfigService::default();

            // Load or create default configuration
            if let Err(e) = config_service.load_or_create() {
                eprintln!("Failed to load/create configuration: {}", e);
            }

            app.manage(config_service);

            // Create system tray menu
            let show_item = MenuItem::with_id(app_handle, "show", "Show", true, None::<&str>).unwrap();
            let hide_item = MenuItem::with_id(app_handle, "hide", "Hide", true, None::<&str>).unwrap();
            let separator = PredefinedMenuItem::separator(app_handle).unwrap();
            let quit_item = MenuItem::with_id(app_handle, "quit", "Quit", true, None::<&str>).unwrap();

            let menu = Menu::with_items(
                app_handle,
                &[
                    &show_item,
                    &hide_item,
                    &separator,
                    &quit_item,
                ]
            ).unwrap();

            // Create tray icon
            let _tray = TrayIconBuilder::new()
                .menu(&menu)
                .show_menu_on_left_click(true)
                .on_menu_event(move |app, event| {
                    match event.id().as_ref() {
                        "show" => {
                            if let Some(window) = app.get_webview_window("main") {
                                let _ = show_window(window);
                            }
                        }
                        "hide" => {
                            if let Some(window) = app.get_webview_window("main") {
                                let _ = hide_window(window);
                            }
                        }
                        "quit" => {
                            app.exit(0);
                        }
                        _ => {}
                    }
                })
                .on_tray_icon_event(|tray, event| {
                    match event {
                        TrayIconEvent::Click {
                            button: MouseButton::Left,
                            button_state: MouseButtonState::Down,
                            ..
                        } => {
                            let app = tray.app_handle();
                            if let Some(window) = app.get_webview_window("main") {
                                let _ = toggle_window(window);
                            }
                        }
                        TrayIconEvent::DoubleClick {
                            button: MouseButton::Left,
                            ..
                        } => {
                            let app = tray.app_handle();
                            if let Some(window) = app.get_webview_window("main") {
                                let _ = show_window(window);
                            }
                        }
                        _ => {}
                    }
                })
                .build(app).unwrap();

            // Hide the window initially (will be shown when tray icon is clicked)
            if let Some(window) = app.get_webview_window("main") {
                let _ = window.hide();
            }

            Ok(())
        })
        .on_window_event(|window, event| {
            if let WindowEvent::CloseRequested { .. } = event {
                // Hide window instead of closing when user tries to close
                let _ = window.hide();
            }
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
