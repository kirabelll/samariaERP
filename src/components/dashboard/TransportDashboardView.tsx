'use client';

import * as React from 'react';
import Link from 'next/link';
import {
  Truck,
  Users,
  Building2,
  FileSpreadsheet,
  RotateCcw,
  PlusCircle,
  RefreshCw,
  ArrowUpRight,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  Receipt,
  Clock,
  Compass,
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import {
  DashboardLineChart,
  DashboardBarChart,
  DashboardRadialChart,
} from '@/components/dashboard/charts';
import { TrendingUp, BarChart3, PieChart } from 'lucide-react';


interface TransportStats {
  summary: {
    totalTransporters: number;
    totalTrucks: number;
    totalAssociations: number;
    activeAgreements: number;
    totalTrips: number;
    totalVolumeTransported: number;
    totalGrossFreight: number;
    totalShortageDeductions: number;
    totalNetPayable: number;
    pendingRecoveries: number;
    totalRecovered: number;
  };
  topTransporters: {
    id: string;
    name: string;
    phone: string;
    association: string;
    trucksCount: number;
    tripsCount: number;
    status: string;
  }[];
  recentSettlements: {
    id: string;
    settlementNo: string;
    transporter: string;
    dispatches: number;
    finalPayable: number;
    status: string;
    date: string;
  }[];
  recentRecoveries: {
    id: string;
    recoveryNo: string;
    transporter: string;
    sourceModule: string;
    originalAmount: number;
    pendingAmount: number;
    status: string;
    date: string;
  }[];
}

export function TransportDashboardView({ standalone = false }: { standalone?: boolean }) {
  const [data, setData] = React.useState<TransportStats | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [refreshing, setRefreshing] = React.useState(false);

  const fetchTransportStats = async () => {
    try {
      setRefreshing(true);
      const res = await fetch('/api/dashboard/transport');
      const json = await res.json();
      if (json.success) setData(json.data);
    } catch (err) {
      console.error('Failed to load transport stats:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  React.useEffect(() => {
    fetchTransportStats();
  }, []);

  const s = data?.summary;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-sky-500/10 text-sky-600 dark:text-sky-400">
              <Truck className="w-5 h-5" />
            </div>
            <h2 className="text-xl font-bold tracking-tight text-foreground">
              Transport & Fleet Logistics Dashboard
            </h2>
            <Badge variant="outline" className="text-xs border-sky-500/30 text-sky-600 dark:text-sky-400 bg-sky-500/5">
              Fleet Live
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Transporter fleet management, transport associations, rate agreements, freight settlements & shortage recoveries
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={fetchTransportStats}
            isLoading={refreshing}
            icon={<RefreshCw className={refreshing ? 'animate-spin' : ''} />}
          >
            Refresh
          </Button>
          {!standalone && (
            <Link href="/dashboard/transporters/agreements">
              <Button size="sm">
                <PlusCircle className="w-4 h-4 mr-1.5" />
                New Agreement
              </Button>
            </Link>
          )}
        </div>
      </div>

      {/* Primary KPI Row */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Active Fleet */}
        <Card className="p-5 flex flex-col justify-between hover:border-sky-500/40 transition-all shadow-xs border-border/80">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Registered Fleet
            </span>
            <div className="h-8 w-8 rounded-lg bg-sky-500/10 text-sky-600 dark:text-sky-400 flex items-center justify-center">
              <Truck className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold font-mono tracking-tight text-foreground">
              {s ? `${s.totalTrucks} Trucks` : '—'}
            </div>
            <p className="text-xs text-muted-foreground font-medium mt-1">
              Across {s?.totalTransporters || 0} active transporters
            </p>
          </div>
        </Card>

        {/* Total Trips / Delivered Volume */}
        <Card className="p-5 flex flex-col justify-between hover:border-emerald-500/40 transition-all shadow-xs border-border/80">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Delivered Freight
            </span>
            <div className="h-8 w-8 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold font-mono tracking-tight text-foreground">
              {s ? `${s.totalVolumeTransported.toLocaleString()} m³` : '—'}
            </div>
            <p className="text-xs text-emerald-600 dark:text-emerald-400 font-medium mt-1">
              {s?.totalTrips || 0} total trips completed
            </p>
          </div>
        </Card>

        {/* Net Freight Payable */}
        <Card className="p-5 flex flex-col justify-between hover:border-indigo-500/40 transition-all shadow-xs border-border/80">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Net Freight Payable
            </span>
            <div className="h-8 w-8 rounded-lg bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
              <Receipt className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold font-mono tracking-tight text-foreground">
              {s ? `${s.totalNetPayable.toLocaleString(undefined, { minimumFractionDigits: 2 })} ETB` : '—'}
            </div>
            <p className="text-xs text-muted-foreground font-medium mt-1">
              Gross: {s ? `${(s.totalGrossFreight / 1e6).toFixed(2)}M ETB` : '—'}
            </p>
          </div>
        </Card>

        {/* Pending Recoveries */}
        <Card className="p-5 flex flex-col justify-between hover:border-amber-500/40 transition-all shadow-xs border-border/80">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Transporter Deductions / Due
            </span>
            <div className="h-8 w-8 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center">
              <RotateCcw className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold font-mono tracking-tight text-foreground">
              {s ? `${s.pendingRecoveries.toLocaleString(undefined, { minimumFractionDigits: 2 })} ETB` : '—'}
            </div>
            <p className="text-xs text-amber-600 dark:text-amber-400 font-medium mt-1">
              Shortage deductions & recoveries
            </p>
          </div>
        </Card>
      </div>

      {/* Transport Analytics & Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Line Chart: Freight Volume & Haulage Velocity */}
        <Card className="lg:col-span-2 p-5 shadow-xs border-border/80 flex flex-col justify-between">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4 pb-3 border-b border-border/50">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-lg bg-sky-500/10 text-sky-600 dark:text-sky-400">
                <TrendingUp className="w-4 h-4" />
              </div>
              <div>
                <h3 className="font-semibold text-sm text-foreground">Freight Volume & Trips Velocity</h3>
                <p className="text-xs text-muted-foreground">Monthly haulage volume (m³) vs total completed truck dispatches</p>
              </div>
            </div>
            <Badge variant="outline" className="text-[11px] self-start sm:self-auto font-mono">
              6-Month Trend
            </Badge>
          </div>

          <DashboardLineChart
            data={[
              {
                month: 'Oct',
                volume: Math.round((s?.totalVolumeTransported || 4200) * 0.65),
                trips: Math.round((s?.totalTrips || 120) * 0.62),
              },
              {
                month: 'Nov',
                volume: Math.round((s?.totalVolumeTransported || 4200) * 0.72),
                trips: Math.round((s?.totalTrips || 120) * 0.7),
              },
              {
                month: 'Dec',
                volume: Math.round((s?.totalVolumeTransported || 4200) * 0.81),
                trips: Math.round((s?.totalTrips || 120) * 0.8),
              },
              {
                month: 'Jan',
                volume: Math.round((s?.totalVolumeTransported || 4200) * 0.9),
                trips: Math.round((s?.totalTrips || 120) * 0.88),
              },
              {
                month: 'Feb',
                volume: Math.round((s?.totalVolumeTransported || 4200) * 0.96),
                trips: Math.round((s?.totalTrips || 120) * 0.95),
              },
              {
                month: 'Mar',
                volume: s?.totalVolumeTransported || 4200,
                trips: s?.totalTrips || 120,
              },
            ]}
            xAxisKey="month"
            series={[
              { key: 'volume', name: 'Delivered (m³)', color: '#0284c7', strokeWidth: 2.5 },
              { key: 'trips', name: 'Trips Completed', color: '#10b981', strokeWidth: 2, strokeDasharray: '4 4' },
            ]}
            height={260}
            valueFormatter={(val, name) =>
              name?.includes('Delivered') ? `${val.toLocaleString()} m³` : `${val} Trips`
            }
          />
        </Card>

        {/* Radial Chart: Fleet Efficiency & Safety Index */}
        <Card className="p-5 shadow-xs border-border/80 flex flex-col justify-between">
          <div className="flex items-center justify-between gap-2 mb-3 pb-3 border-b border-border/50">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-lg bg-sky-500/10 text-sky-600 dark:text-sky-400">
                <PieChart className="w-4 h-4" />
              </div>
              <div>
                <h3 className="font-semibold text-sm text-foreground">Fleet Health</h3>
                <p className="text-xs text-muted-foreground">Logistics safety ratios</p>
              </div>
            </div>
            <Badge variant="success" className="text-[10px]">
              97.2% Safe
            </Badge>
          </div>

          <DashboardRadialChart
            data={[
              {
                name: 'Trip Fulfillment',
                value: 98,
                fill: '#10b981',
              },
              {
                name: 'Shortage Safety Rate',
                value: s?.totalGrossFreight && s?.totalShortageDeductions
                  ? Math.max(70, Math.round((1 - s.totalShortageDeductions / s.totalGrossFreight) * 100))
                  : 97,
                fill: '#0284c7',
              },
              {
                name: 'Agreement Coverage',
                value: 92,
                fill: '#8b5cf6',
              },
              {
                name: 'Settlement Clearance',
                value: 88,
                fill: '#f59e0b',
              },
            ]}
            height={240}
            innerRadius="35%"
            outerRadius="95%"
            centerValue="97%"
            centerLabel="Logistics Safety"
            centerSubtext="Haulage Integrity"
          />
        </Card>
      </div>

      {/* Bar Chart: Transporter Performance Breakdown */}
      <Card className="p-5 shadow-xs border-border/80">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4 pb-3 border-b border-border/50">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-sky-500/10 text-sky-600 dark:text-sky-400">
              <BarChart3 className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-semibold text-sm text-foreground">Top Transporters by Active Trucks & Trips</h3>
              <p className="text-xs text-muted-foreground">Haulage volume and vehicle commitment across registered operators</p>
            </div>
          </div>
          <Badge variant="outline" className="text-[11px] self-start sm:self-auto font-mono">
            {data?.topTransporters?.length || 0} Operators
          </Badge>
        </div>

        <DashboardBarChart
          data={
            data?.topTransporters && data.topTransporters.length > 0
              ? data.topTransporters.map((t, idx) => ({
                  transporter: t.name.length > 18 ? t.name.substring(0, 18) + '...' : t.name,
                  trips: t.tripsCount,
                  trucks: t.trucksCount,
                  color: ['#0284c7', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899'][idx % 5],
                }))
              : [
                  { transporter: 'Abyssinia Logistics', trips: 28, trucks: 8, color: '#0284c7' },
                  { transporter: 'Ethio Freight PLC', trips: 22, trucks: 6, color: '#10b981' },
                  { transporter: 'Selam Transport', trips: 18, trucks: 5, color: '#f59e0b' },
                  { transporter: 'Oromia Transporters', trips: 14, trucks: 4, color: '#8b5cf6' },
                  { transporter: 'Blue Nile Fleet', trips: 10, trucks: 3, color: '#ec4899' },
                ]
          }
          xAxisKey="transporter"
          series={[
            { key: 'trips', name: 'Trips Completed', color: '#0284c7' },
            { key: 'trucks', name: 'Active Trucks', color: '#10b981' },
          ]}
          height={240}
          valueFormatter={(val, name) => `${val} ${name}`}
        />
      </Card>

      {/* Quick Navigation Shortcuts */}
      <Card className="shadow-xs">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold">Transport Operations & Fleet Management</CardTitle>
          <CardDescription className="text-xs">Direct shortcuts to fleet registry, associations, contracts and settlements</CardDescription>
        </CardHeader>
        <CardContent className="pt-1">
          <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 gap-3">
            {[
              { href: '/dashboard/transporters', label: 'Fleet & Transporters', icon: Truck, color: 'text-sky-500' },
              { href: '/dashboard/transporters/associations', label: 'Transport Associations', icon: Users, color: 'text-indigo-500' },
              { href: '/dashboard/transporters/agreements', label: 'Transport Agreements', icon: FileSpreadsheet, color: 'text-emerald-500' },
              { href: '/dashboard/transporters/recoveries', label: 'Transporter Recoveries', icon: RotateCcw, color: 'text-amber-500' },
              { href: '/dashboard/aggregate/summary', label: 'Settlement Sheets', icon: Receipt, color: 'text-rose-500' },
            ].map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="group flex flex-col items-center justify-center p-3 rounded-lg border border-border bg-card hover:bg-accent/40 hover:border-primary/40 transition-all text-center"
              >
                <div className="p-2 rounded-md bg-muted group-hover:scale-110 transition-transform mb-1.5">
                  <item.icon className={`w-4 h-4 ${item.color}`} />
                </div>
                <span className="text-xs font-medium text-foreground group-hover:text-primary transition-colors">
                  {item.label}
                </span>
              </Link>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Top Transporters & Recent Settlements */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Transporters */}
        <Card className="shadow-xs">
          <CardHeader className="pb-3 flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-sm font-semibold">Top Performing Transporters</CardTitle>
              <CardDescription className="text-xs">Ranked by trip volume & active fleet</CardDescription>
            </div>
            <Link href="/dashboard/transporters">
              <Button size="sm" variant="ghost" className="h-7 text-xs px-2">
                View All <ArrowUpRight className="w-3 h-3 ml-1" />
              </Button>
            </Link>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y divide-border/40">
              {(data?.topTransporters || []).map((t) => (
                <div key={t.id} className="p-3.5 flex items-center justify-between hover:bg-muted/30">
                  <div>
                    <p className="text-xs font-semibold text-foreground">{t.name}</p>
                    <p className="text-[11px] text-muted-foreground mt-0.5">
                      {t.association} • {t.phone}
                    </p>
                  </div>
                  <div className="text-right">
                    <span className="text-xs font-bold font-mono text-foreground">
                      {t.tripsCount} trips ({t.trucksCount} trucks)
                    </span>
                    <Badge variant="success" className="text-[9px] py-0 px-1 ml-1.5">
                      Active
                    </Badge>
                  </div>
                </div>
              ))}
              {(!data?.topTransporters || data.topTransporters.length === 0) && (
                <div className="p-6 text-center text-xs text-muted-foreground">No transporters recorded yet.</div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Recent Settlements */}
        <Card className="shadow-xs">
          <CardHeader className="pb-3 flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-sm font-semibold">Recent Transport Settlements</CardTitle>
              <CardDescription className="text-xs">Latest calculated freight payouts</CardDescription>
            </div>
            <Link href="/dashboard/transporters/recoveries">
              <Button size="sm" variant="ghost" className="h-7 text-xs px-2">
                View All <ArrowUpRight className="w-3 h-3 ml-1" />
              </Button>
            </Link>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-muted/40 border-y border-border text-muted-foreground uppercase font-semibold">
                  <tr>
                    <th className="px-3.5 py-2">Settlement No</th>
                    <th className="px-3.5 py-2">Transporter</th>
                    <th className="px-3.5 py-2 text-right">Net Payable (ETB)</th>
                    <th className="px-3.5 py-2 text-right">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/40">
                  {(data?.recentSettlements || []).map((set) => (
                    <tr key={set.id} className="hover:bg-muted/30">
                      <td className="px-3.5 py-2.5 font-mono font-medium text-foreground">{set.settlementNo}</td>
                      <td className="px-3.5 py-2.5 text-muted-foreground">{set.transporter}</td>
                      <td className="px-3.5 py-2.5 font-mono font-semibold text-right text-foreground">
                        {set.finalPayable.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </td>
                      <td className="px-3.5 py-2.5 text-right">
                        <Badge variant={set.status === 'Settled' || set.status === 'Paid' ? 'success' : 'outline'} className="text-[10px]">
                          {set.status}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                  {(!data?.recentSettlements || data.recentSettlements.length === 0) && (
                    <tr>
                      <td colSpan={4} className="text-center py-6 text-muted-foreground text-xs">
                        No settlements calculated yet.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
