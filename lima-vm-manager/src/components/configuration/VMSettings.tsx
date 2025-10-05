import React, { useEffect } from 'react';
import {
  Card,
  CardHeader,
  CardBody,
  Input,
  Select,
  Button,
  Loading,
} from '../ui';
import { useConfig } from '../../hooks/useConfig';
import { useNotifications } from '../../hooks/useNotifications';

export const VMSettings: React.FC = () => {
  const { config, loading, updateVMManagementConfig } = useConfig();
  const { showSuccess, showError } = useNotifications();

  const [localConfig, setLocalConfig] = useState({
    default_template: '',
    auto_save_configs: true,
    backup_interval_hours: 24,
    max_backups: 10,
    default_resources: {
      cpus: 2,
      memory: 4096,
      disk: 20,
    },
  });

  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (config) {
      setLocalConfig({
        default_template: config.vm_management.default_template,
        auto_save_configs: config.vm_management.auto_save_configs,
        backup_interval_hours: config.vm_management.backup_interval_hours,
        max_backups: config.vm_management.max_backups,
        default_resources: config.vm_management.default_resources,
      });
    }
  }, [config]);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await updateVMManagementConfig(localConfig);
      showSuccess('Success', 'VM management settings have been updated');
    } catch (error) {
      showError('Error', 'Failed to update VM management settings');
    } finally {
      setIsSaving(false);
    }
  };

  const handleReset = async () => {
    try {
      const defaultConfig = {
        default_template: '',
        auto_save_configs: true,
        backup_interval_hours: 24,
        max_backups: 10,
        default_resources: {
          cpus: 2,
          memory: 4096,
          disk: 20,
        },
      };

      await updateVMManagementConfig(defaultConfig);
      setLocalConfig(defaultConfig);
      showSuccess('Success', 'VM management settings have been reset to defaults');
    } catch (error) {
      showError('Error', 'Failed to reset VM management settings');
    }
  };

  if (loading) {
    return (
      <Card>
        <CardBody className="py-12">
          <Loading size="large" text="Loading VM settings..." />
        </CardBody>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            VM Management Settings
          </h2>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Configure default settings for virtual machine creation and management.
          </p>
        </CardHeader>
        <CardBody className="space-y-6">
          {/* Default Template */}
          <div>
            <h3 className="text-md font-medium text-gray-900 dark:text-white mb-4">
              Default VM Settings
            </h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Default Template
                </label>
                <Input
                  value={localConfig.default_template}
                  onChange={(value) => setLocalConfig(prev => ({ ...prev, default_template: value }))}
                  placeholder="ubuntu"
                />
                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                  Default template to use when creating new VMs. Leave empty to show template selection.
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Default Resources
                </label>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Input
                    label="Default CPUs"
                    type="number"
                    value={localConfig.default_resources.cpus.toString()}
                    onChange={(value) => setLocalConfig(prev => ({
                      ...prev,
                      default_resources: {
                        ...prev.default_resources,
                        cpus: parseInt(value) || 1,
                      },
                    }))}
                    min="1"
                    max="32"
                  />
                  <Input
                    label="Default Memory (MB)"
                    type="number"
                    value={localConfig.default_resources.memory.toString()}
                    onChange={(value) => setLocalConfig(prev => ({
                      ...prev,
                      default_resources: {
                        ...prev.default_resources,
                        memory: parseInt(value) || 512,
                      },
                    }))}
                    min="512"
                    max="131072"
                  />
                  <Input
                    label="Default Disk (GB)"
                    type="number"
                    value={localConfig.default_resources.disk.toString()}
                    onChange={(value) => setLocalConfig(prev => ({
                      ...prev,
                      default_resources: {
                        ...prev.default_resources,
                        disk: parseInt(value) || 1,
                      },
                    }))}
                    min="1"
                    max="1024"
                  />
                </div>
                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                  Default resource allocation for new VMs. These values can be overridden during VM creation.
                </p>
              </div>
            </div>
          </div>

          {/* Configuration Management */}
          <div>
            <h3 className="text-md font-medium text-gray-900 dark:text-white mb-4">
              Configuration Management
            </h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Backup Interval (hours)
                </label>
                <Input
                  type="number"
                  value={localConfig.backup_interval_hours.toString()}
                  onChange={(value) => setLocalConfig(prev => ({
                    ...prev,
                    backup_interval_hours: parseInt(value) || 1,
                  }))}
                  min="1"
                  max="168"
                />
                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                  How often to automatically create backups of VM configurations.
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Maximum Backups
                </label>
                <Input
                  type="number"
                  value={localConfig.max_backups.toString()}
                  onChange={(value) => setLocalConfig(prev => ({
                    ...prev,
                    max_backups: parseInt(value) || 1,
                  }))}
                  min="1"
                  max="50"
                />
                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                  Maximum number of backup files to keep per VM. Older backups will be automatically deleted.
                </p>
              </div>
            </div>
          </div>

          {/* Advanced Settings */}
          <div>
            <h3 className="text-md font-medium text-gray-900 dark:text-white mb-4">
              Advanced Settings
            </h3>
            <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
              <div className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
                <p><strong>Note:</strong> These settings affect all VM operations.</p>
                <p>• Changes to default resources will only apply to newly created VMs</p>
                <p>• Backup intervals are measured in hours from the last backup</p>
                <p>• Configuration backups are stored separately from VM data</p>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-between pt-6 border-t border-gray-200 dark:border-gray-700">
            <Button
              variant="secondary"
              onClick={handleReset}
              disabled={isSaving}
            >
              Reset to Defaults
            </Button>
            <Button
              onClick={handleSave}
              loading={isSaving}
              disabled={isSaving}
            >
              Save Changes
            </Button>
          </div>
        </CardBody>
      </Card>
    </div>
  );
};