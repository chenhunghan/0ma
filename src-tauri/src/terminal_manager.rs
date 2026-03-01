use portable_pty::{CommandBuilder, MasterPty, NativePtySystem, PtySize, PtySystem};
use serde::Serialize;
use std::{
    collections::HashMap,
    io::{Read, Write},
    path::PathBuf,
    sync::{Arc, Mutex},
    thread,
};
use tauri::{ipc::Channel, AppHandle, Emitter, Manager, Runtime};

const HISTORY_SIZE: usize = 100 * 1024; // 100KB
const CWD_POLL_INTERVAL_MS: u64 = 300;

#[derive(Clone, Serialize)]
pub struct PtyEvent {
    pub data: String,
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
        cmd.env("TERM", "xterm-256color");
        // Suppress zsh's partial-line indicator (%) that appears before every prompt.
        // xterm.js correctly renders the standout attribute zsh uses for this marker,
        // making it visible — unlike some custom terminal renderers that don't.
        cmd.env("PROMPT_EOL_MARK", "");

        // Inject shell integration via ZDOTDIR so zsh emits OSC title sequences.
        // Our custom .zshenv restores ZDOTDIR and sources the user's .zshenv,
        // then our .zshrc sources the user's .zshrc and appends precmd/preexec hooks.
        if command == "zsh" || command.ends_with("/zsh") {
            if let Ok(integration_dir) = Self::ensure_zsh_integration(app) {
                let orig = std::env::var("ZDOTDIR")
                    .unwrap_or_else(|_| std::env::var("HOME").unwrap_or_default());
                cmd.env("_0MA_ORIG_ZDOTDIR", &orig);
                cmd.env("ZDOTDIR", integration_dir.to_string_lossy().as_ref());
            }
        }

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

        // For limactl shell sessions, inject title integration commands into
        // the remote shell via PTY stdin after a brief delay.  The delay lets
        // limactl/SSH set raw mode on the PTY so the write is not locally
        // echoed.  The remote shell will echo then execute the commands;
        // `clear` at the end wipes the transient output.
        //
        // We wrap the zsh branch in `eval '...'` so that bash (which must
        // parse the entire if/elif/fi) never encounters zsh-only syntax.
        if command == "limactl" && args.first().map(|a| a.as_str()) == Some("shell") {
            let writer = session.writer.clone();
            thread::spawn(move || {
                thread::sleep(std::time::Duration::from_millis(300));
                let setup = concat!(
                    " if [ -n \"$ZSH_VERSION\" ]; then",
                    " eval '",
                    "__0ma_precmd(){ print -Pn \"\\e]0;zsh\\a\" };",
                    " __0ma_preexec(){ print -Pn \"\\e]0;${1%% *}\\a\" };",
                    " precmd_functions+=(__0ma_precmd);",
                    " preexec_functions+=(__0ma_preexec)';",
                    " elif [ -n \"$BASH_VERSION\" ]; then",
                    // Append our title to PS1 so it renders AFTER any existing
                    // title sequence (e.g. Ubuntu's \u@\h:\w) — last one wins.
                    " PS1=\"$PS1\\[\\e]0;bash\\a\\]\";",
                    " trap 'printf \"\\e]0;%s\\a\" \"${BASH_COMMAND%% *}\"' DEBUG;",
                    " fi; clear\n",
                );
                if let Ok(mut w) = writer.lock() {
                    let _ = w.write_all(setup.as_bytes());
                    let _ = w.flush();
                }
            });
        }

        self.sessions
            .lock()
            .map_err(|e| e.to_string())?
            .insert(session_id.clone(), session);
        Ok(session_id)
    }

    /// Create the shell integration directory with `.zshenv` and `.zshrc` files.
    /// These files make zsh emit OSC escape sequences for the terminal title
    /// while transparently sourcing the user's own dotfiles.
    fn ensure_zsh_integration<R: Runtime>(app: &AppHandle<R>) -> Result<PathBuf, String> {
        let data_dir = app.path().app_data_dir().map_err(|e| e.to_string())?;
        let dir = data_dir.join("shell-integration").join("zsh");
        std::fs::create_dir_all(&dir).map_err(|e| e.to_string())?;

        // .zshenv: runs first — source user's .zshenv, keep ZDOTDIR pointed here
        // so zsh continues to read our .zshrc next.
        let zshenv_path = dir.join(".zshenv");
        let zshenv = concat!(
            "[[ -f \"${_0MA_ORIG_ZDOTDIR}/.zshenv\" ]] && ",
            "builtin source \"${_0MA_ORIG_ZDOTDIR}/.zshenv\"\n",
        );
        std::fs::write(&zshenv_path, zshenv).map_err(|e| e.to_string())?;

        // .zprofile: forward to user's .zprofile (important on macOS for PATH setup)
        let zprofile_path = dir.join(".zprofile");
        let zprofile = concat!(
            "[[ -f \"${_0MA_ORIG_ZDOTDIR}/.zprofile\" ]] && ",
            "builtin source \"${_0MA_ORIG_ZDOTDIR}/.zprofile\"\n",
        );
        std::fs::write(&zprofile_path, zprofile).map_err(|e| e.to_string())?;

        // .zshrc: restore ZDOTDIR, source user's .zshrc, then add title hooks.
        let zshrc_path = dir.join(".zshrc");
        let zshrc = concat!(
            "ZDOTDIR=\"${_0MA_ORIG_ZDOTDIR}\"\n",
            "[[ -f \"${_0MA_ORIG_ZDOTDIR}/.zshrc\" ]] && ",
            "builtin source \"${_0MA_ORIG_ZDOTDIR}/.zshrc\"\n",
            "\n",
            "# Terminal title integration\n",
            "__0ma_precmd() { print -Pn \"\\e]0;zsh\\a\" }\n",
            "__0ma_preexec() { print -Pn \"\\e]0;${1%% *}\\a\" }\n",
            "precmd_functions+=(__0ma_precmd)\n",
            "preexec_functions+=(__0ma_preexec)\n",
        );
        std::fs::write(&zshrc_path, zshrc).map_err(|e| e.to_string())?;

        Ok(dir)
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
}

// -- Tauri Commands --

#[tauri::command]
pub async fn spawn_pty_cmd(
    manager: tauri::State<'_, PtyManager>,
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
pub async fn attach_pty_cmd(
    manager: tauri::State<'_, PtyManager>,
    session_id: String,
    channel: Channel<PtyEvent>,
) -> Result<(), String> {
    manager.attach(&session_id, channel)
}

#[tauri::command]
pub async fn write_pty_cmd(
    manager: tauri::State<'_, PtyManager>,
    session_id: String,
    data: String,
) -> Result<(), String> {
    manager.write(&session_id, &data)
}

#[tauri::command]
pub async fn resize_pty_cmd(
    manager: tauri::State<'_, PtyManager>,
    session_id: String,
    rows: u16,
    cols: u16,
) -> Result<(), String> {
    manager.resize(&session_id, rows, cols)
}

#[tauri::command]
pub async fn close_pty_cmd(
    manager: tauri::State<'_, PtyManager>,
    session_id: String,
) -> Result<(), String> {
    manager.close(&session_id)
}
