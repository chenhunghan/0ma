import React, { useRef } from "react";
import type { LogState } from "src/types/Log";
import { useXterm } from "../hooks/terminal";

interface Props {
  logState: LogState;
}

export const LogViewer: React.FC<Props> = ({ logState: _logState }) => {
  const terminalContainerRef = useRef<HTMLDivElement>(null);
  useXterm(terminalContainerRef);

  // TODO: wire replacement terminal to write logState.stdout / logState.stderr

  return <div className="h-full w-full overflow-hidden bg-black" ref={terminalContainerRef} />;
};
