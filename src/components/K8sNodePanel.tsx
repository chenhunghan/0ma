import React from 'react';
import {
  ChevronUp,
  Server,
  Box,
  Info,
  SplitSquareHorizontal,
  GripHorizontal
} from 'lucide-react';
import { LimaInstance } from '../types/LimaInstance';

interface K8sNodePanelProps {
  instance: LimaInstance;
  panelHeight: number | 'auto';
  onClose: () => void;
  handleOpenNodeShell: () => void;
  handlePanelResizeStart: (e: React.MouseEvent<HTMLDivElement>) => void;
}

export const K8sNodePanel: React.FC<K8sNodePanelProps> = ({
  instance,
  panelHeight,
  onClose,
  handleOpenNodeShell,
  handlePanelResizeStart,
}) => {
  return (
    <div
      className="bg-zinc-900 border-b border-zinc-800 shadow-xl relative z-10 flex-none animate-in slide-in-from-top-2 fade-in duration-200 group font-mono"
      style={{
        height: panelHeight === 'auto' ? 'auto' : panelHeight,
        maxHeight: panelHeight === 'auto' ? '50%' : 'none',
      }}
    >
      <button
        onClick={onClose}
        className="absolute top-2 right-2 p-1 text-zinc-600 hover:text-white hover:bg-zinc-800 rounded transition-colors z-20"
        title="Collapse Panel"
      >
        <ChevronUp className="w-4 h-4" />
      </button>

      <div className="grid grid-cols-3 divide-x divide-zinc-800 h-full">
        {/* Block 1: Hardware */}
        <div className="flex flex-col h-full overflow-hidden">
          <div className="h-10 flex items-center gap-2 px-4 border-b border-zinc-800/50 shrink-0 bg-zinc-900/50">
            <Server className="w-3.5 h-3.5 text-zinc-500" />
            <span className="text-[11px] font-bold uppercase tracking-widest text-zinc-500">Hardware</span>
          </div>
          <div className="p-4 overflow-y-auto space-y-1.5 flex-1 min-h-0 [scrollbar-gutter:stable]">
            <div className="flex items-center justify-between text-xs">
              <span className="text-[10px] font-bold uppercase text-zinc-600">CPU</span>
              <span className="text-zinc-200 bg-zinc-950 px-1.5 py-0.5 rounded border border-zinc-800 text-[10px]">
                {instance.cpus} vCPU
              </span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-[10px] font-bold uppercase text-zinc-600">Memory</span>
              <span className="text-zinc-200 bg-zinc-950 px-1.5 py-0.5 rounded border border-zinc-800 text-[10px]">
                {instance.memory}
              </span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-[10px] font-bold uppercase text-zinc-600">Storage</span>
              <span className="text-zinc-200 bg-zinc-950 px-1.5 py-0.5 rounded border border-zinc-800 text-[10px]">
                {instance.disk}
              </span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-[10px] font-bold uppercase text-zinc-600">Arch</span>
              <span className="text-zinc-200 bg-zinc-950 px-1.5 py-0.5 rounded border border-zinc-800 text-[10px]">
                {instance.arch}
              </span>
            </div>
          </div>
        </div>

        {/* Block 2: Environment */}
        <div className="flex flex-col h-full overflow-hidden">
          <div className="h-10 flex items-center gap-2 px-4 border-b border-zinc-800/50 shrink-0 bg-zinc-900/50">
            <Box className="w-3.5 h-3.5 text-zinc-500" />
            <span className="text-[11px] font-bold uppercase tracking-widest text-zinc-500">Environment</span>
          </div>
          <div className="p-4 overflow-y-auto space-y-3 flex-1 min-h-0 [scrollbar-gutter:stable]">
            <div>
              <span className="text-[10px] text-zinc-600 font-bold uppercase block mb-0.5">Kubernetes</span>
              <span className="text-blue-400 text-xs">{instance.k8s?.version}</span>
            </div>
            <div>
              <span className="text-[10px] text-zinc-600 font-bold uppercase block mb-0.5">Runtime</span>
              <span className="text-zinc-300 text-xs">containerd 1.7.11</span>
            </div>
            <div>
              <span className="text-[10px] text-zinc-600 font-bold uppercase block mb-0.5">OS / Kernel</span>
              <span className="text-zinc-300 text-xs block">Alpine Linux v3.19</span>
              <span className="text-zinc-500 text-[10px]">6.6.0-23-generic</span>
            </div>
          </div>
        </div>

        {/* Block 3: Actions & Status */}
        <div className="flex flex-col h-full overflow-hidden">
          <div className="h-10 flex items-center gap-2 px-4 border-b border-zinc-800/50 shrink-0 bg-zinc-900/50">
            <Info className="w-3.5 h-3.5 text-zinc-500" />
            <span className="text-[11px] font-bold uppercase tracking-widest text-zinc-500">
              Actions
            </span>
          </div>
          <div className="p-4 flex flex-col justify-between h-full flex-1 min-h-0 [scrollbar-gutter:stable]">
            <div>
              <div className="flex items-center gap-2 mb-3 bg-zinc-950/30 p-2 rounded border border-zinc-800/50">
                <div
                  className={`w-2 h-2 rounded-full ${instance.k8s?.status === 'Ready'
                      ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]'
                      : 'bg-amber-500'
                    }`}
                ></div>
                <span className="text-[10px] text-zinc-300 font-bold uppercase">Node Ready</span>
                <span className="text-[10px] text-zinc-600 ml-auto">Up: 4d 2h</span>
              </div>
            </div>

            <button
              onClick={handleOpenNodeShell}
              className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-blue-900/10 hover:bg-blue-900/30 text-blue-400 hover:text-blue-300 text-[10px] font-bold border border-blue-900/30 hover:border-blue-500/50 transition-colors uppercase tracking-wider"
            >
              <SplitSquareHorizontal className="w-3.5 h-3.5" />
              Launch Node Shell
            </button>
          </div>
        </div>
      </div>

      {/* Real Resizer Handle */}
      <div
        className="h-1 bg-zinc-800 hover:bg-blue-600 cursor-row-resize w-full absolute bottom-0 z-50 flex items-center justify-center transition-colors"
        onMouseDown={handlePanelResizeStart}
      >
        <GripHorizontal className="w-6 h-3 text-zinc-600 opacity-50" />
      </div>
    </div>
  );
};