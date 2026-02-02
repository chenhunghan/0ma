export type SessionType = "node-shell" | "pod-shell" | "lima-shell" | "pod-logs";

export interface TerminalSession {
  id: string;
  type: "node-shell" | "pod-shell" | "lima-shell";
  target: string;
}

export interface LogSession {
  id: string;
  type: "pod-logs";
  target: string; // Used as display title part
  instanceName: string;
  pod: string;
  namespace: string;
}

export type Session = TerminalSession | LogSession;
