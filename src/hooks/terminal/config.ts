/**
 * Terminal configuration for @xterm/xterm.
 */
import type { ITerminalOptions } from "@xterm/xterm";

/** Font family used by the terminal renderer. */
export const TERMINAL_FONT_FAMILY = "FiraCode Nerd Font, monospace";

/** Options passed to new Terminal() */
export const XTERM_OPTIONS: ITerminalOptions = {
  fontFamily: TERMINAL_FONT_FAMILY,
  fontSize: 12,
  lineHeight: 1.15,
  cursorStyle: "block",
  cursorBlink: true,
  scrollback: 10000,
  theme: {
    background: "#000000",
    foreground: "#d4d4d8",
  },
};

export const TERMINAL_METRICS = {
  fontFamily: TERMINAL_FONT_FAMILY,
  fontSize: 12,
  lineHeight: 1.15,
  scrollbarWidth: 14,
  minimumCols: 2,
  minimumRows: 1,
} as const;
