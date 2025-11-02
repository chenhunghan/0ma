use std::fs;
use std::path::PathBuf;
use tauri::AppHandle;
use tauri::Manager;
use serde_yml::Value;

/// Get the kubeconfig directory path
/// /Users/you/Library/Application Support/chh.zeroma/kubeconfig
fn get_kubeconfig_dir(app: &AppHandle) -> Result<PathBuf, String> {
    let app_data_dir = app
        .path()
        .app_data_dir()
        .map_err(|e| format!("Failed to get app data directory: {}", e))?;

    let kubeconfig_dir = app_data_dir.join("kubeconfig");
    
    // Ensure the directory exists
    fs::create_dir_all(&kubeconfig_dir)
        .map_err(|e| format!("Failed to create kubeconfig directory: {}", e))?;

    Ok(kubeconfig_dir)
}

/// Replace template variables copyToHost[0].host to path
/// e.g. /Users/you/Library/Application Support/chh.zeroma/kubeconfig/[instance_name].yaml
fn replace_yaml_variables(
    app: &AppHandle,
    content: &str,
    instance_name: &str,
) -> Result<String, String> {
    let kubeconfig_dir = get_kubeconfig_dir(app)?;
    let kubeconfig_path = kubeconfig_dir.join(format!("{}.yaml", instance_name));
    
    // Parse the YAML content
    let mut yaml: Value = serde_yml::from_str(content)
        .map_err(|e| format!("Failed to parse YAML: {}", e))?;
    
    // Navigate to copyToHost[0].host and replace the template variable
    if let Some(copy_to_host) = yaml.get_mut("copyToHost") {
        if let Some(array) = copy_to_host.as_sequence_mut() {
            if let Some(first_item) = array.get_mut(0) {
                if let Some(host_value) = first_item.get_mut("host") {
                    // Replace the template variable with the actual path
                    *host_value = Value::String(kubeconfig_path.to_string_lossy().to_string());
                }
            }
        }
    }
    
    // Serialize back to YAML string
    serde_yml::to_string(&yaml)
        .map_err(|e| format!("Failed to serialize YAML: {}", e))
}

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

// Lima k0s YAML specific commands
#[tauri::command]
pub fn read_lima_k0s_yaml(app: AppHandle) -> Result<String, String> {
    read_yaml(&app, "lima-k0s.yaml", "k0s.yaml")
}

#[tauri::command]
pub fn write_lima_k0s_yaml(app: AppHandle, content: String) -> Result<(), String> {
    write_yaml(&app, "lima-k0s.yaml", content)
}

/// Write k0s YAML with variable replacement
/// This processes the content and replaces template variables with actual app paths
#[tauri::command]
pub fn write_lima_k0s_yaml_with_vars(
    app: AppHandle,
    content: String,
    instance_name: String,
) -> Result<(), String> {
    let processed_content = replace_yaml_variables(&app, &content, &instance_name)?;
    write_yaml(&app, "lima-k0s.yaml", processed_content)
}

#[tauri::command]
pub fn get_lima_k0s_yaml_path_cmd(app: AppHandle) -> Result<String, String> {
    let path = get_yaml_path(&app, "lima-k0s.yaml")?;
    Ok(path.to_string_lossy().to_string())
}

/// Get the kubeconfig path for a specific instance
#[tauri::command]
pub fn get_kubeconfig_path(app: AppHandle, instance_name: String) -> Result<String, String> {
    let kubeconfig_dir = get_kubeconfig_dir(&app)?;
    let kubeconfig_path = kubeconfig_dir.join(format!("{}.yaml", instance_name));
    Ok(kubeconfig_path.to_string_lossy().to_string())
}

#[tauri::command]
pub fn reset_lima_k0s_yaml(app: AppHandle) -> Result<(), String> {
    reset_yaml(&app, "lima-k0s.yaml", "k0s.yaml")
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

