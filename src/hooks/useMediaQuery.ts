import { useEffect, useState } from "react";
import { useLayoutOverride } from "src/contexts/LayoutOverrideContext";

export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(() => {
    if (typeof window !== "undefined") {
      return window.matchMedia(query).matches;
    }
    return false;
  });

  useEffect(() => {
    const media = window.matchMedia(query);
    const listener = (event: MediaQueryListEvent) => setMatches(event.matches);

    media.addEventListener("change", listener);
    return () => media.removeEventListener("change", listener);
  }, [query]);

  return matches;
}

export function useIsMobile() {
  const override = useLayoutOverride();
  const isMobile = useMediaQuery("(max-width: 767px)");
  // When forceDesktop is set, always report as non-mobile
  if (override?.forceDesktop) return false;
  return isMobile;
}
