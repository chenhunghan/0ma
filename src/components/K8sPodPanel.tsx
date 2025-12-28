import React from 'react';
import {
  ChevronUp,
  Layers,
  FileText,
  SquareTerminal,
  Info,
  Server,
  Globe,
  Clock,
  Tag,
  Box,
  Lock,
  FileJson,
  Hash,
  GripHorizontal,
} from 'lucide-react';
import { MockPod } from '../services/mockK8sData';

interface K8sPodPanelProps {
  mockPods: MockPod[];
  selectedPodId: string;
  setSelectedPodId: (id: string) => void;
  panelHeight: number | 'auto';
  handlePanelResizeStart: (e: React.MouseEvent<HTMLDivElement>) => void;
  onClose: () => void;
  handleOpenPodLogs: (name: string) => void;
  handleOpenPodShell: (name: string) => void;
}

export const K8sPodPanel: React.FC<K8sPodPanelProps> = ({
  mockPods,
  selectedPodId,
  setSelectedPodId,
  panelHeight,
  handlePanelResizeStart,
  onClose,
  handleOpenPodLogs,
  handleOpenPodShell,
}) => {
  const selectedPod = mockPods.find((p) => p.id === selectedPodId) || mockPods[0];

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
        {/* Column 1: Pod List */}
        <div className="flex flex-col h-full overflow-hidden">
          <div className="h-10 flex items-center gap-2 px-4 border-b border-zinc-800/50 shrink-0 bg-zinc-900/50">
            <Layers className="w-3.5 h-3.5 text-zinc-500" />
            <span className="text-[11px] font-bold uppercase tracking-widest text-zinc-500">Pods</span>
          </div>
          <div className="flex-1 overflow-y-auto p-2 space-y-1 min-h-0 [scrollbar-gutter:stable]">
            {mockPods.map((pod) => (
              <div
                key={pod.id}
                onClick={() => setSelectedPodId(pod.id)}
                className={`group relative w-full text-left p-2 rounded flex flex-col gap-0.5 border transition-all cursor-pointer ${selectedPodId === pod.id
                    ? 'bg-zinc-800 border-zinc-700 text-white'
                    : 'border-transparent text-zinc-400 hover:bg-zinc-800/50 hover:text-zinc-200'
                  }`}
              >
                <div className="text-xs truncate w-full pr-12 font-bold">{pod.name}</div>
                <div className="flex items-center gap-2">
                  <span
                    className={`w-1.5 h-1.5 rounded-full ${pod.status === 'Running' ? 'bg-emerald-500' : 'bg-amber-500'
                      }`}
                  ></span>
                  <span className="text-[10px] uppercase text-zinc-500 tracking-wider">
                    {pod.namespace}
                  </span>
                </div>

                {/* Hover Actions */}
                <div className="absolute right-2 top-1/2 -translate-y-1/2 hidden group-hover:flex items-center gap-1 z-10">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleOpenPodLogs(pod.name);
                    }}
                    className="p-1 rounded bg-zinc-950 hover:bg-zinc-700 text-zinc-500 hover:text-white border border-zinc-800 transition-colors"
                    title="Logs"
                  >
                    <FileText className="w-3 h-3" />
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleOpenPodShell(pod.name);
                    }}
                    className="p-1 rounded bg-zinc-950 hover:bg-zinc-700 text-zinc-500 hover:text-white border border-zinc-800 transition-colors"
                    title="Shell"
                  >
                    <SquareTerminal className="w-3 h-3" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Column 2: Pod Metadata */}
        <div className="flex flex-col h-full overflow-hidden">
          <div className="h-10 flex items-center gap-2 px-4 border-b border-zinc-800/50 shrink-0 bg-zinc-900/50">
            <Info className="w-3.5 h-3.5 text-zinc-500" />
            <span className="text-[11px] font-bold uppercase tracking-widest text-zinc-500">Metadata</span>
          </div>
          <div className="p-4 space-y-2 overflow-y-auto flex-1 min-h-0 [scrollbar-gutter:stable]">
            <div className="flex items-center justify-between text-xs">
              <span className="text-[10px] text-zinc-600 font-bold uppercase">Status</span>
              <span
                className={`px-1.5 py-0.5 rounded font-bold uppercase text-[9px] border ${selectedPod.status === 'Running'
                    ? 'bg-emerald-950 text-emerald-400 border-emerald-900'
                    : 'bg-amber-950 text-amber-400 border-amber-900'
                  }`}
              >
                {selectedPod.status}
              </span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-[10px] text-zinc-600 font-bold uppercase flex items-center gap-1.5">
                <Server className="w-3 h-3 text-zinc-700" /> Node
              </span>
              <span className="text-zinc-300">{selectedPod.node}</span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-[10px] text-zinc-600 font-bold uppercase flex items-center gap-1.5">
                <Globe className="w-3 h-3 text-zinc-700" /> IP
              </span>
              <span className="text-zinc-300">{selectedPod.ip}</span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-[10px] text-zinc-600 font-bold uppercase flex items-center gap-1.5">
                <Clock className="w-3 h-3 text-zinc-700" /> Age
              </span>
              <span className="text-zinc-300">{selectedPod.age}</span>
            </div>

            <div className="pt-3 mt-2 border-t border-zinc-800/50">
              <span className="text-[10px] text-zinc-600 font-bold uppercase block mb-2">Labels</span>
              <div className="flex flex-wrap gap-1.5">
                {Object.entries(selectedPod.labels).map(([k, v]) => (
                  <span
                    key={k}
                    className="inline-flex items-center gap-1 bg-zinc-950 border border-zinc-800 px-1.5 py-0.5 rounded text-[10px] text-zinc-400"
                  >
                    <Tag className="w-2.5 h-2.5 opacity-40" />
                    <span className="font-semibold text-zinc-300">{k}</span>
                    <span className="text-zinc-600">=</span>
                    <span>{v}</span>
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Column 3: Environment Variables */}
        <div className="flex flex-col h-full overflow-hidden">
          <div className="h-10 flex items-center gap-2 px-4 border-b border-zinc-800/50 shrink-0 bg-zinc-900/50">
            <Box className="w-3.5 h-3.5 text-zinc-500" />
            <span className="text-[11px] font-bold uppercase tracking-widest text-zinc-500">Environment</span>
          </div>
          <div className="flex-1 overflow-y-auto p-4 space-y-2 min-h-0 [scrollbar-gutter:stable]">
            {selectedPod.env.map((env, i) => (
              <div
                key={i}
                className="group flex items-start gap-2 p-2 rounded hover:bg-zinc-800/30 border border-transparent hover:border-zinc-800 transition-colors"
              >
                <div className="mt-0.5 shrink-0">
                  {env.source === 'secret' && <Lock className="w-3 h-3 text-amber-500" />}
                  {env.source === 'configmap' && (
                    <FileJson className="w-3 h-3 text-blue-500" />
                  )}
                  {env.source === 'literal' && <Hash className="w-3 h-3 text-zinc-500" />}
                </div>
                <div className="flex flex-col min-w-0">
                  <span
                    className="text-[10px] font-bold text-zinc-300 truncate"
                    title={env.name}
                  >
                    {env.name}
                  </span>
                  <span
                    className="text-[10px] text-zinc-500 truncate"
                    title={env.value}
                  >
                    {env.value}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* RESIZER HANDLE */}
      <div
        className="h-1 bg-zinc-800 hover:bg-blue-600 cursor-row-resize w-full absolute bottom-0 z-50 flex items-center justify-center transition-colors"
        onMouseDown={handlePanelResizeStart}
      >
        <GripHorizontal className="w-6 h-3 text-zinc-600 opacity-50" />
      </div>
    </div>
  );
};