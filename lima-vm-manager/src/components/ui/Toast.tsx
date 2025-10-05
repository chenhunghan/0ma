import React from 'react';
import { Button } from './Button';
import type { Notification } from '../../types';

interface ToastProps {
  notification: Notification;
  onClose: (id: string) => void;
  onAction?: (action: () => void) => void;
}

export const Toast: React.FC<ToastProps> = ({
  notification,
  onClose,
  onAction,
}) => {
  const getIcon = () => {
    switch (notification.type) {
      case 'success':
        return (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        );
      case 'error':
        return (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        );
      case 'warning':
        return (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        );
      case 'info':
      default:
        return (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        );
    }
  };

  const getColorClasses = () => {
    switch (notification.type) {
      case 'success':
        return 'bg-success-50 border-success-200 text-success-800 dark:bg-success-900/20 dark:border-success-800 dark:text-success-200';
      case 'error':
        return 'bg-error-50 border-error-200 text-error-800 dark:bg-error-900/20 dark:border-error-800 dark:text-error-200';
      case 'warning':
        return 'bg-warning-50 border-warning-200 text-warning-800 dark:bg-warning-900/20 dark:border-warning-800 dark:text-warning-200';
      case 'info':
      default:
        return 'bg-primary-50 border-primary-200 text-primary-800 dark:bg-primary-900/20 dark:border-primary-800 dark:text-primary-200';
    }
  };

  const iconColorClasses = {
    success: 'text-success-600 dark:text-success-400',
    error: 'text-error-600 dark:text-error-400',
    warning: 'text-warning-600 dark:text-warning-400',
    info: 'text-primary-600 dark:text-primary-400',
  };

  const handleAction = (action: () => void) => {
    onAction?.(action);
  };

  return (
    <div
      className={`
        max-w-sm w-full rounded-lg border p-4 shadow-lg pointer-events-auto ring-1 ring-black ring-opacity-5 transition-all duration-300 ease-in-out
        ${getColorClasses()}
        ${notification.read ? 'opacity-75' : ''}
      `}
      role="alert"
      aria-live="polite"
    >
      <div className="flex items-start">
        <div className={`flex-shrink-0 ${iconColorClasses[notification.type]}`}>
          {getIcon()}
        </div>

        <div className="ml-3 w-0 flex-1">
          <p className="text-sm font-medium">
            {notification.title}
          </p>
          <p className="mt-1 text-sm opacity-90">
            {notification.message}
          </p>

          {notification.actions && notification.actions.length > 0 && (
            <div className="mt-3 flex space-x-2">
              {notification.actions.map((action, index) => (
                <Button
                  key={index}
                  size="small"
                  variant={action.variant === 'primary' ? 'primary' :
                           action.variant === 'danger' ? 'danger' : 'secondary'}
                  onClick={() => handleAction(action.action)}
                  className="text-xs"
                >
                  {action.label}
                </Button>
              ))}
            </div>
          )}
        </div>

        <div className="ml-4 flex-shrink-0 flex">
          <button
            className="inline-flex rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2"
            onClick={() => onClose(notification.id)}
            aria-label="Close notification"
          >
            <span className="sr-only">Close</span>
            <svg
              className={`h-5 w-5 ${iconColorClasses[notification.type]} hover:opacity-75`}
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path
                fillRule="evenodd"
                d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                clipRule="evenodd"
              />
            </svg>
          </button>
        </div>
      </div>

      {/* Progress bar for auto-close */}
      {notification.auto_close && (
        <div className="mt-2 w-full bg-gray-200 rounded-full h-1 dark:bg-gray-700">
          <div
            className="bg-current h-1 rounded-full transition-all ease-linear"
            style={{
              animation: 'shrink 5s linear forwards',
            }}
          />
        </div>
      )}
    </div>
  );
};

// Toast Container component
interface ToastContainerProps {
  children: React.ReactNode;
  position?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left' | 'top-center' | 'bottom-center';
}

export const ToastContainer: React.FC<ToastContainerProps> = ({
  children,
  position = 'top-right',
}) => {
  const positionClasses = {
    'top-right': 'top-4 right-4',
    'top-left': 'top-4 left-4',
    'bottom-right': 'bottom-4 right-4',
    'bottom-left': 'bottom-4 left-4',
    'top-center': 'top-4 left-1/2 transform -translate-x-1/2',
    'bottom-center': 'bottom-4 left-1/2 transform -translate-x-1/2',
  };

  return (
    <div
      className={`
        fixed z-50 space-y-2 pointer-events-none
        ${positionClasses[position]}
      `}
    >
      {React.Children.map(children, (child) => (
        <div className="pointer-events-auto">
          {child}
        </div>
      ))}
    </div>
  );
};

// Add keyframe animation for progress bar
const style = document.createElement('style');
style.textContent = `
  @keyframes shrink {
    from { width: 100%; }
    to { width: 0%; }
  }
`;
document.head.appendChild(style);