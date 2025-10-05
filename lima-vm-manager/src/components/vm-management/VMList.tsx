import React, { useState, useMemo } from 'react';
import {
  Button,
  Card,
  Table,
  Badge,
  Modal,
  ConfirmModal,
  LoadingOverlay,
  Input,
} from '../ui';
import { VMStatusBadge } from '../ui/Badge';
import { useVMs } from '../../hooks/useVMs';
import { useNotifications } from '../../hooks/useNotifications';
import { formatBytes, formatMemory, getAvailableVMActions, searchVMs } from '../../utils/format';
import type { VM, VMStatus } from '../../types';

interface VMListProps {
  onCreateVM?: () => void;
  onEditVM?: (vm: VM) => void;
  onViewDetails?: (vm: VM) => void;
}

export const VMList: React.FC<VMListProps> = ({
  onCreateVM,
  onEditVM,
  onViewDetails,
}) => {
  const { vms, loading, startVM, stopVM, restartVM, deleteVM } = useVMs();
  const { showPromiseResult } = useNotifications();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStatuses, setSelectedStatuses] = useState<VMStatus[]>([]);
  const [selectedVMs, setSelectedVMs] = useState<VM[]>([]);
  const [deleteModal, setDeleteModal] = useState<{ open: boolean; vm?: VM }>({ open: false });
  const [actionModal, setActionModal] = useState<{ open: boolean; vm?: VM; action?: string }>({ open: false });

  // Filter and search VMs
  const filteredVMs = useMemo(() => {
    let filtered = searchVMs(vms, searchQuery);

    if (selectedStatuses.length > 0) {
      filtered = filtered.filter(vm => selectedStatuses.includes(vm.status));
    }

    return filtered;
  }, [vms, searchQuery, selectedStatuses]);

  // Table columns
  const columns = [
    {
      key: 'name',
      title: 'Name',
      sortable: true,
      render: (value: string, record: VM) => (
        <div className="flex items-center space-x-3">
          <div className="flex-shrink-0">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-medium ${
              record.status === 'Running' ? 'bg-success-500' :
              record.status === 'Stopped' ? 'bg-gray-500' :
              record.status === 'Error' ? 'bg-error-500' : 'bg-warning-500'
            }`}>
              {value.charAt(0).toUpperCase()}
            </div>
          </div>
          <div>
            <div className="font-medium text-gray-900 dark:text-white">{value}</div>
            <div className="text-sm text-gray-500 dark:text-gray-400">
              {record.template || 'No template'}
            </div>
          </div>
        </div>
      ),
    },
    {
      key: 'status',
      title: 'Status',
      sortable: true,
      render: (value: VMStatus) => <VMStatusBadge status={value} />,
    },
    {
      key: 'ip_address',
      title: 'IP Address',
      render: (value: string) => (
        <span className="font-mono text-sm">
          {value || <span className="text-gray-400">No IP</span>}
        </span>
      ),
    },
    {
      key: 'resources',
      title: 'Resources',
      render: (value: any, record: VM) => (
        <div className="text-sm space-y-1">
          <div className="flex items-center space-x-2">
            <span className="text-gray-500">CPU:</span>
            <span>{record.cpu_usage ? `${record.cpu_usage}%` : 'N/A'}</span>
          </div>
          <div className="flex items-center space-x-2">
            <span className="text-gray-500">Memory:</span>
            <span>{record.memory_usage ? formatMemory(record.memory_usage) : 'N/A'}</span>
          </div>
          <div className="flex items-center space-x-2">
            <span className="text-gray-500">Disk:</span>
            <span>{record.disk_usage ? formatBytes(record.disk_usage) : 'N/A'}</span>
          </div>
        </div>
      ),
    },
    {
      key: 'created_at',
      title: 'Created',
      sortable: true,
      render: (value: string) => (
        <div className="text-sm">
          {new Date(value).toLocaleDateString()}
          <div className="text-gray-500">
            {new Date(value).toLocaleTimeString()}
          </div>
        </div>
      ),
    },
    {
      key: 'actions',
      title: 'Actions',
      render: (value: any, record: VM) => {
        const actions = getAvailableVMActions(record.status);

        return (
          <div className="flex items-center space-x-2">
            <Button
              size="small"
              variant="ghost"
              onClick={() => onViewDetails?.(record)}
            >
              Details
            </Button>

            {actions.includes('start') && (
              <Button
                size="small"
                variant="primary"
                onClick={() => handleVMAction('start', record)}
              >
                Start
              </Button>
            )}

            {actions.includes('stop') && (
              <Button
                size="small"
                variant="warning"
                onClick={() => handleVMAction('stop', record)}
              >
                Stop
              </Button>
            )}

            {actions.includes('restart') && (
              <Button
                size="small"
                variant="secondary"
                onClick={() => handleVMAction('restart', record)}
              >
                Restart
              </Button>
            )}

            {actions.includes('delete') && (
              <Button
                size="small"
                variant="danger"
                onClick={() => setDeleteModal({ open: true, vm: record })}
              >
                Delete
              </Button>
            )}
          </div>
        );
      },
    },
  ];

  // Handle VM actions
  const handleVMAction = async (action: string, vm: VM) => {
    setActionModal({ open: true, vm, action });

    let actionPromise;
    let successMessage;
    let errorMessage;

    switch (action) {
      case 'start':
        actionPromise = startVM(vm.id);
        successMessage = `VM "${vm.name}" started successfully`;
        errorMessage = `Failed to start VM "${vm.name}"`;
        break;
      case 'stop':
        actionPromise = stopVM(vm.id);
        successMessage = `VM "${vm.name}" stopped successfully`;
        errorMessage = `Failed to stop VM "${vm.name}"`;
        break;
      case 'restart':
        actionPromise = restartVM(vm.id);
        successMessage = `VM "${vm.name}" restarted successfully`;
        errorMessage = `Failed to restart VM "${vm.name}"`;
        break;
      default:
        return;
    }

    const result = await showPromiseResult(
      actionPromise,
      { title: 'Success', message: successMessage },
      { title: 'Error', message: errorMessage }
    );

    setActionModal({ open: false, vm: undefined, action: undefined });
  };

  // Handle VM deletion
  const handleDeleteVM = async (vm: VM) => {
    const result = await showPromiseResult(
      deleteVM(vm.id),
      { title: 'Success', message: `VM "${vm.name}" deleted successfully` },
      { title: 'Error', message: `Failed to delete VM "${vm.name}"` }
    );

    if (result) {
      setDeleteModal({ open: false });
    }
  };

  // Handle selection
  const handleSelectAll = (selected: boolean) => {
    setSelectedVMs(selected ? [...filteredVMs] : []);
  };

  const handleSelectRow = (vm: VM, selected: boolean) => {
    setSelectedVMs(prev =>
      selected
        ? [...prev, vm]
        : prev.filter(v => v.id !== vm.id)
    );
  };

  // Status filter options
  const statusOptions = [
    { value: 'Running', label: 'Running', color: 'success' },
    { value: 'Stopped', label: 'Stopped', color: 'gray' },
    { value: 'Starting', label: 'Starting', color: 'primary' },
    { value: 'Stopping', label: 'Stopping', color: 'warning' },
    { value: 'Error', label: 'Error', color: 'error' },
    { value: 'Suspended', label: 'Suspended', color: 'warning' },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Virtual Machines
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Manage your Lima virtual machines
          </p>
        </div>
        <Button onClick={onCreateVM}>
          Create VM
        </Button>
      </div>

      {/* Filters and Search */}
      <Card>
        <div className="p-6 space-y-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <Input
                placeholder="Search VMs by name, IP, or template..."
                value={searchQuery}
                onChange={setSearchQuery}
              />
            </div>
            <div className="flex gap-2">
              {statusOptions.map((status) => (
                <Button
                  key={status.value}
                  size="small"
                  variant={selectedStatuses.includes(status.value as VMStatus) ? 'primary' : 'ghost'}
                  onClick={() => {
                    setSelectedStatuses(prev =>
                      prev.includes(status.value as VMStatus)
                        ? prev.filter(s => s !== status.value)
                        : [...prev, status.value as VMStatus]
                    );
                  }}
                >
                  {status.label}
                </Button>
              ))}
            </div>
          </div>

          {/* Selection actions */}
          {selectedVMs.length > 0 && (
            <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
              <span className="text-sm text-gray-600 dark:text-gray-400">
                {selectedVMs.length} VM{selectedVMs.length > 1 ? 's' : ''} selected
              </span>
              <div className="flex gap-2">
                <Button size="small" variant="secondary">
                  Bulk Actions
                </Button>
                <Button
                  size="small"
                  variant="ghost"
                  onClick={() => setSelectedVMs([])}
                >
                  Clear Selection
                </Button>
              </div>
            </div>
          )}
        </div>
      </Card>

      {/* VM Table */}
      <LoadingOverlay loading={loading} text="Loading VMs...">
        <Card>
          <Table
            data={filteredVMs}
            columns={columns}
            striped
            hoverable
            onRowClick={(vm) => onViewDetails?.(vm)}
            selection={{
              selectedRows: selectedVMs,
              onSelectAll: handleSelectAll,
              onSelectRow: handleSelectRow,
            }}
            empty={
              <div className="text-center py-12">
                <div className="text-gray-400 mb-4">
                  <svg className="mx-auto h-12 w-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 13h6m-3-3v6m5 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                  No virtual machines found
                </h3>
                <p className="text-gray-500 dark:text-gray-400 mb-4">
                  Get started by creating your first virtual machine.
                </p>
                <Button onClick={onCreateVM}>
                  Create VM
                </Button>
              </div>
            }
          />
        </Card>
      </LoadingOverlay>

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        open={deleteModal.open}
        title="Delete Virtual Machine"
        message={`Are you sure you want to delete "${deleteModal.vm?.name}"? This action cannot be undone and all data will be lost.`}
        confirmText="Delete"
        confirmVariant="danger"
        onConfirm={() => deleteModal.vm && handleDeleteVM(deleteModal.vm)}
        onClose={() => setDeleteModal({ open: false })}
      />

      {/* Action Modal */}
      <Modal
        open={actionModal.open}
        title={`VM Action: ${actionModal.action}`}
        onClose={() => setActionModal({ open: false })}
      >
        <div className="space-y-4">
          <p>
            Performing action <strong>{actionModal.action}</strong> on VM <strong>{actionModal.vm?.name}</strong>...
          </p>
          <div className="flex justify-end">
            <Button
              variant="secondary"
              onClick={() => setActionModal({ open: false })}
            >
              Close
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};