import { useCallback, useState } from "react";
import { CheckIcon } from "lucide-react";
import { Button } from "./ui/button";
import { useSelectedInstance } from "src/hooks/useSelectedInstance";
import { useUpdateLimaInstanceDraft } from "src/hooks/useUpdateLimaInstanceDraft";
import { InstanceStatus } from "src/types/InstanceStatus";
import { ApplyDraftConfirmDialog } from "./ApplyDraftConfirmDialog";
import { ApplyingDraftDialog } from "./ApplyingDraftDialog";
import { useApplyDraftWithRestart } from "src/hooks/useApplyDraftWithRestart";
import { Spinner } from "./ui/spinner";

export function ApplyResetDraftDialogs() {
  const { selectedInstance, selectedName } = useSelectedInstance();
  const { isDirty, applyDraftAsync, applyError, isApplying } =
    useUpdateLimaInstanceDraft();
  const {
    phase,
    error: restartError,
    startApply,
    reset: resetApplyState,
    stopLogs,
    startLogs,
  } = useApplyDraftWithRestart();

  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const [progressDialogOpen, setProgressDialogOpen] = useState(false);

  const isRunning = selectedInstance?.status === InstanceStatus.Running;
  const isStopped = selectedInstance?.status === InstanceStatus.Stopped;

  const handleApplyClick = useCallback(async () => {
    if (isStopped) {
      await applyDraftAsync();
    } else if (isRunning) {
      setConfirmDialogOpen(true);
    }
  }, [isStopped, isRunning, applyDraftAsync]);

  const handleConfirmApply = useCallback(() => {
    startApply();
    setProgressDialogOpen(true);
  }, [startApply]);

  const handleProgressDone = useCallback(() => {
    setProgressDialogOpen(false);
    resetApplyState();
  }, [resetApplyState]);

  return (
    <>
      <Button
        disabled={isApplying || (!isStopped && !isRunning)}
        onClick={handleApplyClick}
        aria-label="Apply configuration changes"
        className={!isDirty ? "invisible" : undefined}
      >
        {isApplying ? (
          <Spinner />
        ) : (
          <CheckIcon className="md:hidden" />
        )}
        <span className="hidden md:inline">
          {isApplying ? "Applying..." : "Apply"}
        </span>
      </Button>

      {applyError && (
        <span className="text-xs text-destructive" role="alert">
          {applyError.message}
        </span>
      )}

      <ApplyDraftConfirmDialog
        open={confirmDialogOpen}
        onOpenChange={setConfirmDialogOpen}
        instanceName={selectedName}
        onConfirm={handleConfirmApply}
      />

      <ApplyingDraftDialog
        open={progressDialogOpen}
        onOpenChange={setProgressDialogOpen}
        phase={phase}
        error={restartError}
        stopLogState={stopLogs}
        startLogState={startLogs}
        onDone={handleProgressDone}
      />
    </>
  );
}
