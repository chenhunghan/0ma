import React, { useState, useEffect } from 'react';
import { Loader2, Terminal, CheckCircle2, XCircle, AlertCircle, Check } from 'lucide-react';
import { useLimaConfig } from '../hooks/useLimaConfig';
import { LimaConfigForm } from './LimaConfigForm';
import { InstanceModalLogViewer } from './InstanceModalLogViewer';
import { useLimaCreateLogs } from '../hooks/useLimaCreateLogs';
import { useDefaultK0sLimaConfig } from '../hooks/useDefaultK0sLimaConfig';
import { useLimaInstance } from '../hooks/useLimaInstance';
import { useIsInstanceRegistered } from '../hooks/useIsInstanceRegistered';
import { Modal } from './Modal';

function getRandomInstanceName(): string {
  const hash = Math.random().toString(36).substring(2, 6);
  return `0ma-${hash}`;
};

interface CreateInstanceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (instanceName: string) => void;
  onError?: (error: string) => void;
}

export const CreateInstanceModal: React.FC<CreateInstanceModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  onError,
}) => {
  const [name, setName] = useState(getRandomInstanceName());
  const [installHelm, setInstallHelm] = useState(true);
  const [installLocalPathProvisioner, setInstallLocalPathProvisioner] = useState(true);

  const { defaultConfig } = useDefaultK0sLimaConfig(name, installHelm, installLocalPathProvisioner);
  const {
    config,
    updateConfigField,
    updateProvisionScript,
    addProvisionScript,
    removeProvisionScript,
    updateProbeScript,
    addProbeScript,
    removeProbeScript
  } = useLimaConfig(defaultConfig);
  const { createInstance } = useLimaInstance();

  const { logs, isCreating, error: creationError, reset } = useLimaCreateLogs(
    onSuccess,
    onError,
    isOpen
  );

  const showLogs = isCreating || logs.length > 0;

  // Check if instance name already exists
  const { data: isRegistered } = useIsInstanceRegistered(
    name,
    !showLogs // Only check when not showing logs
  );

  // Store reset in a ref to avoid it triggering useEffect re-runs
  const resetRef = React.useRef(reset);
  resetRef.current = reset;

  // Reset form when modal is closed
  useEffect(() => {
    if (!isOpen) {
      // Reset everything when modal closes
      setName(getRandomInstanceName());
      resetRef.current();
    }
  }, [isOpen]);

  const handleSubmit = () => {
    createInstance({ config, instanceName: name });
  };

  const creationSuccess = !isCreating && !creationError && logs.length > 0;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Create New Instance"
      subTitle="CONFIGURE INITIAL ENVIRONMENT"
      icon={<Terminal className="w-4 h-4 text-emerald-500" />}
      maxWidth="max-w-4xl"
      height="h-[80vh]"
      isProcessing={isCreating}
      footer={
        !showLogs ? (
          <>
            <button
              onClick={onClose}
              className="px-6 py-2 text-xs font-bold uppercase tracking-wider text-zinc-400 hover:text-white transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={!name.trim() || isRegistered}
              className="px-8 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold uppercase tracking-wider text-xs shadow-lg transition-all hover:scale-105 disabled:opacity-50 disabled:scale-100 disabled:cursor-not-allowed flex items-center gap-2"
            >
              Create Instance
            </button>
          </>
        ) : (
          <button
            onClick={onClose}
            disabled={isCreating}
            className="px-8 py-2.5 bg-zinc-700 hover:bg-zinc-600 text-white font-bold uppercase tracking-wider text-xs shadow-lg transition-all hover:scale-105 disabled:opacity-50 disabled:scale-100 disabled:cursor-not-allowed"
          >
            {isCreating ? 'Creating...' : 'Close'}
          </button>
        )
      }
    >
      <div className="flex-1 overflow-hidden flex flex-col gap-6">
        {!showLogs ? (
          <>
            {/* Instance Name Input */}
            <div className="flex flex-col gap-1.5 shrink-0">
              <label className="text-xs font-bold uppercase text-zinc-400">Instance Name</label>
              <input
                autoFocus
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. k8s-worker-01"
                className={`bg-black border px-4 py-2.5 text-sm text-white focus:outline-none transition-colors w-full font-mono placeholder:text-zinc-700 ${isRegistered ? 'border-red-500 focus:border-red-500' : 'border-zinc-800 focus:border-emerald-500'
                  }`}
              />
              {isRegistered && (
                <div className="flex items-center gap-2 text-red-500 text-xs mt-1">
                  <AlertCircle className="w-3 h-3" />
                  <span>An instance with this name already exists</span>
                </div>
              )}
            </div>

            {/* Additional Components */}
            <div className="flex flex-col gap-1.5 shrink-0">
              <label className="text-[10px] font-bold uppercase text-zinc-500 tracking-widest">Additional Components</label>
              <div className="flex gap-8 p-3 bg-black border border-zinc-800 rounded">
                <label className="flex items-center gap-3 cursor-pointer group">
                  <div className={`w-4 h-4 border flex items-center justify-center transition-all ${installHelm ? 'bg-emerald-600 border-emerald-500' : 'bg-transparent border-zinc-700'}`}>
                    {installHelm && <Check className="w-3 h-3 text-white" />}
                  </div>
                  <input
                    type="checkbox"
                    className="hidden"
                    checked={installHelm}
                    onChange={(e) => setInstallHelm(e.target.checked)}
                  />
                  <span className={`text-[10px] font-bold uppercase transition-colors ${installHelm ? 'text-zinc-200' : 'text-zinc-500 group-hover:text-zinc-400'}`}>Helm CLI</span>
                </label>

                <label className="flex items-center gap-3 cursor-pointer group">
                  <div className={`w-4 h-4 border flex items-center justify-center transition-all ${installLocalPathProvisioner ? 'bg-emerald-600 border-emerald-500' : 'bg-transparent border-zinc-700'}`}>
                    {installLocalPathProvisioner && <Check className="w-3 h-3 text-white" />}
                  </div>
                  <input
                    type="checkbox"
                    className="hidden"
                    checked={installLocalPathProvisioner}
                    onChange={(e) => setInstallLocalPathProvisioner(e.target.checked)}
                  />
                  <span className={`text-[10px] font-bold uppercase transition-colors ${installLocalPathProvisioner ? 'text-zinc-200' : 'text-zinc-500 group-hover:text-zinc-400'}`}>Local Path Provisioner</span>
                </label>
              </div>
            </div>

            {/* Config Form Wrapper */}
            <div className="flex-1 min-h-0 flex flex-col border border-zinc-800 rounded bg-zinc-900/30 overflow-hidden">
              <div className="px-4 py-2 bg-zinc-900 border-b border-zinc-800">
                <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">Configuration Profile</span>
              </div>
              <div className="flex-1 overflow-auto">
                <div className="h-full">
                  <LimaConfigForm
                    parsedConfig={config}
                    updateConfigField={updateConfigField}
                    updateProvisionScript={updateProvisionScript}
                    addProvisionScript={addProvisionScript}
                    removeProvisionScript={removeProvisionScript}
                    updateProbeScript={updateProbeScript}
                    addProbeScript={addProbeScript}
                    removeProbeScript={removeProbeScript}
                  />
                </div>
              </div>
            </div>
          </>
        ) : (
          <>
            {/* Instance Info */}
            <div className="flex items-center gap-3 px-4 py-2 bg-zinc-900 border border-zinc-800 rounded shrink-0">
              <Terminal className="w-4 h-4 text-emerald-500" />
              <div className="flex-1">
                <div className="text-sm font-bold text-white">{name}</div>
                <div className="text-[10px] text-zinc-500 uppercase tracking-wider">
                  {isCreating && 'Provisioning Instance...'}
                  {creationSuccess && 'Instance Created Successfully'}
                  {creationError && 'Creation Failed'}
                </div>
              </div>
              {isCreating && <Loader2 className="w-4 h-4 animate-spin text-emerald-500" />}
              {creationSuccess && <CheckCircle2 className="w-4 h-4 text-emerald-500" />}
              {creationError && <XCircle className="w-4 h-4 text-red-500" />}
            </div>

            {/* Log Viewer */}
            <div className="flex-1 min-h-0 flex flex-col border border-zinc-800 rounded overflow-hidden">
              <div className="px-4 py-2 bg-zinc-900 border-b border-zinc-800">
                <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">Creation Logs</span>
              </div>
              <div className="flex-1 overflow-hidden">
                <InstanceModalLogViewer logs={logs} />
              </div>
            </div>
          </>
        )}
      </div>
    </Modal>
  );
};