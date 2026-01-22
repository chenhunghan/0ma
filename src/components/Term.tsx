import { useRef } from 'react';
import '@xterm/xterm/css/xterm.css';
import { useXterm, useTerminal } from '../hooks/terminal';

export function Term() {
    const containerRef = useRef<HTMLDivElement>(null);
    const { terminalRef } = useXterm(containerRef, {
        hideCursor: true,
    });

    // Hook up useTerminal to ensure it has I/O capabilities if a session is attached.
    useTerminal(terminalRef);

    return <div ref={containerRef} className="h-full w-full" />;
}