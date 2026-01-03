import { useEffect } from 'react';
import { listen } from '@tauri-apps/api/event';
import { useQuery, useQueryClient } from '@tanstack/react-query';

export interface CreateLog {
    id: string;
    message: string;
    timestamp: string; // Nano-timestamp from backend
}

export interface CreateStatus {
    stdout: CreateLog[];
    stderr: CreateLog[];
    error: CreateLog[];
    isCreating: boolean;
}

interface LimaCreatePayload {
    instance_name: string;
    message: string;
    message_id: string;
    timestamp: string;
}

export const DEFAULT_LIMA_CREATE_STATE: CreateStatus = {
    stdout: [],
    stderr: [],
    error: [],
    isCreating: false,
};

export const getCreateLogsQueryKey = (instanceName: string) => ['lima', 'create-logs', instanceName];

export const insertLog = (logs: CreateLog[], newLog: CreateLog): CreateLog[] => {
    // If empty or newLog is newer/equal to the last one, append.
    if (logs.length === 0 || newLog.timestamp >= logs[logs.length - 1].timestamp) {
        return [...logs, newLog];
    }

    // Find insertion index (first log that is newer than newLog)
    const index = logs.findIndex(log => log.timestamp > newLog.timestamp);

    // This shouldn't happen given the first check, but for safety:
    if (index === -1) {
        return [...logs, newLog];
    }

    const newLogs = [...logs];
    newLogs.splice(index, 0, newLog);
    return newLogs;
};
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
        queryFn: () => queryClient.getQueryData<CreateStatus>(queryKey),
        staleTime: Infinity,
        gcTime: Infinity,
        initialData: DEFAULT_LIMA_CREATE_STATE,
    });

    useEffect(() => {
        let active = true;
        const unlistenPromises: Promise<() => void>[] = [];

        const updateCache = (updater: (prev: CreateStatus) => CreateStatus) => {
            if (!active) return;
            queryClient.setQueryData<CreateStatus>(queryKey, (prev) => {
                if (!prev) return DEFAULT_LIMA_CREATE_STATE;
                return updater(prev);
            });
        };

        // 1. Creation Started
        unlistenPromises.push(
            listen<LimaCreatePayload>('lima-instance-create', (event) => {
                if (event.payload.instance_name !== instanceName) return;
                updateCache((prev) => ({
                    ...prev,
                    isCreating: true,
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


                const newLog: CreateLog = { id: message_id, message, timestamp };

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


                const newLog: CreateLog = { id: message_id, message, timestamp };

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


                    const newLog: CreateLog = { id: message_id, message, timestamp };

                    return {
                        ...prev,
                        isCreating: false,
                        error: insertLog(prev.error, newLog),
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
                    isCreating: false,
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
        isCreating: data?.isCreating ?? false,
        reset: () => queryClient.setQueryData(queryKey, DEFAULT_LIMA_CREATE_STATE),
    };
}
