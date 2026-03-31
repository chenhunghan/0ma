import { useCallback, useEffect, useState } from "react";

export function Nav() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 40);
    window.addEventListener("scroll", handler, { passive: true });
    return () => window.removeEventListener("scroll", handler);
  }, []);

  const scrollTo = useCallback((id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
  }, []);

  return (
    <nav
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled
          ? "nav-blur bg-background/70 border-b border-border py-2"
          : "bg-transparent py-4"
      }`}
    >
      <div className="max-w-6xl mx-auto px-6 flex items-center justify-between">
        <button
          onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
          className="text-foreground font-bold text-lg tracking-tight cursor-pointer hover:opacity-80 transition-opacity"
        >
          0ma
        </button>

        <div className="flex items-center gap-6 text-xs text-muted-foreground">
          <button
            onClick={() => scrollTo("features")}
            className="cursor-pointer hover:text-foreground transition-colors"
          >
            Features
          </button>
          <a
            href="https://github.com/chenhunghan/0ma"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-foreground transition-colors"
          >
            GitHub
          </a>
        </div>
      </div>
    </nav>
  );
}
