use std::fs;
use std::path::PathBuf;
use tauri::{AppHandle, Manager};

/// Get the instance directory path
/// + Ensures the directory exists
/// /Users/you/Library/Application Support/chh.zeroma/<instance_name>
pub(crate) fn get_instance_dir(app: &AppHandle, instance_name: &str) -> Result<PathBuf, String> {
    let app_data_dir = app
        .path()
        .app_data_dir()
        .map_err(|e| format!("Failed to get app data directory: {}", e))?;

    let instance_dir = app_data_dir.join(instance_name);
    
    // Ensure the directory exists
    fs::create_dir_all(&instance_dir)
        .map_err(|e| format!("Failed to create instance directory: {}", e))?;

    Ok(instance_dir)
}

/// Generic function to get the path to a YAML file in the instance directory
/// This is where the app stores its YAML files per instance
/// e.g., /Users/you/Library/Application Support/chh.zeroma/<instance_name>/<filename>.yaml
pub(crate) fn get_yaml_path(app: &AppHandle, instance_name: &str, filename: &str) -> Result<PathBuf, String> {
    let instance_dir = get_instance_dir(app, instance_name)?;
    Ok(instance_dir.join(filename))
}

/// Generic function to write a YAML file for an instance
/// e.g. Write /Users/you/Library/Application Support/chh.zeroma/<instance_name>/<filename>.yaml
pub(crate) fn write_yaml(app: &AppHandle, instance_name: &str, filename: &str, content: String) -> Result<(), String> {
    let yaml_path = get_yaml_path(app, instance_name, filename)?;

    fs::write(&yaml_path, content)
        .map_err(|e| format!("Failed to write {} file: {}", filename, e))
}