import React, { useEffect, useRef } from "react";
import type { LogState } from "src/types/Log";
import { useFrankenTerm, useFrankenTermInput, useFrankenTermResize } from "../hooks/terminal";

const textEncoder = new TextEncoder();

interface Props {
  logState: LogState;
}

export const LogViewer: React.FC<Props> = ({ logState }) => {
  const terminalContainerRef = useRef<HTMLDivElement>(null);
  const { term, canvasRef } = useFrankenTerm(terminalContainerRef);
  const lastStdoutLen = useRef(0);
  const lastStderrLen = useRef(0);

  // Resize: adapts to container size (no PTY to notify)
  const dims = useFrankenTermResize(term, terminalContainerRef, null);

  // Input: mouse selection, copy, wheel scrolling (read-only: no PTY session)
  const { updateGeometry } = useFrankenTermInput(term, null, canvasRef);

  // Keep input hook geometry in sync with resize
  useEffect(() => {
    updateGeometry(dims.cols, dims.cellWidth, dims.cellHeight);
  }, [dims.cols, dims.cellWidth, dims.cellHeight, updateGeometry]);

  // Feed only new stdout entries (reset ref when array shrinks, e.g. new operation)
  useEffect(() => {
    if (!term) return;
    const entries = logState.stdout;
    if (entries.length < lastStdoutLen.current) {
      lastStdoutLen.current = 0;
    }
    for (let i = lastStdoutLen.current; i < entries.length; i++) {
      term.feed(textEncoder.encode(entries[i].message + "\r\n"));
    }
    lastStdoutLen.current = entries.length;
  }, [logState.stdout, term]);

  // Feed only new stderr entries (reset ref when array shrinks, e.g. new operation)
  useEffect(() => {
    if (!term) return;
    const entries = logState.stderr;
    if (entries.length < lastStderrLen.current) {
      lastStderrLen.current = 0;
    }
    for (let i = lastStderrLen.current; i < entries.length; i++) {
      term.feed(textEncoder.encode(entries[i].message + "\r\n"));
    }
    lastStderrLen.current = entries.length;
  }, [logState.stderr, term]);

  return <div className="h-full w-full overflow-hidden bg-black" ref={terminalContainerRef} />;
};
