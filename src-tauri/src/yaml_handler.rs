use std::fs;
use std::path::PathBuf;
use tauri::AppHandle;
use tauri::Manager;

/// Get the path to the Lima k8s YAML file in the app data directory
fn get_lima_k8s_yaml_path(app: &AppHandle) -> Result<PathBuf, String> {
    let app_data_dir = app
        .path()
        .app_data_dir()
        .map_err(|e| format!("Failed to get app data directory: {}", e))?;

    // Ensure the directory exists
    fs::create_dir_all(&app_data_dir)
        .map_err(|e| format!("Failed to create app data directory: {}", e))?;

    Ok(app_data_dir.join("lima-k8s.yaml"))
}

/// Initialize the Lima k8s YAML file by copying from resources if it doesn't exist
fn ensure_lima_k8s_yaml_exists(app: &AppHandle) -> Result<(), String> {
    let lima_k8s_yaml_path = get_lima_k8s_yaml_path(app)?;

    if !lima_k8s_yaml_path.exists() {
        // Get the bundled resource path
        let resource_path = app
            .path()
            .resource_dir()
            .map_err(|e| format!("Failed to get resource directory: {}", e))?
            .join("resources")
            .join("k8s.yaml");

        // Copy the default Lima k8s YAML to the app data directory
        fs::copy(&resource_path, &lima_k8s_yaml_path)
            .map_err(|e| format!("Failed to copy lima-k8s.yaml: {}", e))?;
    }

    Ok(())
}

#[tauri::command]
pub fn read_lima_k8s_yaml(app: AppHandle) -> Result<String, String> {
    ensure_lima_k8s_yaml_exists(&app)?;
    let lima_k8s_yaml_path = get_lima_k8s_yaml_path(&app)?;

    fs::read_to_string(&lima_k8s_yaml_path)
        .map_err(|e| format!("Failed to read lima-k8s.yaml file: {}", e))
}

#[tauri::command]
pub fn write_lima_k8s_yaml(app: AppHandle, content: String) -> Result<(), String> {
    let lima_k8s_yaml_path = get_lima_k8s_yaml_path(&app)?;

    fs::write(&lima_k8s_yaml_path, content)
        .map_err(|e| format!("Failed to write lima-k8s.yaml file: {}", e))
}

#[tauri::command]
pub fn get_lima_k8s_yaml_path_cmd(app: AppHandle) -> Result<String, String> {
    let path = get_lima_k8s_yaml_path(&app)?;
    Ok(path.to_string_lossy().to_string())
}

#[tauri::command]
pub fn reset_lima_k8s_yaml(app: AppHandle) -> Result<(), String> {
    let lima_k8s_yaml_path = get_lima_k8s_yaml_path(&app)?;

    // Get the bundled resource path
    let resource_path = app
        .path()
        .resource_dir()
        .map_err(|e| format!("Failed to get resource directory: {}", e))?
        .join("resources")
        .join("k8s.yaml");

    // Copy the bundled k8s.yaml to the app data directory, overwriting existing file
    fs::copy(&resource_path, &lima_k8s_yaml_path)
        .map_err(|e| format!("Failed to reset lima-k8s.yaml: {}", e))?;

    Ok(())
}
