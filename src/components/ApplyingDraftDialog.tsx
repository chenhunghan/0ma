import { useCallback, useMemo } from "react";
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
import { CheckCircle2, Loader2, XCircle } from "lucide-react";
import type { ApplyPhase } from "src/hooks/useApplyDraftWithRestart";
import type { LogState } from "src/types/Log";

interface LogHookState {
  stdout: LogState["stdout"];
  stderr: LogState["stderr"];
  error: LogState["error"];
  isLoading: boolean;
  isSuccess?: boolean;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  phase: ApplyPhase;
  error: string | null;
  stopLogState: LogHookState;
  startLogState: LogHookState;
  onDone: () => void;
}

export function ApplyingDraftDialog({
  open,
  onOpenChange,
  phase,
  error,
  stopLogState,
  startLogState,
  onDone,
}: Props) {
  const isDone = phase === "done";
  const isError = phase === "error" || stopLogState.error.length > 0 || startLogState.error.length > 0;
  const isInProgress = !isDone && !isError;

  const title = useMemo(() => {
    switch (phase) {
      case "stopping":
        return "Stopping Instance...";
      case "writing":
        return "Writing Configuration...";
      case "starting":
        return "Starting Instance...";
      case "done":
        return "Configuration Applied";
      case "error":
        return "Error Applying Configuration";
      default:
        return "Applying Configuration...";
    }
  }, [phase]);

  const description = useMemo(() => {
    switch (phase) {
      case "stopping":
        return "Stopping the instance to apply configuration changes.";
      case "writing":
        return "Writing the new configuration to disk.";
      case "starting":
        return "Starting the instance with the new configuration.";
      case "done":
        return "The configuration has been applied and the instance restarted successfully.";
      case "error":
        return error || "An error occurred while applying configuration changes.";
      default:
        return "Please wait...";
    }
  }, [phase, error]);

  const combinedLogState: LogState = useMemo(
    () => ({
      stdout: [...stopLogState.stdout, ...startLogState.stdout],
      stderr: [...stopLogState.stderr, ...startLogState.stderr],
      error: [...stopLogState.error, ...startLogState.error],
      isLoading: isInProgress,
      isSuccess: isDone,
    }),
    [stopLogState, startLogState, isInProgress, isDone],
  );

  const handleClose = useCallback(() => {
    onOpenChange(false);
    if (isDone) {
      onDone();
    }
  }, [onOpenChange, isDone, onDone]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {isInProgress && <Loader2 className="h-4 w-4 animate-spin" />}
            {isDone && <CheckCircle2 className="h-4 w-4 text-green-500" />}
            {isError && <XCircle className="h-4 w-4 text-destructive" />}
            {title}
          </DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <LogViewer logState={combinedLogState} />
        <DialogFooter>
          <Button variant={isDone ? "default" : "outline"} onClick={handleClose}>
            {isDone ? "Done" : "Close"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
