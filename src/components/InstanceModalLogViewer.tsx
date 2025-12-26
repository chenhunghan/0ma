import React, { useEffect, useRef } from 'react';
import { Terminal } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import '@xterm/xterm/css/xterm.css';

interface InstanceModalLog {
  type: 'stdout' | 'stderr' | 'error' | 'info' | 'success';
  message: string;
  timestamp: Date;
}

interface InstanceModalLogViewerProps {
  logs: InstanceModalLog[];
}

const TERM_CONFIG = {
  fontFamily: '"Fira Code", Menlo, Monaco, "Courier New", monospace',
  fontSize: 11,
  lineHeight: 1.15,
  theme: {
    background: '#000000',
    foreground: '#d4d4d8', // zinc-300
    cursor: '#10b981', // emerald-500
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

export const InstanceModalLogViewer: React.FC<InstanceModalLogViewerProps> = ({ logs }) => {
  const terminalContainerRef = useRef<HTMLDivElement>(null);
  const terminalRef = useRef<Terminal | null>(null);
  const fitAddonRef = useRef<FitAddon | null>(null);
  const processedLogsRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (!terminalContainerRef.current) return;

    // Create terminal instance
    const term = new Terminal({
      ...TERM_CONFIG,
      cursorBlink: false,
      cursorStyle: 'block',
      disableStdin: true,
      allowProposedApi: true,
    });

    const fitAddon = new FitAddon();
    term.loadAddon(fitAddon);

    term.open(terminalContainerRef.current);

    terminalRef.current = term;
    fitAddonRef.current = fitAddon;

    // Initial fit
    requestAnimationFrame(() => {
      try {
        fitAddon.fit();
      } catch (e) {
        console.debug('Terminal fit error:', e);
      }
    });

    // Handle resize
    const resizeObserver = new ResizeObserver(() => {
      requestAnimationFrame(() => {
        try {
          fitAddon.fit();
        } catch (e) {
          console.debug('Terminal fit error:', e);
        }
      });
    });

    resizeObserver.observe(terminalContainerRef.current);

    return () => {
      resizeObserver.disconnect();
      term.dispose();
      terminalRef.current = null;
      fitAddonRef.current = null;
      processedLogsRef.current.clear();
    };
  }, []);

  // Write logs to terminal
  useEffect(() => {
    const term = terminalRef.current;
    if (!term) return;

    logs.forEach((log) => {
      const logKey = `${log.timestamp.getTime()}-${log.type}-${log.message}`;
      
      // Skip if already processed
      if (processedLogsRef.current.has(logKey)) return;
      
      processedLogsRef.current.add(logKey);

      try {
        term.writeln(log.message);
        
        // Auto-scroll to bottom
        term.scrollToBottom();
      } catch (e) {
        console.error('Error writing to terminal:', e);
      }
    });
  }, [logs]);

  return (
    <div className="h-full w-full overflow-hidden bg-black" ref={terminalContainerRef} />
  );
};
