'use client';

import * as React from 'react';

export interface CustomChartTooltipProps {
  active?: boolean;
  payload?: any[];
  label?: string;
  valueFormatter?: (value: number, name?: string) => string;
  labelFormatter?: (label: string) => string;
}

export function CustomChartTooltip({
  active,
  payload,
  label,
  valueFormatter,
  labelFormatter,
}: CustomChartTooltipProps) {
  if (!active || !payload || !payload.length) {
    return null;
  }

  const formattedLabel = labelFormatter ? labelFormatter(label || '') : label;

  return (
    <div className="rounded-xl border border-border/80 bg-card/95 px-3.5 py-2.5 shadow-xl backdrop-blur-md text-card-foreground min-w-[140px] animate-in fade-in zoom-in-95 duration-150 z-50">
      {formattedLabel && (
        <div className="mb-2 font-semibold text-xs text-foreground/90 border-b border-border/50 pb-1 flex items-center justify-between gap-2">
          <span>{formattedLabel}</span>
        </div>
      )}
      <div className="space-y-1.5">
        {payload.map((item: any, index: number) => {
          const color = item.color || item.fill || item.stroke || '#3b82f6';
          const name = item.name || item.dataKey || 'Value';
          const value = typeof item.value === 'number'
            ? valueFormatter
              ? valueFormatter(item.value, name)
              : item.value.toLocaleString()
            : item.value;

          return (
            <div key={`tooltip-item-${index}`} className="flex items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-1.5 min-w-0">
                <span
                  className="h-2 w-2 rounded-full shrink-0 shadow-xs"
                  style={{ backgroundColor: color }}
                />
                <span className="text-muted-foreground truncate max-w-[130px]">
                  {name}
                </span>
              </div>
              <span className="font-mono font-semibold text-foreground text-right shrink-0">
                {value}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
