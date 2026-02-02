import type { Provision } from "src/types/LimaConfig";

import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "./ui/accordion";
import Editor from "@monaco-editor/react";

export function ProvisionStepsAccordion({ value: provision }: { value: Provision[] }) {
  return (
    provision.length > 0 && (
      <Accordion className="w-full">
        {provision.map((p, idx) => (
          <AccordionItem value={`prov-${idx}`} key={idx} className="border-border/40">
            <AccordionTrigger className="text-[11px] py-1.5 px-2 hover:bg-muted/50 hover:no-underline transition-colors uppercase tracking-tight text-muted-foreground font-semibold">
              <div className="flex items-center gap-2">
                <span className="text-[10px] bg-muted px-1 rounded text-foreground/70">
                  {idx + 1}
                </span>
                {p.mode || "system"}
              </div>
            </AccordionTrigger>
            <AccordionContent className="p-2 bg-muted/10">
              <div className="h-[80px] border border-border/40 rounded overflow-hidden bg-zinc-950/50">
                <Editor
                  height="100%"
                  defaultLanguage="shell"
                  theme="vs-dark"
                  value={p.script}
                  options={{
                    automaticLayout: true,
                    folding: false,
                    fontSize: 10,
                    glyphMargin: false,
                    hideCursorInOverviewRuler: true,
                    lineDecorationsWidth: 0,
                    lineNumbers: "off",
                    lineNumbersMinChars: 0,
                    minimap: { enabled: false },
                    overviewRulerLanes: 0,
                    padding: { top: 1, bottom: 1 },
                    readOnly: true,
                    scrollBeyondLastLine: false,
                    scrollbar: {
                      verticalScrollbarSize: 4,
                      horizontalScrollbarSize: 4,
                    },
                    wordWrap: "on",
                  }}
                />
              </div>
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    )
  );
}
