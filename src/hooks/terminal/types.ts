export interface PtyEvent {
  data: string;
}

export interface SpawnOptions {
  command: string;
  args: string[];
  cwd: string;
}
