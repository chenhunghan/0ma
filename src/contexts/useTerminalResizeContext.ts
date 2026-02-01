import { useContext } from "react";
import { TerminalResizeContext } from "./terminalResizeContextDef";

export function useTerminalResizeContext() {
  const context = useContext(TerminalResizeContext);
  if (!context) {
    throw new Error("useTerminalResizeContext must be used within TerminalResizeProvider");
  }
  return context;
}
