# Lima VM Manager - Agent Technical Guidance

**Last Updated**: 2025-10-05
**Purpose**: Technical guidance for AI agents working on this project

## Project Overview
Lima VM Manager is a macOS desktop application built with Tauri 2.0 (Rust backend) and React/TypeScript (frontend). It provides a menu bar interface for managing Lima VM instances and monitoring Kubernetes clusters.

## Technology Stack

### Backend (Rust/Tauri)
- **Tauri 2.0**: Cross-platform desktop application framework
- **tokio**: Async runtime for Rust
- **serde**: JSON serialization/deserialization
- **limactl**: CLI wrapper for Lima VM management
- **kubectl**: CLI wrapper for Kubernetes operations
- **yaml-rust**: YAML parsing and validation

### Frontend (React/TypeScript)
- **React 18+**: UI component library
- **TypeScript**: Type-safe JavaScript
- **Tailwind CSS**: Utility-first CSS framework
- **React Query**: Data fetching and caching
- **React Context**: State management

### Development Tools
- **Cargo**: Rust package manager
- **npm**: Node.js package manager
- **ESLint/Prettier**: Code formatting and linting
- **Jest**: Testing framework
- **Cypress**: End-to-end testing

## Architecture

### Backend Commands (Tauri)
```rust
// VM Management Commands
#[tauri::command]
async fn start_vm(instance: String) -> Result<VMStatus, String>

#[tauri::command]
async fn stop_vm(instance: String, force: bool) -> Result<VMStatus, String>

#[tauri::command]
async fn get_vm_status(instance: String) -> Result<VirtualMachine, String>

// Kubernetes Commands
#[tauri::command]
async fn get_pods(namespace: Option<String>) -> Result<Vec<KubernetesPod>, String>

#[tauri::command]
async fn get_pod_logs(namespace: String, pod: String, follow: bool) -> Result<String, String>

// Configuration Commands
#[tauri::command]
async fn get_config(instance: String) -> Result<ConfigurationFile, String>

#[tauri::command]
async fn update_config(instance: String, content: String) -> Result<ConfigurationFile, String>
```

### Frontend Components
```typescript
// Menu Bar Component
interface MenuBarProps {
  vmStatus: VMStatus;
  onVMAction: (action: VMAction) => void;
}

// VM Controls Component
interface VMControlsProps {
  vm: VirtualMachine;
  onStart: () => void;
  onStop: () => void;
  onSuspend: () => void;
}

// Pod List Component
interface PodListProps {
  pods: KubernetesPod[];
  selectedPod: KubernetesPod | null;
  onPodSelect: (pod: KubernetesPod) => void;
}

// Log Viewer Component
interface LogViewerProps {
  pod: KubernetesPod;
  logs: string[];
  isStreaming: boolean;
}
```

## Key Patterns

### Event-Driven Communication
```typescript
// Event subscription in frontend
useEffect(() => {
  const unsubscribe = listen('vm-status-changed', (event) => {
    setVMStatus(event.payload.new_status);
  });

  return () => unsubscribe();
}, []);

// Event emission in backend
emit(&window, "vm-status-changed", VMStatusChangedEvent {
  vm_id: vm.id.clone(),
  old_status: previous_status,
  new_status: current_status,
  timestamp: Utc::now(),
})?;
```

### Error Handling Pattern
```rust
// Rust error handling with Result types
pub type AppResult<T> = Result<T, AppError>;

#[derive(Debug, thiserror::Error)]
pub enum AppError {
  #[error("VM operation failed: {0}")]
  VMOperationError(String),

  #[error("Kubernetes error: {0}")]
  KubernetesError(String),

  #[error("Configuration error: {0}")]
  ConfigurationError(String),
}

// TypeScript error handling
interface APIResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}
```

### Configuration Validation
```rust
// YAML validation with Lima schema
pub fn validate_config(content: &str) -> ValidationResult {
  let yaml_value: serde_yaml::Value = serde_yaml::from_str(content)?;

  // Validate against Lima configuration schema
  validate_lima_schema(&yaml_value)?;

  ValidationResult {
    is_valid: true,
    errors: vec![],
    warnings: vec![],
  }
}
```

## File Structure
```
lima-vm-manager/
├── src-tauri/
│   ├── src/
│   │   ├── main.rs              # Tauri application entry
│   │   ├── commands/            # Tauri command handlers
│   │   ├── services/            # Business logic services
│   │   ├── models/              # Data structures
│   │   └── utils/               # Utility functions
│   ├── Cargo.toml               # Rust dependencies
│   └── tauri.conf.json          # Tauri configuration
├── src/
│   ├── components/              # React components
│   ├── pages/                   # Page components
│   ├── hooks/                   # Custom React hooks
│   ├── services/                # Frontend services
│   ├── types/                   # TypeScript type definitions
│   └── utils/                   # Frontend utilities
├── tests/                       # Test files
├── contracts/                   # API contracts
└── docs/                        # Documentation
```

## Development Guidelines

### Code Style
- **Rust**: Use `cargo fmt` and `cargo clippy`
- **TypeScript**: Use Prettier and ESLint
- **Component Names**: PascalCase (e.g., `VMControls`)
- **File Names**: kebab-case (e.g., `vm-controls.tsx`)
- **Function Names**: camelCase with descriptive verbs

### Testing Strategy
```rust
// Rust unit tests
#[cfg(test)]
mod tests {
  #[tokio::test]
  async fn test_vm_start_success() {
    let result = start_vm("test-instance".to_string()).await;
    assert!(result.is_ok());
  }
}

// TypeScript unit tests
describe('VMControls', () => {
  test('should call onStart when start button clicked', () => {
    const onStart = jest.fn();
    render(<VMControls vm={mockVM} onStart={onStart} />);
    fireEvent.click(screen.getByText('Start'));
    expect(onStart).toHaveBeenCalled();
  });
});
```

### Performance Considerations
- Use React.memo for expensive components
- Implement virtual scrolling for large pod lists
- Debounce search inputs and configuration changes
- Use web workers for CPU-intensive operations
- Cache API responses with React Query

## Security Best Practices
- Validate all user inputs in Rust backend
- Sanitize CLI arguments before execution
- Use Tauri capabilities for system access
- Encrypt sensitive configuration data
- Implement proper error boundaries in React

## Recent Changes
- Added support for Kubernetes v1.28
- Implemented event-driven status updates
- Added configuration history tracking
- Enhanced error handling with proper TypeScript types
- Improved menu bar performance with lazy loading

## Common Commands
```bash
# Development
npm run tauri dev              # Start development server
npm run tauri build            # Build for production
cargo test                     # Run Rust tests
npm test                       # Run TypeScript tests

# Code Quality
cargo fmt                      # Format Rust code
cargo clippy                   # Lint Rust code
npm run lint                   # Lint TypeScript code
npm run format                 # Format TypeScript code
```

## Troubleshooting
- VM not starting: Check limactl installation and permissions
- Kubernetes not accessible: Verify kubeconfig file permissions
- Menu bar not showing: Check Tauri system tray configuration
- Build failures: Verify Rust and Node.js versions match requirements

## Dependencies to Monitor
- limactl v1.2.0+ for VM management
- kubectl v1.28+ for Kubernetes operations
- Tauri 2.0 for desktop framework
- React 18+ for UI framework
- TypeScript 5+ for type safety

This guidance should be updated when major dependencies change or architectural decisions are made.