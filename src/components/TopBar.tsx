import React from 'react';
import { LimaInstance } from '../types/LimaInstance';
import { InstanceSelector } from './InstanceSelector';
import { InstanceStatusIndicator } from './InstanceStatusIndicator';
import { InstanceActions } from './InstanceActions';

interface TopBarProps {
  instances: LimaInstance[];
  selectedName: string;
  onSelect: (id: string) => void;
  onCreate: () => void;
  isCreating: boolean;
  instance: LimaInstance;
  isProcessing: boolean;
  onStart: () => void;
  onStop: () => void;
  onDelete: () => void;
}

export const TopBar: React.FC<TopBarProps> = ({
  instances,
  selectedName,
  onSelect,
  onCreate,
  isCreating,
  instance,
  isProcessing,
  onStart,
  onStop,
  onDelete,
}) => {
  return (
    <header className="h-12 flex items-center justify-between px-2 border-b border-zinc-800 shrink-0 select-none">
      <InstanceSelector
        instances={instances}
        selectedName={selectedName}
        onSelect={onSelect}
        onCreate={onCreate}
        isCreating={isCreating}
      />

      <InstanceStatusIndicator status={instance.status} />

      <InstanceActions
        status={instance.status}
        isProcessing={isProcessing}
        onStart={onStart}
        onStop={onStop}
        onDelete={onDelete}
      />
    </header>
  );
};