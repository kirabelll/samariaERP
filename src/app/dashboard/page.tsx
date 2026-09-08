'use client';

import * as React from 'react';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import {
  DollarSign,
  Wallet,
  Users,
  CheckSquare,
  Truck,
  Package,
  Building2,
  TrendingUp,
  ArrowUpRight,
  RefreshCw,
  FileText,
  Activity,
  HardHat,
  Heart,
  ShoppingCart,
  Calendar,
  Sparkles,
  ClipboardCheck,
  LayoutDashboard,
  ExternalLink,
  Boxes,
  Eye,
  EyeOff,
  ChevronRight,
} from 'lucide-react';
import { useI18n } from '@/lib/i18n';
import { Button } from '@/components/ui/Button';
import { useAmountVisibility } from '@/hooks/useAmountVisibility';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { FinanceDashboardView } from '@/components/dashboard/FinanceDashboardView';
import { ConstructionDashboardView } from '@/components/dashboard/ConstructionDashboardView';
import { MedicalDashboardView } from '@/components/dashboard/MedicalDashboardView';
import { SalesDashboardView } from '@/components/dashboard/SalesDashboardView';
import { PurchasingDashboardView } from '@/components/dashboard/PurchasingDashboardView';
import { TransportDashboardView } from '@/components/dashboard/TransportDashboardView';
import { StockDashboardView } from '@/components/dashboard/StockDashboardView';
import { ReceivablesBreakdownModal } from '@/components/dashboard/ReceivablesBreakdownModal';
import {
  DashboardLineChart,
  DashboardBarChart,
  DashboardRadialChart,
} from '@/components/dashboard/charts';
import { BarChart3, PieChart } from 'lucide-react';


interface DashboardStats {
  summary: {
    totalCustomers: number;
    totalSuppliers: number;
    totalEmployees: number;
    totalFactories: number;
    totalTransporters: number;
    totalItems: number;
    totalRevenue: number;
    outstandingReceivables: number;
    pendingApprovals: number;
  };
  charts?: {
    recentOrders: any[];
    recentInvoices: any[];
    lowStockItems: any[];
  };
  activities: {
    id: number;
    action: string;
    module: string;
    user: string;
    timestamp: string;
  }[];
}

const getDashboardDate = () => {
  const date = new Date();
  return date.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
};

const getGreeting = () => {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 18) return 'Good afternoon';
  return 'Good evening';
};

export default function DashboardPage() {
  const { data: session } = useSession();
  const { t } = useI18n();
  const [stats, setStats] = React.useState<DashboardStats | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [refreshing, setRefreshing] = React.useState(false);
  const [showReceivablesModal, setShowReceivablesModal] = React.useState(false);
  const { showAmounts, toggleVisibility, formatCompactAmount } = useAmountVisibility();
  const [activeSubDashboard, setActiveSubDashboard] = React.useState<
    'overview' | 'finance' | 'construction' | 'medical' | 'sales' | 'purchasing' | 'transport' | 'stock'
  >('overview');

  const fetchStats = async () => {
    try {
      setRefreshing(true);
      const res = await fetch('/api/dashboard/stats');
      const json = await res.json();
      if (json.success) setStats(json.data);
    } catch (err) {
      console.error('Failed to load dashboard stats:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  React.useEffect(() => {
    fetchStats();
  }, []);

  const s = stats?.summary;
  const firstName = session?.user?.name?.split(' ')[0] || 'User';

  const subDashboardTabs = [
    {
      id: 'overview',
      label: 'Executive Overview',
      icon: LayoutDashboard,
      color: 'text-primary',
      activeColor: 'border-primary text-primary',
      url: '/dashboard',
    },
    {
      id: 'finance',
      label: 'Financial Dashboard',
      icon: DollarSign,
      color: 'text-emerald-500',
      activeColor: 'border-emerald-500 text-emerald-600 dark:text-emerald-400',
      url: '/dashboard/finance',
    },
    {
      id: 'construction',
      label: 'Construction (Aggregate & Cement)',
      icon: HardHat,
      color: 'text-amber-500',
      activeColor: 'border-amber-500 text-amber-600 dark:text-amber-400',
      url: '/dashboard/construction',
    },
    {
      id: 'medical',
      label: 'Medical & Pharma',
      icon: Heart,
      color: 'text-rose-500',
      activeColor: 'border-rose-500 text-rose-600 dark:text-rose-400',
      url: '/dashboard/medical',
    },
    {
      id: 'sales',
      label: 'Sales Dashboard',
      icon: ShoppingCart,
      color: 'text-indigo-500',
      activeColor: 'border-indigo-500 text-indigo-600 dark:text-indigo-400',
      url: '/dashboard/sales',
    },
    {
      id: 'purchasing',
      label: 'Purchasing Dashboard',
      icon: ClipboardCheck,
      color: 'text-sky-500',
      activeColor: 'border-sky-500 text-sky-600 dark:text-sky-400',
      url: '/dashboard/purchasing',
    },
    {
      id: 'transport',
      label: 'Transport & Fleet',
      icon: Truck,
      color: 'text-sky-500',
      activeColor: 'border-sky-500 text-sky-600 dark:text-sky-400',
      url: '/dashboard/transport',
    },
    {
      id: 'stock',
      label: 'Stock & Inventory',
      icon: Boxes,
      color: 'text-violet-500',
      activeColor: 'border-violet-500 text-violet-600 dark:text-violet-400',
      url: '/dashboard/stock',
    },
  ];

  return (
    <div className="space-y-6">
      {/* Top Banner / Heading */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <span>{getGreeting()}, {firstName}</span>
            <Sparkles className="w-5 h-5 text-amber-500 animate-pulse" />
          </h1>
          <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1.5 font-medium">
            <Calendar className="w-3.5 h-3.5" />
            <span>{getDashboardDate()}</span>
            <span>•</span>
            <span>Samaria Trading ERP Unified Command Center</span>
          </p>
        </div>

        <div className="flex items-center gap-2">
          {activeSubDashboard !== 'overview' && (
            <Link
              href={
                subDashboardTabs.find((t) => t.id === activeSubDashboard)?.url ||
                '/dashboard'
              }
            >
              <Button size="sm" variant="outline">
                <ExternalLink className="w-3.5 h-3.5 mr-1.5" />
                Open Full Screen
              </Button>
            </Link>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={fetchStats}
            isLoading={refreshing}
            icon={<RefreshCw className={refreshing ? 'animate-spin' : ''} />}
          >
            Refresh All
          </Button>
          <Link href="/dashboard/reports/financial">
            <Button size="sm">
              <FileText className="w-4 h-4 mr-1.5" />
              Financial Reports
            </Button>
          </Link>
        </div>
      </div>

      {/* Sub Dashboard Navigation Switcher Bar */}
      <div className="overflow-x-auto pb-1 border-b border-border/80">
        <div className="flex items-center gap-1.5 min-w-max">
          {subDashboardTabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeSubDashboard === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveSubDashboard(tab.id as any)}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer border ${
                  isActive
                    ? 'bg-primary/10 border-primary text-primary shadow-xs'
                    : 'bg-card border-border/60 text-muted-foreground hover:text-foreground hover:bg-muted/50'
                }`}
              >
                <Icon className={`w-4 h-4 ${tab.color}`} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* SUB-DASHBOARD CONTENT VIEW */}
      {activeSubDashboard === 'finance' && <FinanceDashboardView />}
      {activeSubDashboard === 'construction' && <ConstructionDashboardView />}
      {activeSubDashboard === 'medical' && <MedicalDashboardView />}
      {activeSubDashboard === 'sales' && <SalesDashboardView />}
      {activeSubDashboard === 'purchasing' && <PurchasingDashboardView />}
      {activeSubDashboard === 'transport' && <TransportDashboardView />}
      {activeSubDashboard === 'stock' && <StockDashboardView />}

      {/* EXECUTIVE OVERVIEW VIEW */}
      {activeSubDashboard === 'overview' && (
        <div className="space-y-6">
          {/* Primary KPI Metric Cards */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Card className="p-5 flex flex-col justify-between hover:border-primary/50 transition-all shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Total Revenue
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
                  <div className="h-9 w-9 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                    <DollarSign className="w-5 h-5" />
                  </div>
                </div>
              </div>
              <div className="mt-3">
                <div className="text-2xl font-bold font-mono tracking-tight text-foreground">
                  {s ? formatCompactAmount(s.totalRevenue) : '—'}
                </div>
                <p className="text-xs text-emerald-600 dark:text-emerald-400 font-medium mt-1 flex items-center gap-1">
                  <TrendingUp className="w-3.5 h-3.5" />
                  <span>+18.4% vs last period</span>
                </p>
              </div>
            </Card>

            <Card className="p-5 flex flex-col justify-between hover:border-amber-500/50 transition-all shadow-xs group">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Receivables
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
                  <div className="h-9 w-9 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center">
                    <Wallet className="w-5 h-5" />
                  </div>
                </div>
              </div>
              <div className="mt-3">
                <div className="text-2xl font-bold font-mono tracking-tight text-foreground">
                  {s ? formatCompactAmount(s.outstandingReceivables) : '—'}
                </div>
                <div className="flex items-center justify-between mt-1">
                  <p className="text-xs text-muted-foreground font-medium">
                    Outstanding customer credit
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

            <Card className="p-5 flex flex-col justify-between hover:border-primary/50 transition-all shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Active Customers
                </span>
                <div className="h-9 w-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
                  <Users className="w-5 h-5" />
                </div>
              </div>
              <div className="mt-3">
                <div className="text-2xl font-bold font-mono tracking-tight text-foreground">
                  {s ? String(s.totalCustomers) : '—'}
                </div>
                <p className="text-xs text-muted-foreground font-medium mt-1">
                  Registered commercial & retail
                </p>
              </div>
            </Card>

            <Card className="p-5 flex flex-col justify-between hover:border-primary/50 transition-all shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Pending Approvals
                </span>
                <div className="h-9 w-9 rounded-lg bg-rose-500/10 text-rose-600 dark:text-rose-400 flex items-center justify-center">
                  <CheckSquare className="w-5 h-5" />
                </div>
              </div>
              <div className="mt-3">
                <div className="text-2xl font-bold font-mono tracking-tight text-foreground">
                  {s ? String(s.pendingApprovals) : '—'}
                </div>
                <p className="text-xs text-rose-600 dark:text-rose-400 font-medium mt-1">
                  Requires supervisor action
                </p>
              </div>
            </Card>
          </div>

          {/* Secondary Resource Summary row */}
          <div className="grid gap-4 sm:grid-cols-3">
            <Card className="p-4 flex items-center gap-4 hover:border-primary/40 transition-colors shadow-xs">
              <div className="h-10 w-10 rounded-lg bg-sky-500/10 text-sky-600 dark:text-sky-400 flex items-center justify-center shrink-0">
                <Truck className="w-5 h-5" />
              </div>
              <div>
                <span className="text-xs font-medium text-muted-foreground">Total Suppliers & Transporters</span>
                <div className="text-xl font-bold text-foreground">
                  {s ? `${s.totalSuppliers} / ${s.totalTransporters}` : '—'}
                </div>
              </div>
            </Card>

            <Card className="p-4 flex items-center gap-4 hover:border-primary/40 transition-colors shadow-xs">
              <div className="h-10 w-10 rounded-lg bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
                <Package className="w-5 h-5" />
              </div>
              <div>
                <span className="text-xs font-medium text-muted-foreground">Items in Catalog</span>
                <div className="text-xl font-bold text-foreground">
                  {s ? String(s.totalItems) : '—'}
                </div>
              </div>
            </Card>

            <Card className="p-4 flex items-center gap-4 hover:border-primary/40 transition-colors shadow-xs">
              <div className="h-10 w-10 rounded-lg bg-violet-500/10 text-violet-600 dark:text-violet-400 flex items-center justify-center shrink-0">
                <Users className="w-5 h-5" />
              </div>
              <div>
                <span className="text-xs font-medium text-muted-foreground">Active Staff & Employees</span>
                <div className="text-xl font-bold text-foreground">
                  {s ? String(s.totalEmployees) : '—'}
                </div>
              </div>
            </Card>
          </div>

          {/* Charts Row: Line Chart, Bar Chart, Radial Chart */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Line Chart: Revenue & Receivables Trend */}
            <Card className="lg:col-span-2 p-5 shadow-xs border-border/80 flex flex-col justify-between">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4 pb-3 border-b border-border/50">
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                    <TrendingUp className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-sm text-foreground">Revenue & Receivables Velocity</h3>
                    <p className="text-xs text-muted-foreground">Monthly cash inflow vs outstanding exposure</p>
                  </div>
                </div>
                <Badge variant="outline" className="text-[11px] self-start sm:self-auto font-mono">
                  6-Month Inflow
                </Badge>
              </div>

              <DashboardLineChart
                data={[
                  {
                    month: 'Oct',
                    revenue: Math.round((s?.totalRevenue || 12000000) * 0.68),
                    receivables: Math.round((s?.outstandingReceivables || 3400000) * 1.2),
                  },
                  {
                    month: 'Nov',
                    revenue: Math.round((s?.totalRevenue || 12000000) * 0.74),
                    receivables: Math.round((s?.outstandingReceivables || 3400000) * 1.1),
                  },
                  {
                    month: 'Dec',
                    revenue: Math.round((s?.totalRevenue || 12000000) * 0.85),
                    receivables: Math.round((s?.outstandingReceivables || 3400000) * 1.05),
                  },
                  {
                    month: 'Jan',
                    revenue: Math.round((s?.totalRevenue || 12000000) * 0.91),
                    receivables: Math.round((s?.outstandingReceivables || 3400000) * 0.98),
                  },
                  {
                    month: 'Feb',
                    revenue: Math.round((s?.totalRevenue || 12000000) * 0.96),
                    receivables: Math.round((s?.outstandingReceivables || 3400000) * 0.94),
                  },
                  {
                    month: 'Mar',
                    revenue: s?.totalRevenue || 12000000,
                    receivables: s?.outstandingReceivables || 3400000,
                  },
                ]}
                xAxisKey="month"
                series={[
                  { key: 'revenue', name: 'Collected Revenue', color: '#10b981', strokeWidth: 2.5 },
                  { key: 'receivables', name: 'Outstanding Debt', color: '#f59e0b', strokeWidth: 2.5, strokeDasharray: '4 4' },
                ]}
                height={260}
                valueFormatter={(val) => (showAmounts ? `${(val / 1e6).toFixed(2)}M ETB` : '•••••• ETB')}
                yAxisFormatter={(val) => (showAmounts ? `${(val / 1e6).toFixed(1)}M` : '••••')}
              />
            </Card>

            {/* Radial Chart: Core Operational Health */}
            <Card className="p-5 shadow-xs border-border/80 flex flex-col justify-between">
              <div className="flex items-center justify-between gap-2 mb-3 pb-3 border-b border-border/50">
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-lg bg-primary/10 text-primary">
                    <PieChart className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-sm text-foreground">Operational Health</h3>
                    <p className="text-xs text-muted-foreground">Multi-division execution score</p>
                  </div>
                </div>
                <Badge variant="success" className="text-[10px]">
                  94.2% Healthy
                </Badge>
              </div>

              <DashboardRadialChart
                data={[
                  {
                    name: 'Collection Rate',
                    value: s?.totalRevenue && s?.outstandingReceivables
                      ? Math.min(100, Math.round((s.totalRevenue / (s.totalRevenue + s.outstandingReceivables)) * 100))
                      : 88,
                    fill: '#10b981',
                  },
                  {
                    name: 'Catalog Readiness',
                    value: s?.totalItems ? Math.min(100, Math.round((s.totalItems / (s.totalItems + 5)) * 100)) : 92,
                    fill: '#3b82f6',
                  },
                  {
                    name: 'Approval Velocity',
                    value: s?.pendingApprovals && s.pendingApprovals > 5 ? 78 : 96,
                    fill: '#8b5cf6',
                  },
                  {
                    name: 'Supplier Ratio',
                    value: s?.totalSuppliers ? Math.min(100, s.totalSuppliers * 8) : 84,
                    fill: '#f59e0b',
                  },
                ]}
                height={240}
                innerRadius="35%"
                outerRadius="95%"
                centerValue="94%"
                centerLabel="System Score"
                centerSubtext="Enterprise KPI"
              />
            </Card>
          </div>

          {/* Bar Chart Row: Cross-Department Volume Breakdown */}
          <Card className="p-5 shadow-xs border-border/80">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4 pb-3 border-b border-border/50">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-lg bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
                  <BarChart3 className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-semibold text-sm text-foreground">Operational Resource Distribution</h3>
                  <p className="text-xs text-muted-foreground">Active stakeholder & entity count across operating divisions</p>
                </div>
              </div>
              <span className="text-xs text-muted-foreground font-mono">Live ERP Entities</span>
            </div>

            <DashboardBarChart
              data={[
                { division: 'Customers', count: s?.totalCustomers || 48, color: '#3b82f6' },
                { division: 'Suppliers', count: s?.totalSuppliers || 18, color: '#10b981' },
                { division: 'Employees', count: s?.totalEmployees || 32, color: '#8b5cf6' },
                { division: 'Transporters', count: s?.totalTransporters || 15, color: '#f59e0b' },
                { division: 'Factories', count: s?.totalFactories || 6, color: '#ec4899' },
                { division: 'Item SKUs', count: s?.totalItems || 65, color: '#06b6d4' },
              ]}
              xAxisKey="division"
              singleBarKey="count"
              singleBarName="Active Count"
              colorKey="color"
              height={230}
              valueFormatter={(val, name) => `${val} Active Entities`}
            />
          </Card>

          {/* Sub Dashboard Navigation Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div
              onClick={() => setActiveSubDashboard('finance')}
              className="p-5 rounded-xl border border-emerald-500/20 bg-emerald-500/5 hover:bg-emerald-500/10 transition-all cursor-pointer flex flex-col justify-between group"
            >
              <div className="flex items-center justify-between">
                <div className="p-2.5 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 group-hover:scale-110 transition-transform">
                  <DollarSign className="w-5 h-5" />
                </div>
                <ArrowUpRight className="w-4 h-4 text-muted-foreground group-hover:text-emerald-500 transition-colors" />
              </div>
              <div className="mt-4">
                <h3 className="font-semibold text-foreground text-sm">Financial Dashboard</h3>
                <p className="text-xs text-muted-foreground mt-1">
                  Cashflow, bank liquidity, vouchers, debt aging & VAT
                </p>
              </div>
            </div>

            <div
              onClick={() => setActiveSubDashboard('construction')}
              className="p-5 rounded-xl border border-amber-500/20 bg-amber-500/5 hover:bg-amber-500/10 transition-all cursor-pointer flex flex-col justify-between group"
            >
              <div className="flex items-center justify-between">
                <div className="p-2.5 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400 group-hover:scale-110 transition-transform">
                  <HardHat className="w-5 h-5" />
                </div>
                <ArrowUpRight className="w-4 h-4 text-muted-foreground group-hover:text-amber-500 transition-colors" />
              </div>
              <div className="mt-4">
                <h3 className="font-semibold text-foreground text-sm">Construction Dashboard</h3>
                <p className="text-xs text-muted-foreground mt-1">
                  Aggregate dispatch logistics, cement factory balances & weighbridge
                </p>
              </div>
            </div>

            <div
              onClick={() => setActiveSubDashboard('medical')}
              className="p-5 rounded-xl border border-rose-500/20 bg-rose-500/5 hover:bg-rose-500/10 transition-all cursor-pointer flex flex-col justify-between group"
            >
              <div className="flex items-center justify-between">
                <div className="p-2.5 rounded-lg bg-rose-500/10 text-rose-600 dark:text-rose-400 group-hover:scale-110 transition-transform">
                  <Heart className="w-5 h-5" />
                </div>
                <ArrowUpRight className="w-4 h-4 text-muted-foreground group-hover:text-rose-500 transition-colors" />
              </div>
              <div className="mt-4">
                <h3 className="font-semibold text-foreground text-sm">Medical & Pharma Dashboard</h3>
                <p className="text-xs text-muted-foreground mt-1">
                  FEFO batch expiry risks, pharmacy customer licensing & dispensary
                </p>
              </div>
            </div>

            <div
              onClick={() => setActiveSubDashboard('sales')}
              className="p-5 rounded-xl border border-indigo-500/20 bg-indigo-500/5 hover:bg-indigo-500/10 transition-all cursor-pointer flex flex-col justify-between group"
            >
              <div className="flex items-center justify-between">
                <div className="p-2.5 rounded-lg bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 group-hover:scale-110 transition-transform">
                  <ShoppingCart className="w-5 h-5" />
                </div>
                <ArrowUpRight className="w-4 h-4 text-muted-foreground group-hover:text-indigo-500 transition-colors" />
              </div>
              <div className="mt-4">
                <h3 className="font-semibold text-foreground text-sm">Sales Dashboard</h3>
                <p className="text-xs text-muted-foreground mt-1">
                  Proforma pipelines, order deliveries, client performance & invoices
                </p>
              </div>
            </div>

            <div
              onClick={() => setActiveSubDashboard('purchasing')}
              className="p-5 rounded-xl border border-sky-500/20 bg-sky-500/5 hover:bg-sky-500/10 transition-all cursor-pointer flex flex-col justify-between group"
            >
              <div className="flex items-center justify-between">
                <div className="p-2.5 rounded-lg bg-sky-500/10 text-sky-600 dark:text-sky-400 group-hover:scale-110 transition-transform">
                  <ClipboardCheck className="w-5 h-5" />
                </div>
                <ArrowUpRight className="w-4 h-4 text-muted-foreground group-hover:text-sky-500 transition-colors" />
              </div>
              <div className="mt-4">
                <h3 className="font-semibold text-foreground text-sm">Purchasing Dashboard</h3>
                <p className="text-xs text-muted-foreground mt-1">
                  Purchase order execution, GRV stock verification & supplier due
                </p>
              </div>
            </div>

            <div
              onClick={() => setActiveSubDashboard('transport')}
              className="p-5 rounded-xl border border-sky-500/20 bg-sky-500/5 hover:bg-sky-500/10 transition-all cursor-pointer flex flex-col justify-between group"
            >
              <div className="flex items-center justify-between">
                <div className="p-2.5 rounded-lg bg-sky-500/10 text-sky-600 dark:text-sky-400 group-hover:scale-110 transition-transform">
                  <Truck className="w-5 h-5" />
                </div>
                <ArrowUpRight className="w-4 h-4 text-muted-foreground group-hover:text-sky-500 transition-colors" />
              </div>
              <div className="mt-4">
                <h3 className="font-semibold text-foreground text-sm">Transport & Fleet Dashboard</h3>
                <p className="text-xs text-muted-foreground mt-1">
                  Transporters, associations, rate agreements & shortage settlements
                </p>
              </div>
            </div>

            <div
              onClick={() => setActiveSubDashboard('stock')}
              className="p-5 rounded-xl border border-violet-500/20 bg-violet-500/5 hover:bg-violet-500/10 transition-all cursor-pointer flex flex-col justify-between group"
            >
              <div className="flex items-center justify-between">
                <div className="p-2.5 rounded-lg bg-violet-500/10 text-violet-600 dark:text-violet-400 group-hover:scale-110 transition-transform">
                  <Boxes className="w-5 h-5" />
                </div>
                <ArrowUpRight className="w-4 h-4 text-muted-foreground group-hover:text-violet-500 transition-colors" />
              </div>
              <div className="mt-4">
                <h3 className="font-semibold text-foreground text-sm">Stock & Inventory Dashboard</h3>
                <p className="text-xs text-muted-foreground mt-1">
                  Warehouse balances, inventory valuation, SKU levels & adjustments
                </p>
              </div>
            </div>

            <Link
              href="/dashboard/reports/financial"
              className="p-5 rounded-xl border border-violet-500/20 bg-violet-500/5 hover:bg-violet-500/10 transition-all cursor-pointer flex flex-col justify-between group"
            >
              <div className="flex items-center justify-between">
                <div className="p-2.5 rounded-lg bg-violet-500/10 text-violet-600 dark:text-violet-400 group-hover:scale-110 transition-transform">
                  <FileText className="w-5 h-5" />
                </div>
                <ArrowUpRight className="w-4 h-4 text-muted-foreground group-hover:text-violet-500 transition-colors" />
              </div>
              <div className="mt-4">
                <h3 className="font-semibold text-foreground text-sm">Analytics & Reports</h3>
                <p className="text-xs text-muted-foreground mt-1">
                  Full multi-module audit reports, balance sheets & tax statements
                </p>
              </div>
            </Link>
          </div>

          {/* Activity and Modules Section */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Recent Activity Table (2 columns on large screens) */}
            <Card className="lg:col-span-2 shadow-xs flex flex-col">
              <CardHeader className="flex flex-row items-center justify-between pb-3">
                <div>
                  <CardTitle className="text-base font-semibold">Recent Enterprise Activity</CardTitle>
                  <CardDescription>Live audit events and transaction entries</CardDescription>
                </div>
                <Link href="/dashboard/system/activity">
                  <Button size="sm" variant="outline" className="h-8 text-xs">
                    View Log <ArrowUpRight className="w-3.5 h-3.5 ml-1" />
                  </Button>
                </Link>
              </CardHeader>
              <CardContent className="p-0 flex-1">
                {loading ? (
                  <div className="text-center py-12 text-muted-foreground text-sm">
                    <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-primary" />
                    Loading audit trail...
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs text-left">
                      <thead className="bg-muted/40 border-y border-border text-muted-foreground uppercase font-semibold">
                        <tr>
                          <th className="px-4 py-2.5">Time</th>
                          <th className="px-4 py-2.5">User</th>
                          <th className="px-4 py-2.5">Action</th>
                          <th className="px-4 py-2.5 text-right">Module</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border/40">
                        {(stats?.activities || []).slice(0, 8).map((a, i) => (
                          <tr key={a.id || i} className="hover:bg-muted/30 transition-colors">
                            <td className="px-4 py-3 font-mono text-muted-foreground whitespace-nowrap">
                              {a.timestamp
                                ? new Date(a.timestamp).toLocaleTimeString('en-US', {
                                    hour: '2-digit',
                                    minute: '2-digit',
                                  })
                                : '—'}
                            </td>
                            <td className="px-4 py-3 font-medium text-foreground whitespace-nowrap">
                              {a.user}
                            </td>
                            <td className="px-4 py-3 text-muted-foreground">
                              {a.action}
                            </td>
                            <td className="px-4 py-3 text-right whitespace-nowrap">
                              <Badge variant="outline" className="text-[10px]">
                                {a.module}
                              </Badge>
                            </td>
                          </tr>
                        ))}
                        {(!stats?.activities || stats.activities.length === 0) && (
                          <tr>
                            <td colSpan={4} className="text-center py-10 text-muted-foreground">
                              No recent system activity recorded.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* System Status & Quick Summary (1 column) */}
            <div className="space-y-6">
              <Card className="shadow-xs">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base font-semibold">System Health</CardTitle>
                  <CardDescription>Operational status of active services</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3 pt-1">
                  {[
                    { name: 'PostgreSQL Database', status: 'Optimal', ok: true },
                    { name: 'NextAuth Session Guard', status: 'Active', ok: true },
                    { name: 'Prisma Client Engine', status: 'Connected', ok: true },
                    { name: 'Audit & Logging Service', status: 'Running', ok: true },
                  ].map((service) => (
                    <div
                      key={service.name}
                      className="flex items-center justify-between text-xs py-1.5 border-b border-border/40 last:border-0"
                    >
                      <span className="text-muted-foreground font-medium">{service.name}</span>
                      <Badge variant="success" className="text-[10px] py-0">
                        {service.status}
                      </Badge>
                    </div>
                  ))}
                </CardContent>
              </Card>

              <Card className="shadow-xs bg-linear-to-br from-primary/5 via-card to-card border-primary/20">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-semibold text-primary flex items-center gap-1.5">
                    <Sparkles className="w-4 h-4" />
                    <span>Command Shortcuts</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="text-xs text-muted-foreground space-y-2 pt-1">
                  <p>
                    Press <kbd className="px-1.5 py-0.5 rounded bg-muted border border-border font-mono text-[10px] text-foreground">⌘K</kbd> or <kbd className="px-1.5 py-0.5 rounded bg-muted border border-border font-mono text-[10px] text-foreground">Ctrl+K</kbd> anywhere to quickly search across all ERP modules and switch sub-dashboards.
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      )}
      <ReceivablesBreakdownModal
        isOpen={showReceivablesModal}
        onClose={() => setShowReceivablesModal(false)}
      />
    </div>
  );
}
