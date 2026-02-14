use serde::{Deserialize, Serialize};
use std::fs;
use std::path::PathBuf;
use std::time::{Duration, SystemTime};

pub fn sessions_dir(app_data_dir: &PathBuf) -> PathBuf {
    app_data_dir.join("terminal-sessions")
}

fn session_history_path(app_data_dir: &PathBuf, session_id: &str) -> PathBuf {
    sessions_dir(app_data_dir).join(format!("{}.history", session_id))
}

fn session_metadata_path(app_data_dir: &PathBuf, session_id: &str) -> PathBuf {
    sessions_dir(app_data_dir).join(format!("{}.meta.json", session_id))
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SessionMetadata {
    pub cwd: Option<String>,
}

pub fn save_session_history(
    app_data_dir: &PathBuf,
    session_id: &str,
    history: &[u8],
) -> Result<(), String> {
    let dir = sessions_dir(app_data_dir);
    fs::create_dir_all(&dir).map_err(|e| e.to_string())?;

    let history_path = session_history_path(app_data_dir, session_id);
    fs::write(&history_path, history).map_err(|e| e.to_string())?;

    Ok(())
}

pub fn load_session_history(app_data_dir: &PathBuf, session_id: &str) -> Result<Vec<u8>, String> {
    let path = session_history_path(app_data_dir, session_id);
    fs::read(&path).map_err(|e| e.to_string())
}

pub fn save_session_metadata(
    app_data_dir: &PathBuf,
    session_id: &str,
    cwd: Option<&str>,
) -> Result<(), String> {
    let dir = sessions_dir(app_data_dir);
    fs::create_dir_all(&dir).map_err(|e| e.to_string())?;

    let metadata = SessionMetadata {
        cwd: cwd.map(ToOwned::to_owned),
    };
    let path = session_metadata_path(app_data_dir, session_id);
    let bytes = serde_json::to_vec(&metadata).map_err(|e| e.to_string())?;
    fs::write(path, bytes).map_err(|e| e.to_string())
}

pub fn load_session_metadata(
    app_data_dir: &PathBuf,
    session_id: &str,
) -> Result<SessionMetadata, String> {
    let path = session_metadata_path(app_data_dir, session_id);
    let bytes = fs::read(path).map_err(|e| e.to_string())?;
    serde_json::from_slice::<SessionMetadata>(&bytes).map_err(|e| e.to_string())
}

pub fn delete_session_history(app_data_dir: &PathBuf, session_id: &str) -> Result<(), String> {
    let history_path = session_history_path(app_data_dir, session_id);
    if history_path.exists() {
        fs::remove_file(&history_path).map_err(|e| e.to_string())?;
    }

    let metadata_path = session_metadata_path(app_data_dir, session_id);
    if metadata_path.exists() {
        fs::remove_file(&metadata_path).map_err(|e| e.to_string())?;
    }
    Ok(())
}

pub fn cleanup_old_histories(app_data_dir: &PathBuf, max_age: Duration) {
    let dir = sessions_dir(app_data_dir);
    let entries = match fs::read_dir(&dir) {
        Ok(entries) => entries,
        Err(_) => return,
    };

    let now = SystemTime::now();
    for entry in entries.flatten() {
        let path = entry.path();
        let file_name = path.file_name().and_then(|f| f.to_str());
        if !file_name.is_some_and(|name| name.ends_with(".history")) {
            continue;
        }
        if let Ok(metadata) = entry.metadata() {
            if let Ok(modified) = metadata.modified() {
                if let Ok(age) = now.duration_since(modified) {
                    if age > max_age {
                        log::info!("Cleaning up old session history: {:?}", path);
                        let _ = fs::remove_file(&path);
                        if let Some(session_id) =
                            file_name.and_then(|name| name.strip_suffix(".history"))
                        {
                            let metadata_path = session_metadata_path(app_data_dir, session_id);
                            let _ = fs::remove_file(metadata_path);
                        }
                    }
                }
            }
        }
    }
}
