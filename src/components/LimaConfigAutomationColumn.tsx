import { useState } from "react";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { useLimaDraft } from "src/hooks/useLimaDraft";
import { Spinner } from "./ui/spinner";
import {
    Item,
    ItemContent,
    ItemDescription,
    ItemTitle,
} from "./ui/item";
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
import { Textarea } from "./ui/textarea";

interface Props {
    instanceName: string,
}

export function LimaConfigAutomationColumn({ instanceName }: Props) {
    const {
        draftConfig,
        isDirty,
        isLoading,
        updateField
    } = useLimaDraft(instanceName);

    const [isProvisionDialogOpen, setIsProvisionDialogOpen] = useState(false);
    const [isProbesDialogOpen, setIsProbesDialogOpen] = useState(false);

    if (isLoading) {
        return <div title="Loading Lima Config..."><Spinner /></div>
    }

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

    const hasInvalidProvision = draftConfig?.provision?.some(p => !p.script?.trim());
    const hasInvalidProbe = draftConfig?.probes?.some(p => !p.description?.trim() || !p.script?.trim());

    const truncateScript = (script: string, maxLength: number = 30) => {
        if (!script) return '';
        if (script.length <= maxLength) return script;
        return `${script.slice(0, maxLength)}...`;
    };

    return (
        <div className="flex flex-col gap-6 w-full max-w-sm px-4 py-8 mx-auto relative overflow-y-auto max-h-full">
            {isDirty && (
                <div className="absolute top-2 right-4 text-[10px] bg-yellow-500/10 text-yellow-500 px-1.5 py-0.5 font-bold uppercase tracking-wider rounded border border-yellow-500/20 animate-pulse z-10">
                    Dirty
                </div>
            )}

            {/* Provision Section */}
            <div className="grid w-full items-center gap-1.5">
                <Dialog
                    open={isProvisionDialogOpen}
                    onOpenChange={(open) => {
                        if (!open && hasInvalidProvision) {
                            return;
                        }
                        setIsProvisionDialogOpen(open);
                    }}
                >
                    <div className="flex items-center justify-between">
                        <Label className="mb-0.5">Provision</Label>
                        <DialogTrigger render={<Button variant="ghost" size="icon" className="size-7" />}>
                            {(!draftConfig?.provision || draftConfig.provision.length === 0)
                                ? <PlusIcon className="size-4" />
                                : <PencilIcon className="size-3.5 text-muted-foreground" />
                            }
                        </DialogTrigger>
                    </div>

                    <DialogContent
                        className="sm:max-w-md"
                        showCloseButton={!hasInvalidProvision}
                    >
                        <DialogHeader>
                            <DialogTitle>Configure Provision Scripts</DialogTitle>
                            <DialogDescription>
                                Add scripts to run during the provisioning of the VM.
                            </DialogDescription>
                        </DialogHeader>
                        <div className="flex flex-col gap-4 py-4 overflow-y-auto max-h-[60vh] pr-1">
                            {draftConfig?.provision?.map((p, idx) => (
                                <div key={idx} className="flex flex-col gap-2 p-3 border border-border/50 bg-muted/20 relative group">
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="absolute top-1 right-1 size-6 opacity-0 group-hover:opacity-100 transition-opacity"
                                        onClick={() => removeArrayItem('provision', idx)}
                                    >
                                        <Trash2Icon className="size-3 text-destructive" />
                                    </Button>
                                    <div className="grid gap-1">
                                        <Label className="text-[10px] uppercase text-muted-foreground">Mode</Label>
                                        <Select
                                            value={p.mode || 'system'}
                                            onValueChange={(val) => updateArrayField('provision', idx, 'mode', val)}
                                        >
                                            <SelectTrigger className="h-7 text-[11px] w-full">
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="system">system</SelectItem>
                                                <SelectItem value="user">user</SelectItem>
                                                <SelectItem value="boot">boot</SelectItem>
                                                <SelectItem value="dependency">dependency</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="grid gap-1">
                                        <Label className="text-[10px] uppercase text-muted-foreground">Script</Label>
                                        <Textarea
                                            value={p.script}
                                            onChange={(e) => updateArrayField('provision', idx, 'script', e.target.value)}
                                            placeholder="#!/bin/bash\necho 'hello world'"
                                            className="min-h-[100px] text-[11px] font-mono"
                                        />
                                    </div>
                                </div>
                            ))}
                            <Button
                                variant="outline"
                                size="xs"
                                className="border-dashed"
                                onClick={() => addArrayItem('provision', { mode: 'system', script: '' })}
                            >
                                <PlusIcon className="size-3 mr-1" /> Add Provision Step
                            </Button>
                        </div>
                        {hasInvalidProvision && (
                            <p className="text-[10px] text-destructive font-medium animate-pulse">
                                All provision steps must have a script.
                            </p>
                        )}
                        <DialogFooter>
                            <DialogClose
                                disabled={hasInvalidProvision}
                                render={<Button variant="outline" size="sm" />}
                            >
                                Done
                            </DialogClose>
                        </DialogFooter>
                    </DialogContent>

                    <div className="flex flex-col gap-2">
                        {draftConfig?.provision?.map((p, idx) => (
                            <Item key={idx} variant="muted" size="xs">
                                <ItemContent className="overflow-hidden">
                                    <ItemTitle>{p.mode || 'system'}</ItemTitle>
                                    <ItemDescription className="max-w-full truncate font-mono" title={p.script}>
                                        {truncateScript(p.script)}
                                    </ItemDescription>
                                </ItemContent>
                            </Item>
                        ))}
                    </div>
                </Dialog>
            </div>

            {/* Probes Section */}
            <div className="grid w-full items-center gap-1.5">
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
                                ? <PlusIcon className="size-4" />
                                : <PencilIcon className="size-3.5 text-muted-foreground" />
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
                                            placeholder="Check if k0s is ready"
                                            className="h-7 text-[11px]"
                                        />
                                    </div>
                                    <div className="grid gap-1">
                                        <Label className="text-[10px] uppercase text-muted-foreground">Script</Label>
                                        <Input
                                            value={p.script}
                                            onChange={(e) => updateArrayField('probes', idx, 'script', e.target.value)}
                                            placeholder="k0s status"
                                            className="h-7 text-[11px] font-mono"
                                        />
                                    </div>
                                    <div className="grid gap-1">
                                        <Label className="text-[10px] uppercase text-muted-foreground">Hint (Optional)</Label>
                                        <Input
                                            value={p.hint || ''}
                                            onChange={(e) => updateArrayField('probes', idx, 'hint', e.target.value)}
                                            placeholder="Wait for 1 minute"
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

                    <div className="flex flex-col gap-2">
                        {draftConfig?.probes?.map((p, idx) => (
                            <Item key={idx} variant="muted" size="xs">
                                <ItemContent className="overflow-hidden">
                                    <ItemTitle>{p.description || 'unnamed'}</ItemTitle>
                                    <ItemDescription className="max-w-full truncate font-mono" title={p.script}>
                                        {truncateScript(p.script)}
                                    </ItemDescription>
                                </ItemContent>
                            </Item>
                        ))}
                    </div>
                </Dialog>
            </div>
        </div>
    )
}
