import { createContext, useContext, useEffect } from "react";
import { useTauriStore, useTauriStoreValue } from "./tauri-store-provider";

type Theme = "dark" | "light" | "system";

interface ThemeProviderProps {
  children: React.ReactNode;
  defaultTheme: Theme;
  storageKey: string;
}

interface ThemeProviderState {
  theme: Theme;
  setTheme: (theme: Theme) => void;
}

const initialState: ThemeProviderState = {
  setTheme: () => null,
  theme: "system",
};

const ThemeProviderContext = createContext<ThemeProviderState>(initialState);

export function ThemeProvider({
  children,
  defaultTheme,
  storageKey,
  ...props
}: ThemeProviderProps) {
  const { set } = useTauriStore();
  const { data: storedTheme, isLoading } = useTauriStoreValue<Theme>(storageKey);

  const theme = (isLoading ? defaultTheme : storedTheme) || defaultTheme;

  useEffect(() => {
    const root = window.document.documentElement;

    root.classList.remove("light", "dark");

    if (theme === "system") {
      const systemTheme = window.matchMedia("(prefers-color-scheme: dark)").matches
        ? "dark"
        : "light";

      root.classList.add(systemTheme);
      return;
    }

    root.classList.add(theme);
  }, [theme]);

  const value = {
    setTheme: (theme: Theme) => {
      set(storageKey, theme);
    },
    theme,
  };

  return (
    <ThemeProviderContext.Provider {...props} value={value}>
      {children}
    </ThemeProviderContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export const useTheme = () => {
  const context = useContext(ThemeProviderContext);

  if (context === undefined) {throw new Error("useTheme must be used within a ThemeProvider");}

  return context;
};
