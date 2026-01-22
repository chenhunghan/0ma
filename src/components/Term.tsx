import { useRef } from 'react';
import '@xterm/xterm/css/xterm.css';
import { useXterm, useTerminalSession } from '../hooks/terminal';

export function Term() {
    const containerRef = useRef<HTMLDivElement>(null);
    const { terminal } = useXterm(containerRef, {
        hideCursor: true,
    });

    // Hook up useTerminalSession to ensure it has I/O capabilities if a session is attached.
    useTerminalSession(terminal);

    return <div ref={containerRef} className="h-full w-full" />;
}