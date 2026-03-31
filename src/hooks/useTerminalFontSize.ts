import { useTauriStoreValue } from "src/providers/tauri-store-provider";

const TERMINAL_FONT_SIZE_KEY = "terminal-font-size";
const DEFAULT_TERMINAL_FONT_SIZE = 14;

export function useTerminalFontSize(): number {
  const { data } = useTauriStoreValue<number>(TERMINAL_FONT_SIZE_KEY);
  return data ?? DEFAULT_TERMINAL_FONT_SIZE;
}
