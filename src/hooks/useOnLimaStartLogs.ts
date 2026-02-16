import { useEffect, useMemo, useRef } from "react";
import { listen } from "@tauri-apps/api/event";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import type { Log, LogState } from "src/types/Log";
import { insertLog } from "src/services/insertLog";

interface LimaLogPayload {
  instance_name: string;
  message: string;
  message_id: string;
  timestamp: string;
}

type StartLogState = LogState & {
  isReady?: boolean;
};
const DEFAULT_LIMA_START_STATE: StartLogState = {
  error: [],
  isLoading: false,
  isReady: undefined,
  isSuccess: undefined,
  stderr: [],
  stdout: [],
};

const getStartLogsQueryKey = (instanceName: string) => ["lima", "start-logs", instanceName];

/**
 * UseOnLimaStartLogs
 *
 * Tracks the logs for the "start instance" operation.
 * Similar to useOnLimaCreateLogs but for the start command.
 */
export function useOnLimaStartLogs(
  instanceName: string,
  options?: { onReady?: () => void; onSuccess?: () => void },
) {
  const queryClient = useQueryClient();
  const queryKey = useMemo(() => getStartLogsQueryKey(instanceName), [instanceName]);
  const onReadyRef = useRef(options?.onReady);
  const onSuccessRef = useRef(options?.onSuccess);

  useEffect(() => {
    onReadyRef.current = options?.onReady;
  }, [options?.onReady]);

  useEffect(() => {
    onSuccessRef.current = options?.onSuccess;
  }, [options?.onSuccess]);

  const { data } = useQuery({
    gcTime: Infinity,
    initialData: DEFAULT_LIMA_START_STATE,
    queryFn: () => queryClient.getQueryData<StartLogState>(queryKey),
    queryKey,
    staleTime: Infinity,
  });

  useEffect(() => {
    // Skip listener setup when instanceName is empty
    if (!instanceName) {
      return;
    }

    let active = true;
    const unlistenPromises: Promise<() => void>[] = [];

    const updateCache = (updater: (prev: StartLogState) => StartLogState) => {
      if (!active) {
        return;
      }
      queryClient.setQueryData<StartLogState>(queryKey, (prev) => {
        if (!prev) {
          return DEFAULT_LIMA_START_STATE;
        }
        return updater(prev);
      });
    };

    // 1. Start Started
    unlistenPromises.push(
      listen<LimaLogPayload>("lima-instance-start", (event) => {
        if (event.payload.instance_name !== instanceName) {
          return;
        }
        updateCache(() => ({
          // Reset all logs
          ...DEFAULT_LIMA_START_STATE,
          isLoading: true,
        }));
      }),
    );

    // 2. Stdout
    unlistenPromises.push(
      listen<LimaLogPayload>("lima-instance-start-stdout", (event) => {
        const { instance_name, message, message_id, timestamp } = event.payload;
        if (instance_name !== instanceName) {
          return;
        }

        updateCache((prev) => {
          if (prev.stdout.some((l) => l.id === message_id)) {
            return prev;
          }

          const newLog: Log = { id: message_id, message, timestamp };
          return {
            ...prev,
            stdout: insertLog(prev.stdout, newLog),
          };
        });
      }),
    );

    // 2.5 Ready (treat as stdout for now)
    unlistenPromises.push(
      listen<LimaLogPayload>("lima-instance-start-ready", (event) => {
        const { instance_name } = event.payload;
        if (instance_name !== instanceName) {
          return;
        }

        updateCache((prev) => ({
          ...prev,
          isReady: true,
        }));
        onReadyRef.current?.();
      }),
    );

    // 3. Stderr
    unlistenPromises.push(
      listen<LimaLogPayload>("lima-instance-start-stderr", (event) => {
        const { instance_name, message, message_id, timestamp } = event.payload;
        if (instance_name !== instanceName) {
          return;
        }

        updateCache((prev) => {
          if (prev.stderr.some((l) => l.id === message_id)) {
            return prev;
          }

          const newLog: Log = { id: message_id, message, timestamp };
          return {
            ...prev,
            stderr: insertLog(prev.stderr, newLog),
          };
        });
      }),
    );

    // 4. Error
    unlistenPromises.push(
      listen<LimaLogPayload>("lima-instance-start-error", (event) => {
        if (event.payload.instance_name !== instanceName) {
          return;
        }
        const { message, message_id, timestamp } = event.payload;

        updateCache((prev) => {
          if (prev.error.some((l) => l.id === message_id)) {
            return prev;
          }

          const newLog: Log = { id: message_id, message, timestamp };
          return {
            ...prev,
            isLoading: false,
            error: insertLog(prev.error, newLog),
          };
        });
      }),
    );

    // 5. Success
    unlistenPromises.push(
      listen<LimaLogPayload>("lima-instance-start-success", (event) => {
        if (event.payload.instance_name !== instanceName) {
          return;
        }
        updateCache((prev) => ({
          ...prev,
          isLoading: false,
          isSuccess: true,
        }));
        // Invalidate instances list to update status
        queryClient.invalidateQueries({ queryKey: ["instances"] });
        onSuccessRef.current?.();
      }),
    );

    return () => {
      active = false;
      void Promise.allSettled(unlistenPromises).then((results) => {
        const unlistenCalls: Promise<unknown>[] = [];

        for (const result of results) {
          if (result.status !== "fulfilled") {
            continue;
          }
          try {
            unlistenCalls.push(Promise.resolve(result.value()).catch(() => {}));
          } catch {
            // Listener may have already been cleaned up
          }
        }

        void Promise.allSettled(unlistenCalls);
      });
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [instanceName, queryClient, queryKey]);

  return {
    error: data?.error ?? [],
    isLoading: data?.isLoading ?? false,
    isReady: data?.isReady,
    isSuccess: data?.isSuccess,
    reset: () => queryClient.setQueryData(queryKey, DEFAULT_LIMA_START_STATE),
    stderr: data?.stderr ?? [],
    stdout: data?.stdout ?? [],
  };
}
