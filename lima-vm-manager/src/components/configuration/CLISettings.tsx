import React, { useState, useEffect } from 'react';
import {
  Card,
  CardHeader,
  CardBody,
  Button,
  Loading,
  StatusBadge,
} from '../ui';
import { useVMs } from '../../hooks/useVMs';
import { cliAPI } from '../../services/api';
import { getCLIToolStatusColor, getCLIToolStatusIcon } from '../../utils/format';
import { useNotifications } from '../../hooks/useNotifications';
import type { CLIToolsStatus } from '../../types';

export const CLISettings: React.FC = () => {
  const [cliStatus, setCLIStatus] = useState<CLIToolsStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const { showSuccess, showError } = useNotifications();

  const loadCLIStatus = async () => {
    setLoading(true);
    try {
      const status = await cliAPI.detect();
      setCLIStatus(status);
    } catch (error) {
      showError('Error', 'Failed to load CLI tools status');
    } finally {
      setLoading(false);
    }
  };

  const refreshCLIStatus = async () => {
    setRefreshing(true);
    try {
      const status = await cliAPI.refresh();
      setCLIStatus(status);
      showSuccess('Success', 'CLI tools status has been refreshed');
    } catch (error) {
      showError('Error', 'Failed to refresh CLI tools status');
    } finally {
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadCLIStatus();
  }, []);

  if (loading) {
    return (
      <Card>
        <CardBody className="py-12">
          <Loading size="large" text="Loading CLI tools status..." />
        </CardBody>
      </Card>
    );
  }

  const renderCLIToolStatus = (name: string, tool: any) => {
    const statusColor = getCLIToolStatusColor(tool);
    const statusIcon = getCLIToolStatusIcon(tool);

    return (
      <div className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center space-x-3">
            <span className="text-lg">{statusIcon}</span>
            <div>
              <h4 className="font-medium text-gray-900 dark:text-white">{name}</h4>
              <p className="text-sm text-gray-500 dark:text-gray-400">{tool.path}</p>
            </div>
          </div>
          <StatusBadge status={tool.is_available ? 'online' : 'offline'} />
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-600 dark:text-gray-400">Status:</span>
            <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusColor}`}>
              {tool.status}
            </span>
          </div>

          {tool.version && (
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-600 dark:text-gray-400">Version:</span>
              <span className="font-mono text-gray-900 dark:text-white">{tool.version}</span>
            </div>
          )}

          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-600 dark:text-gray-400">Last Check:</span>
            <span className="text-gray-900 dark:text-white">
              {new Date(tool.last_check).toLocaleString()}
            </span>
          </div>
        </div>

        {!tool.is_available && (
          <div className="mt-3 p-2 bg-yellow-50 dark:bg-yellow-900/20 rounded border border-yellow-200 dark:border-yellow-800">
            <p className="text-sm text-yellow-800 dark:text-yellow-200">
              This tool is required for full functionality. Please install {name} and ensure it's available in your PATH.
            </p>
          </div>
        )}

        {tool.status === 'outdated' && (
          <div className="mt-3 p-2 bg-blue-50 dark:bg-blue-900/20 rounded border border-blue-200 dark:border-blue-800">
            <p className="text-sm text-blue-800 dark:text-blue-200">
              A newer version of {name} is available. Consider updating for the latest features and bug fixes.
            </p>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                CLI Tools Status
              </h2>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Monitor the status of command-line tools required for VM management.
              </p>
            </div>
            <Button
              variant="secondary"
              onClick={refreshCLIStatus}
              loading={refreshing}
              disabled={refreshing}
            >
              Refresh Status
            </Button>
          </div>
        </CardHeader>
        <CardBody className="space-y-6">
          {cliStatus ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {renderCLIToolStatus('limactl', cliStatus.limactl)}
              {renderCLIToolStatus('kubectl', cliStatus.kubectl)}
              {renderCLIToolStatus('Git', cliStatus.git)}
              {renderCLIToolStatus('Docker', cliStatus.docker)}
              {renderCLIToolStatus('QEMU', cliStatus.qemu)}
            </div>
          ) : (
            <div className="text-center py-8">
              <p className="text-gray-500 dark:text-gray-400">
                No CLI tools status available
              </p>
            </div>
          )}
        </CardBody>
      </Card>

      {/* CLI Tools Information */}
      <Card>
        <CardHeader>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            CLI Tools Information
          </h3>
        </CardHeader>
        <CardBody className="space-y-4">
          <div>
            <h4 className="font-medium text-gray-900 dark:text-white mb-2">limactl</h4>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              The primary CLI tool for managing Lima virtual machines. Required for all VM operations including creation, startup, shutdown, and configuration management.
            </p>
          </div>

          <div>
            <h4 className="font-medium text-gray-900 dark:text-white mb-2">kubectl</h4>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Kubernetes command-line tool. Used for managing Kubernetes clusters running inside Lima VMs. Optional but recommended for container orchestration workflows.
            </p>
          </div>

          <div>
            <h4 className="font-medium text-gray-900 dark:text-white mb-2">Git</h4>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Version control system. Used for cloning configuration repositories and managing VM configuration versions. Optional but recommended for development workflows.
            </p>
          </div>

          <div>
            <h4 className="font-medium text-gray-900 dark:text-white mb-2">Docker</h4>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Container platform. Used for building and running containers. Optional but recommended for container-based development workflows.
            </p>
          </div>

          <div>
            <h4 className="font-medium text-gray-900 dark:text-white mb-2">QEMU</h4>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Machine emulator and virtualizer. Used by Lima for hardware virtualization. Required for running virtual machines.
            </p>
          </div>
        </CardBody>
      </Card>

      {/* Installation Help */}
      <Card>
        <CardHeader>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            Installation Help
          </h3>
        </CardHeader>
        <CardBody className="space-y-4">
          <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
            <h4 className="font-medium text-blue-900 dark:text-blue-100 mb-2">macOS Installation</h4>
            <div className="space-y-2 text-sm text-blue-800 dark:text-blue-200">
              <p><strong>limactl:</strong> <code className="bg-blue-100 dark:bg-blue-800 px-1 rounded">brew install lima</code></p>
              <p><strong>kubectl:</strong> <code className="bg-blue-100 dark:bg-blue-800 px-1 rounded">brew install kubectl</code></p>
              <p><strong>Git:</strong> <code className="bg-blue-100 dark:bg-blue-800 px-1 rounded">brew install git</code></p>
              <p><strong>Docker:</strong> <code className="bg-blue-100 dark:bg-blue-800 px-1 rounded">brew install --cask docker</code></p>
              <p><strong>QEMU:</strong> <code className="bg-blue-100 dark:bg-blue-800 px-1 rounded">brew install qemu</code></p>
            </div>
          </div>

          <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
            <h4 className="font-medium text-green-900 dark:text-green-100 mb-2">Linux Installation</h4>
            <div className="space-y-2 text-sm text-green-800 dark:text-green-200">
              <p><strong>limactl:</strong> Download from GitHub releases or use package manager</p>
              <p><strong>kubectl:</strong> <code className="bg-green-100 dark:bg-green-800 px-1 rounded">curl -LO "https://dl.k8s.io/release/$(curl -L -s https://dl.k8s.io/release/stable.txt)/bin/linux/amd64/kubectl"</code></p>
              <p><strong>Git:</strong> <code className="bg-green-100 dark:bg-green-800 px-1 rounded">sudo apt-get install git</code> (Ubuntu/Debian)</p>
              <p><strong>Docker:</strong> Follow instructions at docker.com</p>
              <p><strong>QEMU:</strong> <code className="bg-green-100 dark:bg-green-800 px-1 rounded">sudo apt-get install qemu-kvm</code> (Ubuntu/Debian)</p>
            </div>
          </div>
        </CardBody>
      </Card>
    </div>
  );
};