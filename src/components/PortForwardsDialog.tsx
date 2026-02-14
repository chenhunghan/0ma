import { useCallback, useMemo, useState, type ChangeEvent } from "react";
import { PencilIcon, PlusIcon, Trash2Icon } from "lucide-react";
import type { PortForward } from "src/types/LimaConfig";
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
  value: PortForward[];
  onChange: (portForwards: PortForward[]) => void;
}

export function PortForwardsDialog({ value: portForwards, onChange }: Props) {
  const [isOpen, setIsOpen] = useState(false);

  const hasInvalid = portForwards.some(
    (portForward) => !portForward.guestPort || !portForward.hostPort || !portForward.proto,
  );

  const updatePortForward = useCallback(
    (index: number, field: string, value: string | number) => {
      const newPortForwards = [...portForwards];
      newPortForwards[index] = { ...newPortForwards[index], [field]: value };
      onChange(newPortForwards);
    },
    [onChange, portForwards],
  );

  const addPortForward = useCallback(() => {
    onChange([
      ...portForwards,
      {
        guestIPMustBeZero: true,
        guestPort: 8080,
        hostIP: "127.0.0.1",
        hostPort: 8080,
        proto: "tcp",
      },
    ]);
  }, [onChange, portForwards]);

  const removePortForward = useCallback(
    (index: number) => {
      const newPortForwards = [...portForwards];
      newPortForwards.splice(index, 1);
      onChange(newPortForwards);
    },
    [onChange, portForwards],
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
    (index: number) => (value: string) => {
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
          {portForwards.length === 0 ? (
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
        <div className="flex flex-col gap-4 py-4 overflow-y-auto max-h-[60vh] pr-1">
          {portForwards.map((pf, idx) => (
            <div
              key={`${pf.proto ?? "tcp"}-${pf.guestPort ?? "0"}-${pf.hostPort ?? "0"}-${pf.hostIP ?? "127.0.0.1"}-${pf.guestIPMustBeZero ? "true" : "false"}`}
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
                  <Label className="text-[10px] uppercase text-muted-foreground">Guest Port</Label>
                  <Input
                    type="number"
                    value={pf.guestPort}
                    onChange={getGuestPortChangeHandler(idx)}
                    className="h-7 text-[11px]"
                  />
                </div>
                <div className="grid gap-1">
                  <Label className="text-[10px] uppercase text-muted-foreground">Host Port</Label>
                  <Input
                    type="number"
                    value={pf.hostPort}
                    onChange={getHostPortChangeHandler(idx)}
                    className="h-7 text-[11px]"
                  />
                </div>
              </div>
              <div className="grid gap-1">
                <Label className="text-[10px] uppercase text-muted-foreground">Protocol</Label>
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
