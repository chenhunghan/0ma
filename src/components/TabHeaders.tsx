import { useCallback } from "react";
import { Settings, ShipWheel, Terminal as TerminalIcon } from "lucide-react";

interface TabHeadersProps {
  activeTab: "lima" | "k8s" | "config";
  setActiveTab: (tab: "lima" | "k8s" | "config") => void;
}

export function TabHeaders({ activeTab, setActiveTab }: TabHeadersProps) {
  const handleConfigClick = useCallback(() => {
    setActiveTab("config");
  }, [setActiveTab]);

  const handleLimaClick = useCallback(() => {
    setActiveTab("lima");
  }, [setActiveTab]);

  const handleK8sClick = useCallback(() => {
    setActiveTab("k8s");
  }, [setActiveTab]);

  return (
    <div className="flex">
      <button
        onClick={handleConfigClick}
        className={`px-4 py-2 text-xs font-bold uppercase tracking-widest border-r border-zinc-800 transition-colors flex items-center gap-2 ${
          activeTab === "config"
            ? "bg-zinc-900 text-white border-t-2 border-t-amber-500"
            : "text-zinc-500 hover:text-zinc-300 hover:bg-zinc-900/30"
        }`}
      >
        <Settings className="w-3 h-3" />
        CONFIG
      </button>
      <button
        onClick={handleLimaClick}
        className={`px-4 py-2 text-xs font-bold uppercase tracking-widest border-r border-zinc-800 transition-colors flex items-center gap-2 ${
          activeTab === "lima"
            ? "bg-zinc-900 text-white border-t-2 border-t-emerald-500"
            : "text-zinc-500 hover:text-zinc-300 hover:bg-zinc-900/30"
        }`}
      >
        <TerminalIcon className="w-3 h-3" />
        LIMA
      </button>
      <button
        onClick={handleK8sClick}
        className={`px-4 py-2 text-xs font-bold uppercase tracking-widest border-r border-zinc-800 transition-colors flex items-center gap-2 ${
          activeTab === "k8s"
            ? "bg-zinc-900 text-white border-t-2 border-t-blue-500"
            : "text-zinc-500 hover:text-zinc-300 hover:bg-zinc-900/30"
        }`}
      >
        <ShipWheel className="w-3 h-3" />
        K8S
      </button>
    </div>
  );
}
