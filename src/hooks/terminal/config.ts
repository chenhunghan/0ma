/**
 * Terminal configuration for FrankenTermWeb.
 */

/** Default cell dimensions (px). FrankenTerm derives these from its built-in font. */
export const CELL_WIDTH = 9;
export const CELL_HEIGHT = 18;

/** Font family used by the terminal renderer. */
export const TERMINAL_FONT_FAMILY = "FiraCode Nerd Font";

/** Options passed to FrankenTermWeb.init() */
export const FRANKENTERM_INIT_OPTIONS = {
  cellWidth: CELL_WIDTH,
  cellHeight: CELL_HEIGHT,
  rendererBackend: "auto",
  bracketedPaste: true,
  focusEvents: true,
  cursor: "block",
  fontFamily: TERMINAL_FONT_FAMILY,
} as const;

// Re-export for backwards compat
export const TERM_CONFIG = {
  fontFamily: '"FiraCode Nerd Font", monospace',
  fontSize: 12,
  lineHeight: 1.15,
  theme: {
    background: "#000000",
    foreground: "#d4d4d8",
  },
};

export const TERMINAL_METRICS = {
  fontFamily: TERM_CONFIG.fontFamily,
  fontSize: TERM_CONFIG.fontSize,
  lineHeight: TERM_CONFIG.lineHeight,
  scrollbarWidth: 10,
  minimumCols: 2,
  minimumRows: 1,
} as const;
