import { useCallback, useMemo, useState, type ChangeEvent } from "react";
import { InfoIcon, PencilIcon, PlusIcon, Trash2Icon } from "lucide-react";
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
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "./ui/tooltip";

interface Props {
  value: Mount[];
  onChange: (mounts: Mount[]) => void;
}

function FieldLabel({ label, tooltip }: { label: string; tooltip: string }) {
  return (
    <Label className="text-[10px] uppercase text-muted-foreground gap-1">
      {label}
      <Tooltip>
        <TooltipTrigger
          className="inline-flex items-center text-muted-foreground/60 hover:text-muted-foreground transition-colors"
          render={<span />}
        >
          <InfoIcon className="size-2.5" />
        </TooltipTrigger>
        <TooltipContent side="top">{tooltip}</TooltipContent>
      </Tooltip>
    </Label>
  );
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

  const getMountPointChangeHandler = useCallback(
    (index: number) => (event: ChangeEvent<HTMLInputElement>) => {
      updateMount(index, "mountPoint", event.target.value);
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
            Mount directories from the host machine into the guest VM.
          </DialogDescription>
        </DialogHeader>
        <TooltipProvider>
          <div className="flex flex-col gap-4 py-4 overflow-y-auto max-h-[60vh] pr-1">
            {mounts.map((mount, idx) => (
              <div
                key={idx}
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
                  <FieldLabel
                    label="Host Path"
                    tooltip="Absolute path on the host (macOS) to share with the VM. e.g. /Users/you/projects"
                  />
                  <Input
                    value={mount.location}
                    onChange={getLocationChangeHandler(idx)}
                    placeholder="/path/on/host"
                    className="h-7 text-[11px]"
                  />
                </div>
                <div className="grid gap-1">
                  <FieldLabel
                    label="Guest Mount Point"
                    tooltip="Path inside the guest VM where the directory will appear. If left empty, defaults to the same path as the host."
                  />
                  <Input
                    value={mount.mountPoint ?? ""}
                    onChange={getMountPointChangeHandler(idx)}
                    placeholder="Same as host path (optional)"
                    className="h-7 text-[11px]"
                  />
                </div>
                <div className="grid gap-1">
                  <FieldLabel
                    label="Writable"
                    tooltip="Whether the guest VM can write to this mount. Read-only is safer and recommended unless the VM needs to modify host files."
                  />
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
        </TooltipProvider>
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
