export type SessionType = 'node-shell' | 'pod-shell' | 'pod-logs' | 'lima-shell';

export interface TerminalSession {
    id: string;
    type: SessionType;
    target: string;
}