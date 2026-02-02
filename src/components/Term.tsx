import { useRef } from "react";
import "@xterm/xterm/css/xterm.css";
import { TERM_CONFIG, useTerminalSession, useXterm } from "../hooks/terminal";

const TERM_HIDDEN_CURSOR_CONFIG = {
  ...TERM_CONFIG,
  cursorInactiveStyle: "none" as const,
  theme: {
    ...TERM_CONFIG.theme,
    cursor: "transparent",
  },
};

export function Term() {
  const containerRef = useRef<HTMLDivElement>(null);
  const { terminal } = useXterm(containerRef, TERM_HIDDEN_CURSOR_CONFIG);

  // Hook up useTerminalSession to ensure it has I/O capabilities if a session is attached.
  useTerminalSession(terminal);

  return <div ref={containerRef} className="h-full w-full" />;
}
