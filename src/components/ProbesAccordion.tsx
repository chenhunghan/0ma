import { useSelectedInstance } from "src/hooks/useSelectedInstance";
import { useLimaDraft } from "src/hooks/useLimaDraft";
import {
    Accordion,
    AccordionContent,
    AccordionItem,
    AccordionTrigger,
} from "./ui/accordion";
import Editor from '@monaco-editor/react';
import { LimaConfig } from "src/types/LimaConfig";

export function ProbesAccordion() {
    const { selectedName } = useSelectedInstance();
    const { draftConfig, updateField } = useLimaDraft(selectedName);

    const probes = draftConfig?.probes || [];

    const updateArrayField = (field: keyof LimaConfig, index: number, subField: string, value: any) => {
        const arr = [...((draftConfig?.[field] as any[]) || [])];
        arr[index] = { ...arr[index], [subField]: value };
        updateField(field, arr);
    };

    return (
        probes.length > 0 && (
            <Accordion className="w-full">
                {probes.map((p, idx) => (
                    <AccordionItem value={`probe-${idx}`} key={idx} className="border-border/40">
                        <AccordionTrigger className="text-[11px] py-1.5 px-2 hover:bg-muted/50 hover:no-underline transition-colors tracking-tight text-muted-foreground font-semibold">
                            <div className="flex items-center gap-2">
                                <span className="text-[10px] bg-muted px-1 rounded text-foreground/70">{idx + 1}</span>
                                {p.description || 'unnamed'}
                            </div>
                        </AccordionTrigger>
                        <AccordionContent className="p-2 bg-muted/10">
                            <div className="h-[80px] border border-border/40 rounded overflow-hidden bg-zinc-950/50">
                                <Editor
                                    height="100%"
                                    defaultLanguage="shell"
                                    theme="vs-dark"
                                    value={p.script}
                                    onChange={(val) => updateArrayField('probes', idx, 'script', val || '')}
                                    options={{
                                        minimap: { enabled: false },
                                        fontSize: 10,
                                        lineNumbers: 'off',
                                        scrollBeyondLastLine: false,
                                        automaticLayout: true,
                                        padding: { top: 4, bottom: 4 },
                                        glyphMargin: false,
                                        folding: false,
                                        lineDecorationsWidth: 0,
                                        lineNumbersMinChars: 0,
                                        overviewRulerLanes: 0,
                                        hideCursorInOverviewRuler: true,
                                        wordWrap: 'on',
                                        scrollbar: {
                                            verticalScrollbarSize: 4,
                                            horizontalScrollbarSize: 4,
                                        },
                                    }}
                                />
                            </div>
                            {p.hint && (
                                <div className="mt-2 text-[9px] text-muted-foreground italic border-t border-border/20 pt-1">
                                    Hint: {p.hint}
                                </div>
                            )}
                        </AccordionContent>
                    </AccordionItem>
                ))}
            </Accordion>
        )
    );
}
