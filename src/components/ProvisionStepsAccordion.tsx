import type { Provision } from "src/types/LimaConfig";
import { getProvisionDescription } from "src/lib/provisionDescriptions";

import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "./ui/accordion";
import Editor from "@monaco-editor/react";

const READ_ONLY_EDITOR_OPTIONS = {
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
  padding: { bottom: 1, top: 1 },
  readOnly: true,
  scrollBeyondLastLine: false,
  scrollbar: {
    horizontalScrollbarSize: 4,
    verticalScrollbarSize: 4,
  },
  wordWrap: "on",
} as const;

export function ProvisionStepsAccordion({ value: provision }: { value: Provision[] }) {
  return (
    provision.length > 0 && (
      <Accordion className="w-full">
        {provision.map((p, idx) => {
          const description = getProvisionDescription(p.script);
          return (
            <AccordionItem
              value={`prov-${p.mode}-${p.script}`}
              key={`${p.mode}-${p.script}`}
              className="border-border/40"
            >
              <AccordionTrigger className="text-[11px] py-1.5 px-2 hover:bg-muted/50 hover:no-underline transition-colors uppercase tracking-tight text-muted-foreground font-semibold">
                <div className="flex items-center gap-2 overflow-hidden flex-1 min-w-0">
                  <span className="text-[10px] bg-muted px-1 rounded text-foreground/70 shrink-0">
                    {idx + 1}
                  </span>
                  <span className="shrink-0">{p.mode || "system"}</span>
                  {description && (
                    <span className="truncate opacity-60 normal-case text-[10px]">
                      {description}
                    </span>
                  )}
                </div>
              </AccordionTrigger>
              <AccordionContent className="p-2 bg-muted/10">
                <div className="h-[80px] border border-border/40 rounded overflow-hidden bg-zinc-950/50">
                  <Editor
                    height="100%"
                    defaultLanguage="shell"
                    theme="vs-dark"
                    value={p.script}
                    options={READ_ONLY_EDITOR_OPTIONS}
                  />
                </div>
              </AccordionContent>
            </AccordionItem>
          );
        })}
      </Accordion>
    )
  );
}
