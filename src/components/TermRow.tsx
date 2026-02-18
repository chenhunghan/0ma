import { Fragment, useCallback } from "react";
import { useIsMobile } from "src/hooks/useMediaQuery";
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from "src/components/ui/resizable";
import type { Terminal } from "src/services/Terminal";
import { TerminalComponent } from "./TerminalComponent";
import { useTerminalResizeContext } from "src/contexts/useTerminalResizeContext";

const EMPTY_ARGS: string[] = [];

interface Props {
  tabId: string;
  terminals: Terminal[];
  onSessionCreated: (tabId: string, termId: number, sessionId: string) => void;
  onCwdChanged: (tabId: string, termId: number, cwd: string) => void;
  isUpperRow?: boolean;
}

export function TerminalRow({ tabId, terminals, onSessionCreated, onCwdChanged, isUpperRow }: Props) {
  const isMobile = useIsMobile();
  const { onDragStart, onDragEnd } = useTerminalResizeContext();
  const handleDragging = useCallback(
    (isDragging: boolean) => {
      if (isDragging) {
        onDragStart();
      } else {
        onDragEnd();
      }
    },
    [onDragEnd, onDragStart],
  );

  return (
    <ResizablePanelGroup direction={isMobile ? "vertical" : "horizontal"}>
      {terminals.map((term, index) => (
        <Fragment key={term.id}>
          <ResizablePanel defaultSize={100 / terminals.length} minSize={10}>
            <div className="h-full w-full min-h-0 min-w-0 relative group">
              <div className="h-full w-full min-h-0 min-w-0 overflow-hidden">
                <TerminalPanel
                  tabId={tabId}
                  term={term}
                  onSessionCreated={onSessionCreated}
                  onCwdChanged={onCwdChanged}
                  isUpperRow={isUpperRow}
                />
              </div>
            </div>
          </ResizablePanel>
          {index < terminals.length - 1 && (
            <ResizableHandle withHandle={!isMobile} onDragging={handleDragging} />
          )}
        </Fragment>
      ))}
    </ResizablePanelGroup>
  );
}

function TerminalPanel({
  tabId,
  term,
  onSessionCreated,
  onCwdChanged,
  isUpperRow,
}: {
  tabId: string;
  term: Terminal;
  onSessionCreated: (tabId: string, termId: number, sessionId: string) => void;
  onCwdChanged: (tabId: string, termId: number, cwd: string) => void;
  isUpperRow?: boolean;
}) {
  const handleSessionCreated = useCallback(
    (sessionId: string) => {
      onSessionCreated(tabId, term.id, sessionId);
    },
    [onSessionCreated, tabId, term.id],
  );

  const handleCwdChanged = useCallback(
    (cwd: string) => {
      onCwdChanged(tabId, term.id, cwd);
    },
    [onCwdChanged, tabId, term.id],
  );

  return (
    <TerminalComponent
      initialCommand="zsh"
      initialArgs={EMPTY_ARGS}
      cwd={term.cwd ?? "~"}
      sessionId={term.sessionId}
      onSessionCreated={handleSessionCreated}
      onCwdChanged={handleCwdChanged}
      isUpperRow={isUpperRow}
    />
  );
}
