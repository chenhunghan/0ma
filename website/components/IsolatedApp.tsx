import { useMemo } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { TauriStoreProvider } from "src/providers/tauri-store-provider";
import { ThemeProvider } from "src/providers/theme-provider";
import { LayoutOverrideContext } from "src/contexts/LayoutOverrideContext";
import { App } from "src/App";
import type { AppProps } from "src/App";

interface IsolatedAppProps extends AppProps {
  /** Force desktop layout regardless of viewport width */
  forceDesktop?: boolean;
}

/**
 * Wraps <App /> in its own QueryClient + TauriStore so each demo instance
 * has fully independent state. Switching instances in one demo won't
 * affect other demos on the page.
 */
export function IsolatedApp({ forceDesktop = false, ...appProps }: IsolatedAppProps) {
  const queryClient = useMemo(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: { retry: false, refetchOnWindowFocus: false },
        },
      }),
    [],
  );

  const layoutOverride = useMemo(() => ({ forceDesktop }), [forceDesktop]);

  return (
    <QueryClientProvider client={queryClient}>
      <TauriStoreProvider>
        <ThemeProvider defaultTheme="dark" storageKey="theme">
          <LayoutOverrideContext.Provider value={layoutOverride}>
            <App {...appProps} />
          </LayoutOverrideContext.Provider>
        </ThemeProvider>
      </TauriStoreProvider>
    </QueryClientProvider>
  );
}
