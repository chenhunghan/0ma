import type { ITerminalOptions } from "@xterm/xterm";

export const TERM_CONFIG: ITerminalOptions = {
  allowProposedApi: true,
  cursorBlink: false,
  cursorStyle: "bar" as const,
  fontFamily: '"FiraCode Nerd Font", monospace',
  fontSize: 12,
  lineHeight: 1.15,
  scrollOnUserInput: true,
  theme: {
    background: "#000000",
    foreground: "#d4d4d8", // zinc-300
    cursor: "transparent",
    selectionBackground: "#27272a", // zinc-800
    black: "#000000",
    red: "#ef4444",
    green: "#10b981",
    yellow: "#f59e0b",
    blue: "#3b82f6",
    magenta: "#d946ef",
    cyan: "#06b6d4",
    white: "#e4e4e7",
    brightBlack: "#71717a",
    brightRed: "#f87171",
    brightGreen: "#34d399",
    brightYellow: "#fbbf24",
    brightBlue: "#60a5fa",
    brightMagenta: "#e879f9",
    brightCyan: "#22d3ee",
    brightWhite: "#ffffff",
  },
};

// NEW: Metrics for dimension calculation
export const TERMINAL_METRICS = {
  // Reference TERM_CONFIG to stay in sync
  fontFamily: TERM_CONFIG.fontFamily!,
  fontSize: TERM_CONFIG.fontSize!,
  lineHeight: TERM_CONFIG.lineHeight!,

  // Layout constants (scrollbar width matches CSS in index.css)
  scrollbarWidth: 10,
  minimumCols: 2,
  minimumRows: 1,
} as const;
