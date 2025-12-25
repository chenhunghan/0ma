import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Save } from 'lucide-react';
import { LimaInstance } from '../types/LimaInstance';
import { InstanceStatus } from '../types/InstanceStatus';
import { InstanceUIState } from '../types/InstanceUIState';
import { SessionType } from '../types/TerminalSession';
import { LimaConfig } from '../types/LimaConfig';
import TerminalView from './TerminalView';
import { limaService } from '../services/limaService';
import { parse, stringify } from 'yaml';
import Editor from 'react-simple-code-editor';
import Prism from 'prismjs';
import 'prismjs/components/prism-yaml';
import 'prismjs/components/prism-bash';
import { MOCK_PODS, MOCK_SERVICES } from '../services/mockK8sData';
import { TopBar } from './TopBar';
import { TabHeaders } from './TabHeaders';
import { K8sTabHeader } from './K8sTabHeader';
import { LimaTabHeader } from './LimaTabHeader';
import { LimaConfigTabHeader } from './LimaConfigTabHeader';
import { LimaConfigPanel } from './LimaConfigPanel';
import { LimaPanel } from './LimaPanel';
import { K8sNodePanel } from './K8sNodePanel';
import { K8sPodPanel } from './K8sPodPanel';
import { K8sSvcPanel } from './K8sSvcPanel';
import { ConfirmationModal } from './ConfirmationModal';

interface InstanceDetailProps {
  instances: LimaInstance[];
  selectedId: string;
  onSelect: (id: string) => void;
  onCreate: () => void;
  isCreating: boolean;
  instance: LimaInstance;
  onDelete: (instanceName: string) => Promise<void> | void;
  onStart?: (instanceName: string) => void;
  onStop?: (instanceName: string) => void;
}

const DEFAULT_UI_STATE: InstanceUIState = {
  activeTab: 'k8s',
  panelHeight: 280,
  k8s: {
    showNodePanel: false,
    showPodsPanel: true,
    showServicesPanel: false,
    sessions: [],
  },
  lima: {
    showPanel: true,
    sessions: [],
  },
  config: {
    showPanel: true,
    showScripts: false,
    showProbes: false,
    draftConfig: undefined,
    draftYaml: undefined,
  },
};

const InstanceDetail: React.FC<InstanceDetailProps> = ({
  instances,
  selectedId,
  onSelect,
  onCreate,
  isCreating,
  instance,
  onDelete,
  onStart,
  onStop,
}) => {
  // Global instances state map
  const [instancesState, setInstancesState] = useState<Record<string, InstanceUIState>>({});

  // Helper to get current instance state or default
  const getCurrentState = (): InstanceUIState => {
    return instancesState[selectedId] || DEFAULT_UI_STATE;
  };

  const uiState = getCurrentState();

  // Helper to update current instance state
  const updateUiState = useCallback((update: Partial<InstanceUIState> | ((prev: InstanceUIState) => Partial<InstanceUIState>)) => {
    setInstancesState((prevGlobal) => {
      const currentState = prevGlobal[selectedId] || DEFAULT_UI_STATE;
      const changes = typeof update === 'function' ? update(currentState) : update;
      
      return {
        ...prevGlobal,
        [selectedId]: {
          ...currentState,
          ...changes,
        },
      };
    });
  }, [selectedId]);

  // Derived states
  // configObject: The structured config we operate on (Source of Truth)
  // yamlString: The text we show in the editor
  const configObject = uiState.config.draftConfig ?? instance.config;
  const yamlString = uiState.config.draftYaml ?? stringify(instance.config);

  // Helper to update both config object and its yaml string representation
  const setConfig = (newConfig: LimaConfig) => {
      updateUiState(prev => ({
          config: {
              ...prev.config,
              draftConfig: newConfig,
              draftYaml: stringify(newConfig)
          }
      }));
  };
  
  // Helper to update only yaml string (when typing in editor) and try to parse
  const setYamlAndParse = (newYaml: string) => {
      // Always update string
      updateUiState(prev => ({
          config: { ...prev.config, draftYaml: newYaml }
      }));

      // Try to parse to update object
      try {
          const parsed = parse(newYaml);
          if (parsed && typeof parsed === 'object') {
             updateUiState(prev => ({
                 config: { ...prev.config, draftConfig: parsed as LimaConfig }
             }));
          }
      } catch (e) {
          // ignore invalid yaml while typing
      }
  };


  const [isSaving, setIsSaving] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  
  // Delete Modal State
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  // Shared Panel Resize State
  const isDraggingPanel = useRef(false);
  const dragStartRef = useRef<{ y: number; h: number } | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Selection States
  const [selectedPodId, setSelectedPodId] = useState<string>(MOCK_PODS[0].id);
  const [selectedServiceId, setSelectedServiceId] = useState<string>(MOCK_SERVICES[0].id);

  // Reset ephemeral UI state when instance ID changes.
  useEffect(() => {
    setShowDeleteModal(false);
    setIsProcessing(false);
    setIsSaving(false);
  }, [instance.id]);

  const setActiveTab = (tab: 'lima' | 'k8s' | 'config') => {
    updateUiState({ activeTab: tab });
  };

  const handleStart = () => {
    if (onStart) {
      onStart(instance.name);
    }
  };

  const handleStop = () => {
    if (onStop) {
      onStop(instance.name);
    }
  };

  // Trigger modal
  const handleDeleteClick = () => {
    setShowDeleteModal(true);
  };

  // Actual delete execution
  const executeDelete = async () => {
    setIsProcessing(true);
    setShowDeleteModal(false);
    await onDelete(instance.name);
  };

  const handleSaveConfig = async () => {
    setIsSaving(true);
    try {
        // Save using the current object state
        await limaService.updateConfig(instance.id, configObject);
        
        // Clear drafts
        updateUiState(prev => ({
            config: { 
                ...prev.config, 
                draftConfig: undefined, 
                draftYaml: undefined 
            }
        }));
    } catch (e) {
        console.error("Failed to save config", e);
    }
    setIsSaving(false);
  };

  // --- Configuration Modification Helpers (Object Manipulation) ---

  const updateConfigField = (field: string, value: any) => {
    const newConfig = { ...configObject, [field]: value };
    setConfig(newConfig);
  };

  const updateProvisionScript = (index: number, key: 'mode' | 'script', value: string) => {
    const newProvision = [...(configObject.provision || [])];
    if (!newProvision[index]) return;
    newProvision[index] = { ...newProvision[index], [key]: value };
    const newConfig = { ...configObject, provision: newProvision };
    setConfig(newConfig);
  };

  const addProvisionScript = () => {
    const newScript = { mode: 'system', script: '# New Script\n' };
    const newProvision = [...(configObject.provision || []), newScript];
    const newConfig = { ...configObject, provision: newProvision };
    setConfig(newConfig);
    
    // Auto expand
    updateUiState((prev) => ({
      config: { ...prev.config, showScripts: true }
    }));
  };

  const removeProvisionScript = (index: number) => {
    const newProvision = [...(configObject.provision || [])];
    newProvision.splice(index, 1);
    const newConfig = { ...configObject, provision: newProvision };
    setConfig(newConfig);
  };

  const updateProbeScript = (
    index: number,
    key: 'description' | 'script' | 'hint' | 'mode',
    value: string
  ) => {
    const newProbes = [...(configObject.probes || [])];
    if (!newProbes[index]) return;
    // @ts-ignore - dynamic access
    newProbes[index] = { ...newProbes[index], [key]: value };
    const newConfig = { ...configObject, probes: newProbes };
    setConfig(newConfig);
  };

  const addProbeScript = () => {
    const newProbe = {
      description: 'New Probe',
      script: '#!/bin/bash\nexit 0\n',
      hint: 'Check something',
    };
    const newProbes = [...(configObject.probes || []), newProbe];
    const newConfig = { ...configObject, probes: newProbes };
    setConfig(newConfig);
    
    // Auto expand
    updateUiState((prev) => ({
      config: { ...prev.config, showProbes: true }
    }));
  };

  const removeProbeScript = (index: number) => {
    const newProbes = [...(configObject.probes || [])];
    newProbes.splice(index, 1);
    const newConfig = { ...configObject, probes: newProbes };
    setConfig(newConfig);
  };

  // --- End Configuration Helpers ---

  const addSession = (type: SessionType, target: string) => {
    const id = `${type}-${target}`;
    if (uiState.activeTab === 'k8s') {
        const exists = uiState.k8s.sessions.find(s => s.id === id);
        if (!exists) {
            updateUiState(prev => ({
                k8s: { ...prev.k8s, sessions: [...prev.k8s.sessions, { id, type, target }] }
            }));
        }
    } else {
        const exists = uiState.lima.sessions.find(s => s.id === id);
        if (!exists) {
            updateUiState(prev => ({
                lima: { ...prev.lima, sessions: [...prev.lima.sessions, { id, type, target }] }
            }));
        }
    }
  };

  const handleCloseSession = (id: string) => {
    if (uiState.activeTab === 'k8s') {
        updateUiState(prev => ({
            k8s: { ...prev.k8s, sessions: prev.k8s.sessions.filter(s => s.id !== id) }
        }));
    } else {
         updateUiState(prev => ({
            lima: { ...prev.lima, sessions: prev.lima.sessions.filter(s => s.id !== id) }
        }));
    }
  };

  const handleOpenNodeShell = () => addSession('node-shell', 'node-01');
  const handleOpenPodShell = (podName: string) => addSession('pod-shell', podName);
  const handleOpenPodLogs = (podName: string) => addSession('pod-logs', podName);

  const toggleNodePanel = () => {
    updateUiState(prev => ({
        k8s: { ...prev.k8s, showNodePanel: !prev.k8s.showNodePanel, showPodsPanel: false, showServicesPanel: false }
    }));
  };
  const togglePodsPanel = () => {
    updateUiState(prev => ({
        k8s: { ...prev.k8s, showPodsPanel: !prev.k8s.showPodsPanel, showNodePanel: false, showServicesPanel: false }
    }));
  };
  const toggleServicesPanel = () => {
    updateUiState(prev => ({
        k8s: { ...prev.k8s, showServicesPanel: !prev.k8s.showServicesPanel, showNodePanel: false, showPodsPanel: false }
    }));
  };
  const toggleLimaPanel = () => {
    updateUiState(prev => ({
        lima: { ...prev.lima, showPanel: !prev.lima.showPanel }
    }));
  };
  const toggleConfigPanel = () => {
     updateUiState(prev => ({
        config: { ...prev.config, showPanel: !prev.config.showPanel }
    }));
  };

  // Resize Handlers need to be stable but aware of current instance updates.
  const handlePanelResizeMove = useCallback((e: MouseEvent) => {
    if (!isDraggingPanel.current || !dragStartRef.current) return;
    const containerHeight = containerRef.current?.clientHeight || window.innerHeight;
    const maxHeight = containerHeight * 0.95;
    const delta = e.clientY - dragStartRef.current.y;
    const newHeight = Math.max(150, Math.min(dragStartRef.current.h + delta, maxHeight));
    
    updateUiState({ panelHeight: newHeight });
  }, [updateUiState]);

  const handlePanelResizeEnd = useCallback(() => {
    isDraggingPanel.current = false;
    dragStartRef.current = null;
    document.body.style.cursor = 'default';
    document.removeEventListener('mousemove', handlePanelResizeMove);
    document.removeEventListener('mouseup', handlePanelResizeEnd);
  }, [handlePanelResizeMove]);

  const handlePanelResizeStart = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    e.preventDefault();
    const panel = e.currentTarget.parentElement;
    if (!panel) return;

    const startH = panel.getBoundingClientRect().height;
    dragStartRef.current = { y: e.clientY, h: startH };
    isDraggingPanel.current = true;

    document.body.style.cursor = 'row-resize';
    document.addEventListener('mousemove', handlePanelResizeMove);
    document.addEventListener('mouseup', handlePanelResizeEnd);
  }, [handlePanelResizeMove, handlePanelResizeEnd]);

  const isRunning = instance.status === InstanceStatus.Running;
  const activeTab = uiState.activeTab;
  const currentSessions = activeTab === 'k8s' ? uiState.k8s.sessions : uiState.lima.sessions;

  // Check if config has changed
  // Simple check via stringify comparison
  const hasChanges = uiState.config.draftConfig !== undefined && stringify(uiState.config.draftConfig) !== stringify(instance.config);

  return (
    <div className="flex flex-col h-full bg-black text-zinc-300 font-mono">
      <TopBar
        instances={instances}
        selectedId={selectedId}
        onSelect={onSelect}
        onCreate={onCreate}
        isCreating={isCreating}
        instance={instance}
        isProcessing={isProcessing}
        onStart={handleStart}
        onStop={handleStop}
        onDelete={handleDeleteClick}
      />

      <ConfirmationModal
        isOpen={showDeleteModal}
        title="TERMINATION SEQUENCE"
        message={`Are you sure you want to permanently delete instance "${instance.name}"? This action is irreversible and all local data associated with this virtual machine will be destroyed.`}
        confirmLabel="DELETE INSTANCE"
        cancelLabel="ABORT"
        onConfirm={executeDelete}
        onCancel={() => setShowDeleteModal(false)}
        isProcessing={isProcessing}
      />

      <div className="border-b border-zinc-800 flex flex-col md:flex-row md:items-end justify-between bg-black relative z-20">
        <TabHeaders activeTab={activeTab} setActiveTab={setActiveTab} />
        <div className="px-4 py-2 flex items-center gap-4 text-xs font-mono overflow-x-auto border-t md:border-t-0 border-zinc-800">
          {activeTab === 'k8s' ? (
            <K8sTabHeader
              instance={instance}
              showNodeInfo={uiState.k8s.showNodePanel}
              toggleNodeInfo={toggleNodePanel}
              showPodsPanel={uiState.k8s.showPodsPanel}
              togglePodsPanel={togglePodsPanel}
              showServicesPanel={uiState.k8s.showServicesPanel}
              toggleServicesPanel={toggleServicesPanel}
            />
          ) : activeTab === 'lima' ? (
            <LimaTabHeader
              instance={instance}
              showLimaPanel={uiState.lima.showPanel}
              toggleLimaPanel={toggleLimaPanel}
            />
          ) : (
            <LimaConfigTabHeader
              showConfigPanel={uiState.config.showPanel}
              toggleConfigPanel={toggleConfigPanel}
            />
          )}
        </div>
      </div>

      <div className="flex-1 relative overflow-hidden bg-black flex flex-col" ref={containerRef}>
        {activeTab === 'config' ? (
          <div className="h-full flex flex-col relative overflow-hidden">
            {uiState.config.showPanel && (
              <LimaConfigPanel
                parsedConfig={configObject}
                updateConfigField={updateConfigField}
                updateProvisionScript={updateProvisionScript}
                addProvisionScript={addProvisionScript}
                removeProvisionScript={removeProvisionScript}
                updateProbeScript={updateProbeScript}
                addProbeScript={addProbeScript}
                removeProbeScript={removeProbeScript}
                showScripts={uiState.config.showScripts}
                setShowScripts={(show) => updateUiState(prev => ({ config: { ...prev.config, showScripts: show } }))}
                showProbes={uiState.config.showProbes}
                setShowProbes={(show) => updateUiState(prev => ({ config: { ...prev.config, showProbes: show } }))}
                onClose={() => updateUiState(prev => ({ config: { ...prev.config, showPanel: false } }))}
                panelHeight={uiState.panelHeight}
                handlePanelResizeStart={handlePanelResizeStart}
              />
            )}

            <div className="flex-1 relative bg-[#2d2d2d] overflow-y-auto">
              <Editor
                value={yamlString}
                onValueChange={setYamlAndParse}
                highlight={(code) =>
                  Prism.highlight(code, Prism.languages.yaml, 'yaml')
                }
                padding={20}
                className="prism-editor min-h-full font-mono"
                style={{
                  fontSize: 11,
                  backgroundColor: '#000000',
                  color: '#e0e0e0',
                }}
                textareaClassName="focus:outline-none"
              />

              {hasChanges && (
                <div className="absolute bottom-6 right-6 z-50">
                  <button
                    onClick={handleSaveConfig}
                    disabled={isSaving}
                    className="flex items-center gap-2 px-6 py-3 text-sm font-bold uppercase tracking-wider bg-zinc-100 hover:bg-white text-black border border-zinc-100 shadow-xl transition-all hover:scale-105"
                  >
                    <Save className="w-4 h-4" />
                    {isSaving ? 'WRITING...' : 'SAVE CHANGES'}
                  </button>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="h-full w-full flex flex-col relative">
            {uiState.lima.showPanel && activeTab === 'lima' && (
              <LimaPanel
                instance={instance}
                parsedConfig={instance.config}
                panelHeight={uiState.panelHeight}
                handlePanelResizeStart={handlePanelResizeStart}
                onClose={() => updateUiState(prev => ({ lima: { ...prev.lima, showPanel: false } }))}
              />
            )}

            {uiState.k8s.showNodePanel && activeTab === 'k8s' && (
              <K8sNodePanel
                instance={instance}
                panelHeight={uiState.panelHeight}
                onClose={() => updateUiState(prev => ({ k8s: { ...prev.k8s, showNodePanel: false } }))}
                handleOpenNodeShell={handleOpenNodeShell}
                handlePanelResizeStart={handlePanelResizeStart}
              />
            )}

            {uiState.k8s.showPodsPanel && activeTab === 'k8s' && (
              <K8sPodPanel
                mockPods={MOCK_PODS}
                selectedPodId={selectedPodId}
                setSelectedPodId={setSelectedPodId}
                panelHeight={uiState.panelHeight}
                handlePanelResizeStart={handlePanelResizeStart}
                onClose={() => updateUiState(prev => ({ k8s: { ...prev.k8s, showPodsPanel: false } }))}
                handleOpenPodLogs={handleOpenPodLogs}
                handleOpenPodShell={handleOpenPodShell}
              />
            )}

            {uiState.k8s.showServicesPanel && activeTab === 'k8s' && (
              <K8sSvcPanel
                mockServices={MOCK_SERVICES}
                selectedServiceId={selectedServiceId}
                setSelectedServiceId={setSelectedServiceId}
                panelHeight={uiState.panelHeight}
                handlePanelResizeStart={handlePanelResizeStart}
                onClose={() => updateUiState(prev => ({ k8s: { ...prev.k8s, showServicesPanel: false } }))}
              />
            )}

            <div className="flex-1 relative w-full overflow-hidden min-h-0">
              <TerminalView
                key={`${instance.id}-${activeTab}`}
                instanceId={instance.id}
                instanceName={instance.name}
                status={instance.status}
                mode={activeTab === 'k8s' ? 'k8s' : 'lima'}
                sessions={currentSessions}
                onCloseSession={handleCloseSession}
              />

              {!isRunning && (
                <div className="absolute inset-0 bg-black/80 flex items-center justify-center z-10">
                  <div className="border border-zinc-700 bg-zinc-950 p-6 min-w-75 text-center shadow-2xl">
                    <div className="text-red-500 font-bold mb-2 uppercase tracking-widest text-lg animate-pulse">
                      SYSTEM HALTED
                    </div>
                    <div className="text-zinc-500 text-xs mb-6 font-mono">
                      Instance {instance.name} is currently stopped.
                    </div>
                    <button
                      onClick={handleStart}
                      className="w-full py-2 bg-zinc-800 hover:bg-zinc-700 text-white font-mono text-sm uppercase border border-zinc-600 hover:border-zinc-500 transition-colors"
                    >
                      [ INITIALIZE BOOT ]
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default InstanceDetail;