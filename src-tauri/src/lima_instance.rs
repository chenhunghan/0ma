use std::process::Stdio;
use tauri::{AppHandle, Emitter};
use tokio::io::{AsyncBufReadExt, BufReader};
use tokio::process::Command as TokioCommand;
use crate::lima_config::LimaConfig;
use crate::lima_config_handler::{get_lima_yaml_path, write_lima_yaml_with_vars};
use crate::instance_registry::{InstanceInfo, register_instance, unregister_instance};

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

    // Write the config
    write_lima_yaml_with_vars(app.clone(), config.clone(), instance_name.clone())?;

    // Get the path to the stored config file (lima.yaml)
    let config_path = get_lima_yaml_path(&app, &instance_name)
        .map_err(|e| format!("Failed to get Lima config path: {}", e))?;

    // Register the instance in our registry
    let instance_info = InstanceInfo::new(instance_name.clone());
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
