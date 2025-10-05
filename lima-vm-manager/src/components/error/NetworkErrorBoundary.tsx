import React, { useState, useEffect, ReactNode } from 'react';
import { Card, CardBody, Button, Loading } from '../ui';
import { useNotifications } from '../../hooks/useNotifications';

interface NetworkErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
}

export const NetworkErrorBoundary: React.FC<NetworkErrorBoundaryProps> = ({
  children,
  fallback,
}) => {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [showRetry, setShowRetry] = useState(false);
  const { showError, showSuccess } = useNotifications();

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      setShowRetry(false);
      showSuccess('Connection Restored', 'You are back online');
    };

    const handleOffline = () => {
      setIsOnline(false);
      setShowRetry(true);
      showError('Connection Lost', 'You are offline. Some features may not work correctly.');
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [showError, showSuccess]);

  const handleRetry = () => {
    window.location.reload();
  };

  if (!isOnline && showRetry) {
    if (fallback) {
      return <>{fallback}</>;
    }

    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <Card className="max-w-md w-full mx-4">
          <CardBody className="text-center space-y-4">
            <div className="flex justify-center">
              <div className="w-16 h-16 bg-warning-100 dark:bg-warning-900/20 rounded-full flex items-center justify-center">
                <svg
                  className="w-8 h-8 text-warning-600 dark:text-warning-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M8.111 16.404a5.5 5.5 0 017.778 0M12 20h.01m-7.08-7.071c3.904-3.905 10.236-3.905 14.141 0M1.394 9.393c5.857-5.857 15.355-5.857 21.213 0"
                  />
                </svg>
              </div>
            </div>

            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
              Connection Lost
            </h2>

            <p className="text-gray-600 dark:text-gray-400">
              You appear to be offline. Please check your internet connection and try again.
            </p>

            <div className="space-y-2">
              <div className="text-sm text-gray-500 dark:text-gray-400">
                <div className="flex items-center justify-center space-x-2">
                  <div className="w-2 h-2 bg-error-500 rounded-full animate-pulse"></div>
                  <span>Offline</span>
                </div>
              </div>
            </div>

            <div className="flex justify-center space-x-3">
              <Button onClick={handleRetry}>
                Retry
              </Button>
              <Button
                variant="secondary"
                onClick={() => setShowRetry(false)}
              >
                Continue Offline
              </Button>
            </div>

            <div className="text-xs text-gray-500 dark:text-gray-400">
              Some features may not work correctly while offline.
            </div>
          </CardBody>
        </Card>
      </div>
    );
  }

  return <>{children}</>;
};

// Hook for network status
export const useNetworkStatus = () => {
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return { isOnline };
};