import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import ReactDOM from "react-dom/client";

import "./website.css";
import { ThemeProvider } from "src/providers/theme-provider";
import { TauriStoreProvider } from "src/providers/tauri-store-provider";
import { WebsitePage } from "./WebsitePage";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
      refetchOnWindowFocus: false,
    },
  },
});

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <QueryClientProvider client={queryClient}>
    <TauriStoreProvider>
      <ThemeProvider defaultTheme="dark" storageKey="theme">
        <WebsitePage />
      </ThemeProvider>
    </TauriStoreProvider>
  </QueryClientProvider>,
);
