import { useMemo } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { TauriStoreProvider } from "src/providers/tauri-store-provider";
import { ThemeProvider } from "src/providers/theme-provider";
import { App } from "src/App";
import type { AppProps } from "src/App";

/**
 * Wraps <App /> in its own QueryClient + TauriStore so each demo instance
 * has fully independent state. Switching instances in one demo won't
 * affect other demos on the page.
 */
export function IsolatedApp(props: AppProps) {
  const queryClient = useMemo(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: { retry: false, refetchOnWindowFocus: false },
        },
      }),
    [],
  );

  return (
    <QueryClientProvider client={queryClient}>
      <TauriStoreProvider>
        <ThemeProvider defaultTheme="dark" storageKey="theme">
          <App {...props} />
        </ThemeProvider>
      </TauriStoreProvider>
    </QueryClientProvider>
  );
}
