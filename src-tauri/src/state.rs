use std::sync::atomic::AtomicBool;
use std::sync::Mutex;
use std::time::Instant;

pub struct AppState {
    pub last_tray_menu_refresh: Mutex<Instant>,
    pub is_window_visible: AtomicBool,
    pub is_window_focused: AtomicBool,
}
