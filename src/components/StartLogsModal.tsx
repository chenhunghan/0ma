import React, { useEffect } from 'react';
import { Loader2, Play, CheckCircle2, XCircle } from 'lucide-react';
import { InstanceModalLogViewer } from './InstanceModalLogViewer';
import { useLimaStartLogs } from '../hooks/useLimaStartLogs';
import { Modal } from './Modal';

interface StartLogsModalProps {
  isOpen: boolean;
  onClose: () => void;
  instanceName: string;
  onSuccess?: (instanceName: string) => void;
  onError?: (error: string) => void;
}

export const StartLogsModal: React.FC<StartLogsModalProps> = ({
  isOpen,
  onClose,
  instanceName,
  onSuccess,
  onError,
}) => {
  const { logs, isStarting, isEssentiallyReady, error, reset } = useLimaStartLogs(onSuccess, onError, isOpen);

  // Store reset in ref to avoid triggering useEffect re-runs
  const resetRef = React.useRef(reset);
  resetRef.current = reset;

  // Reset logs when modal closes
  useEffect(() => {
    if (!isOpen) {
      resetRef.current();
    }
  }, [isOpen]);

  const startSuccess = !isStarting && !error && logs.length > 0;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Starting Instance"
      subTitle="INITIALIZING BOOT SEQUENCE"
      icon={<Play className="w-4 h-4 text-emerald-500" />}
      maxWidth="max-w-3xl"
      height="h-[70vh]"
      isProcessing={isStarting && !isEssentiallyReady}
      footer={
        <>
          {isEssentiallyReady && isStarting && (
            <div className="flex-1 text-xs text-emerald-400 font-mono">
              ✓ Instance is ready. You can close this window.
            </div>
          )}
          <button
            onClick={onClose}
            disabled={isStarting && !isEssentiallyReady}
            className="px-8 py-2.5 bg-zinc-700 hover:bg-zinc-600 text-white font-bold uppercase tracking-wider text-xs shadow-lg transition-all hover:scale-105 disabled:opacity-50 disabled:scale-100 disabled:cursor-not-allowed"
          >
            {isStarting && !isEssentiallyReady ? 'Starting...' : 'Close'}
          </button>
        </>
      }
    >
      <div className="flex-1 overflow-hidden flex flex-col gap-6">
        {/* Instance Info */}
        <div className="flex items-center gap-3 px-4 py-2 bg-zinc-900 border border-zinc-800 rounded shrink-0">
          <Play className="w-4 h-4 text-emerald-500" />
          <div className="flex-1">
            <div className="text-sm font-bold text-white">{instanceName}</div>
            <div className="text-[10px] text-zinc-500 uppercase tracking-wider">
              {isStarting && !isEssentiallyReady && 'Starting Instance...'}
              {isEssentiallyReady && isStarting && '✓ Ready - Initializing Optional Components...'}
              {startSuccess && 'Instance Started Successfully'}
              {error && 'Start Failed'}
            </div>
          </div>
          {isStarting && !isEssentiallyReady && <Loader2 className="w-4 h-4 animate-spin text-emerald-500" />}
          {isEssentiallyReady && isStarting && <CheckCircle2 className="w-4 h-4 text-emerald-500" />}
          {startSuccess && <CheckCircle2 className="w-4 h-4 text-emerald-500" />}
          {error && <XCircle className="w-4 h-4 text-red-500" />}
        </div>

        {/* Log Viewer */}
        <div className="flex-1 min-h-0 flex flex-col border border-zinc-800 rounded overflow-hidden">
          <div className="px-4 py-2 bg-zinc-900 border-b border-zinc-800">
            <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">Start Logs</span>
          </div>
          <div className="flex-1 overflow-hidden">
            <InstanceModalLogViewer logs={logs} />
          </div>
        </div>
      </div>
    </Modal>
  );
};
