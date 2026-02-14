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
import { useOnLimaStartLogs } from "src/hooks/useOnLimaStartLogs";

import { Loader2 } from "lucide-react";

interface Props {
  open: boolean;
  onDialogOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
  instanceName: string | null;
}

export function StartingInstanceDialog({
  open,
  onDialogOpenChange,
  onSuccess,
  instanceName,
}: Props) {
  const logState = useOnLimaStartLogs(instanceName || "", {
    onSuccess,
  });

  const handleOpenChange = useCallback(
    (newOpen: boolean) => {
      if (!newOpen) {
        // User manually closed the dialog.
        // This includes: ESC key, clicking background overlay, or clicking the "Close" button.
        onDialogOpenChange(false);

        // Only switch tab if the instance is ready or successful
        if (logState.isReady || logState.isSuccess) {
          onSuccess?.();
        }
      } else {
        onDialogOpenChange(true);
      }
    },
    [logState.isReady, logState.isSuccess, onDialogOpenChange, onSuccess],
  );

  const handleClose = useCallback(() => {
    onDialogOpenChange(false);
  }, [onDialogOpenChange]);

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <StartingInstanceDialogContent
        isReady={logState.isReady}
        isSuccess={logState.isSuccess}
        isError={logState.error.length > 0}
        onClose={handleClose}
      >
        <LogViewer logState={logState} />
      </StartingInstanceDialogContent>
    </Dialog>
  );
}

function StartingInstanceDialogContent({
  children,
  isReady,
  isSuccess,
  isError,
  onClose,
}: {
  children: React.ReactNode;
  isReady?: boolean;
  isSuccess?: boolean;
  isError?: boolean;
  onClose: () => void;
}) {
  return (
    <DialogContent className="sm:max-w-2xl">
      <DialogHeader>
        <DialogTitle className="flex items-center gap-2">
          {!isSuccess && !isError && <Loader2 className="h-4 w-4 animate-spin" />}
          {isSuccess ? "Instance Started" : "Starting Instance..."}
        </DialogTitle>
        <DialogDescription>
          {isSuccess
            ? "The instance has started successfully."
            : isReady
              ? "The instance is ready, you can close the dialog"
              : "Please wait while the instance starts."}
        </DialogDescription>
      </DialogHeader>
      {children}
      <DialogFooter>
        <Button
          variant={isSuccess || isReady ? "default" : "outline"}
          title={isSuccess ? "Close the dialog" : "The instance is ready, you can close the dialog"}
          onClick={onClose}
        >
          {isSuccess ? "Done" : isReady ? "Ready" : "Close"}
        </Button>
      </DialogFooter>
    </DialogContent>
  );
}
