import React, { Fragment, useCallback } from "react";
import { XIcon } from "lucide-react";
import { useIsMobile } from "src/hooks/useMediaQuery";
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from "src/components/ui/resizable";
import type { Terminal } from "src/services/Terminal";
import { TerminalComponent } from "./TerminalComponent";
import { useTerminalResizeContext } from "src/contexts/useTerminalResizeContext";

interface Props {
  tabId: string;
  terminals: Terminal[];
  initialCommand: string;
  initialArgs: string[];
  onSessionCreated: (tabId: string, termId: number, sessionId: string) => void;
  onCwdChanged: (tabId: string, termId: number, cwd: string) => void;
  onTitleChanged: (tabId: string, termId: number, title: string) => void;
  onRemoveTerminal: (tabId: string, termId: number) => void;
  isUpperRow?: boolean;
}

export const TerminalRow = React.memo(
  function TerminalRow({ tabId, terminals, initialCommand, initialArgs, onSessionCreated, onCwdChanged, onTitleChanged, onRemoveTerminal, isUpperRow }: Props) {
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
                <button
                  className="absolute top-1 right-1 z-10 rounded-sm opacity-0 group-hover:opacity-100
                             hover:bg-muted-foreground/20 p-0.5 transition-opacity"
                  onClick={() => onRemoveTerminal(tabId, term.id)}
                  title="Close Terminal"
                >
                  <XIcon className="size-3" />
                </button>
                <div className="h-full w-full min-h-0 min-w-0 overflow-hidden">
                  <TerminalPanel
                    tabId={tabId}
                    term={term}
                    initialCommand={initialCommand}
                    initialArgs={initialArgs}
                    onSessionCreated={onSessionCreated}
                    onCwdChanged={onCwdChanged}
                    onTitleChanged={onTitleChanged}
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
  },
  (prevProps, nextProps) => {
    return (
      prevProps.tabId === nextProps.tabId &&
      prevProps.initialCommand === nextProps.initialCommand &&
      prevProps.initialArgs === nextProps.initialArgs &&
      prevProps.isUpperRow === nextProps.isUpperRow &&
      prevProps.onRemoveTerminal === nextProps.onRemoveTerminal &&
      prevProps.terminals.length === nextProps.terminals.length &&
      prevProps.terminals.every(
        (term, i) => term.id === nextProps.terminals[i].id && term.title === nextProps.terminals[i].title,
      )
    );
  }
);

const TerminalPanel = React.memo(
  function TerminalPanel({
    tabId,
    term,
    initialCommand,
    initialArgs,
    onSessionCreated,
    onCwdChanged,
    onTitleChanged,
    isUpperRow,
  }: {
    tabId: string;
    term: Terminal;
    initialCommand: string;
    initialArgs: string[];
    onSessionCreated: (tabId: string, termId: number, sessionId: string) => void;
    onCwdChanged: (tabId: string, termId: number, cwd: string) => void;
    onTitleChanged: (tabId: string, termId: number, title: string) => void;
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

    const handleTitleChanged = useCallback(
      (title: string) => {
        onTitleChanged(tabId, term.id, title);
      },
      [onTitleChanged, tabId, term.id],
    );

    return (
      <TerminalComponent
        initialCommand={initialCommand}
        initialArgs={initialArgs}
        cwd={term.cwd ?? "~"}
        sessionId={term.sessionId}
        onSessionCreated={handleSessionCreated}
        onCwdChanged={handleCwdChanged}
        onTitleChanged={handleTitleChanged}
        isUpperRow={isUpperRow}
      />
    );
  },
  (prevProps, nextProps) => {
    return (
      prevProps.tabId === nextProps.tabId &&
      prevProps.term.id === nextProps.term.id &&
      prevProps.term.sessionId === nextProps.term.sessionId &&
      prevProps.term.cwd === nextProps.term.cwd &&
      prevProps.initialCommand === nextProps.initialCommand &&
      prevProps.initialArgs === nextProps.initialArgs &&
      prevProps.isUpperRow === nextProps.isUpperRow
    );
  }
);
