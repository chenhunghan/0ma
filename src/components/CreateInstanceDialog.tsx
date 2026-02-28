import { useCallback, useEffect, useMemo, useState } from "react";
import { ContainerIcon, NetworkIcon, PlusIcon } from "lucide-react";
import { useCreateLimaInstanceDraft } from "src/hooks/useCreateLimaInstanceDraft";
import type { InstanceTemplate } from "src/types/LimaConfig";
import { Button } from "./ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "./ui/tooltip";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "./ui/dialog";
import { CreateInstanceConfigForm } from "./CreateInstanceConfigForm";

type Step = "template" | "config";

const TEMPLATES: { id: InstanceTemplate; label: string; description: string; icon: typeof ContainerIcon }[] = [
  {
    id: "docker",
    label: "Docker",
    description: "Docker engine only",
    icon: ContainerIcon,
  },
  {
    id: "kubernetes",
    label: "Kubernetes",
    description: "Docker + k0s single-node cluster",
    icon: NetworkIcon,
  },
];

function TemplateChooser({ onSelect }: { onSelect: (t: InstanceTemplate) => void }) {
  const handleSelect = useCallback(
    (id: InstanceTemplate) => () => onSelect(id),
    [onSelect],
  );

  return (
    <TooltipProvider>
      <div className="flex justify-center gap-4 px-4 py-6">
        {TEMPLATES.map(({ id, label, description, icon: Icon }) => (
          <Tooltip key={id}>
            <TooltipTrigger
              render={<Button variant="outline" size="lg" onClick={handleSelect(id)} />}
            >
              <Icon className="size-4" />
              {label}
            </TooltipTrigger>
            <TooltipContent>{description}</TooltipContent>
          </Tooltip>
        ))}
      </div>
    </TooltipProvider>
  );
}

interface Props {
  buttonClassName?: string;
  open: boolean;
  dismissible?: boolean;
  onDialogOpenChange: (open: boolean) => void;
  onClickCreate: () => void;
}

export function CreateInstanceDialog({
  buttonClassName,
  open,
  dismissible = true,
  onDialogOpenChange,
  onClickCreate,
}: Props) {
  const [step, setStep] = useState<Step>("template");
  const { setTemplate } = useCreateLimaInstanceDraft();

  // Reset to template step each time the dialog opens
  useEffect(() => {
    if (open) {
      setStep("template");
    }
  }, [open]);

  const handleTemplateSelect = useCallback(
    (t: InstanceTemplate) => {
      setTemplate(t);
      setStep("config");
    },
    [setTemplate],
  );

  const handleCancel = useCallback(() => {
    onDialogOpenChange(false);
  }, [onDialogOpenChange]);

  const handleCreate = useCallback(() => {
    onClickCreate();
    onDialogOpenChange(false);
  }, [onClickCreate, onDialogOpenChange]);

  const triggerRender = useMemo(
    () => (
      <Button
        variant="default"
        size="icon"
        aria-label="Create new Lima instance"
        className={buttonClassName}
      >
        <PlusIcon />
      </Button>
    ),
    [buttonClassName],
  );

  return (
    <Dialog open={open} onOpenChange={onDialogOpenChange}>
      <DialogTrigger render={triggerRender} />
      <DialogContent className={step === "template" ? "sm:max-w-sm" : "sm:max-w-2xl"} showCloseButton={dismissible}>
        <DialogHeader>
          <DialogTitle>Create Instance</DialogTitle>
          <DialogDescription>
            {step === "template" ? "Choose a template" : "Configure your new instance"}
          </DialogDescription>
        </DialogHeader>

        {step === "template" ? (
          <TemplateChooser onSelect={handleTemplateSelect} />
        ) : (
          <>
            <CreateInstanceConfigForm />
            <DialogFooter>
              {dismissible && (
                <Button variant="outline" onClick={handleCancel}>
                  Cancel
                </Button>
              )}
              <Button variant="default" onClick={handleCreate}>
                Create
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
