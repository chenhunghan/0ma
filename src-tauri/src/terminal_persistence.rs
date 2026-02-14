use std::fs;
use std::path::PathBuf;
use std::time::{Duration, SystemTime};

pub fn sessions_dir(app_data_dir: &PathBuf) -> PathBuf {
    app_data_dir.join("terminal-sessions")
}

pub fn save_session_history(
    app_data_dir: &PathBuf,
    session_id: &str,
    history: &[u8],
) -> Result<(), String> {
    let dir = sessions_dir(app_data_dir);
    fs::create_dir_all(&dir).map_err(|e| e.to_string())?;

    let history_path = dir.join(format!("{}.history", session_id));
    fs::write(&history_path, history).map_err(|e| e.to_string())?;

    Ok(())
}

pub fn load_session_history(
    app_data_dir: &PathBuf,
    session_id: &str,
) -> Result<Vec<u8>, String> {
    let path = sessions_dir(app_data_dir).join(format!("{}.history", session_id));
    fs::read(&path).map_err(|e| e.to_string())
}

pub fn delete_session_history(
    app_data_dir: &PathBuf,
    session_id: &str,
) -> Result<(), String> {
    let path = sessions_dir(app_data_dir).join(format!("{}.history", session_id));
    if path.exists() {
        fs::remove_file(&path).map_err(|e| e.to_string())?;
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
        if path.extension().and_then(|e| e.to_str()) != Some("history") {
            continue;
        }
        if let Ok(metadata) = entry.metadata() {
            if let Ok(modified) = metadata.modified() {
                if let Ok(age) = now.duration_since(modified) {
                    if age > max_age {
                        log::info!("Cleaning up old session history: {:?}", path);
                        let _ = fs::remove_file(&path);
                    }
                }
            }
        }
    }
}
