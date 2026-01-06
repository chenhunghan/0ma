use portable_pty::{CommandBuilder, MasterPty, NativePtySystem, PtySize, PtySystem};
use serde::Serialize;
use std::{
    collections::HashMap,
    io::{Read, Write},
    sync::{Arc, Mutex},
    thread,
};
use tauri::{ipc::Channel, AppHandle, Runtime};

const HISTORY_SIZE: usize = 100 * 1024; // 100KB

#[derive(Clone, Serialize)]
pub struct PtyEvent {
    pub data: String,
}

struct PtySession {
    master: Box<dyn MasterPty + Send>,
    writer: Arc<Mutex<Box<dyn Write + Send>>>,
    subscribers: Arc<Mutex<Vec<Channel<PtyEvent>>>>,
    history: Arc<Mutex<Vec<u8>>>,
    // we keep the child handle to check status, though mostly we rely on the reader thread detecting EOF
    // child: Box<dyn Child + Send>,
}

impl PtySession {
    fn new(master: Box<dyn MasterPty + Send>, writer: Box<dyn Write + Send>) -> Self {
        Self {
            master,
            writer: Arc::new(Mutex::new(writer)),
            subscribers: Arc::new(Mutex::new(Vec::new())),
            history: Arc::new(Mutex::new(Vec::new())),
        }
    }

    #[allow(dead_code)]
    fn broadcast(&self, data: &[u8]) {
        let text = String::from_utf8_lossy(data).to_string();
        let event = PtyEvent { data: text };

        if let Ok(mut subs) = self.subscribers.lock() {
            // retain only channels that accept the message
            subs.retain(|chan| chan.send(event.clone()).is_ok());
        }
    }

    #[allow(dead_code)]
    fn append_history(&self, data: &[u8]) {
        if let Ok(mut hist) = self.history.lock() {
            hist.extend_from_slice(data);
            if hist.len() > HISTORY_SIZE {
                let overflow = hist.len() - HISTORY_SIZE;
                hist.drain(0..overflow);
            }
        }
    }
}

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
        _app: &AppHandle<R>,
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
        if let Some(dir) = cwd {
            cmd.cwd(dir);
        }

        let _child = pair.slave.spawn_command(cmd).map_err(|e| e.to_string())?;

        // We drop the slave explicitly so that we don't hold an open handle that prevents EOF
        drop(pair.slave);

        let reader = pair.master.try_clone_reader().map_err(|e| e.to_string())?;
        let writer = pair.master.take_writer().map_err(|e| e.to_string())?;

        let session = PtySession::new(pair.master, writer);
        let session_id = uuid::Uuid::new_v4().to_string();

        // Clone Arcs for the thread
        let subscribers = session.subscribers.clone();
        let history = session.history.clone();

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
            // Cleanup could happen here or lazily
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

            // 2. Add to subscribers
            session
                .subscribers
                .lock()
                .map_err(|e| e.to_string())?
                .push(channel);
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
