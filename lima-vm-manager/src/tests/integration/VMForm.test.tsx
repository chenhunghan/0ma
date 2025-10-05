import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { VMForm } from '../../components/vm-management';
import * as vmApi from '../../services/api/vm-api';
import * as systemApi from '../../services/api/system-api';
import type { VMTemplate } from '../../types';

// Mock the APIs
jest.mock('../../services/api/vm-api');
jest.mock('../../services/api/system-api');

const mockVmApi = vmApi as jest.Mocked<typeof vmApi>;
const mockSystemApi = systemApi as jest.Mocked<typeof systemApi>;

// Mock UI components
jest.mock('../../components/ui', () => ({
  Button: ({ children, onClick, disabled, loading, ...props }: any) => (
    <button onClick={onClick} disabled={disabled || loading} {...props}>
      {loading ? 'Loading...' : children}
    </button>
  ),
  Input: ({ value, onChange, error, ...props }: any) => (
    <div>
      <input value={value} onChange={(e) => onChange(e.target.value)} {...props} />
      {error && <span className="error">{error}</span>}
    </div>
  ),
  Select: ({ value, onChange, options, ...props }: any) => (
    <select value={value} onChange={(e) => onChange(e.target.value)} {...props}>
      {options.map((opt: any) => (
        <option key={opt.value} value={opt.value}>{opt.label}</option>
      ))}
    </select>
  ),
  Card: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  Modal: ({ open, onClose, children, ...props }: any) =>
    open ? <div role="dialog" {...props}>{children}</div> : null,
}));

const mockTemplates: VMTemplate[] = [
  {
    id: 'ubuntu',
    name: 'Ubuntu 22.04',
    description: 'Ubuntu LTS with basic tools',
    defaultCpus: 2,
    defaultMemory: 4096,
    defaultDisk: 64,
    defaultPorts: [{ port: 22 }, { port: 80 }],
    defaultMounts: [{ mountPoint: '/tmp' }],
    supportedActions: ['start', 'stop', 'restart'],
    category: 'development',
  },
  {
    id: 'alpine',
    name: 'Alpine Linux',
    description: 'Lightweight Linux distribution',
    defaultCpus: 1,
    defaultMemory: 2048,
    defaultDisk: 32,
    supportedActions: ['start', 'stop', 'restart'],
    category: 'development',
  },
];

describe('VMForm Component', () => {
  const defaultProps = {
    open: true,
    onClose: jest.fn(),
    onSuccess: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockSystemApi.getSystemInfo.mockResolvedValue({
      totalMemory: 16384,
      availableMemory: 8192,
      totalCpuCores: 8,
      availableCpuCores: 4,
      diskSpace: { total: 500000, available: 250000, used: 250000 },
    });
    mockVmApi.getVMTemplates.mockResolvedValue(mockTemplates);
  });

  it('renders form with basic fields', async () => {
    render(<VMForm {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByText('Create Virtual Machine')).toBeInTheDocument();
      expect(screen.getByLabelText(/vm name/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/template/i)).toBeInTheDocument();
    });
  });

  it('loads and displays templates', async () => {
    render(<VMForm {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByText('Ubuntu 22.04')).toBeInTheDocument();
      expect(screen.getByText('Alpine Linux')).toBeInTheDocument();
    });
  });

  it('populates form fields when template is selected', async () => {
    render(<VMForm {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByText('Ubuntu 22.04')).toBeInTheDocument();
    });

    const templateSelect = screen.getByLabelText(/template/i);
    fireEvent.change(templateSelect, { target: { value: 'ubuntu' } });

    await waitFor(() => {
      expect(screen.getByDisplayValue('2')).toBeInTheDocument(); // Default CPUs
      expect(screen.getByDisplayValue('4096')).toBeInTheDocument(); // Default memory
      expect(screen.getByDisplayValue('64')).toBeInTheDocument(); // Default disk
    });
  });

  it('validates required fields', async () => {
    render(<VMForm {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByText('Create Virtual Machine')).toBeInTheDocument();
    });

    const submitButton = screen.getByText('Create VM');
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText(/vm name is required/i)).toBeInTheDocument();
    });
  });

  it('submits form with valid data', async () => {
    mockVmApi.createVM.mockResolvedValue({
      id: 'new-vm',
      name: 'Test VM',
      status: 'Stopped',
      template: 'ubuntu',
      cpus: 2,
      memory: 4096,
      disk: 64,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    render(<VMForm {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByLabelText(/vm name/i)).toBeInTheDocument();
    });

    // Fill required fields
    fireEvent.change(screen.getByLabelText(/vm name/i), {
      target: { value: 'Test VM' },
    });

    fireEvent.change(screen.getByLabelText(/template/i), {
      target: { value: 'ubuntu' },
    });

    const submitButton = screen.getByText('Create VM');
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(mockVmApi.createVM).toHaveBeenCalledWith({
        name: 'Test VM',
        template: 'ubuntu',
        cpus: 2,
        memory: 4096,
        disk: 64,
        portForwards: [{ port: 22 }, { port: 80 }],
        mounts: [{ mountPoint: '/tmp', hostPath: '/tmp' }],
        envVars: {},
      });
    });

    expect(defaultProps.onSuccess).toHaveBeenCalled();
    expect(defaultProps.onClose).toHaveBeenCalled();
  });

  it('handles edit mode', async () => {
    const editingVM = {
      id: 'existing-vm',
      name: 'Existing VM',
      status: 'Running' as const,
      template: 'alpine',
      cpus: 1,
      memory: 2048,
      disk: 32,
      portForwards: [{ port: 22, hostPort: 2222 }],
      mounts: [{ mountPoint: '/data', hostPath: '/host/data' }],
      envVars: { DEBUG: 'true' },
      createdAt: '2024-01-01T00:00:00Z',
      updatedAt: '2024-01-01T00:00:00Z',
    };

    mockVmApi.updateVM.mockResolvedValue(editingVM);

    render(<VMForm {...defaultProps} vmId="existing-vm" />);

    await waitFor(() => {
      expect(screen.getByDisplayValue('Existing VM')).toBeInTheDocument();
      expect(screen.getByDisplayValue('1')).toBeInTheDocument();
      expect(screen.getByDisplayValue('2048')).toBeInTheDocument();
      expect(screen.getByDisplayValue('32')).toBeInTheDocument();
    });

    // Modify a field
    fireEvent.change(screen.getByLabelText(/vm name/i), {
      target: { value: 'Updated VM' },
    });

    const submitButton = screen.getByText('Update VM');
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(mockVmApi.updateVM).toHaveBeenCalledWith('existing-vm', {
        name: 'Updated VM',
        template: 'alpine',
        cpus: 1,
        memory: 2048,
        disk: 32,
        portForwards: [{ port: 22, hostPort: 2222 }],
        mounts: [{ mountPoint: '/data', hostPath: '/host/data' }],
        envVars: { DEBUG: 'true' },
      });
    });
  });

  it('handles port forwarding management', async () => {
    render(<VMForm {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByText('Create Virtual Machine')).toBeInTheDocument();
    });

    // Fill basic form
    fireEvent.change(screen.getByLabelText(/vm name/i), {
      target: { value: 'Test VM' },
    });

    fireEvent.change(screen.getByLabelText(/template/i), {
      target: { value: 'ubuntu' },
    });

    // Add a new port forward
    const addButton = screen.getByText(/add port forward/i);
    fireEvent.click(addButton);

    const portInput = screen.getByPlaceholderText(/port/i);
    fireEvent.change(portInput, { target: { value: '3000' } });

    const hostPortInput = screen.getByPlaceholderText(/host port/i);
    fireEvent.change(hostPortInput, { target: { value: '3333' } });

    const submitButton = screen.getByText('Create VM');
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(mockVmApi.createVM).toHaveBeenCalledWith(
        expect.objectContaining({
          portForwards: expect.arrayContaining([
            { port: 22 },
            { port: 80 },
            { port: 3000, hostPort: 3333 },
          ]),
        })
      );
    });
  });

  it('handles mount points management', async () => {
    render(<VMForm {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByText('Create Virtual Machine')).toBeInTheDocument();
    });

    // Fill basic form
    fireEvent.change(screen.getByLabelText(/vm name/i), {
      target: { value: 'Test VM' },
    });

    fireEvent.change(screen.getByLabelText(/template/i), {
      target: { value: 'ubuntu' },
    });

    // Add a new mount point
    const addMountButton = screen.getByText(/add mount/i);
    fireEvent.click(addMountButton);

    const mountPointInput = screen.getByPlaceholderText(/mount point/i);
    fireEvent.change(mountPointInput, { target: { value: '/app' } });

    const hostPathInput = screen.getByPlaceholderText(/host path/i);
    fireEvent.change(hostPathInput, { target: { value: '/host/app' } });

    const submitButton = screen.getByText('Create VM');
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(mockVmApi.createVM).toHaveBeenCalledWith(
        expect.objectContaining({
          mounts: expect.arrayContaining([
            { mountPoint: '/tmp', hostPath: '/tmp' },
            { mountPoint: '/app', hostPath: '/host/app' },
          ]),
        })
      );
    });
  });

  it('handles environment variables management', async () => {
    render(<VMForm {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByText('Create Virtual Machine')).toBeInTheDocument();
    });

    // Fill basic form
    fireEvent.change(screen.getByLabelText(/vm name/i), {
      target: { value: 'Test VM' },
    });

    fireEvent.change(screen.getByLabelText(/template/i), {
      target: { value: 'ubuntu' },
    });

    // Add environment variable
    const addEnvButton = screen.getByText(/add environment variable/i);
    fireEvent.click(addEnvButton);

    const keyInput = screen.getByPlaceholderText(/key/i);
    fireEvent.change(keyInput, { target: { value: 'NODE_ENV' } });

    const valueInput = screen.getByPlaceholderText(/value/i);
    fireEvent.change(valueInput, { target: { value: 'development' } });

    const submitButton = screen.getByText('Create VM');
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(mockVmApi.createVM).toHaveBeenCalledWith(
        expect.objectContaining({
          envVars: {
            NODE_ENV: 'development',
          },
        })
      );
    });
  });

  it('validates resource limits', async () => {
    mockSystemApi.getSystemInfo.mockResolvedValue({
      totalMemory: 4096,
      availableMemory: 2048,
      totalCpuCores: 2,
      availableCpuCores: 1,
      diskSpace: { total: 10000, available: 5000, used: 5000 },
    });

    render(<VMForm {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByText('Create Virtual Machine')).toBeInTheDocument();
    });

    // Try to exceed available memory
    fireEvent.change(screen.getByLabelText(/vm name/i), {
      target: { value: 'Test VM' },
    });

    fireEvent.change(screen.getByLabelText(/template/i), {
      target: { value: 'ubuntu' },
    });

    const memoryInput = screen.getByLabelText(/memory \(mb\)/i);
    fireEvent.change(memoryInput, { target: { value: '8192' } }); // Exceeds available

    const submitButton = screen.getByText('Create VM');
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText(/memory exceeds available/i)).toBeInTheDocument();
    });
  });

  it('handles form cancellation', async () => {
    render(<VMForm {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByText('Create Virtual Machine')).toBeInTheDocument();
    });

    const cancelButton = screen.getByText('Cancel');
    fireEvent.click(cancelButton);

    expect(defaultProps.onClose).toHaveBeenCalledTimes(1);
  });
});