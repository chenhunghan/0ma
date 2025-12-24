use std::fs;
use std::path::PathBuf;
use std::process::Stdio;
use tauri::{AppHandle, Manager, Emitter};
use tokio::io::{AsyncBufReadExt, BufReader};
use tokio::process::Command as TokioCommand;
use crate::lima_config::LimaConfig;
use crate::instance_registry::{InstanceInfo, register_instance, unregister_instance};

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

/// Generic function to get the bundled resource filename path for a YAML file
fn get_resource_path(app: &AppHandle, resource_filename: &str) -> Result<PathBuf, String> {
    app.path()
        .resource_dir()
        .map_err(|e| format!("Failed to get resource directory: {}", e))
        .map(|dir| dir.join("resources").join(resource_filename))
}

/// Generic function to ensure a YAML file exists by copying from fallback_file_name if needed
pub(crate) fn ensure_yaml_exists(
    app: &AppHandle,
    instance_name: &str,
    filename: &str,
    fallback_file_name: &str,
) -> Result<(), String> {
    let yaml_path = get_yaml_path(app, instance_name, filename)?;

    if !yaml_path.exists() {
        let resource_path = get_resource_path(app, fallback_file_name)?;
        fs::copy(&resource_path, &yaml_path)
            .map_err(|e| format!("Failed to copy {} from fall back file: {}", fallback_file_name, e))?;
    }

    Ok(())
}

/// Generic function to read a YAML file for an instance
/// Falls back to copying from fallback_file_name if the file doesn't exist
/// e.g. Read /Users/you/Library/Application Support/chh.zeroma/<instance_name>/<filename>.yaml
pub(crate) fn read_yaml(app: &AppHandle, instance_name: &str, filename: &str, fallback_file_name: &str) -> Result<String, String> {
    ensure_yaml_exists(app, instance_name, filename, fallback_file_name)?;
    let config_yaml_path = get_yaml_path(app, instance_name, filename)?;

    fs::read_to_string(&config_yaml_path)
        .map_err(|e| format!("Failed to read {} config file: {}", filename, e))
}

/// Generic function to write a YAML file for an instance
/// e.g. Write /Users/you/Library/Application Support/chh.zeroma/<instance_name>/<filename>.yaml
pub(crate) fn write_yaml(app: &AppHandle, instance_name: &str, filename: &str, content: String) -> Result<(), String> {
    let yaml_path = get_yaml_path(app, instance_name, filename)?;

    fs::write(&yaml_path, content)
        .map_err(|e| format!("Failed to write {} file: {}", filename, e))
}

/// Generic function to reset a YAML file to the bundled default config file from resources
pub(crate) fn reset_yaml(app: &AppHandle, instance_name: &str, filename: &str, default_filename: &str) -> Result<(), String> {
    let yaml_path = get_yaml_path(app, instance_name, filename)?;
    let resource_path = get_resource_path(app, default_filename)?;

    fs::copy(&resource_path, &yaml_path)
        .map_err(|e| format!("Failed to reset {} from resources: {}", filename, e))?;

    Ok(())
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
    crate::lima_config_handler::write_lima_yaml_with_vars(app.clone(), config.clone(), instance_name.clone())?;

    // Get the path to the stored config file (lima.yaml)
    let config_path = get_yaml_path(&app, &instance_name, "lima.yaml")
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
            .args(["delete", "--tty=false", &instance_name_clone])
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
