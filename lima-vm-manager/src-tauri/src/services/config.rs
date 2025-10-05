use crate::models::{AppConfig, GeneralConfig, VMConfig, UIConfig, NetworkConfig};
use std::path::{Path, PathBuf};
use std::sync::{Mutex, Arc};
use std::collections::HashMap;
use tauri::State;
use thiserror::Error;
use chrono::{DateTime, Utc};
use std::fs;
use tokio::sync::broadcast;

/// Configuration storage errors
#[derive(Debug, Error)]
pub enum ConfigError {
    #[error("IO error: {0}")]
    Io(#[from] std::io::Error),
    #[error("YAML serialization error: {0}")]
    YamlSerialization(#[from] serde_yaml::Error),
    #[error("JSON serialization error: {0}")]
    JsonSerialization(#[from] serde_json::Error),
    #[error("Configuration file not found at: {0}")]
    FileNotFound(PathBuf),
    #[error("Invalid configuration format: {0}")]
    InvalidFormat(String),
    #[error("Configuration validation failed: {0}")]
    ValidationFailed(String),
    #[error("Migration failed: {0}")]
    MigrationFailed(String),
    #[error("Backup creation failed: {0}")]
    BackupFailed(String),
    #[error("Configuration version mismatch: expected {expected}, got {actual}")]
    VersionMismatch { expected: String, actual: String },
}

/// Configuration validation result
#[derive(Debug, Clone, serde::Serialize)]
pub struct ConfigValidationResult {
    pub is_valid: bool,
    pub errors: Vec<String>,
    pub warnings: Vec<String>,
}

/// Configuration backup information
#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct ConfigBackup {
    pub id: String,
    pub timestamp: DateTime<Utc>,
    pub description: String,
    pub version: String,
    pub file_path: PathBuf,
}

/// Configuration change event
#[derive(Debug, Clone, serde::Serialize)]
pub struct ConfigChangeEvent {
    pub timestamp: DateTime<Utc>,
    pub section: String,
    pub old_value: Option<serde_json::Value>,
    pub new_value: Option<serde_json::Value>,
    pub reason: String,
}

/// Configuration management service
pub struct ConfigService {
    config_path: PathBuf,
    config: Mutex<Option<AppConfig>>,
    backups_dir: PathBuf,
    config_version: String,
    event_sender: broadcast::Sender<ConfigChangeEvent>,
    validation_rules: Arc<Mutex<HashMap<String, Box<dyn Fn(&AppConfig) -> Vec<String> + Send + Sync>>>>,
}

impl ConfigService {
    /// Create a new configuration service with the specified config file path
    pub fn new<P: AsRef<Path>>(config_path: P) -> Self {
        let config_path = config_path.as_ref().to_path_buf();
        let backups_dir = config_path.parent()
            .unwrap_or_else(|| Path::new("."))
            .join("backups");

        let (event_sender, _) = broadcast::channel(100);

        Self {
            config_path: config_path.clone(),
            config: Mutex::new(None),
            backups_dir,
            config_version: "1.0.0".to_string(),
            event_sender,
            validation_rules: Arc::new(Mutex::new(HashMap::new())),
        }
    }

    /// Create a new configuration service with custom version and validation
    pub fn new_with_version<P: AsRef<Path>>(
        config_path: P,
        version: String,
    ) -> Self {
        let mut service = Self::new(config_path);
        service.config_version = version;
        service
    }

    /// Get the default configuration path based on the operating system
    pub fn default_config_path() -> Result<PathBuf, ConfigError> {
        let config_dir = dirs::config_dir()
            .ok_or_else(|| ConfigError::InvalidFormat("Could not determine config directory".to_string()))?;

        let app_config_dir = config_dir.join("lima-vm-manager");

        // Create config directory if it doesn't exist
        std::fs::create_dir_all(&app_config_dir)?;

        Ok(app_config_dir.join("config.yaml"))
    }

    /// Load configuration from file, or create default if it doesn't exist
    pub fn load_or_create(&self) -> Result<AppConfig, ConfigError> {
        // Try to load existing configuration
        match self.load() {
            Ok(config) => Ok(config),
            Err(ConfigError::FileNotFound(_)) => {
                // File doesn't exist, create default configuration
                let default_config = AppConfig::default();
                self.save(&default_config)?;
                Ok(default_config)
            }
            Err(e) => Err(e),
        }
    }

    /// Load configuration from file
    pub fn load(&self) -> Result<AppConfig, ConfigError> {
        if !self.config_path.exists() {
            return Err(ConfigError::FileNotFound(self.config_path.clone()));
        }

        let content = std::fs::read_to_string(&self.config_path)?;
        let config: AppConfig = serde_yaml::from_str(&content)
            .map_err(|e| ConfigError::YamlSerialization(e))?;

        // Cache the loaded configuration
        {
            let mut cached_config = self.config.lock().unwrap();
            *cached_config = Some(config.clone());
        }

        Ok(config)
    }

    /// Save configuration to file
    pub fn save(&self, config: &AppConfig) -> Result<(), ConfigError> {
        // Ensure parent directory exists
        if let Some(parent) = self.config_path.parent() {
            std::fs::create_dir_all(parent)?;
        }

        let content = serde_yaml::to_string(config)
            .map_err(|e| ConfigError::YamlSerialization(e))?;

        std::fs::write(&self.config_path, content)?;

        // Update cached configuration
        {
            let mut cached_config = self.config.lock().unwrap();
            *cached_config = Some(config.clone());
        }

        Ok(())
    }

    /// Get cached configuration, or load if not cached
    pub fn get_config(&self) -> Result<AppConfig, ConfigError> {
        {
            let cached_config = self.config.lock().unwrap();
            if let Some(ref config) = *cached_config {
                return Ok(config.clone());
            }
        }

        // Not cached, try to load
        self.load()
    }

    /// Update specific configuration section
    pub fn update_general<F>(&self, updater: F) -> Result<(), ConfigError>
    where
        F: FnOnce(&mut GeneralConfig),
    {
        let mut config = self.get_config()?;
        updater(&mut config.general);
        self.save(&config)?;
        Ok(())
    }

    /// Update VM configuration section
    pub fn update_vm<F>(&self, updater: F) -> Result<(), ConfigError>
    where
        F: FnOnce(&mut VMConfig),
    {
        let mut config = self.get_config()?;
        updater(&mut config.vm);
        self.save(&config)?;
        Ok(())
    }

    /// Update UI configuration section
    pub fn update_ui<F>(&self, updater: F) -> Result<(), ConfigError>
    where
        F: FnOnce(&mut UIConfig),
    {
        let mut config = self.get_config()?;
        updater(&mut config.ui);
        self.save(&config)?;
        Ok(())
    }

    /// Update network configuration section
    pub fn update_network<F>(&self, updater: F) -> Result<(), ConfigError>
    where
        F: FnOnce(&mut NetworkConfig),
    {
        let mut config = self.get_config()?;
        updater(&mut config.network);
        self.save(&config)?;
        Ok(())
    }

    /// Reset configuration to defaults
    pub fn reset_to_defaults(&self) -> Result<(), ConfigError> {
        let default_config = AppConfig::default();
        self.save(&default_config)?;
        Ok(())
    }

    /// Export configuration to a different file
    pub fn export<P: AsRef<Path>>(&self, export_path: P) -> Result<(), ConfigError> {
        let config = self.get_config()?;
        let content = serde_yaml::to_string(&config)
            .map_err(|e| ConfigError::YamlSerialization(e))?;

        // Ensure export directory exists
        if let Some(parent) = export_path.as_ref().parent() {
            std::fs::create_dir_all(parent)?;
        }

        std::fs::write(export_path, content)?;
        Ok(())
    }

    /// Import configuration from a different file
    pub fn import<P: AsRef<Path>>(&self, import_path: P) -> Result<(), ConfigError> {
        let content = std::fs::read_to_string(import_path)?;
        let config: AppConfig = serde_yaml::from_str(&content)
            .map_err(|e| ConfigError::YamlSerialization(e))?;
        self.save(&config)?;
        Ok(())
    }

    /// Get the configuration file path
    pub fn config_path(&self) -> &Path {
        &self.config_path
    }

    /// Check if configuration file exists
    pub fn config_exists(&self) -> bool {
        self.config_path.exists()
    }

    /// Get configuration file size
    pub fn config_size(&self) -> Result<u64, ConfigError> {
        let metadata = std::fs::metadata(&self.config_path)?;
        Ok(metadata.len())
    }

    // Enhanced configuration management methods

    /// Validate configuration against registered rules
    pub fn validate_config(&self, config: &AppConfig) -> ConfigValidationResult {
        let mut errors = Vec::new();
        let mut warnings = Vec::new();

        // Built-in validation rules
        self.validate_builtin(config, &mut errors, &mut warnings);

        // Custom validation rules
        let rules = self.validation_rules.lock().unwrap();
        for (section, rule) in rules.iter() {
            let rule_errors = rule(config);
            for error in rule_errors {
                errors.push(format!("{}: {}", section, error));
            }
        }

        ConfigValidationResult {
            is_valid: errors.is_empty(),
            errors,
            warnings,
        }
    }

    /// Built-in validation rules
    fn validate_builtin(&self, config: &AppConfig, errors: &mut Vec<String>, warnings: &mut Vec<String>) {
        // Validate VM configuration
        if config.vm.default_memory_mb < 1024 {
            errors.push("Default memory should be at least 1024 MB".to_string());
        }
        if config.vm.default_memory_mb > 32768 {
            warnings.push("Default memory allocation is very high (>32GB)".to_string());
        }

        if config.vm.default_cpu_count < 1 {
            errors.push("Default CPU count must be at least 1".to_string());
        }
        if config.vm.default_cpu_count > 16 {
            warnings.push("Default CPU count is very high (>16)".to_string());
        }

        if config.vm.default_disk_size_gb < 10 {
            errors.push("Default disk size should be at least 10 GB".to_string());
        }

        // Validate UI configuration
        if config.ui.window_width < 800 {
            errors.push("Window width should be at least 800 pixels".to_string());
        }
        if config.ui.window_height < 600 {
            errors.push("Window height should be at least 600 pixels".to_string());
        }

        if config.ui.refresh_interval_seconds < 1 {
            errors.push("Refresh interval should be at least 1 second".to_string());
        }
        if config.ui.refresh_interval_seconds > 300 {
            warnings.push("Refresh interval is very high (>5 minutes)".to_string());
        }

        // Validate network configuration
        if config.network.connection_timeout_seconds < 5 {
            errors.push("Connection timeout should be at least 5 seconds".to_string());
        }
        if config.network.dns_servers.is_empty() {
            warnings.push("No DNS servers configured".to_string());
        }

        // Validate proxy configuration
        if config.network.proxy_enabled {
            if config.network.proxy_url.is_none() {
                errors.push("Proxy is enabled but no proxy URL is configured".to_string());
            }
        }
    }

    /// Add a custom validation rule
    pub fn add_validation_rule<F>(&self, section: String, rule: F)
    where
        F: Fn(&AppConfig) -> Vec<String> + Send + Sync + 'static,
    {
        let mut rules = self.validation_rules.lock().unwrap();
        rules.insert(section, Box::new(rule));
    }

    /// Remove a validation rule
    pub fn remove_validation_rule(&self, section: &str) {
        let mut rules = self.validation_rules.lock().unwrap();
        rules.remove(section);
    }

    /// Save configuration with validation and backup
    pub fn save_with_validation(&self, config: &AppConfig, create_backup: bool) -> Result<(), ConfigError> {
        // Validate configuration first
        let validation = self.validate_config(config);
        if !validation.is_valid {
            return Err(ConfigError::ValidationFailed(validation.errors.join("; ")));
        }

        // Create backup if requested
        if create_backup {
            self.create_backup("Pre-save backup")?;
        }

        // Save configuration
        self.save(config)?;

        // Emit change event
        self.emit_change_event("full_config", None, Some(serde_json::to_value(config).unwrap_or_default()), "save_with_validation");

        Ok(())
    }

    /// Create a configuration backup
    pub fn create_backup(&self, description: &str) -> Result<ConfigBackup, ConfigError> {
        // Ensure backups directory exists
        fs::create_dir_all(&self.backups_dir)?;

        // Generate backup ID and filename
        let backup_id = uuid::Uuid::new_v4().to_string();
        let timestamp = Utc::now();
        let filename = format!("backup_{}.yaml", timestamp.format("%Y%m%d_%H%M%S"));
        let backup_path = self.backups_dir.join(filename);

        // Copy current config to backup location
        if self.config_path.exists() {
            fs::copy(&self.config_path, &backup_path)?;
        } else {
            // Create backup of default config
            let default_config = AppConfig::default();
            let content = serde_yaml::to_string(&default_config)?;
            fs::write(&backup_path, content)?;
        }

        let backup = ConfigBackup {
            id: backup_id.clone(),
            timestamp,
            description: description.to_string(),
            version: self.config_version.clone(),
            file_path: backup_path.clone(),
        };

        // Save backup metadata
        let metadata_path = self.backups_dir.join(format!("{}_meta.json", backup_id));
        let metadata_content = serde_json::to_string(&backup)?;
        fs::write(metadata_path, metadata_content)?;

        Ok(backup)
    }

    /// List available backups
    pub fn list_backups(&self) -> Result<Vec<ConfigBackup>, ConfigError> {
        if !self.backups_dir.exists() {
            return Ok(Vec::new());
        }

        let mut backups = Vec::new();

        for entry in fs::read_dir(&self.backups_dir)? {
            let entry = entry?;
            let path = entry.path();

            // Look for metadata files
            if let Some(filename) = path.file_name().and_then(|n| n.to_str()) {
                if filename.ends_with("_meta.json") {
                    let content = fs::read_to_string(&path)?;
                    if let Ok(backup) = serde_json::from_str::<ConfigBackup>(&content) {
                        backups.push(backup);
                    }
                }
            }
        }

        // Sort by timestamp (newest first)
        backups.sort_by(|a, b| b.timestamp.cmp(&a.timestamp));

        Ok(backups)
    }

    /// Restore configuration from backup
    pub fn restore_from_backup(&self, backup_id: &str) -> Result<(), ConfigError> {
        let backups = self.list_backups()?;
        let backup = backups.iter().find(|b| b.id == backup_id)
            .ok_or_else(|| ConfigError::InvalidFormat(format!("Backup {} not found", backup_id)))?;

        // Validate backup version compatibility
        if self.is_version_compatible(&backup.version)? {
            fs::copy(&backup.file_path, &self.config_path)?;

            // Clear cached config to force reload
            {
                let mut cached_config = self.config.lock().unwrap();
                *cached_config = None;
            }

            self.emit_change_event("full_config", None, None, &format!("restored_from_backup: {}", backup_id));
        }

        Ok(())
    }

    /// Delete a backup
    pub fn delete_backup(&self, backup_id: &str) -> Result<(), ConfigError> {
        let backups = self.list_backups()?;
        let backup = backups.iter().find(|b| b.id == backup_id)
            .ok_or_else(|| ConfigError::InvalidFormat(format!("Backup {} not found", backup_id)))?;

        // Delete backup file
        if backup.file_path.exists() {
            fs::remove_file(&backup.file_path)?;
        }

        // Delete metadata file
        let metadata_path = self.backups_dir.join(format!("{}_meta.json", backup_id));
        if metadata_path.exists() {
            fs::remove_file(metadata_path)?;
        }

        Ok(())
    }

    /// Check if backup version is compatible with current version
    fn is_version_compatible(&self, backup_version: &str) -> Result<bool, ConfigError> {
        // Simple version compatibility check (can be enhanced)
        let current_parts: Vec<&str> = self.config_version.split('.').collect();
        let backup_parts: Vec<&str> = backup_version.split('.').collect();

        if current_parts.len() >= 2 && backup_parts.len() >= 2 {
            // Major and minor versions should match
            if current_parts[0] == backup_parts[0] && current_parts[1] == backup_parts[1] {
                return Ok(true);
            }
        }

        Ok(false)
    }

    /// Subscribe to configuration change events
    pub fn subscribe_to_changes(&self) -> broadcast::Receiver<ConfigChangeEvent> {
        self.event_sender.subscribe()
    }

    /// Emit a configuration change event
    fn emit_change_event(&self, section: &str, old_value: Option<serde_json::Value>, new_value: Option<serde_json::Value>, reason: &str) {
        let event = ConfigChangeEvent {
            timestamp: Utc::now(),
            section: section.to_string(),
            old_value,
            new_value,
            reason: reason.to_string(),
        };

        // Don't panic if no receivers
        let _ = self.event_sender.send(event);
    }

    /// Get configuration statistics
    pub fn get_config_stats(&self) -> Result<serde_json::Value, ConfigError> {
        let config = self.get_config()?;
        let backups = self.list_backups()?;

        let stats = serde_json::json!({
            "config_version": self.config_version,
            "config_path": self.config_path.to_string_lossy(),
            "config_exists": self.config_exists(),
            "config_size_bytes": self.config_size().unwrap_or(0),
            "backups_count": backups.len(),
            "last_backup": backups.first().map(|b| b.timestamp),
            "vm_instances": config.vm.instances.len(),
            "auto_start_vms": config.vm.auto_start_vms.len(),
            "shared_directories": config.vm.shared_directories.len(),
            "theme": config.general.theme,
            "log_level": config.general.log_level,
        });

        Ok(stats)
    }

    /// Hot-reload configuration from file
    pub fn hot_reload(&self) -> Result<AppConfig, ConfigError> {
        let old_config = self.get_config().ok();
        let old_value = old_config.as_ref().map(|c| serde_json::to_value(c).unwrap_or_default());

        let new_config = self.load()?;
        let new_value = serde_json::to_value(&new_config).unwrap_or_default();

        self.emit_change_event("full_config", old_value, Some(new_value), "hot_reload");

        Ok(new_config)
    }

    /// Auto-save configuration at intervals
    pub async fn auto_save_loop(&self, interval_seconds: u64, mut shutdown_rx: tokio::sync::broadcast::Receiver<()>) {
        let mut interval = tokio::time::interval(tokio::time::Duration::from_secs(interval_seconds));

        loop {
            tokio::select! {
                _ = interval.tick() => {
                    if let Ok(config) = self.get_config() {
                        if let Err(e) = self.save(&config) {
                            eprintln!("Auto-save failed: {}", e);
                        }
                    }
                }
                _ = shutdown_rx.recv() => {
                    break;
                }
            }
        }
    }
}

impl Default for ConfigService {
    fn default() -> Self {
        Self::new(Self::default_config_path().unwrap_or_else(|_| {
            PathBuf::from("config.yaml")
        }))
    }
}

// Tauri commands for configuration management
#[tauri::command]
pub async fn get_app_config(
    state: State<'_, ConfigService>,
) -> Result<AppConfig, String> {
    state.get_config()
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn update_app_config(
    config: AppConfig,
    state: State<'_, ConfigService>,
) -> Result<(), String> {
    state.save(&config)
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn update_app_config_with_validation(
    config: AppConfig,
    create_backup: bool,
    state: State<'_, ConfigService>,
) -> Result<(), String> {
    state.save_with_validation(&config, create_backup)
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn validate_app_config(
    config: AppConfig,
    state: State<'_, ConfigService>,
) -> Result<ConfigValidationResult, String> {
    Ok(state.validate_config(&config))
}

#[tauri::command]
pub async fn reset_config_to_defaults(
    state: State<'_, ConfigService>,
) -> Result<(), String> {
    state.reset_to_defaults()
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn export_config(
    export_path: String,
    state: State<'_, ConfigService>,
) -> Result<(), String> {
    state.export(&export_path)
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn import_config(
    import_path: String,
    state: State<'_, ConfigService>,
) -> Result<(), String> {
    state.import(&import_path)
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn get_config_info(
    state: State<'_, ConfigService>,
) -> Result<ConfigInfo, String> {
    let config_path = state.config_path().to_path_buf();
    let exists = state.config_exists();
    let size = if exists {
        Some(state.config_size().map_err(|e| e.to_string())?)
    } else {
        None
    };

    Ok(ConfigInfo {
        path: config_path.to_string_lossy().to_string(),
        exists,
        size_bytes: size,
    })
}

#[tauri::command]
pub async fn get_config_stats(
    state: State<'_, ConfigService>,
) -> Result<serde_json::Value, String> {
    state.get_config_stats()
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn create_config_backup(
    description: String,
    state: State<'_, ConfigService>,
) -> Result<ConfigBackup, String> {
    state.create_backup(&description)
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn list_config_backups(
    state: State<'_, ConfigService>,
) -> Result<Vec<ConfigBackup>, String> {
    state.list_backups()
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn restore_config_from_backup(
    backup_id: String,
    state: State<'_, ConfigService>,
) -> Result<(), String> {
    state.restore_from_backup(&backup_id)
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn delete_config_backup(
    backup_id: String,
    state: State<'_, ConfigService>,
) -> Result<(), String> {
    state.delete_backup(&backup_id)
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn hot_reload_config(
    state: State<'_, ConfigService>,
) -> Result<AppConfig, String> {
    state.hot_reload()
        .map_err(|e| e.to_string())
}

/// Configuration file information
#[derive(serde::Serialize)]
pub struct ConfigInfo {
    pub path: String,
    pub exists: bool,
    pub size_bytes: Option<u64>,
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::fs;
    use tempfile::tempdir;
    use std::time::Duration;
    use tokio::time::sleep;

    #[test]
    fn test_config_service_creation() {
        let temp_dir = tempdir().unwrap();
        let config_path = temp_dir.path().join("test_config.yaml");
        let service = ConfigService::new(&config_path);

        assert_eq!(service.config_path(), config_path);
        assert!(!service.config_exists());
    }

    #[test]
    fn test_default_config_creation() {
        let service = ConfigService::default();
        let config = AppConfig::default();

        assert_eq!(config.general.default_vm_name, "default");
        assert_eq!(config.vm.default_memory_mb, 4096);
        assert_eq!(config.ui.window_width, 1024);
        assert_eq!(config.network.dns_servers.len(), 2);
    }

    #[test]
    fn test_save_and_load_config() {
        let temp_dir = tempdir().unwrap();
        let config_path = temp_dir.path().join("test_config.yaml");
        let service = ConfigService::new(&config_path);

        let mut config = AppConfig::default();
        config.general.auto_start = true;
        config.vm.default_memory_mb = 8192;
        config.ui.window_width = 1280;

        // Save configuration
        service.save(&config).unwrap();
        assert!(service.config_exists());

        // Load configuration
        let loaded_config = service.load().unwrap();
        assert_eq!(loaded_config.general.auto_start, true);
        assert_eq!(loaded_config.vm.default_memory_mb, 8192);
        assert_eq!(loaded_config.ui.window_width, 1280);
    }

    #[test]
    fn test_load_or_create_default() {
        let temp_dir = tempdir().unwrap();
        let config_path = temp_dir.path().join("test_config.yaml");
        let service = ConfigService::new(&config_path);

        // Should create default config when file doesn't exist
        let config = service.load_or_create().unwrap();
        assert!(service.config_exists());
        assert_eq!(config.general.default_vm_name, "default");
    }

    #[test]
    fn test_update_sections() {
        let temp_dir = tempdir().unwrap();
        let config_path = temp_dir.path().join("test_config.yaml");
        let service = ConfigService::new(&config_path);

        // Create initial config
        let initial_config = AppConfig::default();
        service.save(&initial_config).unwrap();

        // Update general section
        service.update_general(|general| {
            general.auto_start = true;
            general.start_minimized = false;
        }).unwrap();

        let updated_config = service.get_config().unwrap();
        assert!(updated_config.general.auto_start);
        assert!(!updated_config.general.start_minimized);

        // Update VM section
        service.update_vm(|vm| {
            vm.default_memory_mb = 8192;
            vm.default_cpu_count = 4;
        }).unwrap();

        let updated_config = service.get_config().unwrap();
        assert_eq!(updated_config.vm.default_memory_mb, 8192);
        assert_eq!(updated_config.vm.default_cpu_count, 4);
    }

    #[test]
    fn test_export_import() {
        let temp_dir = tempdir().unwrap();
        let config_path = temp_dir.path().join("test_config.yaml");
        let export_path = temp_dir.path().join("exported_config.yaml");
        let service = ConfigService::new(&config_path);

        // Create and save initial config
        let mut config = AppConfig::default();
        config.general.auto_start = true;
        config.vm.default_memory_mb = 8192;
        service.save(&config).unwrap();

        // Export configuration
        service.export(&export_path).unwrap();
        assert!(export_path.exists());

        // Create new service and import
        let new_service = ConfigService::new(&config_path);
        let mut new_config = AppConfig::default();
        new_config.general.auto_start = false;
        new_service.save(&new_config).unwrap();

        // Import exported configuration
        new_service.import(&export_path).unwrap();

        // Verify imported configuration
        let imported_config = new_service.get_config().unwrap();
        assert!(imported_config.general.auto_start);
        assert_eq!(imported_config.vm.default_memory_mb, 8192);
    }

    #[test]
    fn test_reset_to_defaults() {
        let temp_dir = tempdir().unwrap();
        let config_path = temp_dir.path().join("test_config.yaml");
        let service = ConfigService::new(&config_path);

        // Create modified config
        let mut config = AppConfig::default();
        config.general.auto_start = true;
        config.vm.default_memory_mb = 8192;
        service.save(&config).unwrap();

        // Reset to defaults
        service.reset_to_defaults().unwrap();

        // Verify reset
        let reset_config = service.get_config().unwrap();
        assert!(!reset_config.general.auto_start);
        assert_eq!(reset_config.vm.default_memory_mb, 4096); // Default value
    }

    #[test]
    fn test_config_validation() {
        let temp_dir = tempdir().unwrap();
        let config_path = temp_dir.path().join("test_config.yaml");
        let service = ConfigService::new(&config_path);

        // Test valid configuration
        let valid_config = AppConfig::default();
        let validation = service.validate_config(&valid_config);
        assert!(validation.is_valid);
        assert!(validation.errors.is_empty());

        // Test invalid configuration
        let mut invalid_config = AppConfig::default();
        invalid_config.vm.default_memory_mb = 512; // Too low
        invalid_config.vm.default_cpu_count = 0; // Invalid
        invalid_config.ui.window_width = 600; // Too small
        invalid_config.ui.refresh_interval_seconds = 0; // Invalid

        let validation = service.validate_config(&invalid_config);
        assert!(!validation.is_valid);
        assert!(!validation.errors.is_empty());
        assert!(validation.errors.len() >= 3);
    }

    #[test]
    fn test_custom_validation_rules() {
        let temp_dir = tempdir().unwrap();
        let config_path = temp_dir.path().join("test_config.yaml");
        let service = ConfigService::new(&config_path);

        // Add custom validation rule
        service.add_validation_rule("custom_test".to_string(), |config| {
            let mut errors = Vec::new();
            if config.general.default_vm_name.is_empty() {
                errors.push("Default VM name cannot be empty".to_string());
            }
            errors
        });

        // Test with valid name
        let mut config = AppConfig::default();
        config.general.default_vm_name = "test-vm".to_string();
        let validation = service.validate_config(&config);
        let custom_errors: Vec<String> = validation.errors.iter()
            .filter(|e| e.contains("custom_test"))
            .cloned()
            .collect();
        assert!(custom_errors.is_empty());

        // Test with empty name
        config.general.default_vm_name = String::new();
        let validation = service.validate_config(&config);
        let custom_errors: Vec<String> = validation.errors.iter()
            .filter(|e| e.contains("custom_test"))
            .cloned()
            .collect();
        assert!(!custom_errors.is_empty());

        // Remove validation rule
        service.remove_validation_rule("custom_test");
        let validation = service.validate_config(&config);
        let custom_errors: Vec<String> = validation.errors.iter()
            .filter(|e| e.contains("custom_test"))
            .cloned()
            .collect();
        assert!(custom_errors.is_empty());
    }

    #[test]
    fn test_config_backups() {
        let temp_dir = tempdir().unwrap();
        let config_path = temp_dir.path().join("test_config.yaml");
        let service = ConfigService::new(&config_path);

        // Create initial config
        let mut config = AppConfig::default();
        config.general.auto_start = true;
        service.save(&config).unwrap();

        // Create backup
        let backup = service.create_backup("Test backup").unwrap();
        assert!(!backup.id.is_empty());
        assert_eq!(backup.description, "Test backup");
        assert!(backup.file_path.exists());

        // List backups
        let backups = service.list_backups().unwrap();
        assert_eq!(backups.len(), 1);
        assert_eq!(backups[0].id, backup.id);

        // Modify config
        config.general.auto_start = false;
        service.save(&config).unwrap();

        // Restore from backup
        service.restore_from_backup(&backup.id).unwrap();
        let restored_config = service.get_config().unwrap();
        assert!(restored_config.general.auto_start);

        // Delete backup
        service.delete_backup(&backup.id).unwrap();
        let backups = service.list_backups().unwrap();
        assert!(backups.is_empty());
    }

    #[tokio::test]
    async fn test_config_change_events() {
        let temp_dir = tempdir().unwrap();
        let config_path = temp_dir.path().join("test_config.yaml");
        let service = ConfigService::new(&config_path);

        // Subscribe to change events
        let mut receiver = service.subscribe_to_changes();

        // Save configuration
        let config = AppConfig::default();
        service.save_with_validation(&config, false).unwrap();

        // Receive change event
        let event = receiver.recv().await.unwrap();
        assert_eq!(event.section, "full_config");
        assert_eq!(event.reason, "save_with_validation");
        assert!(event.new_value.is_some());
    }

    #[tokio::test]
    async fn test_auto_save_functionality() {
        let temp_dir = tempdir().unwrap();
        let config_path = temp_dir.path().join("test_config.yaml");
        let service = ConfigService::new(&config_path);

        // Create initial config
        let config = AppConfig::default();
        service.save(&config).unwrap();

        let (shutdown_tx, shutdown_rx) = tokio::sync::broadcast::channel::<()>(1);

        // Start auto-save loop (runs for 2 seconds)
        let service_clone = service.clone();
        let auto_save_handle = tokio::spawn(async move {
            service_clone.auto_save_loop(1, shutdown_rx).await;
        });

        // Wait a bit and then shutdown
        sleep(Duration::from_millis(1500)).await;
        let _ = shutdown_tx.send(());

        // Wait for auto-save to finish
        let _ = auto_save_handle.await;

        // Verify config still exists and is valid
        let loaded_config = service.get_config().unwrap();
        assert_eq!(loaded_config.general.default_vm_name, "default");
    }

    #[test]
    fn test_config_statistics() {
        let temp_dir = tempdir().unwrap();
        let config_path = temp_dir.path().join("test_config.yaml");
        let service = ConfigService::new(&config_path);

        // Get stats for non-existent config
        let stats = service.get_config_stats().unwrap();
        assert_eq!(stats["config_exists"], false);
        assert_eq!(stats["backups_count"], 0);

        // Create config and backup
        let config = AppConfig::default();
        service.save(&config).unwrap();
        let _backup = service.create_backup("Test backup").unwrap();

        // Get stats for existing config
        let stats = service.get_config_stats().unwrap();
        assert_eq!(stats["config_exists"], true);
        assert_eq!(stats["backups_count"], 1);
        assert!(stats["config_size_bytes"].as_u64().unwrap() > 0);
    }

    #[test]
    fn test_hot_reload() {
        let temp_dir = tempdir().unwrap();
        let config_path = temp_dir.path().join("test_config.yaml");
        let service = ConfigService::new(&config_path);

        // Create initial config
        let mut config = AppConfig::default();
        config.general.auto_start = true;
        service.save(&config).unwrap();

        // Manually modify config file
        let mut modified_config = AppConfig::default();
        modified_config.general.auto_start = false;
        let content = serde_yaml::to_string(&modified_config).unwrap();
        fs::write(&config_path, content).unwrap();

        // Hot-reload configuration
        let reloaded_config = service.hot_reload().unwrap();
        assert!(!reloaded_config.general.auto_start);
    }

    // Helper function to implement Clone for ConfigService (needed for async test)
    impl Clone for ConfigService {
        fn clone(&self) -> Self {
            Self::new_with_version(&self.config_path, self.config_version.clone())
        }
    }
}