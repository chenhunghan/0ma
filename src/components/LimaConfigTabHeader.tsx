import React from "react";
import { Sliders } from "lucide-react";

interface LimaConfigTabHeaderProps {
  showConfigPanel: boolean;
  toggleConfigPanel: () => void;
}

export const LimaConfigTabHeader: React.FC<LimaConfigTabHeaderProps> = ({
  showConfigPanel,
  toggleConfigPanel,
}) => (
    <>
      <button
        onClick={toggleConfigPanel}
        className={`flex items-center gap-2 transition-colors hover:text-white px-1.5 py-0.5 rounded hover:bg-zinc-900 border border-transparent hover:border-zinc-700 ${
          showConfigPanel ? "bg-zinc-800 text-white border-zinc-700" : "text-zinc-300"
        }`}
      >
        <Sliders className="w-3 h-3 text-zinc-500" />
        <span className="underline decoration-dotted underline-offset-4">QUICK SETTINGS</span>
      </button>

      <div className="w-px h-3 bg-zinc-800" />
      <span className="text-zinc-500 uppercase text-[10px]">YAML Editor Mode</span>
    </>
  );
