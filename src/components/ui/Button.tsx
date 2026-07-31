'use client';

import React, { ButtonHTMLAttributes, ReactNode } from 'react';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'success' | 'outline' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
  icon?: ReactNode;
  iconPosition?: 'left' | 'right';
  children: ReactNode;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant = 'primary',
      size = 'md',
      isLoading = false,
      icon,
      iconPosition = 'left',
      disabled,
      children,
      className = '',
      style: styleProp,
      ...props
    },
    ref
  ) => {
    const variants: Record<string, React.CSSProperties> = {
      primary: {
        background: 'linear-gradient(135deg, #14F6BF, #17BEC4 45%, #0B6DE5)',
        color: '#fff',
        border: '1px solid transparent',
        boxShadow: '0 4px 14px rgba(11,109,229,0.25)',
      },
      secondary: {
        background: 'var(--surface-2)',
        color: 'var(--fg-1)',
        border: '1px solid transparent',
      },
      outline: {
        background: 'var(--surface-0)',
        color: 'var(--fg-1)',
        border: '1px solid var(--border-strong, #D2D2D7)',
      },
      danger: {
        background: '#FF3B30',
        color: '#fff',
        border: '1px solid transparent',
      },
      success: {
        background: '#34C759',
        color: '#fff',
        border: '1px solid transparent',
      },
      ghost: {
        background: 'transparent',
        color: 'var(--fg-1)',
        border: '1px solid transparent',
      },
    };

    const sizes: Record<string, React.CSSProperties> = {
      sm: { padding: '8px 14px', fontSize: '13px' },
      md: { padding: '10px 18px', fontSize: '15px' },
      lg: { padding: '14px 24px', fontSize: '17px' },
    };

    const v = variants[variant] || variants.primary;
    const s = sizes[size] || sizes.md;

    return (
      <button
        ref={ref}
        disabled={disabled || isLoading}
        className={className}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '8px',
          borderRadius: '12px',
          fontFamily: 'var(--font-sans)',
          fontWeight: 500,
          letterSpacing: '-0.01em',
          cursor: disabled ? 'not-allowed' : 'pointer',
          opacity: disabled ? 0.4 : 1,
          transition: 'filter 200ms cubic-bezier(.25,.1,.25,1), background 200ms, transform 120ms',
          ...v,
          ...s,
          ...styleProp,
        }}
        onMouseDown={(e) => {
          e.currentTarget.style.filter = 'brightness(0.95)';
          e.currentTarget.style.transform = 'translateY(0)';
        }}
        onMouseUp={(e) => {
          e.currentTarget.style.filter = '';
          e.currentTarget.style.transform = '';
        }}
        onMouseEnter={(e) => {
          if (variant === 'primary') {
            e.currentTarget.style.transform = 'translateY(-1px)';
            e.currentTarget.style.boxShadow = '0 0 24px rgba(11,109,229,0.35)';
          }
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.filter = '';
          e.currentTarget.style.transform = '';
          if (variant === 'primary') {
            e.currentTarget.style.boxShadow = '0 4px 14px rgba(11,109,229,0.25)';
          }
        }}
        {...props}
      >
        {isLoading && (
          <svg
            className="animate-spin h-4 w-4"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
        )}
        {!isLoading && icon && iconPosition === 'left' && <span>{icon}</span>}
        {children}
        {!isLoading && icon && iconPosition === 'right' && <span>{icon}</span>}
      </button>
    );
  }
);

Button.displayName = 'Button';

export default Button;
