import { useEffect, useState } from 'react';
import { listen } from '@tauri-apps/api/event';
import { useQueryClient } from '@tanstack/react-query';

interface StartLog {
  type: 'stdout' | 'stderr' | 'error';
  message: string;
  timestamp: Date;
}

interface UseLimaStartLogsReturn {
  logs: StartLog[];
  isStarting: boolean;
  error: string | null;
}

export function useLimaStartLogs(
  onSuccess?: (instanceName: string) => void,
  onError?: (error: string) => void
): UseLimaStartLogsReturn {
  const [logs, setLogs] = useState<StartLog[]>([]);
  const [isStarting, setIsStarting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const queryClient = useQueryClient();

  useEffect(() => {
    const unlistenPromises: Promise<() => void>[] = [];

    // Listen for start event
    unlistenPromises.push(
      listen<string>('lima-instance-start', () => {
        setIsStarting(true);
        setLogs([]);
        setError(null);
      })
    );

    // Listen for stdout
    unlistenPromises.push(
      listen<string>('lima-instance-start-stdout', (event) => {
        setLogs((prev) => [
          ...prev,
          { type: 'stdout', message: event.payload, timestamp: new Date() },
        ]);
      })
    );

    // Listen for stderr
    unlistenPromises.push(
      listen<string>('lima-instance-start-stderr', (event) => {
        setLogs((prev) => [
          ...prev,
          { type: 'stderr', message: event.payload, timestamp: new Date() },
        ]);
      })
    );

    // Listen for errors
    unlistenPromises.push(
      listen<string>('lima-instance-start-error', (event) => {
        setError(event.payload);
        setIsStarting(false);
        setLogs((prev) => [
          ...prev,
          { type: 'error', message: event.payload, timestamp: new Date() },
        ]);
        onError?.(event.payload);
      })
    );

    // Listen for success
    unlistenPromises.push(
      listen<string>('lima-instance-start-success', (event) => {
        setIsStarting(false);
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

  return { logs, isStarting, error };
}
