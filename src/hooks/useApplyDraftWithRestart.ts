import { useCallback, useRef, useState } from "react";
import { useUpdateLimaInstanceDraft } from "./useUpdateLimaInstanceDraft";
import { useLimaInstance } from "./useLimaInstance";
import { useSelectedInstance } from "./useSelectedInstance";
import { useOnLimaStopLogs } from "./useOnLimaStopLogs";
import { useOnLimaStartLogs } from "./useOnLimaStartLogs";

export type ApplyPhase = "idle" | "stopping" | "writing" | "starting" | "done" | "error";

/**
 * Orchestrates the full stop → write config → start cycle for applying
 * draft config changes to a running Lima instance.
 */
export function useApplyDraftWithRestart() {
  const { selectedName } = useSelectedInstance();
  const { applyDraftAsync } = useUpdateLimaInstanceDraft();
  const { stopInstance, startInstance } = useLimaInstance();
  const [phase, setPhase] = useState<ApplyPhase>("idle");
  const [error, setError] = useState<string | null>(null);

  // Guard to avoid reacting to stop/start events not initiated by this hook
  const applyInProgressRef = useRef(false);

  const stopLogs = useOnLimaStopLogs(selectedName || "", {
    onSuccess: async () => {
      if (!applyInProgressRef.current) return;
      setPhase("writing");
      try {
        await applyDraftAsync();
        setPhase("starting");
        if (selectedName) {
          startInstance(selectedName);
        }
      } catch (e) {
        setPhase("error");
        setError(e instanceof Error ? e.message : String(e));
        applyInProgressRef.current = false;
      }
    },
  });

  const startLogs = useOnLimaStartLogs(selectedName || "", {
    onSuccess: () => {
      if (!applyInProgressRef.current) return;
      setPhase("done");
      applyInProgressRef.current = false;
    },
  });

  const startApply = useCallback(() => {
    if (!selectedName) return;
    applyInProgressRef.current = true;
    setError(null);
    setPhase("stopping");
    stopInstance(selectedName);
  }, [selectedName, stopInstance]);

  const reset = useCallback(() => {
    setPhase("idle");
    setError(null);
    applyInProgressRef.current = false;
  }, []);

  return {
    error,
    phase,
    reset,
    startApply,
    startLogs,
    stopLogs,
  };
}
