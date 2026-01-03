import { useState } from "react";
import { Input } from "./ui/input";
import { Label } from "./ui/label";

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
import { Probe } from "src/types/LimaConfig";
import Editor from '@monaco-editor/react';


interface Props {
    value: Probe[];
    onChange: (probes: Probe[]) => void;
}

export function ProbesDialog({ value: probes, onChange }: Props) {
    const [isProbesDialogOpen, setIsProbesDialogOpen] = useState(false);

    const updateArrayField = (index: number, subField: keyof Probe, value: any) => {
        const arr = [...(probes || [])];
        arr[index] = { ...arr[index], [subField]: value };
        onChange(arr);
    };

    const addArrayItem = (defaultItem: Probe) => {
        const arr = [...(probes || []), defaultItem];
        onChange(arr);
    };

    const removeArrayItem = (index: number) => {
        const arr = [...(probes || [])];
        arr.splice(index, 1);
        onChange(arr);
    };

    const hasInvalidProbe = probes?.some(p => !p.description?.trim() || !p.script?.trim());

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
            <div className="flex items-center justify-between w-full">
                <Label className="mb-0.5">Probes</Label>
                <DialogTrigger render={<Button variant="ghost" size="icon" className="size-7" />}>
                    {(!probes || probes.length === 0)
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
                    {probes?.map((p, idx) => (
                        <div key={idx} className="flex flex-col gap-2 p-3 border border-border/50 bg-muted/20 relative group">
                            <Button
                                variant="ghost"
                                size="icon"
                                className="absolute top-1 right-1 size-6 opacity-0 group-hover:opacity-100 transition-opacity"
                                onClick={() => removeArrayItem(idx)}
                            >
                                <Trash2Icon className="size-3 text-destructive" />
                            </Button>
                            <div className="grid gap-1">
                                <Label className="text-[10px] uppercase text-muted-foreground">Description</Label>
                                <Input
                                    value={p.description}
                                    onChange={(e) => updateArrayField(idx, 'description', e.target.value)}
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
                                        onChange={(val) => updateArrayField(idx, 'script', val || '')}
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
                                    onChange={(e) => updateArrayField(idx, 'hint', e.target.value)}
                                    className="h-7 text-[11px]"
                                />
                            </div>
                        </div>
                    ))}
                    <Button
                        variant="outline"
                        size="xs"
                        className="border-dashed"
                        onClick={() => addArrayItem({ description: '', script: '' })}
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
        </Dialog>
    );
}
