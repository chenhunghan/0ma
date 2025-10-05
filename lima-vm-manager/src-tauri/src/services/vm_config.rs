//! VM Configuration Management Service
//!
//! This service provides comprehensive VM configuration management,
//! validation, templates, and configuration versioning.

use crate::models::vm::{
    VMConfiguration, VMArchitecture, VMOperatingSystem
};
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::path::{Path, PathBuf};
use std::fs;
use tokio::sync::RwLock;
use chrono::{DateTime, Utc};
use thiserror::Error;
use uuid::Uuid;
use serde_yaml;
use tauri::State;

/// VM configuration management errors
#[derive(Error, Debug)]
pub enum VMConfigError {
    #[error("Configuration validation failed: {0}")]
    ValidationError(String),
    #[error("Configuration file not found: {0}")]
    FileNotFound(String),
    #[error("Configuration file I/O error: {0}")]
    IOError(String),
    #[error("Configuration parsing error: {0}")]
    ParseError(String),
    #[error("Template not found: {0}")]
    TemplateNotFound(String),
    #[error("Invalid configuration value: {0}")]
    InvalidValue(String),
    #[error("Configuration version mismatch: {0}")]
    VersionMismatch(String),
}

/// VM configuration validation result
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct VMConfigValidationResult {
    /// Whether configuration is valid
    pub is_valid: bool,
    /// List of validation errors
    pub errors: Vec<String>,
    /// List of validation warnings
    pub warnings: Vec<String>,
    /// Configuration suggestions
    pub suggestions: Vec<String>,
}

/// VM configuration template
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct VMConfigTemplate {
    /// Template name
    pub name: String,
    /// Template description
    pub description: String,
    /// Template version
    pub version: String,
    /// Supported architectures
    pub supported_arch: Vec<VMArchitecture>,
    /// Default configuration
    pub default_config: VMConfiguration,
    /// Available customization options
    pub customization_options: Vec<ConfigOption>,
    /// Template metadata
    pub metadata: HashMap<String, String>,
}

/// Configuration option definition
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ConfigOption {
    /// Option name
    pub name: String,
    /// Option description
    pub description: String,
    /// Option type
    pub option_type: ConfigOptionType,
    /// Default value
    pub default_value: Option<serde_yaml::Value>,
    /// Allowed values
    pub allowed_values: Option<Vec<serde_yaml::Value>>,
    /// Whether the option is required
    pub required: bool,
    /// Validation rules
    pub validation_rules: Vec<ValidationRule>,
}

/// Configuration option types
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub enum ConfigOptionType {
    String,
    Number,
    Boolean,
    Array,
    Object,
    Enum(Vec<String>),
}

/// Validation rule
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ValidationRule {
    /// Rule name
    pub name: String,
    /// Rule description
    pub description: String,
    /// Rule type
    pub rule_type: ValidationRuleType,
    /// Rule parameters
    pub parameters: HashMap<String, serde_yaml::Value>,
}

/// Validation rule types
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub enum ValidationRuleType {
    MinValue,
    MaxValue,
    MinLength,
    MaxLength,
    Regex,
    Custom,
}

/// VM configuration history entry
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct VMConfigHistory {
    /// Entry ID
    pub id: String,
    /// VM ID
    pub vm_id: String,
    /// Configuration version
    pub version: String,
    /// Previous configuration
    pub previous_config: Option<VMConfiguration>,
    /// New configuration
    pub new_config: VMConfiguration,
    /// Change timestamp
    pub timestamp: DateTime<Utc>,
    /// Change description
    pub description: String,
    /// User who made the change
    pub user: Option<String>,
}

/// VM configuration backup
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct VMConfigBackup {
    /// Backup ID
    pub id: String,
    /// VM ID
    pub vm_id: String,
    /// Configuration snapshot
    pub config: VMConfiguration,
    /// Backup timestamp
    pub timestamp: DateTime<Utc>,
    /// Backup description
    pub description: String,
    /// Backup size in bytes
    pub size_bytes: u64,
}

/// VM configuration service
pub struct VMConfigService {
    /// Base configuration directory
    config_dir: PathBuf,
    /// Configuration templates
    templates: RwLock<HashMap<String, VMConfigTemplate>>,
    /// Configuration history
    history: RwLock<Vec<VMConfigHistory>>,
    /// Configuration backups
    backups: RwLock<Vec<VMConfigBackup>>,
    /// Current configurations
    current_configs: RwLock<HashMap<String, VMConfiguration>>,
}

impl VMConfigService {
    /// Create a new VM configuration service
    pub fn new(config_dir: PathBuf) -> Result<Self, VMConfigError> {
        let mut service = Self {
            config_dir,
            templates: RwLock::new(HashMap::new()),
            history: RwLock::new(Vec::new()),
            backups: RwLock::new(Vec::new()),
            current_configs: RwLock::new(HashMap::new()),
        };

        // Initialize configuration directory
        fs::create_dir_all(&service.config_dir)
            .map_err(|e| VMConfigError::IOError(e.to_string()))?;

        // Create a runtime to load templates synchronously
        let rt = tokio::runtime::Runtime::new()
            .map_err(|e| VMConfigError::IOError(e.to_string()))?;
        rt.block_on(async {
            service.load_built_in_templates().await
        })?;

        Ok(service)
    }

    /// Load built-in configuration templates
    async fn load_built_in_templates(&self) -> Result<(), VMConfigError> {
        let mut templates = self.templates.write().await;

        // Ubuntu template
        templates.insert("ubuntu".to_string(), VMConfigTemplate {
            name: "Ubuntu".to_string(),
            description: "Ubuntu LTS with standard development tools".to_string(),
            version: "22.04".to_string(),
            supported_arch: vec![VMArchitecture::X86_64, VMArchitecture::Arm64],
            default_config: VMConfiguration {
                template: "ubuntu".to_string(),
                arch: VMArchitecture::X86_64,
                os: VMOperatingSystem::Linux,
                version: "22.04".to_string(),
                auto_start: false,
                config_file: PathBuf::from("config.yaml"),
                working_dir: PathBuf::from("."),
                settings: HashMap::new(),
            },
            customization_options: vec![
                ConfigOption {
                    name: "memory_mb".to_string(),
                    description: "Memory allocation in MB".to_string(),
                    option_type: ConfigOptionType::Number,
                    default_value: Some(serde_yaml::Value::Number(4096.into())),
                    allowed_values: None,
                    required: false,
                    validation_rules: vec![
                        ValidationRule {
                            name: "min_memory".to_string(),
                            description: "Minimum memory requirement".to_string(),
                            rule_type: ValidationRuleType::MinValue,
                            parameters: HashMap::from_iter(vec![
                                ("value".to_string(), serde_yaml::Value::Number(512.into()))
                            ].into_iter().map(|(k, v)| (k, v))),
                        }
                    ],
                }
            ],
            metadata: HashMap::from_iter(vec![
                ("category".to_string(), "linux".to_string()),
                ("desktop".to_string(), "true".to_string()),
                ("recommended".to_string(), "true".to_string())
            ]),
        });

        // Alpine template
        templates.insert("alpine".to_string(), VMConfigTemplate {
            name: "Alpine".to_string(),
            description: "Lightweight Alpine Linux for minimal VMs".to_string(),
            version: "3.19".to_string(),
            supported_arch: vec![VMArchitecture::X86_64, VMArchitecture::Arm64],
            default_config: VMConfiguration {
                template: "alpine".to_string(),
                arch: VMArchitecture::X86_64,
                os: VMOperatingSystem::Linux,
                version: "3.19".to_string(),
                auto_start: false,
                config_file: PathBuf::from("config.yaml"),
                working_dir: PathBuf::from("."),
                settings: HashMap::new(),
            },
            customization_options: vec![],
            metadata: HashMap::from_iter(vec![
                ("category".to_string(), "linux".to_string()),
                ("lightweight".to_string(), "true".to_string()),
                ("minimal".to_string(), "true".to_string())
            ]),
        });

        Ok(())
    }

    /// Validate VM configuration
    pub async fn validate_config(&self, config: &VMConfiguration) -> VMConfigValidationResult {
        let mut errors = Vec::new();
        let mut warnings = Vec::new();
        let mut suggestions = Vec::new();

        // Validate template
        if config.template.is_empty() {
            errors.push("Template name is required".to_string());
        } else {
            // Check if template exists
            let templates = self.templates.read().await;
            if !templates.contains_key(&config.template) {
                errors.push(format!("Unknown template: {}", config.template));
            }
        }

        // Validate architecture
        if config.arch == VMArchitecture::Unknown {
            errors.push("Valid architecture is required".to_string());
        }

        // Validate version
        if config.version.is_empty() {
            warnings.push("Version is recommended but not required".to_string());
        }

        // Validate file paths
        if config.config_file.as_os_str().is_empty() {
            warnings.push("Config file path is empty".to_string());
        }

        // Validate settings
        if let Some(memory_setting) = config.settings.get("memory_mb") {
            if let Some(memory_num) = memory_setting.as_u64() {
                if memory_num < 512 {
                    errors.push("Memory must be at least 512MB".to_string());
                } else if memory_num > 16384 {
                    warnings.push("Memory allocation > 16GB may impact performance".to_string());
                }
            }
        }

        // Performance suggestions
        if let Some(cpu_setting) = config.settings.get("cpu_count") {
            if let Some(cpu_num) = cpu_setting.as_u64() {
                if cpu_num > 8 {
                    suggestions.push("Consider reducing CPU count for better performance".to_string());
                }
            }
        }

        VMConfigValidationResult {
            is_valid: errors.is_empty(),
            errors,
            warnings,
            suggestions,
        }
    }

    /// Get available configuration templates
    pub async fn get_templates(&self) -> Vec<VMConfigTemplate> {
        let templates = self.templates.read().await;
        templates.values().cloned().collect()
    }

    /// Get configuration template by name
    pub async fn get_template(&self, name: &str) -> Option<VMConfigTemplate> {
        let templates = self.templates.read().await;
        templates.get(name).cloned()
    }

    /// Create VM configuration from template
    pub async fn create_config_from_template(
        &self,
        template_name: &str,
        custom_settings: Option<HashMap<String, serde_yaml::Value>>,
    ) -> Result<VMConfiguration, VMConfigError> {
        let templates = self.templates.read().await;
        let template = templates.get(template_name)
            .ok_or_else(|| VMConfigError::TemplateNotFound(template_name.to_string()))?;

        let mut config = template.default_config.clone();

        // Apply custom settings
        if let Some(settings) = custom_settings {
            for (key, value) in settings {
                config.settings.insert(key, value);
            }
        }

        // Validate the configuration
        let validation = self.validate_config(&config).await;
        if !validation.is_valid {
            return Err(VMConfigError::ValidationError(
                validation.errors.join(", ")
            ));
        }

        Ok(config)
    }

    /// Save VM configuration to file
    pub async fn save_config(&self, vm_id: &str, config: &VMConfiguration) -> Result<PathBuf, VMConfigError> {
        let config_path = self.config_dir.join(format!("{}.yaml", vm_id));

        // Validate configuration before saving
        let validation = self.validate_config(config).await;
        if !validation.is_valid {
            return Err(VMConfigError::ValidationError(
                validation.errors.join(", ")
            ));
        }

        // Load previous configuration for history
        let previous_config = self.load_config(vm_id).await.ok();

        // Save configuration
        let config_content = serde_yaml::to_string(config)
            .map_err(|e| VMConfigError::ParseError(e.to_string()))?;

        fs::write(&config_path, config_content)
            .map_err(|e| VMConfigError::IOError(e.to_string()))?;

        // Add to history
        self.add_to_history(vm_id, previous_config, config.clone(), "Configuration saved".to_string()).await;

        // Update current configurations
        self.current_configs.write().await.insert(vm_id.to_string(), config.clone());

        Ok(config_path)
    }

    /// Load VM configuration from file
    pub async fn load_config(&self, vm_id: &str) -> Result<VMConfiguration, VMConfigError> {
        let config_path = self.config_dir.join(format!("{}.yaml", vm_id));

        if !config_path.exists() {
            return Err(VMConfigError::FileNotFound(config_path.display().to_string()));
        }

        let config_content = fs::read_to_string(&config_path)
            .map_err(|e| VMConfigError::IOError(e.to_string()))?;

        let config: VMConfiguration = serde_yaml::from_str(&config_content)
            .map_err(|e| VMConfigError::ParseError(e.to_string()))?;

        // Update current configurations
        self.current_configs.write().await.insert(vm_id.to_string(), config.clone());

        Ok(config)
    }

    /// Add configuration change to history
    async fn add_to_history(
        &self,
        vm_id: &str,
        previous_config: Option<VMConfiguration>,
        new_config: VMConfiguration,
        description: String,
    ) {
        let history_entry = VMConfigHistory {
            id: Uuid::new_v4().to_string(),
            vm_id: vm_id.to_string(),
            version: "1.0".to_string(),
            previous_config,
            new_config,
            timestamp: Utc::now(),
            description,
            user: None,
        };

        self.history.write().await.push(history_entry);
    }

    /// Get configuration history for a VM
    pub async fn get_config_history(&self, vm_id: &str) -> Vec<VMConfigHistory> {
        let history = self.history.read().await;
        history.iter()
            .filter(|entry| entry.vm_id == vm_id)
            .cloned()
            .collect()
    }

    /// Create configuration backup
    pub async fn create_backup(&self, vm_id: &str, description: String) -> Result<String, VMConfigError> {
        let config = self.load_config(vm_id).await?;
        let config_content = serde_yaml::to_string(&config)
            .map_err(|e| VMConfigError::ParseError(e.to_string()))?;

        let backup = VMConfigBackup {
            id: Uuid::new_v4().to_string(),
            vm_id: vm_id.to_string(),
            config,
            timestamp: Utc::now(),
            description,
            size_bytes: config_content.len() as u64,
        };

        let backup_id = backup.id.clone();
        self.backups.write().await.push(backup);

        Ok(backup_id)
    }

    /// Get configuration backups for a VM
    pub async fn get_backups(&self, vm_id: &str) -> Vec<VMConfigBackup> {
        let backups = self.backups.read().await;
        backups.iter()
            .filter(|backup| backup.vm_id == vm_id)
            .cloned()
            .collect()
    }

    /// Restore configuration from backup
    pub async fn restore_from_backup(&self, backup_id: &str) -> Result<(), VMConfigError> {
        let backups = self.backups.read().await;
        let backup = backups.iter()
            .find(|b| b.id == backup_id)
            .ok_or_else(|| VMConfigError::FileNotFound("Backup not found".to_string()))?;

        self.save_config(&backup.vm_id, &backup.config).await?;

        Ok(())
    }

    /// Get current configuration statistics
    pub async fn get_config_stats(&self) -> serde_json::Value {
        let current_configs = self.current_configs.read().await;
        let templates = self.templates.read().await;
        let history = self.history.read().await;
        let backups = self.backups.read().await;

        serde_json::json!({
            "total_configs": current_configs.len(),
            "total_templates": templates.len(),
            "total_history_entries": history.len(),
            "total_backups": backups.len(),
            "template_usage": templates.values()
                .map(|t| t.name.clone())
                .collect::<Vec<_>>(),
            "last_update": Utc::now()
        })
    }

    /// Delete VM configuration
    pub async fn delete_config(&self, vm_id: &str) -> Result<(), VMConfigError> {
        let config_path = self.config_dir.join(format!("{}.yaml", vm_id));

        if config_path.exists() {
            fs::remove_file(&config_path)
                .map_err(|e| VMConfigError::IOError(e.to_string()))?;
        }

        // Remove from current configurations
        self.current_configs.write().await.remove(vm_id);

        Ok(())
    }

    /// Clone VM configuration
    pub async fn clone_config(&self, source_vm_id: &str, target_vm_id: &str) -> Result<(), VMConfigError> {
        let config = self.load_config(source_vm_id).await?;
        self.save_config(target_vm_id, &config).await?;
        Ok(())
    }

    /// Export configuration to a specific path
    pub async fn export_config(&self, vm_id: &str, export_path: &Path) -> Result<(), VMConfigError> {
        let config = self.load_config(vm_id).await?;
        let config_content = serde_yaml::to_string(&config)
            .map_err(|e| VMConfigError::ParseError(e.to_string()))?;

        fs::write(export_path, config_content)
            .map_err(|e| VMConfigError::IOError(e.to_string()))?;

        Ok(())
    }

    /// Import configuration from a file
    pub async fn import_config(&self, import_path: &Path, vm_id: &str) -> Result<(), VMConfigError> {
        let config_content = fs::read_to_string(import_path)
            .map_err(|e| VMConfigError::IOError(e.to_string()))?;

        let config: VMConfiguration = serde_yaml::from_str(&config_content)
            .map_err(|e| VMConfigError::ParseError(e.to_string()))?;

        // Validate imported configuration
        let validation = self.validate_config(&config).await;
        if !validation.is_valid {
            return Err(VMConfigError::ValidationError(
                validation.errors.join(", ")
            ));
        }

        self.save_config(vm_id, &config).await?;

        Ok(())
    }
}

/// Tauri commands for VM configuration management

/// Validate VM configuration
#[tauri::command]
pub async fn validate_vm_config(
    config: VMConfiguration,
    config_service: State<'_, VMConfigService>,
) -> Result<VMConfigValidationResult, String> {
    Ok(config_service.validate_config(&config).await)
}

/// Get available configuration templates
#[tauri::command]
pub async fn get_vm_templates(
    config_service: State<'_, VMConfigService>,
) -> Result<Vec<VMConfigTemplate>, String> {
    Ok(config_service.get_templates().await)
}

/// Get configuration template details
#[tauri::command]
pub async fn get_vm_template(
    template_name: String,
    config_service: State<'_, VMConfigService>,
) -> Result<Option<VMConfigTemplate>, String> {
    Ok(config_service.get_template(&template_name).await)
}

/// Create VM configuration from template
#[tauri::command]
pub async fn create_vm_config_from_template(
    template_name: String,
    custom_settings: Option<HashMap<String, serde_yaml::Value>>,
    config_service: State<'_, VMConfigService>,
) -> Result<VMConfiguration, String> {
    config_service.create_config_from_template(&template_name, custom_settings).await
        .map_err(|e| e.to_string())
}

/// Save VM configuration
#[tauri::command]
pub async fn save_vm_config(
    vm_id: String,
    config: VMConfiguration,
    config_service: State<'_, VMConfigService>,
) -> Result<PathBuf, String> {
    config_service.save_config(&vm_id, &config).await
        .map_err(|e| e.to_string())
}

/// Load VM configuration
#[tauri::command]
pub async fn load_vm_config(
    vm_id: String,
    config_service: State<'_, VMConfigService>,
) -> Result<VMConfiguration, String> {
    config_service.load_config(&vm_id).await
        .map_err(|e| e.to_string())
}

/// Get configuration history
#[tauri::command]
pub async fn get_vm_config_history(
    vm_id: String,
    config_service: State<'_, VMConfigService>,
) -> Result<Vec<VMConfigHistory>, String> {
    Ok(config_service.get_config_history(&vm_id).await)
}

/// Create configuration backup
#[tauri::command]
pub async fn create_vm_config_backup(
    vm_id: String,
    description: String,
    config_service: State<'_, VMConfigService>,
) -> Result<String, String> {
    config_service.create_backup(&vm_id, description).await
        .map_err(|e| e.to_string())
}

/// Get configuration backups
#[tauri::command]
pub async fn get_vm_config_backups(
    vm_id: String,
    config_service: State<'_, VMConfigService>,
) -> Result<Vec<VMConfigBackup>, String> {
    Ok(config_service.get_backups(&vm_id).await)
}

/// Restore configuration from backup
#[tauri::command]
pub async fn restore_vm_config_from_backup(
    backup_id: String,
    config_service: State<'_, VMConfigService>,
) -> Result<(), String> {
    config_service.restore_from_backup(&backup_id).await
        .map_err(|e| e.to_string())
}

/// Get configuration statistics
#[tauri::command]
pub async fn get_vm_config_stats(
    config_service: State<'_, VMConfigService>,
) -> Result<serde_json::Value, String> {
    Ok(config_service.get_config_stats().await)
}

/// Delete VM configuration
#[tauri::command]
pub async fn delete_vm_config(
    vm_id: String,
    config_service: State<'_, VMConfigService>,
) -> Result<(), String> {
    config_service.delete_config(&vm_id).await
        .map_err(|e| e.to_string())
}

/// Clone VM configuration
#[tauri::command]
pub async fn clone_vm_config(
    source_vm_id: String,
    target_vm_id: String,
    config_service: State<'_, VMConfigService>,
) -> Result<(), String> {
    config_service.clone_config(&source_vm_id, &target_vm_id).await
        .map_err(|e| e.to_string())
}

/// Export VM configuration
#[tauri::command]
pub async fn export_vm_config(
    vm_id: String,
    export_path: String,
    config_service: State<'_, VMConfigService>,
) -> Result<(), String> {
    let path = PathBuf::from(export_path);
    config_service.export_config(&vm_id, &path).await
        .map_err(|e| e.to_string())
}

/// Import VM configuration
#[tauri::command]
pub async fn import_vm_config(
    import_path: String,
    vm_id: String,
    config_service: State<'_, VMConfigService>,
) -> Result<(), String> {
    let path = PathBuf::from(import_path);
    config_service.import_config(&path, &vm_id).await
        .map_err(|e| e.to_string())
}

#[cfg(test)]
mod tests {
    use super::*;
    use tempfile::TempDir;

    #[tokio::test]
    async fn test_config_service_creation() {
        let temp_dir = TempDir::new().unwrap();
        let service = VMConfigService::new(temp_dir.path().to_path_buf()).unwrap();

        let templates = service.get_templates().await;
        assert!(!templates.is_empty());
        assert!(templates.iter().any(|t| t.name == "ubuntu"));
    }

    #[tokio::test]
    async fn test_config_validation() {
        let temp_dir = TempDir::new().unwrap();
        let service = VMConfigService::new(temp_dir.path().to_path_buf()).unwrap();

        let mut config = VMConfiguration::default();
        config.template = "ubuntu".to_string();
        config.arch = VMArchitecture::X86_64;

        let result = service.validate_config(&config).await;
        assert!(result.is_valid);
        assert!(result.errors.is_empty());
    }

    #[tokio::test]
    async fn test_template_creation() {
        let temp_dir = TempDir::new().unwrap();
        let service = VMConfigService::new(temp_dir.path().to_path_buf()).unwrap();

        let config = service.create_config_from_template("ubuntu", None).await.unwrap();
        assert_eq!(config.template, "ubuntu");
        assert_eq!(config.arch, VMArchitecture::X86_64);
    }
}