import React from 'react';

interface BadgeProps {
  children: React.ReactNode;
  variant?: 'primary' | 'success' | 'warning' | 'error' | 'gray';
  size?: 'small' | 'medium' | 'large';
  className?: string;
  dot?: boolean;
}

export const Badge: React.FC<BadgeProps> = ({
  children,
  variant = 'primary',
  size = 'medium',
  className = '',
  dot = false,
}) => {
  const baseClasses = 'inline-flex items-center font-medium rounded-full';

  const variantClasses = {
    primary: 'bg-primary-100 text-primary-800 dark:bg-primary-900 dark:text-primary-200',
    success: 'bg-success-100 text-success-800 dark:bg-success-900 dark:text-success-200',
    warning: 'bg-warning-100 text-warning-800 dark:bg-warning-900 dark:text-warning-200',
    error: 'bg-error-100 text-error-800 dark:bg-error-900 dark:text-error-200',
    gray: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200',
  };

  const sizeClasses = {
    small: 'px-2 py-0.5 text-xs',
    medium: 'px-2.5 py-0.5 text-sm',
    large: 'px-3 py-1 text-base',
  };

  const dotSizeClasses = {
    small: 'w-2 h-2',
    medium: 'w-2 h-2',
    large: 'w-2.5 h-2.5',
  };

  const classes = `
    ${baseClasses}
    ${variantClasses[variant]}
    ${sizeClasses[size]}
    ${className}
  `.trim().replace(/\s+/g, ' ');

  return (
    <span className={classes}>
      {dot && (
        <span
          className={`
            inline-block rounded-full mr-1.5
            ${variantClasses[variant].split(' ')[0]}
            ${dotSizeClasses[size]}
          `}
          aria-hidden="true"
        />
      )}
      {children}
    </span>
  );
};

// Status Badge
interface StatusBadgeProps {
  status: 'online' | 'offline' | 'busy' | 'away' | 'error';
  showLabel?: boolean;
  className?: string;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({
  status,
  showLabel = true,
  className = '',
}) => {
  const statusConfig = {
    online: {
      color: 'bg-success-500',
      label: 'Online',
      variant: 'success' as const,
    },
    offline: {
      color: 'bg-gray-500',
      label: 'Offline',
      variant: 'gray' as const,
    },
    busy: {
      color: 'bg-error-500',
      label: 'Busy',
      variant: 'error' as const,
    },
    away: {
      color: 'bg-warning-500',
      label: 'Away',
      variant: 'warning' as const,
    },
    error: {
      color: 'bg-error-500',
      label: 'Error',
      variant: 'error' as const,
    },
  };

  const config = statusConfig[status];

  return (
    <div className={`flex items-center space-x-2 ${className}`}>
      <span
        className={`
          inline-block w-2 h-2 rounded-full
          ${config.color}
        `}
        aria-hidden="true"
      />
      {showLabel && (
        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
          {config.label}
        </span>
      )}
    </div>
  );
};

// VM Status Badge
interface VMStatusBadgeProps {
  status: 'Running' | 'Stopped' | 'Starting' | 'Stopping' | 'Error' | 'Suspended';
  showIcon?: boolean;
  className?: string;
}

export const VMStatusBadge: React.FC<VMStatusBadgeProps> = ({
  status,
  showIcon = true,
  className = '',
}) => {
  const statusConfig = {
    Running: {
      variant: 'success' as const,
      icon: '▶️',
      color: 'bg-success-500',
    },
    Stopped: {
      variant: 'gray' as const,
      icon: '⏹️',
      color: 'bg-gray-500',
    },
    Starting: {
      variant: 'primary' as const,
      icon: '⏳',
      color: 'bg-primary-500',
    },
    Stopping: {
      variant: 'warning' as const,
      icon: '🛑',
      color: 'bg-warning-500',
    },
    Error: {
      variant: 'error' as const,
      icon: '❌',
      color: 'bg-error-500',
    },
    Suspended: {
      variant: 'warning' as const,
      icon: '⏸️',
      color: 'bg-warning-500',
    },
  };

  const config = statusConfig[status];

  return (
    <Badge variant={config.variant} className={className}>
      {showIcon && <span className="mr-1">{config.icon}</span>}
      {status}
    </Badge>
  );
};

// Count Badge
interface CountBadgeProps {
  count: number;
  max?: number;
  variant?: 'primary' | 'success' | 'warning' | 'error';
  className?: string;
  showZero?: boolean;
}

export const CountBadge: React.FC<CountBadgeProps> = ({
  count,
  max = 99,
  variant = 'primary',
  className = '',
  showZero = false,
}) => {
  if (count === 0 && !showZero) return null;

  const displayCount = count > max ? `${max}+` : count.toString();

  return (
    <Badge variant={variant} size="small" className={className}>
      {displayCount}
    </Badge>
  );
};

// Priority Badge
interface PriorityBadgeProps {
  priority: 'low' | 'normal' | 'high' | 'critical';
  className?: string;
}

export const PriorityBadge: React.FC<PriorityBadgeProps> = ({
  priority,
  className = '',
}) => {
  const priorityConfig = {
    low: {
      variant: 'gray' as const,
      label: 'Low',
      icon: '🔵',
    },
    normal: {
      variant: 'primary' as const,
      label: 'Normal',
      icon: '🔵',
    },
    high: {
      variant: 'warning' as const,
      label: 'High',
      icon: '🟠',
    },
    critical: {
      variant: 'error' as const,
      label: 'Critical',
      icon: '🔴',
    },
  };

  const config = priorityConfig[priority];

  return (
    <Badge variant={config.variant} className={className}>
      <span className="mr-1">{config.icon}</span>
      {config.label}
    </Badge>
  );
};