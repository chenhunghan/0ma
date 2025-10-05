use crate::models::{
    Event, EventCategory, EventPriority, EventFilter, EventSubscription, EventStats,
    EventConfig, EventBatch, DeadLetterEvent, EventAcknowledgement, AckStatus,
    EventTimeRange
};

/// Cloneable subscription info for querying
#[derive(Debug, Clone)]
pub struct EventSubscriptionInfo {
    pub id: String,
    pub filter: EventFilter,
    pub created_at: DateTime<Utc>,
    pub active: bool,
    pub events_received: u64,
    pub last_event_at: Option<DateTime<Utc>>,
}
use crate::models::error::{AppError, ErrorContext};
use crate::{app_error, log_info, log_error, log_warn};
use std::sync::{Arc, Mutex};
use std::collections::HashMap;
use tokio::sync::{RwLock, broadcast, mpsc};
use tokio::time::{interval, sleep, Duration};
use serde::{Serialize, Deserialize};
use chrono::{DateTime, Utc};
use uuid::Uuid;
use std::fs;
use std::path::Path;

pub struct EventService {
    /// Event broadcaster
    event_sender: broadcast::Sender<Event>,

    /// Active subscriptions
    subscriptions: Arc<RwLock<HashMap<String, EventSubscription>>>,

    /// Event statistics
    stats: Arc<RwLock<EventStats>>,

    /// Service configuration
    config: Arc<RwLock<EventConfig>>,

    /// Dead letter queue
    dead_letter_queue: Arc<RwLock<Vec<DeadLetterEvent>>>,

    /// Event buffer for persistence
    event_buffer: Arc<RwLock<Vec<Event>>>,

    /// Acknowledgements waiting for responses
    pending_acks: Arc<RwLock<HashMap<String, Vec<String>>>>, // event_id -> subscription_ids

    /// Background task handles
    _background_tasks: Vec<tokio::task::JoinHandle<()>>,
}

impl EventService {
    pub fn new(config: EventConfig) -> Result<Self, AppError> {
        let (event_sender, _) = broadcast::channel(config.max_buffer_size);

        let service = Self {
            event_sender,
            subscriptions: Arc::new(RwLock::new(HashMap::new())),
            stats: Arc::new(RwLock::new(EventStats::default())),
            config: Arc::new(RwLock::new(config)),
            dead_letter_queue: Arc::new(RwLock::new(Vec::new())),
            event_buffer: Arc::new(RwLock::new(Vec::new())),
            pending_acks: Arc::new(RwLock::new(HashMap::new())),
            _background_tasks: Vec::new(),
        };

        log_info!("EventService", "Event service initialized successfully");
        Ok(service)
    }

    pub async fn start_background_tasks(&mut self) -> Result<(), AppError> {
        let mut handles = Vec::new();

        // Statistics collection task
        let stats_config = self.config.clone();
        let stats_service = self.stats.clone();
        let subscriptions = self.subscriptions.clone();
        let stats_handle = tokio::spawn(async move {
            let mut interval = interval(Duration::from_secs(stats_config.read().await.stats_interval_seconds));
            loop {
                interval.tick().await;
                Self::update_stats(&stats_service, &subscriptions).await;
            }
        });
        handles.push(stats_handle);

        // Event cleanup task
        let cleanup_config = self.config.clone();
        let cleanup_buffer = self.event_buffer.clone();
        let cleanup_dead_letter = self.dead_letter_queue.clone();
        let cleanup_handle = tokio::spawn(async move {
            let mut interval = interval(Duration::from_secs(300)); // Every 5 minutes
            loop {
                interval.tick().await;
                Self::cleanup_expired_events(&cleanup_config, &cleanup_buffer, &cleanup_dead_letter).await;
            }
        });
        handles.push(cleanup_handle);

        // Persistence task (if enabled)
        let persist_config = self.config.clone();
        let persist_buffer = self.event_buffer.clone();
        let persist_stats = self.stats.clone();
        if persist_config.read().await.persist_events {
            let persist_handle = tokio::spawn(async move {
                let mut interval = interval(Duration::from_secs(60)); // Every minute
                loop {
                    interval.tick().await;
                    if let Err(e) = Self::persist_events(&persist_config, &persist_buffer, &persist_stats).await {
                        log_error!("EventService::persistence", "Failed to persist events: {}", e);
                    }
                }
            });
            handles.push(persist_handle);
        }

        self._background_tasks = handles;
        log_info!("EventService", "Background tasks started");
        Ok(())
    }

    /// Publish a single event
    pub async fn publish(&self, mut event: Event) -> Result<(), AppError> {
        // Set default values from config
        {
            let config = self.config.read().await;
            if event.retry_count == 0 {
                event.max_retries = config.default_max_retries;
            }
            if event.expires_at.is_none() {
                event.expires_at = Some(Utc::now() + chrono::Duration::seconds(config.default_ttl_seconds as i64));
            }
        }

        // Update statistics
        {
            let mut stats = self.stats.write().await;
            stats.total_events += 1;

            let category = event.category.as_str().to_string();
            *stats.events_by_category.entry(category).or_insert(0) += 1;

            let priority = format!("{:?}", event.priority);
            *stats.events_by_priority.entry(priority).or_insert(0) += 1;

            *stats.events_by_source.entry(event.source.clone()).or_insert(0) += 1;

            if event.requires_ack {
                stats.events_requiring_ack += 1;
            }
        }

        // Add to buffer for persistence
        {
            let mut buffer = self.event_buffer.write().await;
            buffer.push(event.clone());

            // Trim buffer if needed
            let max_size = self.config.read().await.max_buffer_size;
            if buffer.len() > max_size {
                buffer.remove(0);
            }
        }

        // Track pending acknowledgements
        if event.requires_ack {
            let mut pending = self.pending_acks.write().await;
            pending.insert(event.id.clone(), Vec::new());
        }

        // Broadcast event
        match self.event_sender.send(event.clone()) {
            Ok(receiver_count) => {
                log_info!("EventService::publish", "Event {} sent to {} receivers", event.id, receiver_count);
                Ok(())
            },
            Err(broadcast::error::SendError(_)) => {
                // No active receivers, move to dead letter queue
                let dead_letter = DeadLetterEvent::new(event.clone(), "No active receivers".to_string());
                self.add_to_dead_letter_queue(dead_letter).await;

                let mut stats = self.stats.write().await;
                stats.dropped_events += 1;

                log_warn!("EventService::publish", "Event {} dropped - no receivers", event.id);
                Ok(())
            },
        }
    }

    /// Publish multiple events in a batch
    pub async fn publish_batch(&self, batch: EventBatch) -> Result<(), AppError> {
        log_info!("EventService::publish_batch", "Publishing batch {} with {} events", batch.id, batch.events.len());

        let mut failed_events: Vec<String> = Vec::new();

        for event in batch.events {
            if let Err(e) = self.publish(event).await {
                log_error!("EventService::publish_batch", "Failed to publish event: {}", e);
                // Continue with other events
            }
        }

        Ok(())
    }

    /// Subscribe to events with a filter
    pub async fn subscribe(&self, filter: EventFilter) -> Result<String, AppError> {
        let subscription_count = self.subscriptions.read().await.len();
        let max_subscriptions = self.config.read().await.max_subscriptions;

        if subscription_count >= max_subscriptions {
            return Err(app_error!(internal, format!("Maximum subscriptions ({}) reached", max_subscriptions)));
        }

        let receiver = self.event_sender.subscribe();
        let subscription = EventSubscription::new(filter.clone(), receiver);
        let subscription_id = subscription.id.clone();

        {
            let mut subscriptions = self.subscriptions.write().await;
            // We can't clone EventSubscription, so we create a new one
            let new_subscription = EventSubscription::new(subscription.filter, self.event_sender.subscribe());
            subscriptions.insert(subscription_id.clone(), new_subscription);
        }

        // Update stats
        {
            let subscription_count = self.subscriptions.read().await.len();
            let mut stats = self.stats.write().await;
            stats.active_subscriptions = subscription_count as u64;
        }

        log_info!("EventService::subscribe", "Created subscription {} for categories: {:?}", subscription_id, filter.categories);
        Ok(subscription_id)
    }

    /// Unsubscribe from events
    pub async fn unsubscribe(&self, subscription_id: &str) -> Result<(), AppError> {
        {
            let mut subscriptions = self.subscriptions.write().await;
            subscriptions.remove(subscription_id);
        }

        // Update stats
        {
            let subscription_count = self.subscriptions.read().await.len();
            let mut stats = self.stats.write().await;
            stats.active_subscriptions = subscription_count as u64;
        }

        log_info!("EventService", "Unsubscribed: {}", subscription_id);
        Ok(())
    }

    /// Get subscription by ID
    pub async fn get_subscription(&self, subscription_id: &str) -> Option<EventSubscriptionInfo> {
        let subscriptions = self.subscriptions.read().await;
        subscriptions.get(subscription_id).map(|sub| EventSubscriptionInfo {
            id: sub.id.clone(),
            filter: sub.filter.clone(),
            created_at: sub.created_at,
            active: sub.active,
            events_received: sub.events_received,
            last_event_at: sub.last_event_at,
        })
    }

    /// Get all active subscriptions
    pub async fn get_subscriptions(&self) -> Vec<EventSubscriptionInfo> {
        let subscriptions = self.subscriptions.read().await;
        subscriptions.values().map(|sub| EventSubscriptionInfo {
            id: sub.id.clone(),
            filter: sub.filter.clone(),
            created_at: sub.created_at,
            active: sub.active,
            events_received: sub.events_received,
            last_event_at: sub.last_event_at,
        }).collect()
    }

    /// Acknowledge an event
    pub async fn acknowledge_event(&self, event_id: String, subscription_id: String, status: AckStatus, message: Option<String>) -> Result<(), AppError> {
        let ack = EventAcknowledgement {
            event_id: event_id.clone(),
            subscription_id: subscription_id.clone(),
            status,
            message,
            timestamp: Utc::now(),
            processing_time_ms: None,
        };

        // Track acknowledgment
        {
            let mut pending = self.pending_acks.write().await;
            if let Some(subscribers) = pending.get_mut(&event_id) {
                if !subscribers.contains(&subscription_id) {
                    subscribers.push(subscription_id.clone());
                }
            }
        }

        // Update statistics
        {
            let mut stats = self.stats.write().await;
            match ack.status {
                AckStatus::Acknowledged | AckStatus::Processed => {
                    stats.acknowledged_events += 1;
                },
                AckStatus::Failed | AckStatus::Rejected => {
                    stats.failed_events += 1;
                },
            }
        }

        log_info!("EventService::acknowledge", "Event {} acknowledged by subscription {} with status {:?}", event_id, ack.subscription_id, ack.status);
        Ok(())
    }

    /// Get event statistics
    pub async fn get_stats(&self) -> EventStats {
        let mut stats = self.stats.write().await;

        // Update current timestamp
        stats.timestamp = Utc::now();

        // Update active subscriptions count
        let subscriptions = self.subscriptions.read().await;
        stats.active_subscriptions = subscriptions.len() as u64;

        stats.clone()
    }

    /// Get dead letter queue events
    pub async fn get_dead_letter_events(&self, limit: Option<usize>) -> Vec<DeadLetterEvent> {
        let dead_letter = self.dead_letter_queue.read().await;
        let limit = limit.unwrap_or(dead_letter.len());

        dead_letter
            .iter()
            .rev()
            .take(limit)
            .cloned()
            .collect()
    }

    /// Clear dead letter queue
    pub async fn clear_dead_letter_queue(&self) -> Result<usize, AppError> {
        let mut dead_letter = self.dead_letter_queue.write().await;
        let count = dead_letter.len();
        dead_letter.clear();

        log_info!("EventService", "Cleared {} events from dead letter queue", count);
        Ok(count)
    }

    /// Retry events from dead letter queue
    pub async fn retry_dead_letter_events(&self, limit: Option<usize>) -> Result<usize, AppError> {
        let mut dead_letter = self.dead_letter_queue.write().await;
        let limit = limit.unwrap_or(dead_letter.len());

        let mut retried = 0;
        let mut to_remove = Vec::new();

        for (index, dead_event) in dead_letter.iter().enumerate().take(limit) {
            let mut event = dead_event.event.clone();

            if event.can_retry() {
                event.increment_retry();

                // Remove from dead letter queue
                to_remove.push(index);

                // Retry publishing
                if let Err(e) = self.publish(event).await {
                    log_error!("EventService::retry_dead_letter", "Failed to retry event {}: {}", dead_event.event.id, e);
                } else {
                    retried += 1;
                    log_info!("EventService::retry_dead_letter", "Retried event {} (attempt {})", dead_event.event.id, dead_event.event.retry_count + 1);
                }
            }
        }

        // Remove retried events (in reverse order to maintain indices)
        for &index in to_remove.iter().rev() {
            dead_letter.remove(index);
        }

        log_info!("EventService", "Retried {} events from dead letter queue", retried);
        Ok(retried)
    }

    /// Query events from buffer
    pub async fn query_events(&self, filter: EventFilter, limit: Option<usize>) -> Result<Vec<Event>, AppError> {
        let buffer = self.event_buffer.read().await;
        let limit = limit.unwrap_or(buffer.len());

        let mut matching_events = Vec::new();

        for event in buffer.iter().rev() {
            if Self::event_matches_filter(event, &filter) {
                matching_events.push(event.clone());

                if matching_events.len() >= limit {
                    break;
                }
            }
        }

        Ok(matching_events)
    }

    // Private helper methods

    async fn update_stats(stats: &Arc<RwLock<EventStats>>, subscriptions: &Arc<RwLock<HashMap<String, EventSubscription>>>) {
        let mut stats = stats.write().await;
        let subscriptions = subscriptions.read().await;

        stats.timestamp = Utc::now();
        stats.active_subscriptions = subscriptions.len() as u64;
    }

    async fn cleanup_expired_events(
        config: &Arc<RwLock<EventConfig>>,
        event_buffer: &Arc<RwLock<Vec<Event>>>,
        dead_letter_queue: &Arc<RwLock<Vec<DeadLetterEvent>>>,
    ) {
        let now = Utc::now();

        // Clean up expired events from buffer
        {
            let mut buffer = event_buffer.write().await;
            let initial_len = buffer.len();

            buffer.retain(|event| {
                !event.is_expired()
            });

            let removed = initial_len - buffer.len();
            if removed > 0 {
                log_info!("EventService::cleanup", "Removed {} expired events from buffer", removed);
            }
        }

        // Clean up old dead letter events (older than 24 hours)
        {
            let mut dead_letter = dead_letter_queue.write().await;
            let initial_len = dead_letter.len();

            let cutoff = now - chrono::Duration::hours(24);
            dead_letter.retain(|dead_event| {
                dead_event.dead_letter_at > cutoff
            });

            let removed = initial_len - dead_letter.len();
            if removed > 0 {
                log_info!("EventService::cleanup", "Removed {} old events from dead letter queue", removed);
            }
        }
    }

    async fn persist_events(
        config: &Arc<RwLock<EventConfig>>,
        event_buffer: &Arc<RwLock<Vec<Event>>>,
        stats: &Arc<RwLock<EventStats>>,
    ) -> Result<(), AppError> {
        let config = config.read().await;

        if let Some(ref path) = config.persistence_file {
            let buffer = event_buffer.read().await;
            let stats = stats.read().await;

            let persistence_data = EventPersistenceData {
                events: buffer.clone(),
                stats: stats.clone(),
                timestamp: Utc::now(),
            };

            let data = serde_json::to_string_pretty(&persistence_data)
                .map_err(|e| app_error!(parse, "JSON", format!("Failed to serialize events: {}", e)))?;

            fs::write(path, data)
                .map_err(|e| app_error!(filesystem, path, format!("Failed to write events: {}", e)))?;

            log_info!("EventService::persist", "Persisted {} events to {}", buffer.len(), path);
        }

        Ok(())
    }

    async fn add_to_dead_letter_queue(&self, dead_event: DeadLetterEvent) {
        let mut dead_letter = self.dead_letter_queue.write().await;
        dead_letter.push(dead_event);

        // Trim dead letter queue if needed
        let max_size = 1000; // Configurable in the future
        if dead_letter.len() > max_size {
            dead_letter.remove(0);
        }
    }

    fn event_matches_filter(event: &Event, filter: &EventFilter) -> bool {
        // Check categories
        if !filter.categories.is_empty() && !filter.categories.contains(&event.category) {
            return false;
        }

        // Check event types (patterns supported)
        if !filter.event_types.is_empty() {
            let matches_pattern = filter.event_types.iter().any(|pattern| {
                if pattern.contains('*') {
                    let regex_pattern = pattern.replace('*', ".*");
                    if let Ok(regex) = regex::Regex::new(&format!("^{}$", regex_pattern)) {
                        regex.is_match(&event.event_type)
                    } else {
                        false
                    }
                } else {
                    event.event_type.contains(pattern)
                }
            });

            if !matches_pattern {
                return false;
            }
        }

        // Check minimum priority
        if let Some(min_priority) = filter.min_priority {
            if event.priority < min_priority {
                return false;
            }
        }

        // Check sources
        if !filter.sources.is_empty() && !filter.sources.contains(&event.source) {
            return false;
        }

        // Check targets
        if !filter.targets.is_empty() {
            if let Some(ref target) = event.target {
                if !filter.targets.contains(target) {
                    return false;
                }
            } else {
                return false;
            }
        }

        // Check tags
        if !filter.tags.is_empty() {
            let has_required_tag = filter.tags.iter().any(|tag| event.tags.contains(tag));
            if !has_required_tag {
                return false;
            }
        }

        // Check time range
        if let Some(ref time_range) = filter.time_range {
            if !time_range.contains(event.timestamp) {
                return false;
            }
        }

        // TODO: Implement custom filter evaluation if needed

        true
    }
}

impl Drop for EventService {
    fn drop(&mut self) {
        log_info!("EventService", "Event service dropped");
    }
}

/// Event persistence data structure
#[derive(Debug, Clone, Serialize, Deserialize)]
struct EventPersistenceData {
    events: Vec<Event>,
    stats: EventStats,
    timestamp: DateTime<Utc>,
}

// Tauri command handlers
#[tauri::command]
pub async fn publish_event(
    category: String,
    event_type: String,
    source: String,
    data: Option<serde_json::Value>,
    priority: Option<String>,
    service: tauri::State<'_, Arc<EventService>>,
) -> Result<String, String> {
    let event_category = match category.as_str() {
        "vm_lifecycle" => EventCategory::VMLifecycle,
        "vm_status" => EventCategory::VMStatus,
        "vm_resources" => EventCategory::VMResources,
        "config_change" => EventCategory::ConfigChange,
        "state_change" => EventCategory::StateChange,
        "system_startup" => EventCategory::SystemStartup,
        "ui_interaction" => EventCategory::UIInteraction,
        "cli_tool_detection" => EventCategory::CLIToolDetection,
        _ => EventCategory::Custom(category),
    };

    let event_priority = match priority.as_deref() {
        Some("trace") => EventPriority::Trace,
        Some("debug") => EventPriority::Debug,
        Some("low") => EventPriority::Low,
        Some("medium") => EventPriority::Medium,
        Some("high") => EventPriority::High,
        Some("critical") => EventPriority::Critical,
        _ => EventPriority::Info,
    };

    let mut event = Event::new(event_category, event_type, source);
    event = event.with_priority(event_priority);

    if let Some(data) = data {
        event = event.with_data(data);
    }

    let event_id = event.id.clone();

    service.publish(event).await
        .map_err(|e| e.to_string())?;

    Ok(event_id)
}

#[tauri::command]
pub async fn subscribe_to_events(
    categories: Option<Vec<String>>,
    event_types: Option<Vec<String>>,
    min_priority: Option<String>,
    service: tauri::State<'_, Arc<EventService>>,
) -> Result<String, String> {
    let mut filter = EventFilter::default();

    if let Some(cats) = categories {
        filter.categories = cats.into_iter().map(|cat| {
            match cat.as_str() {
                "vm_lifecycle" => EventCategory::VMLifecycle,
                "vm_status" => EventCategory::VMStatus,
                "vm_resources" => EventCategory::VMResources,
                "config_change" => EventCategory::ConfigChange,
                "state_change" => EventCategory::StateChange,
                "system_startup" => EventCategory::SystemStartup,
                "ui_interaction" => EventCategory::UIInteraction,
                "cli_tool_detection" => EventCategory::CLIToolDetection,
                _ => EventCategory::Custom(cat),
            }
        }).collect();
    }

    if let Some(types) = event_types {
        filter.event_types = types;
    }

    if let Some(priority) = min_priority {
        filter.min_priority = match priority.as_str() {
            "trace" => Some(EventPriority::Trace),
            "debug" => Some(EventPriority::Debug),
            "low" => Some(EventPriority::Low),
            "medium" => Some(EventPriority::Medium),
            "high" => Some(EventPriority::High),
            "critical" => Some(EventPriority::Critical),
            _ => None,
        };
    }

    service.subscribe(filter).await
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn unsubscribe_from_events(
    subscription_id: String,
    service: tauri::State<'_, Arc<EventService>>,
) -> Result<(), String> {
    service.unsubscribe(&subscription_id).await
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn get_event_stats(
    service: tauri::State<'_, Arc<EventService>>,
) -> Result<EventStats, String> {
    Ok(service.get_stats().await)
}

#[tauri::command]
pub async fn get_dead_letter_events(
    limit: Option<usize>,
    service: tauri::State<'_, Arc<EventService>>,
) -> Result<Vec<DeadLetterEvent>, String> {
    Ok(service.get_dead_letter_events(limit).await)
}

#[tauri::command]
pub async fn retry_dead_letter_events(
    limit: Option<usize>,
    service: tauri::State<'_, Arc<EventService>>,
) -> Result<usize, String> {
    service.retry_dead_letter_events(limit).await
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn clear_dead_letter_queue(
    service: tauri::State<'_, Arc<EventService>>,
) -> Result<usize, String> {
    service.clear_dead_letter_queue().await
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn query_events(
    categories: Option<Vec<String>>,
    event_types: Option<Vec<String>>,
    min_priority: Option<String>,
    limit: Option<usize>,
    service: tauri::State<'_, Arc<EventService>>,
) -> Result<Vec<Event>, String> {
    let mut filter = EventFilter::default();

    if let Some(cats) = categories {
        filter.categories = cats.into_iter().map(|cat| {
            match cat.as_str() {
                "vm_lifecycle" => EventCategory::VMLifecycle,
                "vm_status" => EventCategory::VMStatus,
                "vm_resources" => EventCategory::VMResources,
                "config_change" => EventCategory::ConfigChange,
                "state_change" => EventCategory::StateChange,
                "system_startup" => EventCategory::SystemStartup,
                "ui_interaction" => EventCategory::UIInteraction,
                "cli_tool_detection" => EventCategory::CLIToolDetection,
                _ => EventCategory::Custom(cat),
            }
        }).collect();
    }

    if let Some(types) = event_types {
        filter.event_types = types;
    }

    if let Some(priority) = min_priority {
        filter.min_priority = match priority.as_str() {
            "trace" => Some(EventPriority::Trace),
            "debug" => Some(EventPriority::Debug),
            "low" => Some(EventPriority::Low),
            "medium" => Some(EventPriority::Medium),
            "high" => Some(EventPriority::High),
            "critical" => Some(EventPriority::Critical),
            _ => None,
        };
    }

    service.query_events(filter, limit).await
        .map_err(|e| e.to_string())
}

#[cfg(test)]
mod tests {
    use super::*;
    use tokio_test;

    #[tokio::test]
    async fn test_event_service_basic_operations() {
        let config = EventConfig::default();
        let service = EventService::new(config).unwrap();

        // Create and publish an event
        let event = Event::new(EventCategory::VMLifecycle, "vm_started".to_string(), "test_service".to_string())
            .with_data(serde_json::json!({"vm_id": "test-vm"}));

        let result = service.publish(event).await;
        assert!(result.is_ok());

        // Get stats
        let stats = service.get_stats().await;
        assert_eq!(stats.total_events, 1);
        assert_eq!(stats.events_by_category.get("vm_lifecycle"), Some(&1));
        assert_eq!(stats.events_by_source.get("test_service"), Some(&1));
    }

    #[tokio::test]
    async fn test_event_subscription() {
        let config = EventConfig::default();
        let service = EventService::new(config).unwrap();

        // Subscribe to VM lifecycle events
        let filter = EventFilter {
            categories: vec![EventCategory::VMLifecycle],
            ..Default::default()
        };

        let subscription_id = service.subscribe(filter).await.unwrap();
        assert!(!subscription_id.is_empty());

        // Get subscriptions
        let subscriptions = service.get_subscriptions().await;
        assert_eq!(subscriptions.len(), 1);
        assert_eq!(subscriptions[0].id, subscription_id);

        // Unsubscribe
        service.unsubscribe(&subscription_id).await.unwrap();
        let subscriptions = service.get_subscriptions().await;
        assert_eq!(subscriptions.len(), 0);
    }

    #[tokio::test]
    async fn test_event_batch_publishing() {
        let config = EventConfig::default();
        let service = EventService::new(config).unwrap();

        let events = vec![
            Event::new(EventCategory::VMLifecycle, "vm_started".to_string(), "test_service".to_string()),
            Event::new(EventCategory::VMLifecycle, "vm_stopped".to_string(), "test_service".to_string()),
        ];

        let batch = EventBatch::new(events);
        let result = service.publish_batch(batch).await;
        assert!(result.is_ok());

        let stats = service.get_stats().await;
        assert_eq!(stats.total_events, 2);
    }

    #[tokio::test]
    async fn test_event_filtering() {
        let config = EventConfig::default();
        let service = EventService::new(config).unwrap();

        // Publish events of different categories
        let vm_event = Event::new(EventCategory::VMLifecycle, "vm_started".to_string(), "test_service".to_string());
        let config_event = Event::new(EventCategory::ConfigChange, "config_updated".to_string(), "test_service".to_string());

        service.publish(vm_event).await.unwrap();
        service.publish(config_event).await.unwrap();

        // Query only VM events
        let filter = EventFilter {
            categories: vec![EventCategory::VMLifecycle],
            ..Default::default()
        };

        let results = service.query_events(filter, None).await.unwrap();
        assert_eq!(results.len(), 1);
        assert_eq!(results[0].category, EventCategory::VMLifecycle);
    }

    #[tokio::test]
    async fn test_dead_letter_queue() {
        let config = EventConfig {
            max_buffer_size: 1, // Very small to trigger dead letter
            ..Default::default()
        };
        let service = EventService::new(config).unwrap();

        // Publish events to exceed buffer size
        let event1 = Event::new(EventCategory::VMLifecycle, "event1".to_string(), "test".to_string());
        let event2 = Event::new(EventCategory::VMLifecycle, "event2".to_string(), "test".to_string());

        service.publish(event1).await.unwrap();
        service.publish(event2).await.unwrap(); // This should go to dead letter queue

        // Check dead letter queue
        let dead_events = service.get_dead_letter_events(None).await;
        assert!(!dead_events.is_empty());

        // Clear dead letter queue
        let cleared = service.clear_dead_letter_queue().await.unwrap();
        assert!(cleared > 0);

        let dead_events_after = service.get_dead_letter_events(None).await;
        assert_eq!(dead_events_after.len(), 0);
    }

    #[tokio::test]
    async fn test_event_acknowledgement() {
        let config = EventConfig::default();
        let service = EventService::new(config).unwrap();

        // Create event that requires acknowledgement
        let event = Event::new(EventCategory::VMLifecycle, "vm_started".to_string(), "test_service".to_string())
            .requires_acknowledgement();

        service.publish(event).await.unwrap();

        let stats_before = service.get_stats().await;
        assert_eq!(stats_before.events_requiring_ack, 1);
        assert_eq!(stats_before.acknowledged_events, 0);

        // Acknowledge the event (need a subscription ID)
        let subscription_id = "test-subscription".to_string();
        service.acknowledge_event("event-id".to_string(), subscription_id, AckStatus::Acknowledged, None).await.unwrap();

        let stats_after = service.get_stats().await;
        assert_eq!(stats_after.acknowledged_events, 1);
    }
}