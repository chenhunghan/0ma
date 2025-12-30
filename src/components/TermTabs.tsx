import { useState } from "react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "src/components/ui/tabs"
import { Separator } from "src/components/ui/separator"
import { Button } from "src/components/ui/button"
import { PlusIcon } from "lucide-react"

export interface TermTabsProps {
    defaultCount?: number
}

export function TermTabs({ defaultCount = 1 }: TermTabsProps) {
    const [tabs, setTabs] = useState<number[]>(() => {
        const count = Math.min(Math.max(defaultCount, 1), 10)
        return Array.from({ length: count }, (_, i) => i + 1)
    })
    const [activeTab, setActiveTab] = useState(`term-${tabs[0]}`)
    const [maxId, setMaxId] = useState(tabs.length)

    const addTerminal = () => {
        if (tabs.length < 10) {
            const nextId = maxId + 1
            setTabs(prev => [...prev, nextId])
            setMaxId(nextId)
            setActiveTab(`term-${nextId}`)
        }
    }

    return (
        <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full w-full">
            <div className="flex items-center">
                <TabsList className="bg-transparent">
                    {tabs.map((id, index) => (
                        <TabsTrigger key={id} value={`term-${id}`}>
                            Terminal {index + 1}
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
            {tabs.map((id, index) => (
                <TabsContent key={id} value={`term-${id}`} className="h-full">
                    <div className="flex h-full w-full items-center justify-center">
                        <span className="text-muted-foreground text-xs">Terminal {index + 1} Content</span>
                    </div>
                </TabsContent>
            ))}
        </Tabs>
    )
}