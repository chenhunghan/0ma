import React from 'react';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  hoverable?: boolean;
  clickable?: boolean;
  onClick?: () => void;
}

export const Card: React.FC<CardProps> = ({
  children,
  className = '',
  hoverable = false,
  clickable = false,
  onClick,
}) => {
  const baseClasses = 'bg-white rounded-xl border border-gray-200 dark:bg-gray-800 dark:border-gray-700';

  const interactiveClasses = hoverable
    ? 'transition-shadow duration-200 hover:shadow-lg'
    : clickable
    ? 'transition-all duration-200 hover:shadow-lg cursor-pointer active:scale-95'
    : '';

  const classes = `${baseClasses} ${interactiveClasses} ${className}`.trim().replace(/\s+/g, ' ');

  return (
    <div
      className={classes}
      onClick={onClick}
      role={clickable ? 'button' : undefined}
      tabIndex={clickable ? 0 : undefined}
      onKeyDown={(e) => {
        if (clickable && (e.key === 'Enter' || e.key === ' ')) {
          e.preventDefault();
          onClick?.();
        }
      }}
    >
      {children}
    </div>
  );
};

interface CardHeaderProps {
  children: React.ReactNode;
  className?: string;
  divider?: boolean;
}

export const CardHeader: React.FC<CardHeaderProps> = ({
  children,
  className = '',
  divider = true,
}) => {
  const classes = `
    px-6 py-4
    ${divider ? 'border-b border-gray-200 dark:border-gray-700' : ''}
    ${className}
  `.trim().replace(/\s+/g, ' ');

  return <div className={classes}>{children}</div>;
};

interface CardBodyProps {
  children: React.ReactNode;
  className?: string;
}

export const CardBody: React.FC<CardBodyProps> = ({
  children,
  className = '',
}) => {
  const classes = `px-6 py-4 ${className}`.trim().replace(/\s+/g, ' ');
  return <div className={classes}>{children}</div>;
};

interface CardFooterProps {
  children: React.ReactNode;
  className?: string;
  divider?: boolean;
}

export const CardFooter: React.FC<CardFooterProps> = ({
  children,
  className = '',
  divider = true,
}) => {
  const classes = `
    px-6 py-4
    ${divider ? 'border-t border-gray-200 dark:border-gray-700' : ''}
    ${className}
  `.trim().replace(/\s+/g, ' ');

  return <div className={classes}>{children}</div>;
};

// Card with sections component
interface CardSectionProps {
  title?: string;
  subtitle?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}

export const CardSection: React.FC<CardSectionProps> = ({
  title,
  subtitle,
  action,
  children,
  className = '',
}) => {
  return (
    <Card className={className}>
      {(title || subtitle || action) && (
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              {title && (
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  {title}
                </h3>
              )}
              {subtitle && (
                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                  {subtitle}
                </p>
              )}
            </div>
            {action && <div className="flex-shrink-0 ml-4">{action}</div>}
          </div>
        </CardHeader>
      )}
      <CardBody>{children}</CardBody>
    </Card>
  );
};

// Stats Card component
interface StatsCardProps {
  title: string;
  value: string | number;
  change?: {
    value: string;
    type: 'increase' | 'decrease' | 'neutral';
  };
  icon?: React.ReactNode;
  color?: 'primary' | 'success' | 'warning' | 'error';
  className?: string;
}

export const StatsCard: React.FC<StatsCardProps> = ({
  title,
  value,
  change,
  icon,
  color = 'primary',
  className = '',
}) => {
  const colorClasses = {
    primary: {
      bg: 'bg-primary-100 dark:bg-primary-900',
      text: 'text-primary-600 dark:text-primary-400',
    },
    success: {
      bg: 'bg-success-100 dark:bg-success-900',
      text: 'text-success-600 dark:text-success-400',
    },
    warning: {
      bg: 'bg-warning-100 dark:bg-warning-900',
      text: 'text-warning-600 dark:text-warning-400',
    },
    error: {
      bg: 'bg-error-100 dark:bg-error-900',
      text: 'text-error-600 dark:text-error-400',
    },
  };

  const changeColors = {
    increase: 'text-success-600 dark:text-success-400',
    decrease: 'text-error-600 dark:text-error-400',
    neutral: 'text-gray-500 dark:text-gray-400',
  };

  return (
    <Card className={className}>
      <CardBody>
        <div className="flex items-center">
          {icon && (
            <div className={`flex-shrink-0 p-3 rounded-lg ${colorClasses[color].bg}`}>
              <div className={colorClasses[color].text}>{icon}</div>
            </div>
          )}
          <div className={`ml-4 flex-1 ${icon ? '' : 'ml-0'}`}>
            <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
              {title}
            </p>
            <p className="text-2xl font-semibold text-gray-900 dark:text-white">
              {value}
            </p>
            {change && (
              <p className={`mt-1 text-sm ${changeColors[change.type]}`}>
                {change.value}
              </p>
            )}
          </div>
        </div>
      </CardBody>
    </Card>
  );
};