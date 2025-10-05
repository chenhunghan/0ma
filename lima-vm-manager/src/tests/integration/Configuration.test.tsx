import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { ConfigurationPage } from '../../components/configuration';
import * as configApi from '../../services/api/config-api';
import * as systemApi from '../../services/api/system-api';
import type { Config } from '../../types';

// Mock the APIs
jest.mock('../../services/api/config-api');
jest.mock('../../services/api/system-api');

const mockConfigApi = configApi as jest.Mocked<typeof configApi>;
const mockSystemApi = systemApi as jest.Mocked<typeof systemApi>;

// Mock UI components
jest.mock('../../components/ui', () => ({
  Button: ({ children, onClick, disabled, ...props }: any) => (
    <button onClick={onClick} disabled={disabled} {...props}>
      {children}
    </button>
  ),
  Input: ({ value, onChange, ...props }: any) => (
    <input value={value} onChange={(e) => onChange(e.target.value)} {...props} />
  ),
  Select: ({ value, onChange, options, ...props }: any) => (
    <select value={value} onChange={(e) => onChange(e.target.value)} {...props}>
      {options.map((opt: any) => (
        <option key={opt.value} value={opt.value}>{opt.label}</option>
      ))}
    </select>
  ),
  Checkbox: ({ checked, onChange, ...props }: any) => (
    <input
      type="checkbox"
      checked={checked}
      onChange={(e) => onChange(e.target.checked)}
      {...props}
    />
  ),
  Card: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  Tabs: ({ children, activeTab, onTabChange, ...props }: any) => (
    <div {...props}>
      {children.map((child: any, index: number) => (
        <button
          key={index}
          onClick={() => onTabChange(index)}
          style={{ opacity: activeTab === index ? 1 : 0.5 }}
        >
          Tab {index + 1}
        </button>
      ))}
      {children[activeTab]}
    </div>
  ),
  AlertModal: ({ open, onClose, onConfirm, ...props }: any) =>
    open ? (
      <div role="dialog">
        <button onClick={onClose}>Cancel</button>
        <button onClick={onConfirm}>Confirm</button>
      </div>
    ) : null,
}));

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

describe('ConfigurationPage Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockConfigApi.getConfig.mockResolvedValue(mockConfig);
    mockConfigApi.saveConfig.mockResolvedValue(mockConfig);
    mockSystemApi.getSystemInfo.mockResolvedValue({
      totalMemory: 16384,
      availableMemory: 8192,
      totalCpuCores: 8,
      availableCpuCores: 4,
      diskSpace: { total: 500000, available: 250000, used: 250000 },
    });
  });

  it('renders configuration page with tabs', async () => {
    render(<ConfigurationPage />);

    await waitFor(() => {
      expect(screen.getByText('Configuration')).toBeInTheDocument();
      expect(screen.getByText(/general/i)).toBeInTheDocument();
      expect(screen.getByText(/vm settings/i)).toBeInTheDocument();
      expect(screen.getByText(/cli tools/i)).toBeInTheDocument();
      expect(screen.getByText(/advanced/i)).toBeInTheDocument();
    });
  });

  it('loads and displays current configuration', async () => {
    render(<ConfigurationPage />);

    await waitFor(() => {
      expect(screen.getByDisplayValue('light')).toBeInTheDocument();
      expect(screen.getByDisplayValue('info')).toBeInTheDocument();
      expect(screen.getByDisplayValue('2')).toBeInTheDocument();
      expect(screen.getByDisplayValue('4096')).toBeInTheDocument();
    });
  });

  it('handles general settings changes', async () => {
    render(<ConfigurationPage />);

    await waitFor(() => {
      expect(screen.getByDisplayValue('light')).toBeInTheDocument();
    });

    // Change theme
    const themeSelect = screen.getByLabelText(/theme/i);
    fireEvent.change(themeSelect, { target: { value: 'dark' } });

    // Toggle auto-start
    const autoStartCheckbox = screen.getByLabelText(/auto start/i);
    fireEvent.click(autoStartCheckbox);

    // Save changes
    const saveButton = screen.getByText('Save Changes');
    fireEvent.click(saveButton);

    await waitFor(() => {
      expect(mockConfigApi.saveConfig).toHaveBeenCalledWith(
        expect.objectContaining({
          general: expect.objectContaining({
            theme: 'dark',
            autoStart: true,
          }),
        })
      );
    });
  });

  it('handles VM settings changes', async () => {
    render(<ConfigurationPage />);

    await waitFor(() => {
      expect(screen.getByDisplayValue('2')).toBeInTheDocument();
    });

    // Navigate to VM settings tab
    const vmTab = screen.getByText(/vm settings/i);
    fireEvent.click(vmTab);

    await waitFor(() => {
      expect(screen.getByDisplayValue('2')).toBeInTheDocument();
    });

    // Change default CPUs
    const cpusInput = screen.getByLabelText(/default cpus/i);
    fireEvent.change(cpusInput, { target: { value: '4' } });

    // Change default memory
    const memoryInput = screen.getByLabelText(/default memory/i);
    fireEvent.change(memoryInput, { target: { value: '8192' } });

    // Save changes
    const saveButton = screen.getByText('Save Changes');
    fireEvent.click(saveButton);

    await waitFor(() => {
      expect(mockConfigApi.saveConfig).toHaveBeenCalledWith(
        expect.objectContaining({
          vm: expect.objectContaining({
            defaultCpus: 4,
            defaultMemory: 8192,
          }),
        })
      );
    });
  });

  it('handles CLI tools settings', async () => {
    render(<ConfigurationPage />);

    await waitFor(() => {
      expect(screen.getByText('Configuration')).toBeInTheDocument();
    });

    // Navigate to CLI tools tab
    const cliTab = screen.getByText(/cli tools/i);
    fireEvent.click(cliTab);

    await waitFor(() => {
      expect(screen.getByText('lima')).toBeInTheDocument();
      expect(screen.getByText('qemu')).toBeInTheDocument();
      expect(screen.getByText('podman')).toBeInTheDocument();
    });

    // Toggle Podman enabled
    const podmanCheckbox = screen.getByLabelText(/podman/i);
    fireEvent.click(podmanCheckbox);

    // Save changes
    const saveButton = screen.getByText('Save Changes');
    fireEvent.click(saveButton);

    await waitFor(() => {
      expect(mockConfigApi.saveConfig).toHaveBeenCalledWith(
        expect.objectContaining({
          cliTools: expect.objectContaining({
            podman: expect.objectContaining({
              enabled: true,
            }),
          }),
        })
      );
    });
  });

  it('handles advanced settings changes', async () => {
    render(<ConfigurationPage />);

    await waitFor(() => {
      expect(screen.getByText('Configuration')).toBeInTheDocument();
    });

    // Navigate to advanced tab
    const advancedTab = screen.getByText(/advanced/i);
    fireEvent.click(advancedTab);

    await waitFor(() => {
      expect(screen.getByDisplayValue('30')).toBeInTheDocument();
    });

    // Enable debug mode
    const debugCheckbox = screen.getByLabelText(/debug mode/i);
    fireEvent.click(debugCheckbox);

    // Change API timeout
    const timeoutInput = screen.getByLabelText(/api timeout/i);
    fireEvent.change(timeoutInput, { target: { value: '60' } });

    // Save changes
    const saveButton = screen.getByText('Save Changes');
    fireEvent.click(saveButton);

    await waitFor(() => {
      expect(mockConfigApi.saveConfig).toHaveBeenCalledWith(
        expect.objectContaining({
          advanced: expect.objectContaining({
            debugMode: true,
            apiTimeout: 60,
          }),
        })
      );
    });
  });

  it('validates VM resource limits', async () => {
    render(<ConfigurationPage />);

    await waitFor(() => {
      expect(screen.getByText('Configuration')).toBeInTheDocument();
    });

    // Navigate to VM settings tab
    const vmTab = screen.getByText(/vm settings/i);
    fireEvent.click(vmTab);

    await waitFor(() => {
      expect(screen.getByDisplayValue('2')).toBeInTheDocument();
    });

    // Try to set invalid CPU count
    const cpusInput = screen.getByLabelText(/default cpus/i);
    fireEvent.change(cpusInput, { target: { value: '0' } });

    // Try to set invalid memory
    const memoryInput = screen.getByLabelText(/default memory/i);
    fireEvent.change(memoryInput, { target: { value: '512' } });

    const saveButton = screen.getByText('Save Changes');
    fireEvent.click(saveButton);

    await waitFor(() => {
      expect(screen.getByText(/cpus must be at least 1/i)).toBeInTheDocument();
      expect(screen.getByText(/memory must be at least 1024 mb/i)).toBeInTheDocument();
      expect(mockConfigApi.saveConfig).not.toHaveBeenCalled();
    });
  });

  it('handles configuration reset', async () => {
    render(<ConfigurationPage />);

    await waitFor(() => {
      expect(screen.getByText('Configuration')).toBeInTheDocument();
    });

    // Click reset button
    const resetButton = screen.getByText('Reset to Defaults');
    fireEvent.click(resetButton);

    // Confirm reset
    const confirmButton = screen.getByText('Confirm');
    fireEvent.click(confirmButton);

    await waitFor(() => {
      expect(mockConfigApi.resetConfig).toHaveBeenCalled();
    });
  });

  it('handles configuration import', async () => {
    const fileContent = JSON.stringify({
      general: { theme: 'dark', autoStart: true },
      vm: { defaultCpus: 4, defaultMemory: 8192 },
    });

    // Mock File API
    const file = new File([fileContent], 'config.json', { type: 'application/json' });
    const readFile = jest.fn().mockResolvedValue(fileContent);
    global.FileReader = {
      readAsText: jest.fn((f) => {
        readFile(f);
        // Simulate onload
        setTimeout(() => {
          const reader = global.FileReader;
          if (reader.onload) reader.onload({ target: { result: fileContent } } as any);
        }, 0);
      }),
    } as any;

    render(<ConfigurationPage />);

    await waitFor(() => {
      expect(screen.getByText('Configuration')).toBeInTheDocument();
    });

    // Click import button
    const importButton = screen.getByText('Import Configuration');
    fireEvent.click(importButton);

    // Mock file selection
    const fileInput = screen.getByLabelText(/import/i);
    Object.defineProperty(fileInput, 'files', {
      value: [file],
      writable: false,
    });
    fireEvent.change(fileInput);

    await waitFor(() => {
      expect(mockConfigApi.saveConfig).toHaveBeenCalledWith(
        expect.objectContaining({
          general: { theme: 'dark', autoStart: true },
          vm: { defaultCpus: 4, defaultMemory: 8192 },
        })
      );
    });
  });

  it('handles configuration export', async () => {
    // Mock Blob and URL.createObjectURL
    global.URL.createObjectURL = jest.fn(() => 'blob:mock-url');
    global.URL.revokeObjectURL = jest.fn();
    global.Blob = jest.fn((content, options) => ({ content, options })) as any;

    // Mock document.createElement and link.click
    const mockLink = {
      href: '',
      download: '',
      click: jest.fn(),
    };
    jest.spyOn(document, 'createElement').mockReturnValue(mockLink as any);

    render(<ConfigurationPage />);

    await waitFor(() => {
      expect(screen.getByText('Configuration')).toBeInTheDocument();
    });

    // Click export button
    const exportButton = screen.getByText('Export Configuration');
    fireEvent.click(exportButton);

    await waitFor(() => {
      expect(global.Blob).toHaveBeenCalledWith(
        [JSON.stringify(mockConfig, null, 2)],
        { type: 'application/json' }
      );
      expect(mockLink.click).toHaveBeenCalled();
    });
  });

  it('displays loading state', () => {
    mockConfigApi.getConfig.mockImplementation(() => new Promise(() => {}));

    render(<ConfigurationPage />);

    expect(screen.getByText('Loading configuration...')).toBeInTheDocument();
  });

  it('displays error state when config fails to load', async () => {
    mockConfigApi.getConfig.mockRejectedValue(new Error('Failed to load config'));

    render(<ConfigurationPage />);

    await waitFor(() => {
      expect(screen.getByText(/failed to load configuration/i)).toBeInTheDocument();
    });
  });

  it('shows success message when config is saved', async () => {
    render(<ConfigurationPage />);

    await waitFor(() => {
      expect(screen.getByDisplayValue('light')).toBeInTheDocument();
    });

    // Make a change
    const themeSelect = screen.getByLabelText(/theme/i);
    fireEvent.change(themeSelect, { target: { value: 'dark' } });

    // Save changes
    const saveButton = screen.getByText('Save Changes');
    fireEvent.click(saveButton);

    await waitFor(() => {
      expect(screen.getByText('Configuration saved successfully')).toBeInTheDocument();
    });
  });

  it('shows error message when save fails', async () => {
    mockConfigApi.saveConfig.mockRejectedValue(new Error('Save failed'));

    render(<ConfigurationPage />);

    await waitFor(() => {
      expect(screen.getByDisplayValue('light')).toBeInTheDocument();
    });

    // Make a change
    const themeSelect = screen.getByLabelText(/theme/i);
    fireEvent.change(themeSelect, { target: { value: 'dark' } });

    // Save changes
    const saveButton = screen.getByText('Save Changes');
    fireEvent.click(saveButton);

    await waitFor(() => {
      expect(screen.getByText(/failed to save configuration/i)).toBeInTheDocument();
    });
  });
});