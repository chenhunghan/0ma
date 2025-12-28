import React from 'react';
import { LogSession } from '../types/LogSession';
import { X, FileText } from 'lucide-react';
import { terminalManager } from '../services/TerminalManager';
import { SingleLogViewer } from './SingleLogViewer';

interface LogViewProps {
    sessions: LogSession[];
    activeSessionId?: string;
    onSetActiveSession: (id: string | undefined) => void;
    onCloseSession: (id: string) => void;
}

export const LogView: React.FC<LogViewProps> = ({
    sessions,
    activeSessionId,
    onSetActiveSession,
    onCloseSession,
}) => {
    const handleClose = (e: React.MouseEvent, sessionId: string) => {
        e.stopPropagation();
        terminalManager.dispose(sessionId);
        onCloseSession(sessionId);
        // If closing active session, user should handle switching active logic or we could do it here
    };

    if (sessions.length === 0) {
        return (
            <div className="h-full flex items-center justify-center text-zinc-500 text-sm">
                No active log sessions. Click "Logs" on a pod to start streaming.
            </div>
        );
    }

    return (
        <div className="h-full w-full bg-black flex flex-col overflow-hidden font-mono">
            {/* Tab Bar for Logs */}
            <div className="flex items-center bg-zinc-900 border-b border-zinc-800 h-9 shrink-0 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                {sessions.map((session) => (
                    <button
                        key={session.id}
                        onClick={() => onSetActiveSession(session.id)}
                        className={`group flex items-center gap-2 px-4 h-full border-r border-zinc-800 transition-all min-w-[150px] max-w-[300px] relative ${activeSessionId === session.id
                            ? 'bg-black text-white'
                            : 'text-zinc-500 hover:bg-zinc-800/50 hover:text-zinc-300'
                            }`}
                        title={session.title}
                    >
                        <FileText className="w-3.5 h-3.5" />
                        <span className="text-[11px] font-bold uppercase tracking-wider truncate">{session.title}</span>
                        <div
                            onClick={(e) => handleClose(e, session.id)}
                            className="ml-2 p-0.5 rounded hover:bg-zinc-700 text-zinc-600 hover:text-white transition-colors"
                        >
                            <X className="w-3 h-3" />
                        </div>
                        {activeSessionId === session.id && (
                            <div className="absolute top-0 left-0 right-0 h-0.5 bg-blue-500" />
                        )}
                    </button>
                ))}
            </div>

            {/* Log Viewers Container */}
            <div className="flex-1 relative bg-black">
                {sessions.map((session) => (
                    <div
                        key={session.id}
                        className={`absolute inset-0 ${activeSessionId === session.id ? 'opacity-100 z-10' : 'opacity-0 z-0 pointer-events-none'}`}
                    >
                        <SingleLogViewer session={session} />
                    </div>
                ))}
            </div>
        </div>
    );
};
