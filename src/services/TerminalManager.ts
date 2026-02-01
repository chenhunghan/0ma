import { Terminal, ITerminalOptions } from "@xterm/xterm";

export interface TerminalInstance {
  term: Terminal;
  initialized: boolean;
  intervalId?: ReturnType<typeof setInterval>;
  cleanup?: () => void;
}

class TerminalManager {
  private instances = new Map<string, TerminalInstance>();

  getOrCreate(id: string, options: ITerminalOptions): TerminalInstance {
    if (!this.instances.has(id)) {
      const term = new Terminal(options);
      this.instances.set(id, { term, initialized: false });
    }
    return this.instances.get(id)!;
  }

  getInstance(id: string): TerminalInstance | undefined {
    return this.instances.get(id);
  }

  dispose(id: string) {
    const inst = this.instances.get(id);
    if (inst) {
      if (inst.intervalId) clearInterval(inst.intervalId);
      if (inst.cleanup) inst.cleanup();
      inst.term.dispose();
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
