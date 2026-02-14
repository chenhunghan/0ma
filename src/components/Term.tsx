import { useRef } from "react";
import { useFrankenTerm, useFrankenTermResize, useTerminalSession } from "../hooks/terminal";

export function Term() {
  const containerRef = useRef<HTMLDivElement>(null);
  const { term, geometry } = useFrankenTerm(containerRef);

  const dims = useFrankenTermResize(term, containerRef, null);

  // Hook up useTerminalSession to ensure it has I/O capabilities if a session is attached.
  useTerminalSession(term, geometry?.cols ?? dims.cols, geometry?.rows ?? dims.rows);

  return <div ref={containerRef} className="h-full w-full overflow-hidden bg-black" />;
}
