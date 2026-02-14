import { useCallback, useMemo, useState, type ChangeEvent } from "react";
import { PencilIcon, PlusIcon, Trash2Icon } from "lucide-react";
import type { Image } from "src/types/LimaConfig";
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";

interface Props {
  value: Image[];
  onChange: (images: Image[]) => void;
}

export function ImagesDialog({ value: images, onChange }: Props) {
  const [isOpen, setIsOpen] = useState(false);

  const isUrl = useCallback((str: string) => {
    try {
      const url = new URL(str);
      return url.protocol === "https:";
    } catch {
      return false;
    }
  }, []);

  const hasInvalid = images.some((image) => !image.location?.trim() || !isUrl(image.location));

  const updateImage = useCallback(
    (index: number, field: string, value: string) => {
      const newImages = [...images];
      newImages[index] = { ...newImages[index], [field]: value };
      onChange(newImages);
    },
    [images, onChange],
  );

  const addImage = useCallback(() => {
    onChange([...images, { arch: "aarch64", location: "" }]);
  }, [images, onChange]);

  const removeImage = useCallback(
    (index: number) => {
      const newImages = [...images];
      newImages.splice(index, 1);
      onChange(newImages);
    },
    [images, onChange],
  );

  const handleOpenChange = useCallback(
    (open: boolean) => {
      if (!open && hasInvalid) {
        return;
      }
      setIsOpen(open);
    },
    [hasInvalid],
  );

  const getRemoveImageHandler = useCallback(
    (index: number) => () => {
      removeImage(index);
    },
    [removeImage],
  );

  const getLocationChangeHandler = useCallback(
    (index: number) => (event: ChangeEvent<HTMLInputElement>) => {
      updateImage(index, "location", event.target.value);
    },
    [updateImage],
  );

  const getArchChangeHandler = useCallback(
    (index: number) => (value: string) => {
      updateImage(index, "arch", value || "x86_64");
    },
    [updateImage],
  );

  const triggerRender = useMemo(
    () => <Button variant="ghost" size="icon" className="size-7" />,
    [],
  );

  const doneButtonRender = useMemo(() => <Button variant="outline" size="sm" />, []);

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <div className="flex items-center justify-between w-full">
        <Label className="mb-0.5">Images</Label>
        <DialogTrigger render={triggerRender}>
          {images.length === 0 ? (
            <PlusIcon className="size-2.5 mr-[4px]" />
          ) : (
            <PencilIcon className="size-2.5 mr-[4px]" />
          )}
        </DialogTrigger>
      </div>

      <DialogContent className="sm:max-w-md" showCloseButton={!hasInvalid}>
        <DialogHeader>
          <DialogTitle>Configure Images</DialogTitle>
          <DialogDescription>
            Add or remove virtual machine images for this instance.
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-4 py-4 overflow-y-auto max-h-[60vh] pr-1">
          {images.map((image, idx) => (
            <div
              key={`${image.location}-${image.arch ?? "x86_64"}`}
              className="flex flex-col gap-2 p-3 border border-border/50 bg-muted/20 relative group"
            >
              <Button
                variant="ghost"
                size="icon"
                className="absolute top-1 right-1 size-6 opacity-0 group-hover:opacity-100 transition-opacity"
                onClick={getRemoveImageHandler(idx)}
                disabled={images.length === 1}
                title={images.length === 1 ? "At least one image is required" : undefined}
              >
                <Trash2Icon className="size-3 text-destructive" />
              </Button>
              <div className="grid gap-1">
                <Label className="text-[10px] uppercase text-muted-foreground">Location</Label>
                <Input
                  value={image.location}
                  onChange={getLocationChangeHandler(idx)}
                  placeholder="https://cloud-images.ubuntu.com/..."
                  className="h-7 text-[11px]"
                />
              </div>
              <div className="grid gap-1">
                <Label className="text-[10px] uppercase text-muted-foreground">Arch</Label>
                <Select value={image.arch || "x86_64"} onValueChange={getArchChangeHandler(idx)}>
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
          <Button variant="outline" size="xs" className="border-dashed" onClick={addImage}>
            <PlusIcon className="size-3 mr-1" /> Add Image
          </Button>
        </div>
        {hasInvalid && (
          <p className="text-[10px] text-destructive font-medium animate-pulse">
            All images must have a valid URL.
          </p>
        )}
        <DialogFooter>
          <DialogClose disabled={hasInvalid} render={doneButtonRender}>
            Done
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
