import type { ReactNode } from "react";
import { useCallback, useMemo, useState } from "react";
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

  const contextValue = useMemo(
    () => ({
      isDragging,
      onDragEnd,
      onDragStart,
      subscribeDragEnd,
    }),
    [isDragging, onDragEnd, onDragStart, subscribeDragEnd],
  );

  return (
    <TerminalResizeContext.Provider value={contextValue}>{children}</TerminalResizeContext.Provider>
  );
}
