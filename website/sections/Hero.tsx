import { AnimatedBackground } from "../components/AnimatedBackground";
import { AppFrame } from "../components/AppFrame";
import { IsolatedApp } from "../components/IsolatedApp";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "src/components/ui/tooltip";
import type { TabGroup } from "src/components/TermTabs";

const DEMO_INITIAL_TABS: TabGroup[] = [
  {
    id: "tab-1",
    name: "Terminal",
    terminals: [{ id: 1, name: "Terminal" }],
  },
  {
    id: "tab-2",
    name: "kubectl",
    terminals: [
      {
        id: 2,
        name: "kubectl",
        command: "limactl",
        args: ["shell", "k8s-cluster"],
      },
    ],
  },
];

export function Hero() {
  return (
    <section className="relative px-6 pt-28 pb-24">
      <AnimatedBackground />

      <div className="relative z-10 max-w-3xl mx-auto text-center">
        <img
          src={`${import.meta.env.BASE_URL}icon.png`}
          alt="0ma"
          width={96}
          height={96}
          className="mx-auto mb-6 animate-fade-in-up"
        />

        <p className="text-xs text-muted-foreground/60 font-medium tracking-widest uppercase mb-4 animate-fade-in-up">
          Open-source Docker Desktop alternative
        </p>

        <h1 className="text-4xl md:text-6xl font-bold text-foreground tracking-tight animate-fade-in-up" style={{ animationDelay: "80ms" }}>
          Fast, light, and
          <br />
          <span className="text-muted-foreground">fully open source.</span>
        </h1>

        <p className="mt-6 text-sm md:text-base text-muted-foreground max-w-xl mx-auto animate-fade-in-up" style={{ animationDelay: "150ms" }}>
          0ma is a ~15 MB desktop app for running Docker and Kubernetes on macOS.
          Open source, powered by Lima — no account required, no gigabyte installs.
        </p>

        <div className="mt-10 animate-fade-in-up" style={{ animationDelay: "300ms" }}>
          <div className="inline-flex items-center gap-2 px-4 py-2.5 bg-secondary/80 border border-border rounded-md font-mono text-xs text-foreground select-all">
            brew install chenhunghan/tap/0ma
          </div>
          <div className="mt-4 flex items-center justify-center gap-4">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger render={
                  <a
                    href="https://github.com/chenhunghan/0ma/releases"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-muted-foreground hover:text-foreground transition-colors underline underline-offset-4"
                  >
                    Download from GitHub Releases
                  </a>
                } />
                <TooltipContent>
                  You may need to run: xattr -cr /Applications/0ma.app
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
            <span className="text-muted-foreground/30">|</span>
            <a
              href="https://github.com/chenhunghan/0ma"
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-muted-foreground hover:text-foreground transition-colors underline underline-offset-4"
            >
              View on GitHub
            </a>
          </div>
        </div>

        <p className="mt-4 text-[10px] text-muted-foreground/50 animate-fade-in" style={{ animationDelay: "500ms" }}>
          Apple Silicon &amp; Intel &middot; MIT / Apache-2.0 &middot; ~15 MB download
        </p>
      </div>

      {/* App demo — scrollable on mobile, desktop layout forced */}
      <div className="relative z-10 max-w-6xl mx-auto mt-16 animate-fade-in-up demo-scroll-wrapper" style={{ animationDelay: "600ms" }}>
        <AppFrame title="0ma" className="demo-app-container">
          <IsolatedApp
            initialLimaTabs={DEMO_INITIAL_TABS}
            initialLimaActive="tab-1"
            autoSwitchInterval={8000}
            forceDesktop
          />
        </AppFrame>
      </div>
    </section>
  );
}
