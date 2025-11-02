use std::fs;
use std::path::PathBuf;
use tauri::AppHandle;
use tauri::Manager;

/// Generic function to get the path to a YAML file in the app data directory
fn get_yaml_path(app: &AppHandle, filename: &str) -> Result<PathBuf, String> {
    let app_data_dir = app
        .path()
        .app_data_dir()
        .map_err(|e| format!("Failed to get app data directory: {}", e))?;

    // Ensure the directory exists
    fs::create_dir_all(&app_data_dir)
        .map_err(|e| format!("Failed to create app data directory: {}", e))?;

    Ok(app_data_dir.join(filename))
}

/// Generic function to get the bundled resource path for a YAML file
fn get_resource_path(app: &AppHandle, resource_filename: &str) -> Result<PathBuf, String> {
    app.path()
        .resource_dir()
        .map_err(|e| format!("Failed to get resource directory: {}", e))
        .map(|dir| dir.join("resources").join(resource_filename))
}

/// Generic function to ensure a YAML file exists by copying from resources if needed
fn ensure_yaml_exists(
    app: &AppHandle,
    app_filename: &str,
    resource_filename: &str,
) -> Result<(), String> {
    let yaml_path = get_yaml_path(app, app_filename)?;

    if !yaml_path.exists() {
        let resource_path = get_resource_path(app, resource_filename)?;
        fs::copy(&resource_path, &yaml_path)
            .map_err(|e| format!("Failed to copy {} from resources: {}", resource_filename, e))?;
    }

    Ok(())
}

/// Generic function to read a YAML file
fn read_yaml(app: &AppHandle, app_filename: &str, resource_filename: &str) -> Result<String, String> {
    ensure_yaml_exists(app, app_filename, resource_filename)?;
    let yaml_path = get_yaml_path(app, app_filename)?;

    fs::read_to_string(&yaml_path)
        .map_err(|e| format!("Failed to read {} file: {}", app_filename, e))
}

/// Generic function to write a YAML file
fn write_yaml(app: &AppHandle, app_filename: &str, content: String) -> Result<(), String> {
    let yaml_path = get_yaml_path(app, app_filename)?;

    fs::write(&yaml_path, content)
        .map_err(|e| format!("Failed to write {} file: {}", app_filename, e))
}

/// Generic function to reset a YAML file to its bundled version
fn reset_yaml(app: &AppHandle, app_filename: &str, resource_filename: &str) -> Result<(), String> {
    let yaml_path = get_yaml_path(app, app_filename)?;
    let resource_path = get_resource_path(app, resource_filename)?;

    fs::copy(&resource_path, &yaml_path)
        .map_err(|e| format!("Failed to reset {} from resources: {}", app_filename, e))?;

    Ok(())
}

// Lima k8s YAML specific commands
#[tauri::command]
pub fn read_lima_k8s_yaml(app: AppHandle) -> Result<String, String> {
    read_yaml(&app, "lima-k8s.yaml", "k8s.yaml")
}

#[tauri::command]
pub fn write_lima_k8s_yaml(app: AppHandle, content: String) -> Result<(), String> {
    write_yaml(&app, "lima-k8s.yaml", content)
}

#[tauri::command]
pub fn get_lima_k8s_yaml_path_cmd(app: AppHandle) -> Result<String, String> {
    let path = get_yaml_path(&app, "lima-k8s.yaml")?;
    Ok(path.to_string_lossy().to_string())
}

#[tauri::command]
pub fn reset_lima_k8s_yaml(app: AppHandle) -> Result<(), String> {
    reset_yaml(&app, "lima-k8s.yaml", "k8s.yaml")
}

// Example: You can easily add more YAML handlers like this:
// 
// #[tauri::command]
// pub fn read_lima_docker_yaml(app: AppHandle) -> Result<String, String> {
//     read_yaml(&app, "lima-docker.yaml", "docker.yaml")
// }
//
// #[tauri::command]
// pub fn write_lima_docker_yaml(app: AppHandle, content: String) -> Result<(), String> {
//     write_yaml(&app, "lima-docker.yaml", content)
// }
//
// #[tauri::command]
// pub fn get_lima_docker_yaml_path_cmd(app: AppHandle) -> Result<String, String> {
//     let path = get_yaml_path(&app, "lima-docker.yaml")?;
//     Ok(path.to_string_lossy().to_string())
// }
//
// #[tauri::command]
// pub fn reset_lima_docker_yaml(app: AppHandle) -> Result<(), String> {
//     reset_yaml(&app, "lima-docker.yaml", "docker.yaml")
// }

