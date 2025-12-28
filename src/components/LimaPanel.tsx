import React from 'react';
import {
  ChevronUp,
  Activity,
  Network,
  Wifi,
  ArrowRight,
  HardDrive,
  Radio,
  GripHorizontal,
} from 'lucide-react';
import { LimaInstance } from '../types/LimaInstance';
import { LimaConfig } from '../types/LimaConfig';

import { useInstanceDiskUsage } from '../hooks/useInstanceDiskUsage';

import { useInstanceIp } from '../hooks/useInstanceIp';

interface LimaPanelProps {
  instance: LimaInstance;
  parsedConfig?: LimaConfig;
  panelHeight: number | 'auto';
  handlePanelResizeStart: (e: React.MouseEvent<HTMLDivElement>) => void;
  onClose: () => void;
}

export const LimaPanel: React.FC<LimaPanelProps> = ({
  instance,
  parsedConfig,
  panelHeight,
  handlePanelResizeStart,
  onClose,
}) => {
  const isRunning = instance.status === 'Running';
  const { data: diskUsage } = useInstanceDiskUsage(instance.name, isRunning);
  const { data: hostIp } = useInstanceIp(instance.name, isRunning);

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
        {/* Column 1: Status & Identity */}
        <div className="flex flex-col h-full overflow-hidden">
          <div className="h-10 flex items-center gap-2 px-4 border-b border-zinc-800/50 shrink-0 bg-zinc-900/50">
            <Activity className="w-3.5 h-3.5 text-zinc-500" />
            <span className="text-[11px] font-bold uppercase tracking-widest text-zinc-500">
              Status & Identity
            </span>
          </div>
          <div className="p-4 overflow-y-auto space-y-4 flex-1 min-h-0 [scrollbar-gutter:stable]">
            <div className="bg-zinc-950/50 border border-zinc-800 rounded p-3">
              <span className="text-[10px] text-zinc-600 font-bold uppercase block mb-1">Instance Status</span>
              <div className="flex items-center gap-2">
                <div
                  className={`w-2 h-2 rounded-full ${isRunning ? 'bg-emerald-500 animate-pulse' : 'bg-zinc-600'
                    }`}
                ></div>
                <span className="text-sm font-bold text-zinc-200 uppercase tracking-wide">
                  {instance.status}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-y-3 gap-x-2">
              <div>
                <span className="text-[10px] text-zinc-600 font-bold uppercase block mb-0.5">Uptime</span>
                <span className="text-zinc-300 text-xs">2d 15h 22m</span>
              </div>
              <div>
                <span className="text-[10px] text-zinc-600 font-bold uppercase block mb-0.5">Version</span>
                <span className="text-zinc-300 text-xs text-zinc-500">?</span>
              </div>
              <div>
                <span className="text-[10px] text-zinc-600 font-bold uppercase block mb-0.5">VM Type</span>
                <span className="text-zinc-300 text-xs">
                  {parsedConfig?.vmType || 'vz'}
                </span>
              </div>
              <div>
                <span className="text-[10px] text-zinc-600 font-bold uppercase block mb-0.5">Arch</span>
                <span className="text-zinc-300 text-xs">{instance.arch}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Column 2: Network & Connectivity */}
        <div className="flex flex-col h-full overflow-hidden">
          <div className="h-10 flex items-center gap-2 px-4 border-b border-zinc-800/50 shrink-0 bg-zinc-900/50">
            <Network className="w-3.5 h-3.5 text-zinc-500" />
            <span className="text-[11px] font-bold uppercase tracking-widest text-zinc-500">
              Network
            </span>
          </div>
          <div className="p-4 overflow-y-auto space-y-4 flex-1 min-h-0 [scrollbar-gutter:stable]">
            <div className="space-y-2">
              {hostIp?.split(/\s+/).map((ip, idx) => {
                const isInternal = ip.startsWith('10.') || ip.startsWith('172.');
                const label = isInternal ? 'Internal Bridge' : ip.startsWith('192.168.5.') ? 'Host IP' : 'Other IP';

                return (
                  <div key={idx} className="flex items-center gap-4 p-2 rounded bg-zinc-950/50 border border-zinc-800">
                    <div className="flex items-center gap-2 shrink-0">
                      <Wifi className={`w-3.5 h-3.5 ${isInternal ? 'text-indigo-600' : 'text-emerald-600'}`} />
                      <span className="text-[10px] font-bold uppercase text-zinc-500 min-w-16">{label}</span>
                    </div>
                    <span className="text-zinc-300 text-xs font-mono truncate" title={ip}>{ip}</span>
                  </div>
                );
              }) || (
                  <div className="flex items-center gap-4 p-2 rounded bg-zinc-950/50 border border-zinc-800">
                    <div className="flex items-center gap-2 shrink-0">
                      <Wifi className="w-3.5 h-3.5 text-zinc-600" />
                      <span className="text-[10px] font-bold uppercase text-zinc-500">Host IP</span>
                    </div>
                    <span className="text-zinc-300 text-xs font-mono">Searching...</span>
                  </div>
                )}
            </div>

            <div className="pt-3 border-t border-zinc-800/50">
              <span className="text-[10px] text-zinc-600 font-bold uppercase block mb-2">
                Port Forwarding
              </span>
              <div className="space-y-1.5">
                {parsedConfig?.portForwards && parsedConfig.portForwards.length > 0 ? (
                  parsedConfig.portForwards
                    .filter(pf => !pf.ignore)
                    .slice(0, 5)
                    .map((pf, idx) => {
                      // Format host part
                      const hostPart = pf.hostSocket
                        ? pf.hostSocket.split('/').pop() || pf.hostSocket
                        : pf.hostPortRange && pf.hostPortRange[0] !== pf.hostPortRange[1]
                          ? `${pf.hostIP || '127.0.0.1'}:${pf.hostPortRange[0]}-${pf.hostPortRange[1]}`
                          : `${pf.hostIP || '127.0.0.1'}:${pf.hostPort || pf.hostPortRange?.[0] || '?'}`;

                      // Format guest part
                      const guestPart = pf.guestSocket
                        ? pf.guestSocket.split('/').pop() || pf.guestSocket
                        : pf.guestPortRange && pf.guestPortRange[0] !== pf.guestPortRange[1]
                          ? `${pf.guestPortRange[0]}-${pf.guestPortRange[1]}`
                          : String(pf.guestPort || pf.guestPortRange?.[0] || '?');

                      return (
                        <div key={idx} className="flex items-center gap-2 text-xs text-zinc-400">
                          <ArrowRight className="w-3 h-3 text-zinc-600" />
                          <span className="truncate max-w-30" title={hostPart}>{hostPart}</span>
                          <span className="text-zinc-600 px-1">→</span>
                          <span className="truncate max-w-30" title={guestPart}>
                            {guestPart}
                            {pf.proto && pf.proto !== 'any' ? ` (${pf.proto})` : ''}
                          </span>
                        </div>
                      );
                    })
                ) : (
                  <div className="text-xs text-zinc-500 italic">
                    No port forwards configured
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Column 3: Storage & Configuration */}
        <div className="flex flex-col h-full overflow-hidden">
          <div className="h-10 flex items-center gap-2 px-4 border-b border-zinc-800/50 shrink-0 bg-zinc-900/50">
            <HardDrive className="w-3.5 h-3.5 text-zinc-500" />
            <span className="text-[11px] font-bold uppercase tracking-widest text-zinc-500">
              Storage
            </span>
          </div>
          <div className="p-4 overflow-y-auto space-y-4 flex-1 min-h-0 [scrollbar-gutter:stable]">
            <div className="flex items-center gap-4">
              <div className="flex-1">
                <span className="text-[10px] text-zinc-600 font-bold uppercase block mb-1.5">
                  Disk Allocation
                </span>
                <div className="h-1.5 w-full bg-zinc-800 rounded-sm overflow-hidden">
                  <div
                    className="h-full bg-indigo-500 transition-all duration-500"
                    style={{ width: diskUsage ? diskUsage.use_percent : '0%' }}
                  ></div>
                </div>
                <div className="flex justify-between mt-1.5">
                  <span className="text-[10px] text-zinc-400">
                    {diskUsage ? `${diskUsage.used} Used` : 'Calculating...'}
                  </span>
                  <span className="text-[10px] text-zinc-500">
                    {diskUsage ? `${diskUsage.total} Total` : `${instance.disk} Total`}
                  </span>
                </div>
              </div>
            </div>

            <div className="pt-3 border-t border-zinc-800/50">
              <div className="flex items-center gap-2 text-xs">
                <Radio className="w-3.5 h-3.5 text-zinc-600" />
                <span className="text-zinc-500">Engine: </span>
                <span className="text-zinc-300 font-bold">containerd</span>
              </div>
            </div>
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