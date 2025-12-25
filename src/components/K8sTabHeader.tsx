import React from 'react';
import { Box, Layers, Network } from 'lucide-react';
import { LimaInstance } from '../types/LimaInstance';

interface K8sTabHeaderProps {
  instance: LimaInstance;
  showNodeInfo: boolean;
  toggleNodeInfo: () => void;
  showPodsPanel: boolean;
  togglePodsPanel: () => void;
  showServicesPanel: boolean;
  toggleServicesPanel: () => void;
}

export const K8sTabHeader: React.FC<K8sTabHeaderProps> = ({
  instance,
  showNodeInfo,
  toggleNodeInfo,
  showPodsPanel,
  togglePodsPanel,
  showServicesPanel,
  toggleServicesPanel,
}) => {
  return (
    <>
      <div className="flex items-center gap-2 text-blue-400">
        <span className="text-zinc-600">VER:</span>
        {instance.k8s?.version || 'N/A'}
      </div>
      <div className="w-px h-3 bg-zinc-800"></div>

      {/* NODES Metric Button */}
      <button
        onClick={toggleNodeInfo}
        className={`flex items-center gap-2 transition-colors hover:text-white px-1.5 py-0.5 rounded hover:bg-zinc-900 border border-transparent hover:border-zinc-700 ${
          showNodeInfo ? 'bg-zinc-800 text-white border-zinc-700' : 'text-zinc-300'
        }`}
        title="Toggle Node Details"
      >
        <Box className="w-3 h-3 text-zinc-500" />
        <span className="underline decoration-dotted underline-offset-4">
          {instance.k8s?.nodes || 0} NODES
        </span>
      </button>

      {/* PODS Metric Button */}
      <button
        onClick={togglePodsPanel}
        className={`flex items-center gap-2 transition-colors hover:text-white px-1.5 py-0.5 rounded hover:bg-zinc-900 border border-transparent hover:border-zinc-700 ${
          showPodsPanel ? 'bg-zinc-800 text-white border-zinc-700' : 'text-zinc-300'
        }`}
        title="Toggle Pod Details"
      >
        <Layers className="w-3 h-3 text-zinc-500" />
        <span className="underline decoration-dotted underline-offset-4">
          {instance.k8s?.pods || 0} PODS
        </span>
      </button>

      {/* SERVICES Metric Button */}
      <button
        onClick={toggleServicesPanel}
        className={`flex items-center gap-2 transition-colors hover:text-white px-1.5 py-0.5 rounded hover:bg-zinc-900 border border-transparent hover:border-zinc-700 ${
          showServicesPanel
            ? 'bg-zinc-800 text-white border-zinc-700'
            : 'text-zinc-300'
        }`}
        title="Toggle Service Details"
      >
        <Network className="w-3 h-3 text-zinc-500" />
        <span className="underline decoration-dotted underline-offset-4">
          {instance.k8s?.services || 0} SVCS
        </span>
      </button>

      <div className="w-px h-3 bg-zinc-800"></div>
      <div
        className={`uppercase font-bold ${
          instance.k8s?.status === 'Ready' ? 'text-emerald-500' : 'text-amber-500'
        }`}
      >
        {instance.k8s?.status || 'UNKNOWN'}
      </div>
    </>
  );
};