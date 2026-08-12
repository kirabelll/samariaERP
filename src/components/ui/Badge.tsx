'use client';

import React, { ReactNode } from 'react';

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
  | 'Deactivated';

interface BadgeProps {
  status: string;
  children?: ReactNode;
  variant?: 'pill' | 'badge';
  className?: string;
}

const statusColors: Record<string, { bg: string; fg: string }> = {
  Draft:        { bg: 'rgba(142,142,147,.10)', fg: '#636366' },
  Pending:      { bg: 'rgba(255,149,0,.10)',   fg: '#C93400' },
  'In Progress':{ bg: 'rgba(11,109,229,.10)',  fg: '#0055C4' },
  InProgress:   { bg: 'rgba(11,109,229,.10)',  fg: '#0055C4' },
  Submitted:    { bg: 'rgba(11,109,229,.10)',  fg: '#0055C4' },
  'In Transit': { bg: 'rgba(11,109,229,.10)',  fg: '#0055C4' },
  Approved:     { bg: 'rgba(52,199,89,.10)',   fg: '#248A3D' },
  Delivered:    { bg: 'rgba(52,199,89,.10)',   fg: '#248A3D' },
  Active:       { bg: 'rgba(52,199,89,.10)',   fg: '#248A3D' },
  Settled:      { bg: 'rgba(52,199,89,.10)',   fg: '#248A3D' },
  Lifted:       { bg: 'rgba(52,199,89,.10)',   fg: '#248A3D' },
  Rejected:     { bg: 'rgba(255,59,48,.10)',   fg: '#D70015' },
  Cancelled:    { bg: 'rgba(255,59,48,.10)',   fg: '#D70015' },
  Expired:      { bg: 'rgba(255,59,48,.10)',   fg: '#D70015' },
  Deactivated:  { bg: 'rgba(255,59,48,.10)',   fg: '#D70015' },
  'Near Expiry':{ bg: 'rgba(255,149,0,.10)',   fg: '#C93400' },
  'In Custody': { bg: 'rgba(255,204,0,.15)',   fg: '#8C6D00' },
  Void:         { bg: 'rgba(142,142,147,.10)', fg: '#636366' },
};

function Badge({ status, children, variant = 'badge' }: BadgeProps) {
  const c = statusColors[status] || statusColors.Draft;
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        padding: '4px 11px',
        borderRadius: 999,
        fontFamily: 'var(--font-sans)',
        fontSize: '11px',
        fontWeight: 600,
        letterSpacing: '0.01em',
        background: c.bg,
        color: c.fg,
        whiteSpace: 'nowrap',
      }}
    >
      {children || status}
    </span>
  );
}

Badge.displayName = 'Badge';

export default Badge;
