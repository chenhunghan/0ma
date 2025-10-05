import React, { useState, useEffect } from 'react';
import {
  Button,
  Card,
  CardHeader,
  CardBody,
  Badge,
  Loading,
  Modal,
  ConfirmModal,
} from '../ui';
import { VMStatusBadge } from '../ui/Badge';
import { useVMs } from '../../hooks/useVMs';
import { useNotifications } from '../../hooks/useNotifications';
import { formatBytes, formatMemory, formatDate, getAvailableVMActions } from '../../utils/format';
import type { VM } from '../../types';

interface VMDetailsProps {
  vmId: string;
  onClose: () => void;
  onEdit?: (vm: VM) => void;
}

export const VMDetails: React.FC<VMDetailsProps> = ({
  vmId,
  onClose,
  onEdit,
}) => {
  const { getVMDetails, startVM, stopVM, restartVM, deleteVM } = useVMs();
  const { showPromiseResult } = useNotifications();

  const [vm, setVM] = useState<VM | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionModal, setActionModal] = useState<{ open: boolean; action?: string }>({ open: false });
  const [deleteModal, setDeleteModal] = useState(false);

  // Load VM details
  useEffect(() => {
    loadVMDetails();
  }, [vmId]);

  const loadVMDetails = async () => {
    setLoading(true);
    try {
      const vmDetails = await getVMDetails(vmId);
      setVM(vmDetails);
    } catch (error) {
      console.error('Failed to load VM details:', error);
    } finally {
      setLoading(false);
    }
  };

  // Handle VM actions
  const handleVMAction = async (action: string) => {
    if (!vm) return;

    setActionModal({ open: true, action });

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

    setActionModal({ open: false });

    // Reload VM details after action
    if (result) {
      await loadVMDetails();
    }
  };

  // Handle VM deletion
  const handleDeleteVM = async () => {
    if (!vm) return;

    const result = await showPromiseResult(
      deleteVM(vm.id),
      { title: 'Success', message: `VM "${vm.name}" deleted successfully` },
      { title: 'Error', message: `Failed to delete VM "${vm.name}"` }
    );

    if (result) {
      onClose();
    }
  };

  const availableActions = vm ? getAvailableVMActions(vm.status) : [];

  if (loading) {
    return (
      <Modal open size="large" onClose={onClose}>
        <div className="flex items-center justify-center py-12">
          <Loading size="large" text="Loading VM details..." />
        </div>
      </Modal>
    );
  }

  if (!vm) {
    return (
      <Modal open size="medium" onClose={onClose}>
        <div className="text-center py-12">
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
            VM Not Found
          </h3>
          <p className="text-gray-500 dark:text-gray-400 mb-4">
            The virtual machine you're looking for doesn't exist or has been deleted.
          </p>
          <Button onClick={onClose}>Close</Button>
        </div>
      </Modal>
    );
  }

  return (
    <>
      <Modal open size="large" onClose={onClose}>
        <div className="space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className={`w-12 h-12 rounded-full flex items-center justify-center text-white text-lg font-bold ${
                vm.status === 'Running' ? 'bg-success-500' :
                vm.status === 'Stopped' ? 'bg-gray-500' :
                vm.status === 'Error' ? 'bg-error-500' : 'bg-warning-500'
              }`}>
                {vm.name.charAt(0).toUpperCase()}
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                  {vm.name}
                </h2>
                <VMStatusBadge status={vm.status} />
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <Button variant="secondary" onClick={() => onEdit?.(vm)}>
                Edit
              </Button>
              <Button variant="ghost" onClick={onClose}>
                Close
              </Button>
            </div>
          </div>

          {/* Actions */}
          <Card>
            <CardBody>
              <div className="flex flex-wrap gap-2">
                {availableActions.includes('start') && (
                  <Button variant="primary" onClick={() => handleVMAction('start')}>
                    Start VM
                  </Button>
                )}
                {availableActions.includes('stop') && (
                  <Button variant="warning" onClick={() => handleVMAction('stop')}>
                    Stop VM
                  </Button>
                )}
                {availableActions.includes('restart') && (
                  <Button variant="secondary" onClick={() => handleVMAction('restart')}>
                    Restart VM
                  </Button>
                )}
                {availableActions.includes('delete') && (
                  <Button variant="danger" onClick={() => setDeleteModal(true)}>
                    Delete VM
                  </Button>
                )}
              </div>
            </CardBody>
          </Card>

          {/* Main Information */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Basic Info */}
            <Card>
              <CardHeader>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Basic Information
                </h3>
              </CardHeader>
              <CardBody className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-gray-500 dark:text-gray-400">Name</label>
                  <p className="text-gray-900 dark:text-white">{vm.name}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500 dark:text-gray-400">ID</label>
                  <p className="font-mono text-sm text-gray-900 dark:text-white">{vm.id}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500 dark:text-gray-400">Template</label>
                  <p className="text-gray-900 dark:text-white">{vm.template || 'Custom'}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500 dark:text-gray-400">IP Address</label>
                  <p className="font-mono text-gray-900 dark:text-white">
                    {vm.ip_address || 'No IP assigned'}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500 dark:text-gray-400">Created</label>
                  <p className="text-gray-900 dark:text-white">{formatDate(vm.created_at)}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500 dark:text-gray-400">Last Updated</label>
                  <p className="text-gray-900 dark:text-white">{formatDate(vm.updated_at)}</p>
                </div>
              </CardBody>
            </Card>

            {/* Resources */}
            <Card>
              <CardHeader>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Resource Usage
                </h3>
              </CardHeader>
              <CardBody className="space-y-4">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-sm font-medium text-gray-500 dark:text-gray-400">CPU Usage</label>
                    <span className="text-sm text-gray-900 dark:text-white">
                      {vm.cpu_usage ? `${vm.cpu_usage}%` : 'N/A'}
                    </span>
                  </div>
                  {vm.cpu_usage && (
                    <div className="w-full bg-gray-200 rounded-full h-2 dark:bg-gray-700">
                      <div
                        className={`h-2 rounded-full ${
                          vm.cpu_usage >= 90 ? 'bg-error-500' :
                          vm.cpu_usage >= 70 ? 'bg-warning-500' : 'bg-success-500'
                        }`}
                        style={{ width: `${vm.cpu_usage}%` }}
                      />
                    </div>
                  )}
                </div>

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-sm font-medium text-gray-500 dark:text-gray-400">Memory Usage</label>
                    <span className="text-sm text-gray-900 dark:text-white">
                      {vm.memory_usage ? formatMemory(vm.memory_usage) : 'N/A'}
                    </span>
                  </div>
                  {vm.memory_usage && (
                    <div className="w-full bg-gray-200 rounded-full h-2 dark:bg-gray-700">
                      <div
                        className={`h-2 rounded-full ${
                          vm.memory_usage >= 90 ? 'bg-error-500' :
                          vm.memory_usage >= 70 ? 'bg-warning-500' : 'bg-success-500'
                        }`}
                        style={{ width: `${Math.min(vm.memory_usage, 100)}%` }}
                      />
                    </div>
                  )}
                </div>

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-sm font-medium text-gray-500 dark:text-gray-400">Disk Usage</label>
                    <span className="text-sm text-gray-900 dark:text-white">
                      {vm.disk_usage ? formatBytes(vm.disk_usage) : 'N/A'}
                    </span>
                  </div>
                  {vm.disk_usage && (
                    <div className="w-full bg-gray-200 rounded-full h-2 dark:bg-gray-700">
                      <div className="h-2 rounded-full bg-primary-500" style={{ width: '60%' }} />
                    </div>
                  )}
                </div>

                {vm.resources && (
                  <>
                    <div>
                      <label className="text-sm font-medium text-gray-500 dark:text-gray-400">Allocated CPUs</label>
                      <p className="text-gray-900 dark:text-white">{vm.resources.cpus} cores</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-500 dark:text-gray-400">Allocated Memory</label>
                      <p className="text-gray-900 dark:text-white">{formatMemory(vm.resources.memory)}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-500 dark:text-gray-400">Disk Size</label>
                      <p className="text-gray-900 dark:text-white">{formatBytes(vm.resources.disk * 1024 * 1024 * 1024)}</p>
                    </div>
                  </>
                )}
              </CardBody>
            </Card>
          </div>

          {/* Configuration */}
          {vm.config && (
            <Card>
              <CardHeader>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Configuration
                </h3>
              </CardHeader>
              <CardBody>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  <div>
                    <label className="text-sm font-medium text-gray-500 dark:text-gray-400">CPUs</label>
                    <p className="text-gray-900 dark:text-white">{vm.config.cpus || 'Default'}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500 dark:text-gray-400">Memory</label>
                    <p className="text-gray-900 dark:text-white">
                      {vm.config.memory ? `${vm.config.memory} MB` : 'Default'}
                    </p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500 dark:text-gray-400">Disk</label>
                    <p className="text-gray-900 dark:text-white">
                      {vm.config.disk ? `${vm.config.disk} GB` : 'Default'}
                    </p>
                  </div>
                </div>

                {vm.config.ports && vm.config.ports.length > 0 && (
                  <div className="mt-4">
                    <label className="text-sm font-medium text-gray-500 dark:text-gray-400">Port Forwarding</label>
                    <div className="mt-2 space-y-1">
                      {vm.config.ports.map((port, index) => (
                        <div key={index} className="text-sm text-gray-900 dark:text-white">
                          {port.guest}:{port.host} ({port.proto})
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {vm.config.mounts && vm.config.mounts.length > 0 && (
                  <div className="mt-4">
                    <label className="text-sm font-medium text-gray-500 dark:text-gray-400">Mounted Directories</label>
                    <div className="mt-2 space-y-1">
                      {vm.config.mounts.map((mount, index) => (
                        <div key={index} className="text-sm text-gray-900 dark:text-white">
                          {mount.location} {mount.writable ? '(writable)' : '(read-only)'}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </CardBody>
            </Card>
          )}

          {/* Health Status */}
          {vm.health && (
            <Card>
              <CardHeader>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Health Status
                </h3>
              </CardHeader>
              <CardBody>
                <div className="flex items-center justify-between mb-4">
                  <span className="text-sm font-medium text-gray-500 dark:text-gray-400">Overall Status</span>
                  <Badge variant={vm.health.status === 'healthy' ? 'success' :
                                vm.health.status === 'warning' ? 'warning' : 'error'}>
                    {vm.health.status}
                  </Badge>
                </div>
                <div className="space-y-2">
                  {vm.health.checks.map((check, index) => (
                    <div key={index} className="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-800 rounded">
                      <span className="text-sm text-gray-900 dark:text-white">{check.name}</span>
                      <Badge variant={check.status === 'pass' ? 'success' :
                                    check.status === 'warn' ? 'warning' : 'error'}
                            size="small">
                        {check.status}
                      </Badge>
                    </div>
                  ))}
                </div>
                <div className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                  Last checked: {formatDate(vm.health.last_check)}
                </div>
              </CardBody>
            </Card>
          )}
        </div>
      </Modal>

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        open={deleteModal}
        title="Delete Virtual Machine"
        message={`Are you sure you want to delete "${vm.name}"? This action cannot be undone and all data will be lost.`}
        confirmText="Delete"
        confirmVariant="danger"
        onConfirm={handleDeleteVM}
        onClose={() => setDeleteModal(false)}
      />

      {/* Action Modal */}
      <Modal
        open={actionModal.open}
        title={`VM Action: ${actionModal.action}`}
        onClose={() => setActionModal({ open: false })}
      >
        <div className="space-y-4">
          <p>
            Performing action <strong>{actionModal.action}</strong> on VM <strong>{vm.name}</strong>...
          </p>
          <div className="flex justify-center">
            <Loading size="large" />
          </div>
        </div>
      </Modal>
    </>
  );
};