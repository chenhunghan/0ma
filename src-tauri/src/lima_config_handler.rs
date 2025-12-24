use tauri::AppHandle;
use crate::lima_config::{LimaConfig, get_default_k0s_lima_config};
use crate::yaml_handler::{get_instance_dir, get_yaml_path, write_yaml};

/// The standard filename for Lima configuration for an instance
const LIMA_CONFIG_FILENAME: &str = "lima.yaml";
/// The standard filename for kubeconfig file for an instance
const KUBECONFIG_FILENAME: &str = "kubeconfig.yaml";

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

/// Write YAML with for a specific instance (internal)
pub fn write_lima_yaml(
    app: &AppHandle,
    config: &LimaConfig,
    instance_name: &str,
) -> Result<(), String> {
    // Write the config
    let yaml_content = config.to_yaml_pretty()
        .map_err(|e| format!("Failed to serialize YAML: {}", e))?;
    write_yaml(app, instance_name, LIMA_CONFIG_FILENAME, yaml_content)
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
pub fn get_lima_yaml_path(app: &AppHandle, instance_name: &str) -> Result<std::path::PathBuf, String> {
    get_yaml_path(app, instance_name, LIMA_CONFIG_FILENAME)
}

#[tauri::command]
pub fn get_lima_yaml_path_cmd(app: AppHandle, instance_name: String) -> Result<String, String> {
    let path = get_lima_yaml_path(&app, &instance_name)?;
    Ok(path.to_string_lossy().to_string())
}

// Reset the instance's Lima YAML configuration to the default k0s config
#[tauri::command]
pub fn reset_lima_yaml_cmd(app: AppHandle, instance_name: String) -> Result<LimaConfig, String> {
    // Generate the default config
    let default_config = get_default_k0s_lima_config(&app, &instance_name)?;
    
    // Write it to disk
    write_lima_yaml(&app, &default_config, &instance_name)?;
    
    // Return the config
    Ok(default_config)
}

/// Get the kubeconfig path for a specific instance (internal)
pub(crate) fn get_kubeconfig_path_internal(app: &AppHandle, instance_name: &str) -> Result<std::path::PathBuf, String> {
    let instance_dir = get_instance_dir(app, instance_name)?;
    Ok(instance_dir.join(KUBECONFIG_FILENAME))
}

/// Get the kubeconfig path for a specific instance
#[tauri::command]
pub fn get_kubeconfig_path_cmd(app: AppHandle, instance_name: String) -> Result<String, String> {
    let kubeconfig_path = get_kubeconfig_path_internal(&app, &instance_name)?;
    Ok(kubeconfig_path.to_string_lossy().to_string())
}

/// Convert LimaConfig to YAML string for display
#[tauri::command]
pub fn convert_config_to_yaml_cmd(config: LimaConfig) -> Result<String, String> {
    config.to_yaml_pretty()
        .map_err(|e| format!("Failed to convert config to YAML: {}", e))
}
