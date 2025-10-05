use crate::models::error::{AppError, ErrorContext, ErrorSeverity, ContextualError};
use crate::{app_error};
use serde::{Deserialize, Serialize};
use std::sync::{Arc, Mutex};
use std::path::PathBuf;
use std::fs::{File, OpenOptions};
use std::io::{BufWriter, Write};
use chrono::{DateTime, Utc};
use tokio::sync::broadcast;
use std::collections::HashMap;
use uuid::Uuid;

/// Log levels in order of severity
#[derive(Debug, Clone, Copy, PartialEq, Eq, PartialOrd, Ord, Hash, Serialize, Deserialize)]
pub enum LogLevel {
    Trace = 0,
    Debug = 1,
    Info = 2,
    Warn = 3,
    Error = 4,
}

impl LogLevel {
    pub fn as_str(&self) -> &'static str {
        match self {
            LogLevel::Trace => "TRACE",
            LogLevel::Debug => "DEBUG",
            LogLevel::Info => "INFO",
            LogLevel::Warn => "WARN",
            LogLevel::Error => "ERROR",
        }
    }

    pub fn from_error_severity(severity: ErrorSeverity) -> Self {
        match severity {
            ErrorSeverity::Trace => LogLevel::Trace,
            ErrorSeverity::Debug => LogLevel::Debug,
            ErrorSeverity::Info => LogLevel::Info,
            ErrorSeverity::Low => LogLevel::Warn,
            ErrorSeverity::Medium => LogLevel::Error,
            ErrorSeverity::High => LogLevel::Error,
            ErrorSeverity::Critical => LogLevel::Error,
        }
    }
}

/// Log entry structure
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LogEntry {
    /// Unique log entry ID
    pub id: String,
    /// Timestamp when log was created
    pub timestamp: DateTime<Utc>,
    /// Log level
    pub level: LogLevel,
    /// Service/module that generated the log
    pub service: String,
    /// Function/method where log was generated
    pub function: Option<String>,
    /// Log message
    pub message: String,
    /// Additional structured data
    pub metadata: HashMap<String, serde_json::Value>,
    /// Error context if this is an error log
    pub error_context: Option<ErrorContext>,
    /// Correlation ID for request tracking
    pub correlation_id: Option<String>,
    /// User ID if applicable
    pub user_id: Option<String>,
    /// Session ID if applicable
    pub session_id: Option<String>,
}

impl LogEntry {
    pub fn new(level: LogLevel, service: &str, message: &str) -> Self {
        Self {
            id: Uuid::new_v4().to_string(),
            timestamp: Utc::now(),
            level,
            service: service.to_string(),
            function: None,
            message: message.to_string(),
            metadata: HashMap::new(),
            error_context: None,
            correlation_id: None,
            user_id: None,
            session_id: None,
        }
    }

    pub fn with_function(mut self, function: &str) -> Self {
        self.function = Some(function.to_string());
        self
    }

    pub fn with_metadata(mut self, key: &str, value: serde_json::Value) -> Self {
        self.metadata.insert(key.to_string(), value);
        self
    }

    pub fn with_correlation_id(mut self, correlation_id: &str) -> Self {
        self.correlation_id = Some(correlation_id.to_string());
        self
    }

    pub fn with_user(mut self, user_id: &str) -> Self {
        self.user_id = Some(user_id.to_string());
        self
    }

    pub fn with_session(mut self, session_id: &str) -> Self {
        self.session_id = Some(session_id.to_string());
        self
    }

    pub fn with_error_context(mut self, error_context: ErrorContext) -> Self {
        self.error_context = Some(error_context);
        self
    }
}

/// Logging configuration
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LoggingConfig {
    /// Minimum log level to capture
    pub min_level: LogLevel,
    /// Whether to write to file
    pub file_enabled: bool,
    /// Log file path
    pub file_path: Option<PathBuf>,
    /// Maximum log file size in bytes before rotation
    pub max_file_size: u64,
    /// Maximum number of log files to keep
    pub max_files: u32,
    /// Whether to include structured metadata in logs
    pub include_metadata: bool,
    /// Log format (json or text)
    pub format: LogFormat,
    /// Whether to enable console output
    pub console_enabled: bool,
    /// Console output format
    pub console_format: LogFormat,
    /// Which services to include (empty means all)
    pub included_services: Vec<String>,
    /// Which services to exclude
    pub excluded_services: Vec<String>,
    /// Enable async logging
    pub async_logging: bool,
    /// Buffer size for async logging
    pub buffer_size: usize,
}

impl Default for LoggingConfig {
    fn default() -> Self {
        Self {
            min_level: LogLevel::Info,
            file_enabled: true,
            file_path: Some(dirs::home_dir()
                .unwrap_or_else(|| PathBuf::from("."))
                .join(".lima-vm-manager")
                .join("logs")
                .join("app.log")),
            max_file_size: 10 * 1024 * 1024, // 10MB
            max_files: 5,
            include_metadata: true,
            format: LogFormat::Json,
            console_enabled: true,
            console_format: LogFormat::Text,
            included_services: Vec::new(),
            excluded_services: vec!["tauri".to_string()],
            async_logging: true,
            buffer_size: 1000,
        }
    }
}

/// Log format options
#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum LogFormat {
    Json,
    Text,
}

/// Log rotation strategy
#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum RotationStrategy {
    /// Rotate when file reaches max size
    Size,
    /// Rotate daily
    Daily,
    /// Rotate hourly
    Hourly,
    /// Never rotate
    Never,
}

/// Log statistics for monitoring
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LogStats {
    pub timestamp: DateTime<Utc>,
    pub total_entries: u64,
    pub entries_by_level: HashMap<LogLevel, u64>,
    pub entries_by_service: HashMap<String, u64>,
    pub current_file_size: u64,
    pub files_rotated: u64,
    pub error_count: u64,
    pub warn_count: u64,
}

/// Main logging service
pub struct LoggingService {
    config: Mutex<LoggingConfig>,
    file_writer: Option<Mutex<BufWriter<File>>>,
    log_sender: broadcast::Sender<LogEntry>,
    stats: Mutex<LogStats>,
    log_buffer: Arc<Mutex<Vec<LogEntry>>>,
}

impl LoggingService {
    pub fn new(config: LoggingConfig) -> Result<Self, AppError> {
        let (log_sender, _) = broadcast::channel(config.buffer_size);

        let file_writer = Self::create_file_writer(&config)?;

        Ok(Self {
            config: Mutex::new(config),
            file_writer: if file_writer.is_some() {
                Some(Mutex::new(file_writer.unwrap()))
            } else {
                None
            },
            log_sender,
            stats: Mutex::new(LogStats {
                timestamp: Utc::now(),
                total_entries: 0,
                entries_by_level: HashMap::new(),
                entries_by_service: HashMap::new(),
                current_file_size: 0,
                files_rotated: 0,
                error_count: 0,
                warn_count: 0,
            }),
            log_buffer: Arc::new(Mutex::new(Vec::new())),
        })
    }

    fn create_file_writer(config: &LoggingConfig) -> Result<Option<BufWriter<File>>, AppError> {
        if !config.file_enabled {
            return Ok(None);
        }

        if let Some(file_path) = &config.file_path {
            // Ensure directory exists
            if let Some(parent) = file_path.parent() {
                std::fs::create_dir_all(parent)
                    .map_err(|e| app_error!(filesystem, parent.to_string_lossy(), &e.to_string()))?;
            }

            // Open file for writing (append mode)
            let file = OpenOptions::new()
                .create(true)
                .append(true)
                .open(file_path)
                .map_err(|e| app_error!(filesystem, file_path.to_string_lossy(), &e.to_string()))?;

            Ok(Some(BufWriter::new(file)))
        } else {
            Ok(None)
        }
    }

    /// Log a message
    pub fn log(&self, entry: LogEntry) -> Result<(), AppError> {
        // Check if we should log this entry
        if !self.should_log(&entry) {
            return Ok(());
        }

        // Update statistics
        self.update_stats(&entry);

        // Send to broadcast channel
        let _ = self.log_sender.send(entry.clone());

        // Write to file if enabled
        if self.config.lock().unwrap().file_enabled {
            self.write_to_file(&entry)?;
        }

        // Write to console if enabled
        if self.config.lock().unwrap().console_enabled {
            self.write_to_console(&entry);
        }

        // Store in buffer
        {
            let mut buffer = self.log_buffer.lock().unwrap();
            buffer.push(entry.clone());

            // Keep buffer size limited
            if buffer.len() > 1000 {
                buffer.drain(0..500);
            }
        }

        Ok(())
    }

    /// Convenience method to log at different levels
    pub fn log_with_level(&self, level: LogLevel, service: &str, message: &str) -> Result<(), AppError> {
        let entry = LogEntry::new(level, service, message);
        self.log(entry)
    }

    /// Log trace message
    pub fn trace(&self, service: &str, message: &str) -> Result<(), AppError> {
        self.log_with_level(LogLevel::Trace, service, message)
    }

    /// Log debug message
    pub fn debug(&self, service: &str, message: &str) -> Result<(), AppError> {
        self.log_with_level(LogLevel::Debug, service, message)
    }

    /// Log info message
    pub fn info(&self, service: &str, message: &str) -> Result<(), AppError> {
        self.log_with_level(LogLevel::Info, service, message)
    }

    /// Log warning message
    pub fn warn(&self, service: &str, message: &str) -> Result<(), AppError> {
        self.log_with_level(LogLevel::Warn, service, message)
    }

    /// Log error message
    pub fn error(&self, service: &str, message: &str) -> Result<(), AppError> {
        self.log_with_level(LogLevel::Error, service, message)
    }

    /// Log contextual error
    pub fn log_error(&self, error: &ContextualError) -> Result<(), AppError> {
        let entry = LogEntry::new(
            LogLevel::Error,
            &error.context.service,
            &error.error.to_string()
        )
        .with_function(error.context.function.as_deref().unwrap_or("unknown"))
        .with_error_context(error.context.clone())
        .with_correlation_id(error.context.correlation_id.as_deref().unwrap_or(""))
        .with_user(error.context.user_id.as_deref().unwrap_or(""))
        .with_session(error.context.session_id.as_deref().unwrap_or(""));

        self.log(entry)
    }

    /// Check if entry should be logged based on configuration
    fn should_log(&self, entry: &LogEntry) -> bool {
        let config = self.config.lock().unwrap();

        // Check minimum level
        if entry.level < config.min_level {
            return false;
        }

        // Check service inclusion/exclusion
        if !config.included_services.is_empty() && !config.included_services.contains(&entry.service) {
            return false;
        }

        if config.excluded_services.contains(&entry.service) {
            return false;
        }

        true
    }

    /// Write entry to file
    fn write_to_file(&self, entry: &LogEntry) -> Result<(), AppError> {
        let config = self.config.lock().unwrap();

        if let Some(writer_mutex) = &self.file_writer {
            let mut writer = writer_mutex.lock().unwrap();

            let line = match config.format {
                LogFormat::Json => {
                    serde_json::to_string(entry)
                        .map_err(|e| app_error!(parse, "JSON", &e.to_string()))?
                }
                LogFormat::Text => {
                    self.format_text_entry(entry)
                }
            };

            writeln!(writer, "{}", line)
                .map_err(|e| app_error!(filesystem, "log file", &e.to_string()))?;

            writer.flush()
                .map_err(|e| app_error!(filesystem, "log file", &e.to_string()))?;
        }

        Ok(())
    }

    /// Write entry to console
    fn write_to_console(&self, entry: &LogEntry) {
        let config = self.config.lock().unwrap();
        let formatted = match config.console_format {
            LogFormat::Json => serde_json::to_string(entry).unwrap_or_default(),
            LogFormat::Text => self.format_text_entry(entry),
        };

        match entry.level {
            LogLevel::Trace | LogLevel::Debug => eprintln!("{}", formatted),
            LogLevel::Info => println!("{}", formatted),
            LogLevel::Warn | LogLevel::Error => eprintln!("{}", formatted),
        }
    }

    /// Format entry as text
    fn format_text_entry(&self, entry: &LogEntry) -> String {
        let timestamp = entry.timestamp.format("%Y-%m-%d %H:%M:%S%.3f UTC");
        let level = entry.level.as_str();
        let service = &entry.service;
        let function = entry.function.as_deref().unwrap_or("");
        let message = &entry.message;

        if !function.is_empty() {
            format!("[{} {} {}:{}] {}", timestamp, level, service, function, message)
        } else {
            format!("[{} {} {}] {}", timestamp, level, service, message)
        }
    }

    /// Update statistics
    fn update_stats(&self, entry: &LogEntry) {
        let mut stats = self.stats.lock().unwrap();

        stats.total_entries += 1;
        stats.entries_by_level
            .entry(entry.level)
            .and_modify(|e| *e += 1)
            .or_insert(1);
        stats.entries_by_service
            .entry(entry.service.clone())
            .and_modify(|e| *e += 1)
            .or_insert(1);

        if entry.level == LogLevel::Error {
            stats.error_count += 1;
        } else if entry.level == LogLevel::Warn {
            stats.warn_count += 1;
        }

        stats.timestamp = Utc::now();
    }

    /// Get log statistics
    pub fn get_stats(&self) -> LogStats {
        self.stats.lock().unwrap().clone()
    }

    /// Get recent log entries
    pub fn get_recent_logs(&self, limit: usize) -> Vec<LogEntry> {
        let buffer = self.log_buffer.lock().unwrap();
        buffer.iter()
            .rev()
            .take(limit)
            .cloned()
            .collect()
    }

    /// Subscribe to log entries
    pub fn subscribe(&self) -> broadcast::Receiver<LogEntry> {
        self.log_sender.subscribe()
    }

    /// Update configuration
    pub fn update_config(&self, new_config: LoggingConfig) -> Result<(), AppError> {
        *self.config.lock().unwrap() = new_config.clone();

        // Reinitialize file writer if needed
        if let Some(file_writer) = Self::create_file_writer(&new_config)? {
            if let Some(writer_mutex) = &self.file_writer {
                *writer_mutex.lock().unwrap() = file_writer;
            }
        }

        Ok(())
    }

    /// Get current configuration
    pub fn get_config(&self) -> LoggingConfig {
        self.config.lock().unwrap().clone()
    }

    /// Clear log buffer
    pub fn clear_buffer(&self) {
        let mut buffer = self.log_buffer.lock().unwrap();
        buffer.clear();
    }

    /// Rotate log files if needed
    pub fn rotate_if_needed(&self) -> Result<(), AppError> {
        let config = self.config.lock().unwrap();

        if let Some(file_path) = &config.file_path {
            if let Ok(metadata) = std::fs::metadata(file_path) {
                if metadata.len() >= config.max_file_size {
                    self.rotate_logs(file_path, config.max_files)?;
                }
            }
        }

        Ok(())
    }

    /// Rotate log files
    fn rotate_logs(&self, current_path: &PathBuf, max_files: u32) -> Result<(), AppError> {
        // Remove oldest log file if it exists
        let oldest_path = current_path.with_extension(format!("log.{}", max_files));
        if oldest_path.exists() {
            std::fs::remove_file(&oldest_path)
                .map_err(|e| app_error!(filesystem, oldest_path.to_string_lossy(), &e.to_string()))?;
        }

        // Rotate existing log files
        for i in (1..max_files).rev() {
            let old_path = current_path.with_extension(format!("log.{}", i));
            let new_path = current_path.with_extension(format!("log.{}", i + 1));

            if old_path.exists() {
                std::fs::rename(&old_path, &new_path)
                    .map_err(|e| app_error!(filesystem, old_path.to_string_lossy(), &e.to_string()))?;
            }
        }

        // Move current log file to .1
        let rotated_path = current_path.with_extension("log.1");
        std::fs::rename(current_path, &rotated_path)
            .map_err(|e| app_error!(filesystem, current_path.to_string_lossy(), &e.to_string()))?;

        // Update stats
        {
            let mut stats = self.stats.lock().unwrap();
            stats.files_rotated += 1;
            stats.current_file_size = 0;
        }

        // Reinitialize file writer
        // Reinitialize file writer if needed (handled in constructor)

        Ok(())
    }
}

impl Default for LoggingService {
    fn default() -> Self {
        Self::new(LoggingConfig::default())
            .expect("Failed to create default logging service")
    }
}

/// Global logging service instance
static mut GLOBAL_LOGGER: Option<Arc<LoggingService>> = None;
static LOGGER_INIT: std::sync::Once = std::sync::Once::new();

/// Initialize global logger
pub fn init_global_logger(config: LoggingConfig) -> Result<(), AppError> {
    LOGGER_INIT.call_once(|| {
        let logger = LoggingService::new(config)
            .expect("Failed to initialize global logger");
        unsafe {
            GLOBAL_LOGGER = Some(Arc::new(logger));
        }
    });
    Ok(())
}

/// Get global logger instance
pub fn get_global_logger() -> Option<Arc<LoggingService>> {
    unsafe { GLOBAL_LOGGER.clone() }
}

/// Convenience macros for logging
#[macro_export]
macro_rules! log_trace {
    ($service:expr, $($arg:tt)*) => {
        if let Some(logger) = $crate::services::logging::get_global_logger() {
            let message = format!($($arg)*);
            let _ = logger.trace($service, &message);
        }
    };
}

#[macro_export]
macro_rules! log_debug {
    ($service:expr, $($arg:tt)*) => {
        if let Some(logger) = $crate::services::logging::get_global_logger() {
            let message = format!($($arg)*);
            let _ = logger.debug($service, &message);
        }
    };
}

#[macro_export]
macro_rules! log_info {
    ($service:expr, $($arg:tt)*) => {
        if let Some(logger) = $crate::services::logging::get_global_logger() {
            let message = format!($($arg)*);
            let _ = logger.info($service, &message);
        }
    };
}

#[macro_export]
macro_rules! log_warn {
    ($service:expr, $($arg:tt)*) => {
        if let Some(logger) = $crate::services::logging::get_global_logger() {
            let message = format!($($arg)*);
            let _ = logger.warn($service, &message);
        }
    };
}

#[macro_export]
macro_rules! log_error {
    ($service:expr, $($arg:tt)*) => {
        if let Some(logger) = $crate::services::logging::get_global_logger() {
            let message = format!($($arg)*);
            let _ = logger.error($service, &message);
        }
    };
}

#[macro_export]
macro_rules! log_contextual_error {
    ($error:expr) => {
        if let Some(logger) = $crate::services::logging::get_global_logger() {
            let _ = logger.log_error($error);
        }
    };
}

// Tauri commands for logging
#[tauri::command]
pub async fn get_log_stats(
    logging_service: tauri::State<'_, Arc<LoggingService>>,
) -> Result<LogStats, String> {
    Ok(logging_service.get_stats())
}

#[tauri::command]
pub async fn get_recent_logs(
    logging_service: tauri::State<'_, Arc<LoggingService>>,
    limit: Option<usize>,
) -> Result<Vec<LogEntry>, String> {
    Ok(logging_service.get_recent_logs(limit.unwrap_or(100)))
}

#[tauri::command]
pub async fn update_logging_config(
    logging_service: tauri::State<'_, Arc<LoggingService>>,
    config: LoggingConfig,
) -> Result<(), String> {
    logging_service.update_config(config)
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn get_logging_config(
    logging_service: tauri::State<'_, Arc<LoggingService>>,
) -> Result<LoggingConfig, String> {
    Ok(logging_service.get_config())
}

#[tauri::command]
pub async fn clear_log_buffer(
    logging_service: tauri::State<'_, Arc<LoggingService>>,
) -> Result<(), String> {
    logging_service.clear_buffer();
    Ok(())
}

#[tauri::command]
pub async fn rotate_logs(
    logging_service: tauri::State<'_, Arc<LoggingService>>,
) -> Result<(), String> {
    logging_service.rotate_if_needed()
        .map_err(|e| e.to_string())
}