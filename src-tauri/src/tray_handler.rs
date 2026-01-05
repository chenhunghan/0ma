use crate::instance_registry_service;
use crate::state::AppState;
use std::time::Instant;
use tauri::menu::{Menu, MenuItem, PredefinedMenuItem, Submenu};
use tauri::Manager;

pub async fn refresh_tray_menu(app: &tauri::AppHandle) -> Result<(), Box<dyn std::error::Error>> {
    let state = app.state::<AppState>();

    // Check if we need to update the timestamp (for external triggers like start/stop success)
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
