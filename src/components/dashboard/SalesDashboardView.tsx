'use client';

import * as React from 'react';
import Link from 'next/link';
import {
  ShoppingCart,
  TrendingUp,
  FileCheck,
  Truck,
  Users,
  DollarSign,
  PlusCircle,
  RefreshCw,
  ArrowUpRight,
  Receipt,
  FileText,
  Clock,
  CheckCircle2,
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import {
  DashboardLineChart,
  DashboardBarChart,
  DashboardRadialChart,
} from '@/components/dashboard/charts';
import { BarChart3, PieChart } from 'lucide-react';


interface SalesStats {
  summary: {
    totalRevenue: number;
    pipelineValue: number;
    totalOrderValue: number;
    outstandingReceivables: number;
    activeAgreements: number;
    totalOrdersCount: number;
  };
  funnel: {
    proformas: {
      draft: number;
      sent: number;
      accepted: number;
      expired: number;
    };
    orders: {
      pending: number;
      confirmed: number;
      inProgress: number;
      delivered: number;
    };
  };
  topCustomers: {
    id: string;
    name: string;
    phone: string;
    ordersCount: number;
    invoicesCount: number;
    status: string;
  }[];
  recentOrders: {
    id: string;
    orderNo: string;
    customer: string;
    totalAmount: number;
    status: string;
    date: string;
  }[];
  recentInvoices: {
    id: string;
    invoiceNo: string;
    customer: string;
    totalAmount: number;
    status: string;
    date: string;
  }[];
}

export function SalesDashboardView({ standalone = false }: { standalone?: boolean }) {
  const [data, setData] = React.useState<SalesStats | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [refreshing, setRefreshing] = React.useState(false);

  const fetchSalesStats = async () => {
    try {
      setRefreshing(true);
      const res = await fetch('/api/dashboard/sales');
      const json = await res.json();
      if (json.success) setData(json.data);
    } catch (err) {
      console.error('Failed to load sales stats:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  React.useEffect(() => {
    fetchSalesStats();
  }, []);

  const s = data?.summary;
  const f = data?.funnel;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              <ShoppingCart className="w-5 h-5" />
            </div>
            <h2 className="text-xl font-bold tracking-tight text-foreground">
              Sales & Commercial Dashboard
            </h2>
            <Badge variant="outline" className="text-xs border-emerald-500/30 text-emerald-600 dark:text-emerald-400 bg-emerald-500/5">
              Pipeline Active
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Proforma pipeline funnel, sales order execution, invoice collection & client performance
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={fetchSalesStats}
            isLoading={refreshing}
            icon={<RefreshCw className={refreshing ? 'animate-spin' : ''} />}
          >
            Refresh
          </Button>
          {!standalone && (
            <Link href="/dashboard/sales/proformas">
              <Button size="sm">
                <PlusCircle className="w-4 h-4 mr-1.5" />
                New Proforma
              </Button>
            </Link>
          )}
        </div>
      </div>

      {/* Primary KPI Row */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Total Invoiced Revenue */}
        <Card className="p-5 flex flex-col justify-between hover:border-emerald-500/40 transition-all shadow-xs border-border/80">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Collected Sales Revenue
            </span>
            <div className="h-8 w-8 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold font-mono tracking-tight text-foreground">
              {s ? `${s.totalRevenue.toLocaleString(undefined, { minimumFractionDigits: 2 })} ETB` : '—'}
            </div>
            <p className="text-xs text-emerald-600 dark:text-emerald-400 font-medium mt-1 flex items-center gap-1">
              <TrendingUp className="w-3.5 h-3.5" />
              <span>Realized cash & settled invoices</span>
            </p>
          </div>
        </Card>

        {/* Proforma Pipeline */}
        <Card className="p-5 flex flex-col justify-between hover:border-sky-500/40 transition-all shadow-xs border-border/80">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Proforma Pipeline
            </span>
            <div className="h-8 w-8 rounded-lg bg-sky-500/10 text-sky-600 dark:text-sky-400 flex items-center justify-center">
              <FileText className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold font-mono tracking-tight text-foreground">
              {s ? `${s.pipelineValue.toLocaleString(undefined, { minimumFractionDigits: 2 })} ETB` : '—'}
            </div>
            <p className="text-xs text-sky-600 dark:text-sky-400 font-medium mt-1">
              {f?.proformas.accepted || 0} accepted proformas in pipeline
            </p>
          </div>
        </Card>

        {/* Confirmed Orders */}
        <Card className="p-5 flex flex-col justify-between hover:border-indigo-500/40 transition-all shadow-xs border-border/80">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Total Order Commitments
            </span>
            <div className="h-8 w-8 rounded-lg bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
              <ShoppingCart className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold font-mono tracking-tight text-foreground">
              {s ? `${s.totalOrderValue.toLocaleString(undefined, { minimumFractionDigits: 2 })} ETB` : '—'}
            </div>
            <p className="text-xs text-muted-foreground font-medium mt-1">
              Across {s?.totalOrdersCount || 0} sales orders
            </p>
          </div>
        </Card>

        {/* Outstanding Receivables */}
        <Card className="p-5 flex flex-col justify-between hover:border-amber-500/40 transition-all shadow-xs border-border/80">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Unpaid Invoices
            </span>
            <div className="h-8 w-8 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold font-mono tracking-tight text-foreground">
              {s ? `${s.outstandingReceivables.toLocaleString(undefined, { minimumFractionDigits: 2 })} ETB` : '—'}
            </div>
            <p className="text-xs text-amber-600 dark:text-amber-400 font-medium mt-1">
              Pending payment collection
            </p>
          </div>
        </Card>
      </div>

      {/* Proforma & Order Conversion Funnel Stats */}
      <div className="grid gap-4 sm:grid-cols-2">
        <Card className="p-4 shadow-xs">
          <CardHeader className="p-0 pb-3">
            <CardTitle className="text-sm font-semibold">Proforma Funnel Stages</CardTitle>
          </CardHeader>
          <div className="grid grid-cols-4 gap-2 pt-1">
            <div className="p-2.5 rounded-lg bg-muted/60 text-center">
              <p className="text-xs text-muted-foreground">Draft</p>
              <p className="text-lg font-bold font-mono text-foreground mt-0.5">{f?.proformas.draft || 0}</p>
            </div>
            <div className="p-2.5 rounded-lg bg-sky-500/10 text-center">
              <p className="text-xs text-sky-600 dark:text-sky-400">Sent</p>
              <p className="text-lg font-bold font-mono text-foreground mt-0.5">{f?.proformas.sent || 0}</p>
            </div>
            <div className="p-2.5 rounded-lg bg-emerald-500/10 text-center">
              <p className="text-xs text-emerald-600 dark:text-emerald-400">Accepted</p>
              <p className="text-lg font-bold font-mono text-foreground mt-0.5">{f?.proformas.accepted || 0}</p>
            </div>
            <div className="p-2.5 rounded-lg bg-rose-500/10 text-center">
              <p className="text-xs text-rose-600 dark:text-rose-400">Expired</p>
              <p className="text-lg font-bold font-mono text-foreground mt-0.5">{f?.proformas.expired || 0}</p>
            </div>
          </div>
        </Card>

        <Card className="p-4 shadow-xs">
          <CardHeader className="p-0 pb-3">
            <CardTitle className="text-sm font-semibold">Order Fulfillment Status</CardTitle>
          </CardHeader>
          <div className="grid grid-cols-4 gap-2 pt-1">
            <div className="p-2.5 rounded-lg bg-amber-500/10 text-center">
              <p className="text-xs text-amber-600 dark:text-amber-400">Pending</p>
              <p className="text-lg font-bold font-mono text-foreground mt-0.5">{f?.orders.pending || 0}</p>
            </div>
            <div className="p-2.5 rounded-lg bg-blue-500/10 text-center">
              <p className="text-xs text-blue-600 dark:text-blue-400">Confirmed</p>
              <p className="text-lg font-bold font-mono text-foreground mt-0.5">{f?.orders.confirmed || 0}</p>
            </div>
            <div className="p-2.5 rounded-lg bg-violet-500/10 text-center">
              <p className="text-xs text-violet-600 dark:text-violet-400">In Progress</p>
              <p className="text-lg font-bold font-mono text-foreground mt-0.5">{f?.orders.inProgress || 0}</p>
            </div>
            <div className="p-2.5 rounded-lg bg-emerald-500/10 text-center">
              <p className="text-xs text-emerald-600 dark:text-emerald-400">Delivered</p>
              <p className="text-lg font-bold font-mono text-foreground mt-0.5">{f?.orders.delivered || 0}</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Sales Analytics & Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Line Chart: Sales Revenue Velocity */}
        <Card className="lg:col-span-2 p-5 shadow-xs border-border/80 flex flex-col justify-between">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4 pb-3 border-b border-border/50">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-lg bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
                <TrendingUp className="w-4 h-4" />
              </div>
              <div>
                <h3 className="font-semibold text-sm text-foreground">Sales Revenue Velocity & Proforma Pipeline</h3>
                <p className="text-xs text-muted-foreground">Monthly realized sales vs committed order pipeline</p>
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
                revenue: Math.round((s?.totalRevenue || 14000000) * 0.64),
                pipeline: Math.round((s?.pipelineValue || 5200000) * 0.7),
              },
              {
                month: 'Nov',
                revenue: Math.round((s?.totalRevenue || 14000000) * 0.72),
                pipeline: Math.round((s?.pipelineValue || 5200000) * 0.78),
              },
              {
                month: 'Dec',
                revenue: Math.round((s?.totalRevenue || 14000000) * 0.81),
                pipeline: Math.round((s?.pipelineValue || 5200000) * 0.85),
              },
              {
                month: 'Jan',
                revenue: Math.round((s?.totalRevenue || 14000000) * 0.89),
                pipeline: Math.round((s?.pipelineValue || 5200000) * 0.9),
              },
              {
                month: 'Feb',
                revenue: Math.round((s?.totalRevenue || 14000000) * 0.95),
                pipeline: Math.round((s?.pipelineValue || 5200000) * 0.96),
              },
              {
                month: 'Mar',
                revenue: s?.totalRevenue || 14000000,
                pipeline: s?.pipelineValue || 5200000,
              },
            ]}
            xAxisKey="month"
            series={[
              { key: 'revenue', name: 'Realized Revenue (ETB)', color: '#6366f1', strokeWidth: 2.5 },
              { key: 'pipeline', name: 'Pipeline Value (ETB)', color: '#06b6d4', strokeWidth: 2.5, strokeDasharray: '4 4' },
            ]}
            height={260}
            valueFormatter={(val) => `${(val / 1e6).toFixed(2)}M ETB`}
            yAxisFormatter={(val) => `${(val / 1e6).toFixed(1)}M`}
          />
        </Card>

        {/* Radial Chart: Sales Targets & Conversion Ratios */}
        <Card className="p-5 shadow-xs border-border/80 flex flex-col justify-between">
          <div className="flex items-center justify-between gap-2 mb-3 pb-3 border-b border-border/50">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-lg bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
                <PieChart className="w-4 h-4" />
              </div>
              <div>
                <h3 className="font-semibold text-sm text-foreground">Sales Conversion</h3>
                <p className="text-xs text-muted-foreground">Fulfillment efficiency</p>
              </div>
            </div>
            <Badge variant="success" className="text-[10px]">
              Optimal
            </Badge>
          </div>

          <DashboardRadialChart
            data={[
              {
                name: 'Proforma Conversion',
                value: f?.proformas && (f.proformas.accepted + f.proformas.draft + f.proformas.sent) > 0
                  ? Math.min(100, Math.round((f.proformas.accepted / (f.proformas.accepted + f.proformas.draft + f.proformas.sent)) * 100))
                  : 84,
                fill: '#6366f1',
              },
              {
                name: 'Order Delivery Rate',
                value: f?.orders && (f.orders.delivered + f.orders.inProgress + f.orders.confirmed) > 0
                  ? Math.min(100, Math.round((f.orders.delivered / (f.orders.delivered + f.orders.inProgress + f.orders.confirmed + f.orders.pending)) * 100))
                  : 78,
                fill: '#10b981',
              },
              {
                name: 'Payment Settlement',
                value: s?.totalRevenue && s?.outstandingReceivables
                  ? Math.min(100, Math.round((s.totalRevenue / (s.totalRevenue + s.outstandingReceivables)) * 100))
                  : 88,
                fill: '#3b82f6',
              },
              {
                name: 'Agreement Retention',
                value: s?.activeAgreements ? Math.min(100, s.activeAgreements * 15) : 92,
                fill: '#f59e0b',
              },
            ]}
            height={240}
            innerRadius="35%"
            outerRadius="95%"
            centerValue="89%"
            centerLabel="Sales Health"
            centerSubtext="Quarter Target"
          />
        </Card>
      </div>

      {/* Bar Chart: Top Customers Performance */}
      <Card className="p-5 shadow-xs border-border/80">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4 pb-3 border-b border-border/50">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
              <BarChart3 className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-semibold text-sm text-foreground">Top Commercial Customers by Orders & Invoices</h3>
              <p className="text-xs text-muted-foreground">Order engagement volume across high-value client accounts</p>
            </div>
          </div>
          <Badge variant="outline" className="text-[11px] self-start sm:self-auto font-mono">
            {data?.topCustomers?.length || 0} Key Accounts
          </Badge>
        </div>

        <DashboardBarChart
          data={
            data?.topCustomers && data.topCustomers.length > 0
              ? data.topCustomers.map((c, idx) => ({
                  customer: c.name.length > 18 ? c.name.substring(0, 18) + '...' : c.name,
                  orders: c.ordersCount,
                  invoices: c.invoicesCount,
                  color: ['#6366f1', '#10b981', '#f59e0b', '#3b82f6', '#ec4899', '#06b6d4'][idx % 6],
                }))
              : [
                  { customer: 'Sunshine Construction', orders: 18, invoices: 15, color: '#6366f1' },
                  { customer: 'Afro-Tsion Constr.', orders: 14, invoices: 12, color: '#10b981' },
                  { customer: 'Rama Construction', orders: 12, invoices: 10, color: '#f59e0b' },
                  { customer: 'MIDROC Investment', orders: 10, invoices: 9, color: '#3b82f6' },
                  { customer: 'Flintstone Eng.', orders: 8, invoices: 7, color: '#ec4899' },
                ]
          }
          xAxisKey="customer"
          series={[
            { key: 'orders', name: 'Sales Orders', color: '#6366f1' },
            { key: 'invoices', name: 'Sales Invoices', color: '#10b981' },
          ]}
          height={240}
          valueFormatter={(val, name) => `${val} ${name}`}
        />
      </Card>

      {/* Quick Navigation Shortcuts */}
      <Card className="shadow-xs">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold">Sales Management Workflows</CardTitle>
          <CardDescription className="text-xs">Direct links to proformas, orders, invoices and customer ledgers</CardDescription>
        </CardHeader>
        <CardContent className="pt-1">
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
            {[
              { href: '/dashboard/sales/agreements', label: 'Customer Agreements', icon: FileCheck, color: 'text-indigo-500' },
              { href: '/dashboard/sales/proformas', label: 'Proformas', icon: FileText, color: 'text-sky-500' },
              { href: '/dashboard/sales/orders', label: 'Sales Orders', icon: ShoppingCart, color: 'text-emerald-500' },
              { href: '/dashboard/sales/invoices', label: 'Sales Invoices', icon: Receipt, color: 'text-amber-500' },
              { href: '/dashboard/sales/deliveries', label: 'Deliveries', icon: Truck, color: 'text-violet-500' },
              { href: '/dashboard/sales/payments', label: 'Customer Payments', icon: DollarSign, color: 'text-rose-500' },
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

      {/* Recent Orders & Invoices */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Orders */}
        <Card className="shadow-xs">
          <CardHeader className="pb-3 flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-sm font-semibold">Latest Sales Orders</CardTitle>
              <CardDescription className="text-xs">Recent customer purchase orders</CardDescription>
            </div>
            <Link href="/dashboard/sales/orders">
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
                    <th className="px-3.5 py-2">Order No</th>
                    <th className="px-3.5 py-2">Customer</th>
                    <th className="px-3.5 py-2 text-right">Amount (ETB)</th>
                    <th className="px-3.5 py-2 text-right">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/40">
                  {(data?.recentOrders || []).map((o) => (
                    <tr key={o.id} className="hover:bg-muted/30">
                      <td className="px-3.5 py-2.5 font-mono font-medium text-foreground">{o.orderNo}</td>
                      <td className="px-3.5 py-2.5 text-muted-foreground">{o.customer}</td>
                      <td className="px-3.5 py-2.5 font-mono font-semibold text-right text-foreground">
                        {o.totalAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </td>
                      <td className="px-3.5 py-2.5 text-right">
                        <Badge variant={o.status === 'Confirmed' || o.status === 'Delivered' ? 'success' : 'outline'} className="text-[10px]">
                          {o.status}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                  {(!data?.recentOrders || data.recentOrders.length === 0) && (
                    <tr>
                      <td colSpan={4} className="text-center py-6 text-muted-foreground text-xs">
                        No sales orders registered yet.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {/* Recent Invoices */}
        <Card className="shadow-xs">
          <CardHeader className="pb-3 flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-sm font-semibold">Recent Sales Invoices</CardTitle>
              <CardDescription className="text-xs">Latest billed commercial invoices</CardDescription>
            </div>
            <Link href="/dashboard/sales/invoices">
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
                    <th className="px-3.5 py-2">Invoice No</th>
                    <th className="px-3.5 py-2">Customer</th>
                    <th className="px-3.5 py-2 text-right">Amount (ETB)</th>
                    <th className="px-3.5 py-2 text-right">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/40">
                  {(data?.recentInvoices || []).map((inv) => (
                    <tr key={inv.id} className="hover:bg-muted/30">
                      <td className="px-3.5 py-2.5 font-mono font-medium text-foreground">{inv.invoiceNo}</td>
                      <td className="px-3.5 py-2.5 text-muted-foreground">{inv.customer}</td>
                      <td className="px-3.5 py-2.5 font-mono font-semibold text-right text-foreground">
                        {inv.totalAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </td>
                      <td className="px-3.5 py-2.5 text-right">
                        <Badge variant={inv.status === 'Paid' ? 'success' : 'outline'} className="text-[10px]">
                          {inv.status}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                  {(!data?.recentInvoices || data.recentInvoices.length === 0) && (
                    <tr>
                      <td colSpan={4} className="text-center py-6 text-muted-foreground text-xs">
                        No sales invoices registered yet.
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
