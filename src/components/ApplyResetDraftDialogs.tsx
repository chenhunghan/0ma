import { useCallback, useState } from "react";
import { CheckIcon, RotateCcwIcon } from "lucide-react";
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
  const { isDirty, applyDraft, resetDraft, isApplying } = useUpdateLimaInstanceDraft();
  const {
    phase,
    error: applyError,
    startApply,
    reset: resetApplyState,
    stopLogs,
    startLogs,
  } = useApplyDraftWithRestart();

  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const [progressDialogOpen, setProgressDialogOpen] = useState(false);

  const isRunning = selectedInstance?.status === InstanceStatus.Running;
  const isStopped = selectedInstance?.status === InstanceStatus.Stopped;

  const handleApplyClick = useCallback(() => {
    if (isStopped) {
      applyDraft();
    } else if (isRunning) {
      setConfirmDialogOpen(true);
    }
  }, [isStopped, isRunning, applyDraft]);

  const handleConfirmApply = useCallback(() => {
    startApply();
    setProgressDialogOpen(true);
  }, [startApply]);

  const handleProgressDone = useCallback(() => {
    setProgressDialogOpen(false);
    resetApplyState();
  }, [resetApplyState]);

  const handleReset = useCallback(() => {
    resetDraft();
  }, [resetDraft]);

  return (
    <>
      <Button
        variant={isDirty ? "default" : "outline"}
        size="sm"
        disabled={!isDirty || isApplying || (!isStopped && !isRunning)}
        onClick={handleApplyClick}
        aria-label="Apply configuration changes"
      >
        {isApplying ? <Spinner /> : <CheckIcon className="md:hidden" />}
        <span className="hidden md:inline">{isApplying ? "Applying..." : "Apply"}</span>
      </Button>

      <Button
        variant="ghost"
        size="sm"
        disabled={!isDirty || isApplying}
        onClick={handleReset}
        aria-label="Reset configuration changes"
      >
        <RotateCcwIcon className="md:hidden" />
        <span className="hidden md:inline">Reset</span>
      </Button>

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
        error={applyError}
        stopLogState={stopLogs}
        startLogState={startLogs}
        onDone={handleProgressDone}
      />
    </>
  );
}
