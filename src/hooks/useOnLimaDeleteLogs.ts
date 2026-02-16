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

const DEFAULT_LIMA_DELETE_STATE: LogState = {
  error: [],
  isLoading: false,
  isSuccess: undefined,
  stderr: [],
  stdout: [],
};

const getDeleteLogsQueryKey = (instanceName: string) => ["lima", "delete-logs", instanceName];

export function useOnLimaDeleteLogs(instanceName: string, options?: { onSuccess?: () => void }) {
  const queryClient = useQueryClient();
  const queryKey = useMemo(() => getDeleteLogsQueryKey(instanceName), [instanceName]);
  const onSuccessRef = useRef(options?.onSuccess);

  useEffect(() => {
    onSuccessRef.current = options?.onSuccess;
  }, [options?.onSuccess]);

  const { data } = useQuery({
    gcTime: Infinity,
    initialData: DEFAULT_LIMA_DELETE_STATE,
    queryFn: () => queryClient.getQueryData<LogState>(queryKey),
    queryKey,
    staleTime: Infinity,
  });

  useEffect(() => {
    if (!instanceName) {
      return;
    }

    let active = true;
    const unlistenPromises: Promise<() => void>[] = [];

    const updateCache = (updater: (prev: LogState) => LogState) => {
      if (!active) {
        return;
      }
      queryClient.setQueryData<LogState>(queryKey, (prev) => {
        if (!prev) {
          return DEFAULT_LIMA_DELETE_STATE;
        }
        return updater(prev);
      });
    };

    // 1. Delete Started
    unlistenPromises.push(
      listen<LimaLogPayload>("lima-instance-delete", (event) => {
        if (event.payload.instance_name !== instanceName) {
          return;
        }
        const { message, message_id, timestamp } = event.payload;
        const newLog: Log = { id: message_id, message, timestamp };

        updateCache(() => ({
          ...DEFAULT_LIMA_DELETE_STATE,
          isLoading: true,
          stdout: [newLog],
        }));
      }),
    );

    // 2. Stdout
    unlistenPromises.push(
      listen<LimaLogPayload>("lima-instance-delete-stdout", (event) => {
        const { instance_name, message, message_id, timestamp } = event.payload;
        if (instance_name !== instanceName) {
          return;
        }

        updateCache((prev) => {
          if (prev.stdout.some((l) => l.id === message_id)) {
            return prev;
          }

          const newLog: Log = { id: message_id, message, timestamp };
          return { ...prev, stdout: insertLog(prev.stdout, newLog) };
        });
      }),
    );

    // 3. Stderr
    unlistenPromises.push(
      listen<LimaLogPayload>("lima-instance-delete-stderr", (event) => {
        const { instance_name, message, message_id, timestamp } = event.payload;
        if (instance_name !== instanceName) {
          return;
        }

        updateCache((prev) => {
          if (prev.stderr.some((l) => l.id === message_id)) {
            return prev;
          }

          const newLog: Log = { id: message_id, message, timestamp };
          return { ...prev, stderr: insertLog(prev.stderr, newLog) };
        });
      }),
    );

    // 4. Error
    unlistenPromises.push(
      listen<LimaLogPayload>("lima-instance-delete-error", (event) => {
        const { instance_name, message, message_id, timestamp } = event.payload;
        if (instance_name !== instanceName) {
          return;
        }

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
      listen<LimaLogPayload>("lima-instance-delete-success", (event) => {
        if (event.payload.instance_name !== instanceName) {
          return;
        }

        updateCache((prev) => ({
          ...prev,
          isLoading: false,
          isSuccess: true,
        }));
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
  }, [instanceName, queryClient, queryKey]);

  return {
    error: data?.error ?? [],
    isLoading: data?.isLoading ?? false,
    isSuccess: data?.isSuccess,
    reset: () => queryClient.setQueryData(queryKey, DEFAULT_LIMA_DELETE_STATE),
    stderr: data?.stderr ?? [],
    stdout: data?.stdout ?? [],
  };
}
