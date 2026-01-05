use std::sync::Mutex;
use std::time::Instant;

pub struct AppState {
    pub last_tray_menu_refresh: Mutex<Instant>,
}
