import React, { useState, useEffect } from 'react';
import { 
  Terminal,
} from 'lucide-react';
import { LimaInstance } from './types/LimaInstance';
import { InstanceStatus } from './types/InstanceStatus';
import { LimaConfig } from './types/LimaConfig';
import { limaService } from './services/limaService';
import InstanceDetail from './components/InstanceDetail';
import { CreateInstanceModal } from './components/CreateInstanceModal';
import { ConfirmationModal } from './components/ConfirmationModal';

export const App: React.FC = () => {
  const [instances, setInstances] = useState<LimaInstance[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  
  // Modal States
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  
  const [showStartModal, setShowStartModal] = useState(false);
  const [createdInstanceId, setCreatedInstanceId] = useState<string | null>(null);
  const [isStarting, setIsStarting] = useState(false);

  const fetchInstances = async () => {
    const data = await limaService.getInstances();
    setInstances(data);
    setIsLoading(false);
    
    // Auto-select first instance if none selected
    if (!selectedId && data.length > 0) {
      setSelectedId(data[0].id);
    }
  };

  useEffect(() => {
    fetchInstances();
    const interval = setInterval(() => {
        limaService.getInstances().then(setInstances);
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  const handleOpenCreateModal = () => {
    setShowCreateModal(true);
  };

  const handleCreateConfirm = async (name: string, config: LimaConfig) => {
    setIsCreating(true);
    const newInstance = await limaService.createInstance(name, config);
    await fetchInstances();
    
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
    await fetchInstances();
    setIsStarting(false);
    setShowStartModal(false);
    setCreatedInstanceId(null);
  };

  const handleDelete = async () => {
      // Fetch latest instances to determine what to show next
      const data = await limaService.getInstances();
      
      if (data.length > 0) {
          // Priority 1: Switch to a Running instance
          const runningInstance = data.find(i => i.status === InstanceStatus.Running);
          const nextId = runningInstance ? runningInstance.id : data[0].id;
          
          // CRITICAL: Update selectedId FIRST so the UI switches to the valid instance
          // before the old list (which still contains the deleted one in React state) is updated.
          // This prevents the "Loading Data Stream" fallback which occurs when selectedId is invalid.
          setSelectedId(nextId);
          setInstances(data);
      } else {
          // No instances left: Update instances first to clear the list, 
          // then clear selection to show the empty state.
          setInstances(data);
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
                onUpdate={fetchInstances}
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