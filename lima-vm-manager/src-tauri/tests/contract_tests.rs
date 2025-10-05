//! Contract Tests for VM Data Models
//!
//! This module provides comprehensive contract testing to ensure all data models
//! maintain their serialization contracts and validation rules.

use lima_vm_manager_lib::models::vm::*;
use lima_vm_manager_lib::models::config::*;
use serde_json;
use std::collections::HashMap;

/// Test VM data model serialization/deserialization contracts
#[test]
fn test_vm_data_model_serialization_contracts() {
    // Test VirtualMachine serialization
    let vm = VirtualMachine {
        id: "test-vm-123".to_string(),
        name: "Test VM".to_string(),
        status: VMStatus::Running,
        config: VMConfiguration::default(),
        resources: VMResources::default(),
        network: VMNetwork::default(),
        storage: VMStorage::default(),
        runtime: VMRuntime::default(),
        shared_directories: vec![],
        metadata: VMMetadata::default(),
    };

    // Test JSON serialization
    let json_str = serde_json::to_string(&vm).expect("VM should serialize to JSON");
    let deserialized_vm: VirtualMachine = serde_json::from_str(&json_str)
        .expect("VM should deserialize from JSON");

    assert_eq!(vm.id, deserialized_vm.id);
    assert_eq!(vm.name, deserialized_vm.name);
    assert_eq!(vm.status, deserialized_vm.status);

    // Test YAML serialization
    let yaml_str = serde_yaml::to_string(&vm).expect("VM should serialize to YAML");
    let deserialized_vm_yaml: VirtualMachine = serde_yaml::from_str(&yaml_str)
        .expect("VM should deserialize from YAML");

    assert_eq!(vm.id, deserialized_vm_yaml.id);
    assert_eq!(vm.name, deserialized_vm_yaml.name);
}

/// Test VM status enum serialization
#[test]
fn test_vm_status_serialization() {
    let statuses = vec![
        VMStatus::Running,
        VMStatus::Stopped,
        VMStatus::Paused,
        VMStatus::Starting,
        VMStatus::Stopping,
        VMStatus::Error("Test error".to_string()),
        VMStatus::Unknown,
    ];

    for status in statuses {
        let json_str = serde_json::to_string(&status)
            .expect("Status should serialize to JSON");
        let deserialized: VMStatus = serde_json::from_str(&json_str)
            .expect("Status should deserialize from JSON");

        assert_eq!(status, deserialized);
    }
}

/// Test VM configuration validation contracts
#[test]
fn test_vm_configuration_validation() {
    let mut config = VMConfiguration::default();

    // Test valid configuration
    config.template = "ubuntu".to_string();
    config.arch = VMArchitecture::X86_64;
    config.os = VMOperatingSystem::Linux;
    config.version = "22.04".to_string();

    let validation = validate_vm_configuration(&config);
    assert!(validation.is_valid, "Valid configuration should pass validation");

    // Test invalid configuration - empty template
    config.template = "".to_string();
    let validation = validate_vm_configuration(&config);
    assert!(!validation.is_valid, "Empty template should fail validation");

    // Test invalid configuration - unknown architecture
    config.template = "ubuntu".to_string();
    config.arch = VMArchitecture::Unknown;
    let validation = validate_vm_configuration(&config);
    assert!(!validation.is_valid, "Unknown architecture should fail validation");
}

/// Test resource utilization data contracts
#[test]
fn test_resource_utilization_contracts() {
    let resource = ResourceUtilization {
        cpu_percent: 75.5,
        memory_used_mb: 2048,
        memory_percent: 50.0,
        disk_used_gb: 30.5,
        disk_percent: 60.0,
        network_io: NetworkIO {
            bytes_rx: 1024000,
            bytes_tx: 512000,
            packets_rx: 1000,
            packets_tx: 800,
            errors_rx: 0,
            errors_tx: 0,
        },
        last_updated: chrono::Utc::now(),
    };

    // Test serialization bounds
    assert!(resource.cpu_percent >= 0.0 && resource.cpu_percent <= 100.0);
    assert!(resource.memory_percent >= 0.0 && resource.memory_percent <= 100.0);
    assert!(resource.disk_percent >= 0.0 && resource.disk_percent <= 100.0);

    // Test serialization
    let json_str = serde_json::to_string(&resource).expect("Resource should serialize");
    let deserialized: ResourceUtilization = serde_json::from_str(&json_str)
        .expect("Resource should deserialize");

    assert_eq!(resource.cpu_percent, deserialized.cpu_percent);
    assert_eq!(resource.memory_used_mb, deserialized.memory_used_mb);
    assert_eq!(resource.network_io.bytes_rx, deserialized.network_io.bytes_rx);
}

/// Test network configuration contracts
#[test]
fn test_network_configuration_contracts() {
    let network = VMNetwork {
        mode: NetworkMode::Bridged,
        ip_address: Some("192.168.1.100".to_string()),
        mac_address: Some("00:11:22:33:44:55".to_string()),
        port_forwards: vec![
            PortForward {
                local_port: 8080,
                remote_port: 80,
                protocol: PortProtocol::TCP,
                guest_ip: None,
                host_ip: None,
                description: Some("HTTP forwarding".to_string()),
            },
            PortForward {
                local_port: 2222,
                remote_port: 22,
                protocol: PortProtocol::TCP,
                guest_ip: None,
                host_ip: None,
                description: Some("SSH forwarding".to_string()),
            },
        ],
        dns_servers: vec!["8.8.8.8".to_string(), "8.8.4.4".to_string()],
        interfaces: vec![],
    };

    // Test serialization
    let json_str = serde_json::to_string(&network).expect("Network should serialize");
    let deserialized: VMNetwork = serde_json::from_str(&json_str)
        .expect("Network should deserialize");

    assert_eq!(network.mode, deserialized.mode);
    assert_eq!(network.port_forwards.len(), deserialized.port_forwards.len());
    assert_eq!(network.dns_servers, deserialized.dns_servers);

    // Test port forwarding validation
    for forward in &network.port_forwards {
        assert!(forward.local_port > 0, "Local port should be positive");
        assert!(forward.remote_port > 0, "Remote port should be positive");
    }
}

/// Test configuration data model contracts
#[test]
fn test_app_configuration_contracts() {
    let mut config = AppConfig::default();

    // Test default values
    assert_eq!(config.general.app_name, "Lima VM Manager");
    assert!(config.general.check_for_updates);

    // Test configuration updates
    config.general.app_name = "Custom VM Manager".to_string();
    config.general.check_for_updates = false;

    assert_eq!(config.general.app_name, "Custom VM Manager");
    assert!(!config.general.check_for_updates);

    // Test VM configuration
    config.vm.default_memory_mb = 8192;
    config.vm.default_cpu_count = 4;
    config.vm.auto_start_vms = vec!["test-vm".to_string()];

    assert_eq!(config.vm.default_memory_mb, 8192);
    assert_eq!(config.vm.default_cpu_count, 4);
    assert_eq!(config.vm.auto_start_vms.len(), 1);

    // Test serialization
    let json_str = serde_json::to_string(&config).expect("Config should serialize");
    let deserialized: AppConfig = serde_json::from_str(&json_str)
        .expect("Config should deserialize");

    assert_eq!(config.general.app_name, deserialized.general.app_name);
    assert_eq!(config.vm.default_memory_mb, deserialized.vm.default_memory_mb);
}

/// Test shared directory configuration contracts
#[test]
fn test_shared_directory_contracts() {
    let shared_dir = SharedDirectory {
        name: "projects".to_string(),
        host_path: "/Users/test/projects".into(),
        mount_point: "/home/user/projects".into(),
        read_only: false,
        tag: Some("development".to_string()),
    };

    // Test serialization
    let json_str = serde_json::to_string(&shared_dir).expect("Shared dir should serialize");
    let deserialized: SharedDirectory = serde_json::from_str(&json_str)
        .expect("Shared dir should deserialize");

    assert_eq!(shared_dir.name, deserialized.name);
    assert_eq!(shared_dir.host_path, deserialized.host_path);
    assert_eq!(shared_dir.mount_point, deserialized.mount_point);
    assert_eq!(shared_dir.read_only, deserialized.read_only);

    // Test validation
    assert!(!shared_dir.name.is_empty(), "Name should not be empty");
    assert!(!shared_dir.host_path.as_os_str().is_empty(), "Host path should not be empty");
    assert!(!shared_dir.mount_point.as_os_str().is_empty(), "Mount point should not be empty");
}

/// Test VM operation result contracts
#[test]
fn test_vm_operation_result_contracts() {
    let success_result = VMOperationResult {
        success: true,
        message: "VM started successfully".to_string(),
        duration_ms: 1500,
        data: Some(serde_yaml::Value::String("Additional data".to_string())),
        error: None,
    };

    let error_result = VMOperationResult {
        success: false,
        message: "VM failed to start".to_string(),
        duration_ms: 500,
        data: None,
        error: Some(OperationError {
            code: "START_FAILED".to_string(),
            message: "Failed to start VM".to_string(),
            details: Some("VM configuration error".to_string()),
            stack_trace: None,
        }),
    };

    // Test serialization
    let success_json = serde_json::to_string(&success_result).expect("Success result should serialize");
    let deserialized_success: VMOperationResult = serde_json::from_str(&success_json)
        .expect("Success result should deserialize");

    assert!(deserialized_success.success);
    assert!(deserialized_success.error.is_none());

    let error_json = serde_json::to_string(&error_result).expect("Error result should serialize");
    let deserialized_error: VMOperationResult = serde_json::from_str(&error_json)
        .expect("Error result should deserialize");

    assert!(!deserialized_error.success);
    assert!(deserialized_error.error.is_some());

    // Test duration constraints
    assert!(success_result.duration_ms > 0, "Duration should be positive");
    assert!(error_result.duration_ms > 0, "Duration should be positive");
}

/// Test VM filtering contracts
#[test]
fn test_vm_filtering_contracts() {
    let filter = VMFilter {
        status: Some(VMStatus::Running),
        name_pattern: Some("test-.*".to_string()),
        tags: Some(vec!["development".to_string(), "testing".to_string()]),
        arch: Some(VMArchitecture::X86_64),
        os: Some(VMOperatingSystem::Linux),
    };

    // Test serialization
    let json_str = serde_json::to_string(&filter).expect("Filter should serialize");
    let deserialized: VMFilter = serde_json::from_str(&json_str)
        .expect("Filter should deserialize");

    assert_eq!(filter.status, deserialized.status);
    assert_eq!(filter.name_pattern, deserialized.name_pattern);
    assert_eq!(filter.arch, deserialized.arch);
    assert_eq!(filter.os, deserialized.os);

    // Test regex pattern validation (if provided)
    if let Some(pattern) = &filter.name_pattern {
        let _ = regex::Regex::new(pattern).expect("Name pattern should be valid regex");
    }
}

/// Test pagination contracts
#[test]
fn test_pagination_contracts() {
    let pagination = PaginationInfo {
        page: 2,
        per_page: 25,
        total: 100,
        total_pages: 4,
    };

    // Test serialization
    let json_str = serde_json::to_string(&pagination).expect("Pagination should serialize");
    let deserialized: PaginationInfo = serde_json::from_str(&json_str)
        .expect("Pagination should deserialize");

    assert_eq!(pagination.page, deserialized.page);
    assert_eq!(pagination.per_page, deserialized.per_page);
    assert_eq!(pagination.total, deserialized.total);
    assert_eq!(pagination.total_pages, deserialized.total_pages);

    // Test pagination constraints
    assert!(pagination.page > 0, "Page should be positive");
    assert!(pagination.per_page > 0, "Per page should be positive");
    assert!(pagination.total >= 0, "Total should be non-negative");
    assert_eq!(pagination.total_pages, (pagination.total + pagination.per_page - 1) / pagination.per_page);
}

/// Helper function to validate VM configuration
fn validate_vm_configuration(config: &VMConfiguration) -> ValidationResult {
    let mut errors = Vec::new();
    let mut warnings = Vec::new();

    // Validate template
    if config.template.is_empty() {
        errors.push("Template name cannot be empty".to_string());
    }

    // Validate architecture
    if matches!(config.arch, VMArchitecture::Unknown) {
        errors.push("Architecture cannot be unknown".to_string());
    }

    // Validate OS
    if matches!(config.os, VMOperatingSystem::Other(_)) {
        errors.push("Unsupported operating system".to_string());
    }

    // Validate version
    if config.version.is_empty() {
        warnings.push("Version is not specified".to_string());
    }

    ValidationResult {
        is_valid: errors.is_empty(),
        errors,
        warnings,
    }
}

/// Validation result structure
struct ValidationResult {
    is_valid: bool,
    errors: Vec<String>,
    warnings: Vec<String>,
}

/// Test data model migration contracts
#[test]
fn test_data_model_migration_contracts() {
    // Test that current data models can handle missing fields gracefully
    let minimal_json = r#"{
        "id": "test-vm",
        "name": "Test VM",
        "status": "Running"
    }"#;

    let result: Result<VirtualMachine, _> = serde_json::from_str(minimal_json);
    assert!(result.is_ok(), "Should handle missing optional fields gracefully");

    // Test that extra fields are ignored
    let extra_fields_json = r#"{
        "id": "test-vm",
        "name": "Test VM",
        "status": "Running",
        "extra_field": "should be ignored",
        "another_extra": {
            "nested": "value"
        }
    }"#;

    let result: Result<VirtualMachine, _> = serde_json::from_str(extra_fields_json);
    assert!(result.is_ok(), "Should ignore extra fields gracefully");
}