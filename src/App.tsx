import { useState } from "react"
import { ResizableLayout } from "./components/ResizableLayout"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "src/components/ui/tabs"
import { Separator } from "src/components/ui/separator"
import { TopBar } from "src/components/TopBar"
import { TermTabs, TabGroup } from "src/components/TermTabs"
import { EmptyTerminalState } from "src/components/EmptyTerminalState"
import { LimaConfigTabContent } from "src/components/LimaConfigTabContent"
import { useLayoutStorage } from "src/hooks/useLayoutStorage"
import { Skeleton } from "./components/ui/skeleton"
import { Spinner } from "./components/ui/spinner"

export function App() {
    const { activeTab, setActiveTab, isLoadingActiveTabs } = useLayoutStorage();

    // Initial State Factory
    const createInitialTab = (prefix: string, tabId: string): TabGroup => ({
        id: tabId,
        name: `${prefix} Tab 1`,
        terminals: [
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
    })

    const [limaTabs, setLimaTabs] = useState<TabGroup[]>(() => [createInitialTab("Lima", "tab-1")])
    const [limaActive, setLimaActive] = useState("tab-1")
    const [limaMaxTabId, setLimaMaxTabId] = useState(1)
    const [limaMaxTermId, setLimaMaxTermId] = useState(1)

    const [k8sTabs, setK8sTabs] = useState<TabGroup[]>(() => [createInitialTab("K8s", "tab-1")])
    const [k8sActive, setK8sActive] = useState("tab-1")
    const [k8sMaxTabId, setK8sMaxTabId] = useState(1)
    const [k8sMaxTermId, setK8sMaxTermId] = useState(1)

    // Handlers
    const addTab = (
        prefix: string,
        setTabs: React.Dispatch<React.SetStateAction<TabGroup[]>>,
        maxTabId: number,
        setMaxTabId: React.Dispatch<React.SetStateAction<number>>,
        maxTermId: number,
        setMaxTermId: React.Dispatch<React.SetStateAction<number>>,
        setActive: React.Dispatch<React.SetStateAction<string>>
    ) => {
        const nextTabId = maxTabId + 1
        const nextTermId = maxTermId + 1
        const newTab: TabGroup = {
            id: `tab-${nextTabId}`,
            name: `${prefix} Tab ${nextTabId}`,
            terminals: [
                {
                    id: nextTermId,
                    name: `${prefix} Terminal ${nextTermId}`,
                    content: (
                        <div className="flex h-full w-full items-center justify-center">
                            <span className="text-muted-foreground text-xs">{prefix} Terminal ${nextTermId} Content</span>
                        </div>
                    )
                }
            ]
        }
        setTabs(prev => [...prev, newTab])
        setMaxTabId(nextTabId)
        setMaxTermId(nextTermId)
        setActive(`tab-${nextTabId}`)
    }

    const addSideBySide = (
        prefix: string,
        tabId: string,
        setTabs: React.Dispatch<React.SetStateAction<TabGroup[]>>,
        maxTermId: number,
        setMaxTermId: React.Dispatch<React.SetStateAction<number>>
    ) => {
        const nextTermId = maxTermId + 1
        setTabs(prev => prev.map(tab => {
            if (tab.id === tabId && tab.terminals.length < 10) {
                return {
                    ...tab,
                    terminals: [
                        ...tab.terminals,
                        {
                            id: nextTermId,
                            name: `${prefix} Terminal ${nextTermId}`,
                            content: (
                                <div className="flex h-full w-full items-center justify-center">
                                    <span className="text-muted-foreground text-xs">{prefix} Terminal ${nextTermId} Content</span>
                                </div>
                            )
                        }
                    ]
                }
            }
            return tab
        }))
        setMaxTermId(nextTermId)
    }

    const removeTerminal = (
        tabId: string,
        termId: number,
        setTabs: React.Dispatch<React.SetStateAction<TabGroup[]>>,
        activeTab: string,
        setActiveTab: React.Dispatch<React.SetStateAction<string>>
    ) => {
        setTabs(prev => {
            const tabIdx = prev.findIndex(t => t.id === tabId)
            if (tabIdx === -1) return prev

            const tab = prev[tabIdx]
            const nextTerminals = tab.terminals.filter(t => t.id !== termId)

            if (nextTerminals.length > 0) {
                // Just remove the terminal from the tab
                return prev.map(t => t.id === tabId ? { ...t, terminals: nextTerminals } : t)
            } else {
                // Last terminal in tab, remove the whole tab
                const nextTabs = prev.filter(t => t.id !== tabId)
                if (activeTab === tabId) {
                    if (nextTabs.length > 0) {
                        const nextTab = nextTabs[Math.max(0, tabIdx - 1)]
                        setActiveTab(nextTab.id)
                    } else {
                        setActiveTab("")
                    }
                }
                return nextTabs
            }
        })
    }

    return (
        <div className="h-full w-full overflow-hidden">
            <Separator />
            <TopBar />
            <Separator />
            {isLoadingActiveTabs ?
                <Skeleton className="h-full w-full flex items-center justify-center">
                    <div title="Loading tabs...">
                        <Spinner />
                    </div>
                </Skeleton> :
                <Tabs
                    value={activeTab}
                    onValueChange={setActiveTab}
                    className="h-full w-full"
                >
                    <TabsList>
                        <TabsTrigger value="config">Config</TabsTrigger>
                        <TabsTrigger value="lima">Lima</TabsTrigger>
                        <TabsTrigger value="k8s">K8s</TabsTrigger>
                    </TabsList>

                    <Separator />

                    <LimaConfigTabContent tabValue="config" />
                    <TabsContent value="lima">
                        <ResizableLayout
                            autoSaveId="lima-tabs-content"
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
                                    tabs={limaTabs}
                                    activeTabId={limaActive}
                                    onTabChange={setLimaActive}
                                    onAddTab={() => addTab("Lima", setLimaTabs, limaMaxTabId, setLimaMaxTabId, limaMaxTermId, setLimaMaxTermId, setLimaActive)}
                                    onAddSideBySide={(id) => addSideBySide("Lima", id, setLimaTabs, limaMaxTermId, setLimaMaxTermId)}
                                    onRemoveTerminal={(tabId, termId) => removeTerminal(tabId, termId, setLimaTabs, limaActive, setLimaActive)}
                                    emptyState={<EmptyTerminalState onAdd={() => addTab("Lima", setLimaTabs, limaMaxTabId, setLimaMaxTabId, limaMaxTermId, setLimaMaxTermId, setLimaActive)} />}
                                />
                            }
                        />
                    </TabsContent>
                    <TabsContent value="k8s">
                        <ResizableLayout
                            autoSaveId="k8s-tabs-content"
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
                                    tabs={k8sTabs}
                                    activeTabId={k8sActive}
                                    onTabChange={setK8sActive}
                                    onAddTab={() => addTab("K8s", setK8sTabs, k8sMaxTabId, setK8sMaxTabId, k8sMaxTermId, setK8sMaxTermId, setK8sActive)}
                                    onAddSideBySide={(id) => addSideBySide("K8s", id, setK8sTabs, k8sMaxTermId, setK8sMaxTermId)}
                                    onRemoveTerminal={(tabId, termId) => removeTerminal(tabId, termId, setK8sTabs, k8sActive, setK8sActive)}
                                    emptyState={<EmptyTerminalState onAdd={() => addTab("K8s", setK8sTabs, k8sMaxTabId, setK8sMaxTabId, k8sMaxTermId, setK8sMaxTermId, setK8sActive)} />}
                                />
                            }
                        />
                    </TabsContent>
                </Tabs>
            }
        </div>
    )
}