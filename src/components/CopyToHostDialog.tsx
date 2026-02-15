import { useCallback, useMemo, useState, type ChangeEvent } from "react";
import { InfoIcon, PencilIcon, PlusIcon, Trash2Icon } from "lucide-react";
import type { CopyToHost } from "src/types/LimaConfig";
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
  value: CopyToHost[];
  onChange: (rules: CopyToHost[]) => void;
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

export function CopyToHostDialog({ value: rules, onChange }: Props) {
  const [isOpen, setIsOpen] = useState(false);

  const hasInvalid = rules.some((rule) => !rule.guest?.trim() || !rule.host?.trim());

  const updateRule = useCallback(
    (index: number, field: string, value: string | boolean) => {
      const newRules = [...rules];
      newRules[index] = { ...newRules[index], [field]: value };
      onChange(newRules);
    },
    [onChange, rules],
  );

  const addRule = useCallback(() => {
    onChange([...rules, { deleteOnStop: false, guest: "", host: "" }]);
  }, [onChange, rules]);

  const removeRule = useCallback(
    (index: number) => {
      const newRules = [...rules];
      newRules.splice(index, 1);
      onChange(newRules);
    },
    [onChange, rules],
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

  const getRemoveRuleHandler = useCallback(
    (index: number) => () => {
      removeRule(index);
    },
    [removeRule],
  );

  const getGuestChangeHandler = useCallback(
    (index: number) => (event: ChangeEvent<HTMLInputElement>) => {
      updateRule(index, "guest", event.target.value);
    },
    [updateRule],
  );

  const getHostChangeHandler = useCallback(
    (index: number) => (event: ChangeEvent<HTMLInputElement>) => {
      updateRule(index, "host", event.target.value);
    },
    [updateRule],
  );

  const getDeleteOnStopChangeHandler = useCallback(
    (index: number) => (value: string | null) => {
      updateRule(index, "deleteOnStop", value === "true");
    },
    [updateRule],
  );

  const triggerRender = useMemo(
    () => <Button variant="ghost" size="icon" className="size-7" />,
    [],
  );

  const doneButtonRender = useMemo(() => <Button variant="outline" size="sm" />, []);

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <div className="flex items-center justify-between w-full">
        <Label className="mb-0.5">Copy to Host</Label>
        <DialogTrigger render={triggerRender}>
          {rules.length === 0 ? (
            <PlusIcon className="size-2.5 mr-[4px]" />
          ) : (
            <PencilIcon className="size-2.5 mr-[4px]" />
          )}
        </DialogTrigger>
      </div>

      <DialogContent className="sm:max-w-md" showCloseButton={!hasInvalid}>
        <DialogHeader>
          <DialogTitle>Configure Copy to Host</DialogTitle>
          <DialogDescription>Copy files from the guest VM to the host machine.</DialogDescription>
        </DialogHeader>
        <TooltipProvider>
          <div className="flex flex-col gap-4 py-4 overflow-y-auto max-h-[60vh] pr-1">
            {rules.map((rule, idx) => (
              <div
                key={idx}
                className="flex flex-col gap-2 p-3 border border-border/50 bg-muted/20 relative group"
              >
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute top-1 right-1 size-6 opacity-0 group-hover:opacity-100 transition-opacity"
                  onClick={getRemoveRuleHandler(idx)}
                >
                  <Trash2Icon className="size-3 text-destructive" />
                </Button>
                <div className="grid gap-1">
                  <FieldLabel
                    label="Guest Path"
                    tooltip="File path inside the guest VM to copy. Supports variables: {{.Home}}, {{.Name}}, {{.Hostname}}, {{.UID}}, {{.User}}."
                  />
                  <Input
                    value={rule.guest}
                    onChange={getGuestChangeHandler(idx)}
                    placeholder="/path/in/guest"
                    className="h-7 text-[11px]"
                  />
                </div>
                <div className="grid gap-1">
                  <FieldLabel
                    label="Host Path"
                    tooltip="Destination path on the host. Supports variables: {{.Dir}} (instance dir ~/.lima/<name>/), {{.Home}}, {{.Name}}, {{.UID}}, {{.User}}."
                  />
                  <Input
                    value={rule.host}
                    onChange={getHostChangeHandler(idx)}
                    placeholder="{{.Dir}}/copied-from-guest/file"
                    className="h-7 text-[11px]"
                  />
                </div>
                <div className="grid gap-1">
                  <FieldLabel
                    label="Delete on Stop"
                    tooltip="Remove the copied file from the host when the VM is stopped."
                  />
                  <Select
                    value={rule.deleteOnStop ? "true" : "false"}
                    onValueChange={getDeleteOnStopChangeHandler(idx)}
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
            <Button variant="outline" size="xs" className="border-dashed" onClick={addRule}>
              <PlusIcon className="size-3 mr-1" /> Add Rule
            </Button>
          </div>
        </TooltipProvider>
        {hasInvalid && (
          <p className="text-[10px] text-destructive font-medium animate-pulse">
            All rules must have valid Guest and Host paths.
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
