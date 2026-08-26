'use client';

import * as React from 'react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts';
import { CustomChartTooltip } from './CustomChartTooltip';

export interface LineSeriesConfig {
  key: string;
  name: string;
  color: string;
  strokeWidth?: number;
  strokeDasharray?: string;
  showArea?: boolean;
}

export interface DashboardLineChartProps {
  data: any[];
  xAxisKey: string;
  series: LineSeriesConfig[];
  height?: number | string;
  valueFormatter?: (value: number, name?: string) => string;
  xAxisFormatter?: (value: string) => string;
  yAxisFormatter?: (value: number) => string;
  showGrid?: boolean;
  showLegend?: boolean;
  emptyMessage?: string;
}

export function DashboardLineChart({
  data,
  xAxisKey,
  series,
  height = 280,
  valueFormatter,
  xAxisFormatter,
  yAxisFormatter,
  showGrid = true,
  showLegend = true,
  emptyMessage = 'No trend data available',
}: DashboardLineChartProps) {
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

  // Generate unique gradient IDs for any series with showArea
  const gradientPrefix = `line-grad-${Math.random().toString(36).substr(2, 9)}`;

  return (
    <div className="w-full" style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart
          data={data}
          margin={{ top: 10, right: 15, left: -10, bottom: 5 }}
        >
          <defs>
            {series.map((s, idx) => (
              <linearGradient
                key={`grad-${s.key}-${idx}`}
                id={`${gradientPrefix}-${s.key}`}
                x1="0"
                y1="0"
                x2="0"
                y2="1"
              >
                <stop offset="5%" stopColor={s.color} stopOpacity={0.25} />
                <stop offset="95%" stopColor={s.color} stopOpacity={0.0} />
              </linearGradient>
            ))}
          </defs>

          {showGrid && (
            <CartesianGrid
              strokeDasharray="3 3"
              className="stroke-border/40"
              vertical={false}
            />
          )}

          <XAxis
            dataKey={xAxisKey}
            tickFormatter={xAxisFormatter}
            tickLine={false}
            axisLine={false}
            tick={{ fontSize: 11, fill: 'var(--muted-foreground, #888)' }}
            dy={8}
          />

          <YAxis
            tickFormatter={yAxisFormatter || ((val) => (val >= 1000 ? `${(val / 1000).toFixed(0)}k` : val))}
            tickLine={false}
            axisLine={false}
            tick={{ fontSize: 11, fill: 'var(--muted-foreground, #888)' }}
            dx={-4}
          />

          <Tooltip
            content={
              <CustomChartTooltip
                valueFormatter={valueFormatter}
                labelFormatter={xAxisFormatter}
              />
            }
          />

          {showLegend && (
            <Legend
              verticalAlign="top"
              align="right"
              iconType="circle"
              wrapperStyle={{ paddingBottom: '12px', fontSize: '11px' }}
            />
          )}

          {series.map((s) => (
            <Line
              key={s.key}
              type="monotone"
              dataKey={s.key}
              name={s.name}
              stroke={s.color}
              strokeWidth={s.strokeWidth ?? 2.5}
              strokeDasharray={s.strokeDasharray}
              dot={{ r: 3, fill: s.color, strokeWidth: 0 }}
              activeDot={{ r: 6, fill: s.color, stroke: 'var(--background, #fff)', strokeWidth: 2 }}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
