pub mod cli_detection;
pub mod config;
pub mod events;
pub mod logging;
pub mod state;
pub mod vm_config;
pub mod vm_management;
pub mod vm_monitoring;

pub use cli_detection::{CLIDetectionService, detect_cli_tools, get_cli_tool_status, refresh_cli_tools};
pub use config::{
    ConfigService, ConfigError, ConfigInfo,
    get_app_config, update_app_config, reset_config_to_defaults,
    export_config, import_config, get_config_info
};
pub use logging::{
    LoggingService, LogEntry, LogLevel, LoggingConfig, LogFormat, LogStats,
    init_global_logger, get_global_logger,
    get_log_stats, get_recent_logs, update_logging_config, get_logging_config,
    clear_log_buffer, rotate_logs
};
pub use events::{
    EventService, EventSubscriptionInfo,
    publish_event, subscribe_to_events, unsubscribe_from_events, get_event_stats,
    get_dead_letter_events, retry_dead_letter_events, clear_dead_letter_queue, query_events
};
pub use state::{
    StateService,
    state_get, state_set, state_delete, state_exists, state_keys, state_clear,
    state_get_stats, state_create_snapshot, state_get_snapshots, state_save,
    state_load, state_create_backup, state_restore_from_backup
};
pub use vm_config::{
    VMConfigService, VMConfigError, VMConfigTemplate, VMConfigValidationResult,
    VMConfigHistory, VMConfigBackup,
    validate_vm_config, get_vm_templates, get_vm_template, create_vm_config_from_template,
    save_vm_config, load_vm_config, get_vm_config_history, create_vm_config_backup,
    get_vm_config_backups, restore_vm_config_from_backup, get_vm_config_stats,
    delete_vm_config, clone_vm_config, export_vm_config, import_vm_config
};
pub use vm_management::{
    VMManagementService, VMError,
    list_vms, get_vm_details, start_vm, stop_vm, restart_vm, delete_vm, create_vm,
    get_vm_status, get_limactl_version, get_available_templates, get_system_info
};
pub use vm_monitoring::{
    VMMonitoringService, VMMonitoringConfig, VMStatusEvent, VMEventType,
    VMHealthCheck, VMMonitoringStats,
    get_monitoring_stats, get_vm_resource_data, get_vm_health_data,
    start_vm_monitoring, stop_vm_monitoring
};