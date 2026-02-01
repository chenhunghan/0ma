import { useEffect, useState, RefObject } from "react";
import { Terminal, ITerminalOptions } from "@xterm/xterm";
import { TERM_CONFIG } from "./config";

/**
 * Hook for creating xterm instance.
 * FitAddon removed - resize handled by useTerminalResize.
 */
export function useXterm(
  containerRef: RefObject<HTMLDivElement | null>,
  options: ITerminalOptions = TERM_CONFIG,
) {
  const [terminal, setTerminal] = useState<Terminal | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    const term = new Terminal(options);
    term.open(containerRef.current);

    // eslint-disable-next-line react-hooks/set-state-in-effect
    setTerminal(term);

    return () => {
      term.dispose();
      setTerminal(null);
    };
  }, [containerRef, options]);

  return { terminal };
}
