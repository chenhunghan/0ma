import React from 'react';
import {
  ChevronUp,
  GripHorizontal
} from 'lucide-react';
import { LimaConfigForm } from './LimaConfigForm';
import { LimaConfig } from '../types/LimaConfig';

interface LimaConfigPanelProps {
  parsedConfig?: LimaConfig;
  updateConfigField: (field: string, value: unknown) => void;
  updateProvisionScript: (index: number, key: 'mode' | 'script', value: string) => void;
  addProvisionScript: () => void;
  removeProvisionScript: (index: number) => void;
  updateProbeScript: (
    index: number,
    key: 'description' | 'script' | 'hint' | 'mode',
    value: string
  ) => void;
  addProbeScript: () => void;
  removeProbeScript: (index: number) => void;
  showScripts: boolean;
  setShowScripts: (show: boolean) => void;
  showProbes: boolean;
  setShowProbes: (show: boolean) => void;
  onClose: () => void;
  panelHeight: number;
  handlePanelResizeStart: (e: React.MouseEvent<HTMLDivElement>) => void;
}

export const LimaConfigPanel: React.FC<LimaConfigPanelProps> = ({
  parsedConfig,
  updateConfigField,
  updateProvisionScript,
  addProvisionScript,
  removeProvisionScript,
  updateProbeScript,
  addProbeScript,
  removeProbeScript,
  showScripts,
  setShowScripts,
  showProbes,
  setShowProbes,
  onClose,
  panelHeight,
  handlePanelResizeStart,
}) => {
  return (
    <div
      className="bg-zinc-900 border-b border-zinc-800 shadow-xl relative z-10 flex-none animate-in slide-in-from-top-2 fade-in duration-200 font-mono"
      style={{ height: panelHeight }}
    >
      <button
        onClick={onClose}
        className="absolute top-2 right-2 p-1 text-zinc-600 hover:text-white hover:bg-zinc-800 rounded transition-colors z-20"
        title="Collapse Panel"
      >
        <ChevronUp className="w-4 h-4" />
      </button>

      {/* Reuse the shared form layout */}
      <LimaConfigForm
        parsedConfig={parsedConfig}
        updateConfigField={updateConfigField}
        updateProvisionScript={updateProvisionScript}
        addProvisionScript={addProvisionScript}
        removeProvisionScript={removeProvisionScript}
        updateProbeScript={updateProbeScript}
        addProbeScript={addProbeScript}
        removeProbeScript={removeProbeScript}
        showScripts={showScripts}
        onToggleScripts={setShowScripts}
        showProbes={showProbes}
        onToggleProbes={setShowProbes}
      />

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