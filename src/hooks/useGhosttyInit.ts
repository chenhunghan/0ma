import { useQuery } from '@tanstack/react-query';
import { init } from 'ghostty-web';

/**
 * Initialize ghostty-web WASM module once on first mount.
 * Uses React Query to ensure initialization only happens once globally.
 */
export function useGhosttyInit() {
  return useQuery({
    queryKey: ['ghostty-init'],
    queryFn: async () => {
      console.debug('Initializing ghostty-web WASM module...');
      await init();
      return true;
    },
    staleTime: Infinity, // Never refetch
    gcTime: Infinity, // Never garbage collect
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });
}
