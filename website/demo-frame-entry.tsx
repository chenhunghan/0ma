import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import ReactDOM from "react-dom/client";

import "./website.css";
import { ThemeProvider } from "src/providers/theme-provider";
import { TauriStoreProvider } from "src/providers/tauri-store-provider";
import { App } from "src/App";
import type { AppProps } from "src/App";
import type { TabGroup } from "src/components/TermTabs";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: false, refetchOnWindowFocus: false },
  },
});

// Parse URL params for demo configuration
const params = new URLSearchParams(window.location.search);

// Build initial terminal tabs from ?terminals=docker,kubectl
const terminalsParam = params.get("terminals");
let appProps: AppProps = {};

if (terminalsParam) {
  const terminalNames = terminalsParam.split(",");
  let nextId = 1;
  const tabs: TabGroup[] = terminalNames.map((name) => {
    const tabId = `tab-${nextId}`;
    const termId = nextId;
    nextId++;
    const isKubectl = name === "kubectl";
    return {
      id: tabId,
      name,
      terminals: [
        {
          id: termId,
          name,
          ...(isKubectl
            ? { command: "limactl", args: ["shell", "k8s-cluster"] }
            : {}),
        },
      ],
    };
  });
  appProps = {
    initialLimaTabs: tabs,
    initialLimaActive: tabs[0].id,
  };
}

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <QueryClientProvider client={queryClient}>
    <TauriStoreProvider>
      <ThemeProvider defaultTheme="dark" storageKey="theme">
        <App {...appProps} />
      </ThemeProvider>
    </TauriStoreProvider>
  </QueryClientProvider>,
);

// Auto-open dialogs after render
const autoOpen = params.get("autoOpen");
if (autoOpen === "create") {
  setTimeout(() => {
    const btn = document.querySelector<HTMLButtonElement>('[aria-label="Create new Lima instance"]');
    btn?.click();
  }, 1500);
}

// Auto-trigger env setup dialog
if (params.has("autoEnvSetup")) {
  setTimeout(() => {
    const btn = document.querySelector<HTMLButtonElement>('[title="Environment setup"]');
    btn?.click();
  }, 1500);
}
