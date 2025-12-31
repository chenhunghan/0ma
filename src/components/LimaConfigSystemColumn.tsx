import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { useLimaDraft } from "src/hooks/useLimaDraft";
import { Spinner } from "./ui/spinner";
import { Item, ItemContent, ItemDescription, ItemTitle, ItemSeparator } from "./ui/item";
import { Button } from "./ui/button";
import { Trash2Icon, PlusIcon } from "lucide-react";
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

            <ItemSeparator />

            {/* Images Section */}
            <div className="flex flex-col gap-4">
                <div className="flex items-center justify-between">
                    <Label className="text-sm font-semibold">Images</Label>
                    <Button variant="outline" size="xs" onClick={() => addArrayItem('images', { location: '', arch: 'x86_64' })}>
                        <PlusIcon className="size-3 mr-1" /> Add Image
                    </Button>
                </div>
                <div className="flex flex-col gap-3">
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
                                    placeholder="Image URL or Path"
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
                    {(!draftConfig?.images || draftConfig.images.length === 0) && (
                        <span className="text-xs text-muted-foreground italic px-1">No images configured.</span>
                    )}
                </div>
            </div>

            <ItemSeparator />

            {/* Mounts Section */}
            <div className="flex flex-col gap-4">
                <div className="flex items-center justify-between">
                    <Label className="text-sm font-semibold">Mounts</Label>
                    <Button variant="outline" size="xs" onClick={() => addArrayItem('mounts', { location: '', writable: false })}>
                        <PlusIcon className="size-3 mr-1" /> Add Mount
                    </Button>
                </div>
                <div className="flex flex-col gap-3">
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
                    {(!draftConfig?.mounts || draftConfig.mounts.length === 0) && (
                        <span className="text-xs text-muted-foreground italic px-1">No mounts configured.</span>
                    )}
                </div>
            </div>

            <ItemSeparator />

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
        </div>
    )
}