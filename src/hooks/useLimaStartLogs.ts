import { useEffect, useState, useRef } from 'react';
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
  isEssentiallyReady: boolean; // VM is ready, but optional probes still running
  error: string | null;
  reset: () => void;
}

export function useLimaStartLogs(
  onSuccess?: (instanceName: string) => void,
  onError?: (error: string) => void,
  enabled: boolean = true
): UseLimaStartLogsReturn {
  const [logs, setLogs] = useState<StartLog[]>([]);
  const [isStarting, setIsStarting] = useState(false);
  const [isEssentiallyReady, setIsEssentiallyReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const queryClient = useQueryClient();

  const reset = () => {
    setLogs([]);
    setIsStarting(false);
    setIsEssentiallyReady(false);
    setError(null);
  };

  // Use refs for callbacks to avoid re-running effect when they change
  const onSuccessRef = useRef(onSuccess);
  const onErrorRef = useRef(onError);
  onSuccessRef.current = onSuccess;
  onErrorRef.current = onError;

  useEffect(() => {
    if (!enabled) return;

    let active = true;
    const unlistenPromises: Promise<() => void>[] = [];

    // Listen for start event
    unlistenPromises.push(
      listen<string>('lima-instance-start', () => {
        if (!active) return;
        setIsStarting(true);
        setIsEssentiallyReady(false);
        setLogs([]);
        setError(null);
      })
    );

    // Listen for logs (stdout/stderr combined)
    unlistenPromises.push(
      listen<string>('lima-instance-start-logs', (event) => {
        if (!active) return;
        setLogs((prev) => [
          ...prev,
          { type: 'stdout', message: event.payload, timestamp: new Date() },
        ]);

        // Check for a specific message to indicate readiness
        if (event.payload.includes('LIMA-CHECK: READY')) {
          setIsEssentiallyReady(true);
        }
      })
    );

    // Listen for errors
    unlistenPromises.push(
      listen<string>('lima-instance-start-error', (event) => {
        if (!active) return;
        setError(event.payload);
        setIsStarting(false);
        setLogs((prev) => [
          ...prev,
          { type: 'error', message: event.payload, timestamp: new Date() },
        ]);

        queryClient.invalidateQueries({ queryKey: ['instances'] });
        onErrorRef.current?.(event.payload);
      })
    );

    // Listen for success
    unlistenPromises.push(
      listen<string>('lima-instance-start-success', (event) => {
        if (!active) return;
        setIsStarting(false);
        queryClient.invalidateQueries({ queryKey: ['instances'] });
        onSuccessRef.current?.(event.payload);
      })
    );

    return () => {
      active = false;
      unlistenPromises.forEach(p => {
        p.then(unlisten => unlisten()).catch(e => console.error('Failed to unlisten:', e));
      });
    };
  }, [queryClient, enabled]); // Added enabled to dependencies

  return { logs, isStarting, isEssentiallyReady, error, reset };
}
