import { useCallback, useState, ReactNode } from "react";
import { TerminalResizeContext } from "./terminalResizeContextDef";

export function TerminalResizeProvider({ children }: { children: ReactNode }) {
  const [isDragging, setIsDragging] = useState(false);
  const [subscribers] = useState(() => new Set<() => void>());

  const onDragStart = useCallback(() => {
    setIsDragging(true);
  }, []);

  const onDragEnd = useCallback(() => {
    setIsDragging(false);
    // Notify all terminals to flush resize
    subscribers.forEach((cb) => cb());
  }, [subscribers]);

  const subscribeDragEnd = useCallback(
    (callback: () => void) => {
      subscribers.add(callback);
      return () => subscribers.delete(callback);
    },
    [subscribers],
  );

  return (
    <TerminalResizeContext.Provider
      value={{
        isDragging,
        onDragStart,
        onDragEnd,
        subscribeDragEnd,
      }}
    >
      {children}
    </TerminalResizeContext.Provider>
  );
}
