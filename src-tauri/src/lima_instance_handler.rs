use crate::find_lima_executable;
use crate::lima_config::LimaConfig;
use crate::yaml_handler::get_lima_home;
use std::process::Stdio;
use tauri::{AppHandle, Emitter, Manager};
use tokio::io::{AsyncBufReadExt, BufReader};
use tokio::process::Command as TokioCommand;

/// Create a Lima instance using the managed configuration
/// This handler creates a temporary config file (to avoid `limactl create` complains the instance already exists) and runs limactl create
/// It streams the output back to the frontend via Tauri events
#[tauri::command]
pub async fn create_lima_instance_cmd(
    app: AppHandle,
    config: LimaConfig,
    instance_name: String,
) -> Result<String, String> {
    // Create a temporary config file for limactl create
    let temp_dir = app
        .path()
        .temp_dir()
        .map_err(|e| format!("Failed to get temp directory: {}", e))?;
    let temp_config_path = temp_dir.join(format!("{}-lima-config.yaml", instance_name));

    // Write config to temp file
    let yaml_content = config
        .to_yaml_pretty()
        .map_err(|e| format!("Failed to serialize YAML: {}", e))?;
    std::fs::write(&temp_config_path, yaml_content)
        .map_err(|e| format!("Failed to write temporary config: {}", e))?;

    // Emit create event
    app.emit(
        "lima-instance-create",
        &format!("Creating Lima instance '{}'...", instance_name),
    )
    .map_err(|e| format!("Failed to emit create event: {}", e))?;

    // Spawn async task to run limactl and stream output
    let app_handle = app.clone();
    let instance_name_clone = instance_name.clone();
    let temp_config_path_clone = temp_config_path.clone();

    tokio::spawn(async move {
        let lima_cmd = match find_lima_executable() {
            Some(cmd) => cmd,
            None => {
                let _ = app_handle.emit("lima-instance-create-error", "Lima (limactl) not found. Please ensure lima is installed in /usr/local/bin, /opt/homebrew/bin, or is in your PATH.");
                return;
            }
        };

        // Run limactl create command with the temporary config file and explicit instance name
        let child = TokioCommand::new(&lima_cmd)
            .args([
                "create",
                "--name",
                &instance_name_clone,
                &temp_config_path_clone.to_string_lossy(),
            ])
            .stdout(Stdio::piped())
            .stderr(Stdio::piped())
            .spawn()
            .map_err(|e| format!("Failed to start limactl create process: {}", e));

        let mut child = match child {
            Ok(c) => c,
            Err(e) => {
                let _ = app_handle.emit("lima-instance-create-error", &e.to_string());
                let _ = std::fs::remove_file(&temp_config_path_clone);
                return;
            }
        };

        // Stream stdout
        if let Some(stdout) = child.stdout.take() {
            let app_handle_stdout = app_handle.clone();
            tokio::spawn(async move {
                let mut reader = BufReader::new(stdout).lines();
                while let Ok(Some(line)) = reader.next_line().await {
                    let _ = app_handle_stdout.emit("lima-instance-create-stdout", &line);
                }
            });
        }

        // Stream stderr
        if let Some(stderr) = child.stderr.take() {
            let app_handle_stderr = app_handle.clone();
            tokio::spawn(async move {
                let mut reader = BufReader::new(stderr).lines();
                while let Ok(Some(line)) = reader.next_line().await {
                    let _ = app_handle_stderr.emit("lima-instance-create-stderr", &line);
                }
            });
        }

        // Wait for process to complete
        match child.wait().await {
            Ok(status) => {
                // Clean up temporary config file
                let _ = std::fs::remove_file(&temp_config_path_clone);

                if status.success() {
                    let _ = app_handle.emit("lima-instance-create-success", &instance_name_clone);
                } else {
                    let error_msg = format!(
                        "Failed to create Lima instance. Exit code: {:?}",
                        status.code()
                    );
                    let _ = app_handle.emit("lima-instance-create-error", &error_msg);
                }
            }
            Err(e) => {
                let _ = std::fs::remove_file(&temp_config_path_clone);
                let error_msg = format!("Failed to wait for limactl create process: {}", e);
                let _ = app_handle.emit("lima-instance-create-error", &error_msg);
            }
        }
    });

    Ok(instance_name)
}

/// Start a Lima instance
/// This handler runs limactl start and streams the output back to the frontend via Tauri events
#[tauri::command]
pub async fn start_lima_instance_cmd(
    app: AppHandle,
    instance_name: String,
) -> Result<String, String> {
    // Emit start event
    app.emit(
        "lima-instance-start",
        &format!("Starting Lima instance '{}'...", instance_name),
    )
    .map_err(|e| format!("Failed to emit start event: {}", e))?;

    // Spawn async task to run limactl and stream output
    let app_handle = app.clone();
    let instance_name_clone = instance_name.clone();

    tokio::spawn(async move {
        let lima_cmd = match find_lima_executable() {
            Some(cmd) => cmd,
            None => {
                let _ = app_handle.emit("lima-instance-start-error", "Lima (limactl) not found. Please ensure lima is installed in /usr/local/bin, /opt/homebrew/bin, or is in your PATH.");
                return;
            }
        };

        // Run limactl start command
        let child = TokioCommand::new(&lima_cmd)
            .args(["start", &instance_name_clone])
            .stdout(Stdio::piped())
            .stderr(Stdio::piped())
            .spawn()
            .map_err(|e| format!("Failed to start limactl start process: {}", e));

        let mut child = match child {
            Ok(c) => c,
            Err(e) => {
                let _ = app_handle.emit("lima-instance-start-error", &e.to_string());
                return;
            }
        };

        // Stream stdout
        if let Some(stdout) = child.stdout.take() {
            let app_handle_stdout = app_handle.clone();
            let instance_name_stdout = instance_name_clone.clone();
            tokio::spawn(async move {
                let mut reader = BufReader::new(stdout).lines();
                let mut essential_ready = false;

                while let Ok(Some(line)) = reader.next_line().await {
                    let _ = app_handle_stdout.emit("lima-instance-start-stdout", &line);

                    // Detect when VM is essentially ready (SSH + provisions done)
                    // Lima transitions from "essential" to "optional" requirements
                    // Multiple patterns for robustness (plain text and JSON log format)
                    if !essential_ready
                        && (line.contains("Waiting for the optional requirement")
                            || (line.contains("optional requirement") && line.contains("msg"))
                            || line.contains("The optional requirement")
                                && line.contains("is satisfied"))
                    {
                        essential_ready = true;
                        let _ = app_handle_stdout.emit(
                            "lima-instance-start-ready",
                            &format!("Instance '{}' is ready for use (waiting for optional hooks to complete)", instance_name_stdout)
                        );
                    }
                }
            });
        }

        // Stream stderr
        if let Some(stderr) = child.stderr.take() {
            let app_handle_stderr = app_handle.clone();
            let instance_name_stderr = instance_name_clone.clone();
            tokio::spawn(async move {
                let mut reader = BufReader::new(stderr).lines();
                let mut essential_ready = false;

                while let Ok(Some(line)) = reader.next_line().await {
                    let _ = app_handle_stderr.emit("lima-instance-start-stderr", &line);

                    // Detect when VM is essentially ready (SSH + provisions done)
                    // Lima transitions from "essential" to "optional" requirements
                    // Multiple patterns for robustness (plain text and JSON log format)
                    if !essential_ready
                        && (line.contains("Waiting for the optional requirement")
                            || (line.contains("optional requirement") && line.contains("msg"))
                            || line.contains("The optional requirement")
                                && line.contains("is satisfied"))
                    {
                        essential_ready = true;
                        let _ = app_handle_stderr.emit(
                            "lima-instance-start-ready",
                            &format!("Instance '{}' is ready for use (waiting for optional hooks to complete)", instance_name_stderr)
                        );
                    }
                }
            });
        }

        // Wait for process to complete
        match child.wait().await {
            Ok(status) => {
                if status.success() {
                    let _ = app_handle.emit("lima-instance-start-success", &instance_name_clone);
                } else {
                    let error_msg = format!(
                        "Failed to start Lima instance. Exit code: {:?}",
                        status.code()
                    );
                    let _ = app_handle.emit("lima-instance-start-error", &error_msg);
                }
            }
            Err(e) => {
                let error_msg = format!("Failed to wait for limactl start process: {}", e);
                let _ = app_handle.emit("lima-instance-start-error", &error_msg);
            }
        }
    });

    Ok(instance_name)
}

/// Stop a Lima instance
/// This handler runs limactl stop and streams the output back to the frontend via Tauri events
#[tauri::command]
pub async fn stop_lima_instance_cmd(
    app: AppHandle,
    instance_name: String,
) -> Result<String, String> {
    // Emit stop event
    app.emit(
        "lima-instance-stop",
        &format!("Stopping Lima instance '{}'...", instance_name),
    )
    .map_err(|e| format!("Failed to emit stop event: {}", e))?;

    // Spawn async task to run limactl and stream output
    let app_handle = app.clone();
    let instance_name_clone = instance_name.clone();

    tokio::spawn(async move {
        let lima_cmd = match find_lima_executable() {
            Some(cmd) => cmd,
            None => {
                let _ = app_handle.emit("lima-instance-stop-error", "Lima (limactl) not found. Please ensure lima is installed in /usr/local/bin, /opt/homebrew/bin, or is in your PATH.");
                return;
            }
        };

        // Run limactl stop command
        let child = TokioCommand::new(&lima_cmd)
            .args(["stop", &instance_name_clone])
            .stdout(Stdio::piped())
            .stderr(Stdio::piped())
            .spawn()
            .map_err(|e| format!("Failed to start limactl stop process: {}", e));

        let mut child = match child {
            Ok(c) => c,
            Err(e) => {
                let _ = app_handle.emit("lima-instance-stop-error", &e.to_string());
                return;
            }
        };

        // Stream stdout
        if let Some(stdout) = child.stdout.take() {
            let app_handle_stdout = app_handle.clone();
            tokio::spawn(async move {
                let mut reader = BufReader::new(stdout).lines();
                while let Ok(Some(line)) = reader.next_line().await {
                    let _ = app_handle_stdout.emit("lima-instance-stop-stdout", &line);
                }
            });
        }

        // Stream stderr
        if let Some(stderr) = child.stderr.take() {
            let app_handle_stderr = app_handle.clone();
            tokio::spawn(async move {
                let mut reader = BufReader::new(stderr).lines();
                while let Ok(Some(line)) = reader.next_line().await {
                    let _ = app_handle_stderr.emit("lima-instance-stop-stderr", &line);
                }
            });
        }

        // Wait for process to complete
        match child.wait().await {
            Ok(status) => {
                if status.success() {
                    let success_msg = format!(
                        "Lima instance '{}' stopped successfully!",
                        instance_name_clone
                    );
                    let _ = app_handle.emit("lima-instance-stop-success", &success_msg);
                } else {
                    let error_msg = format!(
                        "Failed to stop Lima instance. Exit code: {:?}",
                        status.code()
                    );
                    let _ = app_handle.emit("lima-instance-stop-error", &error_msg);
                }
            }
            Err(e) => {
                let error_msg = format!("Failed to wait for limactl stop process: {}", e);
                let _ = app_handle.emit("lima-instance-stop-error", &error_msg);
            }
        }
    });

    Ok(instance_name)
}

/// Delete a Lima instance
/// This handler runs limactl delete and streams the output back to the frontend via Tauri events
#[tauri::command]
pub async fn delete_lima_instance_cmd(
    app: AppHandle,
    instance_name: String,
) -> Result<String, String> {
    // Emit delete event
    app.emit(
        "lima-instance-delete",
        &format!("Deleting Lima instance '{}'...", instance_name),
    )
    .map_err(|e| format!("Failed to emit delete event: {}", e))?;

    // Spawn async task to run limactl and stream output
    let app_handle = app.clone();
    let instance_name_clone = instance_name.clone();

    tokio::spawn(async move {
        let lima_cmd = match find_lima_executable() {
            Some(cmd) => cmd,
            None => {
                let _ = app_handle.emit("lima-instance-delete-error", "Lima (limactl) not found. Please ensure lima is installed in /usr/local/bin, /opt/homebrew/bin, or is in your PATH.");
                return;
            }
        };

        // Run limactl delete command with --force to ensure complete deletion
        let child = TokioCommand::new(&lima_cmd)
            .args(["delete", "--force", "--tty=false", &instance_name_clone])
            .stdout(Stdio::piped())
            .stderr(Stdio::piped())
            .spawn()
            .map_err(|e| format!("Failed to start limactl delete process: {}", e));

        let mut child = match child {
            Ok(c) => c,
            Err(e) => {
                let _ = app_handle.emit("lima-instance-delete-error", &e.to_string());
                return;
            }
        };

        // Stream stdout
        if let Some(stdout) = child.stdout.take() {
            let app_handle_stdout = app_handle.clone();
            tokio::spawn(async move {
                let mut reader = BufReader::new(stdout).lines();
                while let Ok(Some(line)) = reader.next_line().await {
                    let _ = app_handle_stdout.emit("lima-instance-delete-stdout", &line);
                }
            });
        }

        // Stream stderr
        if let Some(stderr) = child.stderr.take() {
            let app_handle_stderr = app_handle.clone();
            tokio::spawn(async move {
                let mut reader = BufReader::new(stderr).lines();
                while let Ok(Some(line)) = reader.next_line().await {
                    let _ = app_handle_stderr.emit("lima-instance-delete-stderr", &line);
                }
            });
        }

        // Wait for process to complete
        match child.wait().await {
            Ok(status) => {
                if status.success() {
                    // Manually clean up the instance directory if it still exists
                    // This ensures complete cleanup even if `limactl delete`` has bugs
                    if let Ok(lima_home) = get_lima_home(&app_handle) {
                        let instance_dir = lima_home.join(&instance_name_clone);
                        if instance_dir.exists() {
                            if let Err(e) = tokio::fs::remove_dir_all(&instance_dir).await {
                                eprintln!("Warning: Failed to remove instance directory: {}", e);
                            }
                        }
                    }

                    let success_msg = format!(
                        "Lima instance '{}' deleted successfully!",
                        instance_name_clone
                    );
                    let _ = app_handle.emit("lima-instance-delete-success", &success_msg);
                } else {
                    let error_msg = format!(
                        "Failed to delete Lima instance. Exit code: {:?}",
                        status.code()
                    );
                    let _ = app_handle.emit("lima-instance-delete-error", &error_msg);
                }
            }
            Err(e) => {
                let error_msg = format!("Failed to wait for limactl delete process: {}", e);
                let _ = app_handle.emit("lima-instance-delete-error", &error_msg);
            }
        }
    });

    Ok(instance_name)
}
