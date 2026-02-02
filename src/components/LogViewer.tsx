import React, { useEffect, useRef } from "react";
import "@xterm/xterm/css/xterm.css";
import { error } from "@tauri-apps/plugin-log";
import { LogState } from "src/types/Log";
import { useXterm } from "../hooks/terminal";

interface Props {
  logState: LogState;
}

const LOG_VIEW_TERM_CONFIG = {
  fontFamily: '"JetBrains Mono Variable", monospace',
  fontSize: 11,
  lineHeight: 1.15,
  cursorBlink: false,
  cursorStyle: "underline" as const,
  cursorInactiveStyle: "none" as const,
  disableStdin: true,
  allowProposedApi: true,
  theme: {
    background: "#000000",
    foreground: "#d4d4d8", // zinc-300
    cursor: "transparent",
    selectionBackground: "#27272a", // zinc-800
    black: "#000000",
    red: "#ef4444",
    green: "#10b981",
    yellow: "#f59e0b",
    blue: "#3b82f6",
    magenta: "#d946ef",
    cyan: "#06b6d4",
    white: "#e4e4e7",
    brightBlack: "#71717a",
    brightRed: "#f87171",
    brightGreen: "#34d399",
    brightYellow: "#fbbf24",
    brightBlue: "#60a5fa",
    brightMagenta: "#e879f9",
    brightCyan: "#22d3ee",
    brightWhite: "#ffffff",
  },
};

export const LogViewer: React.FC<Props> = ({ logState }) => {
  const terminalContainerRef = useRef<HTMLDivElement>(null);
  const { terminal } = useXterm(terminalContainerRef, LOG_VIEW_TERM_CONFIG);

  // Write stdout to terminal
  useEffect(() => {
    if (!terminal) return;

    logState.stdout.forEach((log) => {
      try {
        terminal.writeln(log.message);
        // Auto-scroll to bottom
        terminal.scrollToBottom();
      } catch (e) {
        error(`Error writing to terminal: ${e}`);
      }
    });
  }, [logState.stdout, terminal]);

  // Write stderr to terminal
  useEffect(() => {
    if (!terminal) return;

    logState.stderr.forEach((log) => {
      try {
        terminal.writeln(log.message);
        // Auto-scroll to bottom
        terminal.scrollToBottom();
      } catch (e) {
        error(`Error writing to terminal: ${e}`);
      }
    });
  }, [logState.stderr, terminal]);

  return <div className="h-full w-full overflow-hidden bg-black" ref={terminalContainerRef} />;
};
