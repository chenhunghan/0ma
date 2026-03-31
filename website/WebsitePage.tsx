import { Nav } from "./components/Nav";
import { Hero } from "./sections/Hero";
import { FeatureHighlights } from "./sections/FeatureHighlights";
import { KeyFlows } from "./sections/KeyFlows";
import { Footer } from "./sections/Footer";

export function WebsitePage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <Nav />
      <Hero />
      <FeatureHighlights />
      <KeyFlows />
      <Footer />
    </div>
  );
}
