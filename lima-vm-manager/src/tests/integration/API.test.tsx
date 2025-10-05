import { invoke } from '@tauri-apps/api/tauri';
import * as vmApi from '../../services/api/vm-api';
import * as configApi from '../../services/api/config-api';
import * as systemApi from '../../services/api/system-api';
import type { VM, Config, SystemInfo, CliToolStatus } from '../../types';

// Mock Tauri API
jest.mock('@tauri-apps/api/tauri');
const mockInvoke = invoke as jest.MockedFunction<typeof invoke>;

describe('API Integration Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('VM API', () => {
    const mockVMs: VM[] = [
      {
        id: '1',
        name: 'Test VM',
        status: 'Running',
        template: 'ubuntu',
        cpus: 2,
        memory: 4096,
        disk: 64,
        ip: '192.168.1.100',
        portForwards: [{ port: 22 }],
        mounts: [{ mountPoint: '/tmp' }],
        envVars: { DEBUG: 'true' },
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
      },
    ];

    it('should get VMs successfully', async () => {
      mockInvoke.mockResolvedValue(mockVMs);

      const result = await vmApi.getVMs();

      expect(mockInvoke).toHaveBeenCalledWith('get_vms');
      expect(result).toEqual(mockVMs);
    });

    it('should handle getVMs error', async () => {
      const error = new Error('Failed to get VMs');
      mockInvoke.mockRejectedValue(error);

      await expect(vmApi.getVMs()).rejects.toThrow('Failed to get VMs');
      expect(mockInvoke).toHaveBeenCalledWith('get_vms');
    });

    it('should get VM by ID successfully', async () => {
      mockInvoke.mockResolvedValue(mockVMs[0]);

      const result = await vmApi.getVM('1');

      expect(mockInvoke).toHaveBeenCalledWith('get_vm', { vmId: '1' });
      expect(result).toEqual(mockVMs[0]);
    });

    it('should create VM successfully', async () => {
      const newVM = {
        name: 'New VM',
        template: 'ubuntu',
        cpus: 2,
        memory: 4096,
        disk: 64,
        portForwards: [{ port: 22 }],
        mounts: [{ mountPoint: '/tmp', hostPath: '/tmp/host' }],
        envVars: {},
      };

      const createdVM = { ...newVM, id: '2', status: 'Stopped' as const };
      mockInvoke.mockResolvedValue(createdVM);

      const result = await vmApi.createVM(newVM);

      expect(mockInvoke).toHaveBeenCalledWith('create_vm', { vmConfig: newVM });
      expect(result).toEqual(createdVM);
    });

    it('should update VM successfully', async () => {
      const updatedVM = { ...mockVMs[0], name: 'Updated VM' };
      mockInvoke.mockResolvedValue(updatedVM);

      const result = await vmApi.updateVM('1', { name: 'Updated VM' });

      expect(mockInvoke).toHaveBeenCalledWith('update_vm', {
        vmId: '1',
        updates: { name: 'Updated VM' },
      });
      expect(result).toEqual(updatedVM);
    });

    it('should delete VM successfully', async () => {
      mockInvoke.mockResolvedValue(undefined);

      await vmApi.deleteVM('1');

      expect(mockInvoke).toHaveBeenCalledWith('delete_vm', { vmId: '1' });
    });

    it('should start VM successfully', async () => {
      mockInvoke.mockResolvedValue(undefined);

      await vmApi.startVM('1');

      expect(mockInvoke).toHaveBeenCalledWith('start_vm', { vmId: '1' });
    });

    it('should stop VM successfully', async () => {
      mockInvoke.mockResolvedValue(undefined);

      await vmApi.stopVM('1');

      expect(mockInvoke).toHaveBeenCalledWith('stop_vm', { vmId: '1' });
    });

    it('should restart VM successfully', async () => {
      mockInvoke.mockResolvedValue(undefined);

      await vmApi.restartVM('1');

      expect(mockInvoke).toHaveBeenCalledWith('restart_vm', { vmId: '1' });
    });

    it('should get VM logs successfully', async () => {
      const logs = ['Log line 1', 'Log line 2'];
      mockInvoke.mockResolvedValue(logs);

      const result = await vmApi.getVMLogs('1', 50);

      expect(mockInvoke).toHaveBeenCalledWith('get_vm_logs', {
        vmId: '1',
        lines: 50,
      });
      expect(result).toEqual(logs);
    });

    it('should get VM templates successfully', async () => {
      const templates = [
        {
          id: 'ubuntu',
          name: 'Ubuntu 22.04',
          description: 'Ubuntu LTS',
          defaultCpus: 2,
          defaultMemory: 4096,
          defaultDisk: 64,
          defaultPorts: [{ port: 22 }],
          defaultMounts: [{ mountPoint: '/tmp' }],
          supportedActions: ['start', 'stop', 'restart'],
          category: 'development',
        },
      ];
      mockInvoke.mockResolvedValue(templates);

      const result = await vmApi.getVMTemplates();

      expect(mockInvoke).toHaveBeenCalledWith('get_vm_templates');
      expect(result).toEqual(templates);
    });
  });

  describe('Config API', () => {
    const mockConfig: Config = {
      general: {
        theme: 'light',
        autoStart: false,
        logLevel: 'info',
        checkUpdates: true,
        telemetry: false,
      },
      vm: {
        defaultCpus: 2,
        defaultMemory: 4096,
        defaultDisk: 64,
        autoBackup: false,
        backupInterval: 'daily',
        maxBackups: 7,
      },
      cliTools: {
        lima: { enabled: true, version: '1.0.0', path: '/usr/local/bin/lima' },
        qemu: { enabled: true, version: '8.0.0', path: '/usr/local/bin/qemu' },
        podman: { enabled: false, version: '4.0.0', path: '/usr/local/bin/podman' },
      },
      advanced: {
        debugMode: false,
        experimentalFeatures: false,
        apiTimeout: 30,
        maxConcurrentVMs: 5,
      },
    };

    it('should get config successfully', async () => {
      mockInvoke.mockResolvedValue(mockConfig);

      const result = await configApi.getConfig();

      expect(mockInvoke).toHaveBeenCalledWith('get_config');
      expect(result).toEqual(mockConfig);
    });

    it('should save config successfully', async () => {
      mockInvoke.mockResolvedValue(mockConfig);

      const result = await configApi.saveConfig(mockConfig);

      expect(mockInvoke).toHaveBeenCalledWith('save_config', { config: mockConfig });
      expect(result).toEqual(mockConfig);
    });

    it('should reset config successfully', async () => {
      mockInvoke.mockResolvedValue(mockConfig);

      const result = await configApi.resetConfig();

      expect(mockInvoke).toHaveBeenCalledWith('reset_config');
      expect(result).toEqual(mockConfig);
    });

    it('should validate config successfully', async () => {
      const validationResult = { valid: true, errors: [] };
      mockInvoke.mockResolvedValue(validationResult);

      const result = await configApi.validateConfig(mockConfig);

      expect(mockInvoke).toHaveBeenCalledWith('validate_config', { config: mockConfig });
      expect(result).toEqual(validationResult);
    });

    it('should handle invalid config validation', async () => {
      const validationResult = {
        valid: false,
        errors: ['Invalid theme', 'Memory too low'],
      };
      mockInvoke.mockResolvedValue(validationResult);

      const result = await configApi.validateConfig(mockConfig);

      expect(result.valid).toBe(false);
      expect(result.errors).toHaveLength(2);
    });
  });

  describe('System API', () => {
    const mockSystemInfo: SystemInfo = {
      totalMemory: 16384,
      availableMemory: 8192,
      totalCpuCores: 8,
      availableCpuCores: 4,
      diskSpace: {
        total: 500000,
        available: 250000,
        used: 250000,
      },
    };

    const mockCliToolStatus: CliToolStatus = {
      lima: {
        installed: true,
        version: '1.0.0',
        path: '/usr/local/bin/lima',
        status: 'running',
      },
      qemu: {
        installed: true,
        version: '8.0.0',
        path: '/usr/local/bin/qemu',
        status: 'running',
      },
      podman: {
        installed: false,
        version: null,
        path: null,
        status: 'not_installed',
      },
    };

    it('should get system info successfully', async () => {
      mockInvoke.mockResolvedValue(mockSystemInfo);

      const result = await systemApi.getSystemInfo();

      expect(mockInvoke).toHaveBeenCalledWith('get_system_info');
      expect(result).toEqual(mockSystemInfo);
    });

    it('should get CLI tool status successfully', async () => {
      mockInvoke.mockResolvedValue(mockCliToolStatus);

      const result = await systemApi.getCliToolStatus();

      expect(mockInvoke).toHaveBeenCalledWith('get_cli_tool_status');
      expect(result).toEqual(mockCliToolStatus);
    });

    it('should check system requirements successfully', async () => {
      const requirements = {
        minimumMemory: 4096,
        minimumDiskSpace: 50000,
        requiredCpuCores: 2,
        requiredTools: ['lima', 'qemu'],
      };

      const checkResult = {
        meetsRequirements: true,
        issues: [],
        recommendations: ['Consider more disk space for multiple VMs'],
      };

      mockInvoke.mockResolvedValue(checkResult);

      const result = await systemApi.checkSystemRequirements(requirements);

      expect(mockInvoke).toHaveBeenCalledWith('check_system_requirements', {
        requirements,
      });
      expect(result).toEqual(checkResult);
    });

    it('should handle system requirements not met', async () => {
      const requirements = {
        minimumMemory: 4096,
        minimumDiskSpace: 50000,
        requiredCpuCores: 2,
        requiredTools: ['lima', 'qemu'],
      };

      const checkResult = {
        meetsRequirements: false,
        issues: ['Insufficient memory', 'QEMU not installed'],
        recommendations: ['Add more RAM', 'Install QEMU'],
      };

      mockInvoke.mockResolvedValue(checkResult);

      const result = await systemApi.checkSystemRequirements(requirements);

      expect(result.meetsRequirements).toBe(false);
      expect(result.issues).toHaveLength(2);
    });

    it('should install CLI tool successfully', async () => {
      mockInvoke.mockResolvedValue(undefined);

      await systemApi.installCliTool('qemu');

      expect(mockInvoke).toHaveBeenCalledWith('install_cli_tool', {
        tool: 'qemu',
      });
    });

    it('should update CLI tool successfully', async () => {
      mockInvoke.mockResolvedValue(undefined);

      await systemApi.updateCliTool('lima');

      expect(mockInvoke).toHaveBeenCalledWith('update_cli_tool', {
        tool: 'lima',
      });
    });

    it('should get system diagnostics successfully', async () => {
      const diagnostics = {
        timestamp: new Date().toISOString(),
        systemInfo: mockSystemInfo,
        cliToolStatus: mockCliToolStatus,
        errors: [],
        warnings: ['Disk space running low'],
      };

      mockInvoke.mockResolvedValue(diagnostics);

      const result = await systemApi.getDiagnostics();

      expect(mockInvoke).toHaveBeenCalledWith('get_diagnostics');
      expect(result).toEqual(diagnostics);
    });

    it('should cleanup temporary files successfully', async () => {
      const cleanupResult = {
        filesDeleted: 15,
        spaceFreed: 1024,
        errors: [],
      };

      mockInvoke.mockResolvedValue(cleanupResult);

      const result = await systemApi.cleanupTempFiles();

      expect(mockInvoke).toHaveBeenCalledWith('cleanup_temp_files');
      expect(result).toEqual(cleanupResult);
    });
  });

  describe('API Error Handling', () => {
    it('should handle network timeout errors', async () => {
      const timeoutError = new Error('Network timeout');
      timeoutError.name = 'TimeoutError';
      mockInvoke.mockRejectedValue(timeoutError);

      await expect(vmApi.getVMs()).rejects.toThrow('Network timeout');
    });

    it('should handle permission denied errors', async () => {
      const permissionError = new Error('Permission denied');
      permissionError.name = 'PermissionDeniedError';
      mockInvoke.mockRejectedValue(permissionError);

      await expect(vmApi.deleteVM('1')).rejects.toThrow('Permission denied');
    });

    it('should handle VM not found errors', async () => {
      const notFoundError = new Error('VM not found');
      notFoundError.name = 'NotFoundError';
      mockInvoke.mockRejectedValue(notFoundError);

      await expect(vmApi.getVM('nonexistent')).rejects.toThrow('VM not found');
    });

    it('should handle validation errors', async () => {
      const validationError = new Error('Invalid VM configuration');
      validationError.name = 'ValidationError';
      mockInvoke.mockRejectedValue(validationError);

      await expect(vmApi.createVM({} as any)).rejects.toThrow('Invalid VM configuration');
    });

    it('should handle generic Tauri command errors', async () => {
      const commandError = new Error('Command failed: Unknown error');
      mockInvoke.mockRejectedValue(commandError);

      await expect(systemApi.getSystemInfo()).rejects.toThrow('Command failed: Unknown error');
    });
  });

  describe('API Response Transformation', () => {
    it('should transform VM response correctly', async () => {
      const rawVM = {
        id: '1',
        name: 'Test VM',
        status: 'running',
        template: 'ubuntu',
        cpus: 2,
        memory: 4096,
        disk_size: 64,
        ip_address: '192.168.1.100',
        port_forwards: [{ guest_port: 22, host_port: 2222 }],
        mounts: [{ guest_path: '/tmp', host_path: '/tmp/host' }],
        environment_variables: { DEBUG: 'true' },
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
      };

      const expectedVM: VM = {
        id: '1',
        name: 'Test VM',
        status: 'Running',
        template: 'ubuntu',
        cpus: 2,
        memory: 4096,
        disk: 64,
        ip: '192.168.1.100',
        portForwards: [{ port: 22, hostPort: 2222 }],
        mounts: [{ mountPoint: '/tmp', hostPath: '/tmp/host' }],
        envVars: { DEBUG: 'true' },
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
      };

      mockInvoke.mockResolvedValue([rawVM]);

      const result = await vmApi.getVMs();

      // The API should transform the response
      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject(expectedVM);
    });

    it('should handle empty responses gracefully', async () => {
      mockInvoke.mockResolvedValue([]);

      const result = await vmApi.getVMs();

      expect(result).toEqual([]);
      expect(Array.isArray(result)).toBe(true);
    });

    it('should handle null responses', async () => {
      mockInvoke.mockResolvedValue(null);

      const result = await vmApi.getVMLogs('1');

      expect(result).toEqual([]);
    });
  });

  describe('API Caching', () => {
    it('should cache VM list for appropriate duration', async () => {
      const mockVMs = [{ id: '1', name: 'Test VM', status: 'Running' as const }];
      mockInvoke.mockResolvedValue(mockVMs);

      // First call
      const result1 = await vmApi.getVMs();
      expect(mockInvoke).toHaveBeenCalledTimes(1);

      // Immediate second call should use cache
      const result2 = await vmApi.getVMs();
      expect(mockInvoke).toHaveBeenCalledTimes(1); // Still only called once

      expect(result1).toEqual(result2);
    });

    it('should bypass cache when force refresh is requested', async () => {
      const mockVMs = [{ id: '1', name: 'Test VM', status: 'Running' as const }];
      mockInvoke.mockResolvedValue(mockVMs);

      // First call
      await vmApi.getVMs();
      expect(mockInvoke).toHaveBeenCalledTimes(1);

      // Force refresh
      await vmApi.getVMs(true);
      expect(mockInvoke).toHaveBeenCalledTimes(2); // Called again
    });
  });
});