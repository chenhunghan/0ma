
import { invoke, Channel } from '@tauri-apps/api/core';
import { Terminal } from '@xterm/xterm';
import * as log from "@tauri-apps/plugin-log"

interface PtyEvent {
    data: string;
}

export class TerminalAdapter {
    sessionId: string | null = null;
    channel: Channel<PtyEvent> | null = null;
    terminal: Terminal;
    disposables: { dispose: () => void }[] = [];

    constructor(terminal: Terminal) {
        this.terminal = terminal;
        // Hook up input
        const onDataDisposer = this.terminal.onData((data) => {
            if (this.sessionId) {
                invoke('write_pty_cmd', {
                    sessionId: this.sessionId,
                    data
                }).catch(error => log.error("Failed to write_pty:", error));
            }
        });
        this.disposables.push(onDataDisposer);

        // xterm.js fitAddon.fit() fires onResize event -> tells shell process to resize
        const onResizeDisposer = this.terminal.onResize((size) => {
            if (this.sessionId) {
                invoke('resize_pty_cmd', {
                    sessionId: this.sessionId,
                    rows: size.rows,
                    cols: size.cols
                }).catch(error => log.error("Failed to resize_pty:", error));
            }
        });
        this.disposables.push(onResizeDisposer);
    }

    async spawn(command: string, args: string[], cwd: string) {
        // Initial size
        const rows = this.terminal.rows;
        const cols = this.terminal.cols;

        try {
            this.sessionId = await invoke<string>('spawn_pty_cmd', {
                command,
                args,
                cwd,
                rows,
                cols,
            });
            await this.connect(this.sessionId);
        } catch (e) {
            this.terminal.write(`\r\nError spawning shell: ${e}\r\n`);
        }
    }

    async connect(sessionId: string) {
        this.sessionId = sessionId;
        this.channel = new Channel<PtyEvent>();

        this.channel.onmessage = (message) => {
            this.terminal.write(message.data);
        };

        await invoke('attach_pty_cmd', {
            sessionId,
            channel: this.channel
        });
    }

    dispose() {
        this.disposables.forEach(d => d.dispose());
        this.disposables = [];
        // Note: we don't necessarily close the PTY session on backend 
        // because we might want it to persist. 
        // If we want to close it, calls `invoke('close_pty', ...)`
    }

    async close() {
        if (this.sessionId) {
            await invoke('close_pty_cmd', { sessionId: this.sessionId });
            this.sessionId = null;
        }
        this.dispose();
    }
}
