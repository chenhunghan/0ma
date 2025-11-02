use std::process::Command;
use std::path::Path;

mod yaml_handler;

/// Find the lima executable in common installation paths
fn find_lima_executable() -> Option<String> {
    // Common paths where limactl might be installed
    // Note: We use limactl directly instead of lima wrapper script
    let common_paths = vec![
        "/opt/homebrew/bin/limactl",      // Apple Silicon Homebrew
        "/usr/local/bin/limactl",         // Intel Mac Homebrew
        "/opt/local/bin/limactl",         // MacPorts
        "/usr/bin/limactl",               // System
        "limactl",                        // Try PATH as fallback
    ];

    for path in common_paths {
        if path == "limactl" {
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

// Learn more about Tauri commands at https://tauri.app/develop/calling-rust/
#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
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
        .invoke_handler(tauri::generate_handler![
            greet,
            lima_version,
            yaml_handler::read_lima_k8s_yaml,
            yaml_handler::write_lima_k8s_yaml,
            yaml_handler::get_lima_k8s_yaml_path_cmd,
            yaml_handler::reset_lima_k8s_yaml,
            yaml_handler::read_lima_k0s_yaml,
            yaml_handler::write_lima_k0s_yaml,
            yaml_handler::write_lima_k0s_yaml_with_vars,
            yaml_handler::get_lima_k0s_yaml_path_cmd,
            yaml_handler::get_kubeconfig_path,
            yaml_handler::reset_lima_k0s_yaml
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
