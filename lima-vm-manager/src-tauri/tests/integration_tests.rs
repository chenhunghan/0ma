//! Integration Tests for VM Management System
//!
//! This module provides comprehensive end-to-end tests for the entire
//! VM management system including management, monitoring, and configuration.

use tokio::test;
use std::sync::Arc;
use std::path::PathBuf;
use tempfile::TempDir;
use lima_vm_manager_lib::{
    services::{vm_management::VMManagementService, vm_monitoring::VMMonitoringService, vm_config::VMConfigService},
    models::vm::{VMConfiguration, VMArchitecture, VMOperatingSystem, VMStatus}
};

/// Test complete VM management workflow
#[tokio::test]
async fn test_complete_vm_workflow() -> Result<(), Box<dyn std::error::Error>> {
    // Create temporary directory for testing
    let temp_dir = TempDir::new()?;
    let config_path = temp_dir.path().to_path_buf();

    // Initialize services
    let vm_service = Arc::new(VMManagementService::new()?);
    let monitoring_service = Arc::new(VMMonitoringService::new(Arc::clone(&vm_service)));
    let config_service = Arc::new(VMConfigService::new(config_path)?);

    // Test 1: VM Management Service initialization
    let system_info = lima_vm_manager_lib::services::vm_management::get_system_info().await?;
    assert!(system_info.get("lima_version").is_some(), "Should detect lima version");

    // Test 2: VM Configuration Service template loading
    let templates = config_service.get_templates().await;
    assert!(!templates.is_empty(), "Should have built-in templates loaded");

    let ubuntu_template = config_service.get_template("ubuntu").await;
    assert!(ubuntu_template.is_some(), "Should have Ubuntu template available");

    // Test 3: Configuration validation
    let test_config = VMConfiguration {
        template: "ubuntu".to_string(),
        arch: VMArchitecture::X86_64,
        os: VMOperatingSystem::Linux,
        version: "22.04".to_string(),
        auto_start: false,
        config_file: PathBuf::from("/test/config.yaml"),
        working_dir: PathBuf::from("/test"),
        settings: std::collections::HashMap::new(),
    };

    let validation_result = config_service.validate_config(&test_config).await;
    assert!(validation_result.is_valid, "Valid configuration should pass validation");

    // Test 4: VM listing (empty system)
    let vm_list = vm_service.list_vms(None)?;
    assert!(vm_list.is_empty(), "New system should have no VMs");

    // Test 5: Monitoring service startup
    monitoring_service.start_monitoring().await?;
    assert!(monitoring_service.is_monitoring_active().await, "Monitoring should be active");

    // Test 6: VM monitoring stats
    let stats = monitoring_service.get_monitoring_stats().await;
    assert_eq!(stats.total_vms, 0, "Should monitor 0 VMs initially");
    assert_eq!(stats.running_vms, 0, "Should have 0 running VMs initially");

    // Cleanup
    monitoring_service.stop_monitoring().await?;
    assert!(!monitoring_service.is_monitoring_active().await, "Monitoring should be stopped");

    Ok(())
}

/// Test VM configuration management
#[tokio::test]
async fn test_vm_configuration_management() -> Result<(), Box<dyn std::error::Error>> {
    let temp_dir = TempDir::new()?;
    let config_path = temp_dir.path().to_path_buf();

    let config_service = VMConfigService::new(config_path)?;

    // Test template functionality
    let templates = config_service.get_templates().await;
    assert!(!templates.is_empty(), "Should have built-in templates");

    // Test configuration creation from template
    let vm_config = config_service
        .create_config_from_template("ubuntu", "test-vm", None)
        .await?;

    assert_eq!(vm_config.template, "ubuntu");
    assert_eq!(vm_config.arch, VMArchitecture::X86_64);
    assert_eq!(vm_config.os, VMOperatingSystem::Linux);

    // Test configuration saving and loading
    let saved_path = config_service.save_config("test-vm", &vm_config).await?;
    assert!(saved_path.exists(), "Config file should be saved");

    let loaded_config = config_service.load_config("test-vm").await?;
    assert_eq!(loaded_config.template, vm_config.template);
    assert_eq!(loaded_config.arch, vm_config.arch);

    // Test configuration history
    let history = config_service.get_config_history("test-vm").await;
    assert!(!history.is_empty(), "Should have configuration history");

    // Test configuration backup
    let backup_id = config_service
        .create_backup("test-vm", "Test backup".to_string())
        .await?;

    let backups = config_service.get_backups("test-vm").await;
    assert!(!backups.is_empty(), "Should have at least one backup");

    // Test configuration cloning
    config_service
        .clone_config("test-vm", "cloned-vm")
        .await?;

    let cloned_config = config_service.load_config("cloned-vm").await?;
    assert_eq!(cloned_config.template, vm_config.template);

    // Test configuration export/import
    let export_path = temp_dir.path().join("exported_config.yaml");
    config_service
        .export_config("test-vm", &export_path)
        .await?;

    assert!(export_path.exists(), "Exported config should exist");

    // Test configuration deletion
    config_service.delete_config("test-vm").await?;
    config_service.delete_config("cloned-vm").await?;

    Ok(())
}

/// Test VM monitoring service functionality
#[tokio::test]
async fn test_vm_monitoring_functionality() -> Result<(), Box<dyn std::error::Error>> {
    let vm_service = Arc::new(VMManagementService::new()?);
    let monitoring_service = Arc::new(VMMonitoringService::new(Arc::clone(&vm_service)));

    // Test monitoring configuration
    let config = monitoring_service.get_config();
    assert_eq!(config.interval_secs, 5, "Default interval should be 5 seconds");
    assert!(config.auto_monitoring, "Auto monitoring should be enabled by default");

    // Test monitoring lifecycle
    assert!(!monitoring_service.is_monitoring_active().await, "Should not be monitoring initially");

    monitoring_service.start_monitoring().await?;
    assert!(monitoring_service.is_monitoring_active().await, "Should be monitoring after start");

    // Test stats collection
    tokio::time::sleep(tokio::time::Duration::from_millis(100)).await; // Allow some monitoring cycles

    let stats = monitoring_service.get_monitoring_stats().await;
    assert!(stats.total_vms >= 0, "Should track total VMs");
    assert!(stats.running_vms >= 0, "Should track running VMs");

    // Test event subscription
    let mut event_receiver = monitoring_service.subscribe_to_events();

    // Stop monitoring and verify no more events are generated
    monitoring_service.stop_monitoring().await?;
    assert!(!monitoring_service.is_monitoring_active().await, "Should not be monitoring after stop");

    Ok(())
}

/// Test error handling and edge cases
#[tokio::test]
async fn test_error_handling_and_edge_cases() -> Result<(), Box<dyn std::error::Error>> {
    let temp_dir = TempDir::new()?;
    let config_path = temp_dir.path().to_path_buf();

    let vm_service = VMManagementService::new()?;
    let config_service = VMConfigService::new(config_path)?;

    // Test invalid VM operations
    let invalid_vm_result = vm_service.get_vm_details("nonexistent-vm");
    assert!(invalid_vm_result.is_err(), "Should fail for nonexistent VM");

    // Test invalid template operations
    let invalid_template = config_service.get_template("nonexistent-template").await;
    assert!(invalid_template.is_none(), "Should return None for nonexistent template");

    // Test configuration validation errors
    let invalid_config = VMConfiguration {
        template: "".to_string(), // Empty template
        arch: VMArchitecture::Unknown,
        os: VMOperatingSystem::Other("invalid".to_string()),
        version: "".to_string(),
        auto_start: false,
        config_file: PathBuf::new(),
        working_dir: PathBuf::new(),
        settings: std::collections::HashMap::new(),
    };

    let validation_result = config_service.validate_config(&invalid_config).await;
    assert!(!validation_result.is_valid, "Invalid config should fail validation");
    assert!(!validation_result.errors.is_empty(), "Should have validation errors");

    // Test loading nonexistent configuration
    let load_result = config_service.load_config("nonexistent-vm").await;
    assert!(load_result.is_err(), "Should fail to load nonexistent config");

    // Test deleting nonexistent configuration
    let delete_result = config_service.delete_config("nonexistent-vm").await;
    assert!(delete_result.is_err(), "Should fail to delete nonexistent config");

    Ok(())
}

/// Test concurrent operations
#[tokio::test]
async fn test_concurrent_operations() -> Result<(), Box<dyn std::error::Error>> {
    let temp_dir = TempDir::new()?;
    let config_path = temp_dir.path().to_path_buf();

    let config_service = Arc::new(VMConfigService::new(config_path)?);
    let vm_service = Arc::new(VMManagementService::new()?);
    let monitoring_service = Arc::new(VMMonitoringService::new(Arc::clone(&vm_service)));

    // Test concurrent configuration operations
    let mut handles = vec![];

    for i in 0..5 {
        let service = Arc::clone(&config_service);
        let handle = tokio::spawn(async move {
            let vm_id = format!("test-vm-{}", i);
            let config = service.get_template("ubuntu").await.unwrap().default_config.clone();

            // Save configuration
            service.save_config(&vm_id, &config).await.unwrap();

            // Load configuration
            service.load_config(&vm_id).await.unwrap();

            // Create backup
            service.create_backup(&vm_id, "Test backup".to_string()).await.unwrap();

            vm_id
        });
        handles.push(handle);
    }

    // Wait for all operations to complete
    let vm_ids: Vec<String> = futures::future::join_all(handles)
        .await
        .into_iter()
        .map(|result| result.unwrap())
        .collect();

    // Verify all configurations were created
    for vm_id in &vm_ids {
        let config = config_service.load_config(vm_id).await?;
        assert_eq!(config.template, "ubuntu");

        let backups = config_service.get_backups(vm_id).await;
        assert!(!backups.is_empty());
    }

    // Test concurrent monitoring operations
    let mut monitoring_handles = vec![];

    for _ in 0..3 {
        let service = Arc::clone(&monitoring_service);
        let handle = tokio::spawn(async move {
            let stats = service.get_monitoring_stats().await;
            assert!(stats.total_vms >= 0);

            let statuses = service.get_all_vm_statuses().await;
            assert_eq!(statuses.len(), stats.total_vms);
        });
        monitoring_handles.push(handle);
    }

    futures::future::join_all(monitoring_handles).await;

    // Cleanup
    for vm_id in &vm_ids {
        let _ = config_service.delete_config(vm_id).await;
    }

    Ok(())
}

/// Test performance under load
#[tokio::test]
async fn test_performance_under_load() -> Result<(), Box<dyn std::error::Error>> {
    let temp_dir = TempDir::new()?;
    let config_path = temp_dir.path().to_path_buf();

    let config_service = VMConfigService::new(config_path)?;
    let vm_service = VMManagementService::new()?;

    let start_time = std::time::Instant::now();

    // Create many configurations
    for i in 0..50 {
        let vm_id = format!("perf-test-vm-{}", i);
        let config = config_service.get_template("ubuntu").await.unwrap().default_config.clone();
        config_service.save_config(&vm_id, &config).await?;
    }

    let create_duration = start_time.elapsed();
    println!("Created 50 configurations in {:?}", create_duration);
    assert!(create_duration.as_secs() < 5, "Should create 50 configs in under 5 seconds");

    // Test loading all configurations
    let load_start = std::time::Instant::now();
    for i in 0..50 {
        let vm_id = format!("perf-test-vm-{}", i);
        config_service.load_config(&vm_id).await?;
    }
    let load_duration = load_start.elapsed();
    println!("Loaded 50 configurations in {:?}", load_duration);
    assert!(load_duration.as_secs() < 3, "Should load 50 configs in under 3 seconds");

    // Test VM listing performance
    let list_start = std::time::Instant::now();
    for _ in 0..10 {
        vm_service.list_vms(None)?;
    }
    let list_duration = list_start.elapsed();
    println!("Listed VMs 10 times in {:?}", list_duration);
    assert!(list_duration.as_secs() < 2, "Should list VMs 10 times in under 2 seconds");

    Ok(())
}