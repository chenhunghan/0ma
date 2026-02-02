import type { Image } from "src/types/LimaConfig";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "./ui/accordion";

export function ImageAccordion({ value: images }: { value: Image[] }) {
  return (
    images.length > 0 && (
      <Accordion className="w-full min-w-0">
        {images.map((image, idx) => (
          <AccordionItem value={`image-${idx}`} key={idx} className="border-border/40">
            <AccordionTrigger className="text-[11px] py-1.5 px-2 hover:bg-muted/50 hover:no-underline transition-colors tracking-tight text-muted-foreground font-semibold">
              <div className="flex items-center gap-2 overflow-hidden flex-1 min-w-0">
                <span className="text-[10px] bg-muted px-1 rounded text-foreground/70 shrink-0">
                  {idx + 1}
                </span>
                <span className="uppercase text-[9px] shrink-0 opacity-70">
                  {image.arch || "x86_64"}
                </span>
                <span className="truncate opacity-80" title={image.location}>
                  {image.location?.slice(0, 10)}...{image.location?.slice(-20)}
                </span>
              </div>
            </AccordionTrigger>
            <AccordionContent className="p-2 bg-muted/10">
              <div className="flex flex-col gap-1 text-[10px] font-mono text-muted-foreground/80 bg-zinc-950/50 p-2 rounded border border-border/20">
                <div className="flex justify-between items-start">
                  <span className="shrink-0">Location:</span>
                  <span className="text-foreground/70 break-all ml-4 text-right">
                    {image.location}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Architecture:</span>
                  <span className="text-foreground/70 uppercase">{image.arch || "x86_64"}</span>
                </div>
              </div>
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    )
  );
}
