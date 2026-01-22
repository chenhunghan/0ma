import React, { useEffect, useRef } from 'react';
import '@xterm/xterm/css/xterm.css';
import { error } from '@tauri-apps/plugin-log';
import { LogState } from 'src/types/Log';
import { useXterm } from '../hooks/useXterm';

interface Props {
  logState: LogState;
}

const LOG_VIEW_TERM_CONFIG = {
  fontFamily: '"JetBrains Mono Variable", monospace',
  fontSize: 11,
  lineHeight: 1.15,
  theme: {
    background: '#000000',
    foreground: '#d4d4d8', // zinc-300
    cursor: 'transparent',
    selectionBackground: '#27272a', // zinc-800
    black: '#000000',
    red: '#ef4444',
    green: '#10b981',
    yellow: '#f59e0b',
    blue: '#3b82f6',
    magenta: '#d946ef',
    cyan: '#06b6d4',
    white: '#e4e4e7',
    brightBlack: '#71717a',
    brightRed: '#f87171',
    brightGreen: '#34d399',
    brightYellow: '#fbbf24',
    brightBlue: '#60a5fa',
    brightMagenta: '#e879f9',
    brightCyan: '#22d3ee',
    brightWhite: '#ffffff',
  },
};

export const LogViewer: React.FC<Props> = ({ logState }) => {
  const terminalContainerRef = useRef<HTMLDivElement>(null);
  const { terminalRef } = useXterm(terminalContainerRef, {
    ...LOG_VIEW_TERM_CONFIG,
    cursorBlink: false,
    cursorStyle: 'underline',
    disableStdin: true,
    allowProposedApi: true,
    hideCursor: true,
  });

  // Write stdout to terminal
  useEffect(() => {
    const term = terminalRef.current;
    if (!term) return;

    logState.stdout.forEach((log) => {
      try {
        term.writeln(log.message);
        // Auto-scroll to bottom
        term.scrollToBottom();
      } catch (e) {
        error(`Error writing to terminal: ${e}`);
      }
    });
  }, [logState.stdout, terminalRef]);

  // Write stderr to terminal
  useEffect(() => {
    const term = terminalRef.current;
    if (!term) return;

    logState.stderr.forEach((log) => {
      try {
        term.writeln(log.message);
        // Auto-scroll to bottom
        term.scrollToBottom();
      } catch (e) {
        error(`Error writing to terminal: ${e}`);
      }
    });
  }, [logState.stderr, terminalRef]);

  return (
    <div className="h-full w-full overflow-hidden bg-black" ref={terminalContainerRef} />
  );
};
