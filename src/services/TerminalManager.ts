/**
 * Terminal instance manager — xterm.js removed.
 * Stub retained for the replacement terminal library.
 */

export interface TerminalInstance {
  initialized: boolean;
  intervalId?: ReturnType<typeof setInterval>;
  cleanup?: () => void;
}

class TerminalManager {
  private instances = new Map<string, TerminalInstance>();

  getOrCreate(id: string): TerminalInstance {
    if (!this.instances.has(id)) {
      this.instances.set(id, { initialized: false });
    }
    return this.instances.get(id)!;
  }

  getInstance(id: string): TerminalInstance | undefined {
    return this.instances.get(id);
  }

  dispose(id: string) {
    const inst = this.instances.get(id);
    if (inst) {
      if (inst.intervalId) {clearInterval(inst.intervalId);}
      if (inst.cleanup) {inst.cleanup();}
      this.instances.delete(id);
    }
  }

  /**
   * Disposes all terminals starting with the given prefix (e.g. instanceId).
   */
  disposeByPrefix(prefix: string) {
    for (const key of this.instances.keys()) {
      if (key.startsWith(prefix)) {
        this.dispose(key);
      }
    }
  }
}

export const terminalManager = new TerminalManager();
