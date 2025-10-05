import React, { useState, useEffect, ReactNode } from 'react';
import { Card, CardBody, Button, Loading } from '../ui';
import { useNotifications } from '../../hooks/useNotifications';

interface RetryBoundaryProps {
  children: ReactNode;
  maxRetries?: number;
  retryDelay?: number;
  onRetry?: (attempt: number) => void;
  fallback?: ReactNode;
}

interface RetryState {
  hasError: boolean;
  error?: Error;
  retryCount: number;
  isRetrying: boolean;
}

export const RetryBoundary: React.FC<RetryBoundaryProps> = ({
  children,
  maxRetries = 3,
  retryDelay = 1000,
  onRetry,
  fallback,
}) => {
  const [state, setState] = useState<RetryState>({
    hasError: false,
    retryCount: 0,
    isRetrying: false,
  });

  const { showError } = useNotifications();

  const handleError = (error: Error) => {
    if (state.retryCount < maxRetries) {
      setState(prev => ({
        ...prev,
        hasError: true,
        error,
        isRetrying: true,
      }));

      setTimeout(() => {
        attemptRetry();
      }, retryDelay * Math.pow(2, state.retryCount)); // Exponential backoff
    } else {
      setState(prev => ({
        ...prev,
        hasError: true,
        error,
        isRetrying: false,
      }));
      showError('Max Retries Exceeded', `Failed after ${maxRetries} attempts. Please try again later.`);
    }
  };

  const attemptRetry = () => {
    setState(prev => ({
      ...prev,
      retryCount: prev.retryCount + 1,
      isRetrying: false,
      hasError: false,
      error: undefined,
    }));

    onRetry?.(state.retryCount + 1);
  };

  const manualRetry = () => {
    setState(prev => ({
      ...prev,
      retryCount: 0,
      isRetrying: false,
      hasError: false,
      error: undefined,
    }));
  };

  useEffect(() => {
    const errorHandler = (event: ErrorEvent) => {
      event.preventDefault();
      handleError(new Error(event.message));
    };

    const rejectionHandler = (event: PromiseRejectionEvent) => {
      event.preventDefault();
      handleError(new Error(event.reason));
    };

    window.addEventListener('error', errorHandler);
    window.addEventListener('unhandledrejection', rejectionHandler);

    return () => {
      window.removeEventListener('error', errorHandler);
      window.removeEventListener('unhandledrejection', rejectionHandler);
    };
  }, [state.retryCount, maxRetries]);

  if (state.hasError && state.isRetrying) {
    return (
      <Card className="max-w-md mx-auto mt-8">
        <CardBody className="text-center space-y-4">
          <Loading size="medium" text={`Retrying... (Attempt ${state.retryCount + 1}/${maxRetries})`} />
          <div className="text-sm text-gray-600 dark:text-gray-400">
            {state.error?.message}
          </div>
        </CardBody>
      </Card>
    );
  }

  if (state.hasError && !state.isRetrying) {
    if (fallback) {
      return <>{fallback}</>;
    }

    return (
      <Card className="max-w-md mx-auto mt-8">
        <CardBody className="text-center space-y-4">
          <div className="flex justify-center">
            <div className="w-16 h-16 bg-error-100 dark:bg-error-900/20 rounded-full flex items-center justify-center">
              <svg
                className="w-8 h-8 text-error-600 dark:text-error-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </div>
          </div>

          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            Operation Failed
          </h2>

          <p className="text-gray-600 dark:text-gray-400">
            {state.error?.message || 'An unexpected error occurred'}
          </p>

          <div className="text-sm text-gray-500 dark:text-gray-400">
            Failed after {state.retryCount} attempt{state.retryCount !== 1 ? 's' : ''}
          </div>

          <div className="flex justify-center space-x-3">
            <Button onClick={manualRetry}>
              Try Again
            </Button>
            <Button
              variant="secondary"
              onClick={() => setState({ hasError: false, retryCount: 0, isRetrying: false })}
            >
              Dismiss
            </Button>
          </div>
        </CardBody>
      </Card>
    );
  }

  return <>{children}</>;
};

// Hook for retry logic
export const useRetry = (
  fn: () => Promise<any>,
  maxRetries: number = 3,
  delay: number = 1000
) => {
  const [retryCount, setRetryCount] = useState(0);
  const [isRetrying, setIsRetrying] = useState(false);
  const { showError } = useNotifications();

  const execute = async (): Promise<any> => {
    try {
      const result = await fn();
      setRetryCount(0);
      return result;
    } catch (error) {
      if (retryCount < maxRetries) {
        setRetryCount(prev => prev + 1);
        setIsRetrying(true);

        await new Promise(resolve => setTimeout(resolve, delay * Math.pow(2, retryCount)));

        setIsRetrying(false);
        return execute(); // Recursive retry
      } else {
        showError('Operation Failed', `Failed after ${maxRetries} attempts`);
        throw error;
      }
    }
  };

  const reset = () => {
    setRetryCount(0);
    setIsRetrying(false);
  };

  return { execute, retryCount, isRetrying, reset };
};