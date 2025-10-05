use crate::models::{
    StateKey, StateValue, StateChangeEvent, StateSnapshot, StateMetadata,
    StateConfig, StateStats, StateSubscription, StateEventFilter, BatchOperation,
    StateOperation, StateQuery, StateQueryOrder, StateMigration, StateBackup,
    StateTTL, StateExpireAction, StateAccess, StateChangeRecord, StatePersistence
};
use crate::models::error::{AppError, ErrorContext, ContextualError};
use crate::{app_error, contextual_error, log_info, log_error, log_warn};
use std::sync::{Arc, Mutex};
use std::collections::HashMap;
use std::time::Duration;
use tokio::sync::{RwLock, broadcast};
use tokio::time::{interval, Instant};
use serde::{Serialize, Deserialize};
use chrono::{DateTime, Utc};
use uuid::Uuid;
use std::fs;
use std::path::Path;

pub struct StateService {
    /// The actual state storage
    states: Arc<RwLock<HashMap<StateKey, StateValue>>>,

    /// Metadata for each state key
    metadata: Arc<RwLock<HashMap<StateKey, StateMetadata>>>,

    /// State change events broadcaster
    event_sender: broadcast::Sender<StateChangeEvent>,

    /// State change history
    history: Arc<RwLock<Vec<StateChangeRecord>>>,

    /// State snapshots
    snapshots: Arc<RwLock<Vec<StateSnapshot>>>,

    /// Subscriptions to state changes
    subscriptions: Arc<RwLock<Vec<StateSubscription>>>,

    /// Service configuration
    config: Arc<RwLock<StateConfig>>,

    /// Statistics
    stats: Arc<RwLock<StateStats>>,

    /// Background task handle
    _background_task: tokio::task::JoinHandle<()>,
}

impl StateService {
    pub fn new(config: StateConfig) -> Result<Self, AppError> {
        let (event_sender, _) = broadcast::channel(1000);

        let service = Self {
            states: Arc::new(RwLock::new(HashMap::new())),
            metadata: Arc::new(RwLock::new(HashMap::new())),
            event_sender,
            history: Arc::new(RwLock::new(Vec::new())),
            snapshots: Arc::new(RwLock::new(Vec::new())),
            subscriptions: Arc::new(RwLock::new(Vec::new())),
            config: Arc::new(RwLock::new(config)),
            stats: Arc::new(RwLock::new(StateStats::default())),
            _background_task: tokio::spawn(async {}),
        };

        log_info!("StateService", "State service initialized successfully");
        Ok(service)
    }

    pub async fn start_background_tasks(&self) -> Result<(), AppError> {
        let config = self.config.read().await.clone();

        // Auto-save task
        if config.auto_save {
            let config_clone = config.clone();
            let states_clone = self.states.clone();
            let metadata_clone = self.metadata.clone();
            let _auto_save_handle = tokio::spawn(async move {
                let mut interval = interval(Duration::from_secs(config_clone.save_interval_seconds));
                loop {
                    interval.tick().await;
                    if let Err(e) = Self::auto_save(&states_clone, &metadata_clone, &config_clone).await {
                        log_error!("StateService::auto_save", "Auto-save failed: {}", e);
                    }
                }
            });
        }

        // Cleanup task
        let states_clone = self.states.clone();
        let metadata_clone = self.metadata.clone();
        let config_clone = config.clone();
        let _cleanup_handle = tokio::spawn(async move {
            let mut interval = interval(Duration::from_secs(config_clone.cleanup_interval_seconds));
            loop {
                interval.tick().await;
                if let Err(e) = Self::cleanup_expired_states(&states_clone, &metadata_clone, &config_clone).await {
                    log_error!("StateService::cleanup", "Cleanup failed: {}", e);
                }
            }
        });

        // Snapshot task
        if config.enable_snapshots {
            let config_clone = config.clone();
            let states_clone = self.states.clone();
            let metadata_clone = self.metadata.clone();
            let snapshots_clone = self.snapshots.clone();
            let _snapshot_handle = tokio::spawn(async move {
                let mut interval = interval(Duration::from_secs(config_clone.snapshot_interval_seconds));
                loop {
                    interval.tick().await;
                    if let Err(e) = Self::create_snapshot(&states_clone, &metadata_clone, &snapshots_clone, &config_clone).await {
                        log_error!("StateService::snapshot", "Snapshot creation failed: {}", e);
                    }
                }
            });
        }

        log_info!("StateService", "Background tasks started");
        Ok(())
    }

    /// Get a state value
    pub async fn get(&self, key: &StateKey) -> Option<StateValue> {
        let states = self.states.read().await;
        let value = states.get(key).cloned();

        if value.is_some() {
            // Update access statistics
            let mut metadata = self.metadata.write().await;
            if let Some(meta) = metadata.get_mut(key) {
                meta.access_count += 1;
                meta.last_accessed = Utc::now();
            }

            // Update global stats
            let mut stats = self.stats.write().await;
            stats.access_count += 1;
        }

        value
    }

    /// Set a state value
    pub async fn set(&self, key: StateKey, value: StateValue, source: String) -> Result<(), AppError> {
        let old_value = self.get(&key).await;

        // Update the state
        {
            let mut states = self.states.write().await;
            states.insert(key.clone(), value.clone());
        }

        // Update or create metadata
        {
            let mut metadata = self.metadata.write().await;
            let now = Utc::now();
            let meta = metadata.entry(key.clone()).or_insert_with(|| StateMetadata {
                key: key.clone(),
                created_at: now,
                updated_at: now,
                access_count: 0,
                last_accessed: now,
                ttl: StateTTL::default(),
                access_control: StateAccess::ReadWrite,
                tags: Vec::new(),
                description: None,
            });
            meta.updated_at = now;
        }

        // Create and broadcast change event
        if self.config.read().await.enable_change_events {
            let event = StateChangeEvent::new(key.clone(), old_value, Some(value.clone()), source);

            // Update history
            {
                let mut history = self.history.write().await;
                let record = StateChangeRecord {
                    id: Uuid::new_v4().to_string(),
                    event: event.clone(),
                    snapshot_before: None, // Could be optimized
                    snapshot_after: None,  // Could be optimized
                    timestamp: Utc::now(),
                };
                history.push(record);

                // Trim history if needed
                let max_records = self.config.read().await.max_history_records;
                if history.len() > max_records as usize {
                    history.remove(0);
                }
            }

            // Broadcast event
            if let Err(e) = self.event_sender.send(event) {
                log_warn!("StateService", "Failed to broadcast state change event: {}", e);
            }
        }

        // Update stats
        {
            let mut stats = self.stats.write().await;
            stats.change_count += 1;
            stats.newest_state = Some(Utc::now());
        }

        log_info!("StateService", "State set successfully for key: {:?}", key);
        Ok(())
    }

    /// Delete a state value
    pub async fn delete(&self, key: &StateKey) -> Result<Option<StateValue>, AppError> {
        let old_value = self.get(key).await;

        if old_value.is_some() {
            // Remove the state
            {
                let mut states = self.states.write().await;
                states.remove(key);
            }

            // Remove metadata
            {
                let mut metadata = self.metadata.write().await;
                metadata.remove(key);
            }

            log_info!("StateService", "State deleted for key: {:?}", key);
        }

        Ok(old_value)
    }

    /// Check if a key exists
    pub async fn exists(&self, key: &StateKey) -> bool {
        let states = self.states.read().await;
        states.contains_key(key)
    }

    /// Get all keys
    pub async fn keys(&self) -> Vec<StateKey> {
        let states = self.states.read().await;
        states.keys().cloned().collect()
    }

    /// Clear all states
    pub async fn clear(&self) -> Result<usize, AppError> {
        let count = {
            let states = self.states.read().await;
            states.len()
        };

        {
            let mut states = self.states.write().await;
            states.clear();
        }

        {
            let mut metadata = self.metadata.write().await;
            metadata.clear();
        }

        log_info!("StateService", "All states cleared ({} keys)", count);
        Ok(count)
    }

    /// Subscribe to state changes
    pub async fn subscribe(&self, keys: Vec<StateKey>, filter: Option<StateEventFilter>) -> Result<String, AppError> {
        let subscription = StateSubscription {
            id: Uuid::new_v4().to_string(),
            keys,
            created_at: Utc::now(),
            active: true,
            filter,
        };

        {
            let mut subscriptions = self.subscriptions.write().await;
            subscriptions.push(subscription.clone());
        }

        log_info!("StateService", "Created subscription: {}", subscription.id);
        Ok(subscription.id)
    }

    /// Unsubscribe from state changes
    pub async fn unsubscribe(&self, subscription_id: &str) -> Result<(), AppError> {
        let mut subscriptions = self.subscriptions.write().await;
        subscriptions.retain(|sub| sub.id != subscription_id);

        log_info!("StateService", "Removed subscription: {}", subscription_id);
        Ok(())
    }

    /// Get state change event receiver
    pub fn subscribe_events(&self) -> broadcast::Receiver<StateChangeEvent> {
        self.event_sender.subscribe()
    }

    /// Create a state snapshot
    pub async fn create_snapshot_now(&self) -> Result<StateSnapshot, AppError> {
        let config = self.config.read().await;
        Self::create_snapshot(&self.states, &self.metadata, &self.snapshots, &config).await
    }

    /// Get recent snapshots
    pub async fn get_snapshots(&self, limit: Option<usize>) -> Vec<StateSnapshot> {
        let snapshots = self.snapshots.read().await;
        let limit = limit.unwrap_or(snapshots.len());

        snapshots
            .iter()
            .rev()
            .take(limit)
            .cloned()
            .collect()
    }

    /// Query states
    pub async fn query(&self, query: StateQuery) -> Result<Vec<(StateKey, StateValue)>, AppError> {
        let states = self.states.read().await;
        let metadata = self.metadata.read().await;

        let mut results: Vec<(StateKey, StateValue)> = Vec::new();

        for (key, value) in states.iter() {
            // Check if key matches query criteria
            if !self.key_matches_query(key, &query, &metadata) {
                continue;
            }

            results.push((key.clone(), value.clone()));
        }

        // Apply ordering
        if let Some(order_by) = query.order_by {
            self.sort_results(&mut results, order_by, &metadata);
        }

        // Apply pagination
        if let Some(offset) = query.offset {
            results.drain(0..offset.min(results.len()));
        }

        if let Some(limit) = query.limit {
            results.truncate(limit);
        }

        Ok(results)
    }

    /// Execute batch operations
    pub async fn execute_batch(&self, batch: BatchOperation) -> Result<Vec<Result<(), AppError>>, AppError> {
        let mut results = Vec::new();

        for operation in batch.operations {
            let result = match operation {
                StateOperation::Set { key, value } => {
                    self.set(key, value, "batch_operation".to_string()).await
                },
                StateOperation::Delete { key } => {
                    self.delete(&key).await.map(|_| ())
                },
                StateOperation::Get { key } => {
                    // Get operation doesn't modify state, so it always succeeds
                    self.get(&key).await;
                    Ok(())
                },
                StateOperation::Clear => {
                    self.clear().await.map(|_| ())
                },
            };
            results.push(result);
        }

        Ok(results)
    }

    /// Get state statistics
    pub async fn get_stats(&self) -> StateStats {
        let mut stats = self.stats.write().await;
        let states = self.states.read().await;
        let metadata = self.metadata.read().await;

        // Update current statistics
        stats.timestamp = Utc::now();
        stats.total_keys = states.len();

        // Calculate total size
        stats.total_size_bytes = states.iter()
            .map(|(k, v)| {
                let key_size = serde_json::to_vec(k).map(|b| b.len()).unwrap_or(0);
                let value_size = serde_json::to_vec(v).map(|b| b.len()).unwrap_or(0);
                key_size + value_size
            })
            .sum::<usize>() as u64;

        // Categorize keys by type
        stats.keys_by_type.clear();
        for key in states.keys() {
            let type_name = match key {
                StateKey::VMList => "vm_management".to_string(),
                StateKey::VMStatus(_) => "vm_status".to_string(),
                StateKey::VMResources(_) => "vm_resources".to_string(),
                StateKey::VMConfiguration(_) => "vm_config".to_string(),
                StateKey::AppConfiguration => "config".to_string(),
                StateKey::LoggingConfiguration => "logging".to_string(),
                StateKey::UserPreferences => "preferences".to_string(),
                StateKey::CLIToolStatus(_) => "cli_tools".to_string(),
                StateKey::CLIToolVersions => "cli_versions".to_string(),
                StateKey::MainWindowState => "ui".to_string(),
                StateKey::ThemeSettings => "theme".to_string(),
                StateKey::LayoutPreferences => "layout".to_string(),
                StateKey::FilterSettings => "filters".to_string(),
                StateKey::ConnectionStatus => "connection".to_string(),
                StateKey::HealthStatus => "health".to_string(),
                StateKey::PerformanceMetrics => "performance".to_string(),
                StateKey::UserSession => "session".to_string(),
                StateKey::ExperimentalFeatures => "experimental".to_string(),
                StateKey::BetaFeatures => "beta".to_string(),
                StateKey::Custom(_) => "custom".to_string(),
            };

            *stats.keys_by_type.entry(type_name).or_insert(0) += 1;
        }

        // Update timestamps
        if let Some(oldest_meta) = metadata.values().min_by_key(|m| m.created_at) {
            stats.oldest_state = Some(oldest_meta.created_at);
        }
        if let Some(newest_meta) = metadata.values().max_by_key(|m| m.updated_at) {
            stats.newest_state = Some(newest_meta.updated_at);
        }

        stats.clone()
    }

    /// Save state to persistence
    pub async fn save(&self) -> Result<(), AppError> {
        let config = self.config.read().await;

        match &config.persistence {
            StatePersistence::Memory => {
                // No persistence needed
                Ok(())
            },
            StatePersistence::File(path) => {
                self.save_to_file(path).await
            },
            StatePersistence::Database(_) => {
                // TODO: Implement database persistence
                Err(app_error!(internal, "Database persistence not yet implemented"))
            },
            StatePersistence::Config => {
                // Save alongside app config
                let path = "state.json";
                self.save_to_file(path).await
            },
            StatePersistence::Disabled => {
                Ok(())
            },
        }
    }

    /// Load state from persistence
    pub async fn load(&self) -> Result<(), AppError> {
        let config = self.config.read().await;

        match &config.persistence {
            StatePersistence::Memory | StatePersistence::Disabled => {
                Ok(())
            },
            StatePersistence::File(path) => {
                self.load_from_file(path).await
            },
            StatePersistence::Database(_) => {
                // TODO: Implement database persistence
                Err(app_error!(internal, "Database persistence not yet implemented"))
            },
            StatePersistence::Config => {
                // Load from alongside app config
                let path = "state.json";
                self.load_from_file(path).await
            },
        }
    }

    /// Create backup of current state
    pub async fn create_backup(&self) -> Result<StateBackup, AppError> {
        let states = self.states.read().await;
        let snapshot = StateSnapshot::new(states.clone());

        let backup = StateBackup {
            backup_id: Uuid::new_v4().to_string(),
            timestamp: Utc::now(),
            snapshot: snapshot.clone(),
            metadata: HashMap::new(),
            checksum: Self::calculate_checksum(&snapshot),
        };

        log_info!("StateService", "Created state backup: {}", backup.backup_id);
        Ok(backup)
    }

    /// Restore from backup
    pub async fn restore_from_backup(&self, backup: &StateBackup) -> Result<(), AppError> {
        // Verify checksum
        let expected_checksum = Self::calculate_checksum(&backup.snapshot);
        if expected_checksum != backup.checksum {
            return Err(app_error!(validation, "backup_checksum", "Backup checksum mismatch"));
        }

        // Restore states
        {
            let mut states = self.states.write().await;
            states.clear();
            states.extend(backup.snapshot.states.clone());
        }

        // Update metadata
        {
            let mut metadata = self.metadata.write().await;
            let now = Utc::now();
            for key in backup.snapshot.states.keys() {
                let meta = metadata.entry(key.clone()).or_insert_with(|| StateMetadata {
                    key: key.clone(),
                    created_at: now,
                    updated_at: now,
                    access_count: 0,
                    last_accessed: now,
                    ttl: StateTTL::default(),
                    access_control: StateAccess::ReadWrite,
                    tags: Vec::new(),
                    description: None,
                });
                meta.updated_at = now;
            }
        }

        log_info!("StateService", "Restored from backup: {}", backup.backup_id);
        Ok(())
    }

    // Private helper methods

    async fn auto_save(
        states: &Arc<RwLock<HashMap<StateKey, StateValue>>>,
        metadata: &Arc<RwLock<HashMap<StateKey, StateMetadata>>>,
        config: &StateConfig,
    ) -> Result<(), AppError> {
        match &config.persistence {
            StatePersistence::File(path) => {
                let snapshot = {
                    let states_read = states.read().await;
                    StateSnapshot::new(states_read.clone())
                };

                let data = serde_json::to_string_pretty(&snapshot)?;
                fs::write(path, data)?;

                log_info!("StateService::auto_save", "State auto-saved to {}", path);
                Ok(())
            },
            StatePersistence::Config => {
                let snapshot = {
                    let states_read = states.read().await;
                    StateSnapshot::new(states_read.clone())
                };

                let data = serde_json::to_string_pretty(&snapshot)?;
                fs::write("state.json", data)?;

                log_info!("StateService::auto_save", "State auto-saved to default location");
                Ok(())
            },
            _ => Ok(()),
        }
    }

    async fn cleanup_expired_states(
        states: &Arc<RwLock<HashMap<StateKey, StateValue>>>,
        metadata: &Arc<RwLock<HashMap<StateKey, StateMetadata>>>,
        config: &StateConfig,
    ) -> Result<(), AppError> {
        let now = Utc::now();
        let mut expired_keys = Vec::new();

        {
            let metadata_read = metadata.read().await;
            for (key, meta) in metadata_read.iter() {
                if let Some(ttl_seconds) = meta.ttl.ttl_seconds {
                    let expiry_time = meta.updated_at + chrono::Duration::seconds(ttl_seconds as i64);
                    if now > expiry_time {
                        expired_keys.push(key.clone());
                    }
                }
            }
        }

        if !expired_keys.is_empty() {
            let mut states_write = states.write().await;
            let mut metadata_write = metadata.write().await;

            for key in &expired_keys {
                states_write.remove(key);
                metadata_write.remove(key);
            }

            log_info!("StateService::cleanup", "Cleaned up {} expired states", expired_keys.len());
        }

        Ok(())
    }

    async fn create_snapshot(
        states: &Arc<RwLock<HashMap<StateKey, StateValue>>>,
        metadata: &Arc<RwLock<HashMap<StateKey, StateMetadata>>>,
        snapshots: &Arc<RwLock<Vec<StateSnapshot>>>,
        config: &StateConfig,
    ) -> Result<StateSnapshot, AppError> {
        let states_read = states.read().await;
        let snapshot = StateSnapshot::new(states_read.clone());

        {
            let mut snapshots_write = snapshots.write().await;
            snapshots_write.push(snapshot.clone());

            // Trim snapshots if needed
            while snapshots_write.len() > config.max_snapshots as usize {
                snapshots_write.remove(0);
            }
        }

        log_info!("StateService::snapshot", "Created state snapshot: {}", snapshot.snapshot_id);
        Ok(snapshot)
    }

    fn key_matches_query(&self, key: &StateKey, query: &StateQuery, metadata: &HashMap<StateKey, StateMetadata>) -> bool {
        // Check specific keys
        if !query.keys.is_empty() && !query.keys.contains(key) {
            return false;
        }

        // Check key patterns
        if !query.key_patterns.is_empty() {
            let key_str = key.as_str();
            let pattern_matches = query.key_patterns.iter().any(|pattern| {
                // Simple glob pattern matching
                if pattern.contains('*') {
                    let pattern = pattern.replace('*', ".*");
                    if let Ok(regex) = regex::Regex::new(&format!("^{}$", pattern)) {
                        regex.is_match(&key_str)
                    } else {
                        false
                    }
                } else {
                    key_str.contains(pattern)
                }
            });

            if !pattern_matches {
                return false;
            }
        }

        // Check tags
        if !query.tags.is_empty() {
            if let Some(meta) = metadata.get(key) {
                let has_required_tag = query.tags.iter().any(|tag| meta.tags.contains(tag));
                if !has_required_tag {
                    return false;
                }
            } else {
                return false;
            }
        }

        // Check time constraints
        if let Some(meta) = metadata.get(key) {
            if let Some(after) = query.created_after {
                if meta.created_at < after {
                    return false;
                }
            }

            if let Some(before) = query.created_before {
                if meta.created_at > before {
                    return false;
                }
            }

            if let Some(after) = query.updated_after {
                if meta.updated_at < after {
                    return false;
                }
            }

            if let Some(before) = query.updated_before {
                if meta.updated_at > before {
                    return false;
                }
            }
        }

        true
    }

    fn sort_results(&self, results: &mut Vec<(StateKey, StateValue)>, order_by: StateQueryOrder, metadata: &HashMap<StateKey, StateMetadata>) {
        results.sort_by(|a, b| {
            let key_a = &a.0;
            let key_b = &b.0;

            match order_by {
                StateQueryOrder::CreatedAsc => {
                    let time_a = metadata.get(key_a).map(|m| m.created_at).unwrap_or_else(|| Utc::now());
                    let time_b = metadata.get(key_b).map(|m| m.created_at).unwrap_or_else(|| Utc::now());
                    time_a.cmp(&time_b)
                },
                StateQueryOrder::CreatedDesc => {
                    let time_a = metadata.get(key_a).map(|m| m.created_at).unwrap_or_else(|| Utc::now());
                    let time_b = metadata.get(key_b).map(|m| m.created_at).unwrap_or_else(|| Utc::now());
                    time_b.cmp(&time_a)
                },
                StateQueryOrder::UpdatedAsc => {
                    let time_a = metadata.get(key_a).map(|m| m.updated_at).unwrap_or_else(|| Utc::now());
                    let time_b = metadata.get(key_b).map(|m| m.updated_at).unwrap_or_else(|| Utc::now());
                    time_a.cmp(&time_b)
                },
                StateQueryOrder::UpdatedDesc => {
                    let time_a = metadata.get(key_a).map(|m| m.updated_at).unwrap_or_else(|| Utc::now());
                    let time_b = metadata.get(key_b).map(|m| m.updated_at).unwrap_or_else(|| Utc::now());
                    time_b.cmp(&time_a)
                },
                StateQueryOrder::AccessedAsc => {
                    let time_a = metadata.get(key_a).map(|m| m.last_accessed).unwrap_or_else(|| Utc::now());
                    let time_b = metadata.get(key_b).map(|m| m.last_accessed).unwrap_or_else(|| Utc::now());
                    time_a.cmp(&time_b)
                },
                StateQueryOrder::AccessedDesc => {
                    let time_a = metadata.get(key_a).map(|m| m.last_accessed).unwrap_or_else(|| Utc::now());
                    let time_b = metadata.get(key_b).map(|m| m.last_accessed).unwrap_or_else(|| Utc::now());
                    time_b.cmp(&time_a)
                },
            }
        });
    }

    async fn save_to_file(&self, path: &str) -> Result<(), AppError> {
        let states = self.states.read().await;
        let snapshot = StateSnapshot::new(states.clone());

        let data = serde_json::to_string_pretty(&snapshot)
            .map_err(|e| app_error!(parse, "JSON", format!("Failed to serialize state: {}", e)))?;

        fs::write(path, data)
            .map_err(|e| app_error!(filesystem, path, format!("Failed to write state file: {}", e)))?;

        log_info!("StateService", "State saved to file: {}", path);
        Ok(())
    }

    async fn load_from_file(&self, path: &str) -> Result<(), AppError> {
        if !Path::new(path).exists() {
            log_info!("StateService", "State file does not exist, starting with empty state: {}", path);
            return Ok(());
        }

        let data = fs::read_to_string(path)
            .map_err(|e| app_error!(filesystem, path, format!("Failed to read state file: {}", e)))?;

        let snapshot: StateSnapshot = serde_json::from_str(&data)
            .map_err(|e| app_error!(parse, "JSON", format!("Failed to deserialize state: {}", e)))?;

        {
            let mut states = self.states.write().await;
            states.clear();
            states.extend(snapshot.states);
        }

        log_info!("StateService", "State loaded from file: {}", path);
        Ok(())
    }

    fn calculate_checksum(snapshot: &StateSnapshot) -> String {
        use std::collections::hash_map::DefaultHasher;
        use std::hash::{Hash, Hasher};

        let mut hasher = DefaultHasher::new();
        serde_json::to_vec(snapshot).unwrap().hash(&mut hasher);
        format!("{:x}", hasher.finish())
    }
}

impl Drop for StateService {
    fn drop(&mut self) {
        log_info!("StateService", "State service dropped");
    }
}

// Tauri command handlers
#[tauri::command]
pub async fn state_get(
    key: String,
    service: tauri::State<'_, Arc<StateService>>,
) -> Result<Option<serde_json::Value>, String> {
    let state_key = StateKey::Custom(key);
    match service.get(&state_key).await {
        Some(value) => Ok(Some(serde_json::to_value(value).unwrap())),
        None => Ok(None),
    }
}

#[tauri::command]
pub async fn state_set(
    key: String,
    value: serde_json::Value,
    source: Option<String>,
    service: tauri::State<'_, Arc<StateService>>,
) -> Result<(), String> {
    let state_key = StateKey::Custom(key);
    let state_value = StateValue::Json(value);
    let source = source.unwrap_or_else(|| "frontend".to_string());

    service.set(state_key, state_value, source).await
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn state_delete(
    key: String,
    service: tauri::State<'_, Arc<StateService>>,
) -> Result<Option<serde_json::Value>, String> {
    let state_key = StateKey::Custom(key);
    service.delete(&state_key).await
        .map(|v| v.map(|v| serde_json::to_value(v).unwrap()))
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn state_exists(
    key: String,
    service: tauri::State<'_, Arc<StateService>>,
) -> Result<bool, String> {
    let state_key = StateKey::Custom(key);
    Ok(service.exists(&state_key).await)
}

#[tauri::command]
pub async fn state_keys(
    service: tauri::State<'_, Arc<StateService>>,
) -> Result<Vec<String>, String> {
    let keys = service.keys().await;
    Ok(keys.into_iter().map(|k| k.as_str()).collect())
}

#[tauri::command]
pub async fn state_clear(
    service: tauri::State<'_, Arc<StateService>>,
) -> Result<usize, String> {
    service.clear().await
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn state_get_stats(
    service: tauri::State<'_, Arc<StateService>>,
) -> Result<StateStats, String> {
    Ok(service.get_stats().await)
}

#[tauri::command]
pub async fn state_create_snapshot(
    service: tauri::State<'_, Arc<StateService>>,
) -> Result<StateSnapshot, String> {
    service.create_snapshot_now().await
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn state_get_snapshots(
    limit: Option<usize>,
    service: tauri::State<'_, Arc<StateService>>,
) -> Result<Vec<StateSnapshot>, String> {
    Ok(service.get_snapshots(limit).await)
}

#[tauri::command]
pub async fn state_save(
    service: tauri::State<'_, Arc<StateService>>,
) -> Result<(), String> {
    service.save().await
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn state_load(
    service: tauri::State<'_, Arc<StateService>>,
) -> Result<(), String> {
    service.load().await
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn state_create_backup(
    service: tauri::State<'_, Arc<StateService>>,
) -> Result<StateBackup, String> {
    service.create_backup().await
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn state_restore_from_backup(
    backup: StateBackup,
    service: tauri::State<'_, Arc<StateService>>,
) -> Result<(), String> {
    service.restore_from_backup(&backup).await
        .map_err(|e| e.to_string())
}

#[cfg(test)]
mod tests {
    use super::*;
    use tokio_test;

    #[tokio::test]
    async fn test_state_service_basic_operations() {
        let config = StateConfig::default();
        let service = StateService::new(config).unwrap();

        // Test setting and getting values
        let key = StateKey::Custom("test_key".to_string());
        let value = StateValue::String("test_value".to_string());

        service.set(key.clone(), value.clone(), "test".to_string()).await.unwrap();
        let retrieved = service.get(&key).await.unwrap();

        assert_eq!(retrieved, value);

        // Test existence
        assert!(service.exists(&key).await);

        // Test deletion
        let deleted = service.delete(&key).await.unwrap();
        assert!(deleted.is_some());
        assert!(!service.exists(&key).await);
    }

    #[tokio::test]
    async fn test_state_service_batch_operations() {
        let config = StateConfig::default();
        let service = StateService::new(config).unwrap();

        let batch = BatchOperation {
            id: "test_batch".to_string(),
            operations: vec![
                StateOperation::Set {
                    key: StateKey::Custom("key1".to_string()),
                    value: StateValue::String("value1".to_string())
                },
                StateOperation::Set {
                    key: StateKey::Custom("key2".to_string()),
                    value: StateValue::Number(42)
                },
            ],
            transaction: false,
            created_at: Utc::now(),
        };

        let results = service.execute_batch(batch).await.unwrap();
        assert_eq!(results.len(), 2);
        assert!(results.iter().all(|r| r.is_ok()));

        // Verify values were set
        let value1 = service.get(&StateKey::Custom("key1".to_string())).await;
        let value2 = service.get(&StateKey::Custom("key2".to_string())).await;

        assert!(value1.is_some());
        assert!(value2.is_some());
    }

    #[tokio::test]
    async fn test_state_service_query() {
        let config = StateConfig::default();
        let service = StateService::new(config).unwrap();

        // Add some test data
        service.set(StateKey::Custom("test1".to_string()), StateValue::String("value1".to_string()), "test".to_string()).await.unwrap();
        service.set(StateKey::Custom("test2".to_string()), StateValue::Number(42), "test".to_string()).await.unwrap();

        // Query all states
        let query = StateQuery {
            keys: vec![],
            key_patterns: vec![],
            tags: vec![],
            created_after: None,
            created_before: None,
            updated_after: None,
            updated_before: None,
            limit: None,
            offset: None,
            order_by: None,
        };

        let results = service.query(query).await.unwrap();
        assert_eq!(results.len(), 2);

        // Query with pattern
        let query_with_pattern = StateQuery {
            key_patterns: vec!["test*".to_string()],
            ..Default::default()
        };

        let pattern_results = service.query(query_with_pattern).await.unwrap();
        assert_eq!(pattern_results.len(), 2);
    }

    #[tokio::test]
    async fn test_state_service_stats() {
        let config = StateConfig::default();
        let service = StateService::new(config).unwrap();

        // Add some test data
        service.set(StateKey::Custom("test1".to_string()), StateValue::String("value1".to_string()), "test".to_string()).await.unwrap();
        service.set(StateKey::Custom("test2".to_string()), StateValue::Number(42), "test".to_string()).await.unwrap();

        // Get stats
        let stats = service.get_stats().await;
        assert_eq!(stats.total_keys, 2);
        assert_eq!(stats.access_count, 2); // Two gets for checking stats
        assert_eq!(stats.change_count, 2); // Two sets
    }

    #[tokio::test]
    async fn test_state_service_backup_restore() {
        let config = StateConfig::default();
        let service = StateService::new(config).unwrap();

        // Add some test data
        let key = StateKey::Custom("backup_test".to_string());
        let value = StateValue::String("backup_value".to_string());
        service.set(key.clone(), value.clone(), "test".to_string()).await.unwrap();

        // Create backup
        let backup = service.create_backup().await.unwrap();

        // Clear state
        service.clear().await.unwrap();
        assert!(!service.exists(&key).await);

        // Restore from backup
        service.restore_from_backup(&backup).await.unwrap();
        assert!(service.exists(&key).await);

        let restored_value = service.get(&key).await.unwrap();
        assert_eq!(restored_value, value);
    }
}