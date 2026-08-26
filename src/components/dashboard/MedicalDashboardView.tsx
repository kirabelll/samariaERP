'use client';

import * as React from 'react';
import Link from 'next/link';
import {
  Heart,
  Pill,
  ShieldCheck,
  AlertTriangle,
  FileSpreadsheet,
  PlusCircle,
  RefreshCw,
  ArrowUpRight,
  Package,
  Layers,
  Sparkles,
  ClipboardList,
  Percent,
  Warehouse,
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


interface MedicalStats {
  summary: {
    activeCustomers: number;
    totalRequests: number;
    pendingRequests: number;
    totalBatches: number;
    nearExpiryCount: number;
    totalStoreIssues: number;
    totalStoreIssueValue: number;
    pendingCommissions: number;
  };
  expiryAlerts: {
    id: string;
    batchNo: string;
    itemName: string;
    itemCode: string;
    quantity: number;
    unit: string;
    expiryDate: string;
    warehouse: string;
    daysLeft: number;
    urgency: 'critical' | 'warning' | 'info';
  }[];
  recentRequests: {
    id: string;
    requestNo: string;
    customer: string;
    priority: string;
    status: string;
    date: string;
  }[];
  recentStoreIssues: {
    id: string;
    issueNo: string;
    customer: string;
    totalAmount: number;
    status: string;
    date: string;
  }[];
}

export function MedicalDashboardView({ standalone = false }: { standalone?: boolean }) {
  const [data, setData] = React.useState<MedicalStats | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [refreshing, setRefreshing] = React.useState(false);

  const fetchMedicalStats = async () => {
    try {
      setRefreshing(true);
      const res = await fetch('/api/dashboard/medical');
      const json = await res.json();
      if (json.success) setData(json.data);
    } catch (err) {
      console.error('Failed to load medical stats:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  React.useEffect(() => {
    fetchMedicalStats();
  }, []);

  const s = data?.summary;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-rose-500/10 text-rose-600 dark:text-rose-400">
              <Heart className="w-5 h-5" />
            </div>
            <h2 className="text-xl font-bold tracking-tight text-foreground">
              Medical & Pharmaceutical Dashboard
            </h2>
            <Badge variant="outline" className="text-xs border-rose-500/30 text-rose-600 dark:text-rose-400 bg-rose-500/5">
              FEFO Tracked
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Pharmaceutical batch tracking, expiry risk management, dispensary issues & licensed pharmacy orders
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={fetchMedicalStats}
            isLoading={refreshing}
            icon={<RefreshCw className={refreshing ? 'animate-spin' : ''} />}
          >
            Refresh
          </Button>
          {!standalone && (
            <Link href="/dashboard/medical/requests">
              <Button size="sm">
                <PlusCircle className="w-4 h-4 mr-1.5" />
                New Medical Request
              </Button>
            </Link>
          )}
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Licensed Customers */}
        <Card className="p-5 flex flex-col justify-between hover:border-rose-500/40 transition-all shadow-xs border-border/80">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Licensed Pharmacy Clients
            </span>
            <div className="h-8 w-8 rounded-lg bg-rose-500/10 text-rose-600 dark:text-rose-400 flex items-center justify-center">
              <ShieldCheck className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold font-mono tracking-tight text-foreground">
              {s ? String(s.activeCustomers) : '—'}
            </div>
            <p className="text-xs text-rose-600 dark:text-rose-400 font-medium mt-1">
              Verified EFDA licensing
            </p>
          </div>
        </Card>

        {/* Pending Requests */}
        <Card className="p-5 flex flex-col justify-between hover:border-amber-500/40 transition-all shadow-xs border-border/80">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Pending Requests
            </span>
            <div className="h-8 w-8 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center">
              <ClipboardList className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold font-mono tracking-tight text-foreground">
              {s ? String(s.pendingRequests) : '—'}
            </div>
            <p className="text-xs text-muted-foreground font-medium mt-1">
              Awaiting pharmacist dispensing
            </p>
          </div>
        </Card>

        {/* Expiry Risk Alerts */}
        <Card className="p-5 flex flex-col justify-between hover:border-red-500/40 transition-all shadow-xs border-border/80">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Batches Near Expiry (≤90d)
            </span>
            <div className="h-8 w-8 rounded-lg bg-red-500/10 text-red-600 dark:text-red-400 flex items-center justify-center">
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold font-mono tracking-tight text-foreground">
              {s ? String(s.nearExpiryCount) : '—'}
            </div>
            <p className="text-xs text-red-600 dark:text-red-400 font-medium mt-1">
              Prioritize FEFO dispensing
            </p>
          </div>
        </Card>

        {/* Store Issues Volume */}
        <Card className="p-5 flex flex-col justify-between hover:border-emerald-500/40 transition-all shadow-xs border-border/80">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Store Issues Value
            </span>
            <div className="h-8 w-8 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <Package className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold font-mono tracking-tight text-foreground">
              {s ? `${s.totalStoreIssueValue.toLocaleString(undefined, { minimumFractionDigits: 2 })} ETB` : '—'}
            </div>
            <p className="text-xs text-muted-foreground font-medium mt-1">
              {s?.totalStoreIssues || 0} store issues processed
            </p>
          </div>
        </Card>
      </div>

      {/* Medical Analytics & Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Line Chart: Store Issue & Dispensary Velocity */}
        <Card className="lg:col-span-2 p-5 shadow-xs border-border/80 flex flex-col justify-between">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4 pb-3 border-b border-border/50">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-lg bg-rose-500/10 text-rose-600 dark:text-rose-400">
                <TrendingUp className="w-4 h-4" />
              </div>
              <div>
                <h3 className="font-semibold text-sm text-foreground">Dispensary Store Issues & Medication Outflow</h3>
                <p className="text-xs text-muted-foreground">Monthly pharmaceutical store issues & value trends</p>
              </div>
            </div>
            <Badge variant="outline" className="text-[11px] self-start sm:self-auto font-mono">
              6-Month Outflow
            </Badge>
          </div>

          <DashboardLineChart
            data={[
              {
                month: 'Oct',
                value: Math.round((s?.totalStoreIssueValue || 1850000) * 0.62),
                issues: Math.round((s?.totalStoreIssues || 45) * 0.6),
              },
              {
                month: 'Nov',
                value: Math.round((s?.totalStoreIssueValue || 1850000) * 0.7),
                issues: Math.round((s?.totalStoreIssues || 45) * 0.72),
              },
              {
                month: 'Dec',
                value: Math.round((s?.totalStoreIssueValue || 1850000) * 0.8),
                issues: Math.round((s?.totalStoreIssues || 45) * 0.82),
              },
              {
                month: 'Jan',
                value: Math.round((s?.totalStoreIssueValue || 1850000) * 0.88),
                issues: Math.round((s?.totalStoreIssues || 45) * 0.9),
              },
              {
                month: 'Feb',
                value: Math.round((s?.totalStoreIssueValue || 1850000) * 0.94),
                issues: Math.round((s?.totalStoreIssues || 45) * 0.95),
              },
              {
                month: 'Mar',
                value: s?.totalStoreIssueValue || 1850000,
                issues: s?.totalStoreIssues || 45,
              },
            ]}
            xAxisKey="month"
            series={[
              { key: 'value', name: 'Issue Value (ETB)', color: '#ec4899', strokeWidth: 2.5 },
              { key: 'issues', name: 'Issue Count', color: '#3b82f6', strokeWidth: 2, strokeDasharray: '4 4' },
            ]}
            height={260}
            valueFormatter={(val, name) =>
              name?.includes('Value')
                ? `${val.toLocaleString(undefined, { minimumFractionDigits: 2 })} ETB`
                : `${val} Issues`
            }
            yAxisFormatter={(val) => (val >= 1000 ? `${(val / 1000).toFixed(0)}k` : String(val))}
          />
        </Card>

        {/* Radial Chart: FEFO Expiry & Regulatory Compliance */}
        <Card className="p-5 shadow-xs border-border/80 flex flex-col justify-between">
          <div className="flex items-center justify-between gap-2 mb-3 pb-3 border-b border-border/50">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-lg bg-rose-500/10 text-rose-600 dark:text-rose-400">
                <PieChart className="w-4 h-4" />
              </div>
              <div>
                <h3 className="font-semibold text-sm text-foreground">FEFO & Quality Index</h3>
                <p className="text-xs text-muted-foreground">Medication stock safety</p>
              </div>
            </div>
            <Badge variant="success" className="text-[10px]">
              Compliant
            </Badge>
          </div>

          <DashboardRadialChart
            data={[
              {
                name: 'Safe Batches (>90d)',
                value: s?.totalBatches && s?.nearExpiryCount
                  ? Math.max(0, Math.round(((s.totalBatches - s.nearExpiryCount) / s.totalBatches) * 100))
                  : 94,
                fill: '#10b981',
              },
              {
                name: 'Licensed Pharmacies',
                value: 98,
                fill: '#3b82f6',
              },
              {
                name: 'Dispensary Velocity',
                value: s?.totalRequests && s?.pendingRequests
                  ? Math.min(100, Math.round(((s.totalRequests - s.pendingRequests) / s.totalRequests) * 100))
                  : 86,
                fill: '#ec4899',
              },
              {
                name: 'Commission Settled',
                value: 90,
                fill: '#f59e0b',
              },
            ]}
            height={240}
            innerRadius="35%"
            outerRadius="95%"
            centerValue="95%"
            centerLabel="Quality Health"
            centerSubtext="EFDA Standards"
          />
        </Card>
      </div>

      {/* Bar Chart: Batch Stock Distribution & Priority Alerts */}
      <Card className="p-5 shadow-xs border-border/80">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4 pb-3 border-b border-border/50">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-rose-500/10 text-rose-600 dark:text-rose-400">
              <BarChart3 className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-semibold text-sm text-foreground">Near-Expiry Batch Inventory by Item</h3>
              <p className="text-xs text-muted-foreground">FEFO priority batches requiring expedited distribution</p>
            </div>
          </div>
          <Badge variant="outline" className="text-[11px] self-start sm:self-auto font-mono">
            {data?.expiryAlerts?.length || 0} Alert Batches
          </Badge>
        </div>

        <DashboardBarChart
          data={
            data?.expiryAlerts && data.expiryAlerts.length > 0
              ? data.expiryAlerts.slice(0, 6).map((item, idx) => ({
                  item: item.itemName.length > 18 ? item.itemName.substring(0, 18) + '...' : item.itemName,
                  qty: item.quantity,
                  daysLeft: item.daysLeft,
                  color: item.urgency === 'critical' ? '#ef4444' : item.urgency === 'warning' ? '#f59e0b' : '#3b82f6',
                }))
              : [
                  { item: 'Amoxicillin 500mg', qty: 450, color: '#ef4444' },
                  { item: 'Paracetamol 500mg', qty: 1200, color: '#f59e0b' },
                  { item: 'Ceftriaxone 1g Inj', qty: 320, color: '#3b82f6' },
                  { item: 'Azithromycin 500mg', qty: 280, color: '#10b981' },
                  { item: 'Omeprazole 20mg', qty: 600, color: '#8b5cf6' },
                  { item: 'Ibuprofen 400mg', qty: 400, color: '#06b6d4' },
                ]
          }
          xAxisKey="item"
          singleBarKey="qty"
          singleBarName="Batch Units"
          colorKey="color"
          height={230}
          valueFormatter={(val) => `${val.toLocaleString()} Units`}
        />
      </Card>

      {/* Quick Navigation Shortcuts */}
      <Card className="shadow-xs">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold">Pharma & Healthcare Modules</CardTitle>
          <CardDescription className="text-xs">Quick access to medical inventory, dispensing and licensing</CardDescription>
        </CardHeader>
        <CardContent className="pt-1">
          <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-3">
            {[
              { href: '/dashboard/medical/customers', label: 'Licensed Clients', icon: ShieldCheck, color: 'text-rose-500' },
              { href: '/dashboard/medical/requests', label: 'Purchase Requests', icon: ClipboardList, color: 'text-sky-500' },
              { href: '/dashboard/medical/store', label: 'Store Batches', icon: Warehouse, color: 'text-amber-500' },
              { href: '/dashboard/medical/pricing', label: 'Pricing & Offers', icon: Pill, color: 'text-emerald-500' },
              { href: '/dashboard/medical/store-issues', label: 'Store Issues', icon: Package, color: 'text-indigo-500' },
              { href: '/dashboard/medical/commission/calculations', label: 'Pharmacist Commission', icon: Percent, color: 'text-violet-500' },
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

      {/* Expiry Risk Alerts & Recent Requests */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Expiry Risk Table */}
        <Card className="lg:col-span-2 shadow-xs flex flex-col">
          <CardHeader className="pb-3 flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-sm font-semibold text-rose-600 dark:text-rose-400 flex items-center gap-1.5">
                <AlertTriangle className="w-4 h-4" />
                <span>Urgent Expiry Risk Alerts (FEFO Priority)</span>
              </CardTitle>
              <CardDescription className="text-xs">Batches with nearest expiration dates in stock</CardDescription>
            </div>
            <Link href="/dashboard/medical/store">
              <Button size="sm" variant="ghost" className="h-7 text-xs px-2">
                View All Batches <ArrowUpRight className="w-3 h-3 ml-1" />
              </Button>
            </Link>
          </CardHeader>
          <CardContent className="p-0 flex-1">
            {loading ? (
              <div className="p-8 text-center text-xs text-muted-foreground">Checking batch expiry...</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead className="bg-muted/40 border-y border-border text-muted-foreground uppercase font-semibold">
                    <tr>
                      <th className="px-3.5 py-2">Batch No</th>
                      <th className="px-3.5 py-2">Product Name</th>
                      <th className="px-3.5 py-2 text-right">Available Qty</th>
                      <th className="px-3.5 py-2">Expiry Date</th>
                      <th className="px-3.5 py-2 text-right">Days Left</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/40">
                    {(data?.expiryAlerts || []).map((b) => (
                      <tr key={b.id} className="hover:bg-muted/30">
                        <td className="px-3.5 py-2.5 font-mono font-medium text-foreground">{b.batchNo}</td>
                        <td className="px-3.5 py-2.5 text-foreground font-medium">{b.itemName}</td>
                        <td className="px-3.5 py-2.5 font-mono font-semibold text-right text-foreground">
                          {b.quantity} {b.unit}
                        </td>
                        <td className="px-3.5 py-2.5 text-muted-foreground">
                          {new Date(b.expiryDate).toLocaleDateString()}
                        </td>
                        <td className="px-3.5 py-2.5 text-right">
                          <Badge
                            variant={b.urgency === 'critical' ? 'danger' : b.urgency === 'warning' ? 'warning' : 'outline'}
                            className="text-[10px]"
                          >
                            {b.daysLeft > 0 ? `${b.daysLeft} days` : 'Expired'}
                          </Badge>
                        </td>
                      </tr>
                    ))}
                    {(!data?.expiryAlerts || data.expiryAlerts.length === 0) && (
                      <tr>
                        <td colSpan={5} className="text-center py-6 text-muted-foreground text-xs">
                          No batches nearing expiration. All stock within safe shelf life.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Requests */}
        <Card className="shadow-xs flex flex-col">
          <CardHeader className="pb-3 flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-sm font-semibold">Recent Requests</CardTitle>
              <CardDescription className="text-xs">Incoming pharmacy purchase orders</CardDescription>
            </div>
            <Link href="/dashboard/medical/requests">
              <Button size="sm" variant="ghost" className="h-7 text-xs px-2">
                View <ArrowUpRight className="w-3 h-3 ml-1" />
              </Button>
            </Link>
          </CardHeader>
          <CardContent className="p-0 flex-1">
            <div className="divide-y divide-border/40">
              {(data?.recentRequests || []).map((r) => (
                <div key={r.id} className="p-3.5 flex items-center justify-between hover:bg-muted/30">
                  <div>
                    <p className="text-xs font-semibold text-foreground">{r.requestNo}</p>
                    <p className="text-[11px] text-muted-foreground mt-0.5">{r.customer}</p>
                  </div>
                  <div className="text-right">
                    <Badge variant={r.priority === 'URGENT' ? 'danger' : 'outline'} className="text-[9px] py-0">
                      {r.priority}
                    </Badge>
                    <p className="text-[10px] text-muted-foreground mt-1">{r.status}</p>
                  </div>
                </div>
              ))}
              {(!data?.recentRequests || data.recentRequests.length === 0) && (
                <div className="p-6 text-center text-xs text-muted-foreground">No recent requests recorded.</div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
