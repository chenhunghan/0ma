import React from 'react';
import {
  Cpu,
  ChevronDown,
  ChevronRight,
  FileText,
  Plus,
  Trash2,
  Activity,
  ScrollText,
  Settings,
  Image as ImageIcon,
  FolderInput,
  Copy
} from 'lucide-react';
import Editor from 'react-simple-code-editor';
import Prism from 'prismjs';
import 'prismjs/components/prism-yaml';
import 'prismjs/components/prism-bash';
import { Select } from './Select';
import { LimaConfig } from '../types/LimaConfig';

interface LimaConfigFormProps {
  parsedConfig: LimaConfig;
  updateConfigField: (field: string, value: any) => void;
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
  
  showScripts?: boolean;
  onToggleScripts?: (show: boolean) => void;
  showProbes?: boolean;
  onToggleProbes?: (show: boolean) => void;
}

export const LimaConfigForm: React.FC<LimaConfigFormProps> = ({
  parsedConfig,
  updateConfigField,
  updateProvisionScript,
  addProvisionScript,
  removeProvisionScript,
  updateProbeScript,
  addProbeScript,
  removeProbeScript,
  showScripts: propsShowScripts,
  onToggleScripts,
  showProbes: propsShowProbes,
  onToggleProbes
}) => {
  const [localShowScripts, setLocalShowScripts] = React.useState(false);
  const [localShowProbes, setLocalShowProbes] = React.useState(false);
  const [showImages, setShowImages] = React.useState(true);
  const [showMounts, setShowMounts] = React.useState(false);
  const [showCopyToHost, setShowCopyToHost] = React.useState(false);

  const effectiveShowScripts = propsShowScripts ?? localShowScripts;
  const handleToggleScripts = (val: boolean) => {
      if (onToggleScripts) onToggleScripts(val);
      else setLocalShowScripts(val);
  };

  const effectiveShowProbes = propsShowProbes ?? localShowProbes;
  const handleToggleProbes = (val: boolean) => {
      if (onToggleProbes) onToggleProbes(val);
      else setLocalShowProbes(val);
  };

  const updateArrayItem = (field: keyof LimaConfig, index: number, subField: string, value: any) => {
    const list = [...(parsedConfig[field] as any[] || [])];
    if (list[index]) {
      list[index] = { ...list[index], [subField]: value };
      updateConfigField(field as string, list);
    }
  };

  const removeArrayItem = (field: keyof LimaConfig, index: number) => {
    const list = [...(parsedConfig[field] as any[] || [])];
    list.splice(index, 1);
    updateConfigField(field as string, list);
  };

  const addArrayItem = (field: keyof LimaConfig, defaultItem: any) => {
    const list = [...(parsedConfig[field] as any[] || [])];
    list.push(defaultItem);
    updateConfigField(field as string, list);
  };

  return (
      <div className="grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-zinc-800 h-full overflow-hidden">
        
        {/* COLUMN 1: Resources & Virtualisation (1/3 Width) */}
        <div className="flex flex-col h-full overflow-hidden">
          <div className="h-10 flex items-center gap-2 px-4 border-b border-zinc-800/50 shrink-0 bg-zinc-900/50">
            <Cpu className="w-3.5 h-3.5 text-zinc-500" />
            <span className="text-[11px] font-bold uppercase tracking-widest text-zinc-500">Resources</span>
          </div>
          <div className="p-4 space-y-4 overflow-y-auto flex-1 min-h-0 pb-8 [scrollbar-gutter:stable]">
            <div>
              <label className="text-[10px] uppercase text-zinc-600 font-bold block mb-1">
                CPUs
              </label>
              <input
                type="number"
                min="1"
                max="16"
                value={parsedConfig.cpus || 2}
                onChange={(e) => updateConfigField('cpus', parseInt(e.target.value))}
                className="w-full bg-zinc-950 border border-zinc-800 text-zinc-300 text-xs px-2 py-1.5 focus:outline-none focus:border-zinc-500"
              />
            </div>
            <div>
              <label className="text-[10px] uppercase text-zinc-600 font-bold block mb-1">
                Memory
              </label>
              <Select
                value={parsedConfig.memory || '4GiB'}
                onChange={(e) => updateConfigField('memory', e.target.value)}
                wrapperClassName="w-full bg-zinc-950 border border-zinc-800 focus-within:border-zinc-500"
                className="text-zinc-300 text-xs px-2 py-1.5"
              >
                <option value="2GiB">2GiB</option>
                <option value="4GiB">4GiB</option>
                <option value="8GiB">8GiB</option>
                <option value="16GiB">16GiB</option>
                <option value="32GiB">32GiB</option>
              </Select>
            </div>
            <div>
              <label className="text-[10px] uppercase text-zinc-600 font-bold block mb-1">
                Disk Size
              </label>
              <input
                type="text"
                value={parsedConfig.disk || '100GiB'}
                onChange={(e) => updateConfigField('disk', e.target.value)}
                className="w-full bg-zinc-950 border border-zinc-800 text-zinc-300 text-xs px-2 py-1.5 focus:outline-none focus:border-zinc-500"
              />
            </div>
             <div>
              <label className="text-[10px] uppercase text-zinc-600 font-bold block mb-1">
                VM Type
              </label>
              <Select
                value={parsedConfig.vmType || 'vz'}
                onChange={(e) => updateConfigField('vmType', e.target.value)}
                wrapperClassName="w-full bg-zinc-950 border border-zinc-800 focus-within:border-zinc-500"
                className="text-zinc-300 text-xs px-2 py-1.5"
              >
                <option value="vz">VZ (Virtualization.framework)</option>
                <option value="qemu">QEMU</option>
                <option value="krunkit">Krunkit</option>
              </Select>
            </div>
          </div>
        </div>

        {/* COLUMN 2: System & Storage (1/3 Width) */}
        <div className="flex flex-col h-full overflow-hidden">
            <div className="h-10 flex items-center gap-2 px-4 border-b border-zinc-800/50 shrink-0 bg-zinc-900/50">
                <Settings className="w-3.5 h-3.5 text-zinc-500" />
                <span className="text-[11px] font-bold uppercase tracking-widest text-zinc-500">System</span>
            </div>
            <div className="p-4 space-y-6 overflow-y-auto flex-1 min-h-0 pb-8 [scrollbar-gutter:stable]">
               
               {/* Min Version */}
               <div>
                  <label className="text-[10px] uppercase text-zinc-600 font-bold block mb-1">
                    Min Lima Version
                  </label>
                  <input
                    type="text"
                    value={parsedConfig.minimumLimaVersion || ''}
                    onChange={(e) => updateConfigField('minimumLimaVersion', e.target.value)}
                    placeholder="e.g. 2.0.0"
                    className="w-full bg-zinc-950 border border-zinc-800 text-zinc-300 text-xs px-2 py-1.5 focus:outline-none focus:border-zinc-500"
                  />
               </div>

               {/* Images */}
               <div className="space-y-2">
                  <div className="flex items-center justify-between text-zinc-500">
                     <button
                        onClick={() => setShowImages(!showImages)}
                        className="flex items-center gap-2 hover:text-zinc-300 transition-colors focus:outline-none"
                     >
                        {showImages ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
                        <ImageIcon className="w-3.5 h-3.5" />
                        <span className="text-[10px] font-bold uppercase tracking-widest">
                            Images ({parsedConfig.images?.length || 0})
                        </span>
                     </button>
                     <button
                        onClick={() => addArrayItem('images', {location: '', arch: 'x86_64'})}
                        className="p-1 hover:bg-zinc-800 rounded transition-colors"
                        title="Add Image"
                     >
                        <Plus className="w-3.5 h-3.5" />
                     </button>
                  </div>
                  {showImages && (
                      <div className="space-y-3 animate-in slide-in-from-top-2 fade-in duration-200">
                          {parsedConfig.images?.map((img: any, i: number) => (
                              <div key={i} className="bg-zinc-950/50 border border-zinc-800 rounded p-2 space-y-2 relative group">
                                  <button
                                    onClick={() => removeArrayItem('images', i)}
                                    className="absolute top-1 right-1 text-zinc-600 hover:text-red-500 p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                                  >
                                    <Trash2 className="w-3 h-3" />
                                  </button>
                                  <input 
                                    className="w-full bg-transparent border-b border-zinc-800 focus:border-zinc-500 text-xs py-1 outline-none text-zinc-300 placeholder:text-zinc-700"
                                    placeholder="Image Location (URL/Path)"
                                    value={img.location || ''}
                                    onChange={(e) => updateArrayItem('images', i, 'location', e.target.value)}
                                  />
                                  <Select
                                    value={img.arch || 'x86_64'}
                                    onChange={(e) => updateArrayItem('images', i, 'arch', e.target.value)}
                                    wrapperClassName="w-full border-zinc-800"
                                    className="text-[10px] uppercase text-zinc-400 py-1"
                                  >
                                    <option value="x86_64">x86_64</option>
                                    <option value="aarch64">aarch64</option>
                                  </Select>
                              </div>
                          ))}
                          {(!parsedConfig.images || parsedConfig.images.length === 0) && (
                            <div className="text-[10px] text-zinc-600 italic px-2">No images configured.</div>
                          )}
                      </div>
                  )}
               </div>

               {/* Mounts */}
               <div className="space-y-2">
                  <div className="flex items-center justify-between text-zinc-500">
                     <button
                        onClick={() => setShowMounts(!showMounts)}
                        className="flex items-center gap-2 hover:text-zinc-300 transition-colors focus:outline-none"
                     >
                        {showMounts ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
                        <FolderInput className="w-3.5 h-3.5" />
                        <span className="text-[10px] font-bold uppercase tracking-widest">
                            Mounts ({parsedConfig.mounts?.length || 0})
                        </span>
                     </button>
                     <button
                        onClick={() => addArrayItem('mounts', {location: '', writable: false})}
                        className="p-1 hover:bg-zinc-800 rounded transition-colors"
                        title="Add Mount"
                     >
                        <Plus className="w-3.5 h-3.5" />
                     </button>
                  </div>
                  {showMounts && (
                      <div className="space-y-2 animate-in slide-in-from-top-2 fade-in duration-200">
                          {parsedConfig.mounts?.map((mnt: any, i: number) => (
                              <div key={i} className="bg-zinc-950/50 border border-zinc-800 rounded p-2 flex items-center gap-2 group">
                                  <div className="flex-1 space-y-1">
                                    <input 
                                        className="w-full bg-transparent border-none text-xs outline-none text-zinc-300 placeholder:text-zinc-700"
                                        placeholder="Location (~/path)"
                                        value={mnt.location || ''}
                                        onChange={(e) => updateArrayItem('mounts', i, 'location', e.target.value)}
                                    />
                                    <div className="flex items-center gap-2">
                                        <input 
                                            type="checkbox"
                                            checked={mnt.writable || false}
                                            onChange={(e) => updateArrayItem('mounts', i, 'writable', e.target.checked)}
                                            className="accent-zinc-500 w-3 h-3"
                                            id={`mnt-write-${i}`}
                                        />
                                        <label htmlFor={`mnt-write-${i}`} className="text-[10px] text-zinc-500 uppercase select-none cursor-pointer">Writable</label>
                                    </div>
                                  </div>
                                  <button
                                    onClick={() => removeArrayItem('mounts', i)}
                                    className="text-zinc-600 hover:text-red-500 p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                                  >
                                    <Trash2 className="w-3 h-3" />
                                  </button>
                              </div>
                          ))}
                      </div>
                  )}
               </div>

                {/* Copy To Host */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-zinc-500">
                     <button
                        onClick={() => setShowCopyToHost(!showCopyToHost)}
                        className="flex items-center gap-2 hover:text-zinc-300 transition-colors focus:outline-none"
                     >
                        {showCopyToHost ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
                        <Copy className="w-3.5 h-3.5" />
                        <span className="text-[10px] font-bold uppercase tracking-widest">
                            Copy to Host ({parsedConfig.copyToHost?.length || 0})
                        </span>
                     </button>
                     <button
                        onClick={() => addArrayItem('copyToHost', {guest: '', host: '', deleteOnStop: true})}
                        className="p-1 hover:bg-zinc-800 rounded transition-colors"
                        title="Add Copy Rule"
                     >
                        <Plus className="w-3.5 h-3.5" />
                     </button>
                  </div>
                  {showCopyToHost && (
                      <div className="space-y-3 animate-in slide-in-from-top-2 fade-in duration-200">
                          {parsedConfig.copyToHost?.map((rule: any, i: number) => (
                              <div key={i} className="bg-zinc-950/50 border border-zinc-800 rounded p-2 space-y-2 relative group">
                                   <button
                                    onClick={() => removeArrayItem('copyToHost', i)}
                                    className="absolute top-1 right-1 text-zinc-600 hover:text-red-500 p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                                  >
                                    <Trash2 className="w-3 h-3" />
                                  </button>
                                  <div className="grid grid-cols-[30px_1fr] items-center gap-2">
                                      <span className="text-[9px] uppercase text-zinc-600 font-bold">GST</span>
                                      <input 
                                        className="w-full bg-transparent border-b border-zinc-800/50 focus:border-zinc-500 text-xs py-0.5 outline-none text-zinc-300"
                                        placeholder="/path/in/guest"
                                        value={rule.guest || ''}
                                        onChange={(e) => updateArrayItem('copyToHost', i, 'guest', e.target.value)}
                                      />
                                  </div>
                                  <div className="grid grid-cols-[30px_1fr] items-center gap-2">
                                      <span className="text-[9px] uppercase text-zinc-600 font-bold">HST</span>
                                      <input 
                                        className="w-full bg-transparent border-b border-zinc-800/50 focus:border-zinc-500 text-xs py-0.5 outline-none text-zinc-300"
                                        placeholder="/path/on/host"
                                        value={rule.host || ''}
                                        onChange={(e) => updateArrayItem('copyToHost', i, 'host', e.target.value)}
                                      />
                                  </div>
                                  <div className="flex items-center gap-2 pl-[38px]">
                                        <input 
                                            type="checkbox"
                                            checked={rule.deleteOnStop || false}
                                            onChange={(e) => updateArrayItem('copyToHost', i, 'deleteOnStop', e.target.checked)}
                                            className="accent-zinc-500 w-3 h-3"
                                            id={`cp-del-${i}`}
                                        />
                                        <label htmlFor={`cp-del-${i}`} className="text-[9px] text-zinc-500 uppercase select-none cursor-pointer">Delete on Stop</label>
                                  </div>
                              </div>
                          ))}
                      </div>
                  )}
               </div>

            </div>
        </div>

        {/* COLUMN 3: Automation (1/3 Width) */}
        <div className="flex flex-col h-full overflow-hidden">
            <div className="h-10 flex items-center gap-2 px-4 border-b border-zinc-800/50 shrink-0 bg-zinc-900/50">
                <ScrollText className="w-3.5 h-3.5 text-zinc-500" />
                <span className="text-[11px] font-bold uppercase tracking-widest text-zinc-500">Automation</span>
            </div>

            <div className="p-4 space-y-6 overflow-y-auto flex-1 min-h-0 pb-8 [scrollbar-gutter:stable]">
                {/* PROVISIONING SCRIPTS */}
                <div className="space-y-2">
                <div className="flex items-center justify-between text-zinc-500">
                    <button
                    onClick={() => handleToggleScripts(!effectiveShowScripts)}
                    className="flex items-center gap-2 hover:text-zinc-300 transition-colors focus:outline-none"
                    >
                    {effectiveShowScripts ? (
                        <ChevronDown className="w-3.5 h-3.5" />
                    ) : (
                        <ChevronRight className="w-3.5 h-3.5" />
                    )}
                    <FileText className="w-3.5 h-3.5" />
                    <span className="text-[10px] font-bold uppercase tracking-widest">
                        Provisioning Scripts ({parsedConfig.provision?.length || 0})
                    </span>
                    </button>
                    <button
                    onClick={() => {
                       addProvisionScript();
                       handleToggleScripts(true);
                    }}
                    className="flex items-center gap-1 px-2 py-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-[10px] font-bold uppercase rounded transition-colors border border-zinc-700 hover:border-zinc-600"
                    >
                    <Plus className="w-3 h-3" /> Add Script
                    </button>
                </div>

                {effectiveShowScripts && (
                    <div className="space-y-4 animate-in slide-in-from-top-2 fade-in duration-200">
                    {parsedConfig.provision &&
                        parsedConfig.provision.map((script: any, index: number) => (
                        <div key={index} className="bg-zinc-950/50 border border-zinc-800 rounded p-3">
                            <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                                <span className="text-[10px] text-zinc-600 uppercase font-bold">Mode</span>
                                <Select
                                  value={script.mode}
                                  onChange={(e) => updateProvisionScript(index, 'mode', e.target.value)}
                                  wrapperClassName="bg-zinc-900 border border-zinc-700 w-24"
                                  className="text-zinc-300 text-[10px] px-2 py-0.5"
                                >
                                <option value="system">system</option>
                                <option value="user">user</option>
                                <option value="boot">boot</option>
                                </Select>
                            </div>
                            <button
                                onClick={() => removeProvisionScript(index)}
                                className="text-zinc-600 hover:text-red-500 transition-colors"
                            >
                                <Trash2 className="w-3 h-3" />
                            </button>
                            </div>
                            <div className="border border-zinc-800 rounded bg-[#1e1e1e] overflow-hidden">
                            <Editor
                                value={script.script || ''}
                                onValueChange={(val) => updateProvisionScript(index, 'script', val)}
                                highlight={(code) =>
                                Prism.highlight(
                                    code,
                                    Prism.languages.bash || Prism.languages.clike,
                                    'bash'
                                )
                                }
                                padding={10}
                                className="font-mono"
                                style={{
                                  fontSize: 11,
                                  backgroundColor: '#1e1e1e',
                                  color: '#e0e0e0',
                                }}
                            />
                            </div>
                        </div>
                        ))}
                    </div>
                )}
                </div>

                {/* PROBES SCRIPTS */}
                <div className="space-y-2">
                <div className="flex items-center justify-between text-zinc-500">
                    <button
                    onClick={() => handleToggleProbes(!effectiveShowProbes)}
                    className="flex items-center gap-2 hover:text-zinc-300 transition-colors focus:outline-none"
                    >
                    {effectiveShowProbes ? (
                        <ChevronDown className="w-3.5 h-3.5" />
                    ) : (
                        <ChevronRight className="w-3.5 h-3.5" />
                    )}
                    <Activity className="w-3.5 h-3.5" />
                    <span className="text-[10px] font-bold uppercase tracking-widest">
                        Readiness Probes ({parsedConfig.probes?.length || 0})
                    </span>
                    </button>
                    <button
                    onClick={() => {
                        addProbeScript();
                        handleToggleProbes(true);
                    }}
                    className="flex items-center gap-1 px-2 py-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-[10px] font-bold uppercase rounded transition-colors border border-zinc-700 hover:border-zinc-600"
                    >
                    <Plus className="w-3 h-3" /> Add Probe
                    </button>
                </div>

                {effectiveShowProbes && (
                    <div className="space-y-4 animate-in slide-in-from-top-2 fade-in duration-200">
                    {parsedConfig.probes &&
                        parsedConfig.probes.map((probe: any, index: number) => (
                        <div key={index} className="bg-zinc-950/50 border border-zinc-800 rounded p-3">
                            <div className="flex items-center justify-between mb-2">
                            <div className="flex-1 flex items-center gap-2 mr-4">
                                <span className="text-[10px] text-zinc-600 uppercase font-bold shrink-0">
                                Desc
                                </span>
                                <input
                                type="text"
                                value={probe.description || ''}
                                onChange={(e) =>
                                    updateProbeScript(index, 'description', e.target.value)
                                }
                                className="bg-zinc-900 border border-zinc-700 text-zinc-300 text-xs px-2 py-0.5 w-full focus:outline-none"
                                placeholder="Probe Description"
                                />
                            </div>
                            <button
                                onClick={() => removeProbeScript(index)}
                                className="text-zinc-600 hover:text-red-500 transition-colors"
                            >
                                <Trash2 className="w-3 h-3" />
                            </button>
                            </div>

                            <div className="mb-2">
                            <div className="text-[10px] text-zinc-600 uppercase font-bold mb-1">
                                Script
                            </div>
                            <div className="border border-zinc-800 rounded bg-[#1e1e1e] overflow-hidden">
                                <Editor
                                value={probe.script || ''}
                                onValueChange={(val) => updateProbeScript(index, 'script', val)}
                                highlight={(code) =>
                                    Prism.highlight(
                                    code,
                                    Prism.languages.bash || Prism.languages.clike,
                                    'bash'
                                    )
                                }
                                padding={10}
                                className="font-mono text-xs"
                                style={{
                                    backgroundColor: '#1e1e1e',
                                    color: '#e0e0e0',
                                }}
                                />
                            </div>
                            </div>

                            <div>
                            <div className="text-[10px] text-zinc-600 uppercase font-bold mb-1">
                                Hint (On Failure)
                            </div>
                            <textarea
                                value={probe.hint || ''}
                                onChange={(e) => updateProbeScript(index, 'hint', e.target.value)}
                                className="w-full bg-zinc-900 border border-zinc-800 text-zinc-400 text-xs p-2 h-16 focus:outline-none font-mono"
                                placeholder="Message to show if probe fails..."
                            />
                            </div>
                        </div>
                        ))}
                    </div>
                )}
                </div>
            </div>
        </div>
      </div>
  );
};