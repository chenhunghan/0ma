import React, { useEffect, useRef, useMemo } from 'react';
import { InstanceStatus } from '../types/InstanceStatus';
import { terminalManager } from '../services/TerminalManager';

export interface SingleTerminalProps {
  id: string; // Unique ID for persistence
  instanceName: string;
  status: InstanceStatus;
  prompt: string;
  welcomeMessage?: string[];
  isLogs?: boolean;
}

// Consistent font settings matching Tailwind's font-mono stack
const TERM_CONFIG = {
    fontFamily: '"Fira Code", Menlo, Monaco, "Courier New", monospace',
    fontSize: 12,
    lineHeight: 1.2,
    theme: {
        background: '#000000',
        foreground: '#d4d4d8', // zinc-300
        cursor: '#10b981',     // emerald-500
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
    }
};

export const SingleTerminal: React.FC<SingleTerminalProps> = ({ 
    id,
    instanceName, 
    status, 
    prompt, 
    welcomeMessage,
    isLogs = false
}) => {
    const terminalContainerRef = useRef<HTMLDivElement>(null);
    
    // Stable welcome message to prevent unnecessary updates in useEffect
    const stableWelcomeMessage = useMemo(() => welcomeMessage, [JSON.stringify(welcomeMessage)]);

    useEffect(() => {
        if (!terminalContainerRef.current) return;

        // 1. Get or Create Persistent Terminal
        const termInstance = terminalManager.getOrCreate(id, {
            cursorBlink: !isLogs,
            fontSize: isLogs ? 11 : TERM_CONFIG.fontSize,
            fontFamily: TERM_CONFIG.fontFamily,
            lineHeight: isLogs ? 1.15 : TERM_CONFIG.lineHeight,
            theme: TERM_CONFIG.theme,
            allowProposedApi: true,
            cursorStyle: 'block',
            disableStdin: isLogs,
        });

        const { term, fitAddon } = termInstance;

        // 2. Attach to DOM
        // xterm.open() will append the canvas to the container.
        // If it was already opened elsewhere, it moves it here.
        term.open(terminalContainerRef.current);

        // Safe Fit Function
        const safeFit = () => {
            if (!terminalContainerRef.current) return;
            if (terminalContainerRef.current.clientWidth === 0 || 
                terminalContainerRef.current.clientHeight === 0 ||
                !terminalContainerRef.current.offsetParent) {
                return;
            }

            try {
                // @ts-ignore
                const core = term._core;
                // @ts-ignore
                if (!core || !core._renderService || !core._renderService.dimensions) {
                    return;
                }
                fitAddon.fit();
            } catch (e) {
                // Ignore specific dimension errors that occur during layout transitions
                console.debug("Terminal fit skipped:", e);
            }
        };

        // Initial Fit
        requestAnimationFrame(() => {
             safeFit();
             // Focus if not logs (interactive)
             if (!isLogs) term.focus();
        });

        // 3. Initialize Simulation Logic (Only Once)
        if (!termInstance.initialized && status === InstanceStatus.Running) {
             termInstance.initialized = true;

             if (stableWelcomeMessage) {
                 stableWelcomeMessage.forEach(line => {
                    try { term.writeln(line); } catch(e) {}
                 });
             }
             
             if (isLogs) {
                // Simulate Log Streaming
                const logLines = [
                    `[${new Date().toISOString()}] INFO: Starting application v1.2.0...`,
                    `[${new Date().toISOString()}] DEBUG: Loading configuration from /etc/config/app.yaml`,
                    `[${new Date().toISOString()}] INFO: Connecting to database at 10.42.0.12:5432`,
                    `[${new Date().toISOString()}] INFO: Database connection established successfully`,
                ];
                
                logLines.forEach(l => {
                    try { term.writeln(l); } catch(e) {}
                });

                // Store interval in manager so it survives unmounts
                termInstance.intervalId = setInterval(() => {
                     const now = new Date().toISOString();
                     const ms = Math.floor(Math.random() * 200);
                     const methods = ['GET', 'POST', 'PUT'];
                     const method = methods[Math.floor(Math.random() * methods.length)];
                     const paths = ['/api/v1/users', '/api/v1/data', '/healthz', '/metrics'];
                     const path = paths[Math.floor(Math.random() * paths.length)];
                     const statusCodes = [200, 201, 200, 200, 404, 500]; 
                     const statusCode = statusCodes[Math.floor(Math.random() * statusCodes.length)];
                     
                     try {
                        term.writeln(`[${now}] INFO: Incoming request ${method} ${path} - ${statusCode} (${ms}ms)`);
                        // Optional: Auto scroll
                        term.scrollToBottom();
                     } catch (e) {
                        // Silent catch
                     }
                }, 2000);
             } else {
                 // Interactive Shell Simulation
                 setTimeout(() => {
                     try {
                        // Don't clear if we re-attached and it has content, but here we are in the !initialized block
                        if (stableWelcomeMessage && stableWelcomeMessage.length > 0) term.clear();
                        term.write(prompt);
                     } catch(e) {}
                 }, 300);
             }
        }

        // 4. Setup Event Listeners (Re-attach every mount)
        // xterm.onData adds a listener that returns a disposable.
        // We need to dispose this specific listener on unmount to prevent duplicates.
        const dataDisposable = term.onData(data => {
            if (status !== InstanceStatus.Running || isLogs) return;
            try {
                const code = data.charCodeAt(0);
                if (code === 13) {
                    term.write('\r\n' + prompt);
                } else if (code === 127) {
                    term.write('\b \b');
                } else {
                    term.write(data);
                }
            } catch (e) {
                // Ignore errors
            }
        });
        
        const resizeObserver = new ResizeObserver(() => {
             requestAnimationFrame(safeFit);
        });
        
        if (terminalContainerRef.current) {
            resizeObserver.observe(terminalContainerRef.current);
        }

        return () => {
            // Cleanup on Unmount
            resizeObserver.disconnect();
            dataDisposable.dispose();
            
            // IMPORTANT: We do NOT dispose the terminal itself here.
            // We just let it detach from the DOM naturally.
        };
    }, [id, instanceName, status, prompt, isLogs, stableWelcomeMessage]); 

    return <div className="h-full w-full pl-1 pt-1 overflow-hidden" ref={terminalContainerRef} />;
};
