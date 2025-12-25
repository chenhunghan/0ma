# Agent Development Conventions

This document outlines the coding conventions and architectural patterns for the ZeroMa project. These conventions help maintain consistency and clarity when AI agents or developers work on the codebase.

## Table of Contents

- [Rust Backend Conventions](#rust-backend-conventions)
  - [Tauri Commands](#tauri-commands)
  - [File Organization](#file-organization)
  - [Handler Files](#handler-files)
  - [Service Files](#service-files)
- [TypeScript Frontend Conventions](#typescript-frontend-conventions)
- [Project Structure](#project-structure)

## Rust Backend Conventions

### Tauri Commands

All functions decorated with `#[tauri::command]` **MUST** follow these rules:

1. **Naming Convention**: Command functions must end with `_cmd` suffix
   ```rust
   // ✅ Correct
   #[tauri::command]
   pub fn read_lima_yaml_cmd(app: AppHandle, instance_name: String) -> Result<LimaConfig, String> {
       // ...
   }

   // ❌ Incorrect
   #[tauri::command]
   pub fn read_lima_yaml(app: AppHandle, instance_name: String) -> Result<LimaConfig, String> {
       // ...
   }
   ```

2. **File Placement**: All Tauri command functions must be in `*_handler.rs` files

3. **Event Naming Convention**: Commands that emit events must use unique, command-specific event names
   ```rust
   // ✅ Correct - Unique events per command
   #[tauri::command]
   pub async fn create_lima_instance_cmd(app: AppHandle, ...) -> Result<String, String> {
       app.emit("lima-instance-create-error", &error_msg)?;
       app.emit("lima-instance-create-stdout", &line)?;
       app.emit("lima-instance-create-stderr", &line)?;
       app.emit("lima-instance-create-success", &instance_name)?;
       // ...
   }

   #[tauri::command]
   pub async fn start_lima_instance_cmd(app: AppHandle, ...) -> Result<String, String> {
       app.emit("lima-instance-start-error", &error_msg)?;
       app.emit("lima-instance-start-stdout", &line)?;
       app.emit("lima-instance-start-stderr", &line)?;
       app.emit("lima-instance-start-success", &instance_name)?;
       // ...
   }

   // ❌ Incorrect - Generic events shared across commands
   #[tauri::command]
   pub async fn create_lima_instance_cmd(app: AppHandle, ...) -> Result<String, String> {
       app.emit("lima-instance-error", &error_msg)?;  // Too generic!
       app.emit("lima-instance-output", &line)?;      // Too generic!
       // ...
   }
   ```

   **Pattern**: `{scope}-{action}-{type}`
   - `scope`: The feature area (e.g., `lima-instance`)
   - `action`: The specific command operation (e.g., `create`, `start`, `stop`, `delete`)
   - `type`: The event type (e.g., `error`, `stdout`, `stderr`, `success`)

   **Examples**:
   - `create_lima_instance_cmd` → `lima-instance-create-{error|stdout|stderr|success}`
   - `start_lima_instance_cmd` → `lima-instance-start-{error|stdout|stderr|success}`
   - `stop_lima_instance_cmd` → `lima-instance-stop-{error|stdout|stderr|success}`
   - `delete_lima_instance_cmd` → `lima-instance-delete-{error|stdout|stderr|success}`

   **Why Unique Events?**
   - Prevents event collision when multiple operations run concurrently
   - Makes frontend event handling more precise and predictable
   - Easier to debug and trace which command emitted which event
   - Allows frontend to subscribe to specific operation events

### File Organization

The backend follows a clear separation between handlers and services:

#### Handler Files (`*_handler.rs`)

Handler files **ONLY** contain functions with `#[tauri::command]` decorator.

- **Purpose**: Interface between frontend and backend
- **Contents**: Command functions that are exposed to the frontend via Tauri's IPC
- **Naming**: Must end with `_handler.rs`
- **Rules**:
  - ✅ ONLY functions with `#[tauri::command]`
  - ❌ NO internal/helper functions
  - ❌ NO business logic implementation
  - ✅ Can import from service files

**Example**: `lima_config_handler.rs`
```rust
use tauri::AppHandle;
use crate::lima_config::{LimaConfig, get_default_k0s_lima_config};
use crate::lima_config_service::{get_lima_yaml_path, write_lima_yaml};

/// Read the Lima YAML configuration for a specific instance
#[tauri::command]
pub fn read_lima_yaml_cmd(app: AppHandle, instance_name: String) -> Result<LimaConfig, String> {
    let yaml_path = get_lima_yaml_path(&app, &instance_name)?;
    // Implementation...
}

/// Write Lima YAML configuration
#[tauri::command]
pub fn write_lima_yaml_cmd(
    app: AppHandle,
    config: LimaConfig,
    instance_name: String,
) -> Result<(), String> {
    write_lima_yaml(&app, &config, &instance_name)
}
```

#### Service Files (`*_service.rs`)

Service files contain all business logic, helper functions, and internal implementations.

- **Purpose**: Reusable business logic and internal functions
- **Contents**: Internal functions, helpers, utilities, data structures
- **Naming**: Must end with `_service.rs`
- **Rules**:
  - ✅ Internal/helper functions
  - ✅ Business logic
  - ✅ Data structures and implementations
  - ❌ NO `#[tauri::command]` functions

**Example**: `lima_config_service.rs`
```rust
use tauri::AppHandle;
use crate::lima_config::LimaConfig;

/// Write YAML configuration for a specific instance (internal)
pub fn write_lima_yaml(
    app: &AppHandle,
    config: &LimaConfig,
    instance_name: &str,
) -> Result<(), String> {
    // Implementation...
}

/// Get the path to the Lima YAML configuration file
pub fn get_lima_yaml_path(
    app: &AppHandle,
    instance_name: &str
) -> Result<std::path::PathBuf, String> {
    // Implementation...
}
```

### Current Handler-Service Pairs

| Handler File | Service File | Purpose |
|--------------|--------------|---------|
| `lima_config_handler.rs` | `lima_config_service.rs` | Lima YAML configuration management |
| `instance_registry_handler.rs` | `instance_registry_service.rs` | Instance registry and status tracking |
| `lima_instance_handler.rs` | (imports from service) | Lima instance lifecycle operations |

### Module Registration

In `lib.rs`, register both handler and service modules:

```rust
mod yaml_handler;
mod lima_config;
mod lima_config_service;      // Service module
mod lima_config_handler;      // Handler module
mod instance_registry_service; // Service module
mod instance_registry_handler; // Handler module
mod lima_instance_handler;     // Handler module
```

Register commands in the invoke handler:

```rust
.invoke_handler(tauri::generate_handler![
    lima_version_cmd,
    lima_config_handler::read_lima_yaml_cmd,
    lima_config_handler::write_lima_yaml_cmd,
    lima_config_handler::get_lima_yaml_path_cmd,
    // ... more commands
])
```

## TypeScript Frontend Conventions

### Invoking Tauri Commands

When calling Tauri commands from TypeScript, always use the `_cmd` suffix:

```typescript
// ✅ Correct
import { invoke } from "@tauri-apps/api/core";

const config = await invoke<LimaConfig>("read_lima_yaml_cmd", { instanceName });
await invoke("write_lima_yaml_cmd", { instanceName, config });

// ❌ Incorrect
const config = await invoke<LimaConfig>("read_lima_yaml", { instanceName });
```

### Hooks Organization

React hooks that interact with Tauri commands should:

1. Use React Query for state management
2. Handle loading, error, and success states
3. Provide intuitive function names that hide the `_cmd` implementation detail

**Example**: `useLimaYaml.ts`
```typescript
export function useLimaYaml(instanceName: string) {
  const { data: limaConfig, isLoading, error } = useQuery({
    queryKey: ["lima_yaml", instanceName],
    queryFn: async () => {
      return await invoke<LimaConfig>("read_lima_yaml_cmd", { instanceName });
    },
  });

  const writeLimaYaml = useMutation({
    mutationFn: async (config: LimaConfig) => {
      await invoke("write_lima_yaml_cmd", { instanceName, config });
    },
  });

  return {
    limaConfig,
    isLoading,
    error,
    writeLimaYaml: writeLimaYaml.mutate, // Clean API for consumers
  };
}
```

## Project Structure

```
src-tauri/src/
├── lib.rs                          # Main entry point, command registration
├── main.rs                         # Application entry
│
├── lima_config_handler.rs          # Handler: Lima config commands
├── lima_config_service.rs          # Service: Lima config logic
├── lima_config.rs                  # Data structures and types
│
├── instance_registry_handler.rs    # Handler: Registry commands
├── instance_registry_service.rs    # Service: Registry logic
│
├── lima_instance_handler.rs        # Handler: Instance lifecycle commands
│
└── yaml_handler.rs                 # YAML file operations

src/
├── hooks/
│   ├── useLimaYaml.ts             # React Query hooks for Lima config
│   ├── useLimaInstance.ts         # React Query hooks for instances
│   ├── useLimaVersion.ts          # Lima version checking
│   └── useInstanceRegistry.ts      # Instance registry hooks
│
├── components/
│   ├── LimaConfigEditor.tsx       # Configuration editing UI
│   └── QuickConfigEditor.tsx      # Quick config UI
│
└── types/
    └── lima-config.ts             # TypeScript type definitions
```

## Why These Conventions?

### Clear Separation of Concerns
- **Handlers** are the API surface - they define what the frontend can do
- **Services** contain the "how" - the implementation details and business logic
- This separation makes it easier to test, maintain, and understand the codebase

### Discoverability
- The `_cmd` suffix makes it immediately clear which functions are exposed to the frontend
- The `_handler.rs` suffix makes it easy to find all Tauri command files
- The `_service.rs` suffix clearly indicates internal implementation files

### Maintainability
- Changes to business logic only require updating service files
- Handlers remain thin and focused on parameter validation and service orchestration
- Easy to locate and modify specific functionality

### AI Agent Friendly
- Clear naming conventions reduce ambiguity for AI agents
- Strict rules about file contents make it easier for agents to generate correct code
- Separation of concerns allows agents to understand the architecture quickly

## Examples

### Adding a New Tauri Command

1. **Create or update the service file** (`*_service.rs`):
   ```rust
   // my_feature_service.rs
   pub fn my_internal_function(param: &str) -> Result<String, String> {
       // Business logic here
       Ok(format!("Processed: {}", param))
   }
   ```

2. **Create or update the handler file** (`*_handler.rs`):
   ```rust
   // my_feature_handler.rs
   use crate::my_feature_service::my_internal_function;
   
   #[tauri::command]
   pub fn my_feature_cmd(param: String) -> Result<String, String> {
       my_internal_function(&param)
   }
   ```

3. **Register in `lib.rs`**:
   ```rust
   mod my_feature_service;
   mod my_feature_handler;
   
   // In the builder:
   .invoke_handler(tauri::generate_handler![
       my_feature_handler::my_feature_cmd,
       // ...
   ])
   ```

4. **Use in TypeScript**:
   ```typescript
   const result = await invoke<string>("my_feature_cmd", { param: "value" });
   ```

## Checklist for New Features

- [ ] Handler file ends with `_handler.rs`
- [ ] Service file ends with `_service.rs`
- [ ] All command functions have `_cmd` suffix
- [ ] Handler file ONLY contains `#[tauri::command]` functions
- [ ] Business logic is in service file, not handler
- [ ] Modules registered in `lib.rs`
- [ ] Commands registered in `invoke_handler`
- [ ] TypeScript code uses `_cmd` suffix when invoking
- [ ] React hooks provide clean API (hide `_cmd` from consumers)
- [ ] Event names follow unique pattern: `{scope}-{action}-{type}`

---

**Last Updated**: 2025-12-25  
**Maintained By**: Development Team & AI Agents
