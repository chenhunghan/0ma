import { useEffect } from 'react';
import { listen } from '@tauri-apps/api/event';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Log, LogState } from 'src/types/Log';
import { insertLog } from 'src/services/insertLog';

interface LimaCreatePayload {
    instance_name: string;
    message: string;
    message_id: string;
    timestamp: string;
}

const DEFAULT_LIMA_CREATE_STATE: LogState = {
    stdout: [],
    stderr: [],
    error: [],
    isLoading: false,
    isSuccess: undefined
};

const getCreateLogsQueryKey = (instanceName: string) => ['lima', 'create-logs', instanceName];

/**
 * useOnLimaCreateLogs
 * 
 * Each component call creates its own listeners that feed the React Query cache.
 * We use the unique message_id from the backend to prevent duplicate log entries
 * and ensure chronological ordering by sorting by the nano-timestamp.
 */
export function useOnLimaCreateLogs(instanceName: string) {
    const queryClient = useQueryClient();
    const queryKey = getCreateLogsQueryKey(instanceName);

    const { data } = useQuery({
        queryKey,
        queryFn: () => queryClient.getQueryData<LogState>(queryKey),
        staleTime: Infinity,
        gcTime: Infinity,
        initialData: DEFAULT_LIMA_CREATE_STATE,
    });

    useEffect(() => {
        let active = true;
        const unlistenPromises: Promise<() => void>[] = [];

        const updateCache = (updater: (prev: LogState) => LogState) => {
            if (!active) return;
            queryClient.setQueryData<LogState>(queryKey, (prev) => {
                if (!prev) return DEFAULT_LIMA_CREATE_STATE;
                return updater(prev);
            });
        };

        // 1. Creation Started
        unlistenPromises.push(
            listen<LimaCreatePayload>('lima-instance-create', (event) => {
                if (event.payload.instance_name !== instanceName) return;
                updateCache(() => ({
                    // Reset all logs
                    ...DEFAULT_LIMA_CREATE_STATE,
                    isLoading: true,
                }));
            })
        );

        unlistenPromises.push(listen<LimaCreatePayload>('lima-instance-create-stdout', (event: { payload: LimaCreatePayload }) => {
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

        unlistenPromises.push(listen<LimaCreatePayload>('lima-instance-create-stderr', (event: { payload: LimaCreatePayload }) => {
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

        // 3. Error
        unlistenPromises.push(
            listen<LimaCreatePayload>('lima-instance-create-error', (event) => {
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
                        isSuccess: false,
                    };
                });
            })
        );

        // 4. Success
        unlistenPromises.push(
            listen<LimaCreatePayload>('lima-instance-create-success', (event) => {
                if (event.payload.instance_name !== instanceName) return;
                updateCache((prev) => ({
                    ...prev,
                    stdout: [],
                    stderr: [],
                    error: [],
                    isLoading: false,
                    isSuccess: true,
                }));
                queryClient.invalidateQueries({ queryKey: ["instances"] });
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
        reset: () => queryClient.setQueryData(queryKey, DEFAULT_LIMA_CREATE_STATE),
    };
}
