use std::sync::Mutex;
use tauri::State;

pub struct TerminalState {
    pub port: Mutex<Option<u16>>,
}

#[tauri::command]
pub fn get_terminal_port(state: State<'_, TerminalState>) -> Result<u16, String> {
    state
        .port
        .lock()
        .unwrap()
        .ok_or_else(|| "Terminal service not started".to_string())
}
