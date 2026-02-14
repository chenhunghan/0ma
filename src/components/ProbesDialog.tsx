import { useCallback, useMemo, useState, type ChangeEvent } from "react";
import { Input } from "./ui/input";
import { Label } from "./ui/label";

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
import { PencilIcon, PlusIcon, Trash2Icon } from "lucide-react";
import type { Probe } from "src/types/LimaConfig";
import Editor from "@monaco-editor/react";

interface Props {
  value: Probe[];
  onChange: (probes: Probe[]) => void;
}

const EDITOR_OPTIONS = {
  automaticLayout: true,
  folding: false,
  fontSize: 11,
  glyphMargin: false,
  lineDecorationsWidth: 0,
  lineNumbers: "off",
  lineNumbersMinChars: 3,
  minimap: { enabled: false },
  padding: { bottom: 8, top: 8 },
  scrollBeyondLastLine: false,
  scrollbar: {
    horizontalScrollbarSize: 6,
    verticalScrollbarSize: 6,
  },
} as const;

export function ProbesDialog({ value: probes, onChange }: Props) {
  const [isProbesDialogOpen, setIsProbesDialogOpen] = useState(false);

  const updateArrayField = useCallback(
    (index: number, subField: keyof Probe, value: string) => {
      const arr = [...(probes || [])];
      arr[index] = { ...arr[index], [subField]: value };
      onChange(arr);
    },
    [onChange, probes],
  );

  const addArrayItem = useCallback(
    (defaultItem: Probe) => {
      const arr = [...(probes || []), defaultItem];
      onChange(arr);
    },
    [onChange, probes],
  );

  const removeArrayItem = useCallback(
    (index: number) => {
      const arr = [...(probes || [])];
      arr.splice(index, 1);
      onChange(arr);
    },
    [onChange, probes],
  );

  const hasInvalidProbe = probes?.some((p) => !p.description?.trim() || !p.script?.trim());

  const handleOpenChange = useCallback(
    (open: boolean) => {
      if (!open && hasInvalidProbe) {
        return;
      }
      setIsProbesDialogOpen(open);
    },
    [hasInvalidProbe],
  );

  const getRemoveArrayItemHandler = useCallback(
    (index: number) => () => {
      removeArrayItem(index);
    },
    [removeArrayItem],
  );

  const getDescriptionChangeHandler = useCallback(
    (index: number) => (event: ChangeEvent<HTMLInputElement>) => {
      updateArrayField(index, "description", event.target.value);
    },
    [updateArrayField],
  );

  const getScriptChangeHandler = useCallback(
    (index: number) => (value: string | undefined) => {
      updateArrayField(index, "script", value || "");
    },
    [updateArrayField],
  );

  const getHintChangeHandler = useCallback(
    (index: number) => (event: ChangeEvent<HTMLInputElement>) => {
      updateArrayField(index, "hint", event.target.value);
    },
    [updateArrayField],
  );

  const handleAddProbe = useCallback(() => {
    addArrayItem({ description: "", script: "" });
  }, [addArrayItem]);

  const triggerRender = useMemo(
    () => <Button variant="ghost" size="icon" className="size-7" />,
    [],
  );

  const doneButtonRender = useMemo(() => <Button variant="outline" size="sm" />, []);

  return (
    <Dialog open={isProbesDialogOpen} onOpenChange={handleOpenChange}>
      <div className="flex items-center justify-between w-full">
        <Label className="mb-0.5">Probes</Label>
        <DialogTrigger render={triggerRender}>
          {!probes || probes.length === 0 ? (
            <PlusIcon className="size-2.5 mr-[4px]" />
          ) : (
            <PencilIcon className="size-2.5 mr-[4px]" />
          )}
        </DialogTrigger>
      </div>

      <DialogContent className="sm:max-w-md" showCloseButton={!hasInvalidProbe}>
        <DialogHeader>
          <DialogTitle>Configure Probes</DialogTitle>
          <DialogDescription>Add probes to check if the VM is ready.</DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-4 py-4 overflow-y-auto max-h-[60vh] pr-1">
          {probes?.map((p, idx) => (
            <div
              key={`${p.description}-${p.script}-${p.hint ?? ""}`}
              className="flex flex-col gap-2 p-3 border border-border/50 bg-muted/20 relative group"
            >
              <Button
                variant="ghost"
                size="icon"
                className="absolute top-1 right-1 size-6 opacity-0 group-hover:opacity-100 transition-opacity"
                onClick={getRemoveArrayItemHandler(idx)}
              >
                <Trash2Icon className="size-3 text-destructive" />
              </Button>
              <div className="grid gap-1">
                <Label className="text-[10px] uppercase text-muted-foreground">Description</Label>
                <Input
                  value={p.description}
                  onChange={getDescriptionChangeHandler(idx)}
                  className="h-7 text-[11px]"
                />
              </div>
              <div className="grid gap-1">
                <Label className="text-[10px] uppercase text-muted-foreground">Script</Label>
                <div className="min-h-[100px] border border-border/50 rounded-md overflow-hidden bg-zinc-950">
                  <Editor
                    defaultLanguage="shell"
                    theme="vs-dark"
                    value={p.script}
                    onChange={getScriptChangeHandler(idx)}
                    options={EDITOR_OPTIONS}
                  />
                </div>
              </div>
              <div className="grid gap-1">
                <Label className="text-[10px] uppercase text-muted-foreground">
                  Hint (Optional)
                </Label>
                <Input
                  value={p.hint || ""}
                  onChange={getHintChangeHandler(idx)}
                  className="h-7 text-[11px]"
                />
              </div>
            </div>
          ))}
          <Button variant="outline" size="xs" className="border-dashed" onClick={handleAddProbe}>
            <PlusIcon className="size-3 mr-1" /> Add Probe
          </Button>
        </div>
        {hasInvalidProbe && (
          <p className="text-[10px] text-destructive font-medium animate-pulse">
            All probes must have a description and script.
          </p>
        )}
        <DialogFooter>
          <DialogClose disabled={hasInvalidProbe} render={doneButtonRender}>
            Done
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
