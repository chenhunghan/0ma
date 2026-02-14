import { useCallback, useMemo, useState, type ChangeEvent } from "react";
import { PencilIcon, PlusIcon, Trash2Icon } from "lucide-react";
import type { Mount } from "src/types/LimaConfig";
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
  value: Mount[];
  onChange: (mounts: Mount[]) => void;
}

export function MountsDialog({ value: mounts, onChange }: Props) {
  const [isOpen, setIsOpen] = useState(false);

  const hasInvalid = mounts.some((mount) => !mount.location?.trim());

  const updateMount = useCallback(
    (index: number, field: string, value: string | boolean) => {
      const newMounts = [...mounts];
      newMounts[index] = { ...newMounts[index], [field]: value };
      onChange(newMounts);
    },
    [mounts, onChange],
  );

  const addMount = useCallback(() => {
    onChange([...mounts, { location: "", writable: false }]);
  }, [mounts, onChange]);

  const removeMount = useCallback(
    (index: number) => {
      const newMounts = [...mounts];
      newMounts.splice(index, 1);
      onChange(newMounts);
    },
    [mounts, onChange],
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

  const getRemoveMountHandler = useCallback(
    (index: number) => () => {
      removeMount(index);
    },
    [removeMount],
  );

  const getLocationChangeHandler = useCallback(
    (index: number) => (event: ChangeEvent<HTMLInputElement>) => {
      updateMount(index, "location", event.target.value);
    },
    [updateMount],
  );

  const getWritableChangeHandler = useCallback(
    (index: number) => (value: string | null) => {
      updateMount(index, "writable", value === "true");
    },
    [updateMount],
  );

  const triggerRender = useMemo(
    () => <Button variant="ghost" size="icon" className="size-7" />,
    [],
  );

  const doneButtonRender = useMemo(() => <Button variant="outline" size="sm" />, []);

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <div className="flex items-center justify-between w-full">
        <Label className="mb-0.5">Mounts</Label>
        <DialogTrigger render={triggerRender}>
          {mounts.length === 0 ? (
            <PlusIcon className="size-2.5 mr-[4px]" />
          ) : (
            <PencilIcon className="size-2.5 mr-[4px]" />
          )}
        </DialogTrigger>
      </div>

      <DialogContent className="sm:max-w-md" showCloseButton={!hasInvalid}>
        <DialogHeader>
          <DialogTitle>Configure Mounts</DialogTitle>
          <DialogDescription>
            Configure directories to mount from the host into the guest VM.
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-4 py-4 overflow-y-auto max-h-[60vh] pr-1">
          {mounts.map((mount, idx) => (
            <div
              key={`${mount.location ?? ""}-${mount.writable ? "true" : "false"}`}
              className="flex flex-col gap-2 p-3 border border-border/50 bg-muted/20 relative group"
            >
              <Button
                variant="ghost"
                size="icon"
                className="absolute top-1 right-1 size-6 opacity-0 group-hover:opacity-100 transition-opacity"
                onClick={getRemoveMountHandler(idx)}
              >
                <Trash2Icon className="size-3 text-destructive" />
              </Button>
              <div className="grid gap-1">
                <Label className="text-[10px] uppercase text-muted-foreground">Location</Label>
                <Input
                  value={mount.location}
                  onChange={getLocationChangeHandler(idx)}
                  placeholder="Path to mount"
                  className="h-7 text-[11px]"
                />
              </div>
              <div className="grid gap-1">
                <Label className="text-[10px] uppercase text-muted-foreground">Writable</Label>
                <Select
                  value={mount.writable ? "true" : "false"}
                  onValueChange={getWritableChangeHandler(idx)}
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
          <Button variant="outline" size="xs" className="border-dashed" onClick={addMount}>
            <PlusIcon className="size-3 mr-1" /> Add Mount
          </Button>
        </div>
        {hasInvalid && (
          <p className="text-[10px] text-destructive font-medium animate-pulse">
            All mounts must have a valid location.
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
