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
  return (
    <Dialog open={open} onOpenChange={onDialogOpenChange}>
      <DialogTrigger
        render={
          <Button
            variant="default"
            size="icon"
            aria-label="Create new Lima instance"
            className={buttonClassName}
          >
            <PlusIcon />
          </Button>
        }
      />
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Create Instance</DialogTitle>
          <DialogDescription>Create a new Lima instance</DialogDescription>
        </DialogHeader>
        <CreateInstanceConfigForm />
        <DialogFooter>
          <Button variant="outline" onClick={() => onDialogOpenChange(false)}>
            Cancel
          </Button>
          <Button
            variant="default"
            onClick={() => {
              onClickCreate();
              onDialogOpenChange(false);
            }}
          >
            Create
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
