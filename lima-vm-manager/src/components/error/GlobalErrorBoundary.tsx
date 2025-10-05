import React, { Component, ErrorInfo, ReactNode } from 'react';
import { ErrorBoundary } from './ErrorBoundary';
import { useNotifications } from '../../hooks/useNotifications';

interface GlobalErrorBoundaryProps {
  children: ReactNode;
}

class GlobalErrorBoundaryClass extends Component<
  GlobalErrorBoundaryProps,
  { hasError: boolean; error?: Error }
> {
  constructor(props: GlobalErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Log global errors
    console.error('Global error caught:', error, errorInfo);

    // In production, you might want to send this to an error reporting service
    if (process.env.NODE_ENV === 'production') {
      // Example: sendToErrorService(error, errorInfo);
    }
  }

  render() {
    if (this.state.hasError) {
      return (
        <ErrorBoundary
          onError={(error, errorInfo) => {
            console.error('Global error boundary:', error, errorInfo);
          }}
        >
          <div />
        </ErrorBoundary>
      );
    }

    return this.props.children;
  }
}

// Wrapper component that provides access to hooks
export const GlobalErrorBoundary: React.FC<GlobalErrorBoundaryProps> = ({
  children,
}) => {
  return <GlobalErrorBoundaryClass>{children}</GlobalErrorBoundaryClass>;
};