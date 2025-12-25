import React, { useState } from 'react';
import { Loader2, Terminal, X } from 'lucide-react';
import { useLimaConfig } from '../hooks/useLimaConfig';
import { DEFAULT_CONFIG } from '../services/limaService';
import { LimaConfigForm } from './LimaConfigForm';
import { LimaConfig } from '../types/LimaConfig';

interface CreateInstanceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreate: (name: string, config: LimaConfig) => Promise<void>;
  isProcessing: boolean;
}

export const CreateInstanceModal: React.FC<CreateInstanceModalProps> = ({
  isOpen,
  onClose,
  onCreate,
  isProcessing
}) => {
  const [name, setName] = useState('');
  const {
    config,
    updateConfigField,
    updateProvisionScript,
    addProvisionScript,
    removeProvisionScript,
    updateProbeScript,
    addProbeScript,
    removeProbeScript
  } = useLimaConfig(DEFAULT_CONFIG);

  if (!isOpen) return null;

  const handleSubmit = async () => {
    if (!name.trim()) return;
    await onCreate(name, config);
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-zinc-950 border border-zinc-800 shadow-2xl w-full max-w-5xl h-[80vh] flex flex-col animate-in zoom-in-95 duration-200">
        
        {/* HEADER */}
        <div className="h-14 border-b border-zinc-800 flex items-center justify-between px-6 bg-zinc-900/50">
           <div className="flex items-center gap-3">
              <div className="p-1.5 bg-zinc-800 rounded border border-zinc-700">
                <Terminal className="w-4 h-4 text-emerald-500" />
              </div>
              <div>
                  <h2 className="text-sm font-bold uppercase tracking-wider text-white">Create New Instance</h2>
                  <div className="text-[10px] text-zinc-500 font-mono">CONFIGURE INITIAL ENVIRONMENT</div>
              </div>
           </div>
           <button onClick={onClose} className="p-1 hover:text-white text-zinc-500 transition-colors">
              <X className="w-5 h-5" />
           </button>
        </div>

        {/* BODY */}
        <div className="flex-1 overflow-hidden flex flex-col p-6 gap-6">
            {/* Instance Name Input */}
            <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold uppercase text-zinc-400">Instance Name</label>
                <input 
                   autoFocus
                   type="text"
                   value={name}
                   onChange={(e) => setName(e.target.value)}
                   placeholder="e.g. k8s-worker-01"
                   className="bg-black border border-zinc-800 px-4 py-2.5 text-sm text-white focus:outline-none focus:border-emerald-500 transition-colors w-full font-mono placeholder:text-zinc-700"
                />
            </div>

            {/* Config Form Wrapper */}
            <div className="flex-1 min-h-0 flex flex-col border border-zinc-800 rounded bg-zinc-900/30 overflow-hidden">
                <div className="px-4 py-2 bg-zinc-900 border-b border-zinc-800">
                    <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">Configuration Profile</span>
                </div>
                <div className="flex-1 overflow-auto">
                    {/* LimaConfigForm fills the container height, so we wrap it to ensure it scrolls properly */}
                    <div className="h-full">
                         <LimaConfigForm 
                            parsedConfig={config}
                            updateConfigField={updateConfigField}
                            updateProvisionScript={updateProvisionScript}
                            addProvisionScript={addProvisionScript}
                            removeProvisionScript={removeProvisionScript}
                            updateProbeScript={updateProbeScript}
                            addProbeScript={addProbeScript}
                            removeProbeScript={removeProbeScript}
                        />
                    </div>
                </div>
            </div>
        </div>

        {/* FOOTER */}
        <div className="h-16 border-t border-zinc-800 flex items-center justify-end px-6 gap-4 bg-zinc-900/50">
            <button 
                onClick={onClose}
                disabled={isProcessing}
                className="px-6 py-2 text-xs font-bold uppercase tracking-wider text-zinc-400 hover:text-white transition-colors"
            >
                Cancel
            </button>
            <button 
                onClick={handleSubmit}
                disabled={!name.trim() || isProcessing}
                className="px-8 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold uppercase tracking-wider text-xs shadow-lg transition-all hover:scale-105 disabled:opacity-50 disabled:scale-100 disabled:cursor-not-allowed flex items-center gap-2"
            >
                {isProcessing && <Loader2 className="w-3 h-3 animate-spin" />}
                {isProcessing ? 'Provisioning...' : 'Create Instance'}
            </button>
        </div>

      </div>
    </div>
  );
};