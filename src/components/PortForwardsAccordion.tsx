import { useSelectedInstance } from "src/hooks/useSelectedInstance";
import { useLimaDraft } from "src/hooks/useLimaDraft";
import {
    Accordion,
    AccordionContent,
    AccordionItem,
    AccordionTrigger,
} from "./ui/accordion";

export function PortForwardsAccordion() {
    const { selectedName } = useSelectedInstance();
    const { draftConfig } = useLimaDraft(selectedName);

    const portForwards = draftConfig?.portForwards || [];

    return (
        portForwards.length > 0 && (
            <Accordion className="w-full">
                {portForwards.map((pf, idx) => (
                    <AccordionItem value={`pf-${idx}`} key={idx} className="border-border/40">
                        <AccordionTrigger className="text-[11px] py-1.5 px-2 hover:bg-muted/50 hover:no-underline transition-colors tracking-tight text-muted-foreground font-semibold">
                            <div className="flex items-center gap-2">
                                <span className="text-[10px] bg-muted px-1 rounded text-foreground/70 uppercase">{pf.proto || 'tcp'}</span>
                                <span className="font-mono text-[10px]">{pf.guestPort}</span>
                                <span className="text-muted-foreground/50">→</span>
                                <span className="font-mono text-[10px]">{pf.hostPort}</span>
                            </div>
                        </AccordionTrigger>
                        <AccordionContent className="p-2 bg-muted/10">
                            <div className="flex flex-col gap-1 text-[10px] font-mono text-muted-foreground/80 bg-zinc-950/50 p-2 rounded border border-border/20">
                                <div className="flex justify-between items-start">
                                    <span className="shrink-0">Guest IP (Must Be Zero):</span>
                                    <span className="text-foreground/70 ml-4 text-right">{pf.guestIPMustBeZero ? 'true' : 'false'}</span>
                                </div>
                                <div className="flex justify-between items-start">
                                    <span className="shrink-0">Host IP:</span>
                                    <span className="text-foreground/70 break-all ml-4 text-right">{pf.hostIP || '127.0.0.1'}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span>Protocol:</span>
                                    <span className="text-foreground/70 uppercase">{pf.proto || 'tcp'}</span>
                                </div>
                            </div>
                        </AccordionContent>
                    </AccordionItem>
                ))}
            </Accordion>
        )
    );
}
