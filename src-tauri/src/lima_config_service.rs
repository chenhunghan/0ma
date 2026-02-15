use crate::lima_config::LimaConfig;
use crate::yaml_handler::{get_yaml_path, write_yaml};
use tauri::AppHandle;

/// The standard filename for Lima configuration for an instance
/// limactl uses `~/.lima/<instance_name>/lima.yaml` by default
const LIMA_CONFIG_FILENAME: &str = "lima.yaml";

/// Write YAML with for a specific instance (internal)
pub fn write_lima_yaml<R: tauri::Runtime>(
    app: &AppHandle<R>,
    config: &LimaConfig,
    instance_name: &str,
) -> Result<(), String> {
    // Write the config
    let yaml_content = config
        .to_yaml_pretty()
        .map_err(|e| format!("Failed to serialize YAML: {}", e))?;
    write_yaml(app, instance_name, LIMA_CONFIG_FILENAME, yaml_content)
}

/// Get the path to the Lima YAML configuration file for an instance
pub fn get_lima_yaml_path<R: tauri::Runtime>(
    app: &AppHandle<R>,
    instance_name: &str,
) -> Result<std::path::PathBuf, String> {
    get_yaml_path(app, instance_name, LIMA_CONFIG_FILENAME)
}

/// Get the kubeconfig path for a specific instance (internal)
/// Uses Lima instance directory: ~/.lima/<instance_name>/kubeconfig.yaml
pub fn get_kubeconfig_path<R: tauri::Runtime>(
    app: &AppHandle<R>,
    instance_name: &str,
) -> Result<std::path::PathBuf, String> {
    let instance_dir = crate::yaml_handler::get_instance_dir(app, instance_name)?;
    Ok(instance_dir.join("kubeconfig.yaml"))
}
