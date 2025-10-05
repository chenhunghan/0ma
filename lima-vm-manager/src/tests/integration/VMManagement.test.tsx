import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { VMList } from '../../components/vm-management';
import * as vmApi from '../../services/api/vm-api';
import type { VM } from '../../types';

// Mock the VM API
jest.mock('../../services/api/vm-api');
const mockVmApi = vmApi as jest.Mocked<typeof vmApi>;

// Mock react-router-dom
jest.mock('react-router-dom', () => ({
  useNavigate: () => jest.fn(),
}));

// Mock child components
jest.mock('../../components/ui', () => ({
  Button: ({ children, onClick, disabled, loading, ...props }: any) => (
    <button onClick={onClick} disabled={disabled || loading} {...props}>
      {loading ? 'Loading...' : children}
    </button>
  ),
  Input: ({ value, onChange, ...props }: any) => (
    <input value={value} onChange={(e) => onChange(e.target.value)} {...props} />
  ),
  Badge: ({ children, variant, ...props }: any) => (
    <span className={`badge-${variant}`} {...props}>{children}</span>
  ),
  Card: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  Modal: ({ open, onClose, children, ...props }: any) =>
    open ? <div role="dialog" {...props}>{children}</div> : null,
  AlertModal: ({ open, onClose, onConfirm, ...props }: any) =>
    open ? (
      <div role="dialog">
        <button onClick={onClose}>Cancel</button>
        <button onClick={onConfirm}>Confirm</button>
      </div>
    ) : null,
  Table: ({ children, ...props }: any) => <table {...props}>{children}</table>,
  Loading: ({ children, ...props }: any) => <div {...props}>{children}</div>,
}));

const mockVMs: VM[] = [
  {
    id: '1',
    name: 'Test VM 1',
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
    name: 'Test VM 2',
    status: 'Stopped',
    template: 'alpine',
    cpus: 1,
    memory: 2048,
    disk: 32,
    createdAt: '2024-01-02T00:00:00Z',
    updatedAt: '2024-01-02T00:00:00Z',
  },
];

describe('VMList Component', () => {
  const defaultProps = {
    onCreateVM: jest.fn(),
    onEditVM: jest.fn(),
    onViewDetails: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockVmApi.getVMs.mockResolvedValue(mockVMs);
  });

  it('renders VM list correctly', async () => {
    render(<VMList {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByText('Test VM 1')).toBeInTheDocument();
      expect(screen.getByText('Test VM 2')).toBeInTheDocument();
    });

    expect(screen.getByText('Running')).toBeInTheDocument();
    expect(screen.getByText('Stopped')).toBeInTheDocument();
  });

  it('displays loading state initially', () => {
    mockVmApi.getVMs.mockImplementation(() => new Promise(() => {}));

    render(<VMList {...defaultProps} />);
    expect(screen.getByText('Loading VMs...')).toBeInTheDocument();
  });

  it('handles search functionality', async () => {
    render(<VMList {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByText('Test VM 1')).toBeInTheDocument();
    });

    const searchInput = screen.getByPlaceholderText(/search vms/i);
    fireEvent.change(searchInput, { target: { value: 'Test VM 1' } });

    await waitFor(() => {
      expect(screen.getByText('Test VM 1')).toBeInTheDocument();
      expect(screen.queryByText('Test VM 2')).not.toBeInTheDocument();
    });
  });

  it('handles filter by status', async () => {
    render(<VMList {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByText('Test VM 1')).toBeInTheDocument();
    });

    const statusFilter = screen.getByLabelText(/filter by status/i);
    fireEvent.change(statusFilter, { target: { value: 'Running' } });

    await waitFor(() => {
      expect(screen.getByText('Test VM 1')).toBeInTheDocument();
      expect(screen.queryByText('Test VM 2')).not.toBeInTheDocument();
    });
  });

  it('handles VM selection for bulk actions', async () => {
    render(<VMList {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByText('Test VM 1')).toBeInTheDocument();
    });

    const checkboxes = screen.getAllByRole('checkbox');
    fireEvent.click(checkboxes[1]); // Select first VM

    expect(checkboxes[1]).toBeChecked();
    expect(screen.getByText(/selected/i)).toBeInTheDocument();
  });

  it('handles VM actions', async () => {
    mockVmApi.startVM.mockResolvedValue(undefined);

    render(<VMList {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByText('Test VM 1')).toBeInTheDocument();
    });

    const startButton = screen.getByTitle(/start vm/i);
    fireEvent.click(startButton);

    await waitFor(() => {
      expect(mockVmApi.startVM).toHaveBeenCalledWith('1');
    });
  });

  it('handles create VM button', async () => {
    render(<VMList {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByText('Create VM')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Create VM'));
    expect(defaultProps.onCreateVM).toHaveBeenCalledTimes(1);
  });

  it('handles edit VM action', async () => {
    render(<VMList {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByText('Test VM 1')).toBeInTheDocument();
    });

    const editButton = screen.getByTitle(/edit vm/i);
    fireEvent.click(editButton);

    expect(defaultProps.onEditVM).toHaveBeenCalledWith(mockVMs[0]);
  });

  it('handles view details action', async () => {
    render(<VMList {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByText('Test VM 1')).toBeInTheDocument();
    });

    const detailsButton = screen.getByTitle(/view details/i);
    fireEvent.click(detailsButton);

    expect(defaultProps.onViewDetails).toHaveBeenCalledWith(mockVMs[0]);
  });

  it('displays error state when API fails', async () => {
    mockVmApi.getVMs.mockRejectedValue(new Error('Failed to load VMs'));

    render(<VMList {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByText(/failed to load vms/i)).toBeInTheDocument();
    });
  });

  it('handles refresh action', async () => {
    render(<VMList {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByText('Test VM 1')).toBeInTheDocument();
    });

    const refreshButton = screen.getByTitle(/refresh/i);
    fireEvent.click(refreshButton);

    await waitFor(() => {
      expect(mockVmApi.getVMs).toHaveBeenCalledTimes(2);
    });
  });

  it('handles sorting functionality', async () => {
    render(<VMList {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByText('Test VM 1')).toBeInTheDocument();
    });

    const nameHeader = screen.getByText(/name/i);
    fireEvent.click(nameHeader);

    // Should trigger re-render with sorted data
    await waitFor(() => {
      expect(mockVmApi.getVMs).toHaveBeenCalled();
    });
  });
});