use tauri::AppHandle;
use crate::lima_config::{LimaConfig, get_default_k0s_lima_config};
use crate::lima_config_service::{get_lima_yaml_path, get_kubeconfig_path, write_lima_yaml};

/// Read the Lima YAML configuration (LIMA_CONFIG_FILENAME) for a specific instance by instance name
/// If the file does not exist, generate the default k0s config
#[tauri::command]
pub fn read_lima_yaml_cmd(app: AppHandle, instance_name: String) -> Result<LimaConfig, String> {
    let yaml_path = get_lima_yaml_path(&app, &instance_name)?;
    
    // If the file exists, read it
    if yaml_path.exists() {
        let yaml_content = std::fs::read_to_string(&yaml_path)
            .map_err(|e| format!("Failed to read lima.yaml: {}", e))?;
        return LimaConfig::from_yaml(&yaml_content)
            .map_err(|e| format!("Failed to parse YAML: {}", e));
    }
    
    // Otherwise, generate and return the default config
    get_default_k0s_lima_config(&app, &instance_name)
}

/// Write YAML with for a specific instance
#[tauri::command]
pub fn write_lima_yaml_cmd(
    app: AppHandle,
    config: LimaConfig,
    instance_name: String,
) -> Result<(), String> {
    write_lima_yaml(&app, &config, &instance_name)
}

/// Get the path to the Lima YAML configuration file for an instance
#[tauri::command]
pub fn get_lima_yaml_path_cmd(app: AppHandle, instance_name: String) -> Result<String, String> {
    let path = get_lima_yaml_path(&app, &instance_name)?;
    Ok(path.to_string_lossy().to_string())
}

/// Reset the instance's Lima YAML configuration to the default k0s config
#[tauri::command]
pub fn reset_lima_yaml_cmd(app: AppHandle, instance_name: String) -> Result<LimaConfig, String> {
    // Generate the default config
    let default_config = get_default_k0s_lima_config(&app, &instance_name)?;
    
    // Write it to disk
    write_lima_yaml(&app, &default_config, &instance_name)?;
    
    // Return the config
    Ok(default_config)
}

/// Get the default k0s Lima configuration for an instance
#[tauri::command]
pub fn get_default_k0s_lima_config_yaml_cmd(app: AppHandle, instance_name: String) -> Result<LimaConfig, String> {
    get_default_k0s_lima_config(&app, &instance_name)
}

/// Get the kubeconfig path for a specific instance
#[tauri::command]
pub fn get_kubeconfig_path_cmd(app: AppHandle, instance_name: String) -> Result<String, String> {
    let kubeconfig_path = get_kubeconfig_path(&app, &instance_name)?;
    Ok(kubeconfig_path.to_string_lossy().to_string())
}

/// Convert LimaConfig to YAML string for display
#[tauri::command]
pub fn convert_config_to_yaml_cmd(config: LimaConfig) -> Result<String, String> {
    config.to_yaml_pretty()
        .map_err(|e| format!("Failed to convert config to YAML: {}", e))
}

