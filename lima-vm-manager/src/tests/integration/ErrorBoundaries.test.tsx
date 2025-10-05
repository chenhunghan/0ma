import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { ErrorBoundary, GlobalErrorBoundary, NetworkErrorBoundary, RetryBoundary } from '../../components/error';

// Mock console methods to avoid test output pollution
const originalConsoleError = console.error;
const originalConsoleWarn = console.warn;

beforeAll(() => {
  console.error = jest.fn();
  console.warn = jest.fn();
});

afterAll(() => {
  console.error = originalConsoleError;
  console.warn = originalConsoleWarn;
});

describe('ErrorBoundary Component', () => {
  const ThrowError = ({ shouldThrow }: { shouldThrow: boolean }) => {
    if (shouldThrow) {
      throw new Error('Test error');
    }
    return <div>No error</div>;
  };

  it('renders children when there is no error', () => {
    render(
      <ErrorBoundary>
        <ThrowError shouldThrow={false} />
      </ErrorBoundary>
    );

    expect(screen.getByText('No error')).toBeInTheDocument();
  });

  it('catches and displays error information', () => {
    render(
      <ErrorBoundary>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    );

    expect(screen.getByText(/something went wrong/i)).toBeInTheDocument();
    expect(screen.getByText('Test error')).toBeInTheDocument();
  });

  it('provides retry functionality', () => {
    const { rerender } = render(
      <ErrorBoundary>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    );

    expect(screen.getByText(/something went wrong/i)).toBeInTheDocument();

    // Retry by fixing the error
    rerender(
      <ErrorBoundary>
        <ThrowError shouldThrow={false} />
      </ErrorBoundary>
    );

    // Click retry button
    const retryButton = screen.getByText('Try Again');
    fireEvent.click(retryButton);

    expect(screen.getByText('No error')).toBeInTheDocument();
  });

  it('calls onError prop when error occurs', () => {
    const onError = jest.fn();

    render(
      <ErrorBoundary onError={onError}>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    );

    expect(onError).toHaveBeenCalled();
    expect(onError).toHaveBeenCalledWith(
      expect.objectContaining({ message: 'Test error' }),
      expect.any(Object)
    );
  });

  it('displays custom fallback when provided', () => {
    const CustomFallback = ({ error, retry }: { error: Error; retry: () => void }) => (
      <div>
        <h2>Custom Error</h2>
        <p>{error.message}</p>
        <button onClick={retry}>Custom Retry</button>
      </div>
    );

    render(
      <ErrorBoundary fallback={CustomFallback}>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    );

    expect(screen.getByText('Custom Error')).toBeInTheDocument();
    expect(screen.getByText('Test error')).toBeInTheDocument();
    expect(screen.getByText('Custom Retry')).toBeInTheDocument();
  });

  it('shows detailed error info in development mode', () => {
    const originalEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'development';

    render(
      <ErrorBoundary>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    );

    expect(screen.getByText(/error stack/i)).toBeInTheDocument();
    expect(screen.getByText(/component stack/i)).toBeInTheDocument();

    process.env.NODE_ENV = originalEnv;
  });

  it('hides detailed error info in production mode', () => {
    const originalEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'production';

    render(
      <ErrorBoundary>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    );

    expect(screen.queryByText(/error stack/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/component stack/i)).not.toBeInTheDocument();

    process.env.NODE_ENV = originalEnv;
  });
});

describe('NetworkErrorBoundary Component', () => {
  beforeEach(() => {
    // Mock navigator.onLine
    Object.defineProperty(window.navigator, 'onLine', {
      writable: true,
      value: true,
    });
  });

  it('renders children when online', () => {
    render(
      <NetworkErrorBoundary>
        <div>Online content</div>
      </NetworkErrorBoundary>
    );

    expect(screen.getByText('Online content')).toBeInTheDocument();
  });

  it('shows offline message when network is offline', () => {
    Object.defineProperty(window.navigator, 'onLine', {
      writable: true,
      value: false,
    });

    render(
      <NetworkErrorBoundary>
        <div>Online content</div>
      </NetworkErrorBoundary>
    );

    expect(screen.getByText(/you are offline/i)).toBeInTheDocument();
    expect(screen.getByText(/check your internet connection/i)).toBeInTheDocument();
  });

  it('handles online/offline events', async () => {
    render(
      <NetworkErrorBoundary>
        <div>Content</div>
      </NetworkErrorBoundary>
    );

    // Simulate going offline
    Object.defineProperty(window.navigator, 'onLine', {
      writable: true,
      value: false,
    });
    fireEvent(window, new Event('offline'));

    await waitFor(() => {
      expect(screen.getByText(/you are offline/i)).toBeInTheDocument();
    });

    // Simulate coming back online
    Object.defineProperty(window.navigator, 'onLine', {
      writable: true,
      value: true,
    });
    fireEvent(window, new Event('online'));

    await waitFor(() => {
      expect(screen.getByText('Content')).toBeInTheDocument();
      expect(screen.queryByText(/you are offline/i)).not.toBeInTheDocument();
    });
  });

  it('catches network-related errors', () => {
    const NetworkErrorComponent = () => {
      const error = new Error('Network Error');
      error.name = 'NetworkError';
      throw error;
    };

    render(
      <NetworkErrorBoundary>
        <NetworkErrorComponent />
      </NetworkErrorBoundary>
    );

    expect(screen.getByText(/network error/i)).toBeInTheDocument();
    expect(screen.getByText(/network error/i)).toBeInTheDocument();
  });

  it('provides retry functionality for network errors', () => {
    let shouldThrow = true;
    const NetworkErrorComponent = () => {
      if (shouldThrow) {
        const error = new Error('Network Error');
        error.name = 'NetworkError';
        throw error;
      }
      return <div>Network success</div>;
    };

    const { rerender } = render(
      <NetworkErrorBoundary>
        <NetworkErrorComponent />
      </NetworkErrorBoundary>
    );

    expect(screen.getByText(/network error/i)).toBeInTheDocument();

    // Fix the error and retry
    shouldThrow = false;
    rerender(
      <NetworkErrorBoundary>
        <NetworkErrorComponent />
      </NetworkErrorBoundary>
    );

    const retryButton = screen.getByText('Retry');
    fireEvent.click(retryButton);

    expect(screen.getByText('Network success')).toBeInTheDocument();
  });

  it('uses custom offline message', () => {
    Object.defineProperty(window.navigator, 'onLine', {
      writable: true,
      value: false,
    });

    const customOfflineMessage = 'Custom offline message';
    render(
      <NetworkErrorBoundary offlineMessage={customOfflineMessage}>
        <div>Content</div>
      </NetworkErrorBoundary>
    );

    expect(screen.getByText(customOfflineMessage)).toBeInTheDocument();
  });
});

describe('RetryBoundary Component', () => {
  const FailingComponent = ({ attempts = 0 }: { attempts?: number }) => {
    const [attemptCount, setAttemptCount] = React.useState(0);

    React.useEffect(() => {
      if (attemptCount < attempts) {
        setAttemptCount(prev => prev + 1);
        throw new Error(`Attempt ${attemptCount + 1} failed`);
      }
    }, [attemptCount, attempts]);

    if (attemptCount < attempts) {
      throw new Error(`Attempt ${attemptCount + 1} failed`);
    }

    return <div>Success after {attemptCount} attempts</div>;
  };

  it('retries failed operations up to maxRetries', async () => {
    render(
      <RetryBoundary maxRetries={3}>
        <FailingComponent attempts={2} />
      </RetryBoundary>
    );

    // Should show retrying state
    await waitFor(() => {
      expect(screen.getByText(/retrying/i)).toBeInTheDocument();
    });

    // Should eventually succeed
    await waitFor(() => {
      expect(screen.getByText('Success after 2 attempts')).toBeInTheDocument();
    }, { timeout: 5000 });
  });

  it('shows error after exhausting retries', async () => {
    render(
      <RetryBoundary maxRetries={2}>
        <FailingComponent attempts={5} />
      </RetryBoundary>
    );

    // Should show retrying state initially
    await waitFor(() => {
      expect(screen.getByText(/retrying/i)).toBeInTheDocument();
    });

    // Should eventually show error after max retries
    await waitFor(() => {
      expect(screen.getByText(/operation failed after \d+ attempts/i)).toBeInTheDocument();
    }, { timeout: 5000 });
  });

  it('uses custom retry delay', async () => {
    const startTime = Date.now();

    render(
      <RetryBoundary maxRetries={2} retryDelay={1000}>
        <FailingComponent attempts={1} />
      </RetryBoundary>
    );

    await waitFor(() => {
      expect(screen.getByText('Success after 1 attempts')).toBeInTheDocument();
    });

    const endTime = Date.now();
    const elapsedTime = endTime - startTime;

    // Should have waited at least 1 second for retry delay
    expect(elapsedTime).toBeGreaterThan(900);
  });

  it('uses exponential backoff by default', async () => {
    const startTime = Date.now();

    render(
      <RetryBoundary maxRetries={3}>
        <FailingComponent attempts={2} />
      </RetryBoundary>
    );

    await waitFor(() => {
      expect(screen.getByText('Success after 2 attempts')).toBeInTheDocument();
    });

    const endTime = Date.now();
    const elapsedTime = endTime - startTime;

    // With exponential backoff (100ms, 200ms, 400ms...), should wait more than linear
    expect(elapsedTime).toBeGreaterThan(200);
  });

  it('provides manual retry option', async () => {
    render(
      <RetryBoundary maxRetries={0}>
        <FailingComponent attempts={1} />
      </RetryBoundary>
    );

    await waitFor(() => {
      expect(screen.getByText(/operation failed/i)).toBeInTheDocument();
    });

    const retryButton = screen.getByText('Manual Retry');
    fireEvent.click(retryButton);

    await waitFor(() => {
      expect(screen.getByText('Success after 1 attempts')).toBeInTheDocument();
    });
  });

  it('calls onRetry callback', async () => {
    const onRetry = jest.fn();

    render(
      <RetryBoundary maxRetries={2} onRetry={onRetry}>
        <FailingComponent attempts={1} />
      </RetryBoundary>
    );

    await waitFor(() => {
      expect(onRetry).toHaveBeenCalled();
    });
  });

  it('calls onFinalError callback after exhausting retries', async () => {
    const onFinalError = jest.fn();

    render(
      <RetryBoundary maxRetries={2} onFinalError={onFinalError}>
        <FailingComponent attempts={5} />
      </RetryBoundary>
    );

    await waitFor(() => {
      expect(onFinalError).toHaveBeenCalled();
      expect(onFinalError).toHaveBeenCalledWith(
        expect.objectContaining({ message: expect.stringContaining('failed') })
      );
    });
  });

  it('shows retry attempt count', async () => {
    render(
      <RetryBoundary maxRetries={3}>
        <FailingComponent attempts={2} />
      </RetryBoundary>
    );

    await waitFor(() => {
      expect(screen.getByText(/retry 1 of 3/i)).toBeInTheDocument();
    });
  });
});

describe('GlobalErrorBoundary Component', () => {
  it('catches all types of errors', () => {
    const ThrowError = () => {
      throw new Error('Global error test');
    };

    render(
      <GlobalErrorBoundary>
        <ThrowError />
      </GlobalErrorBoundary>
    );

    expect(screen.getByText(/application error/i)).toBeInTheDocument();
    expect(screen.getByText('Global error test')).toBeInTheDocument();
  });

  it('provides reload functionality', () => {
    const reloadSpy = jest.fn();
    Object.defineProperty(window.location, 'reload', {
      value: reloadSpy,
      writable: true,
    });

    const ThrowError = () => {
      throw new Error('Global error test');
    };

    render(
      <GlobalErrorBoundary>
        <ThrowError />
      </GlobalErrorBoundary>
    );

    const reloadButton = screen.getByText('Reload Page');
    fireEvent.click(reloadButton);

    expect(reloadSpy).toHaveBeenCalled();
  });

  it('logs errors to error reporting service', () => {
    const consoleSpy = jest.spyOn(console, 'error');

    const ThrowError = () => {
      throw new Error('Global error test');
    };

    render(
      <GlobalErrorBoundary>
        <ThrowError />
      </GlobalErrorBoundary>
    );

    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining('Global Error Boundary caught an error:'),
      expect.any(Error),
      expect.any(Object)
    );

    consoleSpy.mockRestore();
  });
});