import React, { useEffect, useRef } from "react";
import type { LogState } from "src/types/Log";
import { useFrankenTerm } from "../hooks/terminal";

const textEncoder = new TextEncoder();

interface Props {
  logState: LogState;
}

export const LogViewer: React.FC<Props> = ({ logState }) => {
  const terminalContainerRef = useRef<HTMLDivElement>(null);
  const { term } = useFrankenTerm(terminalContainerRef);

  // Write stdout to terminal
  useEffect(() => {
    if (!term) return;
    for (const entry of logState.stdout) {
      term.feed(textEncoder.encode(entry.message + "\n"));
    }
  }, [logState.stdout, term]);

  // Write stderr to terminal
  useEffect(() => {
    if (!term) return;
    for (const entry of logState.stderr) {
      term.feed(textEncoder.encode(entry.message + "\n"));
    }
  }, [logState.stderr, term]);

  return <div className="h-full w-full overflow-hidden bg-black" ref={terminalContainerRef} />;
};
