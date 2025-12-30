import { useState } from "react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "src/components/ui/tabs"
import { Separator } from "src/components/ui/separator"
import { Button } from "src/components/ui/button"
import { PlusIcon, Terminal as TerminalIcon } from "lucide-react"
import { useIsMobile } from "src/hooks/useMediaQuery"

export interface TermTabsProps {
    defaultCount?: number
}

interface Terminal {
    id: number
    name: string
}

export function TermTabs({ defaultCount = 1 }: TermTabsProps) {
    const isMobile = useIsMobile()
    const [tabs, setTabs] = useState<Terminal[]>(() => {
        const count = Math.min(Math.max(defaultCount, 1), 10)
        return Array.from({ length: count }, (_, i) => ({
            id: i + 1,
            name: `Terminal ${i + 1}`,
        }))
    })
    const [activeTab, setActiveTab] = useState(`term-${tabs[0].id}`)
    const [maxId, setMaxId] = useState(tabs.length)

    const addTerminal = () => {
        if (tabs.length < 10) {
            const nextId = maxId + 1
            const newTerm = { id: nextId, name: `Terminal ${nextId}` }
            setTabs(prev => [...prev, newTerm])
            setMaxId(nextId)
            setActiveTab(`term-${nextId}`)
        }
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
            {
                tabs.map((term) => (
                    <TabsContent key={term.id} value={`term-${term.id}`} className="h-full">
                        <div className="flex h-full w-full items-center justify-center">
                            <span className="text-muted-foreground text-xs">{term.name} Content</span>
                        </div>
                    </TabsContent>
                ))
            }
        </Tabs >
    )
}