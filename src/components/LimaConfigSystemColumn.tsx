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

interface Props {
    instanceName: string,
}

export function LimaConfigSystemColumn({ instanceName }: Props) {
    const {
        actualConfig,
        draftConfig,
        isDirty,
        isLoading,
        updateField
    } = useLimaDraft(instanceName);

    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [isMountsDialogOpen, setIsMountsDialogOpen] = useState(false);

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

    const isUrl = (str: string) => {
        try {
            const url = new URL(str);
            return url.protocol === 'https:';
        } catch (_) {
            return false;
        }
    };

    const hasInvalidImageLocation = draftConfig?.images?.some(img => !img.location?.trim() || !isUrl(img.location));
    const hasInvalidMount = draftConfig?.mounts?.some(m => !m.location?.trim());

    return (
        <div className="flex flex-col gap-6 w-full max-w-sm px-4 py-8 mx-auto relative overflow-y-auto max-h-full">
            {isDirty && (
                <div className="absolute top-2 right-4 text-[10px] bg-yellow-500/10 text-yellow-500 px-1.5 py-0.5 font-bold uppercase tracking-wider rounded border border-yellow-500/20 animate-pulse z-10">
                    Dirty
                </div>
            )}

            {/* Read-only Lima Minimum Version */}
            <div className="grid w-full items-center gap-1.5">
                <Item variant="muted">
                    <ItemContent>
                        <ItemTitle>Lima Minimum Version</ItemTitle>
                        <ItemDescription>{actualConfig?.minimumLimaVersion || 'N/A'}</ItemDescription>
                    </ItemContent>
                </Item>
            </div>

            {/* Images Section */}
            <div className="grid w-full items-center gap-1.5">
                <Dialog
                    open={isDialogOpen}
                    onOpenChange={(open) => {
                        if (!open && hasInvalidImageLocation) {
                            // Block closing if invalid
                            return;
                        }
                        setIsDialogOpen(open);
                    }}
                >
                    <div className="flex items-center justify-between">
                        <Label className="mb-0.5">Images</Label>
                        {(!draftConfig?.images || draftConfig.images.length === 0) && (
                            <DialogTrigger render={<Button variant="outline" size="xs" />}>
                                <PlusIcon className="size-3 mr-1" /> Add Image
                            </DialogTrigger>
                        )}
                    </div>

                    <DialogContent
                        className="sm:max-w-md"
                        showCloseButton={!hasInvalidImageLocation}
                    >
                        <DialogHeader>
                            <DialogTitle>Configure Images</DialogTitle>
                            <DialogDescription>
                                Add or remove virtual machine images for this instance.
                            </DialogDescription>
                        </DialogHeader>
                        <div className="flex flex-col gap-4 py-4 overflow-y-auto max-h-[60vh] pr-1">
                            {draftConfig?.images?.map((image, idx) => (
                                <div key={idx} className="flex flex-col gap-2 p-3 border border-border/50 bg-muted/20 relative group">
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="absolute top-1 right-1 size-6 opacity-0 group-hover:opacity-100 transition-opacity"
                                        onClick={() => removeArrayItem('images', idx)}
                                        disabled={draftConfig?.images?.length === 1}
                                        title={draftConfig?.images?.length === 1 ? "At least one image is required" : undefined}
                                    >
                                        <Trash2Icon className="size-3 text-destructive" />
                                    </Button>
                                    <div className="grid gap-1">
                                        <Label className="text-[10px] uppercase text-muted-foreground">Location</Label>
                                        <Input
                                            value={image.location}
                                            onChange={(e) => updateArrayField('images', idx, 'location', e.target.value)}
                                            placeholder="https://cloud-images.ubuntu.com/releases/noble/release/ubuntu-24.04-server-cloudimg-arm64.img"
                                            className="h-7 text-[11px]"
                                        />
                                    </div>
                                    <div className="grid gap-1">
                                        <Label className="text-[10px] uppercase text-muted-foreground">Arch</Label>
                                        <Select value={image.arch || 'x86_64'} onValueChange={(val) => updateArrayField('images', idx, 'arch', val)}>
                                            <SelectTrigger className="h-7 text-[11px] w-full">
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="x86_64">x86_64</SelectItem>
                                                <SelectItem value="aarch64">aarch64</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div>
                            ))}
                            <Button
                                variant="outline"
                                size="xs"
                                className="border-dashed"
                                onClick={() => addArrayItem('images', { location: '', arch: 'aarch64' })}
                            >
                                <PlusIcon className="size-3 mr-1" /> Add Image
                            </Button>
                        </div>
                        {hasInvalidImageLocation && (
                            <p className="text-[10px] text-destructive font-medium animate-pulse">
                                All images must have a valid URL.
                            </p>
                        )}
                        <DialogFooter>
                            <DialogClose
                                disabled={hasInvalidImageLocation}
                                render={<Button variant="outline" size="sm" />}
                            >
                                Done
                            </DialogClose>
                        </DialogFooter>
                    </DialogContent>

                    <div className="flex flex-col gap-2">
                        {draftConfig?.images?.map((image, idx) => (
                            <Item key={idx} variant="muted" size="xs" className="relative group">
                                <ItemContent className="overflow-hidden pr-10">
                                    <ItemTitle>{image.arch || 'unknown'}</ItemTitle>
                                    <ItemDescription className="max-w-full" title={image.location}>
                                        {image.location?.slice(0, 10)}...{image.location?.slice(image.location.length - 40)}
                                    </ItemDescription>
                                </ItemContent>
                                <DialogTrigger render={
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="absolute right-1 top-1/2 -translate-y-1/2 size-7 opacity-0 group-hover:opacity-100 transition-opacity"
                                    />
                                }>
                                    <PencilIcon className="size-3 text-muted-foreground" />
                                </DialogTrigger>
                            </Item>
                        ))}
                    </div>
                </Dialog>
            </div>

            {/* Mounts Section */}
            <div className="grid w-full items-center gap-1.5">
                <Dialog
                    open={isMountsDialogOpen}
                    onOpenChange={(open) => {
                        if (!open && hasInvalidMount) {
                            return;
                        }
                        setIsMountsDialogOpen(open);
                    }}
                >
                    <div className="flex items-center justify-between">
                        <Label className="mb-0.5">Mounts</Label>
                        {(!draftConfig?.mounts || draftConfig.mounts.length === 0) && (
                            <DialogTrigger render={<Button variant="outline" size="xs" />}>
                                <PlusIcon className="size-3 mr-1" />
                            </DialogTrigger>
                        )}
                    </div>

                    <DialogContent
                        className="sm:max-w-md"
                        showCloseButton={!hasInvalidMount}
                    >
                        <DialogHeader>
                            <DialogTitle>Configure Mounts</DialogTitle>
                            <DialogDescription>
                                Configure directories to mount from the host into the guest VM.
                            </DialogDescription>
                        </DialogHeader>
                        <div className="flex flex-col gap-4 py-4 overflow-y-auto max-h-[60vh] pr-1">
                            {draftConfig?.mounts?.map((mount, idx) => (
                                <div key={idx} className="flex flex-col gap-2 p-3 border border-border/50 bg-muted/20 relative group">
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="absolute top-1 right-1 size-6 opacity-0 group-hover:opacity-100 transition-opacity"
                                        onClick={() => removeArrayItem('mounts', idx)}
                                    >
                                        <Trash2Icon className="size-3 text-destructive" />
                                    </Button>
                                    <div className="grid gap-1">
                                        <Label className="text-[10px] uppercase text-muted-foreground">Location</Label>
                                        <Input
                                            value={mount.location}
                                            onChange={(e) => updateArrayField('mounts', idx, 'location', e.target.value)}
                                            placeholder="Path to mount"
                                            className="h-7 text-[11px]"
                                        />
                                    </div>
                                    <div className="grid gap-1">
                                        <Label className="text-[10px] uppercase text-muted-foreground">Writable</Label>
                                        <Select
                                            value={mount.writable ? "true" : "false"}
                                            onValueChange={(val) => updateArrayField('mounts', idx, 'writable', val === "true")}
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
                                onClick={() => addArrayItem('mounts', { location: '', writable: false })}
                            >
                                <PlusIcon className="size-3 mr-1" /> Add Mount
                            </Button>
                        </div>
                        {hasInvalidMount && (
                            <p className="text-[10px] text-destructive font-medium animate-pulse">
                                All mounts must have a valid location.
                            </p>
                        )}
                        <DialogFooter>
                            <DialogClose
                                disabled={hasInvalidMount}
                                render={<Button variant="outline" size="sm" />}
                            >
                                Done
                            </DialogClose>
                        </DialogFooter>
                    </DialogContent>

                    <div className="flex flex-col gap-2">
                        {draftConfig?.mounts?.map((mount, idx) => (
                            <Item key={idx} variant="muted" size="xs" className="relative group">
                                <ItemContent className="overflow-hidden pr-10">
                                    <ItemTitle>{mount.writable ? "R/W" : "R/O"}</ItemTitle>
                                    <ItemDescription className="max-w-full truncate" title={mount.location}>
                                        {mount.location || <span className="italic text-muted-foreground/50">No location set</span>}
                                    </ItemDescription>
                                </ItemContent>
                                <DialogTrigger render={
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="absolute right-1 top-1/2 -translate-y-1/2 size-7 opacity-0 group-hover:opacity-100 transition-opacity"
                                    />
                                }>
                                    <PencilIcon className="size-3 text-muted-foreground" />
                                </DialogTrigger>
                            </Item>
                        ))}
                    </div>
                </Dialog>
            </div>


            {/* Copy to Host Section */}
            <div className="flex flex-col gap-4">
                <div className="flex items-center justify-between">
                    <Label className="text-sm font-semibold">Copy to Host</Label>
                    <Button variant="outline" size="xs" onClick={() => addArrayItem('copyToHost', { guest: '', host: '', deleteOnStop: false })}>
                        <PlusIcon className="size-3 mr-1" /> Add Rule
                    </Button>
                </div>
                <div className="flex flex-col gap-3">
                    {draftConfig?.copyToHost?.map((rule, idx) => (
                        <div key={idx} className="flex flex-col gap-2 p-3 border border-border/50 bg-muted/20 relative group">
                            <Button
                                variant="ghost"
                                size="icon"
                                className="absolute top-1 right-1 size-6 opacity-0 group-hover:opacity-100 transition-opacity"
                                onClick={() => removeArrayItem('copyToHost', idx)}
                            >
                                <Trash2Icon className="size-3 text-destructive" />
                            </Button>
                            <div className="grid gap-1">
                                <Label className="text-[10px] uppercase text-muted-foreground">Guest Path</Label>
                                <Input
                                    value={rule.guest}
                                    onChange={(e) => updateArrayField('copyToHost', idx, 'guest', e.target.value)}
                                    placeholder="/path/in/guest"
                                    className="h-7 text-[11px]"
                                />
                            </div>
                            <div className="grid gap-1">
                                <Label className="text-[10px] uppercase text-muted-foreground">Host Path</Label>
                                <Input
                                    value={rule.host}
                                    onChange={(e) => updateArrayField('copyToHost', idx, 'host', e.target.value)}
                                    placeholder="/path/on/host"
                                    className="h-7 text-[11px]"
                                />
                            </div>
                            <div className="grid gap-1">
                                <Label className="text-[10px] uppercase text-muted-foreground">Delete on Stop</Label>
                                <Select
                                    value={rule.deleteOnStop ? "true" : "false"}
                                    onValueChange={(val) => updateArrayField('copyToHost', idx, 'deleteOnStop', val === "true")}
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
                    {(!draftConfig?.copyToHost || draftConfig.copyToHost.length === 0) && (
                        <span className="text-xs text-muted-foreground italic px-1">No copy-to-host rules.</span>
                    )}
                </div>
            </div>
        </div >
    )
}