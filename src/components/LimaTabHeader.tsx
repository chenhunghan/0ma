import React from "react";
import { Info, Cpu, Activity, HardDrive } from "lucide-react";
import { LimaInstance } from "../types/LimaInstance";

interface LimaTabHeaderProps {
  instance: LimaInstance;
  showLimaPanel: boolean;
  toggleLimaPanel: () => void;
}

export const LimaTabHeader: React.FC<LimaTabHeaderProps> = ({
  instance,
  showLimaPanel,
  toggleLimaPanel,
}) => {
  return (
    <>
      <button
        onClick={toggleLimaPanel}
        className={`flex items-center gap-2 transition-colors hover:text-white px-1.5 py-0.5 rounded hover:bg-zinc-900 border border-transparent hover:border-zinc-700 ${
          showLimaPanel ? "bg-zinc-800 text-white border-zinc-700" : "text-zinc-300"
        }`}
      >
        <Info className="w-3 h-3 text-zinc-500" />
        <span className="underline decoration-dotted underline-offset-4">INSTANCE DETAILS</span>
      </button>

      <div className="w-px h-3 bg-zinc-800"></div>

      <div className="flex items-center gap-2 text-zinc-500">
        <Cpu className="w-3 h-3" />
        <span className="text-zinc-400">{instance.cpus} CPU</span>
      </div>
      <div className="flex items-center gap-2 text-zinc-500">
        <Activity className="w-3 h-3" />
        <span className="text-zinc-400">{instance.memory}</span>
      </div>
      <div className="flex items-center gap-2 text-zinc-500">
        <HardDrive className="w-3 h-3" />
        <span className="text-zinc-400">{instance.disk}</span>
      </div>
      <div className="w-px h-3 bg-zinc-800"></div>
      <div className="text-zinc-600 uppercase text-[10px] font-bold">{instance.arch}</div>
    </>
  );
};
