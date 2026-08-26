'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  padded?: boolean;
}

const Card = React.forwardRef<HTMLDivElement, CardProps>(
  ({ className, padded = false, children, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          'rounded-xl border border-border bg-card text-card-foreground shadow-sm transition-all',
          padded && 'p-6',
          className
        )}
        {...props}
      >
        {children}
      </div>
    );
  }
);
Card.displayName = 'Card';

export const CardHeader = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn('flex flex-col space-y-1.5 p-6 border-b border-border/40', className)}
    {...props}
  />
));
CardHeader.displayName = 'CardHeader';

export const CardTitle = React.forwardRef<
  HTMLHeadingElement,
  React.HTMLAttributes<HTMLHeadingElement>
>(({ className, ...props }, ref) => (
  <h3
    ref={ref}
    className={cn('font-semibold leading-none tracking-tight text-foreground text-lg', className)}
    {...props}
  />
));
CardTitle.displayName = 'CardTitle';

export const CardDescription = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
  <p
    ref={ref}
    className={cn('text-sm text-muted-foreground', className)}
    {...props}
  />
));
CardDescription.displayName = 'CardDescription';

export const CardContent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div ref={ref} className={cn('p-6', className)} {...props} />
));
CardContent.displayName = 'CardContent';

// Legacy compatibility alias
export const CardBody = CardContent;

export const CardFooter = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn('flex items-center p-6 pt-0 border-t border-border/40 bg-muted/20 rounded-b-xl', className)}
    {...props}
  />
));
CardFooter.displayName = 'CardFooter';

export interface StatCardProps {
  icon: React.ReactNode;
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
  backgroundColor?: string;
  iconColor?: string;
}

export function StatCard({
  icon,
  label,
  value,
  trend,
  tint,
  color,
  mono = true,
  backgroundColor,
  iconColor,
}: StatCardProps) {
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
    <Card className="p-5 flex flex-col justify-between hover:border-primary/40 transition-colors">
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          {label}
        </span>
        <div
          className="p-2 rounded-lg flex items-center justify-center shrink-0"
          style={{
            background: backgroundColor || tint || 'hsl(var(--primary) / 0.1)',
            color: iconColor || color || 'hsl(var(--primary))',
          }}
        >
          {icon}
        </div>
      </div>
      <div className="mt-3">
        <div
          className={cn(
            'text-2xl font-bold tracking-tight text-foreground',
            mono ? 'font-mono' : 'font-sans'
          )}
        >
          {value}
        </div>
        {trend && trendLabel && (
          <div
            className={cn(
              'flex items-center gap-1 text-xs font-medium mt-1.5',
              trendUp ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
            )}
          >
            <span>{trendUp ? '↑' : '↓'}</span>
            <span>{trendLabel}</span>
          </div>
        )}
      </div>
    </Card>
  );
}

(Card as any).Header = CardHeader;
(Card as any).Title = CardTitle;
(Card as any).Description = CardDescription;
(Card as any).Content = CardContent;
(Card as any).Body = CardBody;
(Card as any).Footer = CardFooter;
(Card as any).Stat = StatCard;

export { Card };
export default Card;
