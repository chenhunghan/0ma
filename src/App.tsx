import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ResizableLayout } from "./components/ResizableLayout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "src/components/ui/tabs";
import { Separator } from "src/components/ui/separator";
import { TopBar } from "src/components/TopBar";
import type { TabGroup } from "src/components/TermTabs";
import { TermTabs } from "src/components/TermTabs";
import { EmptyTerminalState } from "src/components/EmptyTerminalState";
import { LimaConfigTabContent } from "src/components/LimaConfigTabContent";
import { OrphanedEnvCleanupDialog } from "./components/OrphanedEnvCleanupDialog";
import { useInstanceLifecycleEvents } from "src/hooks/useInstanceLifecycleEvents";
import { useLayoutStorage } from "src/hooks/useLayoutStorage";
import { Skeleton } from "./components/ui/skeleton";
import { Spinner } from "./components/ui/spinner";
import { invoke } from "@tauri-apps/api/core";
import * as log from "@tauri-apps/plugin-log";
import { useSelectedInstance } from "src/hooks/useSelectedInstance";
// import { useK8sAvailable } from "src/hooks/useK8sAvailable";
import { LimaInstanceInfoColumn } from "src/components/LimaInstanceInfoColumn";
import { useEnvSetup } from "src/hooks/useEnvSetup";
import { EnvSetupDialog } from "src/components/EnvSetupDialog";
import { Button } from "src/components/ui/button";
import { FileTerminalIcon } from "lucide-react";
import { InstanceStatus } from "src/types/InstanceStatus";

// oxlint-disable-next-line max-statements
export function App() {
  useInstanceLifecycleEvents();
  const { selectedName, selectedInstance } = useSelectedInstance();
  const hasInstance = Boolean(selectedName);
  const isInstanceRunning = selectedInstance?.status === InstanceStatus.Running;
  // const { data: isK8sAvailable = false } = useK8sAvailable(selectedName);
  const envSetup = useEnvSetup(selectedName);
  const { activeTab, setActiveTab, isLoadingActiveTabs } = useLayoutStorage();
  const [limaTabs, setLimaTabs] = useState<TabGroup[]>([]);
  const [limaActive, setLimaActive] = useState("");
  const limaNextId = useRef(0);

  // Redirect away from tabs that are not available
  useEffect(() => {
    if ((activeTab === "lima" || activeTab === "config") && !hasInstance) {
      setActiveTab("");
    }
  }, [activeTab, hasInstance, setActiveTab]);

  // Close all lima terminal tabs when no instance is selected
  useEffect(() => {
    if (!hasInstance) {
      setLimaTabs((prev) => {
        for (const tab of prev) {
          for (const term of tab.terminals) {
            if (term.sessionId) {
              invoke("close_pty_cmd", { sessionId: term.sessionId }).catch((error) =>
                log.error("Failed to close PTY:", error),
              );
            }
          }
        }
        return [];
      });
      setLimaActive("");
    }
  }, [hasInstance]);

  // Handlers
  const nextId = (counter: React.RefObject<number>) => {
    counter.current += 1;
    return counter.current;
  };

  const addTab = (
    setTabs: React.Dispatch<React.SetStateAction<TabGroup[]>>,
    counter: React.RefObject<number>,
    setActive: React.Dispatch<React.SetStateAction<string>>,
    options?: { name?: string; command?: string; args?: string[] },
  ) => {
    const tabId = nextId(counter);
    const termId = nextId(counter);
    const newTab: TabGroup = {
      id: `tab-${tabId}`,
      name: options?.name ?? "Terminal",
      terminals: [{ id: termId, name: options?.name ?? "Terminal", command: options?.command, args: options?.args }],
    };
    setTabs((prev) => [...prev, newTab]);
    setActive(`tab-${tabId}`);
  };

  const addSideBySide = (
    tabId: string,
    setTabs: React.Dispatch<React.SetStateAction<TabGroup[]>>,
    counter: React.RefObject<number>,
  ) => {
    const termId = nextId(counter);
    setTabs((prev) =>
      prev.map((tab) => {
        if (tab.id === tabId && tab.terminals.length < 10) {
          return {
            ...tab,
            terminals: [...tab.terminals, { id: termId, name: "Terminal" }],
          };
        }
        return tab;
      }),
    );
  };

  const removeTab = (
    tabId: string,
    currentTabs: TabGroup[],
    setTabs: React.Dispatch<React.SetStateAction<TabGroup[]>>,
    activeTab: string,
    setActiveTab: React.Dispatch<React.SetStateAction<string>>,
  ) => {
    const tabIdx = currentTabs.findIndex((t) => t.id === tabId);
    if (tabIdx === -1) {
      return;
    }

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

  const removeTerminal = (
    tabId: string,
    termId: number,
    currentTabs: TabGroup[],
    setTabs: React.Dispatch<React.SetStateAction<TabGroup[]>>,
    activeTab: string,
    setActiveTab: React.Dispatch<React.SetStateAction<string>>,
  ) => {
    const tab = currentTabs.find((t) => t.id === tabId);
    if (!tab) return;

    const term = tab.terminals.find((t) => t.id === termId);
    if (term?.sessionId) {
      invoke("close_pty_cmd", { sessionId: term.sessionId }).catch((error) =>
        log.error("Failed to close PTY:", error),
      );
    }

    const remaining = tab.terminals.filter((t) => t.id !== termId);
    if (remaining.length === 0) {
      // PTY already closed above — remove the tab without re-closing sessions
      const tabIdx = currentTabs.findIndex((t) => t.id === tabId);
      const nextTabs = currentTabs.filter((t) => t.id !== tabId);
      setTabs(nextTabs);

      if (activeTab === tabId) {
        if (nextTabs.length > 0) {
          const nextActiveIdx = Math.max(0, tabIdx - 1);
          setActiveTab(nextTabs[nextActiveIdx].id);
        } else {
          setActiveTab("");
        }
      }
    } else {
      setTabs((prev) =>
        prev.map((t) => (t.id === tabId ? { ...t, terminals: remaining } : t)),
      );
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
        if (tab.id !== tabId) {
          return tab;
        }
        return {
          ...tab,
          terminals: tab.terminals.map((term) => {
            if (term.id !== termId) {
              return term;
            }
            return { ...term, sessionId };
          }),
        };
      }),
    );
  };

  const handleTerminalCwdChanged = (
    tabId: string,
    termId: number,
    cwd: string,
    setTabs: React.Dispatch<React.SetStateAction<TabGroup[]>>,
  ) => {
    setTabs((prev) =>
      prev.map((tab) => {
        if (tab.id !== tabId) {
          return tab;
        }
        return {
          ...tab,
          terminals: tab.terminals.map((term) => {
            if (term.id !== termId) {
              return term;
            }
            return { ...term, cwd };
          }),
        };
      }),
    );
  };

  const handleTerminalTitleChanged = (
    tabId: string,
    termId: number,
    title: string,
    setTabs: React.Dispatch<React.SetStateAction<TabGroup[]>>,
  ) => {
    setTabs((prev) =>
      prev.map((tab) => {
        if (tab.id !== tabId) {
          return tab;
        }
        return {
          ...tab,
          terminals: tab.terminals.map((term) => {
            if (term.id !== termId) {
              return term;
            }
            return { ...term, title };
          }),
        };
      }),
    );
  };

  const handleLimaSessionCreated = useCallback(
    (tabId: string, termId: number, sessionId: string) => {
      handleTerminalSessionCreated(tabId, termId, sessionId, setLimaTabs);
    },
    [],
  );

  const handleLimaCwdChanged = useCallback((tabId: string, termId: number, cwd: string) => {
    handleTerminalCwdChanged(tabId, termId, cwd, setLimaTabs);
  }, []);

  const handleLimaTitleChanged = useCallback((tabId: string, termId: number, title: string) => {
    handleTerminalTitleChanged(tabId, termId, title, setLimaTabs);
  }, []);

  const handleAddLimaTab = useCallback(() => {
    addTab(setLimaTabs, limaNextId, setLimaActive);
  }, []);

  const handleAddLimaSideBySide = useCallback((tabId: string) => {
    addSideBySide(tabId, setLimaTabs, limaNextId);
  }, []);

  const handleRemoveLimaTab = useCallback(
    (tabId: string) => {
      removeTab(tabId, limaTabs, setLimaTabs, limaActive, setLimaActive);
    },
    [limaActive, limaTabs],
  );

  const handleRemoveLimaTerminal = useCallback(
    (tabId: string, termId: number) => {
      removeTerminal(tabId, termId, limaTabs, setLimaTabs, limaActive, setLimaActive);
    },
    [limaActive, limaTabs],
  );

  const limaCommand = selectedName ? "limactl" : "zsh";
  const limaArgs = useMemo(
    () => (selectedName ? ["shell", selectedName] : []),
    [selectedName],
  );

  const handleAddLimaBtopTab = useCallback(() => {
    addTab(setLimaTabs, limaNextId, setLimaActive, {
      name: "btop",
      command: limaCommand,
      args: [...limaArgs, "btop"],
    });
  }, [limaCommand, limaArgs]);

  const limaEmptyState = useMemo(
    () => <EmptyTerminalState onAdd={handleAddLimaTab} disabled={!isInstanceRunning} />,
    [handleAddLimaTab, isInstanceRunning],
  );

  const limaLeft = useMemo(() => <LimaInstanceInfoColumn />, []);


  const limaRight = useMemo(
    () => (
      <TermTabs
        tabs={limaTabs}
        activeTabId={limaActive}
        initialCommand={limaCommand}
        initialArgs={limaArgs}
        onSessionCreated={handleLimaSessionCreated}
        onCwdChanged={handleLimaCwdChanged}
        onTitleChanged={handleLimaTitleChanged}
        onTabChange={setLimaActive}
        onAddTab={handleAddLimaTab}
        onAddBtopTab={handleAddLimaBtopTab}
        onAddSideBySide={handleAddLimaSideBySide}
        onRemoveTab={handleRemoveLimaTab}
        onRemoveTerminal={handleRemoveLimaTerminal}
        emptyState={limaEmptyState}
        addDisabled={!isInstanceRunning}
      />
    ),
    [
      handleAddLimaBtopTab,
      handleAddLimaSideBySide,
      handleAddLimaTab,
      handleLimaCwdChanged,
      handleLimaSessionCreated,
      handleLimaTitleChanged,
      handleRemoveLimaTab,
      handleRemoveLimaTerminal,
      isInstanceRunning,
      limaActive,
      limaArgs,
      limaCommand,
      limaEmptyState,
      limaTabs,
    ],
  );

  return (
    <div className="h-full w-full overflow-hidden pb-[14px] pt-[18px]">
      <TopBar envSetup={envSetup} />
      <Separator />
      {isLoadingActiveTabs ? (
        <Skeleton className="h-full w-full flex items-center justify-center">
          <div title="Loading tabs...">
            <Spinner />
          </div>
        </Skeleton>
      ) : (
        <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full w-full">
          <div className="flex items-center">
            <TabsList>
              {hasInstance && <TabsTrigger value="config">Config</TabsTrigger>}
              {hasInstance && <TabsTrigger value="lima">Lima</TabsTrigger>}
              {/* TODO: K8s tab disabled until k8s features are ready */}
            </TabsList>
            {hasInstance && !envSetup.envShExists && (
              <Button
                variant="ghost"
                size="icon-xs"
                onClick={() => envSetup.triggerEnvSetup(selectedName!)}
                title="Environment setup"
                className="ml-auto size-7 cursor-pointer hover:bg-muted"
              >
                <FileTerminalIcon className="size-3.5" />
              </Button>
            )}
          </div>
          <Separator />

          {hasInstance && <LimaConfigTabContent tabValue="config" />}
          {hasInstance && (
            <TabsContent value="lima" keepMounted>
              <ResizableLayout
                autoSaveId="lima-tabs-content"
                left={limaLeft}
                right={limaRight}
              />
            </TabsContent>
          )}
        </Tabs>
      )}
      <OrphanedEnvCleanupDialog />
      <EnvSetupDialog
        open={envSetup.dialogOpen}
        onOpenChange={envSetup.setDialogOpen}
        instanceName={envSetup.instanceName}
        envShPath={envSetup.envShPath}
        onAddToProfile={envSetup.handleAddToProfile}
        onClose={envSetup.handleClose}
        profileMessage={envSetup.profileMessage}
        profileError={envSetup.profileError}
        isAddingToProfile={envSetup.isAddingToProfile}
        isK8sAvailable={envSetup.isK8sAvailable}
      />
    </div>
  );
}
