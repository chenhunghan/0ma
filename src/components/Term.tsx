import { useRef } from 'react';
import '@xterm/xterm/css/xterm.css';
import { useXterm, useTerminal } from '../hooks/terminal';

export function Term() {
    const containerRef = useRef<HTMLDivElement>(null);
    const { terminal } = useXterm(containerRef, {
        hideCursor: true,
    });

    // Hook up useTerminal to ensure it has I/O capabilities if a session is attached.
    useTerminal(terminal);

    return <div ref={containerRef} className="h-full w-full" />;
}