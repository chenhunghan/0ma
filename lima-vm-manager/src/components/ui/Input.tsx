import React, { forwardRef } from 'react';
import type { InputProps } from '../../types';

export const Input = forwardRef<HTMLInputElement, InputProps>(({
  type = 'text',
  value,
  placeholder,
  disabled = false,
  error,
  label,
  required = false,
  onChange,
  className = '',
  ...props
}, ref) => {
  const inputId = React.useId();

  const baseClasses = 'block w-full px-3 py-2 text-sm border rounded-lg placeholder-gray-400 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:bg-gray-100 disabled:cursor-not-allowed dark:bg-gray-800 dark:placeholder-gray-500 dark:disabled:bg-gray-700';

  const stateClasses = error
    ? 'border-error-300 text-error-900 placeholder-error-400 focus:ring-error-500 focus:border-error-500 dark:border-error-600 dark:text-error-100'
    : 'border-gray-300 text-gray-900 placeholder-gray-500 focus:ring-primary-500 focus:border-primary-500 focus:border-transparent dark:border-gray-600 dark:text-white';

  const classes = `${baseClasses} ${stateClasses} ${className}`.trim().replace(/\s+/g, ' ');

  return (
    <div className="w-full">
      {label && (
        <label
          htmlFor={inputId}
          className={`block text-sm font-medium text-gray-700 mb-1 dark:text-gray-300 ${
            required ? 'after:content-["*"] after:text-error-500 after:ml-1' : ''
          }`}
        >
          {label}
        </label>
      )}
      <input
        ref={ref}
        id={inputId}
        type={type}
        value={value}
        placeholder={placeholder}
        disabled={disabled}
        onChange={(e) => onChange?.(e.target.value)}
        className={classes}
        aria-invalid={error ? 'true' : 'false'}
        aria-describedby={error ? `${inputId}-error` : undefined}
        {...props}
      />
      {error && (
        <p id={`${inputId}-error`} className="mt-1 text-sm text-error-600 dark:text-error-400">
          {error}
        </p>
      )}
    </div>
  );
});

Input.displayName = 'Input';

// Textarea component
interface TextareaProps extends Omit<InputProps, 'type'> {
  rows?: number;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(({
  rows = 4,
  className = '',
  ...props
}, ref) => {
  const inputId = React.useId();

  const baseClasses = 'block w-full px-3 py-2 text-sm border rounded-lg placeholder-gray-400 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:bg-gray-100 disabled:cursor-not-allowed dark:bg-gray-800 dark:placeholder-gray-500 dark:disabled:bg-gray-700 resize-vertical';

  const stateClasses = props.error
    ? 'border-error-300 text-error-900 placeholder-error-400 focus:ring-error-500 focus:border-error-500 dark:border-error-600 dark:text-error-100'
    : 'border-gray-300 text-gray-900 placeholder-gray-500 focus:ring-primary-500 focus:border-primary-500 focus:border-transparent dark:border-gray-600 dark:text-white';

  const classes = `${baseClasses} ${stateClasses} ${className}`.trim().replace(/\s+/g, ' ');

  return (
    <div className="w-full">
      {props.label && (
        <label
          htmlFor={inputId}
          className={`block text-sm font-medium text-gray-700 mb-1 dark:text-gray-300 ${
            props.required ? 'after:content-["*"] after:text-error-500 after:ml-1' : ''
          }`}
        >
          {props.label}
        </label>
      )}
      <textarea
        ref={ref}
        id={inputId}
        rows={rows}
        value={props.value}
        placeholder={props.placeholder}
        disabled={props.disabled}
        onChange={(e) => props.onChange?.(e.target.value)}
        className={classes}
        aria-invalid={props.error ? 'true' : 'false'}
        aria-describedby={props.error ? `${inputId}-error` : undefined}
        {...(props as any)}
      />
      {props.error && (
        <p id={`${inputId}-error`} className="mt-1 text-sm text-error-600 dark:text-error-400">
          {props.error}
        </p>
      )}
    </div>
  );
});

Textarea.displayName = 'Textarea';

// Select component
interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

interface SelectProps extends Omit<InputProps, 'type' | 'onChange'> {
  options: SelectOption[];
  onChange?: (value: string) => void;
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(({
  options,
  value,
  onChange,
  placeholder,
  disabled = false,
  error,
  label,
  required = false,
  className = '',
  ...props
}, ref) => {
  const inputId = React.useId();

  const baseClasses = 'block w-full px-3 py-2 text-sm border rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:bg-gray-100 disabled:cursor-not-allowed dark:bg-gray-800 dark:disabled:bg-gray-700';

  const stateClasses = error
    ? 'border-error-300 text-error-900 focus:ring-error-500 focus:border-error-500 dark:border-error-600 dark:text-error-100'
    : 'border-gray-300 text-gray-900 focus:ring-primary-500 focus:border-primary-500 focus:border-transparent dark:border-gray-600 dark:text-white';

  const classes = `${baseClasses} ${stateClasses} ${className}`.trim().replace(/\s+/g, ' ');

  return (
    <div className="w-full">
      {label && (
        <label
          htmlFor={inputId}
          className={`block text-sm font-medium text-gray-700 mb-1 dark:text-gray-300 ${
            required ? 'after:content-["*"] after:text-error-500 after:ml-1' : ''
          }`}
        >
          {label}
        </label>
      )}
      <select
        ref={ref}
        id={inputId}
        value={value}
        onChange={(e) => onChange?.(e.target.value)}
        disabled={disabled}
        className={classes}
        aria-invalid={error ? 'true' : 'false'}
        aria-describedby={error ? `${inputId}-error` : undefined}
        {...props}
      >
        {placeholder && (
          <option value="" disabled>
            {placeholder}
          </option>
        )}
        {options.map((option) => (
          <option
            key={option.value}
            value={option.value}
            disabled={option.disabled}
          >
            {option.label}
          </option>
        ))}
      </select>
      {error && (
        <p id={`${inputId}-error`} className="mt-1 text-sm text-error-600 dark:text-error-400">
          {error}
        </p>
      )}
    </div>
  );
});

Select.displayName = 'Select';

// Checkbox component
interface CheckboxProps {
  checked?: boolean;
  indeterminate?: boolean;
  label?: string;
  disabled?: boolean;
  error?: string;
  required?: boolean;
  onChange?: (checked: boolean) => void;
  className?: string;
}

export const Checkbox = forwardRef<HTMLInputElement, CheckboxProps>(({
  checked = false,
  indeterminate = false,
  label,
  disabled = false,
  error,
  required = false,
  onChange,
  className = '',
  ...props
}, ref) => {
  const inputId = React.useId();
  const inputRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    if (inputRef.current) {
      inputRef.current.indeterminate = indeterminate;
    }
  }, [indeterminate]);

  const classes = `
    h-4 w-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500 disabled:opacity-50 disabled:cursor-not-allowed
    ${error ? 'border-error-300 focus:ring-error-500' : ''}
    ${className}
  `.trim().replace(/\s+/g, ' ');

  return (
    <div className="flex items-start">
      <div className="flex items-center h-5">
        <input
          ref={(node) => {
            inputRef.current = node;
            if (typeof ref === 'function') ref(node);
            else if (ref) ref.current = node;
          }}
          id={inputId}
          type="checkbox"
          checked={checked}
          disabled={disabled}
          onChange={(e) => onChange?.(e.target.checked)}
          className={classes}
          aria-invalid={error ? 'true' : 'false'}
          aria-describedby={error ? `${inputId}-error` : undefined}
          {...props}
        />
      </div>
      {label && (
        <div className="ml-3 text-sm">
          <label
            htmlFor={inputId}
            className={`font-medium text-gray-700 dark:text-gray-300 ${
              disabled ? 'opacity-50 cursor-not-allowed' : ''
            } ${required ? 'after:content-["*"] after:text-error-500 after:ml-1' : ''}`}
          >
            {label}
          </label>
          {error && (
            <p id={`${inputId}-error`} className="mt-1 text-error-600 dark:text-error-400">
              {error}
            </p>
          )}
        </div>
      )}
    </div>
  );
});

Checkbox.displayName = 'Checkbox';