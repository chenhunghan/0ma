import { useEffect, useRef } from 'react';
import { listen } from '@tauri-apps/api/event';
import { useQueryClient } from '@tanstack/react-query';

export function useLimaStartSuccess(
  onSuccess: (instanceName: string) => void
) {
  const queryClient = useQueryClient();

  // Use ref to avoid re-running effect when callback changes
  const onSuccessRef = useRef(onSuccess);
  onSuccessRef.current = onSuccess;

  useEffect(() => {
    const setupListener = async () => {
      const unlisten = await listen<string>('lima-instance-start-success', (event) => {
        // Invalidate instances query to refresh the list
        queryClient.invalidateQueries({ queryKey: ["instances"] });
        onSuccessRef.current(event.payload);
      });
      return unlisten;
    };

    const cleanup = setupListener();
    return () => {
      cleanup.then(unlisten => unlisten());
    };
  }, [queryClient]);
}