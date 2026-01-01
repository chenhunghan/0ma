import React, { useState, useCallback } from 'react';
import {
  Terminal,
} from 'lucide-react';
import { InstanceStatus } from './types/InstanceStatus';
import { useLimaInstance } from './hooks/useLimaInstance';
import { useSelectedInstance } from './hooks/useSelectedInstance';
import InstanceDetail from './components/InstanceDetail';
import { LimaInstance } from './types/LimaInstance';
import { CreateInstanceModal } from './components/CreateInstanceModal';
import { ConfirmationModal } from './components/ConfirmationModal';
import { StartLogsModal } from './components/StartLogsModal';
import { StopInstanceModal } from './components/StopInstanceModal';
import { DeleteInstanceModal } from './components/DeleteInstanceModal';
import { useLimaInstances } from './hooks/useLimaInstances';

export const App: React.FC = () => {
  const { startInstance, stopInstance, deleteInstance } = useLimaInstance();
  const { instances } = useLimaInstances();
  const { isLoading, setSelectedName, selectedInstance } = useSelectedInstance();

  // Modal States
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showConfirmStartModal, setShowConfirmStartModal] = useState(false);
  const [showStartLogsModal, setShowStartLogsModal] = useState(false);
  const [showStopLogsModal, setShowStopLogsModal] = useState(false);
  const [showDeleteLogsModal, setShowDeleteLogsModal] = useState(false);
  const [createdInstanceName, setCreatedInstanceName] = useState<string | null>(null);
  const [startingInstanceName, setStartingInstanceName] = useState<string | null>(null);
  const [stoppingInstanceName, setStoppingInstanceName] = useState<string | null>(null);
  const [deletingInstanceName, setDeletingInstanceName] = useState<string | null>(null);

  // Listen for create events and logs
  const handleCreateSuccess = useCallback((instanceName: string) => {
    console.debug(`Instance ${instanceName} created successfully.`);
    setCreatedInstanceName(instanceName);
    setSelectedName(instanceName);
    setShowCreateModal(false);
    setShowConfirmStartModal(true);
  }, [setSelectedName]);

  const handleCreateError = useCallback((error: string) => {
    console.error('Instance creation failed:', error);
    // Keep modal open to show error logs
  }, []);

  // Listen for instance start success to clean up state
  const handleStartSuccess = useCallback((instanceName: string) => {
    console.debug(`Instance ${instanceName} started successfully.`);
    setShowStartLogsModal(false);

    // Clear created instance name if it matches
    setCreatedInstanceName((current) => {
      if (instanceName === current) {
        return null;
      }
      return current;
    });

    // Clear starting instance name if it matches
    setStartingInstanceName((current) => {
      if (instanceName === current) {
        return null;
      }
      return current;
    });
  }, []);

  const handleStartError = useCallback((error: string) => {
    console.error('Instance start failed:', error);
    // Keep modal open to show error logs
  }, []);

  const handleStopSuccess = useCallback((instanceName: string) => {
    console.debug(`Instance ${instanceName} stopped successfully.`);
    setShowStopLogsModal(false);
    setStoppingInstanceName(null);
  }, []);

  const handleStopError = useCallback((error: string) => {
    console.error('Instance stop failed:', error);
    // Keep modal open to show error logs
  }, []);

  const handleDeleteSuccess = useCallback((instanceName: string) => {
    console.debug(`Instance ${instanceName} deleted successfully.`);
    setShowDeleteLogsModal(false);
    setDeletingInstanceName(null);

    // Switch to another instance after successful deletion
    const remainingInstances = instances.filter((i: LimaInstance) => i.name !== instanceName);
    if (remainingInstances.length > 0) {
      // Priority 1: Switch to a Running instance
      const runningInstance = remainingInstances.find((i: LimaInstance) => i.status === InstanceStatus.Running);
      const nextName = runningInstance ? runningInstance.name : remainingInstances[0].name;
      setSelectedName(nextName);
    } else {
      // No instances left: clear selection to show the empty state
      setSelectedName(null);
    }
  }, [instances, setSelectedName]);

  const handleDeleteError = useCallback((error: string) => {
    console.error('Instance delete failed:', error);
    // Keep modal open to show error logs
  }, []);

  const handleOpenCreateModal = () => {
    setShowCreateModal(true);
  };

  const handleConfirmStartInstance = () => {
    if (!createdInstanceName) {
      console.error('No created instance to start. Somthing went wrong.');
      return;
    };

    // Close confirmation modal and open logs modal
    setShowConfirmStartModal(false);
    setShowStartLogsModal(true);

    // Start the instance - logs modal will close on success
    startInstance(createdInstanceName);
  };

  const handleStartInstance = (instanceName: string) => {
    setStartingInstanceName(instanceName);
    setShowStartLogsModal(true);
    startInstance(instanceName);
  };

  const handleStopInstance = (instanceName: string) => {
    setStoppingInstanceName(instanceName);
    setShowStopLogsModal(true);
    stopInstance(instanceName);
  };

  const handleDeleteInstance = (instanceName: string) => {
    setDeletingInstanceName(instanceName);
    setShowDeleteLogsModal(true);
    deleteInstance(instanceName);
  };

  const handleDelete = (instanceName: string) => {
    // Trigger deletion with modal - will switch to another instance on success
    handleDeleteInstance(instanceName);
  };

  return (
    <div className="h-screen bg-black text-zinc-300 font-mono overflow-hidden flex flex-col selection:bg-zinc-700 selection:text-white">
      {/* MODALS */}
      <CreateInstanceModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSuccess={handleCreateSuccess}
        onError={handleCreateError}
      />

      <ConfirmationModal
        isOpen={showConfirmStartModal}
        title="INSTANCE CREATED"
        message="The virtual machine has been successfully provisioned. Do you want to initialize the boot sequence now?"
        confirmLabel="START INSTANCE"
        cancelLabel="LATER"
        variant="success"
        onConfirm={handleConfirmStartInstance}
        onCancel={() => setShowConfirmStartModal(false)}
        // immediate not in loading state since we already created the instance
        isProcessing={false}
      />

      <StartLogsModal
        isOpen={showStartLogsModal}
        onClose={() => setShowStartLogsModal(false)}
        instanceName={startingInstanceName || createdInstanceName || ''}
        onSuccess={handleStartSuccess}
        onError={handleStartError}
      />

      <StopInstanceModal
        isOpen={showStopLogsModal}
        onClose={() => setShowStopLogsModal(false)}
        instanceName={stoppingInstanceName || ''}
        onSuccess={handleStopSuccess}
        onError={handleStopError}
      />

      <DeleteInstanceModal
        isOpen={showDeleteLogsModal}
        onClose={() => setShowDeleteLogsModal(false)}
        instanceName={deletingInstanceName || ''}
        onSuccess={handleDeleteSuccess}
        onError={handleDeleteError}
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
          selectedName={selectedInstance.name}
          onSelect={setSelectedName}
          onCreate={handleOpenCreateModal}
          instance={selectedInstance}
          onDelete={handleDelete}
          onStart={handleStartInstance}
          onStop={handleStopInstance}
          isCreating={false}
        />
      ) : (
        <div className="flex-1 flex items-center justify-center">
          <div className="animate-pulse text-zinc-600 font-mono text-xs">LOADING DATA STREAM...</div>
        </div>
      )}
    </div>
  );
};