import { useEffect, useState, useRef } from 'react';
import { listen } from '@tauri-apps/api/event';
import { useQueryClient } from '@tanstack/react-query';

interface CreateLog {
  type: 'stdout' | 'stderr' | 'error';
  message: string;
  timestamp: Date;
}

export function useLimaCreateLogs(
  onSuccess?: (instanceName: string) => void,
  onError?: (error: string) => void
) {
  const [logs, setLogs] = useState<CreateLog[]>([]);
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const queryClient = useQueryClient();

  const reset = () => {
    setLogs([]);
    setIsCreating(false);
    setError(null);
  };

  // Use refs for callbacks to avoid re-running effect when they change
  const onSuccessRef = useRef(onSuccess);
  const onErrorRef = useRef(onError);
  onSuccessRef.current = onSuccess;
  onErrorRef.current = onError;

  useEffect(() => {
    let active = true;
    const unlistenPromises: Promise<() => void>[] = [];

    // Listen for create start
    unlistenPromises.push(
      listen<string>('lima-instance-create', () => {
        if (!active) return;
        setIsCreating(true);
        setLogs([]);
        setError(null);
      })
    );

    // Listen for stdout
    unlistenPromises.push(
      listen<string>('lima-instance-create-stdout', (event) => {
        if (!active) return;
        setLogs((prev) => [
          ...prev,
          { type: 'stdout', message: event.payload, timestamp: new Date() },
        ]);
      })
    );

    // Listen for stderr
    unlistenPromises.push(
      listen<string>('lima-instance-create-stderr', (event) => {
        if (!active) return;
        setLogs((prev) => [
          ...prev,
          { type: 'stderr', message: event.payload, timestamp: new Date() },
        ]);
      })
    );

    // Listen for errors
    unlistenPromises.push(
      listen<string>('lima-instance-create-error', (event) => {
        if (!active) return;
        setError(event.payload);
        setIsCreating(false);
        setLogs((prev) => [
          ...prev,
          { type: 'error', message: event.payload, timestamp: new Date() },
        ]);
        onErrorRef.current?.(event.payload);
      })
    );

    // Listen for success
    unlistenPromises.push(
      listen<string>('lima-instance-create-success', (event) => {
        if (!active) return;
        setIsCreating(false);
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
  }, [queryClient]);

  return { logs, isCreating, error, reset };
}
