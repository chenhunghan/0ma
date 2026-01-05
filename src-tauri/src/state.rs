use std::sync::atomic::AtomicBool;
use std::sync::Mutex;
use std::time::Instant;

pub struct AppState {
    /// Timestamp of the last tray menu rebuild. Used to debounce hover-triggered (on tray icon) refreshes.
    pub last_tray_menu_refresh: Mutex<Instant>,

    /// Tracks if the window is currently "mapped" to the screen.
    /// - Set to `true`: App startup, "Dashboard" in tray menu clicked, or window gains focus.
    /// - Set to `false`: "Hide" in tray menu clicked, or red Close button (x) clicked.
    pub is_window_visible: AtomicBool,

    /// Tracks if the window is the active recipient of user input.
    /// - Set to `true`: Window gains focus (OS event) or "Dashboard" in tray menu clicked.
    /// - Set to `false`: Window loses focus (OS event), "Hide" in tray menu clicked, or Close button clicked.
    pub is_window_focused: AtomicBool,
}
