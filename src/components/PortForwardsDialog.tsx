import { useCallback, useMemo, useState, type ChangeEvent } from "react";
import { InfoIcon, PencilIcon, PlusIcon, Trash2Icon } from "lucide-react";
import { isSocketForward, type PortForward } from "src/types/LimaConfig";
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
  value: PortForward[];
  onChange: (portForwards: PortForward[]) => void;
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

export function PortForwardsDialog({ value: portForwards, onChange }: Props) {
  const [isOpen, setIsOpen] = useState(false);

  const { socketForwards, editableForwards } = useMemo(() => {
    const socket: PortForward[] = [];
    const editable: PortForward[] = [];
    for (const pf of portForwards) {
      (isSocketForward(pf) ? socket : editable).push(pf);
    }
    return { socketForwards: socket, editableForwards: editable };
  }, [portForwards]);

  const emitChange = useCallback(
    (nextEditable: PortForward[]) => {
      onChange([...socketForwards, ...nextEditable]);
    },
    [onChange, socketForwards],
  );

  const hasInvalid = editableForwards.some(
    (portForward) => !portForward.guestPort || !portForward.hostPort || !portForward.proto,
  );

  const updatePortForward = useCallback(
    (index: number, field: string, value: string | number) => {
      const next = [...editableForwards];
      next[index] = { ...next[index], [field]: value };
      emitChange(next);
    },
    [emitChange, editableForwards],
  );

  const addPortForward = useCallback(() => {
    emitChange([
      ...editableForwards,
      {
        guestIPMustBeZero: true,
        guestPort: 8080,
        hostIP: "127.0.0.1",
        hostPort: 8080,
        proto: "tcp",
      },
    ]);
  }, [emitChange, editableForwards]);

  const removePortForward = useCallback(
    (index: number) => {
      const next = [...editableForwards];
      next.splice(index, 1);
      emitChange(next);
    },
    [emitChange, editableForwards],
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

  const getRemovePortForwardHandler = useCallback(
    (index: number) => () => {
      removePortForward(index);
    },
    [removePortForward],
  );

  const getGuestPortChangeHandler = useCallback(
    (index: number) => (event: ChangeEvent<HTMLInputElement>) => {
      updatePortForward(index, "guestPort", Number(event.target.value) || 0);
    },
    [updatePortForward],
  );

  const getHostPortChangeHandler = useCallback(
    (index: number) => (event: ChangeEvent<HTMLInputElement>) => {
      updatePortForward(index, "hostPort", Number(event.target.value) || 0);
    },
    [updatePortForward],
  );

  const getProtocolChangeHandler = useCallback(
    (index: number) => (value: string | null) => {
      updatePortForward(index, "proto", value || "tcp");
    },
    [updatePortForward],
  );

  const triggerRender = useMemo(
    () => <Button variant="ghost" size="icon" className="size-7" />,
    [],
  );

  const doneButtonRender = useMemo(() => <Button variant="outline" size="sm" />, []);

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <div className="flex items-center justify-between w-full">
        <Label className="mb-0.5">Port Forwards</Label>
        <DialogTrigger render={triggerRender}>
          {editableForwards.length === 0 ? (
            <PlusIcon className="size-2.5 mr-[4px]" />
          ) : (
            <PencilIcon className="size-2.5 mr-[4px]" />
          )}
        </DialogTrigger>
      </div>

      <DialogContent className="sm:max-w-md" showCloseButton={!hasInvalid}>
        <DialogHeader>
          <DialogTitle>Configure Port Forwards</DialogTitle>
          <DialogDescription>Map ports from the guest VM to the host machine.</DialogDescription>
        </DialogHeader>
        <TooltipProvider>
          <div className="flex flex-col gap-4 py-4 overflow-y-auto max-h-[60vh] pr-1">
            {editableForwards.map((pf, idx) => (
              <div
                key={idx}
                className="flex flex-col gap-2 p-3 border border-border/50 bg-muted/20 relative group"
              >
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute top-1 right-1 size-6 opacity-0 group-hover:opacity-100 transition-opacity"
                  onClick={getRemovePortForwardHandler(idx)}
                >
                  <Trash2Icon className="size-3 text-destructive" />
                </Button>
                <div className="grid grid-cols-2 gap-2">
                  <div className="grid gap-1">
                    <FieldLabel
                      label="Guest Port"
                      tooltip="Port number inside the guest VM to forward."
                    />
                    <Input
                      type="number"
                      value={pf.guestPort}
                      onChange={getGuestPortChangeHandler(idx)}
                      className="h-7 text-[11px]"
                    />
                  </div>
                  <div className="grid gap-1">
                    <FieldLabel
                      label="Host Port"
                      tooltip="Port number on the host (macOS) that maps to the guest port."
                    />
                    <Input
                      type="number"
                      value={pf.hostPort}
                      onChange={getHostPortChangeHandler(idx)}
                      className="h-7 text-[11px]"
                    />
                  </div>
                </div>
                <div className="grid gap-1">
                  <FieldLabel
                    label="Protocol"
                    tooltip="Network protocol. TCP for most services (HTTP, SSH, databases). UDP for DNS, streaming, etc."
                  />
                  <Select value={pf.proto || "tcp"} onValueChange={getProtocolChangeHandler(idx)}>
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
            <Button variant="outline" size="xs" className="border-dashed" onClick={addPortForward}>
              <PlusIcon className="size-3 mr-1" /> Add Port Forward
            </Button>
          </div>
        </TooltipProvider>
        {hasInvalid && (
          <p className="text-[10px] text-destructive font-medium animate-pulse">
            All port forwards must have guest/host ports and a protocol.
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
