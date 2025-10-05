# Data Model: Lima VM Manager Application

**Created**: 2025-10-05
**Purpose**: Entity definitions and relationships for the Lima VM Manager

## Core Entities

### VirtualMachine (VM)
Represents a Lima VM instance and its lifecycle state.

**Attributes:**
- `id: string` - Unique identifier for the VM instance
- `name: string` - Human-readable name (default: "lima-vm-manager")
- `status: VMStatus` - Current operational state
- `arch: Architecture` - CPU architecture (x86_64, arm64)
- `memoryMB: number` - Allocated memory in megabytes
- `cpus: number` - Number of CPU cores
- `diskSizeGB: number` - Disk size in gigabytes
- `sshLocalPort: number` - Local SSH port for VM access
- `directory: string` - File system path to VM configuration
- `createdAt: Date` - VM creation timestamp
- `lastStarted: Date | null` - Last start timestamp
- `lastStopped: Date | null` - Last stop timestamp

**Relationships:**
- One-to-many with `ConfigurationHistory`
- One-to-one with `KubernetesCluster`
- Many-to-many with `VMEvent` (status change events)

**State Transitions:**
- `Stopped` → `Starting` → `Running`
- `Running` → `Stopping` → `Stopped`
- `Running` → `Suspending` → `Suspended`
- `Suspended` → `Resuming` → `Running`
- Any state → `Error` → recoverable state

### VMStatus (Enum)
Enumeration of possible VM operational states.

**Values:**
- `Stopped` - VM is powered off
- `Starting` - VM is booting up
- `Running` - VM is operational
- `Stopping` - VM is shutting down
- `Suspending` - VM is being suspended
- `Suspended` - VM is suspended to disk
- `Resuming` - VM is resuming from suspension
- `Error` - VM encountered an error
- `Unknown` - Status could not be determined

### KubernetesCluster
Represents the Kubernetes cluster running inside the Lima VM.

**Attributes:**
- `vmId: string` - Reference to parent VM
- `version: string` - Kubernetes version (e.g., "1.28.0")
- `nodes: KubernetesNode[]` - Cluster nodes
- `podCount: number` - Total number of pods
- `serviceCount: number` - Total number of services
- `namespaceCount: number` - Total number of namespaces
- `endpoint: string` - Kubernetes API endpoint
- `kubeconfigPath: string` - Path to copied kubeconfig file

**Relationships:**
- One-to-one with `VirtualMachine`
- One-to-many with `KubernetesNode`
- One-to-many with `KubernetesPod`
- One-to-many with `KubernetesService`

### KubernetesNode
Represents a Kubernetes node in the cluster.

**Attributes:**
- `name: string` - Node name
- `clusterId: string` - Reference to parent cluster
- `status: NodeStatus` - Current node status
- `roles: string[]` - Node roles (master, worker)
- `version: string` - Kubernetes version
- `osImage: string` - Operating system image
- `kernelVersion: string` - Kernel version
- `containerRuntime: string` - Container runtime (containerd, docker)
- `cpuAllocatable: number` - Allocatable CPU cores
- `memoryAllocatableMB: number` - Allocatable memory in MB
- `podsAllocatable: number` - Maximum pods
- `createdAt: Date` - Node creation timestamp

**State Transitions:**
- `Unknown` → `Ready` → `NotReady`
- Any state → `Unknown` (connection lost)

### KubernetesPod
Represents a Kubernetes pod in the cluster.

**Attributes:**
- `name: string` - Pod name
- `namespace: string` - Kubernetes namespace
- `clusterId: string` - Reference to parent cluster
- `status: PodStatus` - Current pod status
- `phase: PodPhase` - Pod lifecycle phase
- `nodeName: string` - Node where pod is running
- `podIP: string | null` - Pod IP address
- `containerCount: number` - Number of containers
- `restartCount: number` - Total restart count
- `cpuUsage: number | null` - Current CPU usage percentage
- `memoryUsageMB: number | null` - Current memory usage in MB
- `createdAt: Date` - Pod creation timestamp
- `startedAt: Date | null` - Pod start timestamp

**Relationships:**
- Many-to-one with `KubernetesCluster`
- Many-to-one with `KubernetesNode`
- One-to-many with `KubernetesContainer`

### PodStatus (Enum)
Enumeration of possible pod statuses.

**Values:**
- `Pending` - Pod is pending scheduling
- `Running` - Pod is running
- `Succeeded` - Pod completed successfully
- `Failed` - Pod failed
- `Unknown` - Status could not be determined

### PodPhase (Enum)
Enumeration of pod lifecycle phases.

**Values:**
- `Pending` - Pod is pending
- `Running` - Pod is running
- `Succeeded` - Pod completed successfully
- `Failed` - Pod failed
- `Unknown` - Phase could not be determined

### KubernetesContainer
Represents a container within a pod.

**Attributes:**
- `name: string` - Container name
- `podId: string` - Reference to parent pod
- `image: string` - Container image
- `status: ContainerStatus` - Container status
- `restartCount: number` - Container restart count
- `cpuUsage: number | null` - Current CPU usage percentage
- `memoryUsageMB: number | null` - Current memory usage in MB
- `startedAt: Date | null` - Container start timestamp

### ConfigurationFile
Represents a VM configuration file in YAML format.

**Attributes:**
- `id: string` - Unique configuration identifier
- `vmId: string` - Reference to parent VM
- `filename: string` - Configuration filename
- `content: string` - YAML configuration content
- `isValid: boolean` - Configuration validation status
- `validationErrors: string[]` - List of validation errors
- `createdAt: Date` - Configuration creation timestamp
- `updatedAt: Date` - Last modification timestamp

**Relationships:**
- One-to-one with `VirtualMachine`
- One-to-many with `ConfigurationHistory`

### ConfigurationHistory
Represents a historical version of VM configuration.

**Attributes:**
- `id: string` - Unique history entry identifier
- `configId: string` - Reference to configuration file
- `version: number` - Configuration version number
- `content: string` - Historical configuration content
- `changeDescription: string` - Description of changes made
- `createdAt: Date` - History entry creation timestamp

**Relationships:**
- Many-to-one with `ConfigurationFile`

### VMEvent
Represents an event or status change for a VM.

**Attributes:**
- `id: string` - Unique event identifier
- `vmId: string` - Reference to VM
- `eventType: VMEventType` - Type of event
- `message: string` - Human-readable event message
- `details: Record<string, any>` - Additional event details
- `timestamp: Date` - Event timestamp
- `severity: EventSeverity` - Event severity level

**Relationships:**
- Many-to-one with `VirtualMachine`

### VMEventType (Enum)
Enumeration of VM event types.

**Values:**
- `StatusChanged` - VM status changed
- `ConfigurationUpdated` - VM configuration updated
- `ErrorOccurred` - VM error occurred
- `UserAction` - User initiated action
- `SystemEvent` - System-initiated event

### EventSeverity (Enum)
Enumeration of event severity levels.

**Values:**
- `Info` - Informational event
- `Warning` - Warning event
- `Error` - Error event
- `Critical` - Critical error event

### UserSession
Represents a user session and preferences.

**Attributes:**
- `id: string` - Unique session identifier
- `preferences: UserPreferences` - User preferences
- `createdAt: Date` - Session creation timestamp
- `lastActivity: Date` - Last activity timestamp
- `isActive: boolean` - Session active status

### UserPreferences
User application preferences and settings.

**Attributes:**
- `autoStartVM: boolean` - Automatically start VM on app launch
- `showNotifications: boolean` - Show system notifications
- `refreshInterval: number` - Status refresh interval in seconds
- `theme: Theme` - Application theme
- `language: string` - User interface language
- `advancedMode: boolean` - Enable advanced features

### Theme (Enum)
Enumeration of application themes.

**Values:**
- `System` - Follow system theme
- `Light` - Light theme
- `Dark` - Dark theme

## Data Relationships

```
VirtualMachine (1) ─── (1) KubernetesCluster
    │                           │
    │ (1)                       │ (1..*)
    │                           │
    ▼                           ▼
ConfigurationFile        KubernetesNode
    │                           │
    │ (1..*)                   │ (1..*)
    │                           │
    ▼                           ▼
ConfigurationHistory   KubernetesPod
                                │
                                │ (1..*)
                                │
                                ▼
                     KubernetesContainer
```

## Data Validation Rules

### VirtualMachine Validation
- `name` must be non-empty and unique
- `memoryMB` must be >= 2048 and <= 32768
- `cpus` must be >= 1 and <= 8
- `diskSizeGB` must be >= 20 and <= 500

### ConfigurationFile Validation
- `content` must be valid YAML
- `content` must pass Lima configuration schema validation
- Required fields: `arch`, `memory`, `cpus`, `disk`

### KubernetesCluster Validation
- `version` must match valid Kubernetes version pattern
- `endpoint` must be valid URL
- `kubeconfigPath` must exist and be readable

### UserPreferences Validation
- `refreshInterval` must be >= 1 and <= 60 seconds
- `language` must be supported language code
- `theme` must be valid theme value

## Data Persistence Strategy

### Application Storage
- VM configurations: Application-managed directory
- User preferences: Tauri's secure storage
- Session data: In-memory with persistence to disk
- Event logs: Rotating log files (max 100MB)

### Temporary Data
- Status cache: In-memory with 30-second TTL
- Log streams: Temporary files with automatic cleanup
- Event subscriptions: In-memory registry

### Backup and Recovery
- Configuration history: Git-like versioning
- User preferences: Encrypted backup
- Event logs: Compressed archive with 30-day retention