import React, { useState, useEffect } from 'react';
import {
  Card,
  CardHeader,
  CardBody,
  StatsCard,
  Button,
  Loading,
  VMStatusBadge,
  Table,
} from '../ui';
import { useVMs } from '../../hooks/useVMs';
import { useConfig } from '../../hooks/useConfig';
import { useNotifications } from '../../hooks/useNotifications';
import { monitoringAPI, cliAPI } from '../../services/api';
import {
  formatBytes,
  formatMemory,
  formatCpuUsage,
  formatDate,
  sortVMsByStatus,
} from '../../utils/format';
import type { VM, SystemInfo, CLIToolsStatus } from '../../types';

export const DashboardPage: React.FC = () => {
  const { vms, loading: vmsLoading, startVM, stopVM, restartVM } = useVMs();
  const { config, loading: configLoading } = useConfig();
  const { showPromiseResult } = useNotifications();

  const [systemInfo, setSystemInfo] = useState<SystemInfo | null>(null);
  const [cliTools, setCliTools] = useState<CLIToolsStatus | null>(null);
  const [monitoringStats, setMonitoringStats] = useState<any>(null);
  const [loadingSystemInfo, setLoadingSystemInfo] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Load dashboard data
  useEffect(() => {
    loadDashboardData();
    const interval = setInterval(loadDashboardData, 30000); // Refresh every 30 seconds
    return () => clearInterval(interval);
  }, []);

  const loadDashboardData = async () => {
    try {
      const [sysInfo, cliStatus, stats] = await Promise.all([
        monitoringAPI.getSystemInfo(),
        cliAPI.detect(),
        monitoringAPI.getStats().catch(() => null),
      ]);

      setSystemInfo(sysInfo);
      setCliTools(cliStatus);
      setMonitoringStats(stats);
    } catch (error) {
      console.error('Failed to load dashboard data:', error);
    } finally {
      setLoadingSystemInfo(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadDashboardData();
    setRefreshing(false);
  };

  const handleQuickAction = async (action: string, vmId: string) => {
    const vm = vms.find(v => v.id === vmId);
    if (!vm) return;

    let actionPromise;
    let successMessage;
    let errorMessage;

    switch (action) {
      case 'start':
        actionPromise = startVM(vmId);
        successMessage = `VM "${vm.name}" started successfully`;
        errorMessage = `Failed to start VM "${vm.name}"`;
        break;
      case 'stop':
        actionPromise = stopVM(vmId);
        successMessage = `VM "${vm.name}" stopped successfully`;
        errorMessage = `Failed to stop VM "${vm.name}"`;
        break;
      case 'restart':
        actionPromise = restartVM(vmId);
        successMessage = `VM "${vm.name}" restarted successfully`;
        errorMessage = `Failed to restart VM "${vm.name}"`;
        break;
      default:
        return;
    }

    await showPromiseResult(
      actionPromise,
      { title: 'Success', message: successMessage },
      { title: 'Error', message: errorMessage }
    );
  };

  // Calculate statistics
  const runningVMs = vms.filter(vm => vm.status === 'Running').length;
  const stoppedVMs = vms.filter(vm => vm.status === 'Stopped').length;
  const errorVMs = vms.filter(vm => vm.status === 'Error').length;
  const totalCPUs = vms.reduce((sum, vm) => sum + (vm.resources?.cpus || 0), 0);
  const totalMemory = vms.reduce((sum, vm) => sum + (vm.resources?.memory || 0), 0);

  // Recent VMs for table
  const recentVMs = [...vms]
    .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())
    .slice(0, 5);

  const vmColumns = [
    {
      key: 'name',
      title: 'VM Name',
      render: (value: string, record: VM) => (
        <div className="flex items-center space-x-3">
          <div className={`w-6 h-6 rounded-full flex items-center justify-center text-white text-xs font-medium ${
            record.status === 'Running' ? 'bg-success-500' :
            record.status === 'Stopped' ? 'bg-gray-500' :
            record.status === 'Error' ? 'bg-error-500' : 'bg-warning-500'
          }`}>
            {value.charAt(0).toUpperCase()}
          </div>
          <div>
            <div className="font-medium text-gray-900 dark:text-white">{value}</div>
            <div className="text-xs text-gray-500 dark:text-gray-400">
              {record.template || 'No template'}
            </div>
          </div>
        </div>
      ),
    },
    {
      key: 'status',
      title: 'Status',
      render: (value: string) => <VMStatusBadge status={value as any} />,
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
      key: 'cpu_usage',
      title: 'CPU',
      render: (value: number) => (
        <div className="flex items-center space-x-2">
          <div className="w-12 bg-gray-200 rounded-full h-1.5 dark:bg-gray-700">
            <div
              className={`h-1.5 rounded-full ${
                value >= 90 ? 'bg-error-500' :
                value >= 70 ? 'bg-warning-500' : 'bg-success-500'
              }`}
              style={{ width: `${Math.min(value || 0, 100)}%` }}
            />
          </div>
          <span className="text-xs text-gray-600 dark:text-gray-400">
            {value ? formatCpuUsage(value) : 'N/A'}
          </span>
        </div>
      ),
    },
    {
      key: 'actions',
      title: 'Actions',
      render: (value: any, record: VM) => {
        const canStart = record.status === 'Stopped' || record.status === 'Error';
        const canStop = record.status === 'Running';
        const canRestart = record.status === 'Running';

        return (
          <div className="flex items-center space-x-1">
            {canStart && (
              <Button
                size="small"
                variant="primary"
                onClick={() => handleQuickAction('start', record.id)}
              >
                Start
              </Button>
            )}
            {canStop && (
              <Button
                size="small"
                variant="warning"
                onClick={() => handleQuickAction('stop', record.id)}
              >
                Stop
              </Button>
            )}
            {canRestart && (
              <Button
                size="small"
                variant="secondary"
                onClick={() => handleQuickAction('restart', record.id)}
              >
                Restart
              </Button>
            )}
          </div>
        );
      },
    },
  ];

  if (vmsLoading || configLoading || loadingSystemInfo) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Dashboard</h1>
        </div>
        <Card>
          <CardBody className="py-12">
            <Loading size="large" text="Loading dashboard..." />
          </CardBody>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Dashboard</h1>
          <p className="text-gray-600 dark:text-gray-400">
            Monitor your virtual machines and system resources
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Button
            variant="secondary"
            onClick={handleRefresh}
            loading={refreshing}
            disabled={refreshing}
          >
            Refresh
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatsCard
          title="Total VMs"
          value={vms.length}
          icon="🖥️"
          color="primary"
        />
        <StatsCard
          title="Running VMs"
          value={runningVMs}
          change={{
            value: runningVMs > 0 ? 'Active' : 'No running VMs',
            type: runningVMs > 0 ? 'increase' : 'neutral',
          }}
          icon="▶️"
          color="success"
        />
        <StatsCard
          title="Total CPUs"
          value={totalCPUs}
          change={{
            value: 'Allocated',
            type: 'neutral',
          }}
          icon="⚡"
          color="warning"
        />
        <StatsCard
          title="Total Memory"
          value={formatMemory(totalMemory)}
          change={{
            value: 'Allocated',
            type: 'neutral',
          }}
          icon="💾"
          color="primary"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* VM Status Overview */}
        <Card>
          <CardHeader>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              VM Status Overview
            </h3>
          </CardHeader>
          <CardBody>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Running
                </span>
                <div className="flex items-center space-x-2">
                  <div className="w-24 bg-gray-200 rounded-full h-2 dark:bg-gray-700">
                    <div
                      className="bg-success-500 h-2 rounded-full"
                      style={{ width: `${vms.length > 0 ? (runningVMs / vms.length) * 100 : 0}%` }}
                    />
                  </div>
                  <span className="text-sm text-gray-900 dark:text-white w-8 text-right">
                    {runningVMs}
                  </span>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Stopped
                </span>
                <div className="flex items-center space-x-2">
                  <div className="w-24 bg-gray-200 rounded-full h-2 dark:bg-gray-700">
                    <div
                      className="bg-gray-500 h-2 rounded-full"
                      style={{ width: `${vms.length > 0 ? (stoppedVMs / vms.length) * 100 : 0}%` }}
                    />
                  </div>
                  <span className="text-sm text-gray-900 dark:text-white w-8 text-right">
                    {stoppedVMs}
                  </span>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Error
                </span>
                <div className="flex items-center space-x-2">
                  <div className="w-24 bg-gray-200 rounded-full h-2 dark:bg-gray-700">
                    <div
                      className="bg-error-500 h-2 rounded-full"
                      style={{ width: `${vms.length > 0 ? (errorVMs / vms.length) * 100 : 0}%` }}
                    />
                  </div>
                  <span className="text-sm text-gray-900 dark:text-white w-8 text-right">
                    {errorVMs}
                  </span>
                </div>
              </div>

              {vms.length === 0 && (
                <div className="text-center py-4 text-gray-500 dark:text-gray-400">
                  No virtual machines found. Create your first VM to get started.
                </div>
              )}
            </div>
          </CardBody>
        </Card>

        {/* System Information */}
        <Card>
          <CardHeader>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              System Information
            </h3>
          </CardHeader>
          <CardBody>
            {systemInfo ? (
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600 dark:text-gray-400">Platform</span>
                  <span className="text-sm font-medium text-gray-900 dark:text-white">
                    {systemInfo.platform} ({systemInfo.arch})
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600 dark:text-gray-400">Total Memory</span>
                  <span className="text-sm font-medium text-gray-900 dark:text-white">
                    {formatMemory(systemInfo.total_memory_mb)}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600 dark:text-gray-400">Available Memory</span>
                  <span className="text-sm font-medium text-gray-900 dark:text-white">
                    {formatMemory(systemInfo.available_memory_mb)}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600 dark:text-gray-400">CPU Cores</span>
                  <span className="text-sm font-medium text-gray-900 dark:text-white">
                    {systemInfo.cpu_count}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600 dark:text-gray-400">Disk Space</span>
                  <span className="text-sm font-medium text-gray-900 dark:text-white">
                    {formatBytes(systemInfo.disk_space_gb * 1024 * 1024 * 1024)}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600 dark:text-gray-400">Available Disk</span>
                  <span className="text-sm font-medium text-gray-900 dark:text-white">
                    {formatBytes(systemInfo.available_disk_gb * 1024 * 1024 * 1024)}
                  </span>
                </div>
              </div>
            ) : (
              <div className="text-center py-4">
                <Loading size="small" text="Loading system info..." />
              </div>
            )}
          </CardBody>
        </Card>
      </div>

      {/* Recent VMs Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Recent Virtual Machines
            </h3>
            <span className="text-sm text-gray-500 dark:text-gray-400">
              Last updated: {formatDate(new Date().toISOString())}
            </span>
          </div>
        </CardHeader>
        <CardBody>
          {recentVMs.length > 0 ? (
            <Table
              data={recentVMs}
              columns={vmColumns}
              hoverable
              compact
            />
          ) : (
            <div className="text-center py-8">
              <div className="text-gray-400 mb-4">
                <svg className="mx-auto h-12 w-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 13h6m-3-3v6m5 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                No virtual machines yet
              </h3>
              <p className="text-gray-500 dark:text-gray-400 mb-4">
                Create your first virtual machine to get started with Lima VM Manager.
              </p>
              <Button>
                Create VM
              </Button>
            </div>
          )}
        </CardBody>
      </Card>

      {/* CLI Tools Status */}
      {cliTools && (
        <Card>
          <CardHeader>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              CLI Tools Status
            </h3>
          </CardHeader>
          <CardBody>
            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
              {[
                { name: 'limactl', tool: cliTools.limactl },
                { name: 'kubectl', tool: cliTools.kubectl },
                { name: 'Git', tool: cliTools.git },
                { name: 'Docker', tool: cliTools.docker },
                { name: 'QEMU', tool: cliTools.qemu },
              ].map(({ name, tool }) => (
                <div
                  key={name}
                  className={`p-3 border rounded-lg ${
                    tool.is_available
                      ? 'border-success-200 bg-success-50 dark:border-success-800 dark:bg-success-900/20'
                      : 'border-error-200 bg-error-50 dark:border-error-800 dark:bg-error-900/20'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium text-gray-900 dark:text-white">
                      {name}
                    </span>
                    <span className={tool.is_available ? 'text-success-600' : 'text-error-600'}>
                      {tool.is_available ? '✓' : '✗'}
                    </span>
                  </div>
                  <div className="text-xs text-gray-600 dark:text-gray-400">
                    {tool.version || 'Not available'}
                  </div>
                </div>
              ))}
            </div>
          </CardBody>
        </Card>
      )}
    </div>
  );
};