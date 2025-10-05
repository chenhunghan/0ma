use thiserror::Error;
use std::fmt;
use serde::{Deserialize, Serialize};
use chrono::{DateTime, Utc};
use std::collections::HashMap;

/// Application-level error types that span all services
#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum AppError {
    /// Configuration-related errors
    Config { message: String, source: Option<String> },

    /// VM management errors
    VMOperation { operation: String, message: String, vm_id: Option<String> },

    /// CLI tool detection errors
    CLITool { tool: String, message: String },

    /// Filesystem I/O errors
    Filesystem { path: String, message: String },

    /// Network-related errors
    Network { message: String },

    /// Validation errors
    Validation { field: String, message: String },

    /// Permission errors
    Permission { resource: String },

    /// Timeout errors
    Timeout { operation: String, timeout_ms: u64 },

    /// Parse/Serialization errors
    Parse { format: String, message: String },

    /// External command errors
    ExternalCommand { command: String, message: String, exit_code: Option<i32> },

    /// Database errors
    Database { message: String },

    /// Authentication/Authorization errors
    Authentication { message: String },

    /// Resource not found errors
    NotFound { resource_type: String, identifier: String },

    /// Internal/unexpected errors
    Internal { message: String, code: Option<String> },

    /// Generic error with custom message
    Generic { message: String, error_code: Option<String> },
}

impl std::fmt::Display for AppError {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            AppError::Config { message, source } => {
                if let Some(src) = source {
                    write!(f, "Configuration error: {} (source: {})", message, src)
                } else {
                    write!(f, "Configuration error: {}", message)
                }
            }
            AppError::VMOperation { operation, message, vm_id } => {
                if let Some(id) = vm_id {
                    write!(f, "VM operation failed: {} - {} (vm_id: {})", operation, message, id)
                } else {
                    write!(f, "VM operation failed: {} - {}", operation, message)
                }
            }
            AppError::CLITool { tool, message } => {
                write!(f, "CLI tool error: {} - {}", tool, message)
            }
            AppError::Filesystem { path, message } => {
                write!(f, "Filesystem error: {} - {}", path, message)
            }
            AppError::Network { message } => {
                write!(f, "Network error: {}", message)
            }
            AppError::Validation { field, message } => {
                write!(f, "Validation error: {} - {}", field, message)
            }
            AppError::Permission { resource } => {
                write!(f, "Permission denied: {}", resource)
            }
            AppError::Timeout { operation, timeout_ms } => {
                write!(f, "Operation timeout: {} exceeded {}ms", operation, timeout_ms)
            }
            AppError::Parse { format, message } => {
                write!(f, "Parse error: {} - {}", format, message)
            }
            AppError::ExternalCommand { command, message, exit_code } => {
                if let Some(code) = exit_code {
                    write!(f, "External command failed: {} - {} (exit code: {})", command, message, code)
                } else {
                    write!(f, "External command failed: {} - {}", command, message)
                }
            }
            AppError::Database { message } => {
                write!(f, "Database error: {}", message)
            }
            AppError::Authentication { message } => {
                write!(f, "Authentication error: {}", message)
            }
            AppError::NotFound { resource_type, identifier } => {
                write!(f, "Resource not found: {} '{}'", resource_type, identifier)
            }
            AppError::Internal { message, code } => {
                if let Some(c) = code {
                    write!(f, "Internal error: {} (code: {})", message, c)
                } else {
                    write!(f, "Internal error: {}", message)
                }
            }
            AppError::Generic { message, error_code } => {
                if let Some(code) = error_code {
                    write!(f, "{} (code: {})", message, code)
                } else {
                    write!(f, "{}", message)
                }
            }
        }
    }
}

impl std::error::Error for AppError {}

impl AppError {
    /// Get error category for routing/log filtering
    pub fn category(&self) -> ErrorCategory {
        match self {
            AppError::Config { .. } => ErrorCategory::Configuration,
            AppError::VMOperation { .. } => ErrorCategory::VM,
            AppError::CLITool { .. } => ErrorCategory::CLI,
            AppError::Filesystem { .. } => ErrorCategory::Filesystem,
            AppError::Network { .. } => ErrorCategory::Network,
            AppError::Validation { .. } => ErrorCategory::Validation,
            AppError::Permission { .. } => ErrorCategory::Permission,
            AppError::Timeout { .. } => ErrorCategory::Timeout,
            AppError::Parse { .. } => ErrorCategory::Parse,
            AppError::ExternalCommand { .. } => ErrorCategory::ExternalCommand,
            AppError::Database { .. } => ErrorCategory::Database,
            AppError::Authentication { .. } => ErrorCategory::Authentication,
            AppError::NotFound { .. } => ErrorCategory::NotFound,
            AppError::Internal { .. } => ErrorCategory::Internal,
            AppError::Generic { .. } => ErrorCategory::Generic,
        }
    }

    /// Get error severity for logging/alerting
    pub fn severity(&self) -> ErrorSeverity {
        match self {
            AppError::Internal { .. } => ErrorSeverity::Critical,
            AppError::Permission { .. } => ErrorSeverity::High,
            AppError::VMOperation { .. } => ErrorSeverity::High,
            AppError::Database { .. } => ErrorSeverity::High,
            AppError::Authentication { .. } => ErrorSeverity::High,
            AppError::Config { .. } => ErrorSeverity::Medium,
            AppError::Network { .. } => ErrorSeverity::Medium,
            AppError::Timeout { .. } => ErrorSeverity::Medium,
            AppError::ExternalCommand { .. } => ErrorSeverity::Medium,
            AppError::Filesystem { .. } => ErrorSeverity::Medium,
            AppError::Validation { .. } => ErrorSeverity::Low,
            AppError::CLITool { .. } => ErrorSeverity::Low,
            AppError::Parse { .. } => ErrorSeverity::Low,
            AppError::NotFound { .. } => ErrorSeverity::Low,
            AppError::Generic { .. } => ErrorSeverity::Medium,
        }
    }

    /// Check if error is retryable
    pub fn is_retryable(&self) -> bool {
        matches!(self,
            AppError::Network { .. } |
            AppError::Timeout { .. } |
            AppError::ExternalCommand { .. }
        )
    }

    /// Get suggested retry delay in milliseconds
    pub fn retry_delay_ms(&self) -> Option<u64> {
        match self {
            AppError::Network { .. } => Some(1000),
            AppError::Timeout { .. } => Some(5000),
            AppError::ExternalCommand { .. } => Some(2000),
            _ => None,
        }
    }
}

/// Error categories for filtering and routing
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, Serialize, Deserialize)]
pub enum ErrorCategory {
    Configuration,
    VM,
    CLI,
    Filesystem,
    Network,
    Validation,
    Permission,
    Timeout,
    Parse,
    ExternalCommand,
    Database,
    Authentication,
    NotFound,
    Internal,
    Generic,
}

/// Error severity levels for logging and alerting
#[derive(Debug, Clone, Copy, PartialEq, Eq, PartialOrd, Ord, Hash, Serialize, Deserialize)]
pub enum ErrorSeverity {
    Trace = 0,
    Debug = 1,
    Info = 2,
    Low = 3,
    Medium = 4,
    High = 5,
    Critical = 6,
}

/// Enhanced error context information
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ErrorContext {
    /// Unique error ID for tracking
    pub error_id: String,
    /// Timestamp when error occurred
    pub timestamp: DateTime<Utc>,
    /// Error category
    pub category: ErrorCategory,
    /// Error severity
    pub severity: ErrorSeverity,
    /// Service/module where error occurred
    pub service: String,
    /// Function/method where error occurred
    pub function: Option<String>,
    /// Additional context data
    pub context: HashMap<String, serde_json::Value>,
    /// Stack trace (in debug builds)
    #[cfg(debug_assertions)]
    pub stack_trace: Option<String>,
    /// Correlation ID for request tracking
    pub correlation_id: Option<String>,
    /// User ID if applicable
    pub user_id: Option<String>,
    /// Session ID if applicable
    pub session_id: Option<String>,
}

impl ErrorContext {
    pub fn new(
        service: &str,
        error: &AppError,
        correlation_id: Option<String>,
    ) -> Self {
        Self {
            error_id: uuid::Uuid::new_v4().to_string(),
            timestamp: Utc::now(),
            category: error.category(),
            severity: error.severity(),
            service: service.to_string(),
            function: None,
            context: HashMap::new(),
            #[cfg(debug_assertions)]
            stack_trace: None,
            correlation_id,
            user_id: None,
            session_id: None,
        }
    }

    pub fn with_function(mut self, function: &str) -> Self {
        self.function = Some(function.to_string());
        self
    }

    pub fn with_context(mut self, key: &str, value: serde_json::Value) -> Self {
        self.context.insert(key.to_string(), value);
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
}

/// Result type alias for convenience
pub type AppResult<T> = Result<T, AppError>;

/// Error with full context
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ContextualError {
    pub error: AppError,
    pub context: ErrorContext,
}

impl fmt::Display for ContextualError {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        write!(f, "[{}] {} ({})",
            self.context.error_id,
            self.error,
            self.context.service
        )
    }
}

impl std::error::Error for ContextualError {}

/// Error metrics for monitoring
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ErrorMetrics {
    pub timestamp: DateTime<Utc>,
    pub total_errors: u64,
    pub errors_by_category: HashMap<ErrorCategory, u64>,
    pub errors_by_severity: HashMap<ErrorSeverity, u64>,
    pub errors_by_service: HashMap<String, u64>,
    pub retryable_errors: u64,
    pub non_retryable_errors: u64,
}

/// Error recovery strategies
#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum RecoveryStrategy {
    /// No recovery possible
    None,
    /// Retry with exponential backoff
    RetryWithBackoff { base_delay_ms: u64, max_retries: u32 },
    /// Retry with fixed delay
    RetryWithFixedDelay { delay_ms: u64, max_retries: u32 },
    /// Fallback to alternative method
    Fallback { alternative: String },
    /// Graceful degradation
    GracefulDegradation,
    /// User intervention required
    UserIntervention { message: String },
}

impl AppError {
    /// Get suggested recovery strategy
    pub fn recovery_strategy(&self) -> RecoveryStrategy {
        match self {
            AppError::VMOperation { .. } => RecoveryStrategy::RetryWithBackoff {
                base_delay_ms: 2000,
                max_retries: 2
            },
            AppError::Network { .. } => RecoveryStrategy::RetryWithBackoff {
                base_delay_ms: 1000,
                max_retries: 3
            },
            AppError::Timeout { .. } => RecoveryStrategy::RetryWithBackoff {
                base_delay_ms: 5000,
                max_retries: 2
            },
            AppError::ExternalCommand { .. } => RecoveryStrategy::RetryWithFixedDelay {
                delay_ms: 2000,
                max_retries: 2
            },
            AppError::Config { .. } => RecoveryStrategy::Fallback {
                alternative: "use_default_config".to_string()
            },
            AppError::CLITool { .. } => RecoveryStrategy::UserIntervention {
                message: "Please install the required CLI tool".to_string()
            },
            AppError::Permission { .. } => RecoveryStrategy::UserIntervention {
                message: "Please check file permissions".to_string()
            },
            AppError::Validation { .. } => RecoveryStrategy::None,
            AppError::NotFound { .. } => RecoveryStrategy::None,
            AppError::Internal { .. } => RecoveryStrategy::None,
            AppError::Database { .. } => RecoveryStrategy::RetryWithBackoff {
                base_delay_ms: 500,
                max_retries: 5
            },
            AppError::Authentication { .. } => RecoveryStrategy::UserIntervention {
                message: "Please authenticate again".to_string()
            },
            AppError::Filesystem { .. } => RecoveryStrategy::RetryWithFixedDelay {
                delay_ms: 1000,
                max_retries: 3
            },
            AppError::Parse { .. } => RecoveryStrategy::None,
            AppError::Generic { .. } => RecoveryStrategy::RetryWithFixedDelay {
                delay_ms: 1000,
                max_retries: 1
            },
        }
    }
}

/// Conversion traits for common error types
impl From<std::io::Error> for AppError {
    fn from(err: std::io::Error) -> Self {
        AppError::Filesystem {
            path: "unknown".to_string(),
            message: err.to_string(),
        }
    }
}

impl From<serde_json::Error> for AppError {
    fn from(err: serde_json::Error) -> Self {
        AppError::Parse {
            format: "JSON".to_string(),
            message: err.to_string(),
        }
    }
}

impl From<serde_yaml::Error> for AppError {
    fn from(err: serde_yaml::Error) -> Self {
        AppError::Parse {
            format: "YAML".to_string(),
            message: err.to_string(),
        }
    }
}

impl From<regex::Error> for AppError {
    fn from(err: regex::Error) -> Self {
        AppError::Parse {
            format: "Regex".to_string(),
            message: err.to_string(),
        }
    }
}

impl From<chrono::ParseError> for AppError {
    fn from(err: chrono::ParseError) -> Self {
        AppError::Parse {
            format: "DateTime".to_string(),
            message: err.to_string(),
        }
    }
}

/// Macro for creating contextual errors easily
#[macro_export]
macro_rules! app_error {
    (config, $msg:expr) => {
        AppError::Config { message: $msg.to_string(), source: None }
    };
    (config, $msg:expr, $source:expr) => {
        AppError::Config { message: $msg.to_string(), source: Some($source.to_string()) }
    };
    (vm, $op:expr, $msg:expr) => {
        AppError::VMOperation { operation: $op.to_string(), message: $msg.to_string(), vm_id: None }
    };
    (vm, $op:expr, $msg:expr, $vm_id:expr) => {
        AppError::VMOperation { operation: $op.to_string(), message: $msg.to_string(), vm_id: Some($vm_id.to_string()) }
    };
    (cli, $tool:expr, $msg:expr) => {
        AppError::CLITool { tool: $tool.to_string(), message: $msg.to_string() }
    };
    (filesystem, $path:expr, $msg:expr) => {
        AppError::Filesystem { path: $path.to_string(), message: $msg.to_string() }
    };
    (validation, $field:expr, $msg:expr) => {
        AppError::Validation { field: $field.to_string(), message: $msg.to_string() }
    };
    (parse, $format:expr, $msg:expr) => {
        AppError::Parse { format: $format.to_string(), message: $msg.to_string() }
    };
    (permission, $resource:expr) => {
        AppError::Permission { resource: $resource.to_string() }
    };
    (not_found, $type:expr, $id:expr) => {
        AppError::NotFound { resource_type: $type.to_string(), identifier: $id.to_string() }
    };
    (internal, $msg:expr) => {
        AppError::Internal { message: $msg.to_string(), code: None }
    };
    (generic, $msg:expr) => {
        AppError::Generic { message: $msg.to_string(), error_code: None }
    };
}

/// Macro for creating contextual errors with service information
#[macro_export]
macro_rules! contextual_error {
    ($service:expr, $error:expr) => {
        ContextualError {
            error: $error,
            context: ErrorContext::new($service, &$error, None),
        }
    };
    ($service:expr, $error:expr, $function:expr) => {
        ContextualError {
            error: $error,
            context: ErrorContext::new($service, &$error, None).with_function($function),
        }
    };
    ($service:expr, $error:expr, $function:expr, $($key:expr => $value:expr),*) => {
        ContextualError {
            error: $error,
            context: {
                let mut ctx = ErrorContext::new($service, &$error, None).with_function($function);
                $(ctx = ctx.with_context($key, serde_json::to_value($value).unwrap());)*
                ctx
            },
        }
    };
}