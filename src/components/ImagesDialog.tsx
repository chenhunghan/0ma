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

export function ImagesDialog() {
    const { selectedName } = useSelectedInstance();
    const { draftConfig, updateField } = useLimaDraft(selectedName);
    const [isOpen, setIsOpen] = useState(false);

    const isUrl = (str: string) => {
        try {
            const url = new URL(str);
            return url.protocol === 'https:';
        } catch (_) {
            return false;
        }
    };

    const images = draftConfig?.images || [];
    const hasInvalid = images.some(img => !img.location?.trim() || !isUrl(img.location));

    const updateImage = (index: number, field: string, value: any) => {
        const newImages = [...images];
        newImages[index] = { ...newImages[index], [field]: value };
        updateField('images', newImages);
    };

    const addImage = () => {
        updateField('images', [...images, { location: '', arch: 'aarch64' }]);
    };

    const removeImage = (index: number) => {
        const newImages = [...images];
        newImages.splice(index, 1);
        updateField('images', newImages);
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
                    <Label className="mb-0.5">Images</Label>
                    <DialogTrigger render={<Button variant="ghost" size="icon" className="size-7" />}>
                        {(!images || images.length === 0)
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
                        <DialogTitle>Configure Images</DialogTitle>
                        <DialogDescription>
                            Add or remove virtual machine images for this instance.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="flex flex-col gap-4 py-4 overflow-y-auto max-h-[60vh] pr-1">
                        {images.map((image, idx) => (
                            <div key={idx} className="flex flex-col gap-2 p-3 border border-border/50 bg-muted/20 relative group">
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="absolute top-1 right-1 size-6 opacity-0 group-hover:opacity-100 transition-opacity"
                                    onClick={() => removeImage(idx)}
                                    disabled={images.length === 1}
                                    title={images.length === 1 ? "At least one image is required" : undefined}
                                >
                                    <Trash2Icon className="size-3 text-destructive" />
                                </Button>
                                <div className="grid gap-1">
                                    <Label className="text-[10px] uppercase text-muted-foreground">Location</Label>
                                    <Input
                                        value={image.location}
                                        onChange={(e) => updateImage(idx, 'location', e.target.value)}
                                        placeholder="https://cloud-images.ubuntu.com/..."
                                        className="h-7 text-[11px]"
                                    />
                                </div>
                                <div className="grid gap-1">
                                    <Label className="text-[10px] uppercase text-muted-foreground">Arch</Label>
                                    <Select value={image.arch || 'x86_64'} onValueChange={(val) => updateImage(idx, 'arch', val)}>
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
                            onClick={addImage}
                        >
                            <PlusIcon className="size-3 mr-1" /> Add Image
                        </Button>
                    </div>
                    {hasInvalid && (
                        <p className="text-[10px] text-destructive font-medium animate-pulse">
                            All images must have a valid URL.
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

                {images.length > 0 && (
                    <Accordion className="w-full">
                        {images.map((image, idx) => (
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
    );
}
