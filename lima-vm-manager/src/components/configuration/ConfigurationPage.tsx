import React, { useState } from 'react';
import {
  Card,
  CardHeader,
  CardBody,
  Button,
  Modal,
  ConfirmModal,
  Loading,
  Input,
} from '../ui';
import { useConfig } from '../../hooks/useConfig';
import { useNotifications } from '../../hooks/useNotifications';
import { GeneralSettings } from './GeneralSettings';
import { VMSettings } from './VMSettings';
import { CLISettings } from './CLISettings';

type TabType = 'general' | 'vm' | 'cli' | 'advanced';

export const ConfigurationPage: React.FC = () => {
  const { config, loading, exportConfig, importConfig, resetConfig } = useConfig();
  const { showSuccess, showError, showPromiseResult } = useNotifications();

  const [activeTab, setActiveTab] = useState<TabType>('general');
  const [showImportModal, setShowImportModal] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const [showResetModal, setShowResetModal] = useState(false);
  const [importPath, setImportPath] = useState('');
  const [exportPath, setExportPath] = useState('');

  const tabs = [
    { id: 'general' as TabType, label: 'General', icon: '⚙️' },
    { id: 'vm' as TabType, label: 'VM Management', icon: '🖥️' },
    { id: 'cli' as TabType, label: 'CLI Tools', icon: '💻' },
    { id: 'advanced' as TabType, label: 'Advanced', icon: '🔧' },
  ];

  const handleExport = async () => {
    if (!exportPath.trim()) {
      showError('Error', 'Please enter a valid file path');
      return;
    }

    const result = await showPromiseResult(
      exportConfig(exportPath),
      { title: 'Success', message: 'Configuration exported successfully' },
      { title: 'Error', message: 'Failed to export configuration' }
    );

    if (result) {
      setShowExportModal(false);
      setExportPath('');
    }
  };

  const handleImport = async () => {
    if (!importPath.trim()) {
      showError('Error', 'Please enter a valid file path');
      return;
    }

    const result = await showPromiseResult(
      importConfig(importPath),
      { title: 'Success', message: 'Configuration imported successfully' },
      { title: 'Error', message: 'Failed to import configuration' }
    );

    if (result) {
      setShowImportModal(false);
      setImportPath('');
    }
  };

  const handleReset = async () => {
    const result = await showPromiseResult(
      resetConfig(),
      { title: 'Success', message: 'Configuration reset to defaults' },
      { title: 'Error', message: 'Failed to reset configuration' }
    );

    if (result) {
      setShowResetModal(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Configuration
          </h1>
        </div>
        <Card>
          <CardBody className="py-12">
            <Loading size="large" text="Loading configuration..." />
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
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Configuration
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Manage application settings and preferences
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Button
            variant="secondary"
            onClick={() => setShowExportModal(true)}
          >
            Export Config
          </Button>
          <Button
            variant="secondary"
            onClick={() => setShowImportModal(true)}
          >
            Import Config
          </Button>
          <Button
            variant="danger"
            onClick={() => setShowResetModal(true)}
          >
            Reset All
          </Button>
        </div>
      </div>

      {/* Tab Navigation */}
      <Card>
        <CardBody className="p-0">
          <nav className="flex space-x-1 p-1">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`
                  flex items-center space-x-2 px-4 py-2 text-sm font-medium rounded-lg transition-colors
                  ${activeTab === tab.id
                    ? 'bg-primary-100 text-primary-700 dark:bg-primary-900 dark:text-primary-300'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100 dark:text-gray-400 dark:hover:text-white dark:hover:bg-gray-800'
                  }
                `}
              >
                <span>{tab.icon}</span>
                <span>{tab.label}</span>
              </button>
            ))}
          </nav>
        </CardBody>
      </Card>

      {/* Tab Content */}
      <div>
        {activeTab === 'general' && <GeneralSettings />}
        {activeTab === 'vm' && <VMSettings />}
        {activeTab === 'cli' && <CLISettings />}
        {activeTab === 'advanced' && (
          <Card>
            <CardHeader>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                Advanced Configuration
              </h2>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Advanced settings and configuration management tools.
              </p>
            </CardHeader>
            <CardBody className="space-y-6">
              {/* Configuration Info */}
              <div>
                <h3 className="text-md font-medium text-gray-900 dark:text-white mb-4">
                  Configuration Information
                </h3>
                {config && (
                  <div className="space-y-3">
                    <div className="flex justify-between items-center p-3 bg-gray-50 dark:bg-gray-800 rounded">
                      <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Config Version</span>
                      <span className="text-sm text-gray-900 dark:text-white">1.0.0</span>
                    </div>
                    <div className="flex justify-between items-center p-3 bg-gray-50 dark:bg-gray-800 rounded">
                      <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Last Modified</span>
                      <span className="text-sm text-gray-900 dark:text-white">
                        {new Date().toLocaleString()}
                      </span>
                    </div>
                    <div className="flex justify-between items-center p-3 bg-gray-50 dark:bg-gray-800 rounded">
                      <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Environment</span>
                      <span className="text-sm text-gray-900 dark:text-white">
                        {navigator.platform.includes('Mac') ? 'macOS' :
                         navigator.platform.includes('Linux') ? 'Linux' : 'Unknown'}
                      </span>
                    </div>
                  </div>
                )}
              </div>

              {/* Configuration Management */}
              <div>
                <h3 className="text-md font-medium text-gray-900 dark:text-white mb-4">
                  Configuration Management
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg">
                    <h4 className="font-medium text-gray-900 dark:text-white mb-2">Export Configuration</h4>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                      Save your current configuration to a JSON file for backup or sharing.
                    </p>
                    <Button
                      variant="secondary"
                      size="small"
                      onClick={() => setShowExportModal(true)}
                    >
                      Export
                    </Button>
                  </div>

                  <div className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg">
                    <h4 className="font-medium text-gray-900 dark:text-white mb-2">Import Configuration</h4>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                      Load configuration from a previously exported JSON file.
                    </p>
                    <Button
                      variant="secondary"
                      size="small"
                      onClick={() => setShowImportModal(true)}
                    >
                      Import
                    </Button>
                  </div>
                </div>
              </div>

              {/* Reset Configuration */}
              <div>
                <h3 className="text-md font-medium text-gray-900 dark:text-white mb-4">
                  Reset Configuration
                </h3>
                <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                  <h4 className="font-medium text-red-900 dark:text-red-100 mb-2">
                    Reset to Defaults
                  </h4>
                  <p className="text-sm text-red-800 dark:text-red-200 mb-3">
                    This will reset all configuration settings to their default values. This action cannot be undone.
                  </p>
                  <Button
                    variant="danger"
                    size="small"
                    onClick={() => setShowResetModal(true)}
                  >
                    Reset All Settings
                  </Button>
                </div>
              </div>
            </CardBody>
          </Card>
        )}
      </div>

      {/* Export Modal */}
      <Modal
        open={showExportModal}
        title="Export Configuration"
        onClose={() => setShowExportModal(false)}
      >
        <div className="space-y-4">
          <p>
            Export your current configuration to a JSON file. This can be used for backup or sharing your settings.
          </p>
          <Input
            label="Export Path"
            value={exportPath}
            onChange={setExportPath}
            placeholder="/path/to/config.json"
          />
          <div className="flex justify-end space-x-2">
            <Button
              variant="secondary"
              onClick={() => setShowExportModal(false)}
            >
              Cancel
            </Button>
            <Button onClick={handleExport}>
              Export
            </Button>
          </div>
        </div>
      </Modal>

      {/* Import Modal */}
      <Modal
        open={showImportModal}
        title="Import Configuration"
        onClose={() => setShowImportModal(false)}
      >
        <div className="space-y-4">
          <p>
            Import configuration from a previously exported JSON file. This will overwrite your current settings.
          </p>
          <Input
            label="Import Path"
            value={importPath}
            onChange={setImportPath}
            placeholder="/path/to/config.json"
          />
          <div className="flex justify-end space-x-2">
            <Button
              variant="secondary"
              onClick={() => setShowImportModal(false)}
            >
              Cancel
            </Button>
            <Button onClick={handleImport}>
              Import
            </Button>
          </div>
        </div>
      </Modal>

      {/* Reset Confirmation Modal */}
      <ConfirmModal
        open={showResetModal}
        title="Reset Configuration"
        message="Are you sure you want to reset all configuration settings to their default values? This action cannot be undone and will restart the application."
        confirmText="Reset"
        confirmVariant="danger"
        onConfirm={handleReset}
        onClose={() => setShowResetModal(false)}
      />
    </div>
  );
};