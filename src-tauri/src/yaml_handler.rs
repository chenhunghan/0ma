use crate::find_lima_executable;
use serde_json::Value;
use std::fs;
use std::path::PathBuf;
use std::process::Command;
use tauri::{AppHandle, Manager};

/// Get Lima home directory from limactl info or fallback to ~/.lima
pub(crate) fn get_lima_home<R: tauri::Runtime>(app: &AppHandle<R>) -> Result<PathBuf, String> {
    // Try to get from limactl info
    if let Some(lima_cmd) = find_lima_executable() {
        if let Ok(output) = Command::new(&lima_cmd).args(["info"]).output() {
            if output.status.success() {
                if let Ok(json) = serde_json::from_slice::<Value>(&output.stdout) {
                    if let Some(lima_home) = json["limaHome"].as_str() {
                        return Ok(PathBuf::from(lima_home));
                    }
                }
            }
        }
    }

    // Fallback to default: ~/.lima (what Lima uses by default)
    let home = app
        .path()
        .home_dir()
        .map_err(|e| format!("Failed to get home directory: {}", e))?;
    Ok(home.join(".lima"))
}

/// Get the instance directory path from Lima's directory structure
/// ~/.lima/<instance_name> or $LIMA_HOME/<instance_name>
pub(crate) fn get_instance_dir<R: tauri::Runtime>(
    app: &AppHandle<R>,
    instance_name: &str,
) -> Result<PathBuf, String> {
    let lima_home = get_lima_home(app)?;
    let instance_dir = lima_home.join(instance_name);

    Ok(instance_dir)
}

/// Generic function to get the path to a YAML file in the instance directory
/// Uses Lima's native directory structure
/// e.g., ~/.lima/<instance_name>/<filename>.yaml or $LIMA_HOME/<instance_name>/<filename>.yaml
pub(crate) fn get_yaml_path<R: tauri::Runtime>(
    app: &AppHandle<R>,
    instance_name: &str,
    filename: &str,
) -> Result<PathBuf, String> {
    let instance_dir = get_instance_dir(app, instance_name)?;
    Ok(instance_dir.join(filename))
}

/// Generic function to write a YAML file for an instance
/// e.g. Write ~/.lima/<instance_name>/<filename>.yaml or $LIMA_HOME/<instance_name>/<filename>.yaml
pub(crate) fn write_yaml<R: tauri::Runtime>(
    app: &AppHandle<R>,
    instance_name: &str,
    filename: &str,
    content: String,
) -> Result<(), String> {
    let yaml_path = get_yaml_path(app, instance_name, filename)?;

    fs::write(&yaml_path, content).map_err(|e| format!("Failed to write {} file: {}", filename, e))
}
