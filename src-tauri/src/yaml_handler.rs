use std::fs;
use std::path::PathBuf;
use std::process::{Stdio, Command as StdCommand};
use std::collections::HashMap;
use tauri::{AppHandle, Manager, Emitter};
use tokio::io::{AsyncBufReadExt, BufReader};
use tokio::process::Command as TokioCommand;
use serde::{Deserialize, Serialize};
use crate::lima_config::{LimaConfig, TemplateVars};

/// Instance registry to track ZeroMa-managed instances
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct InstanceInfo {
    pub name: String,
    pub created_at: String,
    pub config_path: String,
    pub status: Option<String>,
}

impl InstanceInfo {
    pub fn new(name: String, config_path: String) -> Self {
        use std::time::{SystemTime, UNIX_EPOCH};
        let timestamp = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .unwrap_or_default()
            .as_secs();
        Self {
            name,
            created_at: timestamp.to_string(),
            config_path,
            status: None,
        }
    }
}

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

/// Generic function to get the path to a YAML file in the app data directory
/// This is where the app stores its managed YAML files
/// e.g., /Users/you/Library/Application Support/chh.zeroma/lima.yaml
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

/// Get the path to the instance registry file
fn get_instance_registry_path(app: &AppHandle) -> Result<PathBuf, String> {
    let app_data_dir = app
        .path()
        .app_data_dir()
        .map_err(|e| format!("Failed to get app data directory: {}", e))?;

    Ok(app_data_dir.join("instances.json"))
}

/// Load the instance registry
fn load_instance_registry(app: &AppHandle) -> Result<HashMap<String, InstanceInfo>, String> {
    let registry_path = get_instance_registry_path(app)?;

    if registry_path.exists() {
        let content = fs::read_to_string(&registry_path)
            .map_err(|e| format!("Failed to read instance registry: {}", e))?;
        serde_json::from_str(&content)
            .map_err(|e| format!("Failed to parse instance registry: {}", e))
    } else {
        Ok(HashMap::new())
    }
}

/// Save the instance registry
fn save_instance_registry(app: &AppHandle, registry: &HashMap<String, InstanceInfo>) -> Result<(), String> {
    let registry_path = get_instance_registry_path(app)?;

    // Ensure parent directory exists
    if let Some(parent) = registry_path.parent() {
        fs::create_dir_all(parent)
            .map_err(|e| format!("Failed to create instance registry directory: {}", e))?;
    }

    let content = serde_json::to_string_pretty(registry)
        .map_err(|e| format!("Failed to serialize instance registry: {}", e))?;

    fs::write(&registry_path, content)
        .map_err(|e| format!("Failed to write instance registry: {}", e))
}

/// Register a new instance
fn register_instance(app: &AppHandle, instance_info: InstanceInfo) -> Result<(), String> {
    let mut registry = load_instance_registry(app)?;
    registry.insert(instance_info.name.clone(), instance_info);
    save_instance_registry(app, &registry)
}

/// Unregister an instance
fn unregister_instance(app: &AppHandle, instance_name: &str) -> Result<(), String> {
    let mut registry = load_instance_registry(app)?;
    registry.remove(instance_name);
    save_instance_registry(app, &registry)
}

/// Get the status of a specific Lima instance
fn get_instance_status(instance_name: &str) -> Result<String, String> {
    let output = StdCommand::new("limactl")
        .args(["list", "--format", "{{.Status}}", instance_name])
        .output()
        .map_err(|e| format!("Failed to run limactl list: {}", e))?;

    if output.status.success() {
        let status = String::from_utf8_lossy(&output.stdout).trim().to_string();
        Ok(if status.is_empty() { "Unknown".to_string() } else { status.to_string() })
    } else {
        // If command fails with non-zero exit, instance doesn't exist
        Err(format!("Instance '{}' not found", instance_name))
    }
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

// Lima YAML specific commands (using k0s)
#[tauri::command]
pub fn read_lima_yaml(app: AppHandle) -> Result<LimaConfig, String> {
    let yaml_content = read_yaml(&app, "lima.yaml", "k0s.yaml")?;
    LimaConfig::from_yaml(&yaml_content)
        .map_err(|e| format!("Failed to parse YAML: {}", e))
}

#[tauri::command]
pub fn write_lima_yaml(app: AppHandle, config: LimaConfig) -> Result<(), String> {
    let yaml_content = config.to_yaml_pretty()
        .map_err(|e| format!("Failed to serialize YAML: {}", e))?;
    write_yaml(&app, "lima.yaml", yaml_content)
}

#[tauri::command]
pub fn get_lima_yaml_path_cmd(app: AppHandle) -> Result<String, String> {
    let path = get_yaml_path(&app, "lima.yaml")?;
    Ok(path.to_string_lossy().to_string())
}

#[tauri::command]
pub fn reset_lima_yaml(app: AppHandle) -> Result<LimaConfig, String> {
    reset_yaml(&app, "lima.yaml", "k0s.yaml")?;
    read_lima_yaml(app)
}

/// Write YAML with variable replacement
/// This processes the content and replaces template variables with actual app paths
#[tauri::command]
pub fn write_lima_yaml_with_vars(
    app: AppHandle,
    mut config: LimaConfig,
    instance_name: String,
) -> Result<(), String> {
    // Get the kubeconfig directory path
    let kubeconfig_dir = get_kubeconfig_dir(&app)?;
    let kubeconfig_path = kubeconfig_dir.join(format!("{}.yaml", instance_name));

    // Create template variables
    let vars = TemplateVars {
        dir: kubeconfig_dir.parent().unwrap().to_string_lossy().to_string(),
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
    write_lima_yaml(app, config)
}

/// Get the kubeconfig path for a specific instance
#[tauri::command]
pub fn get_kubeconfig_path(app: AppHandle, instance_name: String) -> Result<String, String> {
    let kubeconfig_dir = get_kubeconfig_dir(&app)?;
    let kubeconfig_path = kubeconfig_dir.join(format!("{}.yaml", instance_name));
    Ok(kubeconfig_path.to_string_lossy().to_string())
}

#[tauri::command]
pub fn reset_lima_k0s_yaml(app: AppHandle) -> Result<LimaConfig, String> {
    reset_lima_yaml(app)
}

/// Convert LimaConfig to YAML string for display
#[tauri::command]
pub fn convert_config_to_yaml(config: LimaConfig) -> Result<String, String> {
    config.to_yaml_pretty()
        .map_err(|e| format!("Failed to convert config to YAML: {}", e))
}

/// Create a Lima instance using the managed configuration
/// This handler uses the stored k0s config file and runs limactl start
/// It streams the output back to the frontend via Tauri events
#[tauri::command]
pub async fn create_lima_instance(
    app: AppHandle,
    config: LimaConfig,
    instance_name: String,
) -> Result<String, String> {
    // Use the provided instance name directly - it's required

    // Write the config with variable substitution (required for k0s)
    write_lima_yaml_with_vars(app.clone(), config.clone(), instance_name.clone())?;

    // Get the path to the stored config file
    let config_path = get_yaml_path(&app, "lima.yaml")
        .map_err(|e| format!("Failed to get Lima config path: {}", e))?;

    // Register the instance in our registry
    let instance_info = InstanceInfo::new(instance_name.clone(), config_path.to_string_lossy().to_string());
    register_instance(&app, instance_info)
        .map_err(|e| format!("Failed to register instance: {}", e))?;

    // Emit start event
    app.emit("lima-instance-start", &format!("Starting Lima instance '{}'...", instance_name))
        .map_err(|e| format!("Failed to emit start event: {}", e))?;

    // Spawn async task to run limactl and stream output
    let app_handle = app.clone();
    let instance_name_clone = instance_name.clone();
    let config_path_clone = config_path.clone();

    tokio::spawn(async move {
        // Run limactl start command with the stored config file and explicit instance name
        let child = TokioCommand::new("limactl")
            .args([
                "start",
                "--name", &instance_name_clone,
                &config_path_clone.to_string_lossy()
            ])
            .stdout(Stdio::piped())
            .stderr(Stdio::piped())
            .spawn()
            .map_err(|e| format!("Failed to start limactl process: {}", e));

        let mut child = match child {
            Ok(c) => c,
            Err(e) => {
                let _ = app_handle.emit("lima-instance-error", &e.to_string());
                return;
            }
        };

        // Stream stdout
        if let Some(stdout) = child.stdout.take() {
            let app_handle_stdout = app_handle.clone();
            tokio::spawn(async move {
                let mut reader = BufReader::new(stdout).lines();
                while let Ok(Some(line)) = reader.next_line().await {
                    let _ = app_handle_stdout.emit("lima-instance-output", &line);
                }
            });
        }

        // Stream stderr
        if let Some(stderr) = child.stderr.take() {
            let app_handle_stderr = app_handle.clone();
            tokio::spawn(async move {
                let mut reader = BufReader::new(stderr).lines();
                while let Ok(Some(line)) = reader.next_line().await {
                    let _ = app_handle_stderr.emit("lima-instance-output", &format!("ERROR: {}", line));
                }
            });
        }

        // Wait for process to complete
        match child.wait().await {
            Ok(status) => {
                if status.success() {
                    let success_msg = format!("Lima instance '{}' started successfully!", instance_name_clone);
                    let _ = app_handle.emit("lima-instance-success", &success_msg);
                } else {
                    let error_msg = format!("Failed to start Lima instance. Exit code: {:?}", status.code());
                    let _ = app_handle.emit("lima-instance-error", &error_msg);
                }
            }
            Err(e) => {
                let error_msg = format!("Failed to wait for limactl process: {}", e);
                let _ = app_handle.emit("lima-instance-error", &error_msg);
            }
        }
    });

    Ok(instance_name)
}

/// Stop a Lima instance
/// This handler runs limactl stop and streams the output back to the frontend via Tauri events
#[tauri::command]
pub async fn stop_lima_instance(
    app: AppHandle,
    instance_name: String,
) -> Result<String, String> {
    // Emit stop event
    app.emit("lima-instance-stop", &format!("Stopping Lima instance '{}'...", instance_name))
        .map_err(|e| format!("Failed to emit stop event: {}", e))?;

    // Spawn async task to run limactl and stream output
    let app_handle = app.clone();
    let instance_name_clone = instance_name.clone();

    tokio::spawn(async move {
        // Run limactl stop command
        let child = TokioCommand::new("limactl")
            .args(["stop", &instance_name_clone])
            .stdout(Stdio::piped())
            .stderr(Stdio::piped())
            .spawn()
            .map_err(|e| format!("Failed to start limactl stop process: {}", e));

        let mut child = match child {
            Ok(c) => c,
            Err(e) => {
                let _ = app_handle.emit("lima-instance-error", &e.to_string());
                return;
            }
        };

        // Stream stdout
        if let Some(stdout) = child.stdout.take() {
            let app_handle_stdout = app_handle.clone();
            tokio::spawn(async move {
                let mut reader = BufReader::new(stdout).lines();
                while let Ok(Some(line)) = reader.next_line().await {
                    let _ = app_handle_stdout.emit("lima-instance-output", &line);
                }
            });
        }

        // Stream stderr
        if let Some(stderr) = child.stderr.take() {
            let app_handle_stderr = app_handle.clone();
            tokio::spawn(async move {
                let mut reader = BufReader::new(stderr).lines();
                while let Ok(Some(line)) = reader.next_line().await {
                    let _ = app_handle_stderr.emit("lima-instance-output", &format!("ERROR: {}", line));
                }
            });
        }

        // Wait for process to complete
        match child.wait().await {
            Ok(status) => {
                if status.success() {
                    let success_msg = format!("Lima instance '{}' stopped successfully!", instance_name_clone);
                    let _ = app_handle.emit("lima-instance-stop-success", &success_msg);
                } else {
                    let error_msg = format!("Failed to stop Lima instance. Exit code: {:?}", status.code());
                    let _ = app_handle.emit("lima-instance-error", &error_msg);
                }
            }
            Err(e) => {
                let error_msg = format!("Failed to wait for limactl stop process: {}", e);
                let _ = app_handle.emit("lima-instance-error", &error_msg);
            }
        }
    });

    Ok(instance_name)
}

/// Delete a Lima instance
/// This handler runs limactl delete and streams the output back to the frontend via Tauri events
#[tauri::command]
pub async fn delete_lima_instance(
    app: AppHandle,
    instance_name: String,
) -> Result<String, String> {
    // Unregister the instance from our registry (we do this before attempting delete)
    unregister_instance(&app, &instance_name)
        .map_err(|e| format!("Failed to unregister instance: {}", e))?;

    // Emit delete event
    app.emit("lima-instance-delete", &format!("Deleting Lima instance '{}'...", instance_name))
        .map_err(|e| format!("Failed to emit delete event: {}", e))?;

    // Spawn async task to run limactl and stream output
    let app_handle = app.clone();
    let instance_name_clone = instance_name.clone();

    tokio::spawn(async move {
        // Run limactl delete command
        let child = TokioCommand::new("limactl")
            .args(["delete", &instance_name_clone])
            .stdout(Stdio::piped())
            .stderr(Stdio::piped())
            .spawn()
            .map_err(|e| format!("Failed to start limactl delete process: {}", e));

        let mut child = match child {
            Ok(c) => c,
            Err(e) => {
                let _ = app_handle.emit("lima-instance-error", &e.to_string());
                return;
            }
        };

        // Stream stdout
        if let Some(stdout) = child.stdout.take() {
            let app_handle_stdout = app_handle.clone();
            tokio::spawn(async move {
                let mut reader = BufReader::new(stdout).lines();
                while let Ok(Some(line)) = reader.next_line().await {
                    let _ = app_handle_stdout.emit("lima-instance-output", &line);
                }
            });
        }

        // Stream stderr
        if let Some(stderr) = child.stderr.take() {
            let app_handle_stderr = app_handle.clone();
            tokio::spawn(async move {
                let mut reader = BufReader::new(stderr).lines();
                while let Ok(Some(line)) = reader.next_line().await {
                    let _ = app_handle_stderr.emit("lima-instance-output", &format!("ERROR: {}", line));
                }
            });
        }

        // Wait for process to complete
        match child.wait().await {
            Ok(status) => {
                if status.success() {
                    let success_msg = format!("Lima instance '{}' deleted successfully!", instance_name_clone);
                    let _ = app_handle.emit("lima-instance-delete-success", &success_msg);
                } else {
                    let error_msg = format!("Failed to delete Lima instance. Exit code: {:?}", status.code());
                    let _ = app_handle.emit("lima-instance-error", &error_msg);
                }
            }
            Err(e) => {
                let error_msg = format!("Failed to wait for limactl delete process: {}", e);
                let _ = app_handle.emit("lima-instance-error", &error_msg);
            }
        }
    });

    Ok(instance_name)
}



/// Get all registered ZeroMa instances with their current status
/// Also cleans up instances that no longer exist in Lima
#[tauri::command]
pub async fn get_registered_instances(app: AppHandle) -> Result<Vec<InstanceInfo>, String> {
    let registry = load_instance_registry(&app)?;

    // Check each instance and update status
    let mut instances_with_status: Vec<InstanceInfo> = Vec::new();
    let mut updated_registry: HashMap<String, InstanceInfo> = HashMap::new();

    for (name, mut instance) in registry {
        match get_instance_status(&name) {
            Ok(status) => {
                instance.status = Some(status);
                instances_with_status.push(instance.clone());
                updated_registry.insert(name, instance);
            }
            Err(_) => {
                // Instance doesn't exist in Lima anymore - skip it
            }
        }
    }

    // Save the cleaned registry
    save_instance_registry(&app, &updated_registry)?;

    Ok(instances_with_status)
}

/// Check if an instance is registered
#[tauri::command]
pub async fn is_instance_registered(app: AppHandle, instance_name: String) -> Result<bool, String> {
    let registry = load_instance_registry(&app)?;
    Ok(registry.contains_key(&instance_name))
}
