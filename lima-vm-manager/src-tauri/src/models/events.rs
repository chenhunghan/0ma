use serde::{Deserialize, Serialize};
use chrono::{DateTime, Utc};
use uuid::Uuid;
use std::collections::HashMap;
use std::sync::Arc;
use tokio::sync::{broadcast, RwLock};

/// Event priority levels
#[derive(Debug, Clone, Copy, PartialEq, Eq, PartialOrd, Ord, Hash, Serialize, Deserialize)]
pub enum EventPriority {
    Trace = 0,
    Debug = 1,
    Info = 2,
    Low = 3,
    Medium = 4,
    High = 5,
    Critical = 6,
}

impl Default for EventPriority {
    fn default() -> Self {
        EventPriority::Info
    }
}

/// Event categories for routing and filtering
#[derive(Debug, Clone, PartialEq, Eq, Hash, Serialize, Deserialize)]
pub enum EventCategory {
    // VM Management Events
    VMLifecycle,
    VMStatus,
    VMResources,
    VMNetwork,
    VMStorage,
    VMPerformance,
    VMHealth,

    // Configuration Events
    ConfigChange,
    ConfigValidation,
    ConfigBackup,
    ConfigRestore,
    ConfigReload,

    // State Management Events
    StateChange,
    StateSnapshot,
    StateBackup,
    StateRestore,
    StateCleanup,

    // System Events
    SystemStartup,
    SystemShutdown,
    SystemHealth,
    SystemPerformance,
    SystemError,

    // User Interface Events
    UIInteraction,
    UINotification,
    UIThemeChange,
    UILayoutChange,

    // CLI Tool Events
    CLIToolDetection,
    CLIToolUpdate,
    CLIToolError,

    // Logging Events
    LogCreated,
    LogRotated,
    LogCleared,
    LogError,

    // Network Events
    NetworkConnected,
    NetworkDisconnected,
    NetworkError,

    // Security Events
    Authentication,
    Authorization,
    SecurityViolation,

    // Application Events
    AppStarted,
    AppStopped,
    AppCrashed,
    AppUpdated,

    // Custom Events
    Custom(String),
}

impl EventCategory {
    pub fn as_str(&self) -> &str {
        match self {
            EventCategory::VMLifecycle => "vm_lifecycle",
            EventCategory::VMStatus => "vm_status",
            EventCategory::VMResources => "vm_resources",
            EventCategory::VMNetwork => "vm_network",
            EventCategory::VMStorage => "vm_storage",
            EventCategory::VMPerformance => "vm_performance",
            EventCategory::VMHealth => "vm_health",
            EventCategory::ConfigChange => "config_change",
            EventCategory::ConfigValidation => "config_validation",
            EventCategory::ConfigBackup => "config_backup",
            EventCategory::ConfigRestore => "config_restore",
            EventCategory::ConfigReload => "config_reload",
            EventCategory::StateChange => "state_change",
            EventCategory::StateSnapshot => "state_snapshot",
            EventCategory::StateBackup => "state_backup",
            EventCategory::StateRestore => "state_restore",
            EventCategory::StateCleanup => "state_cleanup",
            EventCategory::SystemStartup => "system_startup",
            EventCategory::SystemShutdown => "system_shutdown",
            EventCategory::SystemHealth => "system_health",
            EventCategory::SystemPerformance => "system_performance",
            EventCategory::SystemError => "system_error",
            EventCategory::UIInteraction => "ui_interaction",
            EventCategory::UINotification => "ui_notification",
            EventCategory::UIThemeChange => "ui_theme_change",
            EventCategory::UILayoutChange => "ui_layout_change",
            EventCategory::CLIToolDetection => "cli_tool_detection",
            EventCategory::CLIToolUpdate => "cli_tool_update",
            EventCategory::CLIToolError => "cli_tool_error",
            EventCategory::LogCreated => "log_created",
            EventCategory::LogRotated => "log_rotated",
            EventCategory::LogCleared => "log_cleared",
            EventCategory::LogError => "log_error",
            EventCategory::NetworkConnected => "network_connected",
            EventCategory::NetworkDisconnected => "network_disconnected",
            EventCategory::NetworkError => "network_error",
            EventCategory::Authentication => "authentication",
            EventCategory::Authorization => "authorization",
            EventCategory::SecurityViolation => "security_violation",
            EventCategory::AppStarted => "app_started",
            EventCategory::AppStopped => "app_stopped",
            EventCategory::AppCrashed => "app_crashed",
            EventCategory::AppUpdated => "app_updated",
            EventCategory::Custom(name) => name,
        }
    }
}

/// Core event structure
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Event {
    /// Unique event identifier
    pub id: String,

    /// Event category for routing
    pub category: EventCategory,

    /// Event type/name
    pub event_type: String,

    /// Event priority
    pub priority: EventPriority,

    /// Source service/component
    pub source: String,

    /// Target service/component (optional)
    pub target: Option<String>,

    /// Event timestamp
    pub timestamp: DateTime<Utc>,

    /// Event data payload
    pub data: serde_json::Value,

    /// Correlation ID for request tracking
    pub correlation_id: Option<String>,

    /// User ID if applicable
    pub user_id: Option<String>,

    /// Session ID if applicable
    pub session_id: Option<String>,

    /// Event tags for filtering
    pub tags: Vec<String>,

    /// Event metadata
    pub metadata: HashMap<String, serde_json::Value>,

    /// Whether this event requires acknowledgement
    pub requires_ack: bool,

    /// Event expiration time (optional)
    pub expires_at: Option<DateTime<Utc>>,

    /// Number of times this event has been retried
    pub retry_count: u32,

    /// Maximum number of retries allowed
    pub max_retries: u32,
}

impl Event {
    pub fn new(category: EventCategory, event_type: String, source: String) -> Self {
        Self {
            id: Uuid::new_v4().to_string(),
            category,
            event_type,
            priority: EventPriority::default(),
            source,
            target: None,
            timestamp: Utc::now(),
            data: serde_json::Value::Null,
            correlation_id: None,
            user_id: None,
            session_id: None,
            tags: Vec::new(),
            metadata: HashMap::new(),
            requires_ack: false,
            expires_at: None,
            retry_count: 0,
            max_retries: 3,
        }
    }

    pub fn with_data(mut self, data: serde_json::Value) -> Self {
        self.data = data;
        self
    }

    pub fn with_priority(mut self, priority: EventPriority) -> Self {
        self.priority = priority;
        self
    }

    pub fn with_target(mut self, target: String) -> Self {
        self.target = Some(target);
        self
    }

    pub fn with_correlation_id(mut self, correlation_id: String) -> Self {
        self.correlation_id = Some(correlation_id);
        self
    }

    pub fn with_user(mut self, user_id: String) -> Self {
        self.user_id = Some(user_id);
        self
    }

    pub fn with_session(mut self, session_id: String) -> Self {
        self.session_id = Some(session_id);
        self
    }

    pub fn with_tag(mut self, tag: String) -> Self {
        self.tags.push(tag);
        self
    }

    pub fn with_tags(mut self, tags: Vec<String>) -> Self {
        self.tags.extend(tags);
        self
    }

    pub fn with_metadata(mut self, key: String, value: serde_json::Value) -> Self {
        self.metadata.insert(key, value);
        self
    }

    pub fn with_metadata_map(mut self, metadata: HashMap<String, serde_json::Value>) -> Self {
        self.metadata.extend(metadata);
        self
    }

    pub fn requires_acknowledgement(mut self) -> Self {
        self.requires_ack = true;
        self
    }

    pub fn with_expiration(mut self, duration: chrono::Duration) -> Self {
        self.expires_at = Some(Utc::now() + duration);
        self
    }

    pub fn with_max_retries(mut self, max_retries: u32) -> Self {
        self.max_retries = max_retries;
        self
    }

    /// Check if event has expired
    pub fn is_expired(&self) -> bool {
        if let Some(expires_at) = self.expires_at {
            Utc::now() > expires_at
        } else {
            false
        }
    }

    /// Check if event can be retried
    pub fn can_retry(&self) -> bool {
        self.retry_count < self.max_retries
    }

    /// Increment retry count
    pub fn increment_retry(&mut self) {
        self.retry_count += 1;
    }
}

/// Event subscription filter
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct EventFilter {
    /// Event categories to include
    pub categories: Vec<EventCategory>,

    /// Event types to include (patterns supported)
    pub event_types: Vec<String>,

    /// Priority filter (minimum priority)
    pub min_priority: Option<EventPriority>,

    /// Source services to include
    pub sources: Vec<String>,

    /// Target services to include
    pub targets: Vec<String>,

    /// Tags to include
    pub tags: Vec<String>,

    /// Time range filter
    pub time_range: Option<EventTimeRange>,

    /// Custom filter expression
    pub custom_filter: Option<String>,

    /// Maximum number of events to receive
    pub limit: Option<usize>,
}

impl Default for EventFilter {
    fn default() -> Self {
        Self {
            categories: Vec::new(),
            event_types: Vec::new(),
            min_priority: None,
            sources: Vec::new(),
            targets: Vec::new(),
            tags: Vec::new(),
            time_range: None,
            custom_filter: None,
            limit: None,
        }
    }
}

/// Time range for event filtering
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct EventTimeRange {
    pub start: DateTime<Utc>,
    pub end: DateTime<Utc>,
}

impl EventTimeRange {
    pub fn new(start: DateTime<Utc>, end: DateTime<Utc>) -> Self {
        Self { start, end }
    }

    pub fn from_duration(duration: chrono::Duration) -> Self {
        let end = Utc::now();
        let start = end - duration;
        Self { start, end }
    }

    pub fn contains(&self, timestamp: DateTime<Utc>) -> bool {
        timestamp >= self.start && timestamp <= self.end
    }
}

/// Event subscription
#[derive(Debug)]
pub struct EventSubscription {
    /// Unique subscription ID
    pub id: String,

    /// Filter for events
    pub filter: EventFilter,

    /// Subscription creation time
    pub created_at: DateTime<Utc>,

    /// Whether subscription is active
    pub active: bool,

    /// Number of events received
    pub events_received: u64,

    /// Last event received time
    pub last_event_at: Option<DateTime<Utc>>,

    /// Event receiver channel
    pub receiver: broadcast::Receiver<Event>,
}

impl EventSubscription {
    pub fn new(filter: EventFilter, receiver: broadcast::Receiver<Event>) -> Self {
        Self {
            id: Uuid::new_v4().to_string(),
            filter,
            created_at: Utc::now(),
            active: true,
            events_received: 0,
            last_event_at: None,
            receiver,
        }
    }

    /// Try to receive next event
    pub fn try_recv(&mut self) -> Result<Event, broadcast::error::TryRecvError> {
        match self.receiver.try_recv() {
            Ok(event) => {
                self.events_received += 1;
                self.last_event_at = Some(Utc::now());
                Ok(event)
            },
            Err(e) => Err(e),
        }
    }

    /// Receive next event (async)
    pub async fn recv(&mut self) -> Result<Event, broadcast::error::RecvError> {
        match self.receiver.recv().await {
            Ok(event) => {
                self.events_received += 1;
                self.last_event_at = Some(Utc::now());
                Ok(event)
            },
            Err(e) => Err(e),
        }
    }
}

/// Event acknowledgement
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct EventAcknowledgement {
    /// Event ID being acknowledged
    pub event_id: String,

    /// Subscription ID acknowledging the event
    pub subscription_id: String,

    /// Acknowledgement status
    pub status: AckStatus,

    /// Optional message
    pub message: Option<String>,

    /// Acknowledgement timestamp
    pub timestamp: DateTime<Utc>,

    /// Processing duration in milliseconds
    pub processing_time_ms: Option<u64>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum AckStatus {
    Acknowledged,
    Processed,
    Failed,
    Rejected,
}

/// Event statistics
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct EventStats {
    /// Statistics generation time
    pub timestamp: DateTime<Utc>,

    /// Total events processed
    pub total_events: u64,

    /// Events by category
    pub events_by_category: HashMap<String, u64>,

    /// Events by priority
    pub events_by_priority: HashMap<String, u64>,

    /// Events by source
    pub events_by_source: HashMap<String, u64>,

    /// Current active subscriptions
    pub active_subscriptions: u64,

    /// Events dropped due to buffer overflow
    pub dropped_events: u64,

    /// Average processing time in milliseconds
    pub avg_processing_time_ms: f64,

    /// Events that required acknowledgement
    pub events_requiring_ack: u64,

    /// Events that were acknowledged
    pub acknowledged_events: u64,

    /// Events that failed processing
    pub failed_events: u64,
}

impl Default for EventStats {
    fn default() -> Self {
        Self {
            timestamp: Utc::now(),
            total_events: 0,
            events_by_category: HashMap::new(),
            events_by_priority: HashMap::new(),
            events_by_source: HashMap::new(),
            active_subscriptions: 0,
            dropped_events: 0,
            avg_processing_time_ms: 0.0,
            events_requiring_ack: 0,
            acknowledged_events: 0,
            failed_events: 0,
        }
    }
}

/// Event configuration
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct EventConfig {
    /// Maximum number of events to buffer in memory
    pub max_buffer_size: usize,

    /// Default event TTL
    pub default_ttl_seconds: u64,

    /// Maximum number of retries for failed events
    pub default_max_retries: u32,

    /// Whether to persist events to disk
    pub persist_events: bool,

    /// Event persistence file path
    pub persistence_file: Option<String>,

    /// Statistics collection interval in seconds
    pub stats_interval_seconds: u64,

    /// Maximum number of subscriptions
    pub max_subscriptions: usize,

    /// Whether to enable event compression
    pub enable_compression: bool,

    /// Event batching configuration
    pub batch_size: usize,
    pub batch_timeout_ms: u64,

    /// Dead letter queue configuration
    pub enable_dead_letter_queue: bool,
    pub dead_letter_queue_path: Option<String>,
}

impl Default for EventConfig {
    fn default() -> Self {
        Self {
            max_buffer_size: 10000,
            default_ttl_seconds: 3600, // 1 hour
            default_max_retries: 3,
            persist_events: false,
            persistence_file: None,
            stats_interval_seconds: 60,
            max_subscriptions: 1000,
            enable_compression: false,
            batch_size: 100,
            batch_timeout_ms: 1000,
            enable_dead_letter_queue: true,
            dead_letter_queue_path: Some("events_dead.json".to_string()),
        }
    }
}

/// Event batch for bulk operations
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct EventBatch {
    /// Batch ID
    pub id: String,

    /// Events in the batch
    pub events: Vec<Event>,

    /// Batch creation time
    pub created_at: DateTime<Utc>,

    /// Batch metadata
    pub metadata: HashMap<String, serde_json::Value>,
}

impl EventBatch {
    pub fn new(events: Vec<Event>) -> Self {
        Self {
            id: Uuid::new_v4().to_string(),
            events,
            created_at: Utc::now(),
            metadata: HashMap::new(),
        }
    }

    pub fn with_metadata(mut self, key: String, value: serde_json::Value) -> Self {
        self.metadata.insert(key, value);
        self
    }

    pub fn size(&self) -> usize {
        self.events.len()
    }
}

/// Dead letter event
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DeadLetterEvent {
    /// Original event
    pub event: Event,

    /// Reason it was moved to dead letter queue
    pub reason: String,

    /// Timestamp when moved to dead letter queue
    pub dead_letter_at: DateTime<Utc>,

    /// Number of processing attempts
    pub processing_attempts: u32,

    /// Last error message
    pub last_error: Option<String>,
}

impl DeadLetterEvent {
    pub fn new(event: Event, reason: String) -> Self {
        let retry_count = event.retry_count;
        Self {
            event,
            reason,
            dead_letter_at: Utc::now(),
            processing_attempts: retry_count,
            last_error: None,
        }
    }

    pub fn with_last_error(mut self, error: String) -> Self {
        self.last_error = Some(error);
        self
    }
}