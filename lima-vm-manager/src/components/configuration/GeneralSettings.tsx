import React, { useEffect } from 'react';
import {
  Card,
  CardHeader,
  CardBody,
  Input,
  Select,
  Checkbox,
  Button,
  Loading,
} from '../ui';
import { useConfig } from '../../hooks/useConfig';
import { useNotifications } from '../../hooks/useNotifications';
import type { Theme, LogLevel } from '../../types';

export const GeneralSettings: React.FC = () => {
  const { config, loading, updateTheme, updateLogLevel, updateAutoStart, updateCheckUpdates } = useConfig();
  const { showSuccess, showError } = useNotifications();

  const [localConfig, setLocalConfig] = useState({
    theme: 'system' as Theme,
    log_level: 'info' as LogLevel,
    auto_start: false,
    check_updates: true,
  });

  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (config) {
      setLocalConfig({
        theme: config.general.theme,
        log_level: config.general.log_level,
        auto_start: config.general.auto_start,
        check_updates: config.general.check_updates,
      });
    }
  }, [config]);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const promises = [
        updateTheme(localConfig.theme),
        updateLogLevel(localConfig.log_level),
        updateAutoStart(localConfig.auto_start),
        updateCheckUpdates(localConfig.check_updates),
      ];

      await Promise.all(promises);
      showSuccess('Success', 'General settings have been updated');
    } catch (error) {
      showError('Error', 'Failed to update general settings');
    } finally {
      setIsSaving(false);
    }
  };

  const handleReset = async () => {
    try {
      const promises = [
        updateTheme('system'),
        updateLogLevel('info'),
        updateAutoStart(false),
        updateCheckUpdates(true),
      ];

      await Promise.all(promises);
      setLocalConfig({
        theme: 'system',
        log_level: 'info',
        auto_start: false,
        check_updates: true,
      });
      showSuccess('Success', 'General settings have been reset to defaults');
    } catch (error) {
      showError('Error', 'Failed to reset general settings');
    }
  };

  if (loading) {
    return (
      <Card>
        <CardBody className="py-12">
          <Loading size="large" text="Loading settings..." />
        </CardBody>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            General Settings
          </h2>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Configure basic application preferences and behavior.
          </p>
        </CardHeader>
        <CardBody className="space-y-6">
          {/* Appearance */}
          <div>
            <h3 className="text-md font-medium text-gray-900 dark:text-white mb-4">
              Appearance
            </h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Theme
                </label>
                <Select
                  value={localConfig.theme}
                  onChange={(value) => setLocalConfig(prev => ({ ...prev, theme: value as Theme }))}
                >
                  <option value="light">Light</option>
                  <option value="dark">Dark</option>
                  <option value="system">System</option>
                </Select>
                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                  Choose your preferred color theme. System will follow your OS preference.
                </p>
              </div>
            </div>
          </div>

          {/* Logging */}
          <div>
            <h3 className="text-md font-medium text-gray-900 dark:text-white mb-4">
              Logging
            </h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Log Level
                </label>
                <Select
                  value={localConfig.log_level}
                  onChange={(value) => setLocalConfig(prev => ({ ...prev, log_level: value as LogLevel }))}
                >
                  <option value="debug">Debug - Detailed diagnostic information</option>
                  <option value="info">Info - General information about application events</option>
                  <option value="warn">Warning - Potentially harmful situations</option>
                  <option value="error">Error - Error events that might still allow the application to continue</option>
                </Select>
                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                  Controls the verbosity of logs written to file and console.
                </p>
              </div>
            </div>
          </div>

          {/* Application Behavior */}
          <div>
            <h3 className="text-md font-medium text-gray-900 dark:text-white mb-4">
              Application Behavior
            </h3>
            <div className="space-y-4">
              <Checkbox
                label="Start application automatically when system starts"
                checked={localConfig.auto_start}
                onChange={(checked) => setLocalConfig(prev => ({ ...prev, auto_start: checked }))}
              />
              <p className="text-sm text-gray-500 dark:text-gray-400 ml-6">
                Automatically launch Lima VM Manager when you log into your system.
              </p>

              <div className="pt-2">
                <Checkbox
                  label="Check for updates automatically"
                  checked={localConfig.check_updates}
                  onChange={(checked) => setLocalConfig(prev => ({ ...prev, check_updates: checked }))}
                />
                <p className="text-sm text-gray-500 dark:text-gray-400 ml-6">
                  Periodically check for new versions and notify you when updates are available.
                </p>
              </div>
            </div>
          </div>

          {/* Data Directory */}
          {config && (
            <div>
              <h3 className="text-md font-medium text-gray-900 dark:text-white mb-4">
                Data Storage
              </h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Data Directory
                  </label>
                  <Input
                    value={config.general.data_dir}
                    disabled
                  />
                  <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                    Application data, configurations, and logs are stored in this directory.
                  </p>
                </div>
              </div>
            </div>
          )}

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