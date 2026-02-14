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
const CWD_POLL_INTERVAL_MS: u64 = 300;

#[derive(Clone, Serialize)]
pub struct PtyEvent {
    pub data: String,
}

#[derive(Clone, Serialize)]
pub struct SessionRestoreData {
    #[serde(rename = "historyText")]
    pub history_text: Option<String>,
    pub cwd: Option<String>,
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

        let child = pair.slave.spawn_command(cmd).map_err(|e| e.to_string())?;
        let child_pid = child.process_id();
        drop(child);

        // We drop the slave explicitly so that we don't hold an open handle that prevents EOF
        drop(pair.slave);

        let reader = pair.master.try_clone_reader().map_err(|e| e.to_string())?;
        let writer = pair.master.take_writer().map_err(|e| e.to_string())?;

        let session = PtySession::new(pair.master, writer, cwd);
        let session_id = uuid::Uuid::new_v4().to_string();

        // Clone Arcs for the reader thread
        let subscribers = session.subscribers.clone();
        let history = session.history.clone();
        let sessions_arc = self.sessions.clone();
        let sid_clone = session_id.clone();
        let app_handle = app.clone();

        // Spawn reader thread
        thread::spawn(move || {
            let mut reader = reader;
            let mut buffer = [0u8; 4096];
            loop {
                match reader.read(&mut buffer) {
                    Ok(0) => break, // EOF
                    Ok(n) => {
                        let data = &buffer[0..n];

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
            let _ = app_handle.emit(
                "pty-exited",
                serde_json::json!({
                    "sessionId": sid_clone,
                }),
            );
            if let Ok(mut sessions) = sessions_arc.lock() {
                sessions.remove(&sid_clone);
            }
        });

        if let Some(raw_pid) = child_pid {
            let pid = sysinfo::Pid::from_u32(raw_pid);
            let cwd_arc = session.cwd.clone();
            let sid_for_cwd = session_id.clone();
            let app_handle_for_cwd = app.clone();

            // Poll the PTY process cwd directly instead of depending on OSC7 prompt sequences.
            thread::spawn(move || {
                let mut system = sysinfo::System::new();
                loop {
                    let target = [pid];
                    system.refresh_processes_specifics(
                        sysinfo::ProcessesToUpdate::Some(&target),
                        true,
                        sysinfo::ProcessRefreshKind::nothing()
                            .with_cwd(sysinfo::UpdateKind::Always),
                    );

                    let Some(process) = system.process(pid) else {
                        break;
                    };
                    let Some(next_cwd) = process.cwd().map(|p| p.to_string_lossy().to_string())
                    else {
                        thread::sleep(std::time::Duration::from_millis(CWD_POLL_INTERVAL_MS));
                        continue;
                    };

                    let mut changed = false;
                    if let Ok(mut cwd_guard) = cwd_arc.lock() {
                        if cwd_guard.as_deref() != Some(next_cwd.as_str()) {
                            *cwd_guard = Some(next_cwd.clone());
                            changed = true;
                        }
                    }
                    if changed {
                        let _ = app_handle_for_cwd.emit(
                            "pty-cwd-changed",
                            serde_json::json!({
                                "sessionId": sid_for_cwd.as_str(),
                                "cwd": next_cwd,
                            }),
                        );
                    }

                    thread::sleep(std::time::Duration::from_millis(CWD_POLL_INTERVAL_MS));
                }
            });
        }

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
            let mut subs = session.subscribers.lock().map_err(|e| e.to_string())?;
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
        let snapshots: Vec<(String, Vec<u8>, Option<String>)> = {
            let sessions = self.sessions.lock().map_err(|e| e.to_string())?;
            sessions
                .iter()
                .filter_map(|(sid, session)| {
                    let hist = session.history.lock().ok()?;
                    let cwd = session.cwd.lock().ok()?;
                    if hist.is_empty() && cwd.is_none() {
                        return None;
                    }
                    Some((sid.clone(), hist.clone(), cwd.clone()))
                })
                .collect()
        };

        for (session_id, history, cwd) in &snapshots {
            if !history.is_empty() {
                terminal_persistence::save_session_history(app_data_dir, session_id, history)?;
            }
            if cwd.is_some() {
                terminal_persistence::save_session_metadata(
                    app_data_dir,
                    session_id,
                    cwd.as_deref(),
                )?;
            }
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
pub fn load_session_history_cmd(app: AppHandle, session_id: String) -> Result<String, String> {
    use tauri::Manager;
    let app_data_dir = app.path().app_data_dir().map_err(|e| e.to_string())?;
    let bytes = terminal_persistence::load_session_history(&app_data_dir, &session_id)?;
    Ok(String::from_utf8_lossy(&bytes).to_string())
}

#[tauri::command]
pub fn load_session_restore_cmd(
    app: AppHandle,
    session_id: String,
) -> Result<SessionRestoreData, String> {
    use tauri::Manager;
    let app_data_dir = app.path().app_data_dir().map_err(|e| e.to_string())?;
    let history_text = terminal_persistence::load_session_history(&app_data_dir, &session_id)
        .ok()
        .map(|bytes| String::from_utf8_lossy(&bytes).to_string());
    let cwd = terminal_persistence::load_session_metadata(&app_data_dir, &session_id)
        .ok()
        .and_then(|metadata| metadata.cwd);
    Ok(SessionRestoreData { history_text, cwd })
}

#[tauri::command]
pub fn delete_session_history_cmd(app: AppHandle, session_id: String) -> Result<(), String> {
    use tauri::Manager;
    let app_data_dir = app.path().app_data_dir().map_err(|e| e.to_string())?;
    terminal_persistence::delete_session_history(&app_data_dir, &session_id)
}
