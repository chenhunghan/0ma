import { Terminal, ITerminalOptions } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';

export interface TerminalInstance {
    term: Terminal;
    fitAddon: FitAddon;
    initialized: boolean;
    intervalId?: ReturnType<typeof setInterval>;
}

class TerminalManager {
    private instances = new Map<string, TerminalInstance>();

    getOrCreate(id: string, options: ITerminalOptions): TerminalInstance {
        if (!this.instances.has(id)) {
            const term = new Terminal(options);
            const fitAddon = new FitAddon();
            term.loadAddon(fitAddon);
            this.instances.set(id, { term, fitAddon, initialized: false });
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