use crate::models::cli_tools::{CLIToolStatus, CLIDetectionConfig};
use crate::models::error::{AppError, ErrorContext, ContextualError};
use crate::{app_error, contextual_error, log_info, log_error};
use std::sync::Mutex;
use tauri::State;

pub struct CLIDetectionService {
    status: Mutex<Option<CLIToolStatus>>,
    config: Mutex<CLIDetectionConfig>,
}

impl CLIDetectionService {
    pub fn new() -> Self {
        Self {
            status: Mutex::new(None),
            config: Mutex::new(CLIDetectionConfig::default()),
        }
    }

    pub fn new_with_config(config: CLIDetectionConfig) -> Self {
        Self {
            status: Mutex::new(None),
            config: Mutex::new(config),
        }
    }

    pub fn detect_tools(&self) -> Result<CLIToolStatus, String> {
        log_info!("CLIDetectionService", "Starting CLI tool detection");

        let config = self.config.lock().unwrap().clone();

        match self.detect_tools_with_config(config) {
            Ok(status) => {
                log_info!("CLIDetectionService", "CLI tool detection completed successfully. All tools available: {}", status.all_tools_available);
                Ok(status)
            },
            Err(e) => {
                let _error = contextual_error!("CLIDetectionService", app_error!(cli, "detection", &e), "detect_tools");
                log_error!("CLIDetectionService", "CLI tool detection failed: {}", e);
                Err(e)
            }
        }
    }

    pub fn detect_tools_with_config(&self, config: CLIDetectionConfig) -> Result<CLIToolStatus, String> {
        let mut status = CLIToolStatus::new();
        status.config = config.clone();

        // Detect tools with appropriate timeout
        let timeout = config.timeout_secs;
        status.limactl.detect_with_timeout(timeout)?;
        status.kubectl.detect_with_timeout(timeout)?;
        status.git.detect_with_timeout(timeout)?;
        status.docker.detect_with_timeout(timeout)?;
        status.qemu.detect_with_timeout(timeout)?;

        // Cache the result
        {
            let mut cached_status = self.status.lock().unwrap();
            *cached_status = Some(status.clone());
        }

        Ok(status)
    }

    pub fn get_cached_status(&self) -> Option<CLIToolStatus> {
        let cached_status = self.status.lock().unwrap();
        cached_status.clone()
    }

    pub fn get_status_if_fresh(&self) -> Option<CLIToolStatus> {
        let config = self.config.lock().unwrap();
        let cached_status = self.status.lock().unwrap();

        if let Some(ref status) = *cached_status {
            if !status.limactl.is_stale(&config) &&
               !status.kubectl.is_stale(&config) &&
               !status.git.is_stale(&config) &&
               !status.docker.is_stale(&config) &&
               !status.qemu.is_stale(&config) {
                return Some(status.clone());
            }
        }
        None
    }

    pub fn force_detection(&self) -> Result<CLIToolStatus, String> {
        self.detect_tools()
    }

    pub fn detect_if_needed(&self) -> Result<CLIToolStatus, String> {
        // Try to get fresh cached status first
        if let Some(status) = self.get_status_if_fresh() {
            return Ok(status);
        }

        // If cache is stale or empty, detect again
        self.detect_tools()
    }

    pub fn update_config(&self, new_config: CLIDetectionConfig) {
        let mut config = self.config.lock().unwrap();
        *config = new_config;
    }

    pub fn get_config(&self) -> CLIDetectionConfig {
        let config = self.config.lock().unwrap();
        config.clone()
    }

    pub fn detect_specific_tool(&self, tool_name: &str) -> Result<Option<crate::models::CLITool>, String> {
        let config = self.config.lock().unwrap().clone();

        // Check cache first
        if let Some(ref status) = self.get_status_if_fresh() {
            match tool_name {
                "limactl" => return Ok(Some(status.limactl.clone())),
                "kubectl" => return Ok(Some(status.kubectl.clone())),
                "git" => return Ok(Some(status.git.clone())),
                "docker" => return Ok(Some(status.docker.clone())),
                "qemu" => return Ok(Some(status.qemu.clone())),
                _ => return Err(format!("Unknown tool: {}", tool_name)),
            }
        }

        // If no fresh cache, detect specific tool
        let mut tool = crate::models::CLITool::new(tool_name, "1.0.0", "");
        tool.detect_with_timeout(config.timeout_secs)?;
        Ok(Some(tool))
    }
}

impl Default for CLIDetectionService {
    fn default() -> Self {
        Self::new()
    }
}

// Tauri commands for CLI detection
#[tauri::command]
pub async fn detect_cli_tools(
    state: State<'_, CLIDetectionService>,
) -> Result<CLIToolStatus, String> {
    state.detect_tools()
}

#[tauri::command]
pub async fn get_cli_tool_status(
    state: State<'_, CLIDetectionService>,
) -> Result<Option<CLIToolStatus>, String> {
    Ok(state.get_cached_status())
}

#[tauri::command]
pub async fn get_fresh_cli_tool_status(
    state: State<'_, CLIDetectionService>,
) -> Result<CLIToolStatus, String> {
    state.detect_if_needed()
}

#[tauri::command]
pub async fn refresh_cli_tools(
    state: State<'_, CLIDetectionService>,
) -> Result<CLIToolStatus, String> {
    state.force_detection()
}

#[tauri::command]
pub async fn get_cli_detection_config(
    state: State<'_, CLIDetectionService>,
) -> Result<CLIDetectionConfig, String> {
    Ok(state.get_config())
}

#[tauri::command]
pub async fn update_cli_detection_config(
    state: State<'_, CLIDetectionService>,
    config: CLIDetectionConfig,
) -> Result<(), String> {
    state.update_config(config);
    Ok(())
}

#[tauri::command]
pub async fn detect_specific_cli_tool(
    state: State<'_, CLIDetectionService>,
    tool_name: String,
) -> Result<Option<crate::models::CLITool>, String> {
    state.detect_specific_tool(&tool_name)
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::models::CLITool;

    #[test]
    fn test_cli_detection_service_creation() {
        let service = CLIDetectionService::new();
        assert!(service.get_cached_status().is_none());
    }

    #[test]
    fn test_cli_tool_status_creation() {
        let status = CLIToolStatus::new();
        assert_eq!(status.limactl.name, "limactl");
        assert_eq!(status.limactl.minimum_version, "1.2.0");
        assert_eq!(status.kubectl.name, "kubectl");
        assert_eq!(status.kubectl.minimum_version, "1.28.0");
        assert_eq!(status.git.name, "git");
        assert_eq!(status.git.minimum_version, "2.30.0");
        assert_eq!(status.docker.name, "docker");
        assert_eq!(status.docker.minimum_version, "20.10.0");
        assert_eq!(status.qemu.name, "qemu");
        assert_eq!(status.qemu.minimum_version, "7.0.0");
        assert!(!status.all_tools_available);
    }

    #[test]
    fn test_cli_tool_parsing() {
        let mut limactl = CLITool::new("limactl", "1.2.0", "Lima VM control tool");
        assert_eq!(limactl.parse_version_requirement("1.2.0").unwrap(), (1, 2, 0));
        assert_eq!(limactl.parse_version_requirement("1.10.5").unwrap(), (1, 10, 5));

        let mut kubectl = CLITool::new("kubectl", "1.28.0", "Kubernetes command-line tool");
        assert_eq!(kubectl.parse_version_requirement("1.28.0").unwrap(), (1, 28, 0));
        assert_eq!(kubectl.parse_version_requirement("1.30.2").unwrap(), (1, 30, 2));
    }

    #[test]
    fn test_version_comparison() {
        let mut tool = CLITool::new("test", "1.0.0", "Test tool");

        // Test version parsing
        assert!(tool.parse_version_requirement("1.0.0").unwrap() >= tool.parse_version_requirement("1.0.0").unwrap());
        assert!(tool.parse_version_requirement("1.1.0").unwrap() > tool.parse_version_requirement("1.0.0").unwrap());
        assert!(tool.parse_version_requirement("1.0.1").unwrap() > tool.parse_version_requirement("1.0.0").unwrap());
        assert!(tool.parse_version_requirement("2.0.0").unwrap() > tool.parse_version_requirement("1.9.9").unwrap());
    }

    #[test]
    fn test_cli_detection_service_config() {
        let service = CLIDetectionService::new();
        let config = service.get_config();
        assert!(config.auto_refresh);
        assert_eq!(config.refresh_interval_secs, 300);
        assert!(config.cache_enabled);
        assert_eq!(config.timeout_secs, 10);
    }

    #[test]
    fn test_cli_detection_service_with_custom_config() {
        let custom_config = CLIDetectionConfig {
            auto_refresh: false,
            refresh_interval_secs: 600,
            cache_enabled: false,
            timeout_secs: 5,
            additional_paths: vec![std::path::PathBuf::from("/usr/local/bin")],
        };

        let service = CLIDetectionService::new_with_config(custom_config.clone());
        let retrieved_config = service.get_config();
        assert!(!retrieved_config.auto_refresh);
        assert_eq!(retrieved_config.refresh_interval_secs, 600);
        assert!(!retrieved_config.cache_enabled);
        assert_eq!(retrieved_config.timeout_secs, 5);
        assert_eq!(retrieved_config.additional_paths.len(), 1);
    }

    #[test]
    fn test_cli_tool_metadata() {
        let limactl = CLITool::new("limactl", "1.2.0", "Lima VM control tool");
        assert_eq!(limactl.name, "limactl");
        assert_eq!(limactl.minimum_version, "1.2.0");
        assert_eq!(limactl.description, "Lima VM control tool");
        assert!(limactl.install_url.is_some());
        assert!(!limactl.commands.is_empty());
    }

    #[test]
    fn test_stale_detection() {
        let config = CLIDetectionConfig {
            refresh_interval_secs: 1, // 1 second
            cache_enabled: true,
            auto_refresh: true,
            timeout_secs: 10,
            additional_paths: vec![],
        };

        let mut tool = CLITool::new("test", "1.0.0", "Test tool");

        // Initially stale
        assert!(tool.is_stale(&config));

        // After detection, should not be stale
        tool.last_checked = chrono::Utc::now();
        assert!(!tool.is_stale(&config));
    }
}