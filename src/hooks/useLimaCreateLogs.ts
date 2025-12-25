import { useEffect, useState } from 'react';
import { listen } from '@tauri-apps/api/event';
import { useQueryClient } from '@tanstack/react-query';

interface CreateLog {
  type: 'stdout' | 'stderr' | 'error';
  message: string;
  timestamp: Date;
}

interface UseLimaCreateLogsReturn {
  logs: CreateLog[];
  isCreating: boolean;
  error: string | null;
}

export function useLimaCreateLogs(
  onSuccess?: (instanceName: string) => void,
  onError?: (error: string) => void
): UseLimaCreateLogsReturn {
  const [logs, setLogs] = useState<CreateLog[]>([]);
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const queryClient = useQueryClient();

  useEffect(() => {
    const unlistenPromises: Promise<() => void>[] = [];

    // Listen for create start
    unlistenPromises.push(
      listen<string>('lima-instance-create', () => {
        setIsCreating(true);
        setLogs([]);
        setError(null);
      })
    );

    // Listen for stdout
    unlistenPromises.push(
      listen<string>('lima-instance-create-stdout', (event) => {
        setLogs((prev) => [
          ...prev,
          { type: 'stdout', message: event.payload, timestamp: new Date() },
        ]);
      })
    );

    // Listen for stderr
    unlistenPromises.push(
      listen<string>('lima-instance-create-stderr', (event) => {
        setLogs((prev) => [
          ...prev,
          { type: 'stderr', message: event.payload, timestamp: new Date() },
        ]);
      })
    );

    // Listen for errors
    unlistenPromises.push(
      listen<string>('lima-instance-create-error', (event) => {
        setError(event.payload);
        setIsCreating(false);
        setLogs((prev) => [
          ...prev,
          { type: 'error', message: event.payload, timestamp: new Date() },
        ]);
        onError?.(event.payload);
      })
    );

    // Listen for success
    unlistenPromises.push(
      listen<string>('lima-instance-create-success', (event) => {
        setIsCreating(false);
        queryClient.invalidateQueries({ queryKey: ['instances'] });
        onSuccess?.(event.payload);
      })
    );

    // Cleanup
    return () => {
      Promise.all(unlistenPromises).then((unlisteners) => {
        unlisteners.forEach((unlisten) => unlisten());
      });
    };
  }, [onSuccess, onError, queryClient]);

  return { logs, isCreating, error };
}
