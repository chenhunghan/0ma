use std::process::Command;
use std::path::Path;

mod yaml_handler;
mod lima_config;
mod lima_config_handler;
mod instance_registry;
mod lima_instance;

// Common paths where limactl might be installed
// Note: We use limactl directly instead of lima wrapper script
const COMMON_LIMA_EXEC_PATHS: &[&str] = &[
      "/opt/homebrew/bin/limactl",
      "/usr/local/bin/limactl",
      "/opt/local/bin/limactl",
      "/usr/bin/limactl",
      "limactl",
];

/// Find the lima executable in common installation paths
pub fn find_lima_executable() -> Option<String> {
    for path in COMMON_LIMA_EXEC_PATHS {
        if *path == "limactl" {
            // Try using PATH
            if Command::new(path).arg("--version").output().is_ok() {
                return Some(path.to_string());
            }
        } else if Path::new(path).exists() {
            return Some(path.to_string());
        }
    }

    None
}

#[tauri::command]
fn lima_version() -> Result<String, String> {
    // Find limactl executable
    let lima_cmd = find_lima_executable()
        .ok_or_else(|| "Lima (limactl) not found. Please ensure lima is installed in /usr/local/bin, /opt/homebrew/bin, or is in your PATH.".to_string())?;

    // Try to execute 'limactl --version' to get the version string
    match Command::new(&lima_cmd).arg("--version").output() {
        Ok(output) => {
            if output.status.success() {
                // Convert stdout to string and trim whitespace
                String::from_utf8(output.stdout)
                    .map(|s| {
                        let trimmed = s.trim();
                        // Extract version number from "limactl version X.Y.Z"
                        trimmed
                            .split_whitespace()
                            .last()
                            .unwrap_or(trimmed)
                            .to_string()
                    })
                    .map_err(|e| format!("Failed to parse limactl version output: {}", e))
            } else {
                // If command failed, return stderr as error
                let error_msg = String::from_utf8_lossy(&output.stderr).trim().to_string();
                Err(if error_msg.is_empty() {
                    "limactl --version command failed".to_string()
                } else {
                    error_msg
                })
            }
        }
        Err(e) => Err(format!("Failed to execute lima command: {}", e)),
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .invoke_handler(tauri::generate_handler![
            lima_version,
            lima_config_handler::read_lima_yaml,
            lima_config_handler::write_lima_yaml,
            lima_config_handler::get_lima_yaml_path_cmd,
            lima_config_handler::reset_lima_yaml,
            lima_config_handler::get_kubeconfig_path,
            lima_config_handler::convert_config_to_yaml,
            instance_registry::get_registered_instances,
            instance_registry::is_instance_registered,
            lima_instance::create_lima_instance,
            lima_instance::stop_lima_instance,
            lima_instance::delete_lima_instance
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
