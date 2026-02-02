import { useState } from "react";
import { ResizableLayout } from "./components/ResizableLayout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "src/components/ui/tabs";
import { Separator } from "src/components/ui/separator";
import { TopBar } from "src/components/TopBar";
import { TermTabs, TabGroup } from "src/components/TermTabs";
import { EmptyTerminalState } from "src/components/EmptyTerminalState";
import { LimaConfigTabContent } from "src/components/LimaConfigTabContent";
import { useLayoutStorage } from "src/hooks/useLayoutStorage";
import { Skeleton } from "./components/ui/skeleton";
import { Spinner } from "./components/ui/spinner";
import { invoke } from "@tauri-apps/api/core";
import * as log from "@tauri-apps/plugin-log";

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
      },
    ],
  });

  const [limaTabs, setLimaTabs] = useState<TabGroup[]>(() => [createInitialTab("Lima", "tab-1")]);
  const [limaActive, setLimaActive] = useState("tab-1");
  const [limaMaxTabId, setLimaMaxTabId] = useState(1);
  const [limaMaxTermId, setLimaMaxTermId] = useState(1);

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [_k8sTabs, _setK8sTabs] = useState<TabGroup[]>(() => [createInitialTab("K8s", "tab-1")]);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [_k8sActive, _setK8sActive] = useState("tab-1");
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [_k8sMaxTabId, _setK8sMaxTabId] = useState(1);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [_k8sMaxTermId, _setK8sMaxTermId] = useState(1);

  // Handlers
  const addTab = (
    prefix: string,
    setTabs: React.Dispatch<React.SetStateAction<TabGroup[]>>,
    maxTabId: number,
    setMaxTabId: React.Dispatch<React.SetStateAction<number>>,
    maxTermId: number,
    setMaxTermId: React.Dispatch<React.SetStateAction<number>>,
    setActive: React.Dispatch<React.SetStateAction<string>>,
  ) => {
    const nextTabId = maxTabId + 1;
    const nextTermId = maxTermId + 1;
    const newTab: TabGroup = {
      id: `tab-${nextTabId}`,
      name: `${prefix} Tab ${nextTabId}`,
      terminals: [
        {
          id: nextTermId,
          name: `${prefix} Terminal ${nextTermId}`,
        },
      ],
    };
    setTabs((prev) => [...prev, newTab]);
    setMaxTabId(nextTabId);
    setMaxTermId(nextTermId);
    setActive(`tab-${nextTabId}`);
  };

  const addSideBySide = (
    prefix: string,
    tabId: string,
    setTabs: React.Dispatch<React.SetStateAction<TabGroup[]>>,
    maxTermId: number,
    setMaxTermId: React.Dispatch<React.SetStateAction<number>>,
  ) => {
    const nextTermId = maxTermId + 1;
    setTabs((prev) =>
      prev.map((tab) => {
        if (tab.id === tabId && tab.terminals.length < 10) {
          return {
            ...tab,
            terminals: [
              ...tab.terminals,
              {
                id: nextTermId,
                name: `${prefix} Terminal ${nextTermId}`,
              },
            ],
          };
        }
        return tab;
      }),
    );
    setMaxTermId(nextTermId);
  };

  const removeTab = (
    tabId: string,
    currentTabs: TabGroup[],
    setTabs: React.Dispatch<React.SetStateAction<TabGroup[]>>,
    activeTab: string,
    setActiveTab: React.Dispatch<React.SetStateAction<string>>,
  ) => {
    const tabIdx = currentTabs.findIndex((t) => t.id === tabId);
    if (tabIdx === -1) return;

    const tab = currentTabs[tabIdx];

    // Close all PTY sessions in the tab
    tab.terminals.forEach((term) => {
      if (term.sessionId) {
        invoke("close_pty_cmd", { sessionId: term.sessionId }).catch((error) =>
          log.error("Failed to close PTY:", error),
        );
      }
    });

    const nextTabs = currentTabs.filter((t) => t.id !== tabId);
    setTabs(nextTabs);

    if (activeTab === tabId) {
      if (nextTabs.length > 0) {
        // Try to select the previous tab, or the next one if it was the first
        const nextActiveIdx = Math.max(0, tabIdx - 1);
        setActiveTab(nextTabs[nextActiveIdx].id);
      } else {
        setActiveTab("");
      }
    }
  };

  const handleTerminalSessionCreated = (
    tabId: string,
    termId: number,
    sessionId: string,
    setTabs: React.Dispatch<React.SetStateAction<TabGroup[]>>,
  ) => {
    setTabs((prev) =>
      prev.map((tab) => {
        if (tab.id !== tabId) return tab;
        return {
          ...tab,
          terminals: tab.terminals.map((term) => {
            if (term.id !== termId) return term;
            return { ...term, sessionId };
          }),
        };
      }),
    );
  };

  return (
    <div className="h-full w-full overflow-hidden">
      <Separator />
      <TopBar />
      <Separator />
      {isLoadingActiveTabs ? (
        <Skeleton className="h-full w-full flex items-center justify-center">
          <div title="Loading tabs...">
            <Spinner />
          </div>
        </Skeleton>
      ) : (
        <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full w-full">
          <TabsList>
            <TabsTrigger value="config">Config</TabsTrigger>
            <TabsTrigger value="lima">Lima</TabsTrigger>
            <TabsTrigger value="k8s">K8s</TabsTrigger>
          </TabsList>
          <Separator />

          <LimaConfigTabContent tabValue="config" />
          <TabsContent value="lima" keepMounted>
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
                  onSessionCreated={(tabId, termId, sid) =>
                    handleTerminalSessionCreated(tabId, termId, sid, setLimaTabs)
                  }
                  onTabChange={setLimaActive}
                  onAddTab={() =>
                    addTab(
                      "Lima",
                      setLimaTabs,
                      limaMaxTabId,
                      setLimaMaxTabId,
                      limaMaxTermId,
                      setLimaMaxTermId,
                      setLimaActive,
                    )
                  }
                  onAddSideBySide={(id) =>
                    addSideBySide("Lima", id, setLimaTabs, limaMaxTermId, setLimaMaxTermId)
                  }
                  onRemoveTab={(tabId) =>
                    removeTab(tabId, limaTabs, setLimaTabs, limaActive, setLimaActive)
                  }
                  emptyState={
                    <EmptyTerminalState
                      onAdd={() =>
                        addTab(
                          "Lima",
                          setLimaTabs,
                          limaMaxTabId,
                          setLimaMaxTabId,
                          limaMaxTermId,
                          setLimaMaxTermId,
                          setLimaActive,
                        )
                      }
                    />
                  }
                />
              }
            />
          </TabsContent>

          <TabsContent value="k8s" keepMounted>
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
              bottom={null}
            />
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}
