import React, { useEffect } from 'react';
import { Loader2, Play, X, CheckCircle2, XCircle } from 'lucide-react';
import { InstanceModalLogViewer } from './InstanceModalLogViewer';
import { useLimaStartLogs } from '../hooks/useLimaStartLogs';

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
  const { logs, isStarting, isEssentiallyReady, error, reset } = useLimaStartLogs(onSuccess, onError);

  // Reset logs when modal closes
  useEffect(() => {
    if (!isOpen) {
      reset();
    }
  }, [isOpen, reset]);

  if (!isOpen) return null;

  const startSuccess = !isStarting && !error && logs.length > 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-zinc-950 border border-zinc-800 shadow-2xl w-full max-w-3xl h-[70vh] flex flex-col animate-in zoom-in-95 duration-200">
        
        {/* HEADER */}
        <div className="h-14 border-b border-zinc-800 flex items-center justify-between px-6 bg-zinc-900/50">
           <div className="flex items-center gap-3">
              <div className="p-1.5 bg-zinc-800 rounded border border-zinc-700">
                <Play className="w-4 h-4 text-emerald-500" />
              </div>
              <div>
                  <h2 className="text-sm font-bold uppercase tracking-wider text-white">Starting Instance</h2>
                  <div className="text-[10px] text-zinc-500 font-mono">INITIALIZING BOOT SEQUENCE</div>
              </div>
           </div>
           <button 
             onClick={onClose} 
             disabled={isStarting && !isEssentiallyReady}
             className="p-1 hover:text-white text-zinc-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
             title={isEssentiallyReady ? "Instance is ready - you can close this and let it finish in background" : ""}
           >
              <X className="w-5 h-5" />
           </button>
        </div>

        {/* BODY */}
        <div className="flex-1 overflow-hidden flex flex-col p-6 gap-6">
            {/* Instance Info */}
            <div className="flex items-center gap-3 px-4 py-2 bg-zinc-900 border border-zinc-800 rounded">
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

        {/* FOOTER */}
        <div className="h-16 border-t border-zinc-800 flex items-center justify-end px-6 gap-4 bg-zinc-900/50">
            {isEssentiallyReady && isStarting && (
              <div className="flex-1 text-xs text-emerald-400">
                ✓ Instance is ready for use. You can close this window.
              </div>
            )}
            <button 
                onClick={onClose}
                disabled={isStarting && !isEssentiallyReady}
                className="px-8 py-2.5 bg-zinc-700 hover:bg-zinc-600 text-white font-bold uppercase tracking-wider text-xs shadow-lg transition-all hover:scale-105 disabled:opacity-50 disabled:scale-100 disabled:cursor-not-allowed"
            >
                {isStarting && !isEssentiallyReady ? 'Starting...' : 'Close'}
            </button>
        </div>

      </div>
    </div>
  );
};
