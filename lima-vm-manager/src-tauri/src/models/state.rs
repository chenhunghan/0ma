use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use chrono::{DateTime, Utc};
use uuid::Uuid;
use std::sync::Arc;

/// Application state keys
#[derive(Debug, Clone, PartialEq, Eq, Hash, Serialize, Deserialize)]
pub enum StateKey {
    // VM Management State
    VMList,
    VMStatus(String), // vm_id
    VMResources(String), // vm_id
    VMConfiguration(String), // vm_id

    // Configuration State
    AppConfiguration,
    LoggingConfiguration,
    UserPreferences,

    // CLI Tools State
    CLIToolStatus(String), // tool_name
    CLIToolVersions,

    // UI State
    MainWindowState,
    ThemeSettings,
    LayoutPreferences,
    FilterSettings,

    // Application State
    ConnectionStatus,
    HealthStatus,
    PerformanceMetrics,
    UserSession,

    // Feature Flags
    ExperimentalFeatures,
    BetaFeatures,

    // Custom State
    Custom(String),
}

impl StateKey {
    pub fn as_str(&self) -> String {
        match self {
            StateKey::VMList => "vm_list".to_string(),
            StateKey::VMStatus(vm_id) => format!("vm_status_{}", vm_id),
            StateKey::VMResources(vm_id) => format!("vm_resources_{}", vm_id),
            StateKey::VMConfiguration(vm_id) => format!("vm_config_{}", vm_id),
            StateKey::AppConfiguration => "app_config".to_string(),
            StateKey::LoggingConfiguration => "logging_config".to_string(),
            StateKey::UserPreferences => "user_prefs".to_string(),
            StateKey::CLIToolStatus(tool) => format!("cli_status_{}", tool),
            StateKey::CLIToolVersions => "cli_versions".to_string(),
            StateKey::MainWindowState => "main_window".to_string(),
            StateKey::ThemeSettings => "theme".to_string(),
            StateKey::LayoutPreferences => "layout".to_string(),
            StateKey::FilterSettings => "filters".to_string(),
            StateKey::ConnectionStatus => "connection".to_string(),
            StateKey::HealthStatus => "health".to_string(),
            StateKey::PerformanceMetrics => "performance".to_string(),
            StateKey::UserSession => "session".to_string(),
            StateKey::ExperimentalFeatures => "experimental".to_string(),
            StateKey::BetaFeatures => "beta".to_string(),
            StateKey::Custom(key) => key.clone(),
        }
    }
}

/// State value types
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub enum StateValue {
    // Primitive types
    String(String),
    Number(i64),
    Float(f64),
    Boolean(bool),

    // Complex types
    Json(serde_json::Value),
    Binary(Vec<u8>),

    // Structured data
    Object(HashMap<String, StateValue>),
    Array(Vec<StateValue>),

    // Special types
    DateTime(DateTime<Utc>),
    DurationMs(u64),
    Uuid(String),

    // Null/Empty
    Null,
}

impl StateValue {
    pub fn is_null(&self) -> bool {
        matches!(self, StateValue::Null)
    }

    pub fn as_string(&self) -> Option<&str> {
        match self {
            StateValue::String(s) => Some(s),
            _ => None,
        }
    }

    pub fn as_number(&self) -> Option<i64> {
        match self {
            StateValue::Number(n) => Some(*n),
            _ => None,
        }
    }

    pub fn as_float(&self) -> Option<f64> {
        match self {
            StateValue::Float(f) => Some(*f),
            StateValue::Number(n) => Some(*n as f64),
            _ => None,
        }
    }

    pub fn as_boolean(&self) -> Option<bool> {
        match self {
            StateValue::Boolean(b) => Some(*b),
            _ => None,
        }
    }

    pub fn as_json(&self) -> Option<&serde_json::Value> {
        match self {
            StateValue::Json(json) => Some(json),
            _ => None,
        }
    }
}

/// State change event
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct StateChangeEvent {
    pub event_id: String,
    pub key: StateKey,
    pub old_value: Option<StateValue>,
    pub new_value: Option<StateValue>,
    pub timestamp: DateTime<Utc>,
    pub source: String,
    pub correlation_id: Option<String>,
    pub metadata: HashMap<String, serde_json::Value>,
}

impl StateChangeEvent {
    pub fn new(key: StateKey, old_value: Option<StateValue>, new_value: Option<StateValue>, source: String) -> Self {
        Self {
            event_id: Uuid::new_v4().to_string(),
            key,
            old_value,
            new_value,
            timestamp: Utc::now(),
            source,
            correlation_id: None,
            metadata: HashMap::new(),
        }
    }

    pub fn with_correlation_id(mut self, correlation_id: String) -> Self {
        self.correlation_id = Some(correlation_id);
        self
    }

    pub fn with_metadata(mut self, key: &str, value: serde_json::Value) -> Self {
        self.metadata.insert(key.to_string(), value);
        self
    }
}

/// State snapshot
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct StateSnapshot {
    pub snapshot_id: String,
    pub timestamp: DateTime<Utc>,
    pub states: HashMap<StateKey, StateValue>,
    pub version: String,
    pub metadata: HashMap<String, serde_json::Value>,
}

impl StateSnapshot {
    pub fn new(states: HashMap<StateKey, StateValue>) -> Self {
        Self {
            snapshot_id: Uuid::new_v4().to_string(),
            timestamp: Utc::now(),
            states,
            version: "1.0.0".to_string(),
            metadata: HashMap::new(),
        }
    }

    pub fn get<T>(&self, key: &StateKey) -> Option<T>
    where
        T: TryFrom<StateValue>,
        <T as TryFrom<StateValue>>::Error: std::fmt::Debug,
    {
        self.states.get(key).and_then(|v| T::try_from(v.clone()).ok())
    }
}

/// State change history
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct StateChangeRecord {
    pub id: String,
    pub event: StateChangeEvent,
    pub snapshot_before: Option<StateSnapshot>,
    pub snapshot_after: Option<StateSnapshot>,
    pub timestamp: DateTime<Utc>,
}

/// State persistence configuration
#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum StatePersistence {
    Memory,         // State lives only in memory
    File(String),    // Persist to specific file
    Database(String), // Persist to database
    Config,         // Persist alongside app config
    Disabled,       // No persistence
}

/// State TTL (Time To Live) configuration
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct StateTTL {
    pub ttl_seconds: Option<u64>,
    pub expire_action: StateExpireAction,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum StateExpireAction {
    Remove,
    Archive,
    Notify,
}

impl Default for StateTTL {
    fn default() -> Self {
        Self {
            ttl_seconds: None,
            expire_action: StateExpireAction::Remove,
        }
    }
}

/// State access control
#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum StateAccess {
    ReadOnly,
    ReadWrite,
    WriteOnce,
    SystemOnly,
}

/// State metadata
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct StateMetadata {
    pub key: StateKey,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
    pub access_count: u64,
    pub last_accessed: DateTime<Utc>,
    pub ttl: StateTTL,
    pub access_control: StateAccess,
    pub tags: Vec<String>,
    pub description: Option<String>,
}

impl Default for StateMetadata {
    fn default() -> Self {
        let now = Utc::now();
        Self {
            key: StateKey::VMList, // placeholder
            created_at: now,
            updated_at: now,
            access_count: 0,
            last_accessed: now,
            ttl: StateTTL::default(),
            access_control: StateAccess::ReadWrite,
            tags: Vec::new(),
            description: None,
        }
    }
}

/// State configuration
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct StateConfig {
    pub persistence: StatePersistence,
    pub auto_save: bool,
    pub save_interval_seconds: u64,
    pub max_history_records: u32,
    pub enable_change_events: bool,
    pub enable_snapshots: bool,
    pub snapshot_interval_seconds: u64,
    pub max_snapshots: u32,
    pub cleanup_interval_seconds: u64,
    pub default_ttl: StateTTL,
    pub compression_enabled: bool,
}

impl Default for StateConfig {
    fn default() -> Self {
        Self {
            persistence: StatePersistence::Config,
            auto_save: true,
            save_interval_seconds: 30,
            max_history_records: 1000,
            enable_change_events: true,
            enable_snapshots: true,
            snapshot_interval_seconds: 300, // 5 minutes
            max_snapshots: 10,
            cleanup_interval_seconds: 600, // 10 minutes
            default_ttl: StateTTL::default(),
            compression_enabled: true,
        }
    }
}

/// State statistics
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct StateStats {
    pub timestamp: DateTime<Utc>,
    pub total_keys: usize,
    pub total_size_bytes: u64,
    pub access_count: u64,
    pub change_count: u64,
    pub snapshot_count: u32,
    pub keys_by_type: HashMap<String, u32>,
    pub oldest_state: Option<DateTime<Utc>>,
    pub newest_state: Option<DateTime<Utc>>,
}

impl Default for StateStats {
    fn default() -> Self {
        Self {
            timestamp: Utc::now(),
            total_keys: 0,
            total_size_bytes: 0,
            access_count: 0,
            change_count: 0,
            snapshot_count: 0,
            keys_by_type: HashMap::new(),
            oldest_state: None,
            newest_state: None,
        }
    }
}

/// State subscription configuration
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct StateSubscription {
    pub id: String,
    pub keys: Vec<StateKey>,
    pub created_at: DateTime<Utc>,
    pub active: bool,
    pub filter: Option<StateEventFilter>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct StateEventFilter {
    pub sources: Vec<String>,
    pub min_severity: Option<String>,
    pub key_patterns: Vec<String>,
}

/// Batch state operation
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BatchOperation {
    pub id: String,
    pub operations: Vec<StateOperation>,
    pub transaction: bool,
    pub created_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum StateOperation {
    Set { key: StateKey, value: StateValue },
    Delete { key: StateKey },
    Get { key: StateKey },
    Clear,
}

/// State query
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct StateQuery {
    pub keys: Vec<StateKey>,
    pub key_patterns: Vec<String>,
    pub tags: Vec<String>,
    pub created_after: Option<DateTime<Utc>>,
    pub created_before: Option<DateTime<Utc>>,
    pub updated_after: Option<DateTime<Utc>>,
    pub updated_before: Option<DateTime<Utc>>,
    pub limit: Option<usize>,
    pub offset: Option<usize>,
    pub order_by: Option<StateQueryOrder>,
}

impl Default for StateQuery {
    fn default() -> Self {
        Self {
            keys: Vec::new(),
            key_patterns: Vec::new(),
            tags: Vec::new(),
            created_after: None,
            created_before: None,
            updated_after: None,
            updated_before: None,
            limit: None,
            offset: None,
            order_by: None,
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum StateQueryOrder {
    CreatedAsc,
    CreatedDesc,
    UpdatedAsc,
    UpdatedDesc,
    AccessedAsc,
    AccessedDesc,
}

/// State migration
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct StateMigration {
    pub version: String,
    pub migration_script: String,
    pub rollback_script: Option<String>,
    pub description: String,
    pub applied_at: Option<DateTime<Utc>>,
}

/// State backup
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct StateBackup {
    pub backup_id: String,
    pub timestamp: DateTime<Utc>,
    pub snapshot: StateSnapshot,
    pub metadata: HashMap<String, serde_json::Value>,
    pub checksum: String,
}