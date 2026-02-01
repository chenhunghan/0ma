import { createContext } from "react";

export interface TerminalResizeContextValue {
  isDragging: boolean;
  onDragStart: () => void;
  onDragEnd: () => void;
  subscribeDragEnd: (callback: () => void) => () => void;
}

export const TerminalResizeContext = createContext<TerminalResizeContextValue | null>(null);
