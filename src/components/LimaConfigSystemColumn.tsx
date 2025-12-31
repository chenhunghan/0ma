import { useState } from "react";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { useLimaDraft } from "src/hooks/useLimaDraft";
import { Spinner } from "./ui/spinner";
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
import {
    Accordion,
    AccordionContent,
    AccordionItem,
    AccordionTrigger,
} from "./ui/accordion";

interface Props {
    instanceName: string,
}

export function LimaConfigSystemColumn({ instanceName }: Props) {
    const {
        draftConfig,
        isDirty,
        isLoading,
        updateField
    } = useLimaDraft(instanceName);

    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [isMountsDialogOpen, setIsMountsDialogOpen] = useState(false);
    const [isCopyToHostDialogOpen, setIsCopyToHostDialogOpen] = useState(false);
    const [isPortForwardsDialogOpen, setIsPortForwardsDialogOpen] = useState(false);

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
    const hasInvalidCopyToHost = draftConfig?.copyToHost?.some(c => !c.guest?.trim() || !c.host?.trim());
    const hasInvalidPortForward = draftConfig?.portForwards?.some(p => !p.guestPort || !p.hostPort || !p.proto);

    const truncatePath = (path: string, maxLength: number = 20) => {
        if (!path) return '';
        if (path.length <= maxLength) return path;
        const half = Math.floor((maxLength - 3) / 2);
        return `${path.slice(0, half)}...${path.slice(-half)}`;
    };

    return (
        <div className="flex flex-col gap-4 w-full px-4 py-4 lg:px-12 lg:py-4 relative overflow-y-auto max-h-full">
            {isDirty && (
                <div className="absolute top-2 right-4 text-[10px] bg-yellow-500/10 text-yellow-500 px-1.5 py-0.5 font-bold uppercase tracking-wider rounded border border-yellow-500/20 animate-pulse z-10">
                    Dirty
                </div>
            )}

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
                        <DialogTrigger render={<Button variant="ghost" size="icon" className="size-7" />}>
                            {(!draftConfig?.images || draftConfig.images.length === 0)
                                ? <PlusIcon className="size-4" />
                                : <PencilIcon className="size-2.5 mr-[8px]" />
                            }
                        </DialogTrigger>
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

                    {draftConfig?.images && draftConfig.images.length > 0 && (
                        <Accordion className="w-full">
                            {draftConfig.images.map((image, idx) => (
                                <AccordionItem value={`image-${idx}`} key={idx} className="border-border/40">
                                    <AccordionTrigger className="text-[11px] py-1.5 px-2 hover:bg-muted/50 hover:no-underline transition-colors tracking-tight text-muted-foreground font-semibold">
                                        <div className="flex items-center gap-2 overflow-hidden">
                                            <span className="text-[10px] bg-muted px-1 rounded text-foreground/70 shrink-0">{idx + 1}</span>
                                            <span className="uppercase text-[9px] shrink-0 opacity-70">{image.arch || 'x86_64'}</span>
                                            <span className="truncate opacity-80" title={image.location}>
                                                {image.location?.slice(0, 10)}...{image.location?.slice(-20)}
                                            </span>
                                        </div>
                                    </AccordionTrigger>
                                    <AccordionContent className="p-2 bg-muted/10">
                                        <div className="flex flex-col gap-1 text-[10px] font-mono text-muted-foreground/80 bg-zinc-950/50 p-2 rounded border border-border/20">
                                            <div className="flex justify-between items-start">
                                                <span className="shrink-0">Location:</span>
                                                <span className="text-foreground/70 break-all ml-4 text-right">{image.location}</span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span>Architecture:</span>
                                                <span className="text-foreground/70 uppercase">{image.arch || 'x86_64'}</span>
                                            </div>
                                        </div>
                                    </AccordionContent>
                                </AccordionItem>
                            ))}
                        </Accordion>
                    )}
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
                        <DialogTrigger render={<Button variant="ghost" size="icon" className="size-7" />}>
                            {(!draftConfig?.mounts || draftConfig.mounts.length === 0)
                                ? <PlusIcon className="size-4" />
                                : <PencilIcon className="size-2.5 mr-[8px]" />
                            }
                        </DialogTrigger>
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

                    {draftConfig?.mounts && draftConfig.mounts.length > 0 && (
                        <Accordion className="w-full">
                            {draftConfig.mounts.map((mount, idx) => (
                                <AccordionItem value={`mount-${idx}`} key={idx} className="border-border/40">
                                    <AccordionTrigger className="text-[11px] py-1.5 px-2 hover:bg-muted/50 hover:no-underline transition-colors tracking-tight text-muted-foreground font-semibold">
                                        <div className="flex items-center gap-2 overflow-hidden">
                                            <span className="text-[10px] bg-muted px-1 rounded text-foreground/70 shrink-0">{idx + 1}</span>
                                            <span className="uppercase text-[9px] shrink-0 opacity-70">{mount.writable ? "R/W" : "R/O"}</span>
                                            <span className="truncate opacity-80" title={mount.location}>
                                                {truncatePath(mount.location ?? "")}
                                            </span>
                                        </div>
                                    </AccordionTrigger>
                                    <AccordionContent className="p-2 bg-muted/10">
                                        <div className="flex flex-col gap-1 text-[10px] font-mono text-muted-foreground/80 bg-zinc-950/50 p-2 rounded border border-border/20">
                                            <div className="flex justify-between items-start">
                                                <span className="shrink-0">Location:</span>
                                                <span className="text-foreground/70 break-all ml-4 text-right">{mount.location}</span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span>Writable:</span>
                                                <span className="text-foreground/70">{mount.writable ? 'true' : 'false'}</span>
                                            </div>
                                        </div>
                                    </AccordionContent>
                                </AccordionItem>
                            ))}
                        </Accordion>
                    )}
                </Dialog>
            </div>


            {/* Copy to Host Section */}
            <div className="grid w-full items-center gap-1.5">
                <Dialog
                    open={isCopyToHostDialogOpen}
                    onOpenChange={(open) => {
                        if (!open && hasInvalidCopyToHost) {
                            return;
                        }
                        setIsCopyToHostDialogOpen(open);
                    }}
                >
                    <div className="flex items-center justify-between">
                        <Label className="mb-0.5">Copy to Host</Label>
                        <DialogTrigger render={<Button variant="ghost" size="icon" className="size-7" />}>
                            {(!draftConfig?.copyToHost || draftConfig.copyToHost.length === 0)
                                ? <PlusIcon className="size-4" />
                                : <PencilIcon className="size-2.5 mr-[8px]" />
                            }
                        </DialogTrigger>
                    </div>

                    <DialogContent
                        className="sm:max-w-md"
                        showCloseButton={!hasInvalidCopyToHost}
                    >
                        <DialogHeader>
                            <DialogTitle>Configure Copy to Host</DialogTitle>
                            <DialogDescription>
                                Copy files from the guest VM to the host machine.
                            </DialogDescription>
                        </DialogHeader>
                        <div className="flex flex-col gap-4 py-4 overflow-y-auto max-h-[60vh] pr-1">
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
                            <Button
                                variant="outline"
                                size="xs"
                                className="border-dashed"
                                onClick={() => addArrayItem('copyToHost', { guest: '', host: '', deleteOnStop: false })}
                            >
                                <PlusIcon className="size-3 mr-1" /> Add Rule
                            </Button>
                        </div>
                        {hasInvalidCopyToHost && (
                            <p className="text-[10px] text-destructive font-medium animate-pulse">
                                All rules must have valid Guest and Host paths.
                            </p>
                        )}
                        <DialogFooter>
                            <DialogClose
                                disabled={hasInvalidCopyToHost}
                                render={<Button variant="outline" size="sm" />}
                            >
                                Done
                            </DialogClose>
                        </DialogFooter>
                    </DialogContent>

                    {draftConfig?.copyToHost && draftConfig.copyToHost.length > 0 && (
                        <Accordion className="w-full">
                            {draftConfig.copyToHost.map((rule, idx) => (
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
                                            <div className="flex justify-between">
                                                <span>Guest Path:</span>
                                                <span className="text-foreground/70 break-all ml-4">{rule.guest}</span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span>Host Path:</span>
                                                <span className="text-foreground/70 break-all ml-4">{rule.host}</span>
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

            {/* Port Forwards Section */}
            <div className="grid w-full items-center gap-1.5">
                <Dialog
                    open={isPortForwardsDialogOpen}
                    onOpenChange={(open) => {
                        if (!open && hasInvalidPortForward) {
                            return;
                        }
                        setIsPortForwardsDialogOpen(open);
                    }}
                >
                    <div className="flex items-center justify-between">
                        <Label className="mb-0.5">Port Forwards</Label>
                        <DialogTrigger render={<Button variant="ghost" size="icon" className="size-7" />}>
                            {(!draftConfig?.portForwards || draftConfig.portForwards.length === 0)
                                ? <PlusIcon className="size-4" />
                                : <PencilIcon className="size-2.5 mr-[8px]" />
                            }
                        </DialogTrigger>
                    </div>

                    <DialogContent
                        className="sm:max-w-md"
                        showCloseButton={!hasInvalidPortForward}
                    >
                        <DialogHeader>
                            <DialogTitle>Configure Port Forwards</DialogTitle>
                            <DialogDescription>
                                Map ports from the guest VM to the host machine.
                            </DialogDescription>
                        </DialogHeader>
                        <div className="flex flex-col gap-4 py-4 overflow-y-auto max-h-[60vh] pr-1">
                            {draftConfig?.portForwards?.map((pf, idx) => (
                                <div key={idx} className="flex flex-col gap-2 p-3 border border-border/50 bg-muted/20 relative group">
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="absolute top-1 right-1 size-6 opacity-0 group-hover:opacity-100 transition-opacity"
                                        onClick={() => removeArrayItem('portForwards', idx)}
                                    >
                                        <Trash2Icon className="size-3 text-destructive" />
                                    </Button>
                                    <div className="grid grid-cols-2 gap-2">
                                        <div className="grid gap-1">
                                            <Label className="text-[10px] uppercase text-muted-foreground">Guest Port</Label>
                                            <Input
                                                type="number"
                                                value={pf.guestPort}
                                                onChange={(e) => updateArrayField('portForwards', idx, 'guestPort', parseInt(e.target.value) || 0)}
                                                className="h-7 text-[11px]"
                                            />
                                        </div>
                                        <div className="grid gap-1">
                                            <Label className="text-[10px] uppercase text-muted-foreground">Host Port</Label>
                                            <Input
                                                type="number"
                                                value={pf.hostPort}
                                                onChange={(e) => updateArrayField('portForwards', idx, 'hostPort', parseInt(e.target.value) || 0)}
                                                className="h-7 text-[11px]"
                                            />
                                        </div>
                                    </div>
                                    <div className="grid gap-1">
                                        <Label className="text-[10px] uppercase text-muted-foreground">Protocol</Label>
                                        <Select
                                            value={pf.proto || 'tcp'}
                                            onValueChange={(val) => updateArrayField('portForwards', idx, 'proto', val)}
                                        >
                                            <SelectTrigger className="h-7 text-[11px] w-full">
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="tcp">TCP</SelectItem>
                                                <SelectItem value="udp">UDP</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div>
                            ))}
                            <Button
                                variant="outline"
                                size="xs"
                                className="border-dashed"
                                onClick={() => addArrayItem('portForwards', {
                                    guestPort: 8080,
                                    hostPort: 8080,
                                    proto: 'tcp',
                                    guestIPMustBeZero: true,
                                    hostIP: '127.0.0.1'
                                })}
                            >
                                <PlusIcon className="size-3 mr-1" /> Add Port Forward
                            </Button>
                        </div>
                        {hasInvalidPortForward && (
                            <p className="text-[10px] text-destructive font-medium animate-pulse">
                                All port forwards must have guest/host ports and a protocol.
                            </p>
                        )}
                        <DialogFooter>
                            <DialogClose
                                disabled={hasInvalidPortForward}
                                render={<Button variant="outline" size="sm" />}
                            >
                                Done
                            </DialogClose>
                        </DialogFooter>
                    </DialogContent>

                    {draftConfig?.portForwards && draftConfig.portForwards.length > 0 && (
                        <Accordion className="w-full">
                            {draftConfig.portForwards.map((pf, idx) => (
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
                                            <div className="flex justify-between">
                                                <span>Guest IP (Must Be Zero):</span>
                                                <span className="text-foreground/70">{pf.guestIPMustBeZero ? 'true' : 'false'}</span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span>Host IP:</span>
                                                <span className="text-foreground/70">{pf.hostIP || '127.0.0.1'}</span>
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
                    )}
                </Dialog>
            </div>
        </div >
    )
}