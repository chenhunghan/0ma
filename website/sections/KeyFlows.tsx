import { ScrollReveal } from "../components/ScrollReveal";

const flows = [
  {
    title: "1. Pick a template",
    description:
      "Choose Docker or Kubernetes, set CPUs, memory, and disk — 0ma provisions a full Linux VM in seconds. No account required.",
    params: "?autoOpen=create",
  },
  {
    title: "2. Customize everything",
    description:
      "Fine-tune your VM with a Monaco YAML editor or visual controls. Mounts, port forwards, provisioning scripts — all validated in real time.",
    params: "?autoTab=config",
  },
  {
    title: "3. Work inside the VM",
    description:
      "SSH into your VM without leaving the app. Run docker, kubectl, or anything else with multiple terminal tabs and split panes.",
    params: "?terminals=docker,kubectl",
  },
  {
    title: "4. Use docker from your Mac",
    description:
      "One click adds DOCKER_HOST and KUBECONFIG to your shell profile. After that, docker and kubectl on your Mac talk directly to the Lima VM — no extra setup.",
    params: "?autoEnvSetup",
  },
];

export function KeyFlows() {
  const base = import.meta.env.BASE_URL ?? "/";
  const frameSrc = `${base}demo-frame.html`;

  return (
    <section id="key-flows" className="py-24 px-6">
      <div className="max-w-5xl mx-auto">
        <ScrollReveal>
          <h2 className="text-2xl font-bold text-foreground text-center mb-4">
            Up and running in a minute
          </h2>
          <p className="text-sm text-muted-foreground text-center mb-16 max-w-lg mx-auto">
            Download, create a VM, and start running containers — no account needed.
          </p>
        </ScrollReveal>

        <div className="space-y-20">
          {flows.map((flow, i) => (
            <ScrollReveal key={flow.title} delay={i * 100}>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
                <div className={`flex flex-col gap-3 ${i % 2 === 1 ? "lg:order-2" : ""}`}>
                  <span className="text-[10px] text-muted-foreground/50 font-medium tracking-wider uppercase">
                    Flow {i + 1}
                  </span>
                  <h3 className="text-lg font-bold text-foreground">{flow.title}</h3>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    {flow.description}
                  </p>
                </div>

                {/* Outer: border + shadow */}
                <div
                  className="rounded-[10px] border border-[oklch(1_0_0/15%)]"
                  style={{
                    boxShadow: `
                      0 4px 6px -1px oklch(0 0 0 / 20%),
                      0 25px 50px -12px oklch(0 0 0 / 40%)
                    `,
                  }}
                >
                  {/* Inner: clips content */}
                  <div className="demo-app-container-sm rounded-[9px] overflow-hidden bg-background">
                    {/* macOS title bar */}
                    <div className="flex items-center px-4 h-9 bg-[oklch(0.18_0.005_285.8)] border-b border-[oklch(1_0_0/8%)] relative">
                      <div className="flex gap-2 items-center">
                        <div className="w-3 h-3 rounded-full bg-[#ff5f57] border border-[#e0443e]" />
                        <div className="w-3 h-3 rounded-full bg-[#febc2e] border border-[#dea123]" />
                        <div className="w-3 h-3 rounded-full bg-[#28c840] border border-[#1aab29]" />
                      </div>
                      <span className="text-[11px] text-muted-foreground/60 absolute left-1/2 -translate-x-1/2">
                        0ma
                      </span>
                    </div>
                    <iframe
                      src={`${frameSrc}${flow.params}`}
                      title={`Demo: ${flow.title}`}
                      className="w-full border-0"
                      style={{ height: "calc(100% - 36px)" }}
                    />
                  </div>
                </div>
              </div>
            </ScrollReveal>
          ))}
        </div>
      </div>
    </section>
  );
}
