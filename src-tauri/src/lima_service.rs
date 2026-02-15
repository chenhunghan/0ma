use serde::{Deserialize, Serialize};
use std::path::Path;
use std::process::Command;

/// System capabilities relevant to VM type selection
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SystemCapabilities {
    /// CPU architecture (e.g., "aarch64", "x86_64")
    pub arch: String,
    /// macOS version string (e.g., "14.5")
    #[serde(rename = "macosVersion")]
    pub macos_version: String,
    /// Whether the krunkit binary is available on the host
    #[serde(rename = "krunkitAvailable")]
    pub krunkit_available: bool,
    /// Whether Lima has the krunkit driver installed
    #[serde(rename = "krunkitDriverAvailable")]
    pub krunkit_driver_available: bool,
}

pub fn get_system_capabilities() -> SystemCapabilities {
    let arch = std::env::consts::ARCH.to_string();

    let macos_version = Command::new("sw_vers")
        .arg("-productVersion")
        .output()
        .ok()
        .and_then(|o| {
            if o.status.success() {
                String::from_utf8(o.stdout)
                    .ok()
                    .map(|s| s.trim().to_string())
            } else {
                None
            }
        })
        .unwrap_or_default();

    let krunkit_available = Command::new("which")
        .arg("krunkit")
        .output()
        .map(|o| o.status.success())
        .unwrap_or(false);

    // Check if Lima has the krunkit driver via `limactl info`
    let krunkit_driver_available = find_lima_executable()
        .and_then(|lima_cmd| {
            Command::new(&lima_cmd)
                .arg("info")
                .output()
                .ok()
                .and_then(|o| {
                    if o.status.success() {
                        String::from_utf8(o.stdout).ok()
                    } else {
                        None
                    }
                })
        })
        .map(|info| info.contains("krunkit"))
        .unwrap_or(false);

    SystemCapabilities {
        arch,
        macos_version,
        krunkit_available,
        krunkit_driver_available,
    }
}

// Note: We use limactl directly instead of lima wrapper script
pub const COMMON_LIMA_EXEC_PATHS: &[&str] = &[
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

pub fn get_lima_version() -> Result<String, String> {
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
