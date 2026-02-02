export interface LogSession {
  id: string; // Unique ID for persistence
  instanceName: string;
  pod: string;
  namespace: string;
  title: string;
}
