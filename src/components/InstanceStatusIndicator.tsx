import React from 'react';
import { InstanceStatus } from '../types/InstanceStatus';

interface InstanceStatusIndicatorProps {
  status: InstanceStatus;
}

export const InstanceStatusIndicator: React.FC<InstanceStatusIndicatorProps> = ({ status }) => {
  const getStatusColor = (s: InstanceStatus) => {
    switch (s) {
      case InstanceStatus.Running:
        return 'text-emerald-500';
      case InstanceStatus.Stopped:
        return 'text-zinc-500';
      case InstanceStatus.Error:
        return 'text-red-500';
      default:
        return 'text-amber-500';
    }
  };

  return (
    <div className="hidden md:flex items-center gap-2 text-sm">
      <span className="text-zinc-600">STATUS:</span>
      <span className={`font-bold uppercase ${getStatusColor(status)}`}>
        [{status}]
      </span>
    </div>
  );
};