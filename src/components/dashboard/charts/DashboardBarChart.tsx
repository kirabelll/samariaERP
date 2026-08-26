'use client';

import * as React from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  Cell,
} from 'recharts';
import { CustomChartTooltip } from './CustomChartTooltip';

export interface BarSeriesConfig {
  key: string;
  name: string;
  color?: string;
  stackId?: string;
  radius?: [number, number, number, number];
}

export interface DashboardBarChartProps {
  data: any[];
  xAxisKey: string;
  series?: BarSeriesConfig[];
  // If single series with custom color per bar
  singleBarKey?: string;
  singleBarName?: string;
  colorKey?: string;
  defaultBarColor?: string;
  colors?: string[];
  layout?: 'horizontal' | 'vertical';
  height?: number | string;
  valueFormatter?: (value: number, name?: string) => string;
  xAxisFormatter?: (value: string) => string;
  yAxisFormatter?: (value: number) => string;
  showGrid?: boolean;
  showLegend?: boolean;
  emptyMessage?: string;
}

export function DashboardBarChart({
  data,
  xAxisKey,
  series,
  singleBarKey,
  singleBarName,
  colorKey,
  defaultBarColor = '#3b82f6',
  colors = ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4'],
  layout = 'horizontal',
  height = 280,
  valueFormatter,
  xAxisFormatter,
  yAxisFormatter,
  showGrid = true,
  showLegend = false,
  emptyMessage = 'No comparison data available',
}: DashboardBarChartProps) {
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

  const isVertical = layout === 'vertical';

  return (
    <div className="w-full" style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={data}
          layout={layout}
          margin={
            isVertical
              ? { top: 5, right: 20, left: 40, bottom: 5 }
              : { top: 10, right: 15, left: -10, bottom: 5 }
          }
        >
          {showGrid && (
            <CartesianGrid
              strokeDasharray="3 3"
              className="stroke-border/40"
              vertical={isVertical}
              horizontal={!isVertical}
            />
          )}

          {isVertical ? (
            <>
              <XAxis
                type="number"
                tickFormatter={yAxisFormatter}
                tickLine={false}
                axisLine={false}
                tick={{ fontSize: 11, fill: 'var(--muted-foreground, #888)' }}
              />
              <YAxis
                type="category"
                dataKey={xAxisKey}
                tickFormatter={xAxisFormatter}
                tickLine={false}
                axisLine={false}
                tick={{ fontSize: 11, fill: 'var(--muted-foreground, #888)' }}
                width={80}
              />
            </>
          ) : (
            <>
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
            </>
          )}

          <Tooltip
            content={
              <CustomChartTooltip
                valueFormatter={valueFormatter}
                labelFormatter={xAxisFormatter}
              />
            }
          />

          {showLegend && series && series.length > 1 && (
            <Legend
              verticalAlign="top"
              align="right"
              iconType="circle"
              wrapperStyle={{ paddingBottom: '12px', fontSize: '11px' }}
            />
          )}

          {series && series.length > 0 ? (
            series.map((s, idx) => (
              <Bar
                key={s.key}
                dataKey={s.key}
                name={s.name}
                fill={s.color || colors[idx % colors.length]}
                stackId={s.stackId}
                radius={s.radius || (isVertical ? [0, 6, 6, 0] : [6, 6, 0, 0])}
                maxBarSize={45}
              />
            ))
          ) : (
            <Bar
              dataKey={singleBarKey || 'value'}
              name={singleBarName || 'Value'}
              fill={defaultBarColor}
              radius={isVertical ? [0, 6, 6, 0] : [6, 6, 0, 0]}
              maxBarSize={45}
            >
              {data.map((entry, index) => {
                const barColor =
                  (colorKey && entry[colorKey]) ||
                  entry.color ||
                  colors[index % colors.length] ||
                  defaultBarColor;
                return <Cell key={`cell-${index}`} fill={barColor} />;
              })}
            </Bar>
          )}
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
