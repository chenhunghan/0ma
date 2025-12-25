import React, { useState, useEffect } from 'react';
import { 
  Terminal,
} from 'lucide-react';
import { InstanceStatus } from './types/InstanceStatus';
import { LimaConfig } from './types/LimaConfig';
import { limaService } from './services/limaService';
import { useLimaInstances } from './hooks/useLimaInstances';
import InstanceDetail from './components/InstanceDetail';
import { CreateInstanceModal } from './components/CreateInstanceModal';
import { ConfirmationModal } from './components/ConfirmationModal';

export const App: React.FC = () => {
  const { instances, isLoading, refreshInstances } = useLimaInstances();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  
  // Modal States
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  
  const [showStartModal, setShowStartModal] = useState(false);
  const [createdInstanceId, setCreatedInstanceId] = useState<string | null>(null);
  const [isStarting, setIsStarting] = useState(false);

  // Auto-select first instance if none selected
  useEffect(() => {
    if (!selectedId && instances.length > 0) {
      setSelectedId(instances[0].id);
    }
  }, [instances, selectedId]);

  const handleOpenCreateModal = () => {
    setShowCreateModal(true);
  };

  const handleCreateConfirm = async (name: string, config: LimaConfig) => {
    setIsCreating(true);
    const newInstance = await limaService.createInstance(name, config);
    
    // Select the new instance
    setSelectedId(newInstance.id);
    
    setIsCreating(false);
    setShowCreateModal(false);

    // Prompt to start
    setCreatedInstanceId(newInstance.id);
    setShowStartModal(true);
  };

  const handleStartCreatedInstance = async () => {
    if (!createdInstanceId) return;
    setIsStarting(true);
    await limaService.startInstance(createdInstanceId);
    await refreshInstances();
    setIsStarting(false);
    setShowStartModal(false);
    setCreatedInstanceId(null);
  };

  const handleDelete = async () => {
      if (instances.length > 0) {
          // Priority 1: Switch to a Running instance
          const runningInstance = instances.find(i => i.status === InstanceStatus.Running);
          const nextId = runningInstance ? runningInstance.id : instances[0].id;
          
          // Update selectedId to switch to the valid instance
          setSelectedId(nextId);
      } else {
          // No instances left: clear selection to show the empty state
          setSelectedId(null);
      }
  };

  const selectedInstance = instances.find(i => i.id === selectedId);

  return (
    <div className="h-screen bg-black text-zinc-300 font-mono overflow-hidden flex flex-col selection:bg-zinc-700 selection:text-white">
        {/* MODALS */}
        <CreateInstanceModal 
            isOpen={showCreateModal}
            onClose={() => setShowCreateModal(false)}
            onCreate={handleCreateConfirm}
            isProcessing={isCreating}
        />
        
        <ConfirmationModal 
            isOpen={showStartModal}
            title="INSTANCE CREATED"
            message="The virtual machine has been successfully provisioned. Do you want to initialize the boot sequence now?"
            confirmLabel="START INSTANCE"
            cancelLabel="LATER"
            variant="success"
            onConfirm={handleStartCreatedInstance}
            onCancel={() => setShowStartModal(false)}
            isProcessing={isStarting}
        />

        {isLoading ? (
            <div className="flex-1 flex flex-col items-center justify-center text-zinc-500 gap-4">
                <div className="font-mono text-sm">
                    <span className="text-green-500">➜</span> SYSTEM CHECK...
                </div>
            </div>
        ) : instances.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center text-zinc-500 gap-6">
                <div className="w-24 h-24 border border-zinc-800 flex items-center justify-center bg-zinc-900/50">
                    <Terminal className="w-10 h-10 opacity-50" />
                </div>
                <div className="text-center font-mono">
                    <h2 className="text-lg font-bold text-zinc-300 uppercase">No Instances Detected</h2>
                    <p className="text-xs text-zinc-600 mt-2 max-w-xs mx-auto">
                        SYSTEM READY. AWAITING INPUT.
                    </p>
                </div>
                <button 
                    onClick={handleOpenCreateModal}
                    className="flex items-center gap-2 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 border border-zinc-700 px-6 py-2 text-xs font-bold uppercase tracking-wider transition-all hover:text-white"
                >
                    [ CREATE INSTANCE ]
                </button>
            </div>
        ) : selectedInstance ? (
             <InstanceDetail 
                // We do NOT use a key here to prevent unmounting the header when switching.
                instances={instances}
                selectedId={selectedInstance.id}
                onSelect={setSelectedId}
                onCreate={handleOpenCreateModal}
                instance={selectedInstance}
                onDelete={handleDelete}
                isCreating={isCreating}
             />
        ) : (
            <div className="flex-1 flex items-center justify-center">
                 <div className="animate-pulse text-zinc-600 font-mono text-xs">LOADING DATA STREAM...</div>
            </div>
        )}
    </div>
  );
};