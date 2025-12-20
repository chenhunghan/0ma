# ZeroMa - Lima Manager

This document explains how to use the ZeroMa application's Lima instance management features.

## Overview

ZeroMa is a Lima Manager desktop application built with Tauri that provides:
- **Configuration Management**: Edit and manage Lima configurations through a structured interface
- **Instance Lifecycle**: Create and stop Lima instances with real-time output streaming
- **Type Safety**: Structured YAML configuration with Rust types for compile-time safety
- **Template Support**: Automatic substitution of paths and variables

## Core Components

### 1. LimaConfig Struct

The main `LimaConfig` struct represents a complete Lima configuration:

```rust
use crate::lima_config::LimaConfig;

// Create a new empty config
let mut config = LimaConfig::new();

// Set required fields
config.base = "template://_images/ubuntu-lts".to_string();
config.minimum_lima_version = Some("1.1.0".to_string());
```

### 2. Configuration Fields

The config structure includes:

- `minimum_lima_version`: Optional version requirement
- `base`: Base image template (required)
- `mounts`: List of mount configurations
- `containerd`: Containerd settings
- `provision`: Provisioning scripts
- `probes`: Health checks
- `copy_to_host`: Files to copy from guest to host
- `message`: Display message after startup

### 3. Working with YAML

#### Reading YAML

```rust
use crate::lima_config::LimaConfig;

// Parse YAML string into config
let config = LimaConfig::from_yaml(yaml_content)?;
```

#### Writing YAML

```rust
// Serialize config to YAML
let yaml_output = config.to_yaml()?;

// Or pretty-printed YAML
let yaml_pretty = config.to_yaml_pretty()?;
```

### 4. Template Variables

The configuration supports template variable substitution:

```rust
use crate::lima_config::{LimaConfig, TemplateVars};

let mut config = LimaConfig::new();
config.copy_to_host.push(CopyToHost {
    guest: "/var/lib/k0s/pki/admin.conf".to_string(),
    host: "{{.Dir}}/copied-from-guest/kubeconfig.yaml".to_string(),
    delete_on_stop: Some(true),
});

// Substitute variables
let vars = TemplateVars {
    dir: "/path/to/instance".to_string(),
    home: "/home/user".to_string(),
    user: "myuser".to_string(),
};

config.substitute_variables(&vars);
```

## Usage Examples

### Creating a k0s Configuration

```rust
use crate::lima_config::{LimaConfig, ContainerdConfig, Provision, Probe, CopyToHost};

let mut config = LimaConfig::new();

// Set k0s-specific settings
config.minimum_lima_version = Some("1.1.0".to_string());
config.containerd = ContainerdConfig {
    system: false,  // k0s manages its own containerd
    user: false,
};

// Add provisioning script
config.provision.push(Provision {
    mode: "system".to_string(),
    script: "curl -sfL https://get.k0s.sh | sh".to_string(),
});

// Add health probe
config.probes.push(Probe {
    description: "k0s to be running".to_string(),
    script: "test -f /var/lib/k0s/pki/admin.conf".to_string(),
    hint: Some("Check k0scontroller service".to_string()),
});

// Copy kubeconfig to host
config.copy_to_host.push(CopyToHost {
    guest: "/var/lib/k0s/pki/admin.conf".to_string(),
    host: "{{.Dir}}/copied-from-guest/kubeconfig.yaml".to_string(),
    delete_on_stop: Some(true),
});
```

### Modifying an Existing Configuration

```rust
use crate::lima_config::LimaConfig;

// Load existing config
let mut config = LimaConfig::from_yaml(yaml_content)?;

// Modify something
config.message = format!("{}\n\n# Custom modification", config.message);

// Add a new mount
config.mounts.push(Mount {
    location: Some("/host/path".to_string()),
    mount_point: Some("/guest/path".to_string()),
    writable: Some(true),
    sshfs: None,
    ninep: None,
});

// Save the modified config
let new_yaml = config.to_yaml_pretty()?;
```

## Instance Management

ZeroMa provides handlers for managing Lima instances:

### Creating an Instance
```rust
#[tauri::command]
pub async fn create_lima_instance(
    app: AppHandle,
    config: LimaConfig,
    instance_name: Option<String>,
) -> Result<String, String>
```
- Saves the configuration with variable substitution
- Runs `limactl start` with the configuration file
- Streams real-time output to the frontend

### Stopping an Instance
```rust
#[tauri::command]
pub async fn stop_lima_instance(
    app: AppHandle,
    instance_name: String,
) -> Result<String, String>
```
- Runs `limactl stop` for the specified instance
- Streams real-time output to the frontend
- Emits stop-specific events

### Event System
The application uses Tauri events for real-time communication:
- `lima-instance-start`: Instance creation started
- `lima-instance-stop`: Instance stopping started
- `lima-instance-output`: Real-time command output
- `lima-instance-success`: Instance started successfully
- `lima-instance-stop-success`: Instance stopped successfully
- `lima-instance-error`: Error occurred during operation

## Configuration Handlers

The available Tauri commands for configuration management:

```rust
// In lib.rs
.invoke_handler(tauri::generate_handler![
    // Read/Write configuration
    yaml_handler::read_lima_yaml,
    yaml_handler::write_lima_yaml,
    yaml_handler::write_lima_yaml_with_vars,

    // File operations
    yaml_handler::get_lima_yaml_path_cmd,
    yaml_handler::reset_lima_yaml,

    // Instance management
    yaml_handler::create_lima_instance,
    yaml_handler::stop_lima_instance,

    // Utilities
    yaml_handler::get_kubeconfig_path,
    yaml_handler::convert_config_to_yaml,
])
```

## Benefits

1. **Type Safety**: Rust's type system catches configuration errors at compile time
2. **IDE Support**: Better autocomplete and documentation
3. **Validation**: Structured validation prevents malformed configs
4. **Programmatic Modification**: Easy to modify specific fields programmatically
5. **Documentation**: Self-documenting through struct definitions
6. **Testing**: Easier to write unit tests for configuration logic

## Migration Notes

To migrate from the string-based approach:

1. Replace raw string operations with struct field access
2. Use `LimaConfig::from_yaml()` and `config.to_yaml()` for serialization
3. Take advantage of type-safe field access instead of string manipulation
4. Use the structured Tauri handlers for frontend integration

## Future Enhancements

Possible future improvements:

1. **Validation Rules**: Add field validation (e.g., check version format)
2. **Builder Pattern**: Implement builders for complex configurations
3. **Conversion Traits**: Implement traits for different config format versions
4. **Merge Operations**: Implement config merging/updating
5. **Schema Generation**: Generate JSON schema for frontend validation