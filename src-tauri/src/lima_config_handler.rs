use tauri::AppHandle;
use crate::lima_config::{LimaConfig, TemplateVars};
use crate::yaml_handler::{get_instance_dir, get_yaml_path, read_yaml, write_yaml, reset_yaml};

const MANAGED_DEFAULT_K0S_CONFIG_FILENAME: &str = "k0s.yaml";
/// The standard filename for Lima configuration for an instance
const LIMA_CONFIG_FILENAME: &str = "lima.yaml";
/// The standard filename for kubeconfig file for an instance
const KUBECONFIG_FILENAME: &str = "kubeconfig.yaml";

// Read the Lima YAML configuration (LIMA_CONFIG_FILENAME) for a specific instance by instance name
#[tauri::command]
pub fn read_lima_yaml(app: AppHandle, instance_name: String) -> Result<LimaConfig, String> {
    // Read the YAML content of instance's LIMA_CONFIG_FILENAME
    // Falls back to copying from managed default MANAGED_DEFAULT_K0S_CONFIG_FILENAME if the config is not present
    let yaml_content = read_yaml(&app, &instance_name, LIMA_CONFIG_FILENAME, MANAGED_DEFAULT_K0S_CONFIG_FILENAME)?;
    LimaConfig::from_yaml(&yaml_content)
        .map_err(|e| format!("Failed to parse YAML: {}", e))
}


#[tauri::command]
pub fn write_lima_yaml(app: AppHandle, instance_name: String, config: LimaConfig) -> Result<(), String> {
    let yaml_content = config.to_yaml_pretty()
        .map_err(|e| format!("Failed to serialize YAML: {}", e))?;
    write_yaml(&app, &instance_name, LIMA_CONFIG_FILENAME, yaml_content)
}

#[tauri::command]
pub fn get_lima_yaml_path_cmd(app: AppHandle, instance_name: String) -> Result<String, String> {
    let path = get_yaml_path(&app, &instance_name, LIMA_CONFIG_FILENAME)?;
    Ok(path.to_string_lossy().to_string())
}

// Reset the instance's Lima YAML configuration (LIMA_CONFIG_FILENAME) to the default managed MANAGED_DEFAULT_K0S_CONFIG_FILENAME for a specific instance
#[tauri::command]
pub fn reset_lima_yaml(app: AppHandle, instance_name: String) -> Result<LimaConfig, String> {
    reset_yaml(&app, &instance_name, LIMA_CONFIG_FILENAME, MANAGED_DEFAULT_K0S_CONFIG_FILENAME)?;
    read_lima_yaml(app, instance_name)
}

/// Write YAML with variable replacement
/// This processes the content and replaces template variables with actual app paths
#[tauri::command]
pub fn write_lima_yaml_with_vars(
    app: AppHandle,
    mut config: LimaConfig,
    instance_name: String,
) -> Result<(), String> {
    // Get the instance directory path
    let instance_dir = get_instance_dir(&app, &instance_name)?;
    let kubeconfig_path = instance_dir.join(KUBECONFIG_FILENAME);

    // Create template variables
    let vars = TemplateVars {
        dir: instance_dir.to_string_lossy().to_string(),
        home: std::env::var("HOME").unwrap_or_else(|_| "/home/user".to_string()),
        user: std::env::var("USER").unwrap_or_else(|_| "user".to_string()),
    };

    // Update the first copyToHost entry with the specific kubeconfig path
    if let Some(copy_to_host) = &mut config.copy_to_host {
        if !copy_to_host.is_empty() {
            copy_to_host[0].host = kubeconfig_path.to_string_lossy().to_string();
        }
    }

    // Substitute other template variables
    config.substitute_variables(&vars);

    // Write the config
    write_lima_yaml(app, instance_name, config)
}

/// Get the kubeconfig path for a specific instance
#[tauri::command]
pub fn get_kubeconfig_path(app: AppHandle, instance_name: String) -> Result<String, String> {
    let instance_dir = get_instance_dir(&app, &instance_name)?;
    let kubeconfig_path = instance_dir.join(KUBECONFIG_FILENAME);
    Ok(kubeconfig_path.to_string_lossy().to_string())
}

#[tauri::command]
pub fn reset_lima_k0s_yaml(app: AppHandle, instance_name: String) -> Result<LimaConfig, String> {
    reset_lima_yaml(app, instance_name)
}

/// Convert LimaConfig to YAML string for display
#[tauri::command]
pub fn convert_config_to_yaml(config: LimaConfig) -> Result<String, String> {
    config.to_yaml_pretty()
        .map_err(|e| format!("Failed to convert config to YAML: {}", e))
}
