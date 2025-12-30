import { useState } from "react"
import { ResizableLayout } from "./components/ResizableLayout"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "src/components/ui/tabs"
import { Separator } from "src/components/ui/separator"
import { TopBar } from "src/components/_TopBar"
import { TermTabs, Terminal } from "./components/TermTabs"

export function App() {
    // State management for Terminal Groups
    const createInitialTerminals = (prefix: string): Terminal[] => [
        {
            id: 1,
            name: `${prefix} Terminal 1`,
            content: (
                <div className="flex h-full w-full items-center justify-center">
                    <span className="text-muted-foreground text-xs">{prefix} Terminal 1 Content</span>
                </div>
            )
        }
    ]

    const [configTerms, setConfigTerms] = useState<Terminal[]>(() => createInitialTerminals("Config"))
    const [configActive, setConfigActive] = useState("term-1")
    const [configMaxId, setConfigMaxId] = useState(1)

    const [limaTerms, setLimaTerms] = useState<Terminal[]>(() => createInitialTerminals("Lima"))
    const [limaActive, setLimaActive] = useState("term-1")
    const [limaMaxId, setLimaMaxId] = useState(1)

    const [k8sTerms, setK8sTerms] = useState<Terminal[]>(() => createInitialTerminals("K8s"))
    const [k8sActive, setK8sActive] = useState("term-1")
    const [k8sMaxId, setK8sMaxId] = useState(1)

    // Dynamic terminal handlers
    const addTerm = (
        prefix: string,
        terms: Terminal[],
        setTerms: React.Dispatch<React.SetStateAction<Terminal[]>>,
        maxId: number,
        setMaxId: React.Dispatch<React.SetStateAction<number>>,
        setActive: React.Dispatch<React.SetStateAction<string>>
    ) => {
        if (terms.length >= 10) return
        const nextId = maxId + 1
        const newTerm: Terminal = {
            id: nextId,
            name: `${prefix} Terminal ${nextId}`,
            content: (
                <div className="flex h-full w-full items-center justify-center">
                    <span className="text-muted-foreground text-xs">{prefix} Terminal ${nextId} Content</span>
                </div>
            )
        }
        setTerms(prev => [...prev, newTerm])
        setMaxId(nextId)
        setActive(`term-${nextId}`)
    }

    const removeTerm = (
        id: number,
        terms: Terminal[],
        setTerms: React.Dispatch<React.SetStateAction<Terminal[]>>,
        active: string,
        setActive: React.Dispatch<React.SetStateAction<string>>
    ) => {
        setTerms(prev => {
            const nextTerms = prev.filter(t => t.id !== id)
            if (active === `term-${id}`) {
                if (nextTerms.length > 0) {
                    const closedIdx = prev.findIndex(t => t.id === id)
                    const nextTab = nextTerms[Math.max(0, closedIdx - 1)]
                    setActive(`term-${nextTab.id}`)
                } else {
                    setActive("")
                }
            }
            return nextTerms
        })
    }

    return (
        <div className="h-full w-full overflow-hidden">
            <Separator />
            <TopBar />
            <Separator />
            <Tabs defaultValue="lima" className="h-full w-full">
                <TabsList>
                    <TabsTrigger value="config">Config</TabsTrigger>
                    <TabsTrigger value="lima">Lima</TabsTrigger>
                    <TabsTrigger value="k8s">K8s</TabsTrigger>
                </TabsList>
                <Separator />
                <TabsContent value="config" className="h-full">
                    <ResizableLayout
                        columns={[
                            <div className="flex h-full w-full items-center justify-center" key="1">
                                <span className="font-semibold">Config Column 1</span>
                            </div>,
                            <div className="flex h-full w-full items-center justify-center" key="2">
                                <span className="font-semibold">Config Column 2</span>
                            </div>,
                            <div className="flex h-full w-full items-center justify-center" key="3">
                                <span className="font-semibold">Config Column 3</span>
                            </div>,
                        ]}
                        bottom={
                            <TermTabs
                                terminals={configTerms}
                                activeTabId={configActive}
                                onTabChange={setConfigActive}
                                onAdd={() => addTerm("Config", configTerms, setConfigTerms, configMaxId, setConfigMaxId, setConfigActive)}
                                onRemove={(id) => removeTerm(id, configTerms, setConfigTerms, configActive, setConfigActive)}
                            />
                        }
                    />
                </TabsContent>
                <TabsContent value="lima">
                    <ResizableLayout
                        columns={[
                            <div className="flex h-full w-full items-center justify-center" key="1">
                                <span className="font-semibold">Lima Column 1</span>
                            </div>,
                            <div className="flex h-full w-full items-center justify-center" key="2">
                                <span className="font-semibold">Lima Column 2</span>
                            </div>,
                            <div className="flex h-full w-full items-center justify-center" key="3">
                                <span className="font-semibold">Lima Column 3</span>
                            </div>,
                        ]}
                        bottom={
                            <TermTabs
                                terminals={limaTerms}
                                activeTabId={limaActive}
                                onTabChange={setLimaActive}
                                onAdd={() => addTerm("Lima", limaTerms, setLimaTerms, limaMaxId, setLimaMaxId, setLimaActive)}
                                onRemove={(id) => removeTerm(id, limaTerms, setLimaTerms, limaActive, setLimaActive)}
                            />
                        }
                    />
                </TabsContent>
                <TabsContent value="k8s">
                    <ResizableLayout
                        columns={[
                            <div className="flex h-full w-full items-center justify-center" key="1">
                                <span className="font-semibold">K8s Column 1</span>
                            </div>,
                            <div className="flex h-full w-full items-center justify-center" key="2">
                                <span className="font-semibold">K8s Column 2</span>
                            </div>,
                            <div className="flex h-full w-full items-center justify-center" key="3">
                                <span className="font-semibold">K8s Column 3</span>
                            </div>,
                        ]}
                        bottom={
                            <TermTabs
                                terminals={k8sTerms}
                                activeTabId={k8sActive}
                                onTabChange={setK8sActive}
                                onAdd={() => addTerm("K8s", k8sTerms, setK8sTerms, k8sMaxId, setK8sMaxId, setK8sActive)}
                                onRemove={(id) => removeTerm(id, k8sTerms, setK8sTerms, k8sActive, setK8sActive)}
                            />
                        }
                    />
                </TabsContent>
            </Tabs>
        </div>
    )
}