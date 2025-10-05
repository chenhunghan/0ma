import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { DashboardPage } from '../../components/dashboard';
import * as vmApi from '../../services/api/vm-api';
import * as systemApi from '../../services/api/system-api';
import type { VM } from '../../types';

// Mock the APIs
jest.mock('../../services/api/vm-api');
jest.mock('../../services/api/system-api');

const mockVmApi = vmApi as jest.Mocked<typeof vmApi>;
const mockSystemApi = systemApi as jest.Mocked<typeof systemApi>;

// Mock react-router-dom
jest.mock('react-router-dom', () => ({
  useNavigate: () => jest.fn(),
}));

// Mock UI components
jest.mock('../../components/ui', () => ({
  Button: ({ children, onClick, ...props }: any) => (
    <button onClick={onClick} {...props}>{children}</button>
  ),
  Card: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  Badge: ({ children, variant, ...props }: any) => (
    <span className={`badge-${variant}`} {...props}>{children}</span>
  ),
  Progress: ({ value, max, ...props }: any) => (
    <div role="progressbar" aria-valuenow={value} aria-valuemax={max} {...props}>
      {Math.round((value / max) * 100)}%
    </div>
  ),
  Loading: ({ children, ...props }: any) => <div {...props}>{children}</div>,
}));

const mockVMs: VM[] = [
  {
    id: '1',
    name: 'Development VM',
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
  },
  {
    id: '2',
    name: 'Testing VM',
    status: 'Stopped',
    template: 'alpine',
    cpus: 1,
    memory: 2048,
    disk: 32,
    createdAt: '2024-01-02T00:00:00Z',
    updatedAt: '2024-01-02T00:00:00Z',
  },
  {
    id: '3',
    name: 'Production VM',
    status: 'Running',
    template: 'ubuntu',
    cpus: 4,
    memory: 8192,
    disk: 128,
    ip: '192.168.1.102',
    createdAt: '2024-01-03T00:00:00Z',
    updatedAt: '2024-01-03T00:00:00Z',
  },
];

const mockSystemInfo = {
  totalMemory: 16384,
  availableMemory: 6144,
  totalCpuCores: 8,
  availableCpuCores: 2,
  diskSpace: {
    total: 500000,
    available: 200000,
    used: 300000,
  },
};

describe('DashboardPage Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockVmApi.getVMs.mockResolvedValue(mockVMs);
    mockSystemApi.getSystemInfo.mockResolvedValue(mockSystemInfo);
    mockSystemApi.getCliToolStatus.mockResolvedValue({
      lima: { installed: true, version: '1.0.0', path: '/usr/local/bin/lima' },
      qemu: { installed: true, version: '8.0.0', path: '/usr/local/bin/qemu' },
      podman: { installed: false, version: null, path: null },
    });
  });

  it('renders dashboard with overview stats', async () => {
    render(<DashboardPage />);

    await waitFor(() => {
      expect(screen.getByText('Dashboard')).toBeInTheDocument();
      expect(screen.getByText('3')).toBeInTheDocument(); // Total VMs
      expect(screen.getByText('2')).toBeInTheDocument(); // Running VMs
      expect(screen.getByText('1')).toBeInTheDocument(); // Stopped VMs
    });
  });

  it('displays system resource information', async () => {
    render(<DashboardPage />);

    await waitFor(() => {
      expect(screen.getByText(/memory usage/i)).toBeInTheDocument();
      expect(screen.getByText(/cpu usage/i)).toBeInTheDocument();
      expect(screen.getByText(/disk usage/i)).toBeInTheDocument();
    });

    // Check memory display
    expect(screen.getByText(/10\.25\s*gb/i)).toBeInTheDocument(); // Used memory
    expect(screen.getByText(/6\s*gb/i)).toBeInTheDocument(); // Available memory

    // Check CPU display
    expect(screen.getByText(/6\s*cores/i)).toBeInTheDocument(); // Used CPUs
    expect(screen.getByText(/2\s*cores/i)).toBeInTheDocument(); // Available CPUs

    // Check disk display
    expect(screen.getByText(/292\.97\s*gb/i)).toBeInTheDocument(); // Used disk
    expect(screen.getByText(/195\.31\s*gb/i)).toBeInTheDocument(); // Available disk
  });

  it('displays VM status breakdown', async () => {
    render(<DashboardPage />);

    await waitFor(() => {
      expect(screen.getByText('Development VM')).toBeInTheDocument();
      expect(screen.getByText('Testing VM')).toBeInTheDocument();
      expect(screen.getByText('Production VM')).toBeInTheDocument();
    });

    // Check status badges
    expect(screen.getByText('Running')).toBeInTheDocument();
    expect(screen.getByText('Stopped')).toBeInTheDocument();
  });

  it('displays CLI tools status', async () => {
    render(<DashboardPage />);

    await waitFor(() => {
      expect(screen.getByText(/cli tools status/i)).toBeInTheDocument();
      expect(screen.getByText('lima')).toBeInTheDocument();
      expect(screen.getByText('qemu')).toBeInTheDocument();
      expect(screen.getByText('podman')).toBeInTheDocument();
    });

    // Check status indicators
    expect(screen.getByText(/1\.0\.0/i)).toBeInTheDocument(); // Lima version
    expect(screen.getByText(/8\.0\.0/i)).toBeInTheDocument(); // QEMU version
    expect(screen.getByText(/not installed/i)).toBeInTheDocument(); // Podman status
  });

  it('handles quick actions for VM management', async () => {
    mockVmApi.startVM.mockResolvedValue(undefined);
    mockVmApi.stopVM.mockResolvedValue(undefined);

    render(<DashboardPage />);

    await waitFor(() => {
      expect(screen.getByText('Testing VM')).toBeInTheDocument();
    });

    // Start a VM
    const startButton = screen.getByTitle(/start testing vm/i);
    fireEvent.click(startButton);

    await waitFor(() => {
      expect(mockVmApi.startVM).toHaveBeenCalledWith('2');
    });

    // Stop a VM
    const stopButton = screen.getByTitle(/stop development vm/i);
    fireEvent.click(stopButton);

    await waitFor(() => {
      expect(mockVmApi.stopVM).toHaveBeenCalledWith('1');
    });
  });

  it('handles refresh action', async () => {
    render(<DashboardPage />);

    await waitFor(() => {
      expect(screen.getByText('Dashboard')).toBeInTheDocument();
    });

    const refreshButton = screen.getByTitle(/refresh dashboard/i);
    fireEvent.click(refreshButton);

    await waitFor(() => {
      expect(mockVmApi.getVMs).toHaveBeenCalledTimes(2);
      expect(mockSystemApi.getSystemInfo).toHaveBeenCalledTimes(2);
      expect(mockSystemApi.getCliToolStatus).toHaveBeenCalledTimes(2);
    });
  });

  it('handles create VM quick action', async () => {
    const mockNavigate = jest.fn();
    jest.doMock('react-router-dom', () => ({
      useNavigate: () => mockNavigate,
    }));

    render(<DashboardPage />);

    await waitFor(() => {
      expect(screen.getByText('Dashboard')).toBeInTheDocument();
    });

    const createVMButton = screen.getByText('Create VM');
    fireEvent.click(createVMButton);

    // Would navigate to VM creation page
    expect(mockNavigate).toHaveBeenCalledWith('/vms?action=create');
  });

  it('handles view all VMs action', async () => {
    const mockNavigate = jest.fn();
    jest.doMock('react-router-dom', () => ({
      useNavigate: () => mockNavigate,
    }));

    render(<DashboardPage />);

    await waitFor(() => {
      expect(screen.getByText('Dashboard')).toBeInTheDocument();
    });

    const viewAllButton = screen.getByText('View All VMs');
    fireEvent.click(viewAllButton);

    expect(mockNavigate).toHaveBeenCalledWith('/vms');
  });

  it('displays loading state initially', () => {
    mockVmApi.getVMs.mockImplementation(() => new Promise(() => {}));
    mockSystemApi.getSystemInfo.mockImplementation(() => new Promise(() => {}));

    render(<DashboardPage />);

    expect(screen.getByText('Loading dashboard...')).toBeInTheDocument();
  });

  it('displays error state when data loading fails', async () => {
    mockVmApi.getVMs.mockRejectedValue(new Error('Failed to load VMs'));

    render(<DashboardPage />);

    await waitFor(() => {
      expect(screen.getByText(/failed to load dashboard data/i)).toBeInTheDocument();
    });
  });

  it('handles partial data loading gracefully', async () => {
    // VM API fails but system info succeeds
    mockVmApi.getVMs.mockRejectedValue(new Error('VM API Error'));
    mockSystemApi.getSystemInfo.mockResolvedValue(mockSystemInfo);

    render(<DashboardPage />);

    await waitFor(() => {
      expect(screen.getByText(/failed to load vms/i)).toBeInTheDocument();
      // But system info should still display
      expect(screen.getByText(/memory usage/i)).toBeInTheDocument();
    });
  });

  it('updates resource usage indicators correctly', async () => {
    render(<DashboardPage />);

    await waitFor(() => {
      // Memory usage: (16384 - 6144) / 16384 = 62.5%
      expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '62.5');
    });
  });

  it('displays VM resource allocations', async () => {
    render(<DashboardPage />);

    await waitFor(() => {
      // Check VM resource display
      expect(screen.getByText(/2\s*cpus/i)).toBeInTheDocument(); // Development VM
      expect(screen.getByText(/4\s*gb/i)).toBeInTheDocument(); // Development VM memory
      expect(screen.getByText(/64\s*gb/i)).toBeInTheDocument(); // Development VM disk

      expect(screen.getByText(/4\s*cpus/i)).toBeInTheDocument(); // Production VM
      expect(screen.getByText(/8\s*gb/i)).toBeInTheDocument(); // Production VM memory
    });
  });

  it('handles VM navigation actions', async () => {
    const mockNavigate = jest.fn();
    jest.doMock('react-router-dom', () => ({
      useNavigate: () => mockNavigate,
    }));

    render(<DashboardPage />);

    await waitFor(() => {
      expect(screen.getByText('Development VM')).toBeInTheDocument();
    });

    // Click on VM name to view details
    const vmLink = screen.getByText('Development VM');
    fireEvent.click(vmLink);

    expect(mockNavigate).toHaveBeenCalledWith('/vms/1');
  });

  it('displays recent activity timeline', async () => {
    render(<DashboardPage />);

    await waitFor(() => {
      expect(screen.getByText(/recent activity/i)).toBeInTheDocument();
    });

    // Should show VM creation dates
    expect(screen.getByText(/2024-01-03/)).toBeInTheDocument(); // Production VM
    expect(screen.getByText(/2024-01-02/)).toBeInTheDocument(); // Testing VM
    expect(screen.getByText(/2024-01-01/)).toBeInTheDocument(); // Development VM
  });

  it('handles automatic refresh interval', async () => {
    jest.useFakeTimers();

    render(<DashboardPage />);

    await waitFor(() => {
      expect(mockVmApi.getVMs).toHaveBeenCalledTimes(1);
    });

    // Fast-forward 30 seconds (refresh interval)
    jest.advanceTimersByTime(30000);

    await waitFor(() => {
      expect(mockVmApi.getVMs).toHaveBeenCalledTimes(2);
    });

    jest.useRealTimers();
  });

  it('calculates total resource usage correctly', async () => {
    render(<DashboardPage />);

    await waitFor(() => {
      // Total CPUs in use: 2 (Dev) + 4 (Prod) = 6
      expect(screen.getByText(/6.*cpus.*in use/i)).toBeInTheDocument();

      // Total memory in use: 4096 + 8192 = 12288 MB = 12 GB
      expect(screen.getByText(/12.*gb.*in use/i)).toBeInTheDocument();

      // Total disk in use: 64 + 128 = 192 GB (excluding Testing VM since it's stopped)
      expect(screen.getByText(/192.*gb.*in use/i)).toBeInTheDocument();
    });
  });
});