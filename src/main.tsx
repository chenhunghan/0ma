import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import React from "react";
import ReactDOM from "react-dom/client";

import "./index.css";
import { ThemeProvider } from "./providers/theme-provider";
import { App } from "./_App";

const queryClient = new QueryClient();

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <ThemeProvider defaultTheme="dark" storageKey="0ma-theme">
        <App />
      </ThemeProvider>
    </QueryClientProvider>
  </React.StrictMode>,
);
