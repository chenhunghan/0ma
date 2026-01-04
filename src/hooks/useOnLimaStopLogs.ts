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

const DEFAULT_LIMA_STOP_STATE: LogState = {
    stdout: [],
    stderr: [],
    error: [],
    isLoading: false,
    isSuccess: undefined,
};

const getStopLogsQueryKey = (instanceName: string) => ['lima', 'stop-logs', instanceName];

/**
 * useOnLimaStopLogs
 * 
 * Tracks the logs for the "stop instance" operation.
 * Similar to useOnLimaStartLogs but for the stop command.
 */
export function useOnLimaStopLogs(instanceName: string, options?: { onSuccess?: () => void }) {
    const queryClient = useQueryClient();
    const queryKey = getStopLogsQueryKey(instanceName);
    const onSuccessRef = useRef(options?.onSuccess);

    useEffect(() => {
        onSuccessRef.current = options?.onSuccess;
    }, [options?.onSuccess]);

    const { data } = useQuery({
        queryKey,
        queryFn: () => queryClient.getQueryData<LogState>(queryKey),
        staleTime: Infinity,
        gcTime: Infinity,
        initialData: DEFAULT_LIMA_STOP_STATE,
    });

    useEffect(() => {
        let active = true;
        const unlistenPromises: Promise<() => void>[] = [];

        const updateCache = (updater: (prev: LogState) => LogState) => {
            if (!active) return;
            queryClient.setQueryData<LogState>(queryKey, (prev) => {
                if (!prev) return DEFAULT_LIMA_STOP_STATE;
                return updater(prev);
            });
        };

        // 1. Stop Started
        unlistenPromises.push(
            listen<LimaLogPayload>('lima-instance-stop', (event) => {
                if (event.payload.instance_name !== instanceName) return;

                updateCache(() => ({
                    // Reset all logs
                    ...DEFAULT_LIMA_STOP_STATE,
                    isLoading: true,
                }));
            })
        );

        // 2. Stdout
        unlistenPromises.push(listen<LimaLogPayload>('lima-instance-stop-stdout', (event) => {
            const { instance_name, message, message_id, timestamp } = event.payload;
            if (instance_name !== instanceName) return;

            updateCache(prev => {
                // Deduplicate
                if (prev.stdout.some(l => l.id === message_id)) return prev;

                const newLog: Log = { id: message_id, message, timestamp };
                return { ...prev, stdout: insertLog(prev.stdout, newLog) };
            });
        }));

        // 3. Stderr
        unlistenPromises.push(listen<LimaLogPayload>('lima-instance-stop-stderr', (event) => {
            const { instance_name, message, message_id, timestamp } = event.payload;
            if (instance_name !== instanceName) return;

            updateCache(prev => {
                // Deduplicate
                if (prev.stderr.some(l => l.id === message_id)) return prev;

                const newLog: Log = { id: message_id, message, timestamp };
                return { ...prev, stderr: insertLog(prev.stderr, newLog) };
            });
        }));

        // 4. Error
        unlistenPromises.push(
            listen<LimaLogPayload>('lima-instance-stop-error', (event) => {
                const { instance_name, message, message_id, timestamp } = event.payload;
                if (instance_name !== instanceName) return;

                updateCache((prev) => {
                    if (prev.error.some(l => l.id === message_id)) return prev;

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
            listen<LimaLogPayload>('lima-instance-stop-success', (event) => {
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
        reset: () => queryClient.setQueryData(queryKey, DEFAULT_LIMA_STOP_STATE),
    };
}
