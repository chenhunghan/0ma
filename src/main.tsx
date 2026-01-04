import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import React from "react";
import ReactDOM from "react-dom/client";

import "./index.css";
import { ThemeProvider } from "./providers/theme-provider";
import { App } from "./App";
import { TauriStoreProvider } from "./providers/tauri-store-provider";

const queryClient = new QueryClient();

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <TauriStoreProvider>
        <ThemeProvider defaultTheme="system" storageKey="theme">
          <App />
        </ThemeProvider>
      </TauriStoreProvider>
    </QueryClientProvider>
  </React.StrictMode>,
);
