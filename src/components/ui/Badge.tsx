'use client';

import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

export type BadgeStatus =
  | 'Active'
  | 'Approved'
  | 'Pending'
  | 'Rejected'
  | 'Cancelled'
  | 'Draft'
  | 'InProgress'
  | 'In Progress'
  | 'Delivered'
  | 'Settled'
  | 'Expired'
  | 'Near Expiry'
  | 'In Custody'
  | 'Submitted'
  | 'In Transit'
  | 'Deactivated'
  | string;

const badgeVariants = cva(
  'inline-flex items-center justify-center rounded-full border px-2.5 py-0.5 text-xs font-semibold tracking-wide transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 w-fit whitespace-nowrap shrink-0 gap-1',
  {
    variants: {
      variant: {
        default: 'border-transparent bg-primary text-primary-foreground shadow-xs',
        secondary: 'border-transparent bg-secondary text-secondary-foreground',
        destructive: 'border-transparent bg-destructive/15 text-destructive border-destructive/20',
        outline: 'text-foreground border-border',
        success: 'border-emerald-500/20 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
        warning: 'border-amber-500/20 bg-amber-500/10 text-amber-600 dark:text-amber-400',
        info: 'border-sky-500/20 bg-sky-500/10 text-sky-600 dark:text-sky-400',
        error: 'border-destructive/20 bg-destructive/10 text-destructive',
        danger: 'border-destructive/20 bg-destructive/10 text-destructive',
        pill: 'border-transparent bg-secondary text-secondary-foreground',
        badge: 'border-transparent bg-primary text-primary-foreground shadow-xs',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    Omit<VariantProps<typeof badgeVariants>, 'variant'> {
  variant?: 'default' | 'secondary' | 'destructive' | 'outline' | 'success' | 'warning' | 'info' | 'error' | 'danger' | 'pill' | 'badge' | string;
  status?: BadgeStatus;
  size?: 'sm' | 'md' | 'lg' | string;
}

const statusVariants: Record<string, string> = {
  Draft: 'border-muted-foreground/20 bg-muted text-muted-foreground',
  Pending: 'border-amber-500/20 bg-amber-500/10 text-amber-600 dark:text-amber-400',
  'In Progress': 'border-sky-500/20 bg-sky-500/10 text-sky-600 dark:text-sky-400',
  InProgress: 'border-sky-500/20 bg-sky-500/10 text-sky-600 dark:text-sky-400',
  Submitted: 'border-sky-500/20 bg-sky-500/10 text-sky-600 dark:text-sky-400',
  'In Transit': 'border-sky-500/20 bg-sky-500/10 text-sky-600 dark:text-sky-400',
  Approved: 'border-emerald-500/20 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
  Delivered: 'border-emerald-500/20 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
  Active: 'border-emerald-500/20 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
  Settled: 'border-emerald-500/20 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
  Lifted: 'border-emerald-500/20 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
  Rejected: 'border-destructive/20 bg-destructive/10 text-destructive',
  Cancelled: 'border-destructive/20 bg-destructive/10 text-destructive',
  Expired: 'border-destructive/20 bg-destructive/10 text-destructive',
  Deactivated: 'border-destructive/20 bg-destructive/10 text-destructive',
  'Near Expiry': 'border-amber-500/20 bg-amber-500/10 text-amber-600 dark:text-amber-400',
  'In Custody': 'border-yellow-500/20 bg-yellow-500/15 text-yellow-700 dark:text-yellow-400',
  Void: 'border-muted-foreground/20 bg-muted text-muted-foreground',
};

function Badge({ className, variant, status, children, size: _size, ...props }: BadgeProps) {
  const statusClass = status ? statusVariants[status] : undefined;

  return (
    <span
      className={cn(
        badgeVariants({ variant: (statusClass ? undefined : variant) as any }),
        statusClass,
        className
      )}
      {...props}
    >
      {children || status}
    </span>
  );
}

export { Badge, badgeVariants };
export default Badge;
