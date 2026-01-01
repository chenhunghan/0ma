import { useState } from "react";
import { PlusIcon, PencilIcon, Trash2Icon } from "lucide-react";
import { Button } from "./ui/button";
import { Label } from "./ui/label";
import { Input } from "./ui/input";
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
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "./ui/select";
import { useLimaDraft } from "src/hooks/useLimaDraft";
import { useSelectedInstance } from "src/hooks/useSelectedInstance";
import {
    Accordion,
    AccordionContent,
    AccordionItem,
    AccordionTrigger,
} from "./ui/accordion";

export function CopyToHostDialog() {
    const { selectedName } = useSelectedInstance();
    const { draftConfig, updateField } = useLimaDraft(selectedName);
    const [isOpen, setIsOpen] = useState(false);

    const rules = draftConfig?.copyToHost || [];
    const hasInvalid = rules.some(c => !c.guest?.trim() || !c.host?.trim());

    const updateRule = (index: number, field: string, value: any) => {
        const newRules = [...rules];
        newRules[index] = { ...newRules[index], [field]: value };
        updateField('copyToHost', newRules);
    };

    const addRule = () => {
        updateField('copyToHost', [...rules, { guest: '', host: '', deleteOnStop: false }]);
    };

    const removeRule = (index: number) => {
        const newRules = [...rules];
        newRules.splice(index, 1);
        updateField('copyToHost', newRules);
    };

    const truncatePath = (path: string, maxLength: number = 20) => {
        if (!path) return '';
        if (path.length <= maxLength) return path;
        const half = Math.floor((maxLength - 3) / 2);
        return `${path.slice(0, half)}...${path.slice(-half)}`;
    };

    return (
        <div className="grid w-full items-center gap-1.5">
            <Dialog
                open={isOpen}
                onOpenChange={(open) => {
                    if (!open && hasInvalid) return;
                    setIsOpen(open);
                }}
            >
                <div className="flex items-center justify-between">
                    <Label className="mb-0.5">Copy to Host</Label>
                    <DialogTrigger render={<Button variant="ghost" size="icon" className="size-7" />}>
                        {(!rules || rules.length === 0)
                            ? <PlusIcon className="size-2.5 mr-[4px]" />
                            : <PencilIcon className="size-2.5 mr-[4px]" />
                        }
                    </DialogTrigger>
                </div>

                <DialogContent
                    className="sm:max-w-md"
                    showCloseButton={!hasInvalid}
                >
                    <DialogHeader>
                        <DialogTitle>Configure Copy to Host</DialogTitle>
                        <DialogDescription>
                            Copy files from the guest VM to the host machine.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="flex flex-col gap-4 py-4 overflow-y-auto max-h-[60vh] pr-1">
                        {rules.map((rule, idx) => (
                            <div key={idx} className="flex flex-col gap-2 p-3 border border-border/50 bg-muted/20 relative group">
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="absolute top-1 right-1 size-6 opacity-0 group-hover:opacity-100 transition-opacity"
                                    onClick={() => removeRule(idx)}
                                >
                                    <Trash2Icon className="size-3 text-destructive" />
                                </Button>
                                <div className="grid gap-1">
                                    <Label className="text-[10px] uppercase text-muted-foreground">Guest Path</Label>
                                    <Input
                                        value={rule.guest}
                                        onChange={(e) => updateRule(idx, 'guest', e.target.value)}
                                        placeholder="/path/in/guest"
                                        className="h-7 text-[11px]"
                                    />
                                </div>
                                <div className="grid gap-1">
                                    <Label className="text-[10px] uppercase text-muted-foreground">Host Path</Label>
                                    <Input
                                        value={rule.host}
                                        onChange={(e) => updateRule(idx, 'host', e.target.value)}
                                        placeholder="/path/on/host"
                                        className="h-7 text-[11px]"
                                    />
                                </div>
                                <div className="grid gap-1">
                                    <Label className="text-[10px] uppercase text-muted-foreground">Delete on Stop</Label>
                                    <Select
                                        value={rule.deleteOnStop ? "true" : "false"}
                                        onValueChange={(val) => updateRule(idx, 'deleteOnStop', val === "true")}
                                    >
                                        <SelectTrigger className="h-7 text-[11px] w-full">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="true">True</SelectItem>
                                            <SelectItem value="false">False</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>
                        ))}
                        <Button
                            variant="outline"
                            size="xs"
                            className="border-dashed"
                            onClick={addRule}
                        >
                            <PlusIcon className="size-3 mr-1" /> Add Rule
                        </Button>
                    </div>
                    {hasInvalid && (
                        <p className="text-[10px] text-destructive font-medium animate-pulse">
                            All rules must have valid Guest and Host paths.
                        </p>
                    )}
                    <DialogFooter>
                        <DialogClose
                            disabled={hasInvalid}
                            render={<Button variant="outline" size="sm" />}
                        >
                            Done
                        </DialogClose>
                    </DialogFooter>
                </DialogContent>

                {rules.length > 0 && (
                    <Accordion className="w-full">
                        {rules.map((rule, idx) => (
                            <AccordionItem value={`cth-${idx}`} key={idx} className="border-border/40">
                                <AccordionTrigger className="text-[11px] py-1.5 px-2 hover:bg-muted/50 hover:no-underline transition-colors tracking-tight text-muted-foreground font-semibold">
                                    <div className="flex items-center gap-2 overflow-hidden">
                                        <span className="text-[10px] bg-muted px-1 rounded text-foreground/70 shrink-0">{idx + 1}</span>
                                        <span className="truncate" title={rule.guest}>{truncatePath(rule.guest)}</span>
                                        <span className="text-muted-foreground/50 shrink-0">→</span>
                                        <span className="truncate" title={rule.host}>{truncatePath(rule.host)}</span>
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
                                            <span className="text-foreground/70">{rule.deleteOnStop ? 'true' : 'false'}</span>
                                        </div>
                                    </div>
                                </AccordionContent>
                            </AccordionItem>
                        ))}
                    </Accordion>
                )}
            </Dialog>
        </div>
    );
}
