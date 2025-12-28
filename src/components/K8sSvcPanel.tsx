import React from 'react';
import {
  ChevronUp,
  Network,
  Info,
  Globe,
  Clock,
  Tag,
  Target,
  ArrowRight,
  GripHorizontal,
} from 'lucide-react';
import { MockService } from '../services/mockK8sData';

interface K8sSvcPanelProps {
  mockServices: MockService[];
  selectedServiceId: string;
  setSelectedServiceId: (id: string) => void;
  panelHeight: number | 'auto';
  handlePanelResizeStart: (e: React.MouseEvent<HTMLDivElement>) => void;
  onClose: () => void;
}

export const K8sSvcPanel: React.FC<K8sSvcPanelProps> = ({
  mockServices,
  selectedServiceId,
  setSelectedServiceId,
  panelHeight,
  handlePanelResizeStart,
  onClose,
}) => {
  const selectedService =
    mockServices.find((s) => s.id === selectedServiceId) || mockServices[0];

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
        {/* Column 1: Service List */}
        <div className="flex flex-col h-full overflow-hidden">
          <div className="h-10 flex items-center gap-2 px-4 border-b border-zinc-800/50 shrink-0 bg-zinc-900/50">
            <Network className="w-3.5 h-3.5 text-zinc-500" />
            <span className="text-[11px] font-bold uppercase tracking-widest text-zinc-500">Services</span>
          </div>
          <div className="flex-1 overflow-y-auto p-2 space-y-1 min-h-0 [scrollbar-gutter:stable]">
            {mockServices.map((svc) => (
              <div
                key={svc.id}
                onClick={() => setSelectedServiceId(svc.id)}
                className={`group relative w-full text-left p-2 rounded flex flex-col gap-0.5 border transition-all cursor-pointer ${selectedServiceId === svc.id
                    ? 'bg-zinc-800 border-zinc-700 text-white'
                    : 'border-transparent text-zinc-400 hover:bg-zinc-800/50 hover:text-zinc-200'
                  }`}
              >
                <div className="text-xs font-bold truncate w-full">{svc.name}</div>
                <div className="flex items-center gap-2">
                  <span
                    className={`w-1.5 h-1.5 rounded-full ${svc.status === 'Active' ? 'bg-emerald-500' : 'bg-amber-500'
                      }`}
                  ></span>
                  <span className="text-[10px] uppercase text-zinc-500 tracking-wider">{svc.namespace}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Column 2: Service Metadata */}
        <div className="flex flex-col h-full overflow-hidden">
          <div className="h-10 flex items-center gap-2 px-4 border-b border-zinc-800/50 shrink-0 bg-zinc-900/50">
            <Info className="w-3.5 h-3.5 text-zinc-500" />
            <span className="text-[11px] font-bold uppercase tracking-widest text-zinc-500">Metadata</span>
          </div>
          <div className="p-4 space-y-2 overflow-y-auto flex-1 min-h-0 [scrollbar-gutter:stable]">
            <div className="flex items-center justify-between text-xs">
              <span className="text-[10px] text-zinc-600 font-bold uppercase">Name</span>
              <span
                className="text-zinc-300 truncate max-w-[120px]"
                title={selectedService.name}
              >
                {selectedService.name}
              </span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-[10px] text-zinc-600 font-bold uppercase flex items-center gap-1.5">
                <Globe className="w-3 h-3 text-zinc-700" /> Cluster IP
              </span>
              <span className="text-zinc-300">{selectedService.clusterIP}</span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-[10px] text-zinc-600 font-bold uppercase flex items-center gap-1.5">
                <Globe className="w-3 h-3 text-zinc-700" /> Ext IP
              </span>
              <span className="text-zinc-300">{selectedService.externalIP}</span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-[10px] text-zinc-600 font-bold uppercase flex items-center gap-1.5">
                <Clock className="w-3 h-3 text-zinc-700" /> Age
              </span>
              <span className="text-zinc-300">{selectedService.age}</span>
            </div>

            <div className="pt-3 mt-2 border-t border-zinc-800/50">
              <span className="text-[10px] text-zinc-600 font-bold uppercase block mb-2">Selectors</span>
              <div className="flex flex-wrap gap-1.5">
                {Object.keys(selectedService.selector).length > 0 ? (
                  Object.entries(selectedService.selector).map(([k, v]) => (
                    <span
                      key={k}
                      className="inline-flex items-center gap-1 bg-zinc-950 border border-zinc-800 px-1.5 py-0.5 rounded text-[10px] text-zinc-400"
                    >
                      <Tag className="w-2.5 h-2.5 opacity-40" />
                      <span className="font-semibold text-zinc-300">{k}</span>
                      <span className="text-zinc-600">=</span>
                      <span>{v}</span>
                    </span>
                  ))
                ) : (
                  <span className="text-[10px] text-zinc-600 italic">No selectors</span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Column 3: Ports & Type */}
        <div className="flex flex-col h-full overflow-hidden">
          <div className="h-10 flex items-center gap-2 px-4 border-b border-zinc-800/50 shrink-0 bg-zinc-900/50">
            <Target className="w-3.5 h-3.5 text-zinc-500" />
            <span className="text-[11px] font-bold uppercase tracking-widest text-zinc-500">
              Network
            </span>
          </div>
          <div className="p-4 space-y-4 overflow-y-auto flex-1 min-h-0 [scrollbar-gutter:stable]">
            {/* Service Type Badge */}
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-zinc-600 font-bold uppercase">Service Type</span>
              <span
                className={`px-2 py-1 rounded text-[10px] font-bold uppercase border ${selectedService.type === 'LoadBalancer'
                    ? 'bg-indigo-950 text-indigo-400 border-indigo-900'
                    : selectedService.type === 'NodePort'
                      ? 'bg-amber-950 text-amber-400 border-amber-900'
                      : 'bg-zinc-950 text-zinc-400 border-zinc-800'
                  }`}
              >
                {selectedService.type}
              </span>
            </div>

            <div className="border-t border-zinc-800/50 pt-3">
              <span className="text-[10px] text-zinc-600 font-bold uppercase block mb-2">Port Mappings</span>
              <div className="space-y-2">
                {selectedService.ports.map((port, i) => (
                  <div
                    key={i}
                    className="bg-zinc-950/50 border border-zinc-800 rounded p-2"
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-bold text-zinc-300">
                        {port.name || 'default'}
                      </span>
                      <span className="text-[10px] text-zinc-500">
                        {port.protocol}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-xs">
                      <span className="text-emerald-500" title="Service Port">
                        {port.port}
                      </span>
                      <ArrowRight className="w-3 h-3 text-zinc-600" />
                      <span className="text-blue-400" title="Target Pod Port">
                        {port.targetPort}
                      </span>
                      {port.nodePort && (
                        <>
                          <span className="text-zinc-600">|</span>
                          <span className="text-amber-500" title="NodePort">
                            {port.nodePort}
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                ))}
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