import { isSocketForward, type PortForward } from "src/types/LimaConfig";

import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "./ui/accordion";

const truncatePath = (path: string, maxLength: number = 20) => {
  if (!path) {
    return "";
  }
  if (path.length <= maxLength) {
    return path;
  }
  const half = Math.floor((maxLength - 3) / 2);
  return `${path.slice(0, half)}...${path.slice(-half)}`;
};

export function PortForwardsAccordion({ value: portForwards }: { value: PortForward[] }) {
  const socketForwards = portForwards.filter(isSocketForward);
  const portBasedForwards = portForwards.filter((pf) => !isSocketForward(pf));

  return (
    (socketForwards.length > 0 || portBasedForwards.length > 0) && (
      <Accordion className="w-full">
        {socketForwards.map((pf) => (
          <AccordionItem
            value={`sock-${pf.guestSocket ?? ""}-${pf.hostSocket ?? ""}`}
            key={`sock-${pf.guestSocket ?? ""}-${pf.hostSocket ?? ""}`}
            className="border-border/40"
          >
            <AccordionTrigger className="text-[11px] py-1.5 px-2 hover:bg-muted/50 hover:no-underline transition-colors tracking-tight text-muted-foreground font-semibold">
              <div className="flex items-center gap-2 overflow-hidden flex-1 min-w-0">
                <span className="text-[10px] bg-violet-500/20 text-violet-400 px-1 rounded shrink-0 uppercase">
                  sock
                </span>
                <span className="truncate font-mono text-[10px]" title={pf.guestSocket}>
                  {truncatePath(pf.guestSocket ?? "")}
                </span>
                <span className="text-muted-foreground/50 shrink-0">→</span>
                <span className="truncate font-mono text-[10px]" title={pf.hostSocket}>
                  {truncatePath(pf.hostSocket ?? "")}
                </span>
              </div>
            </AccordionTrigger>
            <AccordionContent className="p-2 bg-muted/10">
              <div className="flex flex-col gap-1 text-[10px] font-mono text-muted-foreground/80 bg-zinc-950/50 p-2 rounded border border-border/20">
                <div className="flex justify-between items-start">
                  <span className="shrink-0">Guest Socket:</span>
                  <span className="text-foreground/70 break-all ml-4 text-right">
                    {pf.guestSocket}
                  </span>
                </div>
                <div className="flex justify-between items-start">
                  <span className="shrink-0">Host Socket:</span>
                  <span className="text-foreground/70 break-all ml-4 text-right">
                    {pf.hostSocket}
                  </span>
                </div>
              </div>
            </AccordionContent>
          </AccordionItem>
        ))}
        {portBasedForwards.map((pf) => (
          <AccordionItem
            value={`pf-${pf.proto ?? "tcp"}-${pf.guestPort ?? "0"}-${pf.hostPort ?? "0"}-${pf.hostIP ?? "127.0.0.1"}-${pf.guestIPMustBeZero ? "true" : "false"}`}
            key={`${pf.proto ?? "tcp"}-${pf.guestPort ?? "0"}-${pf.hostPort ?? "0"}-${pf.hostIP ?? "127.0.0.1"}-${pf.guestIPMustBeZero ? "true" : "false"}`}
            className="border-border/40"
          >
            <AccordionTrigger className="text-[11px] py-1.5 px-2 hover:bg-muted/50 hover:no-underline transition-colors tracking-tight text-muted-foreground font-semibold">
              <div className="flex items-center gap-2">
                <span className="text-[10px] bg-muted px-1 rounded text-foreground/70 uppercase">
                  {pf.proto || "tcp"}
                </span>
                <span className="font-mono text-[10px]">{pf.guestPort}</span>
                <span className="text-muted-foreground/50">→</span>
                <span className="font-mono text-[10px]">{pf.hostPort}</span>
              </div>
            </AccordionTrigger>
            <AccordionContent className="p-2 bg-muted/10">
              <div className="flex flex-col gap-1 text-[10px] font-mono text-muted-foreground/80 bg-zinc-950/50 p-2 rounded border border-border/20">
                <div className="flex justify-between items-start">
                  <span className="shrink-0">Guest IP (Must Be Zero):</span>
                  <span className="text-foreground/70 ml-4 text-right">
                    {pf.guestIPMustBeZero ? "true" : "false"}
                  </span>
                </div>
                <div className="flex justify-between items-start">
                  <span className="shrink-0">Host IP:</span>
                  <span className="text-foreground/70 break-all ml-4 text-right">
                    {pf.hostIP || "127.0.0.1"}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Protocol:</span>
                  <span className="text-foreground/70 uppercase">{pf.proto || "tcp"}</span>
                </div>
              </div>
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    )
  );
}
