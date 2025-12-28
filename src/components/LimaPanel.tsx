import React from 'react';
import {
  ChevronUp,
  Activity,
  Network,
  Wifi,
  HardDrive,
  GripHorizontal,
} from 'lucide-react';
import { LimaInstance } from '../types/LimaInstance';
import { LimaConfig } from '../types/LimaConfig';

import { useInstanceDiskUsage } from '../hooks/useInstanceDiskUsage';

import { useInstanceIp } from '../hooks/useInstanceIp';
import { useInstanceUptime } from '../hooks/useInstanceUptime';
import { useInstanceGuestDiagnostics } from '../hooks/useInstanceGuestDiagnostics';
import { Terminal, FolderOpen, ShieldCheck, Info } from 'lucide-react';

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
  const { data: uptime } = useInstanceUptime(instance.name, isRunning);
  const { data: diagnostics } = useInstanceGuestDiagnostics(instance.name, isRunning);

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
        {/* Column 1: Status & Guest Environment */}
        <div className="flex flex-col h-full overflow-hidden">
          <div className="h-10 flex items-center gap-2 px-4 border-b border-zinc-800/50 shrink-0 bg-zinc-900/50">
            <Activity className="w-3.5 h-3.5 text-zinc-500" />
            <span className="text-[11px] font-bold uppercase tracking-widest text-zinc-500">
              Guest Environment
            </span>
          </div>
          <div className="p-4 overflow-y-auto space-y-4 flex-1 min-h-0 [scrollbar-gutter:stable]">
            <div className="bg-zinc-950/50 border border-zinc-800 rounded p-3">
              <span className="text-[10px] text-zinc-600 font-bold uppercase block mb-1">Instance Status</span>
              <div className="flex items-center gap-2 text-zinc-200">
                <div className={`w-2 h-2 rounded-full ${isRunning ? 'bg-emerald-500 animate-pulse' : 'bg-zinc-600'}`}></div>
                <span className="text-sm font-bold uppercase tracking-wide">{instance.status}</span>
                <span className="text-[10px] text-zinc-500 ml-auto">{instance.arch} • {instance.cpus} vCPU • {instance.memory}</span>
              </div>
            </div>

            <div className="space-y-3">
              <div>
                <span className="text-[10px] text-zinc-600 font-bold uppercase block mb-0.5">Operating System</span>
                <span className="text-zinc-300 text-xs block">
                  {diagnostics?.os_pretty_name || (isRunning ? 'Probing...' : '-')}
                </span>
                <span className="text-[10px] text-zinc-500 italic block mt-0.5">
                  Kernel: {diagnostics?.kernel_version || (isRunning ? '...' : 'Unknown')}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <span className="text-[10px] text-zinc-600 font-bold uppercase block mb-0.5">Uptime</span>
                  <span className="text-zinc-300 text-xs">
                    {uptime || (isRunning ? '...' : '-')}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-zinc-600 font-bold uppercase block mb-0.5">Lima Version</span>
                  <span className="text-zinc-400 text-xs italic">
                    {instance.version ? `v${instance.version}` : 'unknown'}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-zinc-600 font-bold uppercase block mb-0.5">VM Type</span>
                  <span className="text-zinc-400 text-xs italic uppercase">
                    {parsedConfig?.vmType || 'vz'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Column 2: Connectivity & SSH */}
        <div className="flex flex-col h-full overflow-hidden">
          <div className="h-10 flex items-center gap-2 px-4 border-b border-zinc-800/50 shrink-0 bg-zinc-900/50">
            <Network className="w-3.5 h-3.5 text-zinc-500" />
            <span className="text-[11px] font-bold uppercase tracking-widest text-zinc-500">
              Connectivity
            </span>
          </div>
          <div className="p-4 overflow-y-auto space-y-4 flex-1 min-h-0 [scrollbar-gutter:stable]">
            <div className="space-y-2">
              <span className="text-[10px] text-zinc-600 font-bold uppercase block">Network Interfaces</span>
              {hostIp?.split(/\s+/).map((ip, idx) => {
                const isInternal = ip.startsWith('10.') || ip.startsWith('172.');
                const label = isInternal ? 'Internal' : ip.startsWith('192.168.5.') ? 'Mac Bridge' : 'IP';

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
                  <div className="flex items-center gap-4 p-2 rounded bg-zinc-950/50 border border-zinc-800 animate-pulse">
                    <div className="flex items-center gap-2 shrink-0">
                      <Wifi className="w-3.5 h-3.5 text-zinc-600" />
                      <span className="text-[10px] font-bold uppercase text-zinc-500">Host IP</span>
                    </div>
                    <span className="text-zinc-500 text-xs">Synchronizing...</span>
                  </div>
                )}
            </div>

            <div className="pt-3 border-t border-zinc-800/50 space-y-3">
              <div>
                <span className="text-[10px] text-zinc-600 font-bold uppercase block mb-1.5">SSH Connectivity</span>
                <div className="bg-zinc-950/50 border border-zinc-800 rounded p-2 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Terminal className="w-3.5 h-3.5 text-indigo-500" />
                    <span className="text-xs text-zinc-300 font-mono">
                      {instance.ssh_address}:{instance.ssh_local_port}
                    </span>
                  </div>
                  <button
                    onClick={() => navigator.clipboard.writeText(`ssh -p ${instance.ssh_local_port} -o NoHostAuthenticationForLocalhost=yes 127.0.0.1`)}
                    className="text-[9px] px-2 py-0.5 bg-zinc-800 text-zinc-400 hover:text-white rounded uppercase font-bold"
                  >
                    Copy CMD
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-2">
                <div className="flex items-start gap-2">
                  <ShieldCheck className="w-3.5 h-3.5 text-zinc-600 mt-0.5" />
                  <div className="overflow-hidden">
                    <span className="text-[10px] text-zinc-600 font-bold uppercase block">Identity File</span>
                    <span className="text-zinc-500 text-[10px] truncate block" title={instance.dir + "/ssh.config"}>
                      {instance.dir ? instance.dir.split('/').pop() + "/ssh.config" : "-"}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Column 3: Storage & Shared Folders */}
        <div className="flex flex-col h-full overflow-hidden">
          <div className="h-10 flex items-center gap-2 px-4 border-b border-zinc-800/50 shrink-0 bg-zinc-900/50">
            <HardDrive className="w-3.5 h-3.5 text-zinc-500" />
            <span className="text-[11px] font-bold uppercase tracking-widest text-zinc-500">
              Storage & Assets
            </span>
          </div>
          <div className="p-4 overflow-y-auto space-y-4 flex-1 min-h-0 [scrollbar-gutter:stable]">
            <div>
              <span className="text-[10px] text-zinc-600 font-bold uppercase block mb-1.5">Disk Resource</span>
              <div className="h-1.5 w-full bg-zinc-800 rounded-sm overflow-hidden">
                <div
                  className="h-full bg-indigo-500 transition-all duration-500"
                  style={{ width: diskUsage ? diskUsage.use_percent : '0%' }}
                ></div>
              </div>
              <div className="flex justify-between mt-1.5">
                <span className="text-[11px] text-zinc-400">
                  {diskUsage ? `${diskUsage.used} / ${diskUsage.total}` : (isRunning ? 'Calculating...' : '-')}
                </span>
                <span className="text-[10px] text-zinc-600 uppercase font-bold">
                  {diskUsage?.use_percent || '0%'} Used
                </span>
              </div>
            </div>

            <div className="pt-3 border-t border-zinc-800/50">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] text-zinc-600 font-bold uppercase">Shared Folders</span>
                <span className="text-[10px] text-zinc-500">{parsedConfig?.mounts?.length || 0} Mounts</span>
              </div>
              <div className="space-y-2">
                {parsedConfig?.mounts && parsedConfig.mounts.length > 0 ? (
                  parsedConfig.mounts.map((mount, idx) => (
                    <div key={idx} className="flex items-start gap-2 text-xs group/mount">
                      <FolderOpen className="w-3.5 h-3.5 text-zinc-600 mt-0.5 group-hover/mount:text-indigo-400 transition-colors" />
                      <div className="overflow-hidden">
                        <span className="text-zinc-300 block truncate" title={mount.location}>
                          {mount.location?.split('/').pop() || mount.location || 'Unknown Mount'}
                        </span>
                        <span className="text-[10px] text-zinc-500 block truncate italic">
                          → {mount.mountPoint || '/mnt/lima/' + (mount.location?.split('/').pop() || 'mount')}
                          {mount.writable ? ' (RW)' : ' (RO)'}
                        </span>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-[11px] text-zinc-600 italic flex items-center gap-2">
                    <Info className="w-3 h-3" />
                    No directory sharing active
                  </div>
                )}
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