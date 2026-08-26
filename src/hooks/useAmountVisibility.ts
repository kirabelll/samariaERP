'use client';

import * as React from 'react';

const STORAGE_KEY = 'samaria_hide_amounts';
const EVENT_KEY = 'samaria_amounts_visibility_changed';

// In-memory fallback if localStorage isn't available
let memoryHidden = false;

function getSnapshot(): boolean {
  if (typeof window === 'undefined') return true;
  try {
    const val = localStorage.getItem(STORAGE_KEY);
    return val !== 'true';
  } catch {
    return !memoryHidden;
  }
}

function getServerSnapshot(): boolean {
  return true;
}

function subscribe(callback: () => void) {
  if (typeof window === 'undefined') return () => {};
  window.addEventListener(EVENT_KEY, callback);
  window.addEventListener('storage', callback);
  return () => {
    window.removeEventListener(EVENT_KEY, callback);
    window.removeEventListener('storage', callback);
  };
}

/**
 * Hook to toggle and synchronize financial amount visibility (Eye / Eye-off privacy mode)
 * across the Executive and Financial dashboards.
 */
export function useAmountVisibility() {
  const showAmounts = React.useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  const toggleVisibility = React.useCallback(() => {
    try {
      const currentHidden = typeof window !== 'undefined' && localStorage.getItem(STORAGE_KEY) === 'true';
      const newHidden = !currentHidden;
      memoryHidden = newHidden;
      if (typeof window !== 'undefined') {
        localStorage.setItem(STORAGE_KEY, newHidden ? 'true' : 'false');
        window.dispatchEvent(new Event(EVENT_KEY));
      }
    } catch {
      memoryHidden = !memoryHidden;
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new Event(EVENT_KEY));
      }
    }
  }, []);

  const formatAmount = React.useCallback(
    (amount: number | string | undefined | null, suffix: string = 'ETB', minFraction: number = 2): string => {
      if (amount === undefined || amount === null) return '—';
      if (!showAmounts) {
        return suffix ? `•••••• ${suffix}` : '••••••';
      }
      const num = typeof amount === 'string' ? parseFloat(amount) : amount;
      if (isNaN(num)) return String(amount);
      const formatted = num.toLocaleString(undefined, {
        minimumFractionDigits: minFraction,
        maximumFractionDigits: minFraction,
      });
      return suffix ? `${formatted} ${suffix}` : formatted;
    },
    [showAmounts]
  );

  const formatCompactAmount = React.useCallback(
    (amount: number | undefined | null, suffix: string = 'ETB'): string => {
      if (amount === undefined || amount === null) return '—';
      if (!showAmounts) {
        return suffix ? `•••••• ${suffix}` : '••••••';
      }
      return `${(amount / 1e6).toFixed(2)}M ${suffix}`.trim();
    },
    [showAmounts]
  );

  return {
    showAmounts,
    toggleVisibility,
    formatAmount,
    formatCompactAmount,
  };
}
