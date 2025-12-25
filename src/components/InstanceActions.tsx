import React from 'react';
import { Loader2, Power, Play, Trash2 } from 'lucide-react';
import { InstanceStatus } from '../types/InstanceStatus';

interface InstanceActionsProps {
  status: InstanceStatus;
  isProcessing: boolean;
  onStart: () => void;
  onStop: () => void;
  onDelete: () => void;
}

export const InstanceActions: React.FC<InstanceActionsProps> = ({
  status,
  isProcessing,
  onStart,
  onStop,
  onDelete,
}) => {
  const isRunning = status === InstanceStatus.Running;
  const isBusy = status === InstanceStatus.Starting || status === InstanceStatus.Stopping;
  
  // Instance must be stopped or in error state to be deleted
  const canDelete = status === InstanceStatus.Stopped || status === InstanceStatus.Error;

  return (
    <div className="flex items-center gap-2">
      {isRunning ? (
        <button
          onClick={onStop}
          disabled={isProcessing || isBusy}
          className="flex items-center gap-2 px-3 py-1 bg-black hover:bg-zinc-900 text-amber-500 border border-amber-900 hover:border-amber-500 transition-colors text-xs font-bold uppercase tracking-wider disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {(isProcessing && isRunning) || isBusy ? (
            <Loader2 className="w-3 h-3 animate-spin" />
          ) : (
            <Power className="w-3 h-3" />
          )}
          STOP
        </button>
      ) : (
        <button
          onClick={onStart}
          disabled={isProcessing || isBusy}
          className="flex items-center gap-2 px-3 py-1 bg-black hover:bg-zinc-900 text-emerald-500 border border-emerald-900 hover:border-emerald-500 transition-colors text-xs font-bold uppercase tracking-wider disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {(isProcessing && !isRunning) || isBusy ? (
            <Loader2 className="w-3 h-3 animate-spin" />
          ) : (
            <Play className="w-3 h-3 fill-current" />
          )}
          START
        </button>
      )}

      <div className="relative group">
        <button
            onClick={onDelete}
            disabled={!canDelete || isProcessing || isBusy}
            className={`p-1 border border-transparent transition-colors ${
            canDelete
                ? 'text-zinc-500 hover:text-red-500 hover:border-red-900'
                : 'text-zinc-700 cursor-not-allowed'
            }`}
        >
            <Trash2 className="w-4 h-4" />
        </button>
        
        {/* Tooltip for disabled delete button */}
        {!canDelete && (
            <div className="absolute right-0 top-full mt-2 w-56 p-2 bg-zinc-900 border border-zinc-700 text-[10px] text-zinc-400 z-50 shadow-xl hidden group-hover:block animate-in fade-in duration-150">
               <div className="flex items-center gap-2 mb-1 text-red-500 font-bold border-b border-zinc-800 pb-1">
                 <span className="w-1.5 h-1.5 bg-red-500 rounded-full animate-pulse"></span>
                 ACTION LOCKED
               </div>
               <div className="leading-tight">
                Instance must be fully <span className="text-zinc-200 font-bold">STOPPED</span> before deletion.
               </div>
            </div>
        )}
      </div>
    </div>
  );
};