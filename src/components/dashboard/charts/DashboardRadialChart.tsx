'use client';

import * as React from 'react';
import {
  ResponsiveContainer,
  RadialBarChart,
  RadialBar,
  PolarAngleAxis,
  Tooltip,
} from 'recharts';
import { CustomChartTooltip } from './CustomChartTooltip';

export interface RadialDataItem {
  name: string;
  value: number;
  max?: number;
  fill: string;
  unit?: string;
  sublabel?: string;
}

export interface DashboardRadialChartProps {
  data: RadialDataItem[];
  height?: number | string;
  innerRadius?: string | number;
  outerRadius?: string | number;
  startAngle?: number;
  endAngle?: number;
  centerLabel?: string;
  centerValue?: string | number;
  centerSubtext?: string;
  showLegend?: boolean;
  valueFormatter?: (value: number, name?: string) => string;
  emptyMessage?: string;
}

export function DashboardRadialChart({
  data,
  height = 280,
  innerRadius = '30%',
  outerRadius = '100%',
  startAngle = 90,
  endAngle = -270,
  centerLabel,
  centerValue,
  centerSubtext,
  showLegend = true,
  valueFormatter,
  emptyMessage = 'No radial data available',
}: DashboardRadialChartProps) {
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div
        style={{ height }}
        className="w-full flex items-center justify-center bg-muted/10 rounded-lg animate-pulse"
      >
        <span className="text-xs text-muted-foreground">Loading chart...</span>
      </div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <div
        style={{ height }}
        className="w-full flex items-center justify-center border border-dashed border-border/60 rounded-xl bg-muted/5"
      >
        <span className="text-xs text-muted-foreground">{emptyMessage}</span>
      </div>
    );
  }

  // Normalize data for RadialBar
  const maxDomain = Math.max(...data.map((d) => d.max || 100), 100);
  const normalizedData = data.map((d) => ({
    ...d,
    val: d.value,
  }));

  return (
    <div className="w-full flex flex-col items-center justify-center" style={{ minHeight: height }}>
      <div className="relative w-full flex items-center justify-center" style={{ height: typeof height === 'number' ? height - (showLegend ? 50 : 0) : height }}>
        <ResponsiveContainer width="100%" height="100%">
          <RadialBarChart
            cx="50%"
            cy="50%"
            innerRadius={innerRadius}
            outerRadius={outerRadius}
            barSize={12}
            data={normalizedData}
            startAngle={startAngle}
            endAngle={endAngle}
          >
            <PolarAngleAxis
              type="number"
              domain={[0, maxDomain]}
              angleAxisId={0}
              tick={false}
            />
            <Tooltip
              content={
                <CustomChartTooltip
                  valueFormatter={(val, name) => {
                    const item = data.find((d) => d.name === name);
                    if (valueFormatter) return valueFormatter(val, name);
                    if (item?.unit) return `${val.toLocaleString()} ${item.unit}`;
                    return `${val}%`;
                  }}
                />
              }
            />
            <RadialBar
              background={{ fill: 'var(--muted, #f1f5f9)', opacity: 0.25 }}
              dataKey="val"
              cornerRadius={6}
            />
          </RadialBarChart>
        </ResponsiveContainer>

        {(centerValue !== undefined || centerLabel) && (
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-center">
            {centerValue !== undefined && (
              <span className="text-xl sm:text-2xl font-bold font-mono tracking-tight text-foreground">
                {centerValue}
              </span>
            )}
            {centerLabel && (
              <span className="text-[10px] sm:text-xs font-medium text-muted-foreground uppercase tracking-wider mt-0.5">
                {centerLabel}
              </span>
            )}
            {centerSubtext && (
              <span className="text-[9px] text-muted-foreground/80 mt-0.5">
                {centerSubtext}
              </span>
            )}
          </div>
        )}
      </div>

      {showLegend && (
        <div className="w-full grid grid-cols-2 gap-2 pt-2 border-t border-border/40 text-xs">
          {data.map((item, idx) => (
            <div key={`legend-${idx}`} className="flex items-center justify-between gap-1.5 px-2 py-1 rounded-md bg-muted/20">
              <div className="flex items-center gap-1.5 min-w-0">
                <span
                  className="h-2.5 w-2.5 rounded-full shrink-0 shadow-xs"
                  style={{ backgroundColor: item.fill }}
                />
                <span className="text-muted-foreground truncate text-[11px]">
                  {item.name}
                </span>
              </div>
              <span className="font-mono font-semibold text-foreground text-[11px] shrink-0">
                {item.value}
                {item.unit ? ` ${item.unit}` : '%'}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
