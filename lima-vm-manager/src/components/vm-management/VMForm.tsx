import React, { useState, useEffect } from 'react';
import {
  Button,
  Card,
  CardHeader,
  CardBody,
  Input,
  Textarea,
  Select,
  Checkbox,
  Modal,
  Loading,
} from '../ui';
import { useVMs } from '../../hooks/useVMs';
import { useNotifications } from '../../hooks/useNotifications';
import { validateVMName } from '../../utils/format';
import type { VMConfig, VMTemplate } from '../../types';

interface VMFormProps {
  vmId?: string; // If provided, edit existing VM; otherwise create new
  open: boolean;
  onClose: () => void;
  onSuccess?: (vm: any) => void;
}

export const VMForm: React.FC<VMFormProps> = ({
  vmId,
  open,
  onClose,
  onSuccess,
}) => {
  const { createVM, vmAPI } = useVMs();
  const { showSuccess, showError } = useNotifications();

  const [loading, setLoading] = useState(false);
  const [templates, setTemplates] = useState<VMTemplate[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<string>('');
  const [formData, setFormData] = useState<VMConfig>({
    name: '',
    template: '',
    cpus: 2,
    memory: 4096,
    disk: 20,
    network: {
      share_default: true,
    },
    mounts: [],
    environment: {},
    ports: [],
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [newMount, setNewMount] = useState({ location: '', writable: false });
  const [newPort, setNewPort] = useState({ guest: 0, host: 0, proto: 'tcp' as const });

  // Load templates and VM data on mount
  useEffect(() => {
    if (open) {
      loadTemplates();
      if (vmId) {
        loadVMData();
      } else {
        resetForm();
      }
    }
  }, [open, vmId]);

  const loadTemplates = async () => {
    try {
      const templateList = await vmAPI.getTemplates();
      setTemplates(templateList);
    } catch (error) {
      showError('Error', 'Failed to load VM templates');
    }
  };

  const loadVMData = async () => {
    if (!vmId) return;

    setLoading(true);
    try {
      const vm = await vmAPI.getDetails(vmId);
      setFormData(vm.config || formData);
      setSelectedTemplate(vm.template || '');
    } catch (error) {
      showError('Error', 'Failed to load VM data');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      template: '',
      cpus: 2,
      memory: 4096,
      disk: 20,
      network: {
        share_default: true,
      },
      mounts: [],
      environment: {},
      ports: [],
    });
    setSelectedTemplate('');
    setErrors({});
    setNewMount({ location: '', writable: false });
    setNewPort({ guest: 0, host: 0, proto: 'tcp' });
  };

  const handleTemplateChange = async (templateName: string) => {
    setSelectedTemplate(templateName);

    if (!templateName) return;

    try {
      const template = templates.find(t => t.name === templateName);
      if (template) {
        setFormData(prev => ({
          ...prev,
          template: templateName,
          cpus: template.default_resources.cpus,
          memory: template.default_resources.memory,
          disk: template.default_resources.disk,
        }));
      }
    } catch (error) {
      console.error('Failed to load template:', error);
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    // Name validation
    const nameValidation = validateVMName(formData.name);
    if (!nameValidation.valid) {
      newErrors.name = nameValidation.error || 'Invalid VM name';
    }

    // Template validation
    if (!formData.template) {
      newErrors.template = 'Please select a template';
    }

    // Resource validation
    if (!formData.cpus || formData.cpus < 1 || formData.cpus > 32) {
      newErrors.cpus = 'CPUs must be between 1 and 32';
    }

    if (!formData.memory || formData.memory < 512 || formData.memory > 131072) {
      newErrors.memory = 'Memory must be between 512 MB and 128 GB';
    }

    if (!formData.disk || formData.disk < 1 || formData.disk > 1024) {
      newErrors.disk = 'Disk size must be between 1 GB and 1 TB';
    }

    // Port validation
    for (const port of formData.ports || []) {
      if (port.guest < 1 || port.guest > 65535) {
        newErrors.ports = 'Guest port must be between 1 and 65535';
        break;
      }
      if (port.host < 1 || port.host > 65535) {
        newErrors.ports = 'Host port must be between 1 and 65535';
        break;
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setLoading(true);
    try {
      const result = vmId ? null : await createVM(formData);

      if (result) {
        showSuccess('Success', `VM "${formData.name}" has been ${vmId ? 'updated' : 'created'} successfully`);
        onSuccess?.(result);
        onClose();
      }
    } catch (error) {
      showError('Error', `Failed to ${vmId ? 'update' : 'create'} VM`);
    } finally {
      setLoading(false);
    }
  };

  const addMount = () => {
    if (!newMount.location.trim()) {
      setErrors({ ...errors, mount: 'Mount location is required' });
      return;
    }

    setFormData(prev => ({
      ...prev,
      mounts: [...(prev.mounts || []), { ...newMount }],
    }));
    setNewMount({ location: '', writable: false });
    setErrors({ ...errors, mount: '' });
  };

  const removeMount = (index: number) => {
    setFormData(prev => ({
      ...prev,
      mounts: prev.mounts?.filter((_, i) => i !== index) || [],
    }));
  };

  const addPort = () => {
    if (!newPort.guest || !newPort.host) {
      setErrors({ ...errors, port: 'Both guest and host ports are required' });
      return;
    }

    setFormData(prev => ({
      ...prev,
      ports: [...(prev.ports || []), { ...newPort }],
    }));
    setNewPort({ guest: 0, host: 0, proto: 'tcp' });
    setErrors({ ...errors, port: '' });
  };

  const removePort = (index: number) => {
    setFormData(prev => ({
      ...prev,
      ports: prev.ports?.filter((_, i) => i !== index) || [],
    }));
  };

  const addEnvironmentVar = () => {
    setFormData(prev => ({
      ...prev,
      environment: {
        ...prev.environment,
        [`var_${Date.now()}`]: '',
      },
    }));
  };

  const updateEnvironmentVar = (key: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      environment: {
        ...prev.environment,
        [key]: value,
      },
    }));
  };

  const removeEnvironmentVar = (key: string) => {
    const newEnv = { ...formData.environment };
    delete newEnv[key];
    setFormData(prev => ({
      ...prev,
      environment: newEnv,
    }));
  };

  if (loading && !open) {
    return null;
  }

  return (
    <Modal open={open} size="large" title={vmId ? 'Edit Virtual Machine' : 'Create Virtual Machine'}>
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loading size="large" text="Loading..." />
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Configuration */}
          <Card>
            <CardHeader>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Basic Configuration
              </h3>
            </CardHeader>
            <CardBody className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input
                  label="VM Name"
                  value={formData.name}
                  onChange={(value) => setFormData(prev => ({ ...prev, name: value }))}
                  error={errors.name}
                  required
                  placeholder="my-vm"
                />

                <Select
                  label="Template"
                  value={formData.template}
                  onChange={handleTemplateChange}
                  error={errors.template}
                  required
                  placeholder="Select a template"
                >
                  {templates.map((template) => (
                    <option key={template.name} value={template.name}>
                      {template.name} - {template.description}
                    </option>
                  ))}
                </Select>
              </div>

              {selectedTemplate && (
                <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                  <p className="text-sm text-blue-800 dark:text-blue-200">
                    <strong>Template Info:</strong> {templates.find(t => t.name === selectedTemplate)?.description}
                  </p>
                </div>
              )}
            </CardBody>
          </Card>

          {/* Resources */}
          <Card>
            <CardHeader>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Resources
              </h3>
            </CardHeader>
            <CardBody className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Input
                  label="CPUs"
                  type="number"
                  value={formData.cpus?.toString() || ''}
                  onChange={(value) => setFormData(prev => ({ ...prev, cpus: parseInt(value) || 0 }))}
                  error={errors.cpus}
                  min="1"
                  max="32"
                  required
                />

                <Input
                  label="Memory (MB)"
                  type="number"
                  value={formData.memory?.toString() || ''}
                  onChange={(value) => setFormData(prev => ({ ...prev, memory: parseInt(value) || 0 }))}
                  error={errors.memory}
                  min="512"
                  max="131072"
                  required
                />

                <Input
                  label="Disk Size (GB)"
                  type="number"
                  value={formData.disk?.toString() || ''}
                  onChange={(value) => setFormData(prev => ({ ...prev, disk: parseInt(value) || 0 }))}
                  error={errors.disk}
                  min="1"
                  max="1024"
                  required
                />
              </div>
            </CardBody>
          </Card>

          {/* Network */}
          <Card>
            <CardHeader>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Network Configuration
              </h3>
            </CardHeader>
            <CardBody className="space-y-4">
              <Checkbox
                label="Share default network"
                checked={formData.network?.share_default || false}
                onChange={(checked) => setFormData(prev => ({
                  ...prev,
                  network: { ...prev.network, share_default: checked },
                }))}
              />

              {/* Port Forwarding */}
              <div>
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">
                  Port Forwarding
                </label>

                {formData.ports && formData.ports.length > 0 && (
                  <div className="space-y-2 mb-4">
                    {formData.ports.map((port, index) => (
                      <div key={index} className="flex items-center space-x-2 p-2 bg-gray-50 dark:bg-gray-800 rounded">
                        <span className="text-sm font-mono">{port.guest}:{port.host} ({port.proto})</span>
                        <Button
                          size="small"
                          variant="danger"
                          onClick={() => removePort(index)}
                        >
                          Remove
                        </Button>
                      </div>
                    ))}
                  </div>
                )}

                <div className="flex items-end space-x-2">
                  <Input
                    label="Guest Port"
                    type="number"
                    value={newPort.guest || ''}
                    onChange={(value) => setNewPort(prev => ({ ...prev, guest: parseInt(value) || 0 }))}
                    min="1"
                    max="65535"
                    className="flex-1"
                  />
                  <Input
                    label="Host Port"
                    type="number"
                    value={newPort.host || ''}
                    onChange={(value) => setNewPort(prev => ({ ...prev, host: parseInt(value) || 0 }))}
                    min="1"
                    max="65535"
                    className="flex-1"
                  />
                  <Select
                    value={newPort.proto}
                    onChange={(value) => setNewPort(prev => ({ ...prev, proto: value as 'tcp' | 'udp' }))}
                    className="flex-1"
                  >
                    <option value="tcp">TCP</option>
                    <option value="udp">UDP</option>
                  </Select>
                  <Button onClick={addPort}>Add</Button>
                </div>
                {errors.port && (
                  <p className="text-sm text-error-600 dark:text-error-400">{errors.port}</p>
                )}
              </div>
            </CardBody>
          </Card>

          {/* Mounts */}
          <Card>
            <CardHeader>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Directory Mounts
              </h3>
            </CardHeader>
            <CardBody className="space-y-4">
              {formData.mounts && formData.mounts.length > 0 && (
                <div className="space-y-2">
                  {formData.mounts.map((mount, index) => (
                    <div key={index} className="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-800 rounded">
                      <span className="text-sm font-mono">{mount.location}</span>
                      <div className="flex items-center space-x-2">
                        <Badge variant={mount.writable ? 'success' : 'gray'} size="small">
                          {mount.writable ? 'Writable' : 'Read-only'}
                        </Badge>
                        <Button
                          size="small"
                          variant="danger"
                          onClick={() => removeMount(index)}
                        >
                          Remove
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <div className="flex items-end space-x-2">
                <Input
                  label="Mount Location"
                  value={newMount.location}
                  onChange={(value) => setNewMount(prev => ({ ...prev, location: value }))}
                  placeholder="/path/to/directory"
                  className="flex-1"
                />
                <Checkbox
                  label="Writable"
                  checked={newMount.writable}
                  onChange={(checked) => setNewMount(prev => ({ ...prev, writable: checked }))}
                />
                <Button onClick={addMount}>Add</Button>
              </div>
              {errors.mount && (
                <p className="text-sm text-error-600 dark:text-error-400">{errors.mount}</p>
              )}
            </CardBody>
          </Card>

          {/* Environment Variables */}
          <Card>
            <CardHeader>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Environment Variables
              </h3>
            </CardHeader>
            <CardBody className="space-y-4">
              {Object.entries(formData.environment || {}).map(([key, value]) => (
                <div key={key} className="flex items-center space-x-2">
                  <Input
                    placeholder="Variable name"
                    value={key.startsWith('var_') ? '' : key}
                    onChange={(newKey) => {
                      if (newKey.trim()) {
                        const newEnv = { ...formData.environment };
                        delete newEnv[key];
                        newEnv[newKey] = value;
                        setFormData(prev => ({ ...prev, environment: newEnv }));
                      }
                    }}
                    className="flex-1"
                  />
                  <Input
                    placeholder="Variable value"
                    value={value}
                    onChange={(newValue) => updateEnvironmentVar(key, newValue)}
                    className="flex-1"
                  />
                  <Button
                    size="small"
                    variant="danger"
                    onClick={() => removeEnvironmentVar(key)}
                  >
                    Remove
                  </Button>
                </div>
              ))}

              <Button variant="secondary" onClick={addEnvironmentVar}>
                Add Environment Variable
              </Button>
            </CardBody>
          </Card>

          {/* Actions */}
          <div className="flex justify-end space-x-3 pt-4">
            <Button variant="secondary" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" loading={loading}>
              {vmId ? 'Update VM' : 'Create VM'}
            </Button>
          </div>
        </form>
      )}
    </Modal>
  );
};