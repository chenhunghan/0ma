import { IsolatedApp } from "../components/IsolatedApp";
import { AppFrame } from "../components/AppFrame";
import { ScrollReveal } from "../components/ScrollReveal";
import type { TabGroup } from "src/components/TermTabs";

// Pre-configured terminal tab so the demo starts with docker ps visible
const DEMO_INITIAL_TABS: TabGroup[] = [
  {
    id: "tab-1",
    name: "Terminal",
    terminals: [{ id: 1, name: "Terminal" }],
  },
];

export function AppDemo() {
  return (
    <section id="demo" className="py-24 px-6">
      <div className="max-w-6xl mx-auto">
        <ScrollReveal>
          <h2 className="text-2xl font-bold text-foreground text-center mb-4">
            Try it now
          </h2>
          <p className="text-sm text-muted-foreground text-center mb-12 max-w-lg mx-auto">
            This is the actual app running in your browser with mock data.
            Click around — switch instances, edit configs, explore the UI.
          </p>
        </ScrollReveal>

        <ScrollReveal delay={200}>
          <AppFrame title="0ma" className="demo-app-container">
            <IsolatedApp
              initialLimaTabs={DEMO_INITIAL_TABS}
              initialLimaActive="tab-1"
            />
          </AppFrame>
        </ScrollReveal>
      </div>
    </section>
  );
}
