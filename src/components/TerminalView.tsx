import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { TerminalSession } from '../types/TerminalSession';
import { X, GripVertical } from 'lucide-react';
import { terminalManager } from '../services/TerminalManager';
import { SingleTerminal } from './SingleTerminal';
import { InstanceStatus } from '../types/InstanceStatus';

interface TerminalViewProps {
    instanceId: string;
    instanceName: string;
    status: InstanceStatus;
    mode: 'lima' | 'k8s';
    sessions: TerminalSession[];
    onCloseSession: (id: string) => void;
}

const TerminalView: React.FC<TerminalViewProps> = ({ instanceId, instanceName, status, mode, sessions, onCloseSession }) => {
    // --- MAIN SPLIT (Left vs Right) ---
    const [mainSplitRatio, setMainSplitRatio] = useState(50);
    const mainContainerRef = useRef<HTMLDivElement>(null);
    const isDraggingMain = useRef(false);

    // --- SECONDARY SPLIT (Multiple Sessions on Right) ---
    const secondaryContainerRef = useRef<HTMLDivElement>(null);
    const [sessionSizes, setSessionSizes] = useState<number[]>([]);
    const dragSecondaryInfo = useRef<{
        index: number;
        startX: number;
        startSizes: number[];
        containerWidth: number;
    } | null>(null);

    // Props for Main Terminal
    const mainPrompt = mode === 'lima'
        ? `\x1b[32m${instanceName}\x1b[0m:\x1b[34m~\x1b[0m$ `
        : `\x1b[34m${instanceName}-k8s\x1b[0m:\x1b[32m/namespaces/default\x1b[0m$ `;

    // Stable ID for Main Terminal
    const mainTerminalId = `${instanceId}-${mode}-main`;

    // Memoize welcome message
    const mainWelcome = useMemo(() => mode === 'lima'
        ? [`\x1b[32m[LIMA]\x1b[0m Connecting to ${instanceName}...`]
        : [`\x1b[34m[K8S]\x1b[0m Initializing kubectl context...`], [mode, instanceName]);

    const hasSessions = sessions.length > 0;

    // --- MAIN SPLIT HANDLERS ---
    const handleMainMouseDown = (e: React.MouseEvent) => {
        e.preventDefault();
        isDraggingMain.current = true;
        document.body.style.cursor = 'col-resize';
        document.addEventListener('mousemove', handleMainMouseMove);
        document.addEventListener('mouseup', handleMainMouseUp);
    };

    const handleMainMouseMove = useCallback((e: MouseEvent) => {
        if (!isDraggingMain.current || !mainContainerRef.current) return;
        const rect = mainContainerRef.current.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const percentage = (x / rect.width) * 100;
        setMainSplitRatio(Math.min(Math.max(percentage, 20), 80));
    }, []);

    const handleMainMouseUp = useCallback(() => {
        isDraggingMain.current = false;
        document.body.style.cursor = 'default';
        document.removeEventListener('mousemove', handleMainMouseMove);
        document.removeEventListener('mouseup', handleMainMouseUp);
    }, [handleMainMouseMove]);

    // --- SECONDARY SPLIT LOGIC ---
    useEffect(() => {
        if (sessions.length === 0) {
            setSessionSizes([]);
        } else {
            setSessionSizes(new Array(sessions.length).fill(100 / sessions.length));
        }
    }, [sessions.length]);

    const handleSecondaryMouseDown = (index: number, e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        if (!secondaryContainerRef.current) return;

        dragSecondaryInfo.current = {
            index,
            startX: e.clientX,
            startSizes: [...sessionSizes],
            containerWidth: secondaryContainerRef.current.getBoundingClientRect().width
        };

        document.body.style.cursor = 'col-resize';
        document.addEventListener('mousemove', handleSecondaryMouseMove);
        document.addEventListener('mouseup', handleSecondaryMouseUp);
    };

    const handleSecondaryMouseMove = useCallback((e: MouseEvent) => {
        if (!dragSecondaryInfo.current) return;
        const { index, startX, startSizes, containerWidth } = dragSecondaryInfo.current;

        const deltaX = e.clientX - startX;
        const deltaPercent = (deltaX / containerWidth) * 100;

        const newSizes = [...startSizes];
        const left = newSizes[index];
        const right = newSizes[index + 1];

        if (left === undefined || right === undefined) return;

        let newLeft = left + deltaPercent;
        let newRight = right - deltaPercent;

        const MIN_WIDTH = 5;
        if (newLeft < MIN_WIDTH) {
            const diff = MIN_WIDTH - newLeft;
            newLeft = MIN_WIDTH;
            newRight -= diff;
        } else if (newRight < MIN_WIDTH) {
            const diff = MIN_WIDTH - newRight;
            newRight = MIN_WIDTH;
            newLeft -= diff;
        }

        newSizes[index] = newLeft;
        newSizes[index + 1] = newRight;
        setSessionSizes(newSizes);
    }, []);

    const handleSecondaryMouseUp = useCallback(() => {
        dragSecondaryInfo.current = null;
        document.body.style.cursor = 'default';
        document.removeEventListener('mousemove', handleSecondaryMouseMove);
        document.removeEventListener('mouseup', handleSecondaryMouseUp);
    }, [handleSecondaryMouseMove]);

    const renderSizes = (sessionSizes.length === sessions.length)
        ? sessionSizes
        : new Array(sessions.length).fill(100 / sessions.length);

    const getSessionProps = (session: TerminalSession) => {
        if (session.type === 'node-shell') {
            return {
                prompt: `\x1b[31mroot@${session.target}\x1b[0m:\x1b[34m/var/lib/rancher/k3s\x1b[0m# `,
                welcome: [`Connecting to ${session.target}...`, `Authentication successful.`],
                title: session.target.toUpperCase(),
                isLogs: false
            };
        } else if (session.type === 'pod-shell') {
            return {
                prompt: `\x1b[31mroot@${session.target}\x1b[0m:\x1b[34m/app\x1b[0m# `,
                welcome: [`Exec into ${session.target}...`, `Connected.`],
                title: `SHELL: ${session.target}`,
                isLogs: false
            };
        } else { // pod-logs
            return {
                prompt: '',
                welcome: [`Fetching logs for ${session.target}...`],
                title: `LOGS: ${session.target}`,
                isLogs: true
            };
        }
    };

    // Wrapper to cleanup terminal manager on close
    const handleClose = (sessionId: string) => {
        const fullId = `${instanceId}-${sessionId}`;
        terminalManager.dispose(fullId);
        onCloseSession(sessionId);
    };

    return (
        <div className="h-full w-full bg-black flex overflow-hidden" ref={mainContainerRef}>
            <div
                className="h-full relative transition-[width] duration-0 ease-linear overflow-hidden"
                style={{ width: hasSessions ? `${mainSplitRatio}%` : '100%' }}
            >
                <SingleTerminal
                    id={mainTerminalId}
                    key={mainTerminalId}
                    instanceName={instanceName}
                    status={status}
                    prompt={mainPrompt}
                    welcomeMessage={mainWelcome}
                />
                {hasSessions && <div className="absolute top-0 right-0 bg-zinc-900 text-[10px] px-2 py-0.5 text-zinc-500 font-mono z-10 border-b border-l border-zinc-800">KUBECTL</div>}
            </div>

            {hasSessions && (
                <>
                    <div
                        className="w-1 h-full bg-zinc-900 hover:bg-blue-600 cursor-col-resize z-20 flex items-center justify-center transition-colors shrink-0 border-x border-zinc-800"
                        onMouseDown={handleMainMouseDown}
                    >
                        <GripVertical className="w-2 h-4 text-zinc-600" />
                    </div>

                    <div
                        className="h-full relative min-w-0 flex flex-row bg-black"
                        style={{ width: `calc(${100 - mainSplitRatio}% - 4px)` }}
                        ref={secondaryContainerRef}
                    >
                        {sessions.map((session, index) => {
                            const { prompt, welcome, title, isLogs } = getSessionProps(session);
                            const widthPercent = renderSizes[index];
                            const sessionId = `${instanceId}-${session.id}`;

                            return (
                                <React.Fragment key={session.id}>
                                    {index > 0 && (
                                        <div
                                            className="w-1 h-full bg-zinc-900 hover:bg-blue-600 cursor-col-resize z-20 flex items-center justify-center transition-colors shrink-0 border-x border-zinc-800"
                                            onMouseDown={(e) => handleSecondaryMouseDown(index - 1, e)}
                                        >
                                            <GripVertical className="w-2 h-4 text-zinc-600" />
                                        </div>
                                    )}
                                    <div className="relative min-w-0 h-full overflow-hidden" style={{ width: `${widthPercent}%` }}>
                                        <SingleTerminal
                                            id={sessionId}
                                            key={sessionId}
                                            instanceName={instanceName}
                                            status={status}
                                            prompt={prompt}
                                            welcomeMessage={welcome}
                                            isLogs={isLogs}
                                        />
                                        <div className="absolute top-0 right-0 flex items-center bg-zinc-900 border-b border-l border-zinc-800 z-10 max-w-full">
                                            <span className="text-[10px] px-2 py-0.5 text-zinc-500 font-mono border-r border-zinc-800 truncate max-w-[150px]" title={title}>{title}</span>
                                            <button
                                                onClick={() => handleClose(session.id)}
                                                className="p-0.5 hover:bg-red-900/50 hover:text-red-500 text-zinc-500 transition-colors shrink-0"
                                                title="Close"
                                            >
                                                <X className="w-3 h-3" />
                                            </button>
                                        </div>
                                    </div>
                                </React.Fragment>
                            );
                        })}
                    </div>
                </>
            )}
        </div>
    );
};

export default TerminalView;
