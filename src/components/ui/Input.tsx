'use client';

import React, { InputHTMLAttributes, ReactNode } from 'react';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
  icon?: ReactNode;
  iconPosition?: 'left' | 'right';
}

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  helperText?: string;
  options: Array<{ value: string | number; label: string }>;
}

interface TextareaProps
  extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  helperText?: string;
  maxLength?: number;
}

const baseInputStyles =
  'w-full px-4 py-3 bg-white/80 border border-[#D2D2D7] rounded-xl focus:outline-none focus:ring-4 focus:ring-[rgba(0,122,255,0.25)] focus:border-[#007AFF] transition-all duration-200 disabled:bg-[#F5F5F7] disabled:cursor-not-allowed text-[#1D1D1F] placeholder:text-[#86868B]';

const errorInputStyles = 'border-[#FF3B30] focus:ring-[rgba(255,59,48,0.25)] focus:border-[#FF3B30]';

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  (
    {
      label,
      error,
      helperText,
      icon,
      iconPosition = 'left',
      className = '',
      type = 'text',
      ...props
    },
    ref
  ) => {
    return (
      <div className="w-full">
        {label && (
          <label className="block text-[13px] font-medium text-[#86868B] uppercase tracking-wider mb-1.5">
            {label}
            {props.required && <span className="text-[#FF3B30]">*</span>}
          </label>
        )}
        <div className="relative">
          {icon && iconPosition === 'left' && (
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[#86868B]">
              {icon}
            </span>
          )}
          <input
            ref={ref}
            type={type}
            className={`${baseInputStyles} ${error ? errorInputStyles : ''} ${
              icon && iconPosition === 'left' ? 'pl-10' : ''
            } ${icon && iconPosition === 'right' ? 'pr-10' : ''} ${className}`}
            {...props}
          />
          {icon && iconPosition === 'right' && (
            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[#86868B]">
              {icon}
            </span>
          )}
        </div>
        {error && <p className="mt-1.5 text-sm text-[#FF3B30]">{error}</p>}
        {helperText && !error && (
          <p className="mt-1.5 text-sm text-[#86868B]">{helperText}</p>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';

const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  (
    { label, error, helperText, options, className = '', ...props },
    ref
  ) => {
    return (
      <div className="w-full">
        {label && (
          <label className="block text-[13px] font-medium text-[#86868B] uppercase tracking-wider mb-1.5">
            {label}
            {props.required && <span className="text-[#FF3B30]">*</span>}
          </label>
        )}
        <div className="relative">
          <select
            ref={ref}
            className={`${baseInputStyles} ${
              error ? errorInputStyles : ''
            } appearance-none pr-10 ${className}`}
            {...props}
          >
            {options.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          <svg
            className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#86868B] pointer-events-none"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
          </svg>
        </div>
        {error && <p className="mt-1.5 text-sm text-[#FF3B30]">{error}</p>}
        {helperText && !error && (
          <p className="mt-1.5 text-sm text-[#86868B]">{helperText}</p>
        )}
      </div>
    );
  }
);

Select.displayName = 'Select';

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  (
    {
      label,
      error,
      helperText,
      maxLength,
      className = '',
      ...props
    },
    ref
  ) => {
    const charCount = (props.value as string)?.length || 0;

    return (
      <div className="w-full">
        {label && (
          <label className="block text-[13px] font-medium text-[#86868B] uppercase tracking-wider mb-1.5">
            {label}
            {props.required && <span className="text-[#FF3B30]">*</span>}
          </label>
        )}
        <textarea
          ref={ref}
          maxLength={maxLength}
          className={`${baseInputStyles} resize-vertical min-h-24 ${
            error ? errorInputStyles : ''
          } ${className}`}
          {...props}
        />
        {maxLength && (
          <p className="mt-1.5 text-xs text-[#86868B]">
            {charCount} / {maxLength}
          </p>
        )}
        {error && <p className="mt-1.5 text-sm text-[#FF3B30]">{error}</p>}
        {helperText && !error && (
          <p className="mt-1.5 text-sm text-[#86868B]">{helperText}</p>
        )}
      </div>
    );
  }
);

Textarea.displayName = 'Textarea';

export { Input, Select, Textarea };
export default Input;
