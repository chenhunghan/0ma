import { useState, ReactNode } from "react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "src/components/ui/tabs"
import { Separator } from "src/components/ui/separator"
import { Button } from "src/components/ui/button"
import { PlusIcon, Terminal as TerminalIcon, X as XIcon } from "lucide-react"
import { useIsMobile } from "src/hooks/useMediaQuery"

export interface TermTabsProps {
    defaultCount?: number
}

interface Terminal {
    id: number
    name: string
    content: ReactNode
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

export function TermTabs({ defaultCount = 1 }: TermTabsProps) {
    const isMobile = useIsMobile()
    const [tabs, setTabs] = useState<Terminal[]>(() => {
        const count = Math.min(Math.max(defaultCount, 1), 10)
        return Array.from({ length: count }, (_, i) => ({
            id: i + 1,
            name: `Terminal ${i + 1}`,
            content: (
                <div className="flex h-full w-full items-center justify-center">
                    <span className="text-muted-foreground text-xs">Terminal {i + 1} Content</span>
                </div>
            )
        }))
    })
    const [activeTab, setActiveTab] = useState(`term-${tabs[0]?.id || ""}`)
    const [maxId, setMaxId] = useState(tabs.length)

    const addTerminal = () => {
        if (tabs.length < 10) {
            const nextId = maxId + 1
            const newTerm: Terminal = {
                id: nextId,
                name: `Terminal ${nextId}`,
                content: (
                    <div className="flex h-full w-full items-center justify-center">
                        <span className="text-muted-foreground text-xs">Terminal {nextId} Content</span>
                    </div>
                )
            }
            setTabs(prev => [...prev, newTerm])
            setMaxId(nextId)
            setActiveTab(`term-${nextId}`)
        }
    }

    const removeTerminal = (id: number) => {
        setTabs(prev => {
            const newTabs = prev.filter(t => t.id !== id)
            if (activeTab === `term-${id}`) {
                if (newTabs.length > 0) {
                    const closedIndex = prev.findIndex(t => t.id === id)
                    const nextTab = newTabs[Math.max(0, closedIndex - 1)]
                    setActiveTab(`term-${nextTab.id}`)
                } else {
                    setActiveTab("")
                }
            }
            return newTabs
        })
    }


    return (
        <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full w-full">
            <div className="flex items-center">
                <TabsList className="bg-transparent">
                    {tabs.map((term) => (
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
                    onClick={addTerminal}
                    disabled={tabs.length >= 10}
                    title="Add Terminal"
                    className="ml-1"
                >
                    <PlusIcon className="size-3" />
                </Button>
            </div>
            <Separator />
            {tabs.length === 0 ? (
                <EmptyState onAdd={addTerminal} />
            ) : (
                tabs.map((term) => (
                    <TabsContent key={term.id} value={`term-${term.id}`} className="h-full relative group">
                        <div className="absolute top-1.5 right-1.5 z-50 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity">
                            <Button
                                variant="secondary"
                                size="icon-xs"
                                className="size-5 bg-background/60 backdrop-blur-xs border border-border/50 shadow-xs hover:bg-background/90"
                                onClick={() => removeTerminal(term.id)}
                                title="Close Terminal"
                            >
                                <XIcon className="size-3" />
                            </Button>
                        </div>
                        {term.content}
                    </TabsContent>
                ))
            )
            }
        </Tabs >
    )
}