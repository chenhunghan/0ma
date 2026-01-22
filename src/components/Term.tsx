import { useRef } from 'react';
import '@xterm/xterm/css/xterm.css';
import { useXterm } from '../hooks/useXterm';

export function Term() {
    const containerRef = useRef<HTMLDivElement>(null);
    useXterm(containerRef, {
        hideCursor: true,
    });

    return <div ref={containerRef} className="h-full w-full" />;
}