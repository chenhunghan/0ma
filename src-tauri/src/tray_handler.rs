use crate::instance_registry_service;
use crate::lima_instance_service;
use crate::state::AppState;
use std::time::Instant;
use tauri::image::Image;
use tauri::menu::{Menu, MenuItem, PredefinedMenuItem, Submenu};
use tauri::tray::{TrayIconBuilder, TrayIconEvent};
use tauri::{AppHandle, Listener, Manager};

pub fn setup_tray(app: &tauri::App) -> Result<(), Box<dyn std::error::Error>> {
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
                            let _ =
                                lima_instance_service::start_lima_instance(handle.clone(), name)
                                    .await;
                        });
                    } else if let Some(name) = id.strip_prefix("stop:") {
                        let name = name.to_string();
                        log::debug!("Tray action: Stopping instance '{}'", name);
                        let handle = app.clone();
                        tauri::async_runtime::spawn(async move {
                            let _ = lima_instance_service::stop_lima_instance(handle.clone(), name)
                                .await;
                        });
                    } else if let Some(name) = id.strip_prefix("delete:") {
                        let name = name.to_string();
                        log::debug!("Tray action: Deleting instance '{}'", name);
                        let handle = app.clone();
                        tauri::async_runtime::spawn(async move {
                            let _ =
                                lima_instance_service::delete_lima_instance(handle.clone(), name)
                                    .await;
                        });
                    }
                }
            }
        })
        .on_tray_icon_event(|_tray, event| {
            if let TrayIconEvent::Enter { .. } = event {
                let handle = _tray.app_handle();
                let should_refresh = {
                    let state = handle.state::<AppState>();
                    let mut _should_refresh = false;
                    if let Ok(mut last_refresh) = state.last_tray_menu_refresh.lock() {
                        let elapsed = last_refresh.elapsed();
                        if elapsed > std::time::Duration::from_secs(5) {
                            log::info!(
                                "Triggering tray refresh (last refresh was {:?} ago)",
                                elapsed
                            );
                            *last_refresh = std::time::Instant::now();
                            _should_refresh = true;
                        } else {
                            log::debug!(
                                "Tray refresh skipped (debounce: last refresh was {:?} ago)",
                                elapsed
                            );
                        }
                    }
                    _should_refresh
                };

                if should_refresh {
                    let task_handle = handle.clone();
                    tauri::async_runtime::spawn(async move {
                        let _ = refresh_tray_menu(&task_handle).await;
                    });
                }
            }
        })
        .icon_as_template(true)
        .build(app)?;

    Ok(())
}

pub fn setup_listeners(app: &tauri::App) {
    let events = [
        "lima-instance-create-success",
        "lima-instance-start-success",
        "lima-instance-stop-success",
        "lima-instance-delete-success",
    ];

    for event in events {
        let h = app.handle().clone();
        app.listen(event, move |_| {
            let h = h.clone();
            tauri::async_runtime::spawn(async move {
                log::debug!("Event '{}' received, refreshing tray", event);
                let _ = refresh_tray_menu(&h).await;
            });
        });
    }
}

pub async fn refresh_tray_menu(app: &AppHandle) -> Result<(), Box<dyn std::error::Error>> {
    let state = app.state::<AppState>();

    if let Ok(mut last_refresh) = state.last_tray_menu_refresh.lock() {
        log::info!("Updating tray menu items...");
        *last_refresh = Instant::now();
    }

    let instances = instance_registry_service::get_all_lima_instances()
        .await
        .unwrap_or_default();

    let dashboard_i = MenuItem::with_id(app, "dashboard", "Dashboard", true, None::<&str>)?;
    let quit_i = MenuItem::with_id(app, "quit", "Quit", true, None::<&str>)?;

    let menu = Menu::new(app)?;
    menu.append(&dashboard_i)?;
    menu.append(&PredefinedMenuItem::separator(app)?)?;

    for instance in instances {
        let instance_name = instance.name.clone();
        let status = instance.status.clone();
        let display_name = format!("{} ({})", instance_name, status);

        let instance_submenu = Submenu::with_id(
            app,
            format!("instance:{}", instance_name),
            display_name,
            true,
        )?;

        let is_running = status == "Running";
        let start_i = MenuItem::with_id(
            app,
            format!("start:{}", instance_name),
            "Start",
            !is_running,
            None::<&str>,
        )?;
        let stop_i = MenuItem::with_id(
            app,
            format!("stop:{}", instance_name),
            "Stop",
            is_running,
            None::<&str>,
        )?;
        let is_stopped = status == "Stopped";
        let delete_i = MenuItem::with_id(
            app,
            format!("delete:{}", instance_name),
            "Delete",
            is_stopped,
            None::<&str>,
        )?;

        instance_submenu.append_items(&[&start_i, &stop_i, &delete_i])?;
        menu.append(&instance_submenu)?;
    }

    menu.append(&PredefinedMenuItem::separator(app)?)?;
    menu.append(&quit_i)?;

    if let Some(tray) = app.tray_by_id("main") {
        let _ = tray.set_menu(Some(menu));
    }

    Ok(())
}
