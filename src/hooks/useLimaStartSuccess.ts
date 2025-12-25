import { useEffect } from 'react';
import { listen } from '@tauri-apps/api/event';
import { useQueryClient } from '@tanstack/react-query';

export function useLimaStartSuccess(
  onSuccess: (instanceName: string) => void
) {
  const queryClient = useQueryClient();
  useEffect(() => {
    const setupListener = async () => {
      const unlisten = await listen<string>('lima-instance-start-success', (event) => {
        // Invalidate instances query to refresh the list
        queryClient.invalidateQueries({ queryKey: ["instances"] });
        onSuccess(event.payload);
      });
      return unlisten;
    };

    const cleanup = setupListener();
    return () => {
      cleanup.then(unlisten => unlisten());
    };
  }, [onSuccess]);
}