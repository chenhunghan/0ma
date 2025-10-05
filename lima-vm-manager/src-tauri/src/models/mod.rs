pub mod cli_tools;
pub mod config;
pub mod error;
pub mod events;
pub mod state;
pub mod vm;

pub use cli_tools::{CLITool, CLIToolStatus};
pub use config::{
    AppConfig, GeneralConfig, VMConfig, UIConfig, NetworkConfig, VMInstance,
    SharedDirectory, VMState, AppTheme, LogLevel, NetworkMode
};
pub use error::{
    AppError, AppResult, ErrorContext, ErrorCategory, ErrorSeverity, ContextualError,
    ErrorMetrics, RecoveryStrategy
};
pub use events::{
    Event, EventCategory, EventPriority, EventFilter, EventSubscription,
    EventStats, EventConfig, EventBatch, DeadLetterEvent, EventAcknowledgement,
    AckStatus, EventTimeRange
};
pub use state::{
    StateKey, StateValue, StateChangeEvent, StateSnapshot, StateMetadata,
    StateConfig, StateStats, StateSubscription, StateEventFilter, BatchOperation,
    StateOperation, StateQuery, StateQueryOrder, StateMigration, StateBackup,
    StateTTL, StateExpireAction, StateAccess, StateChangeRecord, StatePersistence
};
pub use vm::{
    VirtualMachine, VMStatus, VMConfiguration, VMResources, VMNetwork, VMStorage,
    VMRuntime, VMMetadata, VMArchitecture, VMOperatingSystem, NetworkMode as VMNetworkMode,
    PortForward, PortProtocol, NetworkInterface, InterfaceType, InterfaceStatus,
    DiskImage, MountPoint, HostProcess, DaemonStatus, SSHConnection, VMRuntimeMetrics,
    HealthStatus, NetworkIO, VMOperationRequest, VMOperation, VMOperationResult,
    OperationError, VMListResponse, VMFilter, PaginationInfo
};