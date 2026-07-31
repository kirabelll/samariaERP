'use client';

import React, { ReactNode } from 'react';

interface CardProps {
  children: ReactNode;
  className?: string;
  padded?: boolean;
  style?: React.CSSProperties;
}

interface CardSectionProps {
  children: ReactNode;
  className?: string;
}

interface StatCardProps {
  icon: ReactNode;
  label: string;
  value: string | number;
  trend?: {
    up: boolean;
    label: string;
  } | {
    value: number;
    isPositive: boolean;
  };
  tint?: string;
  color?: string;
  mono?: boolean;
  // Legacy compat
  backgroundColor?: string;
  iconColor?: string;
}

export function CardHeader({ children, className = '' }: CardSectionProps) {
  return (
    <div
      className={className}
      style={{
        padding: '20px 24px',
        borderBottom: '1px solid var(--surface-2)',
      }}
    >
      {children}
    </div>
  );
}

export function CardBody({ children, className = '' }: CardSectionProps) {
  return <div className={className} style={{ padding: '20px 24px' }}>{children}</div>;
}

export function CardFooter({ children, className = '' }: CardSectionProps) {
  return (
    <div
      className={className}
      style={{
        padding: '16px 24px',
        borderTop: '1px solid var(--surface-2)',
        background: 'var(--surface-1)',
        borderRadius: '0 0 16px 16px',
      }}
    >
      {children}
    </div>
  );
}

export function StatCard({
  icon,
  label,
  value,
  trend,
  tint = '#E5F0FF',
  color = '#0B6DE5',
  mono = true,
  backgroundColor,
  iconColor,
}: StatCardProps) {
  // Determine trend display
  let trendUp = false;
  let trendLabel = '';
  if (trend) {
    if ('up' in trend) {
      trendUp = trend.up;
      trendLabel = trend.label;
    } else {
      trendUp = trend.isPositive;
      trendLabel = `${Math.abs(trend.value)}%`;
    }
  }

  return (
    <div
      style={{
        background: 'var(--surface-0)',
        borderRadius: 16,
        border: '1px solid var(--border)',
        boxShadow: 'var(--shadow-md)',
        padding: 18,
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
        <div style={{ minWidth: 0 }}>
          <div style={{
            fontFamily: 'var(--font-sans)',
            fontSize: 11,
            fontWeight: 600,
            letterSpacing: '0.10em',
            textTransform: 'uppercase',
            color: 'var(--fg-2)',
            marginBottom: 6,
          }}>
            {label}
          </div>
          <div style={{
            fontFamily: mono ? 'var(--font-mono)' : 'var(--font-sans)',
            fontSize: 28,
            lineHeight: '32px',
            fontWeight: 700,
            letterSpacing: '-0.01em',
            color: 'var(--fg-1)',
          }}>
            {value}
          </div>
          {trend && trendLabel && (
            <div style={{
              fontSize: 12,
              color: trendUp ? '#248A3D' : '#D70015',
              marginTop: 4,
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              gap: 4,
            }}>
              {trendUp ? '↑' : '↓'} {trendLabel}
            </div>
          )}
        </div>
        <div
          style={{
            width: 40,
            height: 40,
            borderRadius: 12,
            background: backgroundColor || tint,
            color: iconColor || color,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}
        >
          {icon}
        </div>
      </div>
    </div>
  );
}

function Card({ children, className = '', padded = true, style: styleProp }: CardProps) {
  return (
    <div
      className={className}
      style={{
        background: 'var(--surface-0)',
        borderRadius: 16,
        border: '1px solid var(--border)',
        boxShadow: 'var(--shadow-md)',
        padding: padded ? 24 : 0,
        ...styleProp,
      }}
    >
      {children}
    </div>
  );
}

Card.Header = CardHeader;
Card.Body = CardBody;
Card.Footer = CardFooter;
Card.Stat = StatCard;

export default Card;
