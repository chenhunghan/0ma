import { Button } from "./ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "./ui/dialog";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  instanceName: string | null;
  onConfirm: () => void;
}

export function StopInstanceDialog({ open, onOpenChange, instanceName, onConfirm }: Props) {
  if (!instanceName) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Stop Instance</DialogTitle>
          <DialogDescription>
            Are you sure you want to stop instance <strong>{instanceName}</strong>?
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={() => {
              onConfirm();
              onOpenChange(false);
            }}
          >
            Stop Instance
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
