export type SessionType = 'node-shell' | 'pod-shell' | 'pod-logs';

export interface TerminalSession {
    id: string;
    type: SessionType;
    target: string;
}