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
import { LogViewer } from "./LogViewer";
import { useOnLimaDeleteLogs } from "src/hooks/useOnLimaDeleteLogs";
import { Loader2 } from "lucide-react";

interface Props {
  open: boolean;
  onDialogOpenChange: (open: boolean) => void;
  instanceName: string | null;
  onSuccess?: () => void;
}

export function DeletingInstanceDialog({
  open,
  onDialogOpenChange,
  instanceName,
  onSuccess,
}: Props) {
  const logState = useOnLimaDeleteLogs(instanceName || "");

  const handleOpenChange = useCallback(
    (newOpen: boolean) => {
      if (!newOpen) {
        onDialogOpenChange(false);
        if (logState.isSuccess) {
          onSuccess?.();
        }
      } else {
        onDialogOpenChange(true);
      }
    },
    [logState.isSuccess, onDialogOpenChange, onSuccess],
  );

  const handleClose = useCallback(() => {
    onDialogOpenChange(false);
  }, [onDialogOpenChange]);

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {!logState.isSuccess && !logState.error.length && (
              <Loader2 className="h-4 w-4 animate-spin" />
            )}
            {logState.isSuccess ? "Instance Deleted" : "Deleting Instance..."}
          </DialogTitle>
          <DialogDescription>
            {logState.isSuccess
              ? "The instance has been deleted successfully."
              : "Please wait while the instance is deleted."}
          </DialogDescription>
        </DialogHeader>
        <LogViewer logState={logState} />
        <DialogFooter>
          <Button variant={logState.isSuccess ? "default" : "outline"} onClick={handleClose}>
            {logState.isSuccess ? "Done" : "Close"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
