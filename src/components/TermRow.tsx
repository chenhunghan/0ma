import { Fragment } from "react";
import { useIsMobile } from "src/hooks/useMediaQuery";
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from "src/components/ui/resizable";
import type { Terminal } from 'src/services/Terminal';
import { TerminalComponent } from "./TerminalComponent";
import { useTerminalResizeContext } from "src/contexts/useTerminalResizeContext";

interface Props {
  tabId: string;
  terminals: Terminal[];
  onSessionCreated: (tabId: string, termId: number, sessionId: string) => void;
  onCwdChanged: (tabId: string, termId: number, cwd: string) => void;
}

export function TerminalRow({ tabId, terminals, onSessionCreated, onCwdChanged }: Props) {
  const isMobile = useIsMobile();
  const { onDragStart, onDragEnd } = useTerminalResizeContext();

  return (
    <ResizablePanelGroup direction={isMobile ? "vertical" : "horizontal"}>
      {terminals.map((term, index) => (
        <Fragment key={term.id}>
          <ResizablePanel defaultSize={100 / terminals.length} minSize={10}>
            <div className="h-full w-full min-h-0 min-w-0 relative group">
              <div className="h-full w-full min-h-0 min-w-0 overflow-hidden">
                <TerminalComponent
                  initialCommand="zsh"
                  initialArgs={[]}
                  cwd={term.cwd ?? "~"}
                  sessionId={term.sessionId}
                  onSessionCreated={(sid) => onSessionCreated(tabId, term.id, sid)}
                  onCwdChanged={(cwd) => onCwdChanged(tabId, term.id, cwd)}
                />
              </div>
            </div>
          </ResizablePanel>
          {index < terminals.length - 1 && (
            <ResizableHandle
              withHandle={!isMobile}
              onDragging={(isDragging) => {
                if (isDragging) {
                  onDragStart();
                } else {
                  onDragEnd();
                }
              }}
            />
          )}
        </Fragment>
      ))}
    </ResizablePanelGroup>
  );
}
