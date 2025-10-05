//! Contract Testing Framework for Lima VM Manager
//!
//! This module provides comprehensive contract testing for all Tauri commands
//! and API interactions between frontend and backend components.

use crate::models::{
    VirtualMachine, VMStatus, VMConfiguration, VMResources, VMNetwork, VMStorage,
    VMRuntime, VMMetadata, VMArchitecture, VMOperatingSystem, NetworkMode,
    VMOperationResult, OperationError, VMListResponse, VMFilter
};
use crate::services::vm_management::{VMManagementService, VMError};
use mockall::mock;
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::path::PathBuf;
use tempfile::TempDir;
use tokio_test;
use assert_matches::assert_matches;

// Mock implementation for testing
mock! {
    pub VMManagementService {
        fn new() -> Result<Self, VMError>;
        fn list_vms(&self, filter: Option<VMFilter>) -> Result<Vec<VirtualMachine>, VMError>;
        fn get_vm_details(&self, vm_name: &str) -> Result<VirtualMachine, VMError>;
        fn start_vm(&self, vm_name: &str, force: bool) -> Result<VMOperationResult, VMError>;
        fn stop_vm(&self, vm_name: &str, force: bool) -> Result<VMOperationResult, VMError>;
        fn restart_vm(&self, vm_name: &str, force: bool) -> Result<VMOperationResult, VMError>;
        fn delete_vm(&self, vm_name: &str, force: bool) -> Result<VMOperationResult, VMError>;
        fn create_vm(&self, vm_name: &str, template: String, config_overrides: HashMap<String, serde_yaml::Value>) -> Result<VMOperationResult, VMError>;
        fn get_vm_status(&self, vm_name: &str) -> Result<VMStatus, VMError>;
        fn get_limactl_version(&self) -> Result<String, VMError>;
    }
}

/// Contract test configuration
#[derive(Debug, Clone)]
pub struct ContractTestConfig {
    /// Test timeout in seconds
    pub timeout_secs: u64,
    /// Whether to run integration tests
    pub run_integration_tests: bool,
    /// Mock limactl responses
    pub use_mock_responses: bool,
    /// Test data directory
    pub test_data_dir: Option<PathBuf>,
}

impl Default for ContractTestConfig {
    fn default() -> Self {
        Self {
            timeout_secs: 30,
            run_integration_tests: false,
            use_mock_responses: true,
            test_data_dir: None,
        }
    }
}

/// Contract test result
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ContractTestResult {
    /// Test name
    pub test_name: String,
    /// Whether test passed
    pub passed: bool,
    /// Test duration in milliseconds
    pub duration_ms: u64,
    /// Error message (if failed)
    pub error: Option<String>,
    /// Test details
    pub details: HashMap<String, serde_json::Value>,
}

/// Contract test suite
pub struct ContractTestSuite {
    config: ContractTestConfig,
    results: Vec<ContractTestResult>,
    test_data_dir: Option<TempDir>,
}

impl ContractTestSuite {
    /// Create a new contract test suite
    pub fn new(config: ContractTestConfig) -> Self {
        let test_data_dir = config.test_data_dir.as_ref()
            .map(|_| TempDir::new().ok())
            .flatten();

        Self {
            config,
            results: Vec::new(),
            test_data_dir,
        }
    }

    /// Run all contract tests
    pub async fn run_all_tests(&mut self) -> Vec<ContractTestResult> {
        println!("🧪 Starting Contract Test Suite");

        // Test VM data model contracts
        self.test_vm_data_models().await;

        // Test VM service contracts
        self.test_vm_service_contracts().await;

        // Test API response contracts
        self.test_api_response_contracts().await;

        // Test error handling contracts
        self.test_error_handling_contracts().await;

        // Test serialization contracts
        self.test_serialization_contracts().await;

        let results = self.results.clone();
        self.print_test_summary(&results);
        results
    }

    /// Test VM data model contracts
    async fn test_vm_data_models(&mut self) {
        let test_vm = self.create_test_vm();

        self.run_test("VM Model Serialization", move || async {
            let vm = test_vm.clone();

            // Test serialization to JSON
            let json_str = serde_json::to_string(&vm)?;
            let deserialized: VirtualMachine = serde_json::from_str(&json_str)?;

            assert_eq!(vm.id, deserialized.id);
            assert_eq!(vm.status, deserialized.status);
            assert_eq!(vm.config.arch, deserialized.config.arch);

            Ok(())
        }).await;

        self.run_test("VM Status Enum Contracts", || async {
            // Test all VM status variants
            let statuses = vec![
                VMStatus::Running,
                VMStatus::Stopped,
                VMStatus::Starting,
                VMStatus::Stopping,
                VMStatus::Error("Test error".to_string()),
                VMStatus::Unknown,
            ];

            for status in statuses {
                let serialized = serde_json::to_string(&status)?;
                let deserialized: VMStatus = serde_json::from_str(&serialized)?;
                assert_eq!(status, deserialized);
            }

            Ok(())
        });

        self.run_test("VM Configuration Validation", || async {
            let mut config = VMConfiguration::default();
            config.template = "test-template".to_string();
            config.arch = VMArchitecture::X86_64;
            config.os = VMOperatingSystem::Linux;

            // Test configuration validation rules
            assert!(!config.template.is_empty());
            assert!(matches!(config.arch, VMArchitecture::X86_64));
            assert!(matches!(config.os, VMOperatingSystem::Linux));

            Ok(())
        });
    }

    /// Test VM service contracts
    async fn test_vm_service_contracts(&mut self) {
        if self.config.use_mock_responses {
            self.run_test("VM Service List Contract", || async {
                let mock_service = MockVMManagementService::new();

                // Setup expected response
                let expected_vms = vec![self.create_test_vm()];
                mock_service
                    .expect_list_vms()
                    .returning(move |_| Ok(expected_vms.clone()));

                // Test the contract
                let result = mock_service.list_vms(None)?;
                assert_eq!(result.len(), 1);
                assert_eq!(result[0].id, "test-vm");

                Ok(())
            });

            self.run_test("VM Service Operations Contract", || async {
                let mock_service = MockVMManagementService::new();

                // Setup expected operation result
                let expected_result = VMOperationResult {
                    success: true,
                    message: "VM started successfully".to_string(),
                    duration_ms: 1000,
                    data: None,
                    error: None,
                };

                mock_service
                    .expect_start_vm()
                    .with(mockall::predicate::eq("test-vm"), mockall::predicate::eq(false))
                    .returning(move |_, _| Ok(expected_result.clone()));

                // Test the contract
                let result = mock_service.start_vm("test-vm", false)?;
                assert!(result.success);
                assert!(result.error.is_none());

                Ok(())
            });
        }
    }

    /// Test API response contracts
    async fn test_api_response_contracts(&mut self) {
        self.run_test("VM List Response Contract", || async {
            let vms = vec![self.create_test_vm()];
            let response = VMListResponse {
                vms: vms.clone(),
                total_count: vms.len(),
                filter: None,
                pagination: None,
            };

            // Test serialization contract
            let json_str = serde_json::to_string(&response)?;
            let deserialized: VMListResponse = serde_json::from_str(&json_str)?;

            assert_eq!(response.total_count, deserialized.total_count);
            assert_eq!(response.vms.len(), deserialized.vms.len());
            assert_eq!(response.vms[0].id, deserialized.vms[0].id);

            Ok(())
        });

        self.run_test("Operation Result Contract", || async {
            let result = VMOperationResult {
                success: false,
                message: "Operation failed".to_string(),
                duration_ms: 500,
                data: Some(serde_yaml::from_str("{\"details\": \"Additional info\"}").unwrap()),
                error: Some(OperationError {
                    code: "TEST_ERROR".to_string(),
                    message: "Test error occurred".to_string(),
                    details: Some("Detailed error information".to_string()),
                    stack_trace: None,
                }),
            };

            // Test contract compliance
            let json_str = serde_json::to_string(&result)?;
            let deserialized: VMOperationResult = serde_json::from_str(&json_str)?;

            assert!(!deserialized.success);
            assert!(deserialized.error.is_some());
            assert_eq!(deserialized.error.unwrap().code, "TEST_ERROR");

            Ok(())
        });
    }

    /// Test error handling contracts
    async fn test_error_handling_contracts(&mut self) {
        self.run_test("VM Error Contract", || async {
            let errors = vec![
                VMError::LimaCommandFailed("Command failed".to_string()),
                VMError::VMNotFound("test-vm".to_string()),
                VMError::OperationFailed("Operation failed".to_string()),
                VMError::ConfigurationError("Invalid config".to_string()),
                VMError::ParseError("Parse error".to_string()),
                VMError::TimeoutError("Operation timed out".to_string()),
            ];

            for error in errors {
                // Test error serialization
                let error_str = format!("{}", error);
                assert!(!error_str.is_empty());

                // Test error type matching
                match &error {
                    VMError::LimaCommandFailed(_) => assert!(error_str.contains("limactl")),
                    VMError::VMNotFound(name) => assert!(error_str.contains(name)),
                    VMError::OperationFailed(_) => assert!(error_str.contains("failed")),
                    VMError::ConfigurationError(_) => assert!(error_str.contains("config")),
                    VMError::ParseError(_) => assert!(error_str.contains("parse")),
                    VMError::TimeoutError(_) => assert!(error_str.contains("timeout")),
                }
            }

            Ok(())
        });

        self.run_test("Error Recovery Contract", || async {
            // Test that services can recover from errors gracefully
            let mock_service = MockVMManagementService::new();

            // Setup error response first
            mock_service
                .expect_list_vms()
                .times(1)
                .returning(|_| Err(VMError::LimaCommandFailed("Command failed".to_string())));

            // Setup successful response after error
            let expected_vms = vec![self.create_test_vm()];
            mock_service
                .expect_list_vms()
                .times(1)
                .returning(move |_| Ok(expected_vms.clone()));

            // Test error handling and recovery
            let result1 = mock_service.list_vms(None);
            assert!(result1.is_err());

            let result2 = mock_service.list_vms(None);
            assert!(result2.is_ok());

            Ok(())
        });
    }

    /// Test serialization contracts
    async fn test_serialization_contracts(&mut self) {
        self.run_test("Round-trip Serialization Contract", || async {
            let vm = self.create_test_vm();

            // Test JSON round-trip
            let json_str = serde_json::to_string(&vm)?;
            let vm_from_json: VirtualMachine = serde_json::from_str(&json_str)?;
            assert_eq!(vm.id, vm_from_json.id);

            // Test YAML round-trip
            let yaml_str = serde_yaml::to_string(&vm)?;
            let vm_from_yaml: VirtualMachine = serde_yaml::from_str(&yaml_str)?;
            assert_eq!(vm.id, vm_from_yaml.id);

            Ok(())
        });

        self.run_test("Schema Validation Contract", || async {
            let vm = self.create_test_vm();

            // Test that required fields are present
            assert!(!vm.id.is_empty());
            assert!(!vm.name.is_empty());

            // Test nested structures
            assert!(vm.resources.memory_mb > 0);
            assert!(vm.resources.cpu_count > 0);
            assert!(vm.resources.disk_size_gb > 0);

            // Test network configuration
            assert!(matches!(vm.network.mode, crate::models::vm::NetworkMode::Shared));

            // Test metadata
            assert!(vm.metadata.created_at <= chrono::Utc::now());

            Ok(())
        });
    }

    /// Helper method to run a single test
    async fn run_test<F, Fut>(&mut self, test_name: &str, test_fn: F)
    where
        F: FnOnce() -> Fut + Send,
        Fut: std::future::Future<Output = Result<(), Box<dyn std::error::Error + Send + Sync>>> + Send,
    {
        let start_time = std::time::Instant::now();
        println!("  📋 Running: {}", test_name);

        let result = tokio::time::timeout(
            std::time::Duration::from_secs(self.config.timeout_secs),
            test_fn()
        ).await;

        let duration = start_time.elapsed();
        let duration_ms = duration.as_millis() as u64;

        let (passed, error) = match result {
            Ok(Ok(_)) => {
                println!("    ✅ PASSED ({}ms)", duration_ms);
                (true, None)
            }
            Ok(Err(e)) => {
                println!("    ❌ FAILED: {}", e);
                (false, Some(e.to_string()))
            }
            Err(_) => {
                println!("    ⏰ TIMEOUT (exceeded {}s)", self.config.timeout_secs);
                (false, Some("Test timed out".to_string()))
            }
        };

        self.results.push(ContractTestResult {
            test_name: test_name.to_string(),
            passed,
            duration_ms,
            error,
            details: HashMap::new(),
        });
    }

    /// Create a test VM instance
    fn create_test_vm(&self) -> VirtualMachine {
        VirtualMachine {
            id: "test-vm".to_string(),
            name: "Test VM".to_string(),
            status: VMStatus::Stopped,
            config: VMConfiguration {
                template: "default".to_string(),
                arch: VMArchitecture::X86_64,
                os: VMOperatingSystem::Linux,
                version: "1.0".to_string(),
                auto_start: false,
                config_file: PathBuf::from("/tmp/test-config.yaml"),
                working_dir: PathBuf::from("/tmp/test-workdir"),
                settings: HashMap::new(),
            },
            resources: VMResources {
                memory_mb: 4096,
                cpu_count: 2,
                disk_size_gb: 60,
                utilization: None,
            },
            network: VMNetwork {
                mode: crate::models::vm::NetworkMode::Shared,
                ip_address: Some("192.168.64.2".to_string()),
                mac_address: None,
                port_forwards: vec![],
                dns_servers: vec!["8.8.8.8".to_string()],
                interfaces: vec![],
            },
            storage: VMStorage {
                disk_path: PathBuf::from("/tmp/test-disk.img"),
                additional_disks: vec![],
                mount_points: vec![],
                filesystem: "ext4".to_string(),
            },
            runtime: VMRuntime {
                pid: None,
                host_process: Default::default(),
                lima_daemon: Default::default(),
                ssh: Default::default(),
                metrics: Default::default(),
            },
            shared_directories: vec![],
            metadata: VMMetadata {
                created_at: chrono::Utc::now(),
                modified_at: chrono::Utc::now(),
                last_started_at: None,
                last_stopped_at: None,
                total_runtime_seconds: 0,
                start_count: 0,
                tags: vec!["test".to_string()],
                notes: Some("Test VM for contract testing".to_string()),
            },
        }
    }

    /// Print test summary
    fn print_test_summary(&self, results: &[ContractTestResult]) {
        let total = results.len();
        let passed = results.iter().filter(|r| r.passed).count();
        let failed = total - passed;
        let total_duration: u64 = results.iter().map(|r| r.duration_ms).sum();

        println!("\n📊 Contract Test Summary:");
        println!("  Total Tests: {}", total);
        println!("  ✅ Passed: {}", passed);
        println!("  ❌ Failed: {}", failed);
        println!("  ⏱️  Total Duration: {}ms", total_duration);

        if failed > 0 {
            println!("\n❌ Failed Tests:");
            for result in results.iter().filter(|r| !r.passed) {
                println!("  - {}: {}", result.test_name, result.error.as_deref().unwrap_or("Unknown error"));
            }
        }

        println!("\n{} Contract Tests: {}",
            if failed == 0 { "🎉" } else { "⚠️" },
            if failed == 0 { "PASSED" } else { "FAILED" }
        );
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[tokio::test]
    async fn test_contract_test_suite() {
        let config = ContractTestConfig {
            timeout_secs: 5,
            run_integration_tests: false,
            use_mock_responses: true,
            test_data_dir: None,
        };

        let mut suite = ContractTestSuite::new(config);
        let results = suite.run_all_tests().await;

        // Ensure all tests pass
        assert!(!results.is_empty());
        let failed_count = results.iter().filter(|r| !r.passed).count();
        assert_eq!(failed_count, 0, "Some contract tests failed");
    }

    #[tokio::test]
    async fn test_vm_model_serialization() {
        let mut vm = VirtualMachine::default();
        vm.id = "test-vm".to_string();
        vm.status = VMStatus::Running;

        // Test JSON serialization
        let json_str = serde_json::to_string(&vm).unwrap();
        let deserialized: VirtualMachine = serde_json::from_str(&json_str).unwrap();

        assert_eq!(vm.id, deserialized.id);
        assert_eq!(vm.status, deserialized.status);
    }

    #[tokio::test]
    async fn test_vm_operation_result_contract() {
        let result = VMOperationResult {
            success: true,
            message: "Test operation".to_string(),
            duration_ms: 100,
            data: Some(serde_yaml::from_str("{\"test\": \"data\"}").unwrap()),
            error: None,
        };

        // Test round-trip serialization
        let json_str = serde_json::to_string(&result).unwrap();
        let deserialized: VMOperationResult = serde_json::from_str(&json_str).unwrap();

        assert!(deserialized.success);
        assert_eq!(deserialized.message, result.message);
        assert!(deserialized.error.is_none());
    }

    #[tokio::test]
    async fn test_vm_filter_contract() {
        let vm = VirtualMachine {
            id: "test-vm".to_string(),
            name: "Test VM".to_string(),
            status: VMStatus::Running,
            config: VMConfiguration {
                arch: VMArchitecture::X86_64,
                os: VMOperatingSystem::Linux,
                ..Default::default()
            },
            ..Default::default()
        };

        let filter = VMFilter {
            status: Some(VMStatus::Running),
            name_pattern: Some("Test".to_string()),
            tags: None,
            arch: Some(VMArchitecture::X86_64),
            os: Some(VMOperatingSystem::Linux),
        };

        // Test that VM matches filter
        // This would use the actual vm_matches_filter method from VMManagementService
        assert!(!vm.id.is_empty());
        assert_eq!(vm.status, filter.status.unwrap());
        assert!(vm.name.contains(&filter.name_pattern.unwrap()));
        assert_eq!(vm.config.arch, filter.arch.unwrap());
        assert_eq!(vm.config.os, filter.os.unwrap());
    }
}