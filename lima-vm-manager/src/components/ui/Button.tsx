import React from 'react';
import type { ButtonProps } from '../../types';

export const Button: React.FC<ButtonProps> = ({
  variant = 'primary',
  size = 'medium',
  disabled = false,
  loading = false,
  icon,
  onClick,
  children,
  className = '',
  ...props
}) => {
  const baseClasses = 'inline-flex items-center justify-center font-medium rounded-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed';

  const variantClasses = {
    primary: 'bg-primary-600 text-white hover:bg-primary-700 focus:ring-primary-500 active:bg-primary-800 disabled:bg-primary-300',
    secondary: 'bg-gray-100 text-gray-900 hover:bg-gray-200 focus:ring-gray-500 active:bg-gray-300 dark:bg-gray-800 dark:text-gray-100 dark:hover:bg-gray-700 dark:active:bg-gray-600',
    danger: 'bg-error-600 text-white hover:bg-error-700 focus:ring-error-500 active:bg-error-800 disabled:bg-error-300',
    ghost: 'bg-transparent text-gray-700 hover:bg-gray-100 focus:ring-gray-500 active:bg-gray-200 dark:text-gray-300 dark:hover:bg-gray-800 dark:active:bg-gray-700',
  };

  const sizeClasses = {
    small: 'px-3 py-1.5 text-xs',
    medium: 'px-4 py-2 text-sm',
    large: 'px-6 py-3 text-base',
  };

  const classes = `
    ${baseClasses}
    ${variantClasses[variant]}
    ${sizeClasses[size]}
    ${loading ? 'cursor-wait' : ''}
    ${className}
  `.trim().replace(/\s+/g, ' ');

  return (
    <button
      className={classes}
      onClick={onClick}
      disabled={disabled || loading}
      {...props}
    >
      {loading && (
        <svg
          className="animate-spin -ml-1 mr-2 h-4 w-4"
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
        >
          <circle
            className="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="4"
          ></circle>
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
          ></path>
        </svg>
      )}
      {icon && !loading && (
        <span className="mr-2">{icon}</span>
      )}
      {children}
    </button>
  );
};

// Button Group component
interface ButtonGroupProps {
  children: React.ReactNode;
  className?: string;
  vertical?: boolean;
}

export const ButtonGroup: React.FC<ButtonGroupProps> = ({
  children,
  className = '',
  vertical = false,
}) => {
  const groupClasses = `
    inline-flex
    ${vertical ? 'flex-col' : 'flex-row'}
    ${className}
  `.trim().replace(/\s+/g, ' ');

  return (
    <div className={groupClasses}>
      {React.Children.map(children, (child, index) => {
        if (React.isValidElement(child) && child.type === Button) {
          const isFirst = index === 0;
          const isLast = index === React.Children.count(children) - 1;

          let roundedClasses = '';
          if (!vertical) {
            if (isFirst) {
              roundedClasses = 'rounded-r-none';
            } else if (isLast) {
              roundedClasses = 'rounded-l-none border-l-0';
            } else {
              roundedClasses = 'rounded-none border-l-0';
            }
          } else {
            if (isFirst) {
              roundedClasses = 'rounded-b-none';
            } else if (isLast) {
              roundedClasses = 'rounded-t-none border-t-0';
            } else {
              roundedClasses = 'rounded-none border-t-0';
            }
          }

          return React.cloneElement(child, {
            className: `${child.props.className || ''} ${roundedClasses}`.trim(),
          });
        }
        return child;
      })}
    </div>
  );
};