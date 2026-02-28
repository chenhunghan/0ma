export interface Terminal {
  id: number;
  name: string;
  sessionId?: string;
  cwd?: string;
  title?: string;
  /** Override the default command for this terminal */
  command?: string;
  /** Override the default args for this terminal */
  args?: string[];
}
