# Quickstart Guide: Lima VM Manager

**Created**: 2025-10-05
**Purpose**: Getting started guide for the Lima VM Manager application

## Prerequisites

### System Requirements
- macOS 13.0 (Ventura) or later
- 8GB RAM minimum (16GB recommended)
- 50GB free disk space
- Intel or Apple Silicon (M1/M2/M3) Mac

### Required Software
- **limactl v1.2.0** or later: Lima CLI tool
  ```bash
  # Install via Homebrew
  brew install lima

  # Verify installation
  limactl --version
  ```
- **kubectl v1.28+**: Kubernetes CLI tool
  ```bash
  # Install via Homebrew
  brew install kubectl

  # Verify installation
  kubectl version --client
  ```
- **Node.js 18+**: For development (optional)
  ```bash
  # Install via Homebrew
  brew install node

  # Verify installation
  node --version
  ```

## Installation

### Production Installation
1. Download the latest `.dmg` file from [GitHub Releases](https://github.com/your-org/lima-vm-manager/releases)
2. Open the `.dmg` file
3. Drag the Lima VM Manager to your Applications folder
4. Launch the application from your Applications folder or Launchpad

### Development Installation
```bash
# Clone the repository
git clone https://github.com/your-org/lima-vm-manager.git
cd lima-vm-manager

# Install dependencies
npm install
cd src-tauri && cargo build --release

# Run in development mode
npm run tauri dev
```

## First-Time Setup

### 1. Initial Configuration
When you first launch Lima VM Manager, it will:
- Detect existing limactl installation
- Check for kubectl availability
- Create application configuration directory
- Initialize default VM configuration

### 2. VM Configuration
The application provides several pre-configured templates:

**Development Template** (Recommended)
- 4GB RAM, 2 CPU cores, 40GB disk
- Kubernetes v1.28 pre-installed
- Docker runtime enabled
- Networking optimized for development

**Minimal Template**
- 2GB RAM, 1 CPU core, 20GB disk
- No Kubernetes (can be installed later)
- Basic Ubuntu 22.04 system

**Production Template**
- 8GB RAM, 4 CPU cores, 80GB disk
- Kubernetes v1.28 with production settings
- Enhanced security configurations
- Performance optimizations

### 3. Selecting a Template
1. Click the Lima VM Manager icon in your menu bar
2. Select "Configuration" → "Choose Template"
3. Choose your desired template
4. Click "Apply Configuration"
5. Wait for validation and application

## Basic Usage

### Starting the VM
1. Click the Lima VM Manager menu bar icon
2. Click "Start VM" (green play button)
3. Wait for the VM to boot (typically 2-3 minutes)
4. Status will change to "Running" when ready

### Managing Kubernetes Resources
Once the VM is running with Kubernetes:

**View Pods**
1. Click "Kubernetes" → "Pods"
2. View all pods across namespaces
3. Filter by namespace or pod name
4. See real-time status and resource usage

**View Logs**
1. Click on any pod in the list
2. Select "View Logs"
3. Stream logs in real-time
4. Use search and filter options

**Port Forwarding**
1. Right-click on a pod
2. Select "Port Forward"
3. Choose container port and host port
4. Access service locally

### Stopping the VM
1. Click the Lima VM Manager menu bar icon
2. Click "Stop VM" (red stop button)
3. Choose "Stop" or "Force Stop"
4. Wait for graceful shutdown

## Advanced Features

### Configuration Management
**Edit VM Configuration**
1. Click "Configuration" → "Edit YAML"
2. Modify configuration in the built-in editor
3. Real-time validation feedback
4. Click "Apply" to save changes

**Configuration History**
1. Click "Configuration" → "History"
2. View previous configuration versions
3. Compare versions side-by-side
4. Restore to any previous version

### Templates and Customization
**Create Custom Template**
1. Configure VM to your specifications
2. Click "Configuration" → "Save as Template"
3. Provide template name and description
4. Template available for future use

**Import External Configurations**
1. Click "Configuration" → "Import"
2. Select existing Lima configuration file
3. Validate and apply configuration
4. Automatic adjustment for application compatibility

## Troubleshooting

### Common Issues

**VM Fails to Start**
- Check available disk space (minimum 20GB required)
- Verify virtualization is enabled in System Settings
- Try stopping and restarting the application
- Check system logs for detailed error messages

**Kubernetes Not Available**
- Verify the configuration includes Kubernetes
- Wait 5-10 minutes after VM start for full initialization
- Check pod status in kube-system namespace
- Restart VM if necessary

**Port Forwarding Not Working**
- Verify pod is running and ready
- Check if port is already in use on host
- Verify firewall settings allow the connection
- Try different host port number

**Configuration Validation Errors**
- Check YAML syntax using online validator
- Verify all required fields are present
- Ensure values are within acceptable ranges
- Compare with working template configuration

### Getting Help

**Application Logs**
1. Click "Help" → "Show Logs"
2. Review error messages and warnings
3. Export logs for support requests

**Command Line Tools**
```bash
# Check VM status manually
limactl list

# Check Kubernetes status
kubectl cluster-info

# Check pod status
kubectl get pods --all-namespaces
```

**Support Resources**
- [GitHub Issues](https://github.com/your-org/lima-vm-manager/issues)
- [Documentation](https://docs.lima-vm-manager.com)
- [Community Discord](https://discord.gg/lima-vm-manager)

## Keyboard Shortcuts

| Action | Shortcut |
|--------|----------|
| Show/Hide Menu | `Cmd + Shift + L` |
| Start VM | `Cmd + Shift + S` |
| Stop VM | `Cmd + Shift + T` |
| Show Logs | `Cmd + Shift + L` |
| Configuration | `Cmd + Shift + C` |
| Refresh Status | `Cmd + Shift + R` |

## Performance Tips

### Optimize VM Performance
- Allocate at least 4GB RAM for development workloads
- Use SSD storage for VM disk files
- Enable hardware virtualization in BIOS/UEFI
- Close unnecessary applications during heavy workloads

### Optimize Application Performance
- Use event-driven updates (default) instead of frequent polling
- Increase refresh interval for less frequent updates
- Disable log streaming when not needed
- Use dark theme for better battery life on macOS

## Security Considerations

### VM Security
- Regularly update the VM operating system
- Use strong passwords for SSH access
- Enable firewall within the VM when needed
- Backup important VM configurations

### Application Security
- Application runs with minimal system permissions
- Configuration data stored in encrypted format
- Network access limited to required endpoints
- Regular security updates distributed automatically

## Next Steps

1. **Explore Templates**: Try different VM templates for various use cases
2. **Custom Configuration**: Create custom configurations for your specific needs
3. **Integration**: Set up port forwarding for local development
4. **Monitoring**: Use the monitoring features to track resource usage
5. **Automation**: Explore scripting capabilities for automated workflows

For detailed documentation and advanced usage, visit the [official documentation](https://docs.lima-vm-manager.com).