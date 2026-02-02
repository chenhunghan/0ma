import { useState } from "react";
import { Label } from "./ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";

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
import type { Provision } from "src/types/LimaConfig";
import Editor from "@monaco-editor/react";

interface Props {
  value: Provision[];
  onChange: (steps: Provision[]) => void;
}

export function ProvisionStepsDialog({ value: provisionSteps, onChange }: Props) {
  const [isProvisionDialogOpen, setIsProvisionDialogOpen] = useState(false);

  const updateArrayField = (index: number, subField: keyof Provision, value: string) => {
    const arr = [...(provisionSteps || [])];
    arr[index] = { ...arr[index], [subField]: value };
    onChange(arr);
  };

  const addArrayItem = (defaultItem: Provision) => {
    const arr = [...(provisionSteps || []), defaultItem];
    onChange(arr);
  };

  const removeArrayItem = (index: number) => {
    const arr = [...(provisionSteps || [])];
    arr.splice(index, 1);
    onChange(arr);
  };

  const hasInvalidProvision = provisionSteps?.some((p) => !p.script?.trim());

  return (
    <Dialog
      open={isProvisionDialogOpen}
      onOpenChange={(open) => {
        if (!open && hasInvalidProvision) {
          return;
        }
        setIsProvisionDialogOpen(open);
      }}
    >
      <div className="flex items-center justify-between w-full">
        <Label className="mb-0.5">Provision</Label>
        <DialogTrigger render={<Button variant="ghost" size="icon" className="size-7" />}>
          {!provisionSteps || provisionSteps.length === 0 ? (
            <PlusIcon className="size-2.5 mr-[4px]" />
          ) : (
            <PencilIcon className="size-2.5 mr-[4px]" />
          )}
        </DialogTrigger>
      </div>

      <DialogContent className="sm:max-w-md" showCloseButton={!hasInvalidProvision}>
        <DialogHeader>
          <DialogTitle>Configure Provision Scripts</DialogTitle>
          <DialogDescription>
            Add scripts to run during the provisioning of the VM.
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-4 py-4 overflow-y-auto max-h-[60vh] pr-1">
          {provisionSteps?.map((p, idx) => (
            <div
              key={idx}
              className="flex flex-col gap-2 p-3 border border-border/50 bg-muted/20 relative group"
            >
              <Button
                variant="ghost"
                size="icon"
                className="absolute top-1 right-1 size-6 opacity-0 group-hover:opacity-100 transition-opacity"
                onClick={() => removeArrayItem(idx)}
              >
                <Trash2Icon className="size-3 text-destructive" />
              </Button>
              <div className="grid gap-1">
                <Label className="text-[10px] uppercase text-muted-foreground">Mode</Label>
                <Select
                  value={p.mode || "system"}
                  onValueChange={(val) => updateArrayField(idx, "mode", val || "system")}
                >
                  <SelectTrigger className="h-7 text-[11px] w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="system">system</SelectItem>
                    <SelectItem value="user">user</SelectItem>
                    <SelectItem value="boot">boot</SelectItem>
                    <SelectItem value="dependency">dependency</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-1">
                <Label className="text-[10px] uppercase text-muted-foreground">Script</Label>
                <div className="min-h-[100px] border border-border/50 rounded-md overflow-hidden bg-zinc-950">
                  <Editor
                    defaultLanguage="shell"
                    theme="vs-dark"
                    value={p.script}
                    onChange={(val) => updateArrayField(idx, "script", val || "")}
                    options={{
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
                    }}
                  />
                </div>
              </div>
            </div>
          ))}
          <Button
            variant="outline"
            size="xs"
            className="border-dashed"
            onClick={() => addArrayItem({ mode: "system", script: "" })}
          >
            <PlusIcon className="size-3 mr-1" /> Add Provision Step
          </Button>
        </div>
        {hasInvalidProvision && (
          <p className="text-[10px] text-destructive font-medium animate-pulse">
            All provision steps must have a script.
          </p>
        )}
        <DialogFooter>
          <DialogClose
            disabled={hasInvalidProvision}
            render={<Button variant="outline" size="sm" />}
          >
            Done
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
