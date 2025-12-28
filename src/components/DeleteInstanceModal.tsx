import React, { useEffect } from "react";
import { Loader2, Trash2, CheckCircle2, XCircle } from "lucide-react";
import { InstanceModalLogViewer } from "./InstanceModalLogViewer";
import { useLimaDeleteLogs } from "../hooks/useLimaDeleteLogs";
import { Modal } from "./Modal";

interface DeleteInstanceModalProps {
  isOpen: boolean;
  onClose: () => void;
  instanceName: string;
  onSuccess?: (instanceName: string) => void;
  onError?: (error: string) => void;
}

export const DeleteInstanceModal: React.FC<DeleteInstanceModalProps> = ({
  isOpen,
  onClose,
  instanceName,
  onSuccess,
  onError,
}) => {
  const { logs, isDeleting, error: deleteError, reset } = useLimaDeleteLogs(onSuccess, onError, isOpen);

  // Store reset in ref to avoid triggering useEffect re-runs
  const resetRef = React.useRef(reset);
  resetRef.current = reset;

  // Reset logs when modal closes
  useEffect(() => {
    if (!isOpen) {
      resetRef.current();
    }
  }, [isOpen]);

  // Close modal when delete completes successfully
  useEffect(() => {
    if (!isDeleting && logs.length > 0 && !deleteError) {
      const hasSuccess = logs.some(log => log.type === 'success');
      if (hasSuccess) {
        // Small delay to show success message
        const timer = setTimeout(() => {
          onClose();
        }, 1000);
        return () => clearTimeout(timer);
      }
    }
  }, [isDeleting, logs, deleteError, onClose]);

  const deleteSuccess = !isDeleting && !deleteError && logs.length > 0;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Deleting Instance"
      subTitle="PERMANENT REMOVAL IN PROGRESS"
      icon={<Trash2 className="w-4 h-4 text-red-500" />}
      maxWidth="max-w-3xl"
      height="h-[70vh]"
      isProcessing={isDeleting}
      footer={
        <button
          onClick={onClose}
          disabled={isDeleting}
          className="px-8 py-2.5 bg-zinc-700 hover:bg-zinc-600 text-white font-bold uppercase tracking-wider text-xs shadow-lg transition-all hover:scale-105 disabled:opacity-50 disabled:scale-100 disabled:cursor-not-allowed"
        >
          {isDeleting ? 'Deleting...' : 'Close'}
        </button>
      }
    >
      <div className="flex-1 overflow-hidden flex flex-col gap-6">
        {/* Instance Info */}
        <div className="flex items-center gap-3 px-4 py-2 bg-zinc-900 border border-zinc-800 rounded shrink-0">
          <Trash2 className="w-4 h-4 text-red-500" />
          <div className="flex-1">
            <div className="text-sm font-bold text-white">{instanceName}</div>
            <div className="text-[10px] text-zinc-500 uppercase tracking-wider">
              {isDeleting && 'Deleting Instance...'}
              {deleteSuccess && 'Instance Deleted Successfully'}
              {deleteError && 'Delete Failed'}
            </div>
          </div>
          {isDeleting && <Loader2 className="w-4 h-4 animate-spin text-red-500" />}
          {deleteSuccess && <CheckCircle2 className="w-4 h-4 text-emerald-500" />}
          {deleteError && <XCircle className="w-4 h-4 text-red-500" />}
        </div>

        {/* Log Viewer */}
        <div className="flex-1 min-h-0 flex flex-col border border-zinc-800 rounded overflow-hidden">
          <div className="px-4 py-2 bg-zinc-900 border-b border-zinc-800">
            <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">Delete Logs</span>
          </div>
          <div className="flex-1 overflow-hidden">
            <InstanceModalLogViewer logs={logs} />
          </div>
        </div>
      </div>
    </Modal>
  );
};
