import { ReactNode } from "react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "src/components/ui/tabs"
import { Separator } from "src/components/ui/separator"
import { Button } from "src/components/ui/button"
import { PlusIcon, Terminal as TerminalIcon, X as XIcon } from "lucide-react"
import { useIsMobile } from "src/hooks/useMediaQuery"

export interface Terminal {
    id: number
    name: string
    content: ReactNode
}

export interface TermTabsProps {
    terminals: Terminal[]
    activeTabId: string
    onTabChange: (id: string) => void
    onAdd: () => void
    onRemove: (id: number) => void
    renderEmptyState?: (props: { onAdd: () => void }) => ReactNode
}

const DefaultEmptyState = ({ onAdd }: { onAdd: () => void }) => {
    const isMobile = useIsMobile()
    return (
        <div className="flex flex-col h-full w-full items-center justify-center gap-4 px-6 animate-in fade-in duration-500">
            {!isMobile && (
                <>
                    <div className="p-4 rounded-full bg-muted/30">
                        <TerminalIcon className="size-8 text-muted-foreground/40" />
                    </div>
                    <div className="text-center max-w-[240px]">
                        <p className="text-xs font-medium text-muted-foreground uppercase tracking-tight">No active terminals</p>
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
                <PlusIcon className="size-3" />
                New Terminal
            </Button>
        </div>
    )
}

export function TermTabs({
    terminals,
    activeTabId,
    onTabChange,
    onAdd,
    onRemove,
    renderEmptyState
}: TermTabsProps) {
    const isMobile = useIsMobile()

    return (
        <Tabs value={activeTabId} onValueChange={onTabChange} className="h-full w-full">
            <div className="flex items-center">
                <TabsList className="bg-transparent">
                    {terminals.map((term) => (
                        <TabsTrigger
                            key={term.id}
                            value={`term-${term.id}`}
                            title={term.name}
                            className="gap-1.5 px-2.5"
                        >
                            <TerminalIcon className="size-3.5" />
                            {!isMobile && (
                                <span className="text-[10px]">{term.name}</span>
                            )}
                        </TabsTrigger>
                    ))}
                </TabsList>
                <Button
                    variant="secondary"
                    size="icon-xs"
                    onClick={onAdd}
                    disabled={terminals.length >= 10}
                    title="Add Terminal"
                    className="ml-1"
                >
                    <PlusIcon className="size-3" />
                </Button>
            </div>
            <Separator />
            {terminals.length === 0 ? (
                renderEmptyState ? renderEmptyState({ onAdd }) : <DefaultEmptyState onAdd={onAdd} />
            ) : (
                terminals.map((term) => (
                    <TabsContent key={term.id} value={`term-${term.id}`} className="h-full relative group">
                        <div className="absolute top-1.5 right-1.5 z-50 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity">
                            <Button
                                variant="secondary"
                                size="icon-xs"
                                className="size-5 bg-background/60 backdrop-blur-xs border border-border/50 shadow-xs hover:bg-background/90"
                                onClick={() => onRemove(term.id)}
                                title="Close Terminal"
                            >
                                <XIcon className="size-3" />
                            </Button>
                        </div>
                        {term.content}
                    </TabsContent>
                ))
            )}
        </Tabs>
    )
}