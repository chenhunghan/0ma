import React from 'react';
import { Loader2, Plus } from 'lucide-react';
import { LimaInstance } from '../types/LimaInstance';
import { Select } from './Select';

interface InstanceSelectorProps {
  instances: LimaInstance[];
  selectedName: string;
  onSelect: (id: string) => void;
  onCreate: () => void;
  isCreating: boolean;
}

export const InstanceSelector: React.FC<InstanceSelectorProps> = ({
  instances,
  selectedName,
  onSelect,
  onCreate,
  isCreating,
}) => {
  return (
    <div className="flex items-center gap-2">
      <span className="text-zinc-500">{'>'}</span>
      <Select
        value={selectedName}
        onChange={(e) => onSelect(e.target.value)}
        wrapperClassName="bg-zinc-900 border border-zinc-700 hover:border-zinc-500 px-2 py-1 min-w-[160px]"
        className="text-white font-bold text-sm uppercase"
      >
        {instances.map((i) => (
          <option key={i.name} value={i.name} className="bg-black text-white">
            {i.name}
          </option>
        ))}
      </Select>

      <button
        onClick={onCreate}
        disabled={isCreating}
        className="h-7 w-7 flex items-center justify-center border border-zinc-700 hover:bg-zinc-800 text-zinc-400 hover:text-white transition-colors"
        title="New Instance"
      >
        {isCreating ? (
          <Loader2 className="w-3 h-3 animate-spin" />
        ) : (
          <Plus className="w-4 h-4" />
        )}
      </button>
    </div>
  );
};