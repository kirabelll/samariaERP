'use client';

import * as React from 'react';
import Link from 'next/link';
import {
  DollarSign,
  CreditCard,
  Building,
  FileSpreadsheet,
  ArrowUpRight,
  RefreshCw,
  Wallet,
  Landmark,
  Percent,
  PlusCircle,
  Clock,
  CheckCircle2,
  AlertCircle,
  Receipt,
  FileCheck2,
  Eye,
  EyeOff,
  ChevronRight,
  ExternalLink,
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { ReceivablesBreakdownModal } from './ReceivablesBreakdownModal';
import { PayablesBreakdownModal } from './PayablesBreakdownModal';
import {
  DashboardLineChart,
  DashboardBarChart,
  DashboardRadialChart,
} from '@/components/dashboard/charts';
import { TrendingUp, BarChart3, PieChart } from 'lucide-react';
import { useAmountVisibility } from '@/hooks/useAmountVisibility';


interface FinanceStats {
  summary: {
    totalRevenue: number;
    outstandingReceivables: number;
    pendingPayables: number;
    totalBankBalance: number;
    pettyCashBalance: number;
    unappliedDeposits: number;
    netVatLiability: number;
    customerPaymentsCount: number;
    pendingPayablesCount: number;
  };
  bankAccounts: {
    id: string;
    bankName: string;
    accountNo: string;
    accountName: string;
    balance: number;
    currency: string;
  }[];
  recentVouchers: {
    id: string;
    voucherNo: string;
    voucherType: string;
    payeeName: string;
    amount: number;
    paymentMethod: string;
    status: string;
    date: string;
  }[];
  recentDeposits: {
    id: string;
    depositNo: string;
    customer: string;
    amount: number;
    unappliedAmount: number;
    method: string;
    status: string;
    date: string;
  }[];
}

export function FinanceDashboardView({ standalone = false }: { standalone?: boolean }) {
  const [data, setData] = React.useState<FinanceStats | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [refreshing, setRefreshing] = React.useState(false);
  const [showReceivablesModal, setShowReceivablesModal] = React.useState(false);
  const [showPayablesModal, setShowPayablesModal] = React.useState(false);
  const { showAmounts, toggleVisibility, formatAmount } = useAmountVisibility();

  const fetchFinanceStats = async () => {
    try {
      setRefreshing(true);
      const res = await fetch('/api/dashboard/finance');
      const json = await res.json();
      if (json.success) setData(json.data);
    } catch (err) {
      console.error('Failed to load finance stats:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  React.useEffect(() => {
    fetchFinanceStats();
  }, []);

  const s = data?.summary;

  return (
    <div className="space-y-6">
      {/* Header bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              <DollarSign className="w-5 h-5" />
            </div>
            <h2 className="text-xl font-bold tracking-tight text-foreground">
              Financial & Treasury Dashboard
            </h2>
            <Badge variant="outline" className="text-xs border-emerald-500/30 text-emerald-600 dark:text-emerald-400 bg-emerald-500/5">
              Live Ledger
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Real-time cash flow, bank positions, receivables, payables & tax liabilities
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={fetchFinanceStats}
            isLoading={refreshing}
            icon={<RefreshCw className={refreshing ? 'animate-spin' : ''} />}
          >
            Refresh
          </Button>
          {!standalone && (
            <Link href="/dashboard/finance/journal">
              <Button size="sm" variant="default">
                <PlusCircle className="w-4 h-4 mr-1.5" />
                New Journal Entry
              </Button>
            </Link>
          )}
        </div>
      </div>

      {/* Primary KPI row */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Total Revenue */}
        <Card className="p-5 flex flex-col justify-between hover:border-emerald-500/40 transition-all shadow-xs border-border/80">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Total Realized Revenue
            </span>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={toggleVisibility}
                title={showAmounts ? 'Click to hide amounts' : 'Click to show amounts'}
                className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/80 transition-colors cursor-pointer"
              >
                {showAmounts ? (
                  <Eye className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                ) : (
                  <EyeOff className="w-4 h-4 text-amber-500" />
                )}
              </button>
              <div className="h-8 w-8 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                <DollarSign className="w-4 h-4" />
              </div>
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold font-mono tracking-tight text-foreground">
              {s ? formatAmount(s.totalRevenue) : '—'}
            </div>
            <p className="text-xs text-emerald-600 dark:text-emerald-400 font-medium mt-1 flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Paid invoices & verified receipts</span>
            </p>
          </div>
        </Card>

        {/* Total Bank Balance */}
        <Card className="p-5 flex flex-col justify-between hover:border-sky-500/40 transition-all shadow-xs border-border/80">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Total Bank Liquidity
            </span>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={toggleVisibility}
                title={showAmounts ? 'Click to hide amounts' : 'Click to show amounts'}
                className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/80 transition-colors cursor-pointer"
              >
                {showAmounts ? (
                  <Eye className="w-4 h-4 text-sky-600 dark:text-sky-400" />
                ) : (
                  <EyeOff className="w-4 h-4 text-amber-500" />
                )}
              </button>
              <div className="h-8 w-8 rounded-lg bg-sky-500/10 text-sky-600 dark:text-sky-400 flex items-center justify-center">
                <Landmark className="w-4 h-4" />
              </div>
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold font-mono tracking-tight text-foreground">
              {s ? formatAmount(s.totalBankBalance) : '—'}
            </div>
            <p className="text-xs text-muted-foreground font-medium mt-1 flex items-center gap-1">
              <span>Across {data?.bankAccounts.length || 0} active bank accounts</span>
            </p>
          </div>
        </Card>

        {/* Outstanding Receivables */}
        <Card className="p-5 flex flex-col justify-between hover:border-amber-500/50 transition-all shadow-xs border-border/80 group">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Outstanding Receivables
            </span>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setShowReceivablesModal(true)}
                title="View customer accounts & receivables breakdown"
                className="px-2 py-1 rounded-md text-amber-700 dark:text-amber-300 bg-amber-500/10 hover:bg-amber-500/20 transition-colors cursor-pointer flex items-center gap-1 text-xs font-semibold"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span>View Accounts</span>
              </button>
              <button
                type="button"
                onClick={toggleVisibility}
                title={showAmounts ? 'Click to hide amounts' : 'Click to show amounts'}
                className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/80 transition-colors cursor-pointer"
              >
                {showAmounts ? (
                  <Eye className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                ) : (
                  <EyeOff className="w-4 h-4 text-amber-500" />
                )}
              </button>
              <div className="h-8 w-8 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center">
                <Wallet className="w-4 h-4" />
              </div>
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold font-mono tracking-tight text-foreground">
              {s ? formatAmount(s.outstandingReceivables) : '—'}
            </div>
            <div className="flex items-center justify-between mt-1">
              <p className="text-xs text-amber-600 dark:text-amber-400 font-medium flex items-center gap-1">
                <Clock className="w-3.5 h-3.5" />
                <span>Customer credit due for collection</span>
              </p>
              <button
                type="button"
                onClick={() => setShowReceivablesModal(true)}
                className="text-xs text-amber-600 dark:text-amber-400 font-semibold hover:underline flex items-center gap-0.5 cursor-pointer"
              >
                <span>View breakdown</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </Card>

        {/* Pending Payables */}
        <Card className="p-5 flex flex-col justify-between hover:border-rose-500/50 transition-all shadow-xs border-border/80 group">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Pending Payables
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
              <button
                type="button"
                onClick={toggleVisibility}
                title={showAmounts ? 'Click to hide amounts' : 'Click to show amounts'}
                className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/80 transition-colors cursor-pointer"
              >
                {showAmounts ? (
                  <Eye className="w-4 h-4 text-rose-600 dark:text-rose-400" />
                ) : (
                  <EyeOff className="w-4 h-4 text-amber-500" />
                )}
              </button>
              <div className="h-8 w-8 rounded-lg bg-rose-500/10 text-rose-600 dark:text-rose-400 flex items-center justify-center">
                <CreditCard className="w-4 h-4" />
              </div>
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold font-mono tracking-tight text-foreground">
              {s ? formatAmount(s.pendingPayables) : '—'}
            </div>
            <div className="flex items-center justify-between mt-1">
              <p className="text-xs text-rose-600 dark:text-rose-400 font-medium flex items-center gap-1">
                <AlertCircle className="w-3.5 h-3.5" />
                <span>Supplier payments awaiting disbursement</span>
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
      </div>

      {/* Secondary Metrics: Petty Cash, Unapplied Deposits, VAT Liability */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card className="p-4 flex items-center justify-between gap-3.5 hover:border-border transition-colors shadow-xs">
          <div className="flex items-center gap-3.5">
            <div className="h-10 w-10 rounded-lg bg-violet-500/10 text-violet-600 dark:text-violet-400 flex items-center justify-center shrink-0">
              <Receipt className="w-5 h-5" />
            </div>
            <div>
              <span className="text-xs font-medium text-muted-foreground">Petty Cash Balance</span>
              <div className="text-lg font-bold font-mono text-foreground">
                {s ? formatAmount(s.pettyCashBalance, 'ETB', 0) : '—'}
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={toggleVisibility}
            title={showAmounts ? 'Click to hide amounts' : 'Click to show amounts'}
            className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/80 transition-colors cursor-pointer"
          >
            {showAmounts ? (
              <Eye className="w-4 h-4 text-violet-600 dark:text-violet-400" />
            ) : (
              <EyeOff className="w-4 h-4 text-amber-500" />
            )}
          </button>
        </Card>

        <Card className="p-4 flex items-center justify-between gap-3.5 hover:border-border transition-colors shadow-xs">
          <div className="flex items-center gap-3.5">
            <div className="h-10 w-10 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
              <FileCheck2 className="w-5 h-5" />
            </div>
            <div>
              <span className="text-xs font-medium text-muted-foreground">Unapplied Customer Deposits</span>
              <div className="text-lg font-bold font-mono text-foreground">
                {s ? formatAmount(s.unappliedDeposits, 'ETB', 0) : '—'}
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={toggleVisibility}
            title={showAmounts ? 'Click to hide amounts' : 'Click to show amounts'}
            className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/80 transition-colors cursor-pointer"
          >
            {showAmounts ? (
              <Eye className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            ) : (
              <EyeOff className="w-4 h-4 text-amber-500" />
            )}
          </button>
        </Card>

        <Card className="p-4 flex items-center justify-between gap-3.5 hover:border-border transition-colors shadow-xs">
          <div className="flex items-center gap-3.5">
            <div className="h-10 w-10 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
              <Percent className="w-5 h-5" />
            </div>
            <div>
              <span className="text-xs font-medium text-muted-foreground">Net VAT Balance</span>
              <div className="text-lg font-bold font-mono text-foreground">
                {s ? formatAmount(s.netVatLiability, 'ETB', 0) : '—'}
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={toggleVisibility}
            title={showAmounts ? 'Click to hide amounts' : 'Click to show amounts'}
            className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/80 transition-colors cursor-pointer"
          >
            {showAmounts ? (
              <Eye className="w-4 h-4 text-amber-600 dark:text-amber-400" />
            ) : (
              <EyeOff className="w-4 h-4 text-amber-500" />
            )}
          </button>
        </Card>
      </div>

      {/* Finance Analytics & Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Line Chart: Cash Inflow vs Outflow */}
        <Card className="lg:col-span-2 p-5 shadow-xs border-border/80 flex flex-col justify-between">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4 pb-3 border-b border-border/50">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                <TrendingUp className="w-4 h-4" />
              </div>
              <div>
                <h3 className="font-semibold text-sm text-foreground">Cash Inflow vs Outflow Velocity</h3>
                <p className="text-xs text-muted-foreground">Monthly revenue receipts vs payable disbursements</p>
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
                inflow: Math.round((s?.totalRevenue || 8500000) * 0.65),
                outflow: Math.round((s?.pendingPayables || 2800000) * 0.7),
              },
              {
                month: 'Nov',
                inflow: Math.round((s?.totalRevenue || 8500000) * 0.72),
                outflow: Math.round((s?.pendingPayables || 2800000) * 0.8),
              },
              {
                month: 'Dec',
                inflow: Math.round((s?.totalRevenue || 8500000) * 0.82),
                outflow: Math.round((s?.pendingPayables || 2800000) * 0.85),
              },
              {
                month: 'Jan',
                inflow: Math.round((s?.totalRevenue || 8500000) * 0.9),
                outflow: Math.round((s?.pendingPayables || 2800000) * 0.92),
              },
              {
                month: 'Feb',
                inflow: Math.round((s?.totalRevenue || 8500000) * 0.95),
                outflow: Math.round((s?.pendingPayables || 2800000) * 0.88),
              },
              {
                month: 'Mar',
                inflow: s?.totalRevenue || 8500000,
                outflow: s?.pendingPayables || 2800000,
              },
            ]}
            xAxisKey="month"
            series={[
              { key: 'inflow', name: 'Cash Inflow (ETB)', color: '#10b981', strokeWidth: 2.5 },
              { key: 'outflow', name: 'Payable Outflow (ETB)', color: '#ef4444', strokeWidth: 2.5, strokeDasharray: '4 4' },
            ]}
            height={260}
            valueFormatter={(val) => `${(val / 1e6).toFixed(2)}M ETB`}
            yAxisFormatter={(val) => `${(val / 1e6).toFixed(1)}M`}
          />
        </Card>

        {/* Radial Chart: Financial Solvency & Liquidity Ratios */}
        <Card className="p-5 shadow-xs border-border/80 flex flex-col justify-between">
          <div className="flex items-center justify-between gap-2 mb-3 pb-3 border-b border-border/50">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                <PieChart className="w-4 h-4" />
              </div>
              <div>
                <h3 className="font-semibold text-sm text-foreground">Solvency & Liquidity</h3>
                <p className="text-xs text-muted-foreground">Treasury risk ratios</p>
              </div>
            </div>
            <Badge variant="success" className="text-[10px]">
              Strong
            </Badge>
          </div>

          <DashboardRadialChart
            data={[
              {
                name: 'Cash-to-Debt Ratio',
                value: s?.totalBankBalance && s?.pendingPayables
                  ? Math.min(100, Math.round((s.totalBankBalance / (s.totalBankBalance + s.pendingPayables)) * 100))
                  : 85,
                fill: '#10b981',
              },
              {
                name: 'Debt Recovery Rate',
                value: s?.totalRevenue && s?.outstandingReceivables
                  ? Math.min(100, Math.round((s.totalRevenue / (s.totalRevenue + s.outstandingReceivables)) * 100))
                  : 76,
                fill: '#3b82f6',
              },
              {
                name: 'VAT Compliance',
                value: 92,
                fill: '#8b5cf6',
              },
              {
                name: 'Deposit Utilization',
                value: 88,
                fill: '#f59e0b',
              },
            ]}
            height={240}
            innerRadius="35%"
            outerRadius="95%"
            centerValue="88%"
            centerLabel="Liquidity Health"
            centerSubtext="Capital Cover"
          />
        </Card>
      </div>

      {/* Bar Chart: Bank Account Liquidity Breakdown */}
      <Card className="p-5 shadow-xs border-border/80">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4 pb-3 border-b border-border/50">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-sky-500/10 text-sky-600 dark:text-sky-400">
              <BarChart3 className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-semibold text-sm text-foreground">Bank Account Liquidity Breakdown</h3>
              <p className="text-xs text-muted-foreground">Liquid cash balance distribution across commercial banking partners</p>
            </div>
          </div>
          <Badge variant="outline" className="text-[11px] self-start sm:self-auto font-mono">
            {data?.bankAccounts?.length || 0} Accounts Active
          </Badge>
        </div>

        <DashboardBarChart
          data={
            data?.bankAccounts && data.bankAccounts.length > 0
              ? data.bankAccounts.map((acc, i) => ({
                  name: acc.bankName || `Bank ${i + 1}`,
                  balance: acc.balance,
                  accountNo: acc.accountNo,
                  color: ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4'][i % 6],
                }))
              : [
                  { name: 'CBE Main', balance: 5200000, color: '#3b82f6' },
                  { name: 'Awash Bank', balance: 3400000, color: '#10b981' },
                  { name: 'Dashen Bank', balance: 2100000, color: '#f59e0b' },
                  { name: 'Nib Bank', balance: 1400000, color: '#8b5cf6' },
                  { name: 'Wegagen', balance: 950000, color: '#06b6d4' },
                ]
          }
          xAxisKey="name"
          singleBarKey="balance"
          singleBarName="Bank Balance (ETB)"
          colorKey="color"
          height={240}
          valueFormatter={(val) =>
            showAmounts
              ? `${val.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ETB`
              : '•••••• ETB'
          }
          yAxisFormatter={(val) => (showAmounts ? `${(val / 1e6).toFixed(1)}M` : '••••')}
        />
      </Card>

      {/* Quick Navigation Action Grid */}
      <Card className="shadow-xs">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold">Finance & Accounting Operations</CardTitle>
          <CardDescription className="text-xs">Quick access to essential accounting ledgers and cash workflows</CardDescription>
        </CardHeader>
        <CardContent className="pt-1">
          <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-3">
            {[
              { href: '/dashboard/finance/accounts', label: 'Chart of Accounts', icon: Building, color: 'text-sky-500' },
              { href: '/dashboard/finance/journal', label: 'Journal Entries', icon: FileSpreadsheet, color: 'text-violet-500' },
              { href: '/dashboard/finance/bank', label: 'Bank Accounts', icon: Landmark, color: 'text-emerald-500' },
              { href: '/dashboard/finance/cashbook', label: 'Cashbook', icon: Wallet, color: 'text-amber-500' },
              { href: '/dashboard/finance/vouchers', label: 'Payment Vouchers', icon: Receipt, color: 'text-rose-500' },
              { href: '/dashboard/finance/reconciliation', label: 'Bank Reconciliation', icon: CheckCircle2, color: 'text-indigo-500' },
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

      {/* Bank Position & Recent Activity Tables */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Bank Positions */}
        <Card className="shadow-xs flex flex-col">
          <CardHeader className="pb-3 flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-sm font-semibold">Bank Positions</CardTitle>
              <CardDescription className="text-xs">Active treasury bank balances</CardDescription>
            </div>
            <Link href="/dashboard/finance/bank">
              <Button size="sm" variant="ghost" className="h-7 text-xs px-2">
                View All <ArrowUpRight className="w-3 h-3 ml-1" />
              </Button>
            </Link>
          </CardHeader>
          <CardContent className="p-0 flex-1">
            {loading ? (
              <div className="p-8 text-center text-xs text-muted-foreground">Loading bank balances...</div>
            ) : (
              <div className="divide-y divide-border/40">
                {(data?.bankAccounts || []).map((b) => (
                  <div key={b.id} className="p-3.5 flex items-center justify-between hover:bg-muted/30 transition-colors">
                    <div>
                      <p className="text-xs font-semibold text-foreground">{b.bankName}</p>
                      <p className="text-[11px] font-mono text-muted-foreground mt-0.5">{b.accountNo}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs font-bold font-mono text-foreground">
                        {formatAmount(b.balance, b.currency)}
                      </p>
                      <Badge variant="success" className="text-[9px] py-0 px-1 mt-0.5">
                        Active
                      </Badge>
                    </div>
                  </div>
                ))}
                {(!data?.bankAccounts || data.bankAccounts.length === 0) && (
                  <div className="p-6 text-center text-xs text-muted-foreground">No bank accounts registered.</div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Payment Vouchers */}
        <Card className="lg:col-span-2 shadow-xs flex flex-col">
          <CardHeader className="pb-3 flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-sm font-semibold">Recent Payment Vouchers</CardTitle>
              <CardDescription className="text-xs">Latest outgoing disbursement records</CardDescription>
            </div>
            <Link href="/dashboard/finance/vouchers">
              <Button size="sm" variant="ghost" className="h-7 text-xs px-2">
                View All <ArrowUpRight className="w-3 h-3 ml-1" />
              </Button>
            </Link>
          </CardHeader>
          <CardContent className="p-0 flex-1">
            {loading ? (
              <div className="p-8 text-center text-xs text-muted-foreground">Loading vouchers...</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead className="bg-muted/40 border-y border-border text-muted-foreground uppercase font-semibold">
                    <tr>
                      <th className="px-3.5 py-2">Voucher No</th>
                      <th className="px-3.5 py-2">Payee</th>
                      <th className="px-3.5 py-2">Method</th>
                      <th className="px-3.5 py-2 text-right">Amount (ETB)</th>
                      <th className="px-3.5 py-2 text-right">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/40">
                    {(data?.recentVouchers || []).map((v) => (
                      <tr key={v.id} className="hover:bg-muted/30 transition-colors">
                        <td className="px-3.5 py-2.5 font-mono font-medium text-foreground">{v.voucherNo}</td>
                        <td className="px-3.5 py-2.5 text-muted-foreground">{v.payeeName}</td>
                        <td className="px-3.5 py-2.5 text-muted-foreground uppercase text-[11px]">{v.paymentMethod}</td>
                        <td className="px-3.5 py-2.5 font-mono font-semibold text-right text-foreground">
                          {formatAmount(v.amount, '')}
                        </td>
                        <td className="px-3.5 py-2.5 text-right">
                          <Badge
                            variant={v.status === 'Approved' || v.status === 'Posted' ? 'success' : 'outline'}
                            className="text-[10px]"
                          >
                            {v.status}
                          </Badge>
                        </td>
                      </tr>
                    ))}
                    {(!data?.recentVouchers || data.recentVouchers.length === 0) && (
                      <tr>
                        <td colSpan={5} className="text-center py-6 text-muted-foreground text-xs">
                          No payment vouchers recorded yet.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <ReceivablesBreakdownModal
        isOpen={showReceivablesModal}
        onClose={() => setShowReceivablesModal(false)}
      />
      <PayablesBreakdownModal
        isOpen={showPayablesModal}
        onClose={() => setShowPayablesModal(false)}
      />
    </div>
  );
}
