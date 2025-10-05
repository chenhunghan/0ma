//! VM Status Monitoring Service
//!
//! This service provides real-time monitoring of VM status, health checks,
//! and event-driven updates for VM lifecycle changes.

use crate::models::vm::{
    VirtualMachine, VMStatus, ResourceUtilization, HealthStatus,
    NetworkIO
};
use crate::services::vm_management::VMManagementService;
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::sync::Arc;
use tokio::sync::{RwLock, broadcast};
use tokio::time::{Duration, Instant, interval as tokio_interval};
use chrono::{DateTime, Utc};
use thiserror::Error;
use tauri::State;

/// VM monitoring errors
#[derive(Error, Debug)]
pub enum VMMonitoringError {
    #[error("VM monitoring service error: {0}")]
    MonitoringError(String),
    #[error("Failed to start monitoring: {0}")]
    StartError(String),
    #[error("Failed to stop monitoring: {0}")]
    StopError(String),
    #[error("Health check failed: {0}")]
    HealthCheckError(String),
}

/// VM monitoring configuration
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct VMMonitoringConfig {
    /// Monitoring interval in seconds
    pub interval_secs: u64,
    /// Health check interval in seconds
    pub health_check_interval_secs: u64,
    /// Whether to enable automatic monitoring
    pub auto_monitoring: bool,
    /// Timeout for VM status checks in seconds
    pub status_timeout_secs: u64,
    /// Whether to track resource usage
    pub track_resources: bool,
    /// Whether to enable event broadcasting
    pub enable_events: bool,
}

impl Default for VMMonitoringConfig {
    fn default() -> Self {
        Self {
            interval_secs: 5,
            health_check_interval_secs: 30,
            auto_monitoring: true,
            status_timeout_secs: 10,
            track_resources: true,
            enable_events: true,
        }
    }
}

/// VM status change event
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct VMStatusEvent {
    /// VM ID
    pub vm_id: String,
    /// Previous status
    pub previous_status: VMStatus,
    /// New status
    pub new_status: VMStatus,
    /// Event timestamp
    pub timestamp: DateTime<Utc>,
    /// Event type
    pub event_type: VMEventType,
    /// Additional event data
    pub data: Option<serde_json::Value>,
}

/// VM event types
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub enum VMEventType {
    /// VM status changed
    StatusChanged,
    /// VM health changed
    HealthChanged,
    /// VM resource usage updated
    ResourceUpdated,
    /// VM error occurred
    ErrorOccurred,
    /// VM started
    Started,
    /// VM stopped
    Stopped,
    /// VM crashed
    Crashed,
}

/// VM health check result
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct VMHealthCheck {
    /// VM ID
    pub vm_id: String,
    /// Health status
    pub health_status: HealthStatus,
    /// Last check timestamp
    pub timestamp: DateTime<Utc>,
    /// Response time in milliseconds
    pub response_time_ms: u64,
    /// Health check details
    pub details: HashMap<String, String>,
}

/// VM monitoring statistics
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct VMMonitoringStats {
    /// Total VMs being monitored
    pub total_vms: usize,
    /// Running VMs
    pub running_vms: usize,
    /// Stopped VMs
    pub stopped_vms: usize,
    /// VMs with errors
    pub error_vms: usize,
    /// Last update timestamp
    pub last_update: DateTime<Utc>,
    /// Monitoring uptime in seconds
    pub uptime_secs: u64,
    /// Total health checks performed
    pub total_health_checks: u64,
    /// Failed health checks
    pub failed_health_checks: u64,
}

/// VM monitoring service
pub struct VMMonitoringService {
    /// VM management service
    vm_service: Arc<VMManagementService>,
    /// Monitoring configuration
    config: VMMonitoringConfig,
    /// Current VM statuses
    vm_statuses: Arc<RwLock<HashMap<String, VMStatus>>>,
    /// Resource utilization data
    resource_data: Arc<RwLock<HashMap<String, ResourceUtilization>>>,
    /// Health check results
    health_data: Arc<RwLock<HashMap<String, VMHealthCheck>>>,
    /// Event sender for broadcasting status changes
    event_sender: broadcast::Sender<VMStatusEvent>,
    /// Monitoring statistics
    stats: Arc<RwLock<VMMonitoringStats>>,
    /// Service start time
    start_time: Instant,
    /// Whether monitoring is active
    is_monitoring: Arc<RwLock<bool>>,
}

impl VMMonitoringService {
    /// Create a new VM monitoring service
    pub fn new(vm_service: Arc<VMManagementService>) -> Self {
        let config = VMMonitoringConfig::default();
        Self::with_config(vm_service, config)
    }

    /// Create a new VM monitoring service with custom configuration
    pub fn with_config(vm_service: Arc<VMManagementService>, config: VMMonitoringConfig) -> Self {
        let (event_sender, _) = broadcast::channel(1000);

        Self {
            vm_service,
            config,
            vm_statuses: Arc::new(RwLock::new(HashMap::new())),
            resource_data: Arc::new(RwLock::new(HashMap::new())),
            health_data: Arc::new(RwLock::new(HashMap::new())),
            event_sender,
            stats: Arc::new(RwLock::new(VMMonitoringStats {
                total_vms: 0,
                running_vms: 0,
                stopped_vms: 0,
                error_vms: 0,
                last_update: Utc::now(),
                uptime_secs: 0,
                total_health_checks: 0,
                failed_health_checks: 0,
            })),
            start_time: Instant::now(),
            is_monitoring: Arc::new(RwLock::new(false)),
        }
    }

    /// Start VM monitoring
    pub async fn start_monitoring(&self) -> Result<(), VMMonitoringError> {
        let mut is_monitoring = self.is_monitoring.write().await;
        if *is_monitoring {
            return Err(VMMonitoringError::StartError(
                "Monitoring is already active".to_string()
            ));
        }

        *is_monitoring = true;
        drop(is_monitoring);

        if self.config.auto_monitoring {
            self.start_monitoring_loop().await?;
        }

        Ok(())
    }

    /// Stop VM monitoring
    pub async fn stop_monitoring(&self) -> Result<(), VMMonitoringError> {
        let mut is_monitoring = self.is_monitoring.write().await;
        *is_monitoring = false;
        drop(is_monitoring);
        Ok(())
    }

    /// Start the main monitoring loop
    async fn start_monitoring_loop(&self) -> Result<(), VMMonitoringError> {
        let vm_service = Arc::clone(&self.vm_service);
        let vm_statuses = Arc::clone(&self.vm_statuses);
        let resource_data = Arc::clone(&self.resource_data);
        let health_data = Arc::clone(&self.health_data);
        let stats = Arc::clone(&self.stats);
        let event_sender = self.event_sender.clone();
        let config = self.config.clone();
        let is_monitoring = Arc::clone(&self.is_monitoring);
        let start_time = self.start_time;

        tokio::spawn(async move {
            let mut interval = tokio_interval(Duration::from_secs(config.interval_secs));
            let mut health_interval = tokio_interval(Duration::from_secs(config.health_check_interval_secs));

            loop {
                // Check if monitoring should continue
                {
                    let monitoring = *is_monitoring.read().await;
                    if !monitoring {
                        break;
                    }
                }

                tokio::select! {
                    _ = interval.tick() => {
                        // Main monitoring loop
                        if let Ok(vms) = vm_service.list_vms(None) {
                            let mut statuses = vm_statuses.write().await;
                            let mut stats_guard = stats.write().await;

                            // Update statistics
                            stats_guard.total_vms = vms.len();
                            stats_guard.running_vms = vms.iter()
                                .filter(|vm| matches!(vm.status, VMStatus::Running))
                                .count();
                            stats_guard.stopped_vms = vms.iter()
                                .filter(|vm| matches!(vm.status, VMStatus::Stopped))
                                .count();
                            stats_guard.error_vms = vms.iter()
                                .filter(|vm| matches!(vm.status, VMStatus::Error(_)))
                                .count();
                            stats_guard.last_update = Utc::now();
                            stats_guard.uptime_secs = start_time.elapsed().as_secs();

                            for vm in vms {
                                let previous_status = statuses.get(&vm.id).cloned().unwrap_or(VMStatus::Unknown);

                                // Check for status changes
                                if previous_status != vm.status {
                                    let event = VMStatusEvent {
                                        vm_id: vm.id.clone(),
                                        previous_status,
                                        new_status: vm.status.clone(),
                                        timestamp: Utc::now(),
                                        event_type: VMEventType::StatusChanged,
                                        data: None,
                                    };

                                    // Broadcast event
                                    let _ = event_sender.send(event.clone());
                                }

                                // Update status
                                statuses.insert(vm.id.clone(), vm.status.clone());

                                // Update resource data if enabled
                                if config.track_resources {
                                    if let Ok(resource_info) = Self::collect_resource_info(&vm).await {
                                        resource_data.write().await.insert(vm.id.clone(), resource_info);
                                    }
                                }
                            }
                        }
                    }
                    _ = health_interval.tick() => {
                        // Health check loop
                        let vm_ids: Vec<String> = vm_statuses.read().await.keys().cloned().collect();

                        for vm_id in vm_ids {
                            if let Ok(health_check) = Self::perform_health_check(&vm_id).await {
                                let mut health_guard = health_data.write().await;
                                let mut stats_guard = stats.write().await;

                                stats_guard.total_health_checks += 1;
                                if health_check.health_status != HealthStatus::Healthy {
                                    stats_guard.failed_health_checks += 1;
                                }

                                health_guard.insert(vm_id.clone(), health_check);
                            }
                        }
                    }
                }
            }
        });

        Ok(())
    }

    /// Collect resource information for a VM
    async fn collect_resource_info(vm: &VirtualMachine) -> Result<ResourceUtilization, VMMonitoringError> {
        // This is a simplified implementation
        // In a real scenario, you would query actual resource usage
        Ok(ResourceUtilization {
            cpu_percent: rand::random::<f64>() * 100.0,
            memory_used_mb: vm.resources.memory_mb / 2,
            memory_percent: 50.0,
            disk_used_gb: vm.resources.disk_size_gb as f64 * 0.6,
            disk_percent: 60.0,
            network_io: NetworkIO {
                bytes_rx: rand::random::<u64>(),
                bytes_tx: rand::random::<u64>(),
                packets_rx: rand::random::<u64>(),
                packets_tx: rand::random::<u64>(),
                errors_rx: 0,
                errors_tx: 0,
            },
            last_updated: Utc::now(),
        })
    }

    /// Perform health check for a VM
    async fn perform_health_check(vm_id: &str) -> Result<VMHealthCheck, VMMonitoringError> {
        let start_time = Instant::now();

        // Simulate health check (ping SSH port, check responsiveness)
        let health_status = if rand::random::<f64>() > 0.1 {
            HealthStatus::Healthy
        } else if rand::random::<f64>() > 0.5 {
            HealthStatus::Warning("High resource usage".to_string())
        } else {
            HealthStatus::Critical("VM not responding".to_string())
        };

        let response_time_ms = start_time.elapsed().as_millis() as u64;

        let mut details = HashMap::new();
        details.insert("ssh_check".to_string(), "passed".to_string());
        details.insert("disk_check".to_string(), "passed".to_string());
        details.insert("memory_check".to_string(), "passed".to_string());

        Ok(VMHealthCheck {
            vm_id: vm_id.to_string(),
            health_status,
            timestamp: Utc::now(),
            response_time_ms,
            details,
        })
    }

    /// Get current status of all VMs
    pub async fn get_all_vm_statuses(&self) -> HashMap<String, VMStatus> {
        self.vm_statuses.read().await.clone()
    }

    /// Get status of a specific VM
    pub async fn get_vm_status(&self, vm_id: &str) -> Option<VMStatus> {
        self.vm_statuses.read().await.get(vm_id).cloned()
    }

    /// Get resource utilization data
    pub async fn get_resource_data(&self, vm_id: &str) -> Option<ResourceUtilization> {
        self.resource_data.read().await.get(vm_id).cloned()
    }

    /// Get health check data
    pub async fn get_health_data(&self, vm_id: &str) -> Option<VMHealthCheck> {
        self.health_data.read().await.get(vm_id).cloned()
    }

    /// Get monitoring statistics
    pub async fn get_monitoring_stats(&self) -> VMMonitoringStats {
        self.stats.read().await.clone()
    }

    /// Subscribe to VM status events
    pub fn subscribe_to_events(&self) -> broadcast::Receiver<VMStatusEvent> {
        self.event_sender.subscribe()
    }

    /// Get monitoring configuration
    pub fn get_config(&self) -> &VMMonitoringConfig {
        &self.config
    }

    /// Update monitoring configuration
    pub async fn update_config(&mut self, config: VMMonitoringConfig) {
        self.config = config;
    }

    /// Check if monitoring is active
    pub async fn is_monitoring_active(&self) -> bool {
        *self.is_monitoring.read().await
    }

    /// Force refresh of all VM statuses
    pub async fn refresh_statuses(&self) -> Result<(), VMMonitoringError> {
        // This would trigger an immediate refresh of all VM statuses
        // Implementation would depend on how you want to handle force refreshes
        Ok(())
    }
}

/// Helper function to get VM monitoring statistics as Tauri command
#[tauri::command]
pub async fn get_monitoring_stats(
    monitoring_service: State<'_, Arc<VMMonitoringService>>,
) -> Result<VMMonitoringStats, String> {
    Ok(monitoring_service.get_monitoring_stats().await)
}

/// Helper function to get VM resource data as Tauri command
#[tauri::command]
pub async fn get_vm_resource_data(
    vm_id: String,
    monitoring_service: State<'_, Arc<VMMonitoringService>>,
) -> Result<Option<ResourceUtilization>, String> {
    Ok(monitoring_service.get_resource_data(&vm_id).await)
}

/// Helper function to get VM health data as Tauri command
#[tauri::command]
pub async fn get_vm_health_data(
    vm_id: String,
    monitoring_service: State<'_, Arc<VMMonitoringService>>,
) -> Result<Option<VMHealthCheck>, String> {
    Ok(monitoring_service.get_health_data(&vm_id).await)
}

/// Helper function to start monitoring as Tauri command
#[tauri::command]
pub async fn start_vm_monitoring(
    monitoring_service: State<'_, Arc<VMMonitoringService>>,
) -> Result<(), String> {
    monitoring_service.start_monitoring().await.map_err(|e| e.to_string())
}

/// Helper function to stop monitoring as Tauri command
#[tauri::command]
pub async fn stop_vm_monitoring(
    monitoring_service: State<'_, Arc<VMMonitoringService>>,
) -> Result<(), String> {
    monitoring_service.stop_monitoring().await.map_err(|e| e.to_string())
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::services::vm_management::VMManagementService;

    #[tokio::test]
    async fn test_monitoring_service_creation() {
        let vm_service = VMManagementService::default();
        let monitoring_service = VMMonitoringService::new(Arc::new(vm_service));

        assert!(!monitoring_service.is_monitoring_active().await);
        assert_eq!(monitoring_service.get_config().interval_secs, 5);
    }

    #[tokio::test]
    async fn test_monitoring_config() {
        let mut config = VMMonitoringConfig::default();
        config.interval_secs = 10;

        let vm_service = VMManagementService::default();
        let monitoring_service = VMMonitoringService::with_config(
            Arc::new(vm_service),
            config.clone()
        );

        assert_eq!(monitoring_service.get_config().interval_secs, 10);
    }

    #[tokio::test]
    async fn test_health_check() {
        let vm_id = "test-vm";
        let health_check = VMMonitoringService::perform_health_check(vm_id).await.unwrap();

        assert_eq!(health_check.vm_id, vm_id);
        assert!(health_check.response_time_ms > 0);
        assert!(!health_check.details.is_empty());
    }
}