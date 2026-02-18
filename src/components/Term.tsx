import { useRef } from "react";
import { useXterm, useXtermResize, useTerminalSession } from "../hooks/terminal";

export function Term() {
  const containerRef = useRef<HTMLDivElement>(null);
  const { term, geometry } = useXterm(containerRef);

  const dims = useXtermResize(term, containerRef, null);

  // Hook up useTerminalSession to ensure it has I/O capabilities if a session is attached.
  useTerminalSession(term, geometry?.cols ?? dims.cols, geometry?.rows ?? dims.rows);

  return <div ref={containerRef} className="h-full w-full overflow-hidden bg-black" />;
}
