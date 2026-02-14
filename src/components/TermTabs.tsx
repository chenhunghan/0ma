import { useCallback, type MouseEvent, type ReactNode } from "react";
import { Tabs, TabsList, TabsTrigger } from "src/components/ui/tabs";
import { Separator } from "src/components/ui/separator";
import { Button } from "src/components/ui/button";
import { Columns2Icon, SquarePlusIcon, Terminal as TerminalIcon, XIcon } from "lucide-react";
import { useIsMobile } from "src/hooks/useMediaQuery";
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from "src/components/ui/resizable";
import type { Terminal } from "src/services/Terminal";
import { TerminalRow } from "./TermRow";
import { TerminalResizeProvider } from "src/contexts/TerminalResizeContext";
import { useTerminalResizeContext } from "src/contexts/useTerminalResizeContext";
const EMPTY_TERMINALS: Terminal[] = [];

export interface TabGroup {
  id: string;
  name: string;
  terminals: Terminal[];
}

interface Props {
  tabs: TabGroup[];
  activeTabId: string;
  onTabChange: (id: string) => void;
  onAddTab: () => void;
  onAddSideBySide: (tabId: string) => void;
  onRemoveTab: (tabId: string) => void;
  onSessionCreated: (tabId: string, termId: number, sessionId: string) => void;
  onCwdChanged: (tabId: string, termId: number, cwd: string) => void;
  emptyState: ReactNode;
}

function TermTabsInner({
  tabs,
  activeTabId,
  onTabChange,
  onAddTab,
  onAddSideBySide,
  onRemoveTab,
  onSessionCreated,
  onCwdChanged,
  emptyState,
}: Props) {
  const isMobile = useIsMobile();
  const { onDragStart, onDragEnd } = useTerminalResizeContext();
  const handleAddSideBySide = useCallback(() => {
    onAddSideBySide(activeTabId);
  }, [activeTabId, onAddSideBySide]);

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
    <div className="h-full w-full flex flex-col overflow-hidden bg-background">
      {/* Tab Headers */}
      <div className="flex items-center px-1">
        {/* Tab Header Buttons */}
        <Tabs value={activeTabId} onValueChange={onTabChange} className="shrink-0">
          <TabsList className="bg-transparent h-8">
            {tabs.map((tab) => (
              <TabsTrigger
                key={tab.id}
                value={tab.id}
                title={tab.name}
                className="gap-1.5 px-2.5 h-7 group relative pr-1"
              >
                <TerminalIcon className="size-3.5" />
                {!isMobile && <span className="text-[10px]">{tab.name}</span>}
                <CloseTabButton tabId={tab.id} onRemoveTab={onRemoveTab} />
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>

        {/* Tab Header Actions */}
        <div className="ml-auto flex items-center pr-1 gap-0.5">
          <Button
            variant="ghost"
            size="icon-xs"
            onClick={onAddTab}
            disabled={tabs.length >= 10}
            title="New Tab"
            className="size-7 hover:bg-muted"
          >
            <SquarePlusIcon className="size-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon-xs"
            onClick={handleAddSideBySide}
            disabled={
              !activeTabId || (tabs.find((t) => t.id === activeTabId)?.terminals.length ?? 0) >= 10
            }
            title="Side-by-side"
            className="size-7 hover:bg-muted"
          >
            <Columns2Icon className="size-3.5" />
          </Button>
        </div>
      </div>

      <Separator />

      {/* Content Area: Tabs Content */}
      <div className="flex-1 min-h-0 min-w-0 overflow-hidden relative">
        {tabs.length === 0
          ? emptyState
          : tabs.map((tab) => {
              const { terminals } = tab;
              const needsTwoRows = terminals.length > 5;
              const row1 = needsTwoRows
                ? terminals.slice(0, Math.ceil(terminals.length / 2))
                : terminals;
              const row2 = needsTwoRows
                ? terminals.slice(Math.ceil(terminals.length / 2))
                : EMPTY_TERMINALS;

              const isActive = activeTabId === tab.id;

              return (
                <div key={tab.id} className={`h-full w-full ${isActive ? "block" : "hidden"}`}>
                  {!needsTwoRows ? (
                    <TerminalRow
                      tabId={tab.id}
                      terminals={row1}
                      onSessionCreated={onSessionCreated}
                      onCwdChanged={onCwdChanged}
                    />
                  ) : (
                    <ResizablePanelGroup direction="vertical">
                      <ResizablePanel defaultSize={50} minSize={20}>
                        <TerminalRow
                          tabId={tab.id}
                          terminals={row1}
                          onSessionCreated={onSessionCreated}
                          onCwdChanged={onCwdChanged}
                        />
                      </ResizablePanel>
                      <ResizableHandle withHandle onDragging={handleDragging} />
                      <ResizablePanel defaultSize={50} minSize={20}>
                        <TerminalRow
                          tabId={tab.id}
                          terminals={row2}
                          onSessionCreated={onSessionCreated}
                          onCwdChanged={onCwdChanged}
                        />
                      </ResizablePanel>
                    </ResizablePanelGroup>
                  )}
                </div>
              );
            })}
      </div>
    </div>
  );
}

export function TermTabs(props: Props) {
  return (
    <TerminalResizeProvider>
      <TermTabsInner {...props} />
    </TerminalResizeProvider>
  );
}

function CloseTabButton({
  tabId,
  onRemoveTab,
}: {
  tabId: string;
  onRemoveTab: (tabId: string) => void;
}) {
  const handleClick = useCallback(
    (event: MouseEvent<HTMLButtonElement>) => {
      event.stopPropagation();
      onRemoveTab(tabId);
    },
    [onRemoveTab, tabId],
  );

  return (
    <button
      type="button"
      className="rounded-sm opacity-0 group-hover:opacity-100 hover:bg-muted-foreground/20 p-0.5 transition-all ml-1"
      onClick={handleClick}
      title="Close Tab"
    >
      <XIcon className="size-3" />
    </button>
  );
}
