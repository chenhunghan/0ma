# Research Document: Lima VM Manager Application

**Created**: 2025-10-05
**Purpose**: Technical research and decision documentation for Phase 0 planning

## limactl v1.2.0 CLI Commands and Output Formats

**Decision**: Use limactl v1.2.0 as primary VM management interface
**Rationale**: Lima's native CLI provides stable, well-documented commands for all VM operations needed by the application. Version 1.2.0 includes improved JSON output formatting for programmatic use.
**Alternatives considered**: Direct QEMU management, libvirt integration (rejected due to complexity)

### Key Commands:
- `limactl start <instance>` - Start VM instance
- `limactl stop <instance>` - Stop VM instance
- `limactl suspend <instance>` - Suspend VM instance
- `limactl list --json` - List VM instances with JSON output
- `limactl status <instance>` - Get detailed VM status
- `limactl edit <instance>` - Edit VM configuration
- `limactl delete <instance>` - Delete VM instance

### Output Formats:
- **Status**: JSON with fields: status, name, arch, dir, sshLocalPort, hostAgentPID, qemuPID
- **List**: JSON array of VM objects with status, name, and configuration details
- **Errors**: Structured JSON with error code, message, and suggested actions

## kubectl Output Formats and Error Handling

**Decision**: Use kubectl v1.28+ with JSON output for all Kubernetes operations
**Rationale**: JSON output provides structured data for parsing and error handling. Version 1.28+ includes improved error messages and resource field formatting.
**Alternatives considered**: Direct Kubernetes API client (rejected due to complexity), YAML parsing (rejected due to ambiguity)

### Key Commands:
- `kubectl get pods --all-namespaces -o json` - List all pods with JSON output
- `kubectl logs <pod> --namespace=<ns> --follow` - Stream pod logs
- `kubectl top pods --all-namespaces -o json` - Get resource usage
- `kubectl get nodes -o json` - Get node status
- `kubectl port-forward <pod> <local>:<remote>` - Port forwarding

### Output Formats:
- **Pod List**: JSON with Pod objects containing status, spec, metadata
- **Logs**: Plain text stream with timestamps
- **Resource Usage**: JSON with CPU/memory metrics per container
- **Events**: JSON with event type, reason, message, timestamp

## Tauri 2.0 macOS Menu Bar Integration

**Decision**: Use Tauri 2.0 with system tray API for macOS menu bar integration
**Rationale**: Tauri 2.0 provides native system tray support with Rust backend and cross-platform compatibility. Menu bar integration is well-documented and performant.
**Alternatives considered**: Electron (rejected due to resource usage), native Swift app (rejected due to development complexity)

### Key Features:
- `tray` API for system tray icon and menu creation
- `window` API for dropdown/popup windows
- `global-shortcut` API for keyboard shortcuts
- Native macOS menu styling and behavior
- Event-driven communication between tray and frontend

### Integration Patterns:
- Tray icon with status indication (running/stopped/error)
- Click to show dropdown menu with VM controls
- Right-click for additional options
- Keyboard shortcuts for common actions
- Native macOS animation and styling

## React TypeScript Component Patterns for Dropdown Interfaces

**Decision**: Use functional components with hooks for menu bar dropdown interface
**Rationale**: Functional components with hooks provide better performance, TypeScript support, and modern React patterns. Context API for state management across components.
**Alternatives considered**: Class components (rejected due to legacy patterns), Redux (rejected due to overkill for this scope)

### Component Architecture:
- **MenuBar**: Main tray menu component with status display
- **VMControls**: VM start/stop/suspend controls
- **PodList**: Kubernetes pod status with real-time updates
- **LogViewer**: Pod log streaming with search/filter
- **YamlEditor**: Configuration editing with validation

### State Management:
- React Context for global application state
- useState for component-level state
- useEffect for event-driven updates
- useCallback for optimized event handlers

## Event-Driven Communication in Tauri Applications

**Decision**: Use Tauri's event system for real-time communication between Rust backend and React frontend
**Rationale**: Tauri's built-in event system provides reliable, performant communication with TypeScript support. Eliminates need for custom WebSocket implementation.
**Alternatives considered**: HTTP polling (rejected due to inefficiency), custom IPC (rejected due to complexity)

### Event Patterns:
- **VM Status Updates**: `vm-status-changed` events with VM state
- **Kubernetes Updates**: `k8s-pod-updated`, `k8s-log-stream` events
- **Configuration Changes**: `config-changed` events with validation results
- **Error Notifications**: `error-occurred` events with retry options

### Implementation:
- Rust backend emits events on state changes
- React frontend subscribes to events via `useEffect`
- Event payload structured with TypeScript interfaces
- Error handling with automatic reconnection

## macOS Application Packaging and Distribution

**Decision**: Use Tauri's built-in bundling with Apple Developer signing for distribution
**Rationale**: Tauri provides automated macOS app bundle creation with code signing support. Apple Developer signing ensures compatibility and user trust.
**Alternatives considered**: Homebrew distribution (rejected due to complexity), direct binary distribution (rejected due to security concerns)

### Packaging Features:
- `.app` bundle generation with icon and metadata
- Code signing with Apple Developer certificate
- Notarization for Gatekeeper compatibility
- Auto-update support with Sparkle integration
- DMG creation for distribution

### Distribution Strategy:
- GitHub Releases for version management
- Direct download with automatic updates
- Optional Homebrew formula for advanced users
- Documentation for manual installation

## Performance and Resource Requirements

**Decision**: Optimize for minimal memory usage and fast startup times
**Rationale**: Menu bar application needs to be lightweight and responsive. Performance targets align with user expectations for system utilities.
**Alternatives considered**: Background service architecture (rejected due to complexity), web-based interface (rejected due to performance)

### Performance Targets:
- **Startup Time**: <500ms to tray icon appearance
- **UI Response**: <100ms for menu interactions
- **Event Latency**: <2s for VM status updates
- **Memory Usage**: <50MB baseline, <100MB with active monitoring
- **CPU Usage**: <1% idle, <5% during active operations

### Optimization Strategies:
- Lazy loading of React components
- Efficient event subscription management
- Background polling with exponential backoff
- Memory pooling for frequent allocations
- Rust backend for performance-critical operations

## Security Considerations

**Decision**: Follow principle of least privilege with sandboxed execution
**Rationale**: Application interacts with system resources (VMs, Kubernetes) and handles sensitive configuration data. Security is critical for user trust.
**Alternatives considered**: Full system access (rejected due to security risks), network-only access (rejected due to functionality limitations)

### Security Measures:
- Tauri capability system for restricted system access
- Secure storage for sensitive configuration data
- Input validation for all user inputs
- Safe command execution with argument sanitization
- Regular security updates and dependency scanning

### Threat Model:
- **Command Injection**: Sanitize all CLI arguments
- **Path Traversal**: Validate file system paths
- **Data Exposure**: Encrypt sensitive configuration data
- **Code Execution**: Use capability system to limit access
- **Network Access**: Restrict to required endpoints only