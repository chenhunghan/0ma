import { useCallback } from "react";
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

export function ApplyDraftConfirmDialog({ open, onOpenChange, instanceName, onConfirm }: Props) {
  if (!instanceName) {
    return null;
  }

  const handleCancel = useCallback(() => {
    onOpenChange(false);
  }, [onOpenChange]);

  const handleConfirm = useCallback(() => {
    onConfirm();
    onOpenChange(false);
  }, [onConfirm, onOpenChange]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Apply Configuration Changes</DialogTitle>
          <DialogDescription>
            Instance <strong>{instanceName}</strong> is currently running. Applying changes requires
            restarting the instance (stop, write config, start). The instance will be temporarily
            unavailable during the restart.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="ghost" onClick={handleCancel}>
            Cancel
          </Button>
          <Button onClick={handleConfirm}>Apply &amp; Restart</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
