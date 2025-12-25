import React, { useEffect } from "react";
import { X } from "lucide-react";
import { CreateLogViewer } from "./CreateLogViewer";
import { useLimaStopLogs } from "../hooks/useLimaStopLogs";

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
  const { logs, isStopping, error: stopError } = useLimaStopLogs(onSuccess, onError);

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

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-zinc-900 border-2 border-zinc-700 w-full max-w-3xl flex flex-col max-h-[80vh]">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-zinc-800">
          <div>
            <h2 className="text-lg font-bold text-zinc-100 uppercase tracking-wider">
              STOPPING INSTANCE
            </h2>
            <p className="text-xs text-zinc-500 mt-1 font-mono">
              {instanceName}
            </p>
          </div>
          <button
            onClick={onClose}
            disabled={isStopping}
            className="text-zinc-500 hover:text-zinc-300 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Log Viewer */}
        <div className="flex-1 overflow-hidden">
          <CreateLogViewer logs={logs} />
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-zinc-800 flex justify-between items-center">
          <div className="flex items-center gap-2">
            {isStopping && (
              <div className="flex items-center gap-2 text-amber-500 text-xs font-mono">
                <div className="w-2 h-2 bg-amber-500 rounded-full animate-pulse" />
                STOPPING...
              </div>
            )}
            {stopError && !isStopping && (
              <div className="flex items-center gap-2 text-red-500 text-xs font-mono">
                <div className="w-2 h-2 bg-red-500 rounded-full" />
                STOP FAILED
              </div>
            )}
            {!isStopping && !stopError && logs.length > 0 && (
              <div className="flex items-center gap-2 text-green-500 text-xs font-mono">
                <div className="w-2 h-2 bg-green-500 rounded-full" />
                STOPPED
              </div>
            )}
          </div>
          <button
            onClick={onClose}
            disabled={isStopping}
            className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 border border-zinc-600 text-xs font-bold uppercase tracking-wider transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            CLOSE
          </button>
        </div>
      </div>
    </div>
  );
};
