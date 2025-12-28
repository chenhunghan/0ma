import React, { useEffect } from "react";
import { Loader2, Square, CheckCircle2, XCircle } from "lucide-react";
import { InstanceModalLogViewer } from "./InstanceModalLogViewer";
import { useLimaStopLogs } from "../hooks/useLimaStopLogs";
import { Modal } from "./Modal";

interface StopInstanceModalProps {
  isOpen: boolean;
  onClose: () => void;
  instanceName: string;
  onSuccess?: (instanceName: string) => void;
  onError?: (error: string) => void;
}

export const StopInstanceModal: React.FC<StopInstanceModalProps> = ({
  isOpen,
  onClose,
  instanceName,
  onSuccess,
  onError,
}) => {
  const { logs, isStopping, error: stopError, reset } = useLimaStopLogs(onSuccess, onError, isOpen);

  // Store reset in ref to avoid triggering useEffect re-runs
  const resetRef = React.useRef(reset);
  resetRef.current = reset;

  // Reset logs when modal closes
  useEffect(() => {
    if (!isOpen) {
      resetRef.current();
    }
  }, [isOpen]);

  // Close modal when stop completes successfully
  useEffect(() => {
    if (!isStopping && logs.length > 0 && !stopError) {
      const hasSuccess = logs.some(log => log.type === 'success');
      if (hasSuccess) {
        // Small delay to show success message
        const timer = setTimeout(() => {
          onClose();
        }, 1000);
        return () => clearTimeout(timer);
      }
    }
  }, [isStopping, logs, stopError, onClose]);

  const stopSuccess = !isStopping && !stopError && logs.length > 0;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Stopping Instance"
      subTitle="INITIATING SHUTDOWN SEQUENCE"
      icon={<Square className="w-4 h-4 text-amber-500" />}
      maxWidth="max-w-3xl"
      height="h-[70vh]"
      isProcessing={isStopping}
      footer={
        <button
          onClick={onClose}
          disabled={isStopping}
          className="px-8 py-2.5 bg-zinc-700 hover:bg-zinc-600 text-white font-bold uppercase tracking-wider text-xs shadow-lg transition-all hover:scale-105 disabled:opacity-50 disabled:scale-100 disabled:cursor-not-allowed"
        >
          {isStopping ? 'Stopping...' : 'Close'}
        </button>
      }
    >
      <div className="flex-1 overflow-hidden flex flex-col gap-6">
        {/* Instance Info */}
        <div className="flex items-center gap-3 px-4 py-2 bg-zinc-900 border border-zinc-800 rounded shrink-0">
          <Square className="w-4 h-4 text-amber-500" />
          <div className="flex-1">
            <div className="text-sm font-bold text-white">{instanceName}</div>
            <div className="text-[10px] text-zinc-500 uppercase tracking-wider">
              {isStopping && 'Stopping Instance...'}
              {stopSuccess && 'Instance Stopped Successfully'}
              {stopError && 'Stop Failed'}
            </div>
          </div>
          {isStopping && <Loader2 className="w-4 h-4 animate-spin text-amber-500" />}
          {stopSuccess && <CheckCircle2 className="w-4 h-4 text-emerald-500" />}
          {stopError && <XCircle className="w-4 h-4 text-red-500" />}
        </div>

        {/* Log Viewer */}
        <div className="flex-1 min-h-0 flex flex-col border border-zinc-800 rounded overflow-hidden">
          <div className="px-4 py-2 bg-zinc-900 border-b border-zinc-800">
            <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">Stop Logs</span>
          </div>
          <div className="flex-1 overflow-hidden">
            <InstanceModalLogViewer logs={logs} />
          </div>
        </div>
      </div>
    </Modal>
  );
};
