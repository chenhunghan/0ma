import { createContext, useContext } from "react";

interface LayoutOverride {
  forceDesktop: boolean;
}

export const LayoutOverrideContext = createContext<LayoutOverride | null>(null);

export function useLayoutOverride(): LayoutOverride | null {
  return useContext(LayoutOverrideContext);
}
