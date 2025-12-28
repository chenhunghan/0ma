import React, { useMemo, useCallback } from 'react';
import { Session, SessionType } from '../types/TerminalSession';
import { X, Terminal as TerminalIcon, Cpu, Plus, FileText } from 'lucide-react';
import { terminalManager } from '../services/TerminalManager';
import { SingleTerminal } from './SingleTerminal';
import { SingleLogViewer } from './SingleLogViewer';
import { InstanceStatus } from '../types/InstanceStatus';

interface TerminalViewProps {
    instanceId: string;
    instanceName: string;
    status: InstanceStatus;
    mode: 'lima' | 'k8s';
    sessions: Session[];
    activeSessionId?: string;
    onSetActiveSession: (id: string | undefined) => void;
    onAddSession: () => void;
    onCloseSession: (id: string) => void;
}

const TerminalView: React.FC<TerminalViewProps> = ({
    instanceId,
    instanceName,
    status,
    mode,
    sessions,
    activeSessionId,
    onSetActiveSession,
    onAddSession,
    onCloseSession
}) => {
    // Stable ID for Main Terminal
    const mainTerminalId = `${instanceId}-${mode}-main`;

    const getSessionProps = useCallback((session: Session) => {
        if (session.type === 'node-shell') {
            return {
                title: session.target.toUpperCase(),
                icon: <Cpu className="w-3.5 h-3.5" />
            };
        } else if (session.type === 'pod-shell') {
            return {
                title: `SHELL: ${session.target}`,
                icon: <TerminalIcon className="w-3.5 h-3.5" />
            };
        } else if (session.type === 'pod-logs') {
            return {
                title: `LOGS: ${session.target}`,
                icon: <FileText className="w-3.5 h-3.5" />
            };
        } else { // lima-shell
            return {
                title: `SHELL: ${sessions.indexOf(session) + 1}`,
                icon: <TerminalIcon className="w-3.5 h-3.5" />
            };
        }
    }, [sessions]);

    const handleClose = (e: React.MouseEvent, sessionId: string) => {
        e.stopPropagation();
        const fullId = `${instanceId}-${sessionId}`;
        terminalManager.dispose(fullId);
        onCloseSession(sessionId);
    };

    const allSessions = useMemo(() => {
        const list: Array<Session & { title: string; icon: React.ReactNode; isMain?: boolean }> = sessions.map(s => ({ ...s, ...getSessionProps(s) }));
        // Add Main terminal at the start
        return [
            { id: 'main', type: 'lima-shell' as SessionType, target: 'main', title: 'SHELL', icon: <TerminalIcon className="w-3.5 h-3.5" />, isMain: true },
            ...list
        ];
    }, [sessions, mode, getSessionProps]);

    const activeId = activeSessionId || 'main';

    return (
        <div className="h-full w-full bg-black flex flex-col overflow-hidden font-mono">
            {/* Tab Bar */}
            <div className="flex items-center bg-zinc-900 border-b border-zinc-800 h-9 shrink-0 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                {allSessions.map((session) => (
                    <button
                        key={session.id}
                        onClick={() => onSetActiveSession(session.id === 'main' ? undefined : session.id)}
                        className={`group flex items-center gap-2 px-4 h-full border-r border-zinc-800 transition-all min-w-[120px] max-w-[240px] relative ${activeId === session.id
                            ? 'bg-black text-white'
                            : 'text-zinc-500 hover:bg-zinc-800/50 hover:text-zinc-300'
                            }`}
                    >
                        {session.icon}
                        <span className="text-[11px] font-bold uppercase tracking-wider truncate">{session.title}</span>
                        {!session.isMain && (
                            <div
                                onClick={(e) => handleClose(e, session.id)}
                                className="ml-2 p-0.5 rounded hover:bg-zinc-700 text-zinc-600 hover:text-white transition-colors"
                            >
                                <X className="w-3 h-3" />
                            </div>
                        )}
                        {activeId === session.id && (
                            <div className="absolute top-0 left-0 right-0 h-0.5 bg-indigo-500" />
                        )}
                    </button>
                ))}

                {mode === 'lima' && (
                    <button
                        onClick={onAddSession}
                        className="flex items-center justify-center px-3 h-full text-zinc-500 hover:text-indigo-400 hover:bg-zinc-800/50 transition-all border-r border-zinc-800"
                        title="Open New Shell"
                    >
                        <Plus className="w-4 h-4" />
                    </button>
                )}
            </div>

            {/* Terminal Container */}
            <div className="flex-1 relative bg-black">
                {allSessions.map((session) => (
                    <div
                        key={session.id}
                        className={`absolute inset-0 ${activeId === session.id ? 'opacity-100 z-10' : 'opacity-0 z-0 pointer-events-none'}`}
                    >
                        {session.type === 'pod-logs' ? (
                            // Render Log Viewer
                            <SingleLogViewer session={session as any} />
                        ) : (
                            // Render Shell Terminal
                            <SingleTerminal
                                id={session.id === 'main' ? mainTerminalId : `${instanceId}-${session.id}`}
                                instanceName={instanceName}
                                status={status}
                            />
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
};

export default TerminalView;
