import { useCallback, useMemo } from "react";
import { PlusIcon } from "lucide-react";
import { Button } from "./ui/button";
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

interface Props {
  buttonClassName?: string;
  open: boolean;
  onDialogOpenChange: (open: boolean) => void;
  onClickCreate: () => void;
}

export function CreateInstanceDialog({
  buttonClassName,
  open,
  onDialogOpenChange,
  onClickCreate,
}: Props) {
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
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Create Instance</DialogTitle>
          <DialogDescription>Create a new Lima instance</DialogDescription>
        </DialogHeader>
        <CreateInstanceConfigForm />
        <DialogFooter>
          <Button variant="outline" onClick={handleCancel}>
            Cancel
          </Button>
          <Button variant="default" onClick={handleCreate}>
            Create
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
