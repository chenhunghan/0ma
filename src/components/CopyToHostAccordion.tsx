import type { CopyToHost } from "src/types/LimaConfig";

import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "./ui/accordion";

export function CopyToHostAccordion({ value: rules }: { value: CopyToHost[] }) {
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

  return (
    rules.length > 0 && (
      <Accordion className="w-full min-w-0">
        {rules.map((rule, idx) => (
          <AccordionItem
            value={`cth-${rule.guest}-${rule.host}-${rule.deleteOnStop ? "true" : "false"}`}
            key={`${rule.guest}-${rule.host}-${rule.deleteOnStop ? "true" : "false"}`}
            className="border-border/40"
          >
            <AccordionTrigger className="text-[11px] py-1.5 px-2 hover:bg-muted/50 hover:no-underline transition-colors tracking-tight text-muted-foreground font-semibold">
              <div className="flex items-center gap-2 overflow-hidden flex-1 min-w-0">
                <span className="text-[10px] bg-muted px-1 rounded text-foreground/70 shrink-0">
                  {idx + 1}
                </span>
                <span className="truncate" title={rule.guest}>
                  {truncatePath(rule.guest)}
                </span>
                <span className="text-muted-foreground/50 shrink-0">→</span>
                <span className="truncate" title={rule.host}>
                  {truncatePath(rule.host)}
                </span>
              </div>
            </AccordionTrigger>
            <AccordionContent className="p-2 bg-muted/10">
              <div className="flex flex-col gap-1 text-[10px] font-mono text-muted-foreground/80 bg-zinc-950/50 p-2 rounded border border-border/20">
                <div className="flex justify-between items-start">
                  <span className="shrink-0">Guest Path:</span>
                  <span className="text-foreground/70 break-all ml-4 text-right">{rule.guest}</span>
                </div>
                <div className="flex justify-between items-start">
                  <span className="shrink-0">Host Path:</span>
                  <span className="text-foreground/70 break-all ml-4 text-right">{rule.host}</span>
                </div>
                <div className="flex justify-between">
                  <span>Delete on Stop:</span>
                  <span className="text-foreground/70">{rule.deleteOnStop ? "true" : "false"}</span>
                </div>
              </div>
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    )
  );
}
