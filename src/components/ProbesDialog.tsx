import { useState } from "react";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { useLimaDraft } from "src/hooks/useLimaDraft";
import {
    Dialog,
    DialogClose,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "./ui/dialog";
import { Button } from "./ui/button";
import { Trash2Icon, PlusIcon, PencilIcon } from "lucide-react";
import { LimaConfig } from "src/types/LimaConfig";
import Editor from '@monaco-editor/react';
import {
    Accordion,
    AccordionContent,
    AccordionItem,
    AccordionTrigger,
} from "./ui/accordion";
import { useSelectedInstance } from "src/hooks/useSelectedInstance";

export function ProbesDialog() {
    const { selectedName } = useSelectedInstance();
    const {
        draftConfig,
        updateField
    } = useLimaDraft(selectedName);

    const [isProbesDialogOpen, setIsProbesDialogOpen] = useState(false);

    const updateArrayField = (field: keyof LimaConfig, index: number, subField: string, value: any) => {
        const arr = [...((draftConfig?.[field] as any[]) || [])];
        arr[index] = { ...arr[index], [subField]: value };
        updateField(field, arr);
    };

    const addArrayItem = (field: keyof LimaConfig, defaultItem: any) => {
        const arr = [...((draftConfig?.[field] as any[]) || []), defaultItem];
        updateField(field, arr);
    };

    const removeArrayItem = (field: keyof LimaConfig, index: number) => {
        const arr = [...((draftConfig?.[field] as any[]) || [])];
        arr.splice(index, 1);
        updateField(field, arr);
    };

    const hasInvalidProbe = draftConfig?.probes?.some(p => !p.description?.trim() || !p.script?.trim());

    return (
        <Dialog
            open={isProbesDialogOpen}
            onOpenChange={(open) => {
                if (!open && hasInvalidProbe) {
                    return;
                }
                setIsProbesDialogOpen(open);
            }}
        >
            <div className="flex items-center justify-between">
                <Label className="mb-0.5">Probes</Label>
                <DialogTrigger render={<Button variant="ghost" size="icon" className="size-7" />}>
                    {(!draftConfig?.probes || draftConfig.probes.length === 0)
                        ? <PlusIcon className="size-2.5 mr-[4px]" />
                        : <PencilIcon className="size-2.5 mr-[4px]" />
                    }
                </DialogTrigger>
            </div>

            <DialogContent
                className="sm:max-w-md"
                showCloseButton={!hasInvalidProbe}
            >
                <DialogHeader>
                    <DialogTitle>Configure Probes</DialogTitle>
                    <DialogDescription>
                        Add probes to check if the VM is ready.
                    </DialogDescription>
                </DialogHeader>
                <div className="flex flex-col gap-4 py-4 overflow-y-auto max-h-[60vh] pr-1">
                    {draftConfig?.probes?.map((p, idx) => (
                        <div key={idx} className="flex flex-col gap-2 p-3 border border-border/50 bg-muted/20 relative group">
                            <Button
                                variant="ghost"
                                size="icon"
                                className="absolute top-1 right-1 size-6 opacity-0 group-hover:opacity-100 transition-opacity"
                                onClick={() => removeArrayItem('probes', idx)}
                            >
                                <Trash2Icon className="size-3 text-destructive" />
                            </Button>
                            <div className="grid gap-1">
                                <Label className="text-[10px] uppercase text-muted-foreground">Description</Label>
                                <Input
                                    value={p.description}
                                    onChange={(e) => updateArrayField('probes', idx, 'description', e.target.value)}
                                    className="h-7 text-[11px]"
                                />
                            </div>
                            <div className="grid gap-1">
                                <Label className="text-[10px] uppercase text-muted-foreground">Script</Label>
                                <div className="min-h-[100px] border border-border/50 rounded-md overflow-hidden bg-zinc-950">
                                    <Editor
                                        defaultLanguage="shell"
                                        theme="vs-dark"
                                        value={p.script}
                                        onChange={(val) => updateArrayField('probes', idx, 'script', val || '')}
                                        options={{
                                            minimap: { enabled: false },
                                            fontSize: 11,
                                            lineNumbers: 'off',
                                            scrollBeyondLastLine: false,
                                            automaticLayout: true,
                                            padding: { top: 8, bottom: 8 },
                                            glyphMargin: false,
                                            folding: false,
                                            lineDecorationsWidth: 0,
                                            lineNumbersMinChars: 3,
                                            scrollbar: {
                                                verticalScrollbarSize: 6,
                                                horizontalScrollbarSize: 6,
                                            },
                                        }}
                                    />
                                </div>
                            </div>
                            <div className="grid gap-1">
                                <Label className="text-[10px] uppercase text-muted-foreground">Hint (Optional)</Label>
                                <Input
                                    value={p.hint || ''}
                                    onChange={(e) => updateArrayField('probes', idx, 'hint', e.target.value)}
                                    className="h-7 text-[11px]"
                                />
                            </div>
                        </div>
                    ))}
                    <Button
                        variant="outline"
                        size="xs"
                        className="border-dashed"
                        onClick={() => addArrayItem('probes', { description: '', script: '' })}
                    >
                        <PlusIcon className="size-3 mr-1" /> Add Probe
                    </Button>
                </div>
                {hasInvalidProbe && (
                    <p className="text-[10px] text-destructive font-medium animate-pulse">
                        All probes must have a description and script.
                    </p>
                )}
                <DialogFooter>
                    <DialogClose
                        disabled={hasInvalidProbe}
                        render={<Button variant="outline" size="sm" />}
                    >
                        Done
                    </DialogClose>
                </DialogFooter>
            </DialogContent>

            {draftConfig?.probes && draftConfig.probes.length > 0 && (
                <Accordion className="w-full">
                    {draftConfig.probes.map((p, idx) => (
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
            )}
        </Dialog>
    );
}
