import { useEffect, useRef } from 'react';
import { listen } from '@tauri-apps/api/event';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Log, LogState } from 'src/types/Log';
import { insertLog } from 'src/services/insertLog';

interface LimaLogPayload {
    instance_name: string;
    message: string;
    message_id: string;
    timestamp: string;
}

type StartLogState = LogState & {
    isReady?: boolean;
}
const DEFAULT_LIMA_START_STATE: StartLogState = {
    stdout: [],
    stderr: [],
    error: [],
    isLoading: false,
    isSuccess: undefined,
    isReady: undefined,
};

const getStartLogsQueryKey = (instanceName: string) => ['lima', 'start-logs', instanceName];

/**
 * useOnLimaStartLogs
 * 
 * Tracks the logs for the "start instance" operation.
 * Similar to useOnLimaCreateLogs but for the start command.
 */
export function useOnLimaStartLogs(instanceName: string, options?: { onSuccess?: () => void }) {
    const queryClient = useQueryClient();
    const queryKey = getStartLogsQueryKey(instanceName);
    const onSuccessRef = useRef(options?.onSuccess);

    useEffect(() => {
        onSuccessRef.current = options?.onSuccess;
    }, [options?.onSuccess]);

    const { data } = useQuery({
        queryKey,
        queryFn: () => queryClient.getQueryData<StartLogState>(queryKey),
        staleTime: Infinity,
        gcTime: Infinity,
        initialData: DEFAULT_LIMA_START_STATE,
    });

    useEffect(() => {
        let active = true;
        const unlistenPromises: Promise<() => void>[] = [];

        const updateCache = (updater: (prev: StartLogState) => StartLogState) => {
            if (!active) return;
            queryClient.setQueryData<StartLogState>(queryKey, (prev) => {
                if (!prev) return DEFAULT_LIMA_START_STATE;
                return updater(prev);
            });
        };

        // 1. Start Started
        unlistenPromises.push(
            listen<LimaLogPayload>('lima-instance-start', (event) => {
                if (event.payload.instance_name !== instanceName) return;
                updateCache(() => ({
                    // Reset all logs
                    ...DEFAULT_LIMA_START_STATE,
                    isLoading: true,
                }));
            })
        );

        // 2. Stdout
        unlistenPromises.push(listen<LimaLogPayload>('lima-instance-start-stdout', (event) => {
            const { instance_name, message, message_id, timestamp } = event.payload;
            if (instance_name !== instanceName) return;

            updateCache(prev => {
                if (prev.stdout.some(l => l.id === message_id)) {
                    return prev;
                }

                const newLog: Log = { id: message_id, message, timestamp };
                return {
                    ...prev,
                    stdout: insertLog(prev.stdout, newLog)
                };
            });
        }));

        // 2.5 Ready (treat as stdout for now)
        unlistenPromises.push(listen<LimaLogPayload>('lima-instance-start-ready', (event) => {
            const { instance_name } = event.payload;
            if (instance_name !== instanceName) return;

            updateCache(prev => {
                return {
                    ...prev,
                    isReady: true,
                };
            });
        }));

        // 3. Stderr
        unlistenPromises.push(listen<LimaLogPayload>('lima-instance-start-stderr', (event) => {
            const { instance_name, message, message_id, timestamp } = event.payload;
            if (instance_name !== instanceName) return;

            updateCache(prev => {
                if (prev.stderr.some(l => l.id === message_id)) {
                    return prev;
                }

                const newLog: Log = { id: message_id, message, timestamp };
                return {
                    ...prev,
                    stderr: insertLog(prev.stderr, newLog)
                };
            });
        }));

        // 4. Error
        unlistenPromises.push(
            listen<LimaLogPayload>('lima-instance-start-error', (event) => {
                if (event.payload.instance_name !== instanceName) return;
                const { message, message_id, timestamp } = event.payload;

                updateCache((prev) => {
                    if (prev.error.some(l => l.id === message_id)) {
                        return prev;
                    }

                    const newLog: Log = { id: message_id, message, timestamp };
                    return {
                        ...prev,
                        isLoading: false,
                        error: insertLog(prev.error, newLog),
                    };
                });
            })
        );

        // 5. Success
        unlistenPromises.push(
            listen<LimaLogPayload>('lima-instance-start-success', (event) => {
                if (event.payload.instance_name !== instanceName) return;
                updateCache((prev) => ({
                    ...prev,
                    isLoading: false,
                    isSuccess: true,
                }));
                // Invalidate instances list to update status
                queryClient.invalidateQueries({ queryKey: ["instances"] });
                onSuccessRef.current?.();
            })
        );

        return () => {
            active = false;
            unlistenPromises.forEach(p => p.then(u => u()));
        };
    }, [instanceName, queryClient, queryKey]);

    return {
        stdout: data?.stdout ?? [],
        stderr: data?.stderr ?? [],
        error: data?.error ?? [],
        isLoading: data?.isLoading ?? false,
        isSuccess: data?.isSuccess,
        isReady: data?.isReady,
        reset: () => queryClient.setQueryData(queryKey, DEFAULT_LIMA_START_STATE),
    };
}
