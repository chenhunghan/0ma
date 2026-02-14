use portable_pty::{CommandBuilder, MasterPty, NativePtySystem, PtySize, PtySystem};
use serde::Serialize;
use std::{
    collections::HashMap,
    io::{Read, Write},
    path::PathBuf,
    sync::{Arc, Mutex},
    thread,
};
use tauri::{ipc::Channel, AppHandle, Emitter, Runtime};

use crate::terminal_persistence;

const HISTORY_SIZE: usize = 100 * 1024; // 100KB

#[derive(Clone, Serialize)]
pub struct PtyEvent {
    pub data: String,
}

// -- OSC 7 Parser --

/// Lightweight state-machine parser that extracts CWD from OSC 7 escape sequences.
///
/// OSC 7 format: `ESC ] 7 ; file://hostname/path BEL` (BEL = 0x07)
///            or: `ESC ] 7 ; file://hostname/path ESC \`  (ST = string terminator)
///
/// Handles sequences that span across chunk boundaries via internal buffer.
struct Osc7Parser {
    state: Osc7State,
    buffer: Vec<u8>,
}

enum Osc7State {
    Ground,
    Esc,        // saw ESC (0x1b)
    OscBracket, // saw ESC ]
    Osc7,       // saw ESC ] 7
    Collecting,  // saw ESC ] 7 ; — collecting URI bytes
    EscInOsc,   // saw ESC while Collecting (potential ST)
}

impl Osc7Parser {
    fn new() -> Self {
        Self {
            state: Osc7State::Ground,
            buffer: Vec::with_capacity(256),
        }
    }

    /// Feed a chunk of PTY output. Returns the last CWD found (if any).
    fn feed(&mut self, data: &[u8]) -> Option<String> {
        let mut last_cwd: Option<String> = None;

        for &byte in data {
            match self.state {
                Osc7State::Ground => {
                    if byte == 0x1b {
                        self.state = Osc7State::Esc;
                    }
                }
                Osc7State::Esc => {
                    if byte == b']' {
                        self.state = Osc7State::OscBracket;
                    } else {
                        self.state = Osc7State::Ground;
                    }
                }
                Osc7State::OscBracket => {
                    if byte == b'7' {
                        self.state = Osc7State::Osc7;
                    } else {
                        self.state = Osc7State::Ground;
                    }
                }
                Osc7State::Osc7 => {
                    if byte == b';' {
                        self.state = Osc7State::Collecting;
                        self.buffer.clear();
                    } else {
                        self.state = Osc7State::Ground;
                    }
                }
                Osc7State::Collecting => {
                    if byte == 0x07 {
                        // BEL terminates
                        if let Some(cwd) = self.extract_path() {
                            last_cwd = Some(cwd);
                        }
                        self.state = Osc7State::Ground;
                    } else if byte == 0x1b {
                        // Potential ST (ESC \)
                        self.state = Osc7State::EscInOsc;
                    } else if self.buffer.len() < 4096 {
                        self.buffer.push(byte);
                    } else {
                        // URI too long, abort
                        self.state = Osc7State::Ground;
                    }
                }
                Osc7State::EscInOsc => {
                    if byte == b'\\' {
                        // ST terminates
                        if let Some(cwd) = self.extract_path() {
                            last_cwd = Some(cwd);
                        }
                        self.state = Osc7State::Ground;
                    } else {
                        // Not ST, false alarm — the ESC might start a new sequence
                        self.state = if byte == b']' {
                            Osc7State::OscBracket
                        } else {
                            Osc7State::Ground
                        };
                    }
                }
            }
        }

        last_cwd
    }

    /// Extract filesystem path from the collected `file://hostname/path` URI.
    fn extract_path(&self) -> Option<String> {
        let uri = String::from_utf8_lossy(&self.buffer);
        // Strip "file://" prefix
        let rest = uri.strip_prefix("file://")?;
        // The hostname comes before the first '/' in the path portion.
        // Find the path: skip past hostname to first '/'
        let path_start = rest.find('/')?;
        let encoded_path = &rest[path_start..];
        Some(percent_decode(encoded_path))
    }
}

/// Simple percent-decoding for file paths (handles %20, %2F, etc.)
fn percent_decode(input: &str) -> String {
    let mut result = Vec::with_capacity(input.len());
    let bytes = input.as_bytes();
    let mut i = 0;
    while i < bytes.len() {
        if bytes[i] == b'%' && i + 2 < bytes.len() {
            if let (Some(hi), Some(lo)) = (
                hex_val(bytes[i + 1]),
                hex_val(bytes[i + 2]),
            ) {
                result.push(hi << 4 | lo);
                i += 3;
                continue;
            }
        }
        result.push(bytes[i]);
        i += 1;
    }
    String::from_utf8_lossy(&result).to_string()
}

fn hex_val(byte: u8) -> Option<u8> {
    match byte {
        b'0'..=b'9' => Some(byte - b'0'),
        b'a'..=b'f' => Some(byte - b'a' + 10),
        b'A'..=b'F' => Some(byte - b'A' + 10),
        _ => None,
    }
}

// -- PTY Session --

struct PtySession {
    master: Box<dyn MasterPty + Send>,
    writer: Arc<Mutex<Box<dyn Write + Send>>>,
    subscribers: Arc<Mutex<Vec<Channel<PtyEvent>>>>,
    history: Arc<Mutex<Vec<u8>>>,
    cwd: Arc<Mutex<Option<String>>>,
}

impl PtySession {
    fn new(
        master: Box<dyn MasterPty + Send>,
        writer: Box<dyn Write + Send>,
        initial_cwd: Option<String>,
    ) -> Self {
        Self {
            master,
            writer: Arc::new(Mutex::new(writer)),
            subscribers: Arc::new(Mutex::new(Vec::new())),
            history: Arc::new(Mutex::new(Vec::new())),
            cwd: Arc::new(Mutex::new(initial_cwd)),
        }
    }
}

// -- PTY Manager --

#[derive(Clone)]
pub struct PtyManager {
    sessions: Arc<Mutex<HashMap<String, PtySession>>>,
}

impl PtyManager {
    pub fn new() -> Self {
        Self {
            sessions: Arc::new(Mutex::new(HashMap::new())),
        }
    }

    pub fn spawn<R: Runtime>(
        &self,
        app: &AppHandle<R>,
        command: &str,
        args: &[String],
        cwd: Option<String>,
        rows: u16,
        cols: u16,
    ) -> Result<String, String> {
        let pty_system = NativePtySystem::default();
        let pair = pty_system
            .openpty(PtySize {
                rows,
                cols,
                pixel_width: 0,
                pixel_height: 0,
            })
            .map_err(|e| e.to_string())?;

        let mut cmd = CommandBuilder::new(command);
        cmd.args(args);
        if let Some(ref dir) = cwd {
            cmd.cwd(dir);
        }

        let _child = pair.slave.spawn_command(cmd).map_err(|e| e.to_string())?;

        // We drop the slave explicitly so that we don't hold an open handle that prevents EOF
        drop(pair.slave);

        let reader = pair.master.try_clone_reader().map_err(|e| e.to_string())?;
        let writer = pair.master.take_writer().map_err(|e| e.to_string())?;

        let session = PtySession::new(pair.master, writer, cwd);
        let session_id = uuid::Uuid::new_v4().to_string();

        // Clone Arcs for the reader thread
        let subscribers = session.subscribers.clone();
        let history = session.history.clone();
        let cwd_arc = session.cwd.clone();
        let sessions_arc = self.sessions.clone();
        let app_handle = app.clone();
        let sid_clone = session_id.clone();

        // Spawn reader thread
        thread::spawn(move || {
            let mut reader = reader;
            let mut buffer = [0u8; 4096];
            let mut osc7_parser = Osc7Parser::new();
            loop {
                match reader.read(&mut buffer) {
                    Ok(0) => break, // EOF
                    Ok(n) => {
                        let data = &buffer[0..n];

                        // Parse OSC 7 for CWD tracking
                        if let Some(new_cwd) = osc7_parser.feed(data) {
                            if let Ok(mut cwd_guard) = cwd_arc.lock() {
                                *cwd_guard = Some(new_cwd.clone());
                            }
                            // Emit event to frontend
                            let _ = app_handle.emit("pty-cwd-changed", serde_json::json!({
                                "sessionId": sid_clone,
                                "cwd": new_cwd,
                            }));
                        }

                        // Update History
                        {
                            let mut hist = history.lock().unwrap();
                            hist.extend_from_slice(data);
                            if hist.len() > HISTORY_SIZE {
                                let overflow = hist.len() - HISTORY_SIZE;
                                hist.drain(0..overflow);
                            }
                        }

                        // Broadcast
                        let text = String::from_utf8_lossy(data).to_string();
                        let event = PtyEvent { data: text };
                        let mut subs = subscribers.lock().unwrap();
                        subs.retain(|chan| chan.send(event.clone()).is_ok());
                    }
                    Err(_) => break, // Error
                }
            }

            // PTY process exited — notify frontend and clean up
            let _ = app_handle.emit("pty-exited", serde_json::json!({
                "sessionId": sid_clone,
            }));
            if let Ok(mut sessions) = sessions_arc.lock() {
                sessions.remove(&sid_clone);
            }
        });

        self.sessions
            .lock()
            .map_err(|e| e.to_string())?
            .insert(session_id.clone(), session);
        Ok(session_id)
    }

    pub fn close(&self, session_id: &str) -> Result<(), String> {
        let mut sessions = self.sessions.lock().map_err(|e| e.to_string())?;
        if sessions.remove(session_id).is_some() {
            log::info!("Terminal session closed: {}", session_id);
            Ok(())
        } else {
            Err("Session not found".to_string())
        }
    }

    pub fn attach(&self, session_id: &str, channel: Channel<PtyEvent>) -> Result<(), String> {
        let sessions = self.sessions.lock().map_err(|e| e.to_string())?;
        if let Some(session) = sessions.get(session_id) {
            // 1. Send History immediately
            let hist = session.history.lock().map_err(|e| e.to_string())?;
            if !hist.is_empty() {
                let text = String::from_utf8_lossy(&hist).to_string();
                let _ = channel.send(PtyEvent { data: text });
            }

            // 2. Replace subscribers (clear stale channels from HMR/reconnect)
            let mut subs = session
                .subscribers
                .lock()
                .map_err(|e| e.to_string())?;
            subs.clear();
            subs.push(channel);
            Ok(())
        } else {
            Err("Session not found".to_string())
        }
    }

    pub fn write(&self, session_id: &str, data: &str) -> Result<(), String> {
        // Clone the writer Arc and release the sessions lock immediately.
        // This minimizes lock contention by not holding the sessions lock during I/O.
        let writer = {
            let sessions = self.sessions.lock().map_err(|e| e.to_string())?;
            sessions
                .get(session_id)
                .ok_or_else(|| "Session not found".to_string())?
                .writer
                .clone()
        };
        // Now only the writer lock is held during the actual I/O
        let mut writer = writer.lock().map_err(|e| e.to_string())?;
        write!(writer, "{}", data).map_err(|e| e.to_string())?;
        // Flush immediately to avoid buffering delays. Without this, keystrokes
        // may accumulate in the buffer before being sent to the PTY, causing
        // noticeable input lag when typing quickly as the shell echo is delayed.
        writer.flush().map_err(|e| e.to_string())?;
        Ok(())
    }

    pub fn resize(&self, session_id: &str, rows: u16, cols: u16) -> Result<(), String> {
        let sessions = self.sessions.lock().map_err(|e| e.to_string())?;
        if let Some(session) = sessions.get(session_id) {
            session
                .master
                .resize(PtySize {
                    rows,
                    cols,
                    pixel_width: 0,
                    pixel_height: 0,
                })
                .map_err(|e| e.to_string())?;
            Ok(())
        } else {
            Err("Session not found".to_string())
        }
    }

    pub fn save_all_sessions(&self, app_data_dir: &PathBuf) -> Result<(), String> {
        // Snapshot session data under the lock, then release before doing disk I/O
        let snapshots: Vec<(String, Vec<u8>)> = {
            let sessions = self.sessions.lock().map_err(|e| e.to_string())?;
            sessions.iter().filter_map(|(sid, session)| {
                let hist = session.history.lock().ok()?;
                if hist.is_empty() { return None; }
                Some((sid.clone(), hist.clone()))
            }).collect()
        };

        for (session_id, history) in &snapshots {
            terminal_persistence::save_session_history(app_data_dir, session_id, history)?;
        }
        Ok(())
    }
}

// -- Tauri Commands --

#[tauri::command]
pub fn spawn_pty_cmd(
    manager: tauri::State<PtyManager>,
    app: AppHandle,
    command: String,
    args: Vec<String>,
    cwd: Option<String>,
    rows: u16,
    cols: u16,
) -> Result<String, String> {
    manager.spawn(&app, &command, &args, cwd, rows, cols)
}

#[tauri::command]
pub fn attach_pty_cmd(
    manager: tauri::State<PtyManager>,
    session_id: String,
    channel: Channel<PtyEvent>,
) -> Result<(), String> {
    manager.attach(&session_id, channel)
}

#[tauri::command]
pub fn write_pty_cmd(
    manager: tauri::State<PtyManager>,
    session_id: String,
    data: String,
) -> Result<(), String> {
    manager.write(&session_id, &data)
}

#[tauri::command]
pub fn resize_pty_cmd(
    manager: tauri::State<PtyManager>,
    session_id: String,
    rows: u16,
    cols: u16,
) -> Result<(), String> {
    manager.resize(&session_id, rows, cols)
}

#[tauri::command]
pub fn close_pty_cmd(manager: tauri::State<PtyManager>, session_id: String) -> Result<(), String> {
    manager.close(&session_id)
}

#[tauri::command]
pub fn save_all_sessions_cmd(
    manager: tauri::State<PtyManager>,
    app: AppHandle,
) -> Result<(), String> {
    use tauri::Manager;
    let app_data_dir = app.path().app_data_dir().map_err(|e| e.to_string())?;
    manager.save_all_sessions(&app_data_dir)
}

#[tauri::command]
pub fn load_session_history_cmd(
    app: AppHandle,
    session_id: String,
) -> Result<String, String> {
    use tauri::Manager;
    let app_data_dir = app.path().app_data_dir().map_err(|e| e.to_string())?;
    let bytes = terminal_persistence::load_session_history(&app_data_dir, &session_id)?;
    Ok(String::from_utf8_lossy(&bytes).to_string())
}

#[tauri::command]
pub fn delete_session_history_cmd(
    app: AppHandle,
    session_id: String,
) -> Result<(), String> {
    use tauri::Manager;
    let app_data_dir = app.path().app_data_dir().map_err(|e| e.to_string())?;
    terminal_persistence::delete_session_history(&app_data_dir, &session_id)
}

// -- Tests --

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_osc7_parser_bel_terminator() {
        let mut parser = Osc7Parser::new();
        let input = b"\x1b]7;file://localhost/Users/test/projects\x07";
        let result = parser.feed(input);
        assert_eq!(result, Some("/Users/test/projects".to_string()));
    }

    #[test]
    fn test_osc7_parser_st_terminator() {
        let mut parser = Osc7Parser::new();
        let input = b"\x1b]7;file://localhost/tmp/foo\x1b\\";
        let result = parser.feed(input);
        assert_eq!(result, Some("/tmp/foo".to_string()));
    }

    #[test]
    fn test_osc7_parser_percent_encoded() {
        let mut parser = Osc7Parser::new();
        let input = b"\x1b]7;file://localhost/Users/test/my%20folder\x07";
        let result = parser.feed(input);
        assert_eq!(result, Some("/Users/test/my folder".to_string()));
    }

    #[test]
    fn test_osc7_parser_embedded_in_output() {
        let mut parser = Osc7Parser::new();
        let input = b"some output\x1b]7;file://host/home/user\x07more output";
        let result = parser.feed(input);
        assert_eq!(result, Some("/home/user".to_string()));
    }

    #[test]
    fn test_osc7_parser_multiple_sequences() {
        let mut parser = Osc7Parser::new();
        let input = b"\x1b]7;file://h/first\x07stuff\x1b]7;file://h/second\x07";
        let result = parser.feed(input);
        // Returns the last one
        assert_eq!(result, Some("/second".to_string()));
    }

    #[test]
    fn test_osc7_parser_across_chunks() {
        let mut parser = Osc7Parser::new();
        // Split in the middle of the sequence
        assert_eq!(parser.feed(b"\x1b]7;file://host/ho"), None);
        let result = parser.feed(b"me/user\x07");
        assert_eq!(result, Some("/home/user".to_string()));
    }

    #[test]
    fn test_osc7_parser_no_match() {
        let mut parser = Osc7Parser::new();
        let result = parser.feed(b"normal terminal output with no OSC");
        assert_eq!(result, None);
    }

    #[test]
    fn test_percent_decode() {
        assert_eq!(percent_decode("/hello%20world"), "/hello world");
        assert_eq!(percent_decode("/no%2Fslash"), "/no/slash");
        assert_eq!(percent_decode("/plain"), "/plain");
        assert_eq!(percent_decode("%2F"), "/");
    }
}
