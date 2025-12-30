import { ReactNode, Fragment } from "react"
import { Tabs, TabsList, TabsTrigger } from "src/components/ui/tabs"
import { Separator } from "src/components/ui/separator"
import { Button } from "src/components/ui/button"
import { Terminal as TerminalIcon, X as XIcon, Columns2Icon, SquarePlusIcon } from "lucide-react"
import { useIsMobile } from "src/hooks/useMediaQuery"
import {
    ResizablePanelGroup,
    ResizablePanel,
    ResizableHandle
} from "src/components/ui/resizable"

export interface Terminal {
    id: number
    name: string
    content: ReactNode
}

export interface TabGroup {
    id: string
    name: string
    terminals: Terminal[]
}

const EmptyState = ({ onAdd }: { onAdd: () => void }) => {
    const isMobile = useIsMobile()
    return (
        <div className="flex flex-col h-full w-full items-center justify-center gap-4 px-6 animate-in fade-in duration-500">
            {!isMobile && (
                <>
                    <div className="p-4 rounded-full bg-muted/30">
                        <TerminalIcon className="size-8 text-muted-foreground/40" />
                    </div>
                    <div className="text-center max-w-[240px]">
                        <p className="text-xs font-medium text-muted-foreground uppercase tracking-tight">No active tabs</p>
                        <p className="text-[10px] text-muted-foreground/60 mt-1.5 leading-relaxed">
                            Click the plus icon above or the button below to start
                        </p>
                    </div>
                </>
            )}
            <Button
                variant="outline"
                size={isMobile ? "xs" : "sm"}
                className="mt-1 h-7 px-4 text-[10px] gap-1.5"
                onClick={onAdd}
            >
                <SquarePlusIcon className="size-3" />
                New Tab
            </Button>
        </div>
    )
}

interface TermRowProps {
    tabId: string,
    terminals: Terminal[],
    onRemove: (tabId: string, terminalId: number) => void
}

export function TerminalRow({
    tabId,
    terminals,
    onRemove
}: TermRowProps) {
    const isMobile = useIsMobile()

    return (
        <ResizablePanelGroup direction={isMobile ? "vertical" : "horizontal"}>
            {terminals.map((term, index) => (
                <Fragment key={term.id}>
                    <ResizablePanel defaultSize={100 / terminals.length} minSize={10}>
                        <div
                            className="h-full w-full relative group border border-transparent transition-all duration-200 hover:border-zinc-800"
                        >
                            <div className="absolute top-1.5 right-1.5 z-20 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity">
                                <Button
                                    variant="secondary"
                                    size="icon-xs"
                                    className="size-5 bg-background/60 backdrop-blur-xs border border-border/50 shadow-xs hover:bg-destructive/20 hover:text-destructive hover:border-destructive/30"
                                    onClick={(e) => {
                                        e.stopPropagation()
                                        onRemove(tabId, term.id)
                                    }}
                                    title="Close Terminal"
                                >
                                    <XIcon className="size-3" />
                                </Button>
                            </div>
                            <div className="h-full w-full overflow-hidden">
                                {term.content}
                            </div>
                        </div>
                    </ResizablePanel>
                    {index < terminals.length - 1 && <ResizableHandle withHandle={!isMobile} />}
                </Fragment>
            ))}
        </ResizablePanelGroup>
    )
}

interface TermTabsProps {
    tabs: TabGroup[]
    activeTabId: string
    onTabChange: (id: string) => void
    onAddTab: () => void
    onAddSideBySide: (tabId: string) => void
    onRemoveTerminal: (tabId: string, terminalId: number) => void
    renderEmptyState?: (props: { onAdd: () => void }) => ReactNode
}


export function TermTabs({
    tabs,
    activeTabId,
    onTabChange,
    onAddTab,
    onAddSideBySide,
    onRemoveTerminal,
    renderEmptyState
}: TermTabsProps) {
    const isMobile = useIsMobile()

    return (
        <div className="h-full w-full flex flex-col overflow-hidden bg-background">
            <div className="flex items-center px-1">
                <Tabs value={activeTabId} onValueChange={onTabChange} className="shrink-0">
                    <TabsList className="bg-transparent h-8">
                        {tabs.map((tab) => (
                            <TabsTrigger
                                key={tab.id}
                                value={tab.id}
                                title={tab.name}
                                className="gap-1.5 px-2.5 h-7"
                            >
                                <TerminalIcon className="size-3.5" />
                                {!isMobile && (
                                    <span className="text-[10px] font-medium">{tab.name}</span>
                                )}
                            </TabsTrigger>
                        ))}
                    </TabsList>
                </Tabs>
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
                        onClick={() => onAddSideBySide(activeTabId)}
                        disabled={!activeTabId || (tabs.find(t => t.id === activeTabId)?.terminals.length ?? 0) >= 10}
                        title="Side-by-side"
                        className="size-7 hover:bg-muted"
                    >
                        <Columns2Icon className="size-3.5" />
                    </Button>
                </div>
            </div>
            <Separator />

            {/* Content Area: Tabs Content */}
            <div className="flex-1 overflow-hidden relative">
                {tabs.length === 0 ? (
                    renderEmptyState ? renderEmptyState({ onAdd: onAddTab }) : <EmptyState onAdd={onAddTab} />
                ) : (
                    tabs.map((tab) => {
                        const terminals = tab.terminals
                        const needsTwoRows = terminals.length > 5
                        const row1 = needsTwoRows ? terminals.slice(0, Math.ceil(terminals.length / 2)) : terminals
                        const row2 = needsTwoRows ? terminals.slice(Math.ceil(terminals.length / 2)) : []

                        return (
                            <div
                                key={tab.id}
                                className={`h-full w-full ${activeTabId === tab.id ? 'block' : 'hidden'}`}
                            >
                                {!needsTwoRows ? (
                                    <TerminalRow
                                        tabId={tab.id}
                                        terminals={row1}
                                        onRemove={onRemoveTerminal}
                                    />
                                ) : (
                                    <ResizablePanelGroup direction="vertical">
                                        <ResizablePanel defaultSize={50} minSize={20}>
                                            <TerminalRow
                                                tabId={tab.id}
                                                terminals={row1}
                                                onRemove={onRemoveTerminal}
                                            />
                                        </ResizablePanel>
                                        <ResizableHandle withHandle />
                                        <ResizablePanel defaultSize={50} minSize={20}>
                                            <TerminalRow
                                                tabId={tab.id}
                                                terminals={row2}
                                                onRemove={onRemoveTerminal}
                                            />
                                        </ResizablePanel>
                                    </ResizablePanelGroup>
                                )}
                            </div>
                        )
                    })
                )}
            </div>
        </div>
    )
}