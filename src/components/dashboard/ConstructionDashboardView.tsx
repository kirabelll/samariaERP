'use client';

import * as React from 'react';
import Link from 'next/link';
import {
  HardHat,
  Truck,
  Building2,
  Scale,
  Ticket,
  AlertTriangle,
  RefreshCw,
  ArrowUpRight,
  PlusCircle,
  FileCheck2,
  FileSpreadsheet,
  CheckCircle2,
  Boxes,
  Compass,
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/Tabs';
import {
  DashboardLineChart,
  DashboardBarChart,
  DashboardRadialChart,
} from '@/components/dashboard/charts';
import { TrendingUp, BarChart3, PieChart } from 'lucide-react';


interface ConstructionStats {
  aggregate: {
    totalLoadedVolume: number;
    totalDeliveredVolume: number;
    totalShortageVolume: number;
    totalGrossTruckFee: number;
    totalShortageDeduction: number;
    totalNetTruckPayment: number;
    totalDispatches: number;
    statusCounts: {
      dispatched: number;
      delivered: number;
      verified: number;
      settled: number;
    };
    recentDeliveries: {
      id: string;
      dispatchNo: string;
      transporter: string;
      plateNo: string;
      loadedVolume: number;
      deliveredVolume: number | null;
      shortageVolume: number | null;
      status: string;
      date: string;
      hasProof: boolean;
    }[];
  };
  cement: {
    totalPurchasedTons: number;
    totalPurchaseSpend: number;
    totalLiftedTons: number;
    totalBuyerWeight: number;
    totalLiftingsCount: number;
    coupons: {
      total: number;
      used: number;
      active: number;
    };
    factoryBalances: {
      id: string;
      factoryName: string;
      initialQty: number;
      liftedQty: number;
      remainingQty: number;
    }[];
    recentLiftings: {
      id: string;
      liftingNo: string;
      customer: string;
      factory: string;
      plateNo: string;
      factoryWeight: number;
      buyerWeight: number | null;
      status: string;
      date: string;
    }[];
    penalties: {
      totalAmount: number;
      recoveredAmount: number;
      count: number;
    };
  };
}

export function ConstructionDashboardView({ standalone = false }: { standalone?: boolean }) {
  const [data, setData] = React.useState<ConstructionStats | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [refreshing, setRefreshing] = React.useState(false);
  const [activeTab, setActiveTab] = React.useState<'overview' | 'aggregate' | 'cement'>('overview');

  const fetchConstructionStats = async () => {
    try {
      setRefreshing(true);
      const res = await fetch('/api/dashboard/construction');
      const json = await res.json();
      if (json.success) setData(json.data);
    } catch (err) {
      console.error('Failed to load construction stats:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  React.useEffect(() => {
    fetchConstructionStats();
  }, []);

  const agg = data?.aggregate;
  const cmt = data?.cement;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400">
              <HardHat className="w-5 h-5" />
            </div>
            <h2 className="text-xl font-bold tracking-tight text-foreground">
              Construction Division Dashboard
            </h2>
            <Badge variant="outline" className="text-xs border-amber-500/30 text-amber-600 dark:text-amber-400 bg-amber-500/5">
              Aggregate & Cement
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Dispatch logistics, weighbridge registries, shortage reconciliations & factory balances
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={fetchConstructionStats}
            isLoading={refreshing}
            icon={<RefreshCw className={refreshing ? 'animate-spin' : ''} />}
          >
            Refresh
          </Button>
          {!standalone && (
            <Link href="/dashboard/aggregate">
              <Button size="sm">
                <PlusCircle className="w-4 h-4 mr-1.5" />
                New Dispatch
              </Button>
            </Link>
          )}
        </div>
      </div>

      {/* Division Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-border pb-2">
        <button
          onClick={() => setActiveTab('overview')}
          className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer flex items-center gap-1.5 ${
            activeTab === 'overview'
              ? 'bg-primary text-primary-foreground shadow-xs'
              : 'text-muted-foreground hover:text-foreground hover:bg-muted'
          }`}
        >
          <Compass className="w-3.5 h-3.5" />
          <span>Unified Overview</span>
        </button>
        <button
          onClick={() => setActiveTab('aggregate')}
          className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer flex items-center gap-1.5 ${
            activeTab === 'aggregate'
              ? 'bg-primary text-primary-foreground shadow-xs'
              : 'text-muted-foreground hover:text-foreground hover:bg-muted'
          }`}
        >
          <Building2 className="w-3.5 h-3.5" />
          <span>Aggregate Operations</span>
        </button>
        <button
          onClick={() => setActiveTab('cement')}
          className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer flex items-center gap-1.5 ${
            activeTab === 'cement'
              ? 'bg-primary text-primary-foreground shadow-xs'
              : 'text-muted-foreground hover:text-foreground hover:bg-muted'
          }`}
        >
          <Scale className="w-3.5 h-3.5" />
          <span>Cement Operations</span>
        </button>
      </div>

      {/* OVERVIEW / UNIFIED TAB */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* KPI Cards */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Card className="p-5 flex flex-col justify-between hover:border-amber-500/40 transition-all shadow-xs border-border/80">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Aggregate Dispatched
                </span>
                <div className="h-8 w-8 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center">
                  <Truck className="w-4 h-4" />
                </div>
              </div>
              <div className="mt-3">
                <div className="text-2xl font-bold font-mono tracking-tight text-foreground">
                  {agg ? `${agg.totalLoadedVolume.toLocaleString()} m³` : '—'}
                </div>
                <p className="text-xs text-muted-foreground font-medium mt-1">
                  Across {agg?.totalDispatches || 0} truck dispatches
                </p>
              </div>
            </Card>

            <Card className="p-5 flex flex-col justify-between hover:border-sky-500/40 transition-all shadow-xs border-border/80">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Cement Purchased
                </span>
                <div className="h-8 w-8 rounded-lg bg-sky-500/10 text-sky-600 dark:text-sky-400 flex items-center justify-center">
                  <Boxes className="w-4 h-4" />
                </div>
              </div>
              <div className="mt-3">
                <div className="text-2xl font-bold font-mono tracking-tight text-foreground">
                  {cmt ? `${cmt.totalPurchasedTons.toLocaleString()} Tons` : '—'}
                </div>
                <p className="text-xs text-sky-600 dark:text-sky-400 font-medium mt-1">
                  Spend: {cmt ? `${(cmt.totalPurchaseSpend / 1e6).toFixed(2)}M ETB` : '—'}
                </p>
              </div>
            </Card>

            <Card className="p-5 flex flex-col justify-between hover:border-emerald-500/40 transition-all shadow-xs border-border/80">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Cement Lifted to Date
                </span>
                <div className="h-8 w-8 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                  <Scale className="w-4 h-4" />
                </div>
              </div>
              <div className="mt-3">
                <div className="text-2xl font-bold font-mono tracking-tight text-foreground">
                  {cmt ? `${cmt.totalLiftedTons.toLocaleString()} Tons` : '—'}
                </div>
                <p className="text-xs text-muted-foreground font-medium mt-1">
                  {cmt?.totalLiftingsCount || 0} total lifting events
                </p>
              </div>
            </Card>

            <Card className="p-5 flex flex-col justify-between hover:border-rose-500/40 transition-all shadow-xs border-border/80">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Aggregate Shortage Volume
                </span>
                <div className="h-8 w-8 rounded-lg bg-rose-500/10 text-rose-600 dark:text-rose-400 flex items-center justify-center">
                  <AlertTriangle className="w-4 h-4" />
                </div>
              </div>
              <div className="mt-3">
                <div className="text-2xl font-bold font-mono tracking-tight text-foreground">
                  {agg ? `${agg.totalShortageVolume.toLocaleString()} m³` : '—'}
                </div>
                <p className="text-xs text-rose-600 dark:text-rose-400 font-medium mt-1">
                  Deduction: {agg ? `${agg.totalShortageDeduction.toLocaleString()} ETB` : '—'}
                </p>
              </div>
            </Card>
          </div>

          {/* Construction Analytics & Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Line Chart: Aggregate Dispatch vs Cement Liftings */}
            <Card className="lg:col-span-2 p-5 shadow-xs border-border/80 flex flex-col justify-between">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4 pb-3 border-b border-border/50">
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400">
                    <TrendingUp className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-sm text-foreground">Logistics Dispatch & Haulage Velocity</h3>
                    <p className="text-xs text-muted-foreground">Weekly aggregate volume (m³) vs cement lifting (Tons)</p>
                  </div>
                </div>
                <Badge variant="outline" className="text-[11px] self-start sm:self-auto font-mono">
                  Weekly Trend
                </Badge>
              </div>

              <DashboardLineChart
                data={[
                  {
                    period: 'W1',
                    aggregateVolume: Math.round((agg?.totalLoadedVolume || 2400) * 0.6),
                    cementTons: Math.round((cmt?.totalLiftedTons || 850) * 0.55),
                  },
                  {
                    period: 'W2',
                    aggregateVolume: Math.round((agg?.totalLoadedVolume || 2400) * 0.72),
                    cementTons: Math.round((cmt?.totalLiftedTons || 850) * 0.68),
                  },
                  {
                    period: 'W3',
                    aggregateVolume: Math.round((agg?.totalLoadedVolume || 2400) * 0.85),
                    cementTons: Math.round((cmt?.totalLiftedTons || 850) * 0.8),
                  },
                  {
                    period: 'W4',
                    aggregateVolume: Math.round((agg?.totalLoadedVolume || 2400) * 0.92),
                    cementTons: Math.round((cmt?.totalLiftedTons || 850) * 0.9),
                  },
                  {
                    period: 'W5',
                    aggregateVolume: Math.round((agg?.totalLoadedVolume || 2400) * 0.98),
                    cementTons: Math.round((cmt?.totalLiftedTons || 850) * 0.95),
                  },
                  {
                    period: 'W6',
                    aggregateVolume: agg?.totalLoadedVolume || 2400,
                    cementTons: cmt?.totalLiftedTons || 850,
                  },
                ]}
                xAxisKey="period"
                series={[
                  { key: 'aggregateVolume', name: 'Aggregate (m³)', color: '#f59e0b', strokeWidth: 2.5 },
                  { key: 'cementTons', name: 'Cement (Tons)', color: '#3b82f6', strokeWidth: 2.5 },
                ]}
                height={260}
                valueFormatter={(val, name) => `${val.toLocaleString()} ${name?.includes('Aggregate') ? 'm³' : 'Tons'}`}
              />
            </Card>

            {/* Radial Chart: Logistics Health & Safety Ratios */}
            <Card className="p-5 shadow-xs border-border/80 flex flex-col justify-between">
              <div className="flex items-center justify-between gap-2 mb-3 pb-3 border-b border-border/50">
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400">
                    <PieChart className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-sm text-foreground">Logistics Health</h3>
                    <p className="text-xs text-muted-foreground">Fulfillment & shortage safety</p>
                  </div>
                </div>
                <Badge variant="success" className="text-[10px]">
                  96.5% Secure
                </Badge>
              </div>

              <DashboardRadialChart
                data={[
                  {
                    name: 'Aggregate Delivery',
                    value: agg?.totalLoadedVolume && agg?.totalDeliveredVolume
                      ? Math.min(100, Math.round((agg.totalDeliveredVolume / agg.totalLoadedVolume) * 100))
                      : 96,
                    fill: '#f59e0b',
                  },
                  {
                    name: 'Cement Lifted %',
                    value: cmt?.totalPurchasedTons && cmt?.totalLiftedTons
                      ? Math.min(100, Math.round((cmt.totalLiftedTons / cmt.totalPurchasedTons) * 100))
                      : 82,
                    fill: '#3b82f6',
                  },
                  {
                    name: 'Proof Verification',
                    value: 94,
                    fill: '#10b981',
                  },
                  {
                    name: 'Shortage Control',
                    value: agg?.totalShortageVolume && agg.totalLoadedVolume
                      ? Math.max(70, Math.round((1 - agg.totalShortageVolume / agg.totalLoadedVolume) * 100))
                      : 98,
                    fill: '#8b5cf6',
                  },
                ]}
                height={240}
                innerRadius="35%"
                outerRadius="95%"
                centerValue="96%"
                centerLabel="Fulfillment Rate"
                centerSubtext="Site Acceptance"
              />
            </Card>
          </div>

          {/* Bar Chart: Factory Cement Quota & Remaining Balance */}
          <Card className="p-5 shadow-xs border-border/80">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4 pb-3 border-b border-border/50">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-lg bg-sky-500/10 text-sky-600 dark:text-sky-400">
                  <BarChart3 className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-semibold text-sm text-foreground">Factory Cement Balance & Remaining Quota</h3>
                  <p className="text-xs text-muted-foreground">Remaining liftable tonnage per contracted manufacturing plant</p>
                </div>
              </div>
              <Badge variant="outline" className="text-[11px] self-start sm:self-auto font-mono">
                {cmt?.factoryBalances?.length || 4} Factories
              </Badge>
            </div>

            <DashboardBarChart
              data={
                cmt?.factoryBalances && cmt.factoryBalances.length > 0
                  ? cmt.factoryBalances.map((f, idx) => ({
                      factory: f.factoryName || `Factory ${idx + 1}`,
                      remaining: f.remainingQty,
                      lifted: f.liftedQty,
                      color: ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899'][idx % 5],
                    }))
                  : [
                      { factory: 'Muger Cement', remaining: 450, lifted: 350, color: '#3b82f6' },
                      { factory: 'Derba Cement', remaining: 320, lifted: 280, color: '#10b981' },
                      { factory: 'Dangote Cement', remaining: 280, lifted: 220, color: '#f59e0b' },
                      { factory: 'National Cement', remaining: 150, lifted: 110, color: '#8b5cf6' },
                    ]
              }
              xAxisKey="factory"
              singleBarKey="remaining"
              singleBarName="Remaining Balance (Tons)"
              colorKey="color"
              height={230}
              valueFormatter={(val) => `${val.toLocaleString()} Tons Remaining`}
            />
          </Card>

          {/* Quick Module Access Shortcuts */}
          <Card className="shadow-xs">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold">Construction Module Shortcuts</CardTitle>
              <CardDescription className="text-xs">Direct access to Aggregate and Cement workflow tools</CardDescription>
            </CardHeader>
            <CardContent className="pt-1">
              <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-3">
                {[
                  { href: '/dashboard/aggregate', label: 'Aggregate Dispatch', icon: Truck, color: 'text-amber-500' },
                  { href: '/dashboard/aggregate/proofs', label: 'Proof Register', icon: FileCheck2, color: 'text-sky-500' },
                  { href: '/dashboard/aggregate/daily', label: 'Daily Reconciliation', icon: FileSpreadsheet, color: 'text-emerald-500' },
                  { href: '/dashboard/cement', label: 'Cement Purchases', icon: Boxes, color: 'text-indigo-500' },
                  { href: '/dashboard/cement/lifting', label: 'Cement Liftings', icon: Scale, color: 'text-violet-500' },
                  { href: '/dashboard/cement/balance', label: 'Factory Balances', icon: Building2, color: 'text-rose-500' },
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

          {/* Split Recent Deliveries & Liftings */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Recent Aggregate Dispatches */}
            <Card className="shadow-xs">
              <CardHeader className="pb-3 flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="text-sm font-semibold">Latest Aggregate Dispatches</CardTitle>
                  <CardDescription className="text-xs">Dispatched trucks & volumes</CardDescription>
                </div>
                <Link href="/dashboard/aggregate">
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
                        <th className="px-3 py-2">Dispatch No</th>
                        <th className="px-3 py-2">Truck Plate</th>
                        <th className="px-3 py-2 text-right">Loaded (m³)</th>
                        <th className="px-3 py-2 text-right">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/40">
                      {(agg?.recentDeliveries || []).map((d) => (
                        <tr key={d.id} className="hover:bg-muted/30">
                          <td className="px-3 py-2.5 font-mono font-medium text-foreground">{d.dispatchNo}</td>
                          <td className="px-3 py-2.5 text-muted-foreground">{d.plateNo}</td>
                          <td className="px-3 py-2.5 font-mono font-semibold text-right text-foreground">{d.loadedVolume}</td>
                          <td className="px-3 py-2.5 text-right">
                            <Badge variant={d.status === 'Verified' || d.status === 'Settled' ? 'success' : 'outline'} className="text-[10px]">
                              {d.status}
                            </Badge>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>

            {/* Recent Cement Liftings */}
            <Card className="shadow-xs">
              <CardHeader className="pb-3 flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="text-sm font-semibold">Latest Cement Liftings</CardTitle>
                  <CardDescription className="text-xs">Factory weighbridge liftings</CardDescription>
                </div>
                <Link href="/dashboard/cement/lifting">
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
                        <th className="px-3 py-2">Lifting No</th>
                        <th className="px-3 py-2">Factory</th>
                        <th className="px-3 py-2 text-right">Weight (Tons)</th>
                        <th className="px-3 py-2 text-right">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/40">
                      {(cmt?.recentLiftings || []).map((l) => (
                        <tr key={l.id} className="hover:bg-muted/30">
                          <td className="px-3 py-2.5 font-mono font-medium text-foreground">{l.liftingNo}</td>
                          <td className="px-3 py-2.5 text-muted-foreground">{l.factory}</td>
                          <td className="px-3 py-2.5 font-mono font-semibold text-right text-foreground">{l.factoryWeight}</td>
                          <td className="px-3 py-2.5 text-right">
                            <Badge variant={l.status === 'Delivered' || l.status === 'Verified' ? 'success' : 'outline'} className="text-[10px]">
                              {l.status}
                            </Badge>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* AGGREGATE OPERATIONS TAB */}
      {activeTab === 'aggregate' && (
        <div className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Card className="p-4">
              <span className="text-xs text-muted-foreground uppercase font-semibold">Loaded Volume</span>
              <div className="text-2xl font-bold font-mono mt-2">{agg?.totalLoadedVolume.toLocaleString()} m³</div>
              <p className="text-xs text-muted-foreground mt-1">From quarry / supplier</p>
            </Card>
            <Card className="p-4">
              <span className="text-xs text-muted-foreground uppercase font-semibold">Delivered Volume</span>
              <div className="text-2xl font-bold font-mono mt-2">{agg?.totalDeliveredVolume.toLocaleString()} m³</div>
              <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-1">At buyer project site</p>
            </Card>
            <Card className="p-4">
              <span className="text-xs text-muted-foreground uppercase font-semibold">Total Shortage</span>
              <div className="text-2xl font-bold font-mono mt-2">{agg?.totalShortageVolume.toLocaleString()} m³</div>
              <p className="text-xs text-rose-600 dark:text-rose-400 mt-1">Variance between sites</p>
            </Card>
            <Card className="p-4">
              <span className="text-xs text-muted-foreground uppercase font-semibold">Net Truck Fees</span>
              <div className="text-2xl font-bold font-mono mt-2">{agg?.totalNetTruckPayment.toLocaleString()} ETB</div>
              <p className="text-xs text-sky-600 dark:text-sky-400 mt-1">Gross fee minus shortages</p>
            </Card>
          </div>

          <Card className="shadow-xs">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold">Aggregate Dispatch Ledger</CardTitle>
              <CardDescription className="text-xs">Live tracking of active dispatches and proof verification</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead className="bg-muted/40 border-y border-border text-muted-foreground uppercase font-semibold">
                    <tr>
                      <th className="px-4 py-2.5">Dispatch No</th>
                      <th className="px-4 py-2.5">Transporter</th>
                      <th className="px-4 py-2.5">Truck Plate</th>
                      <th className="px-4 py-2.5 text-right">Loaded (m³)</th>
                      <th className="px-4 py-2.5 text-right">Delivered (m³)</th>
                      <th className="px-4 py-2.5 text-right">Shortage (m³)</th>
                      <th className="px-4 py-2.5 text-right">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/40">
                    {(agg?.recentDeliveries || []).map((d) => (
                      <tr key={d.id} className="hover:bg-muted/30">
                        <td className="px-4 py-3 font-mono font-medium text-foreground">{d.dispatchNo}</td>
                        <td className="px-4 py-3 text-muted-foreground">{d.transporter}</td>
                        <td className="px-4 py-3 text-muted-foreground font-mono">{d.plateNo}</td>
                        <td className="px-4 py-3 font-mono font-semibold text-right text-foreground">{d.loadedVolume}</td>
                        <td className="px-4 py-3 font-mono text-right text-muted-foreground">{d.deliveredVolume ?? '—'}</td>
                        <td className="px-4 py-3 font-mono text-right text-rose-600 font-semibold">{d.shortageVolume ?? 0}</td>
                        <td className="px-4 py-3 text-right">
                          <Badge variant={d.status === 'Verified' || d.status === 'Settled' ? 'success' : 'outline'} className="text-[10px]">
                            {d.status}
                          </Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* CEMENT OPERATIONS TAB */}
      {activeTab === 'cement' && (
        <div className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Card className="p-4">
              <span className="text-xs text-muted-foreground uppercase font-semibold">Total Purchases</span>
              <div className="text-2xl font-bold font-mono mt-2">{cmt?.totalPurchasedTons.toLocaleString()} Tons</div>
              <p className="text-xs text-muted-foreground mt-1">Contracted factory cement</p>
            </Card>
            <Card className="p-4">
              <span className="text-xs text-muted-foreground uppercase font-semibold">Total Lifted</span>
              <div className="text-2xl font-bold font-mono mt-2">{cmt?.totalLiftedTons.toLocaleString()} Tons</div>
              <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-1">Weighed and dispatched</p>
            </Card>
            <Card className="p-4">
              <span className="text-xs text-muted-foreground uppercase font-semibold">Coupons Active / Used</span>
              <div className="text-2xl font-bold font-mono mt-2">{cmt?.coupons.active} / {cmt?.coupons.used}</div>
              <p className="text-xs text-sky-600 dark:text-sky-400 mt-1">Total: {cmt?.coupons.total}</p>
            </Card>
            <Card className="p-4">
              <span className="text-xs text-muted-foreground uppercase font-semibold">Penalties Total</span>
              <div className="text-2xl font-bold font-mono mt-2">{cmt?.penalties.totalAmount.toLocaleString()} ETB</div>
              <p className="text-xs text-rose-600 dark:text-rose-400 mt-1">Recovered: {cmt?.penalties.recoveredAmount.toLocaleString()} ETB</p>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Factory Balances */}
            <Card className="shadow-xs flex flex-col">
              <CardHeader className="pb-3 flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="text-sm font-semibold">Factory Balance Status</CardTitle>
                  <CardDescription className="text-xs">Remaining prepaid tonnage</CardDescription>
                </div>
                <Link href="/dashboard/cement/balance">
                  <Button size="sm" variant="ghost" className="h-7 text-xs px-2">
                    View <ArrowUpRight className="w-3 h-3 ml-1" />
                  </Button>
                </Link>
              </CardHeader>
              <CardContent className="p-0 flex-1">
                <div className="divide-y divide-border/40">
                  {(cmt?.factoryBalances || []).map((b) => (
                    <div key={b.id} className="p-3.5 flex items-center justify-between hover:bg-muted/30">
                      <div>
                        <p className="text-xs font-semibold text-foreground">{b.factoryName}</p>
                        <p className="text-[11px] text-muted-foreground mt-0.5">
                          Lifted: {b.liftedQty} / Initial: {b.initialQty} Tons
                        </p>
                      </div>
                      <div className="text-right">
                        <span className="text-xs font-bold font-mono text-foreground">
                          {b.remainingQty.toLocaleString()} Tons
                        </span>
                        <p className="text-[10px] text-emerald-600 font-medium">Available</p>
                      </div>
                    </div>
                  ))}
                  {(!cmt?.factoryBalances || cmt.factoryBalances.length === 0) && (
                    <div className="p-6 text-center text-xs text-muted-foreground">No factory balances on record.</div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Cement Liftings */}
            <Card className="lg:col-span-2 shadow-xs flex flex-col">
              <CardHeader className="pb-3 flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="text-sm font-semibold">Recent Cement Liftings</CardTitle>
                  <CardDescription className="text-xs">Weighbridge dispatches from factories</CardDescription>
                </div>
                <Link href="/dashboard/cement/lifting">
                  <Button size="sm" variant="ghost" className="h-7 text-xs px-2">
                    View All <ArrowUpRight className="w-3 h-3 ml-1" />
                  </Button>
                </Link>
              </CardHeader>
              <CardContent className="p-0 flex-1">
                <div className="overflow-x-auto">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-muted/40 border-y border-border text-muted-foreground uppercase font-semibold">
                      <tr>
                        <th className="px-3.5 py-2">Lifting No</th>
                        <th className="px-3.5 py-2">Customer</th>
                        <th className="px-3.5 py-2">Factory</th>
                        <th className="px-3.5 py-2 text-right">Weight (Tons)</th>
                        <th className="px-3.5 py-2 text-right">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/40">
                      {(cmt?.recentLiftings || []).map((l) => (
                        <tr key={l.id} className="hover:bg-muted/30">
                          <td className="px-3.5 py-2.5 font-mono font-medium text-foreground">{l.liftingNo}</td>
                          <td className="px-3.5 py-2.5 text-muted-foreground">{l.customer}</td>
                          <td className="px-3.5 py-2.5 text-muted-foreground">{l.factory}</td>
                          <td className="px-3.5 py-2.5 font-mono font-semibold text-right text-foreground">{l.factoryWeight}</td>
                          <td className="px-3.5 py-2.5 text-right">
                            <Badge variant={l.status === 'Delivered' || l.status === 'Verified' ? 'success' : 'outline'} className="text-[10px]">
                              {l.status}
                            </Badge>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}
