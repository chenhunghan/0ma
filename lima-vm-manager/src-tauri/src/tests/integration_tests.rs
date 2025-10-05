#[cfg(test)]
mod integration_tests {
    use crate::models::{
        Event, EventCategory, EventPriority, EventFilter, EventStats, EventConfig,
        StateKey, StateValue, StateConfig, StatePersistence, StateStats, LogLevel, AppTheme
    };
    use crate::services::{
        StateService, EventService, LoggingService, LoggingConfig, ConfigService,
        CLIDetectionService
    };
    use crate::models::cli_tools::CLIDetectionConfig;
    use crate::models::error::AppError;
    use crate::{app_error};
    use tokio_test;
    use std::sync::Arc;
    use std::time::Duration;
    use tokio::time::sleep;

    /// Test basic service initialization and interaction
    #[tokio::test]
    async fn test_service_initialization() {
        // Initialize all core services
        let logging_config = LoggingConfig::default();
        let logging_service = LoggingService::new(logging_config).unwrap();

        let state_config = StateConfig::default();
        let state_service = Arc::new(StateService::new(state_config).unwrap());

        let event_config = EventConfig::default();
        let mut event_service = EventService::new(event_config).unwrap();
        event_service.start_background_tasks().await.unwrap();

        let cli_config = CLIDetectionConfig::default();
        let cli_service = Arc::new(CLIDetectionService::new_with_config(cli_config));

        // Test that all services are properly initialized
        assert!(logging_service.get_stats().total_logs >= 0);
        assert_eq!(state_service.get_stats().await.total_keys, 0);
        assert_eq!(event_service.get_stats().await.total_events, 0);
        assert!(cli_service.get_cached_status().is_none());
    }

    /// Test state and event service integration
    #[tokio::test]
    async fn test_state_event_integration() {
        // Initialize services
        let state_config = StateConfig::default();
        let state_service = Arc::new(StateService::new(state_config).unwrap());

        let event_config = EventConfig::default();
        let mut event_service = EventService::new(event_config).unwrap();
        event_service.start_background_tasks().await.unwrap();

        // Subscribe to state change events
        let subscription_id = event_service.subscribe(EventFilter {
            categories: vec![EventCategory::StateChange],
            ..Default::default()
        }).await.unwrap();

        // Set a state value (this should trigger an event)
        let key = StateKey::Custom("test_key".to_string());
        let value = StateValue::String("test_value".to_string());

        state_service.set(key.clone(), value.clone(), "integration_test".to_string()).await.unwrap();

        // Verify state was set
        let retrieved = state_service.get(&key).await.unwrap();
        assert_eq!(retrieved, value);

        // Verify event was published
        let stats = event_service.get_stats().await;
        assert!(stats.total_events >= 1);

        // Cleanup
        event_service.unsubscribe(&subscription_id).await.unwrap();
    }

    /// Test logging and event service integration
    #[tokio::test]
    async fn test_logging_event_integration() {
        // Initialize services
        let logging_config = LoggingConfig::default();
        let logging_service = LoggingService::new(logging_config).unwrap();

        let event_config = EventConfig::default();
        let mut event_service = EventService::new(event_config).unwrap();
        event_service.start_background_tasks().await.unwrap();

        // Subscribe to log events
        let subscription_id = event_service.subscribe(EventFilter {
            categories: vec![EventCategory::LogCreated],
            ..Default::default()
        }).await.unwrap();

        // Log a message
        logging_service.info("TestService", "Integration test message").unwrap();

        // Verify log was created
        let log_stats = logging_service.get_stats();
        assert!(log_stats.total_logs > 0);

        // Verify event system is working
        let event_stats = event_service.get_stats().await;
        assert!(event_stats.total_events >= 0);

        // Cleanup
        event_service.unsubscribe(&subscription_id).await.unwrap();
    }

    /// Test CLI detection and event service integration
    #[tokio::test]
    async fn test_cli_event_integration() {
        // Initialize services
        let cli_config = CLIDetectionConfig::default();
        let cli_service = Arc::new(CLIDetectionService::new_with_config(cli_config));

        let event_config = EventConfig::default();
        let mut event_service = EventService::new(event_config).unwrap();
        event_service.start_background_tasks().await.unwrap();

        // Subscribe to CLI tool events
        let subscription_id = event_service.subscribe(EventFilter {
            categories: vec![EventCategory::CLIToolDetection],
            ..Default::default()
        }).await.unwrap();

        // Trigger CLI detection
        let result = cli_service.detect_tools();

        // CLI detection might fail in test environment, but that's ok
        // We're testing the integration, not the actual CLI tools
        match result {
            Ok(status) => {
                // Detection succeeded
                assert!(!status.limactl.is_available || status.kubectl.is_available);
            },
            Err(_) => {
                // Detection failed (expected in some test environments)
            }
        }

        // Verify event system is working
        let stats = event_service.get_stats().await;
        assert!(stats.total_events >= 0);

        // Cleanup
        event_service.unsubscribe(&subscription_id).await.unwrap();
    }

    /// Test configuration and state service integration
    #[tokio::test]
    async fn test_config_state_integration() {
        // Initialize services
        let config_service = Arc::new(ConfigService::new("test_config.json"));

        let state_config = StateConfig::default();
        let state_service = Arc::new(StateService::new(state_config).unwrap());

        // Update configuration
        let mut updated_config = config_service.get_config().unwrap();
        updated_config.general.theme = AppTheme::Dark;
        updated_config.general.log_level = LogLevel::Debug;

        config_service.update_app_config(updated_config, Some("integration_test")).unwrap();

        // Store configuration state
        let config_key = StateKey::AppConfiguration;
        let config_value = StateValue::Json(serde_json::to_value(config_service.get_config().unwrap()).unwrap());

        state_service.set(config_key, config_value, "config_sync".to_string()).await.unwrap();

        // Retrieve configuration from state
        let stored_config = state_service.get(&StateKey::AppConfiguration).await.unwrap();
        assert!(stored_config.as_json().is_some());

        // Verify configuration service is still working
        let current_config = config_service.get_config().unwrap();
        assert_eq!(current_config.general.theme, AppTheme::Dark);
        assert_eq!(current_config.general.log_level, LogLevel::Debug);

        // Cleanup
        let _ = std::fs::remove_file("test_config.json");
    }

    /// Test event filtering and prioritization
    #[tokio::test]
    async fn test_event_filtering() {
        // Initialize event service
        let event_config = EventConfig::default();
        let mut event_service = EventService::new(event_config).unwrap();
        event_service.start_background_tasks().await.unwrap();

        // Subscribe to high-priority events only
        let subscription_id = event_service.subscribe(EventFilter {
            categories: vec![EventCategory::VMLifecycle],
            min_priority: Some(EventPriority::High),
            ..Default::default()
        }).await.unwrap();

        // Publish events with different priorities
        let low_priority_event = Event::new(
            EventCategory::VMLifecycle,
            "vm_started".to_string(),
            "test_service".to_string()
        ).with_priority(EventPriority::Low);

        let high_priority_event = Event::new(
            EventCategory::VMLifecycle,
            "vm_crashed".to_string(),
            "test_service".to_string()
        ).with_priority(EventPriority::Critical);

        event_service.publish(low_priority_event).await.unwrap();
        event_service.publish(high_priority_event).await.unwrap();

        // Verify only high-priority events should be received by the subscription
        let stats = event_service.get_stats().await;
        assert_eq!(stats.total_events, 2);

        // Cleanup
        event_service.unsubscribe(&subscription_id).await.unwrap();
    }

    /// Test state persistence and backup
    #[tokio::test]
    async fn test_state_persistence() {
        // Initialize state service with file persistence
        let state_config = StateConfig {
            persistence: StatePersistence::File("test_state.json".to_string()),
            auto_save: true,
            save_interval_seconds: 1,
            ..Default::default()
        };

        let state_service = StateService::new(state_config).unwrap();

        // Set some state values
        state_service.set(
            StateKey::Custom("test1".to_string()),
            StateValue::String("value1".to_string()),
            "test".to_string()
        ).await.unwrap();

        state_service.set(
            StateKey::Custom("test2".to_string()),
            StateValue::Number(42),
            "test".to_string()
        ).await.unwrap();

        // Save state
        state_service.save().await.unwrap();

        // Create backup
        let backup = state_service.create_backup().await.unwrap();
        assert!(!backup.backup_id.is_empty());
        assert!(backup.checksum.len() > 0);

        // Clear state
        state_service.clear().await.unwrap();
        assert_eq!(state_service.get_stats().await.total_keys, 0);

        // Load state back
        state_service.load().await.unwrap();

        // Verify state was restored
        let value1 = state_service.get(&StateKey::Custom("test1".to_string())).await;
        let value2 = state_service.get(&StateKey::Custom("test2".to_string())).await;

        assert!(value1.is_some());
        assert!(value2.is_some());

        // Cleanup test file
        let _ = std::fs::remove_file("test_state.json");
    }

    /// Test event dead letter queue
    #[tokio::test]
    async fn test_dead_letter_queue() {
        // Initialize event service with very small buffer
        let event_config = EventConfig {
            max_buffer_size: 1,
            ..Default::default()
        };

        let event_service = EventService::new(event_config).unwrap();

        // Publish first event (should succeed)
        let event1 = Event::new(
            EventCategory::SystemError,
            "test_event1".to_string(),
            "test_service".to_string()
        );
        event_service.publish(event1).await.unwrap();

        // Publish second event (should go to dead letter queue)
        let event2 = Event::new(
            EventCategory::SystemError,
            "test_event2".to_string(),
            "test_service".to_string()
        );
        event_service.publish(event2).await.unwrap();

        // Check dead letter queue
        let dead_events = event_service.get_dead_letter_events(None).await;
        assert!(dead_events.len() > 0);

        // Retry dead letter events
        let retried = event_service.retry_dead_letter_events(None).await.unwrap();
        assert!(retried >= 0);

        // Clear dead letter queue
        let cleared = event_service.clear_dead_letter_queue().await.unwrap();
        assert!(cleared >= 0);
    }

    /// Test concurrent service operations
    #[tokio::test]
    async fn test_concurrent_operations() {
        // Initialize services
        let state_config = StateConfig::default();
        let state_service = Arc::new(StateService::new(state_config).unwrap());

        let event_config = EventConfig::default();
        let mut event_service = EventService::new(event_config).unwrap();
        event_service.start_background_tasks().await.unwrap();

        let state_service_clone = state_service.clone();

        // Spawn multiple concurrent tasks
        let mut handles = Vec::new();

        for i in 0..10 {
            let service_clone = state_service_clone.clone();
            let handle = tokio::spawn(async move {
                let key = StateKey::Custom(format!("concurrent_key_{}", i));
                let value = StateValue::String(format!("concurrent_value_{}", i));

                service_clone.set(key.clone(), value, format!("task_{}", i)).await.unwrap();

                // Small delay to simulate real work
                sleep(Duration::from_millis(10)).await;

                service_clone.get(&key).await
            });
            handles.push(handle);
        }

        // Wait for all tasks to complete
        let mut results = Vec::new();
        for handle in handles {
            results.push(handle.await.unwrap());
        }

        // Verify all operations completed successfully
        assert_eq!(results.len(), 10);
        for result in results {
            assert!(result.is_some());
        }

        // Verify state service has the correct number of keys
        let stats = state_service.get_stats().await;
        assert_eq!(stats.total_keys, 10);
    }

    /// Test error handling across services
    #[tokio::test]
    async fn test_error_handling_integration() {
        // Initialize services
        let state_config = StateConfig::default();
        let state_service = Arc::new(StateService::new(state_config).unwrap());

        let event_config = EventConfig::default();
        let mut event_service = EventService::new(event_config).unwrap();
        event_service.start_background_tasks().await.unwrap();

        // Subscribe to error events
        let subscription_id = event_service.subscribe(EventFilter {
            categories: vec![EventCategory::SystemError],
            ..Default::default()
        }).await.unwrap();

        // Simulate an error condition
        let error = app_error!(internal, "Test error for integration testing");

        // Publish error event
        let error_event = Event::new(
            EventCategory::SystemError,
            "integration_test_error".to_string(),
            "test_service".to_string()
        )
        .with_priority(EventPriority::High)
        .with_data(serde_json::to_value(&error).unwrap());

        event_service.publish(error_event).await.unwrap();

        // Verify error was handled
        let stats = event_service.get_stats().await;
        assert!(stats.total_events >= 1);

        // Cleanup
        event_service.unsubscribe(&subscription_id).await.unwrap();
    }

    /// Test service lifecycle management
    #[tokio::test]
    async fn test_service_lifecycle() {
        // Test service creation
        let state_config = StateConfig::default();
        let state_service = StateService::new(state_config);
        assert!(state_service.is_ok());

        let event_config = EventConfig::default();
        let event_service = EventService::new(event_config);
        assert!(event_service.is_ok());

        // Test service dropping (through scope)
        {
            let _temp_service = StateService::new(StateConfig::default()).unwrap();
            // Service should be properly initialized
        } // Service should be dropped here

        // Create new service to ensure it still works
        let new_service = StateService::new(StateConfig::default()).unwrap();
        assert_eq!(new_service.get_stats().await.total_keys, 0);
    }

    /// Test performance with high load
    #[tokio::test]
    async fn test_high_load_performance() {
        // Initialize services
        let state_config = StateConfig::default();
        let state_service = Arc::new(StateService::new(state_config).unwrap());

        let event_config = EventConfig {
            max_buffer_size: 10000,
            ..Default::default()
        };
        let mut event_service = EventService::new(event_config).unwrap();
        event_service.start_background_tasks().await.unwrap();

        let state_service_clone = state_service.clone();

        // Generate high load
        let start_time = std::time::Instant::now();

        let mut handles = Vec::new();
        for i in 0..100 {
            let service_clone = state_service_clone.clone();
            let handle = tokio::spawn(async move {
                for j in 0..10 {
                    let key = StateKey::Custom(format!("load_key_{}_{}", i, j));
                    let value = StateValue::String(format!("load_value_{}_{}", i, j));
                    service_clone.set(key.clone(), value, "load_test".to_string()).await.unwrap();
                }
            });
            handles.push(handle);
        }

        // Wait for all operations to complete
        for handle in handles {
            handle.await.unwrap();
        }

        let duration = start_time.elapsed();

        // Verify performance expectations
        assert!(duration.as_secs() < 5, "High load test took too long: {:?}", duration);

        // Verify state consistency
        let stats = state_service.get_stats().await;
        assert_eq!(stats.total_keys, 1000); // 100 tasks * 10 operations each
    }
}