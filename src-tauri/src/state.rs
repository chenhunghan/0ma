use std::sync::atomic::AtomicBool;
use std::sync::Mutex;
use std::time::{Duration, Instant};

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

impl AppState {
    /// Called when the user clicks the red "Close" (x) button on the window.
    pub fn on_window_close_requested(&self) {
        self.is_window_visible
            .store(false, std::sync::atomic::Ordering::Relaxed);
        self.is_window_focused
            .store(false, std::sync::atomic::Ordering::Relaxed);
    }

    /// Called when the window focus changes (OS event).
    pub fn on_window_focused(&self, focused: bool) {
        self.is_window_focused
            .store(focused, std::sync::atomic::Ordering::Relaxed);

        // If window becomes focused, it is definitely visible
        if focused {
            self.is_window_visible
                .store(true, std::sync::atomic::Ordering::Relaxed);
        }
    }

    /// Called when "Dashboard" is clicked in the tray menu.
    pub fn on_tray_dashboard_click(&self) {
        self.is_window_visible
            .store(true, std::sync::atomic::Ordering::Relaxed);
        self.is_window_focused
            .store(true, std::sync::atomic::Ordering::Relaxed);
    }

    /// Called when "Hide" is clicked in the tray menu.
    pub fn on_tray_hide_click(&self) {
        self.is_window_visible
            .store(false, std::sync::atomic::Ordering::Relaxed);
        self.is_window_focused
            .store(false, std::sync::atomic::Ordering::Relaxed);
    }

    /// Checks if we should refresh the tray menu based on the debounce timer.
    /// If returns true, it updates the timestamp to now.
    pub fn should_refresh_tray(&self) -> bool {
        if let Ok(mut last_refresh) = self.last_tray_menu_refresh.lock() {
            let elapsed = last_refresh.elapsed();
            if elapsed > Duration::from_secs(5) {
                // log::info! is not available in unit tests by default without init,
                // but we can assume this logic holds true.
                *last_refresh = Instant::now();
                return true;
            } else {
                return false;
            }
        }
        false
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn create_test_state() -> AppState {
        AppState {
            last_tray_menu_refresh: Mutex::new(Instant::now()),
            is_window_visible: AtomicBool::new(true),
            is_window_focused: AtomicBool::new(true),
        }
    }

    #[test]
    fn test_on_window_close_requested() {
        let state = create_test_state();
        state.on_window_close_requested();
        assert_eq!(
            state
                .is_window_visible
                .load(std::sync::atomic::Ordering::Relaxed),
            false
        );
        assert_eq!(
            state
                .is_window_focused
                .load(std::sync::atomic::Ordering::Relaxed),
            false
        );
    }

    #[test]
    fn test_on_window_focused() {
        let state = create_test_state();

        // Test: Lost focus
        state.on_window_focused(false);
        assert_eq!(
            state
                .is_window_focused
                .load(std::sync::atomic::Ordering::Relaxed),
            false
        );
        // Losing focus should NOT hide the window
        assert_eq!(
            state
                .is_window_visible
                .load(std::sync::atomic::Ordering::Relaxed),
            true
        );

        // Test: Gained focus
        state
            .is_window_visible
            .store(false, std::sync::atomic::Ordering::Relaxed); // Start hidden to verify it becomes visible
        state.on_window_focused(true);
        assert_eq!(
            state
                .is_window_focused
                .load(std::sync::atomic::Ordering::Relaxed),
            true
        );
        assert_eq!(
            state
                .is_window_visible
                .load(std::sync::atomic::Ordering::Relaxed),
            true
        );
    }

    #[test]
    fn test_on_tray_dashboard_click() {
        let state = create_test_state();
        state
            .is_window_visible
            .store(false, std::sync::atomic::Ordering::Relaxed);
        state
            .is_window_focused
            .store(false, std::sync::atomic::Ordering::Relaxed);

        state.on_tray_dashboard_click();
        assert_eq!(
            state
                .is_window_visible
                .load(std::sync::atomic::Ordering::Relaxed),
            true
        );
        assert_eq!(
            state
                .is_window_focused
                .load(std::sync::atomic::Ordering::Relaxed),
            true
        );
    }

    #[test]
    fn test_on_tray_hide_click() {
        let state = create_test_state();
        state.on_tray_hide_click();
        assert_eq!(
            state
                .is_window_visible
                .load(std::sync::atomic::Ordering::Relaxed),
            false
        );
        assert_eq!(
            state
                .is_window_focused
                .load(std::sync::atomic::Ordering::Relaxed),
            false
        );
    }

    #[test]
    fn test_should_refresh_tray() {
        let state = create_test_state();

        // 1. Force last refresh to be long ago (10 seconds ago)
        if let Ok(mut last) = state.last_tray_menu_refresh.lock() {
            *last = Instant::now() - Duration::from_secs(10);
        }
        // Should refresh
        assert_eq!(state.should_refresh_tray(), true);

        // 2. Now call it again immediately. The previous call checks updated the timestamp to Now.
        // Should be debounced (false)
        assert_eq!(state.should_refresh_tray(), false);

        // 3. Force last refresh to be ALMOST ready (4 seconds ago)
        if let Ok(mut last) = state.last_tray_menu_refresh.lock() {
            *last = Instant::now() - Duration::from_secs(4);
        }
        assert_eq!(state.should_refresh_tray(), false);
    }
}
