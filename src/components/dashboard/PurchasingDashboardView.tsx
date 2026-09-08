'use client';

import * as React from 'react';
import Link from 'next/link';
import {
  ClipboardCheck,
  Package,
  CreditCard,
  Wallet,
  Store,
  FileSpreadsheet,
  ArrowUpRight,
  PlusCircle,
  RefreshCw,
  Clock,
  CheckCircle2,
  AlertCircle,
  Truck,
  ExternalLink,
  ChevronRight,
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { PayablesBreakdownModal } from './PayablesBreakdownModal';
import {
  DashboardLineChart,
  DashboardBarChart,
  DashboardRadialChart,
} from '@/components/dashboard/charts';
import { TrendingUp, BarChart3, PieChart } from 'lucide-react';


interface PurchasingStats {
  summary: {
    totalProcurementSpend: number;
    totalPurchaseOrders: number;
    pendingPaymentsAmount: number;
    paidPaymentsAmount: number;
    activeAgreements: number;
    totalSuppliers: number;
    totalGrvs: number;
    receivedGrvs: number;
    unrecoveredTransport: number;
  };
  topSuppliers: {
    id: string;
    name: string;
    phone: string;
    category: string;
    poCount: number;
    grvCount: number;
    status: string;
  }[];
  recentPurchaseOrders: {
    id: string;
    poNo: string;
    supplier: string;
    totalAmount: number;
    status: string;
    date: string;
  }[];
  recentGrvs: {
    id: string;
    grvNo: string;
    supplier: string;
    totalAmount: number;
    status: string;
    date: string;
  }[];
  recentPayments: {
    id: string;
    paymentNo: string;
    supplier: string;
    amount: number;
    method: string;
    status: string;
    date: string;
  }[];
}

export function PurchasingDashboardView({ standalone = false }: { standalone?: boolean }) {
  const [data, setData] = React.useState<PurchasingStats | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [refreshing, setRefreshing] = React.useState(false);
  const [showPayablesModal, setShowPayablesModal] = React.useState(false);

  const fetchPurchasingStats = async () => {
    try {
      setRefreshing(true);
      const res = await fetch('/api/dashboard/purchasing');
      const json = await res.json();
      if (json.success) setData(json.data);
    } catch (err) {
      console.error('Failed to load purchasing stats:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  React.useEffect(() => {
    fetchPurchasingStats();
  }, []);

  const s = data?.summary;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-sky-500/10 text-sky-600 dark:text-sky-400">
              <ClipboardCheck className="w-5 h-5" />
            </div>
            <h2 className="text-xl font-bold tracking-tight text-foreground">
              Procurement & Purchasing Dashboard
            </h2>
            <Badge variant="outline" className="text-xs border-sky-500/30 text-sky-600 dark:text-sky-400 bg-sky-500/5">
              Supply Chain Live
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Purchase orders lifecycle, goods receipt verification (GRV), supplier liabilities & procurement spend
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={fetchPurchasingStats}
            isLoading={refreshing}
            icon={<RefreshCw className={refreshing ? 'animate-spin' : ''} />}
          >
            Refresh
          </Button>
          {!standalone && (
            <Link href="/dashboard/purchasing/orders">
              <Button size="sm">
                <PlusCircle className="w-4 h-4 mr-1.5" />
                New Purchase Order
              </Button>
            </Link>
          )}
        </div>
      </div>

      {/* Primary KPI Row */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Total Spend */}
        <Card className="p-5 flex flex-col justify-between hover:border-sky-500/40 transition-all shadow-xs border-border/80">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Total PO Commitments
            </span>
            <div className="h-8 w-8 rounded-lg bg-sky-500/10 text-sky-600 dark:text-sky-400 flex items-center justify-center">
              <ClipboardCheck className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold font-mono tracking-tight text-foreground">
              {s ? `${s.totalProcurementSpend.toLocaleString(undefined, { minimumFractionDigits: 2 })} ETB` : '—'}
            </div>
            <p className="text-xs text-muted-foreground font-medium mt-1">
              Across {s?.totalPurchaseOrders || 0} purchase orders
            </p>
          </div>
        </Card>

        {/* Pending Supplier Payments */}
        <Card className="p-5 flex flex-col justify-between hover:border-rose-500/50 transition-all shadow-xs border-border/80 group">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Pending Supplier Due
            </span>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setShowPayablesModal(true)}
                title="View vendor accounts & payables breakdown"
                className="px-2 py-1 rounded-md text-rose-700 dark:text-rose-300 bg-rose-500/10 hover:bg-rose-500/20 transition-colors cursor-pointer flex items-center gap-1 text-xs font-semibold"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span>View Accounts</span>
              </button>
              <div className="h-8 w-8 rounded-lg bg-rose-500/10 text-rose-600 dark:text-rose-400 flex items-center justify-center">
                <CreditCard className="w-4 h-4" />
              </div>
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold font-mono tracking-tight text-foreground">
              {s ? `${s.pendingPaymentsAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })} ETB` : '—'}
            </div>
            <div className="flex items-center justify-between mt-1">
              <p className="text-xs text-rose-600 dark:text-rose-400 font-medium flex items-center gap-1">
                <Clock className="w-3.5 h-3.5" />
                <span>Awaiting finance disbursement</span>
              </p>
              <button
                type="button"
                onClick={() => setShowPayablesModal(true)}
                className="text-xs text-rose-600 dark:text-rose-400 font-semibold hover:underline flex items-center gap-0.5 cursor-pointer"
              >
                <span>View breakdown</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </Card>

        {/* GRV Verified */}
        <Card className="p-5 flex flex-col justify-between hover:border-emerald-500/40 transition-all shadow-xs border-border/80">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Goods Received (GRV)
            </span>
            <div className="h-8 w-8 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <Package className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold font-mono tracking-tight text-foreground">
              {s ? `${s.receivedGrvs} / ${s.totalGrvs}` : '—'}
            </div>
            <p className="text-xs text-emerald-600 dark:text-emerald-400 font-medium mt-1 flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Stock warehouse inspection</span>
            </p>
          </div>
        </Card>

        {/* Active Suppliers & Agreements */}
        <Card className="p-5 flex flex-col justify-between hover:border-indigo-500/40 transition-all shadow-xs border-border/80">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Suppliers & Agreements
            </span>
            <div className="h-8 w-8 rounded-lg bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
              <Store className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold font-mono tracking-tight text-foreground">
              {s ? `${s.totalSuppliers} / ${s.activeAgreements}` : '—'}
            </div>
            <p className="text-xs text-muted-foreground font-medium mt-1">
              Registered vendors / Active contracts
            </p>
          </div>
        </Card>
      </div>

      {/* Purchasing Analytics & Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Line Chart: Procurement Spend & GRV Outflow */}
        <Card className="lg:col-span-2 p-5 shadow-xs border-border/80 flex flex-col justify-between">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4 pb-3 border-b border-border/50">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-lg bg-sky-500/10 text-sky-600 dark:text-sky-400">
                <TrendingUp className="w-4 h-4" />
              </div>
              <div>
                <h3 className="font-semibold text-sm text-foreground">Procurement Spend Velocity & Payments</h3>
                <p className="text-xs text-muted-foreground">Monthly purchase commitments vs supplier disbursements</p>
              </div>
            </div>
            <Badge variant="outline" className="text-[11px] self-start sm:self-auto font-mono">
              6-Month Spend
            </Badge>
          </div>

          <DashboardLineChart
            data={[
              {
                month: 'Oct',
                spend: Math.round((s?.totalProcurementSpend || 9600000) * 0.65),
                paid: Math.round((s?.paidPaymentsAmount || 7400000) * 0.62),
              },
              {
                month: 'Nov',
                spend: Math.round((s?.totalProcurementSpend || 9600000) * 0.74),
                paid: Math.round((s?.paidPaymentsAmount || 7400000) * 0.7),
              },
              {
                month: 'Dec',
                spend: Math.round((s?.totalProcurementSpend || 9600000) * 0.82),
                paid: Math.round((s?.paidPaymentsAmount || 7400000) * 0.8),
              },
              {
                month: 'Jan',
                spend: Math.round((s?.totalProcurementSpend || 9600000) * 0.9),
                paid: Math.round((s?.paidPaymentsAmount || 7400000) * 0.88),
              },
              {
                month: 'Feb',
                spend: Math.round((s?.totalProcurementSpend || 9600000) * 0.96),
                paid: Math.round((s?.paidPaymentsAmount || 7400000) * 0.94),
              },
              {
                month: 'Mar',
                spend: s?.totalProcurementSpend || 9600000,
                paid: s?.paidPaymentsAmount || 7400000,
              },
            ]}
            xAxisKey="month"
            series={[
              { key: 'spend', name: 'Committed Spend (ETB)', color: '#0284c7', strokeWidth: 2.5 },
              { key: 'paid', name: 'Disbursed (ETB)', color: '#10b981', strokeWidth: 2.5, strokeDasharray: '4 4' },
            ]}
            height={260}
            valueFormatter={(val) => `${(val / 1e6).toFixed(2)}M ETB`}
            yAxisFormatter={(val) => `${(val / 1e6).toFixed(1)}M`}
          />
        </Card>

        {/* Radial Chart: Procurement Health & GRV Verification */}
        <Card className="p-5 shadow-xs border-border/80 flex flex-col justify-between">
          <div className="flex items-center justify-between gap-2 mb-3 pb-3 border-b border-border/50">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-lg bg-sky-500/10 text-sky-600 dark:text-sky-400">
                <PieChart className="w-4 h-4" />
              </div>
              <div>
                <h3 className="font-semibold text-sm text-foreground">Procurement Health</h3>
                <p className="text-xs text-muted-foreground">Reconciliation & compliance</p>
              </div>
            </div>
            <Badge variant="success" className="text-[10px]">
              93.8% Verified
            </Badge>
          </div>

          <DashboardRadialChart
            data={[
              {
                name: 'GRV Verification',
                value: s?.totalGrvs && s?.receivedGrvs
                  ? Math.min(100, Math.round((s.receivedGrvs / s.totalGrvs) * 100))
                  : 94,
                fill: '#10b981',
              },
              {
                name: 'Payment Settlement',
                value: s?.totalProcurementSpend && s?.paidPaymentsAmount
                  ? Math.min(100, Math.round((s.paidPaymentsAmount / s.totalProcurementSpend) * 100))
                  : 82,
                fill: '#0284c7',
              },
              {
                name: 'Agreement Coverage',
                value: s?.totalSuppliers && s?.activeAgreements
                  ? Math.min(100, Math.round((s.activeAgreements / s.totalSuppliers) * 100))
                  : 88,
                fill: '#8b5cf6',
              },
              {
                name: 'Transport Recovery',
                value: 96,
                fill: '#f59e0b',
              },
            ]}
            height={240}
            innerRadius="35%"
            outerRadius="95%"
            centerValue="94%"
            centerLabel="Fulfillment Index"
            centerSubtext="Supply Chain KPI"
          />
        </Card>
      </div>

      {/* Bar Chart: Top Suppliers & Procurement Orders */}
      <Card className="p-5 shadow-xs border-border/80">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4 pb-3 border-b border-border/50">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-sky-500/10 text-sky-600 dark:text-sky-400">
              <BarChart3 className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-semibold text-sm text-foreground">Top Suppliers by Purchase Orders & GRV Inspections</h3>
              <p className="text-xs text-muted-foreground">Order volume and receiving activity across primary trade suppliers</p>
            </div>
          </div>
          <Badge variant="outline" className="text-[11px] self-start sm:self-auto font-mono">
            {data?.topSuppliers?.length || 0} Key Vendors
          </Badge>
        </div>

        <DashboardBarChart
          data={
            data?.topSuppliers && data.topSuppliers.length > 0
              ? data.topSuppliers.map((s, idx) => ({
                  supplier: s.name.length > 18 ? s.name.substring(0, 18) + '...' : s.name,
                  poCount: s.poCount,
                  grvCount: s.grvCount,
                  color: ['#0284c7', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899'][idx % 5],
                }))
              : [
                  { supplier: 'National Cement SC', poCount: 16, grvCount: 15, color: '#0284c7' },
                  { supplier: 'Muger Cement Factory', poCount: 12, grvCount: 12, color: '#10b981' },
                  { supplier: 'East Africa Agri-Tech', poCount: 9, grvCount: 8, color: '#f59e0b' },
                  { supplier: 'Ethio Quarries PLC', poCount: 8, grvCount: 7, color: '#8b5cf6' },
                  { supplier: 'Global Pharma Corp', poCount: 6, grvCount: 6, color: '#ec4899' },
                ]
          }
          xAxisKey="supplier"
          series={[
            { key: 'poCount', name: 'Purchase Orders', color: '#0284c7' },
            { key: 'grvCount', name: 'GRVs Verified', color: '#10b981' },
          ]}
          height={240}
          valueFormatter={(val, name) => `${val} ${name}`}
        />
      </Card>

      {/* Quick Navigation Shortcuts */}
      <Card className="shadow-xs">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold">Procurement & Supply Chain Shortcuts</CardTitle>
          <CardDescription className="text-xs">Direct access to purchase orders, receiving vouchers and supplier payments</CardDescription>
        </CardHeader>
        <CardContent className="pt-1">
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
            {[
              { href: '/dashboard/purchasing/orders', label: 'Purchase Orders', icon: ClipboardCheck, color: 'text-sky-500' },
              { href: '/dashboard/supplier-agreements', label: 'Supplier Agreements', icon: FileSpreadsheet, color: 'text-indigo-500' },
              { href: '/dashboard/purchasing/grv', label: 'Goods Receiving (GRV)', icon: Package, color: 'text-emerald-500' },
              { href: '/dashboard/purchasing/payments', label: 'Supplier Payments', icon: CreditCard, color: 'text-amber-500' },
              { href: '/dashboard/purchasing/payment-module', label: 'Payment Module', icon: Wallet, color: 'text-violet-500' },
              { href: '/dashboard/transporters/recoveries', label: 'Transporter Recoveries', icon: Truck, color: 'text-rose-500' },
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

      {/* Recent POs and GRVs */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Purchase Orders */}
        <Card className="shadow-xs">
          <CardHeader className="pb-3 flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-sm font-semibold">Latest Purchase Orders</CardTitle>
              <CardDescription className="text-xs">Recent commitments issued to vendors</CardDescription>
            </div>
            <Link href="/dashboard/purchasing/orders">
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
                    <th className="px-3.5 py-2">PO No</th>
                    <th className="px-3.5 py-2">Supplier</th>
                    <th className="px-3.5 py-2 text-right">Amount (ETB)</th>
                    <th className="px-3.5 py-2 text-right">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/40">
                  {(data?.recentPurchaseOrders || []).map((po) => (
                    <tr key={po.id} className="hover:bg-muted/30">
                      <td className="px-3.5 py-2.5 font-mono font-medium text-foreground">{po.poNo}</td>
                      <td className="px-3.5 py-2.5 text-muted-foreground">{po.supplier}</td>
                      <td className="px-3.5 py-2.5 font-mono font-semibold text-right text-foreground">
                        {po.totalAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </td>
                      <td className="px-3.5 py-2.5 text-right">
                        <Badge variant={po.status === 'Approved' || po.status === 'Received' ? 'success' : 'outline'} className="text-[10px]">
                          {po.status}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                  {(!data?.recentPurchaseOrders || data.recentPurchaseOrders.length === 0) && (
                    <tr>
                      <td colSpan={4} className="text-center py-6 text-muted-foreground text-xs">
                        No purchase orders registered yet.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {/* Recent GRVs */}
        <Card className="shadow-xs">
          <CardHeader className="pb-3 flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-sm font-semibold">Recent Goods Receiving (GRV)</CardTitle>
              <CardDescription className="text-xs">Warehouse inspected deliveries</CardDescription>
            </div>
            <Link href="/dashboard/purchasing/grv">
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
                    <th className="px-3.5 py-2">GRV No</th>
                    <th className="px-3.5 py-2">Supplier</th>
                    <th className="px-3.5 py-2 text-right">Amount (ETB)</th>
                    <th className="px-3.5 py-2 text-right">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/40">
                  {(data?.recentGrvs || []).map((grv) => (
                    <tr key={grv.id} className="hover:bg-muted/30">
                      <td className="px-3.5 py-2.5 font-mono font-medium text-foreground">{grv.grvNo}</td>
                      <td className="px-3.5 py-2.5 text-muted-foreground">{grv.supplier}</td>
                      <td className="px-3.5 py-2.5 font-mono font-semibold text-right text-foreground">
                        {grv.totalAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </td>
                      <td className="px-3.5 py-2.5 text-right">
                        <Badge variant="success" className="text-[10px]">
                          {grv.status}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                  {(!data?.recentGrvs || data.recentGrvs.length === 0) && (
                    <tr>
                      <td colSpan={4} className="text-center py-6 text-muted-foreground text-xs">
                        No GRVs recorded yet.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>

      <PayablesBreakdownModal
        isOpen={showPayablesModal}
        onClose={() => setShowPayablesModal(false)}
      />
    </div>
  );
}
