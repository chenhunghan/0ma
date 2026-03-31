import {
  ContainerIcon,
  FileCodeIcon,
  TerminalIcon,
  ZapIcon,
  FeatherIcon,
  ShieldCheckIcon,
} from "lucide-react";
import { ScrollReveal } from "../components/ScrollReveal";

const features = [
  {
    icon: ContainerIcon,
    title: "Docker & Kubernetes",
    description: "One-click Docker or K8s setup. Run containers, manage pods, and deploy services — same workflow as Docker Desktop, without the overhead.",
  },
  {
    icon: FeatherIcon,
    title: "Tiny Footprint",
    description: "~15 MB app. Minimal CPU and memory in the background. Built with Tauri and Rust — not a memory-hungry Electron wrapper.",
  },
  {
    icon: TerminalIcon,
    title: "Built-in Terminal",
    description: "SSH into your Linux VM without leaving the app. Multiple tabs, split panes, and WebGL-rendered xterm — run docker, kubectl, or anything.",
  },
  {
    icon: FileCodeIcon,
    title: "Visual Config Editor",
    description: "Edit Lima YAML with Monaco, or use visual controls for CPUs, memory, port forwards, mounts, and provisioning. Real-time validation included.",
  },
  {
    icon: ZapIcon,
    title: "Auto Environment Setup",
    description: "One click sets DOCKER_HOST and KUBECONFIG in your shell profile. Your local docker and kubectl commands just work — no manual config.",
  },
  {
    icon: ShieldCheckIcon,
    title: "100% Open Source",
    description: "MIT / Apache-2.0. Powered by Lima — the same engine behind Colima and Rancher Desktop. No account required, no telemetry.",
  },
];

export function FeatureHighlights() {
  return (
    <section id="features" className="py-24 px-6">
      <div className="max-w-5xl mx-auto">
        <ScrollReveal>
          <h2 className="text-2xl font-bold text-foreground text-center mb-4">
            Containers, Kubernetes, and a terminal. That&apos;s it.
          </h2>
          <p className="text-sm text-muted-foreground text-center mb-16 max-w-lg mx-auto">
            No bloated runtimes, no walled gardens. Just the tools you need in a native macOS app.
          </p>
        </ScrollReveal>

        <ScrollReveal className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-px bg-border">
          {features.map((feature) => (
            <div
              key={feature.title}
              className="stagger-child bg-background p-6 flex flex-col gap-3"
            >
              <feature.icon className="size-5 text-muted-foreground" />
              <h3 className="text-sm font-medium text-foreground">{feature.title}</h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                {feature.description}
              </p>
            </div>
          ))}
        </ScrollReveal>
      </div>
    </section>
  );
}
