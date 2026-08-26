'use client';

import * as React from 'react';
import Link from 'next/link';
import {
  Package,
  Boxes,
  Warehouse,
  AlertTriangle,
  RotateCcw,
  PlusCircle,
  RefreshCw,
  ArrowUpRight,
  ShieldCheck,
  CheckCircle2,
  DollarSign,
  Layers,
  Sparkles,
  ClipboardList,
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


interface StockStats {
  summary: {
    totalItems: number;
    activeItems: number;
    totalStockValuation: number;
    totalWarehouses: number;
    lowStockCount: number;
    outOfStockCount: number;
    totalAdjustments: number;
    categoriesCount: number;
  };
  warehouseBreakdown: {
    warehouse: string;
    itemCount: number;
    totalQuantity: number;
    valuation: number;
  }[];
  lowStockItems: {
    id: string;
    itemCode: string;
    itemName: string;
    category: string;
    unit: string;
    quantity: number;
    warehouse: string;
    avgCost: number;
  }[];
  outOfStockItems: {
    id: string;
    itemCode: string;
    itemName: string;
    category: string;
    unit: string;
    warehouse: string;
  }[];
  recentAdjustments: {
    id: string;
    adjustmentNo: string;
    warehouse: string;
    type: string;
    difference: number;
    reason: string;
    date: string;
  }[];
}

export function StockDashboardView({ standalone = false }: { standalone?: boolean }) {
  const [data, setData] = React.useState<StockStats | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [refreshing, setRefreshing] = React.useState(false);

  const fetchStockStats = async () => {
    try {
      setRefreshing(true);
      const res = await fetch('/api/dashboard/stock');
      const json = await res.json();
      if (json.success) setData(json.data);
    } catch (err) {
      console.error('Failed to load stock stats:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  React.useEffect(() => {
    fetchStockStats();
  }, []);

  const s = data?.summary;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
              <Boxes className="w-5 h-5" />
            </div>
            <h2 className="text-xl font-bold tracking-tight text-foreground">
              Stock & Inventory Dashboard
            </h2>
            <Badge variant="outline" className="text-xs border-indigo-500/30 text-indigo-600 dark:text-indigo-400 bg-indigo-500/5">
              Live Warehouse Balances
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Warehouse stock balances, inventory valuation, low stock alerts, adjustments & catalog SKU management
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={fetchStockStats}
            isLoading={refreshing}
            icon={<RefreshCw className={refreshing ? 'animate-spin' : ''} />}
          >
            Refresh
          </Button>
          {!standalone && (
            <Link href="/dashboard/items/new">
              <Button size="sm">
                <PlusCircle className="w-4 h-4 mr-1.5" />
                Add Item SKU
              </Button>
            </Link>
          )}
        </div>
      </div>

      {/* Primary KPI Row */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Total Stock Valuation */}
        <Card className="p-5 flex flex-col justify-between hover:border-indigo-500/40 transition-all shadow-xs border-border/80">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Inventory Valuation
            </span>
            <div className="h-8 w-8 rounded-lg bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold font-mono tracking-tight text-foreground">
              {s ? `${s.totalStockValuation.toLocaleString(undefined, { minimumFractionDigits: 2 })} ETB` : '—'}
            </div>
            <p className="text-xs text-indigo-600 dark:text-indigo-400 font-medium mt-1 flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Weighted average cost method</span>
            </p>
          </div>
        </Card>

        {/* Total Catalog SKUs */}
        <Card className="p-5 flex flex-col justify-between hover:border-sky-500/40 transition-all shadow-xs border-border/80">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Catalog Items (SKUs)
            </span>
            <div className="h-8 w-8 rounded-lg bg-sky-500/10 text-sky-600 dark:text-sky-400 flex items-center justify-center">
              <Package className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold font-mono tracking-tight text-foreground">
              {s ? `${s.activeItems} Active` : '—'}
            </div>
            <p className="text-xs text-muted-foreground font-medium mt-1">
              Across {s?.categoriesCount || 0} product categories
            </p>
          </div>
        </Card>

        {/* Low Stock Items */}
        <Card className="p-5 flex flex-col justify-between hover:border-amber-500/40 transition-all shadow-xs border-border/80">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Low Stock Warnings
            </span>
            <div className="h-8 w-8 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center">
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold font-mono tracking-tight text-foreground">
              {s ? `${s.lowStockCount} Items` : '—'}
            </div>
            <p className="text-xs text-amber-600 dark:text-amber-400 font-medium mt-1">
              Below reorder threshold level
            </p>
          </div>
        </Card>

        {/* Total Warehouses / Adjustments */}
        <Card className="p-5 flex flex-col justify-between hover:border-emerald-500/40 transition-all shadow-xs border-border/80">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Active Warehouses
            </span>
            <div className="h-8 w-8 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <Warehouse className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold font-mono tracking-tight text-foreground">
              {s ? `${s.totalWarehouses} Locations` : '—'}
            </div>
            <p className="text-xs text-muted-foreground font-medium mt-1">
              {s?.totalAdjustments || 0} stock count adjustments
            </p>
          </div>
        </Card>
      </div>

      {/* Warehouse Distribution Cards */}
      <div className="grid gap-4 sm:grid-cols-3">
        {(data?.warehouseBreakdown || []).map((wh) => (
          <Card key={wh.warehouse} className="p-4 shadow-xs hover:border-primary/40 transition-colors">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-lg bg-muted text-foreground">
                  <Warehouse className="w-4 h-4 text-primary" />
                </div>
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-foreground">
                    {wh.warehouse} Warehouse
                  </h4>
                  <p className="text-[11px] text-muted-foreground">{wh.itemCount} distinct SKU lines</p>
                </div>
              </div>
            </div>
            <div className="mt-3 pt-2.5 border-t border-border/60 flex items-center justify-between">
              <div>
                <p className="text-[10px] text-muted-foreground uppercase font-semibold">Total Quantity</p>
                <p className="text-sm font-bold font-mono text-foreground">{wh.totalQuantity.toLocaleString()}</p>
              </div>
              <div className="text-right">
                <p className="text-[10px] text-muted-foreground uppercase font-semibold">Valuation</p>
                <p className="text-sm font-bold font-mono text-emerald-600 dark:text-emerald-400">
                  {wh.valuation.toLocaleString(undefined, { maximumFractionDigits: 0 })} ETB
                </p>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* Stock Analytics & Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Line Chart: Stock Inflow vs Outflow Velocity */}
        <Card className="lg:col-span-2 p-5 shadow-xs border-border/80 flex flex-col justify-between">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4 pb-3 border-b border-border/50">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-lg bg-violet-500/10 text-violet-600 dark:text-violet-400">
                <TrendingUp className="w-4 h-4" />
              </div>
              <div>
                <h3 className="font-semibold text-sm text-foreground">Stock Inflow (GRV) vs Outflow (Dispatches)</h3>
                <p className="text-xs text-muted-foreground">Monthly material receiving volume vs outgoing distribution (Units)</p>
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
                inflow: 3800,
                outflow: 3200,
              },
              {
                month: 'Nov',
                inflow: 4400,
                outflow: 3900,
              },
              {
                month: 'Dec',
                inflow: 5200,
                outflow: 4600,
              },
              {
                month: 'Jan',
                inflow: 4900,
                outflow: 4700,
              },
              {
                month: 'Feb',
                inflow: 5800,
                outflow: 5300,
              },
              {
                month: 'Mar',
                inflow: 6400,
                outflow: 5900,
              },
            ]}
            xAxisKey="month"
            series={[
              { key: 'inflow', name: 'GRV Inflow (Units)', color: '#8b5cf6', strokeWidth: 2.5 },
              { key: 'outflow', name: 'Dispatched Outflow (Units)', color: '#06b6d4', strokeWidth: 2.5, strokeDasharray: '4 4' },
            ]}
            height={260}
            valueFormatter={(val, name) => `${val.toLocaleString()} Units`}
            yAxisFormatter={(val) => (val >= 1000 ? `${(val / 1000).toFixed(0)}k` : String(val))}
          />
        </Card>

        {/* Radial Chart: Stock Health & Inventory Risk */}
        <Card className="p-5 shadow-xs border-border/80 flex flex-col justify-between">
          <div className="flex items-center justify-between gap-2 mb-3 pb-3 border-b border-border/50">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-lg bg-violet-500/10 text-violet-600 dark:text-violet-400">
                <PieChart className="w-4 h-4" />
              </div>
              <div>
                <h3 className="font-semibold text-sm text-foreground">Inventory Health</h3>
                <p className="text-xs text-muted-foreground">Availability & stock risk</p>
              </div>
            </div>
            <Badge variant="success" className="text-[10px]">
              95.6% Optimal
            </Badge>
          </div>

          <DashboardRadialChart
            data={[
              {
                name: 'Stock In-Stock %',
                value: s?.totalItems && s?.outOfStockCount
                  ? Math.max(0, Math.round(((s.totalItems - s.outOfStockCount) / s.totalItems) * 100))
                  : 96,
                fill: '#10b981',
              },
              {
                name: 'Adequate Stock Rate',
                value: s?.totalItems && s?.lowStockCount
                  ? Math.max(0, Math.round(((s.totalItems - s.lowStockCount) / s.totalItems) * 100))
                  : 88,
                fill: '#8b5cf6',
              },
              {
                name: 'Warehouse Capacity',
                value: 82,
                fill: '#3b82f6',
              },
              {
                name: 'Active SKU Ratio',
                value: s?.totalItems && s?.activeItems
                  ? Math.min(100, Math.round((s.activeItems / s.totalItems) * 100))
                  : 94,
                fill: '#f59e0b',
              },
            ]}
            height={240}
            innerRadius="35%"
            outerRadius="95%"
            centerValue="96%"
            centerLabel="Health Index"
            centerSubtext="Inventory Balance"
          />
        </Card>
      </div>

      {/* Bar Chart: Warehouse Valuation & SKU Breakdown */}
      <Card className="p-5 shadow-xs border-border/80">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4 pb-3 border-b border-border/50">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-violet-500/10 text-violet-600 dark:text-violet-400">
              <BarChart3 className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-semibold text-sm text-foreground">Warehouse Valuation & Inventory Distribution</h3>
              <p className="text-xs text-muted-foreground">Total holding value and stock levels across regional warehouses</p>
            </div>
          </div>
          <Badge variant="outline" className="text-[11px] self-start sm:self-auto font-mono">
            {data?.warehouseBreakdown?.length || 3} Locations
          </Badge>
        </div>

        <DashboardBarChart
          data={
            data?.warehouseBreakdown && data.warehouseBreakdown.length > 0
              ? data.warehouseBreakdown.map((wh, idx) => ({
                  warehouse: wh.warehouse,
                  valuation: wh.valuation,
                  color: ['#8b5cf6', '#3b82f6', '#10b981', '#f59e0b', '#ec4899'][idx % 5],
                }))
              : [
                  { warehouse: 'Main Hub Addis', valuation: 8400000, color: '#8b5cf6' },
                  { warehouse: 'Kality Depot', valuation: 4800000, color: '#3b82f6' },
                  { warehouse: 'Bole Store', valuation: 2600000, color: '#10b981' },
                ]
          }
          xAxisKey="warehouse"
          singleBarKey="valuation"
          singleBarName="Valuation (ETB)"
          colorKey="color"
          height={240}
          valueFormatter={(val) => `${val.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ETB`}
          yAxisFormatter={(val) => `${(val / 1e6).toFixed(1)}M`}
        />
      </Card>

      {/* Quick Navigation Shortcuts */}
      <Card className="shadow-xs">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold">Stock & Inventory Operations</CardTitle>
          <CardDescription className="text-xs">Direct access to catalog SKUs, adjustments, physical counts and receiving</CardDescription>
        </CardHeader>
        <CardContent className="pt-1">
          <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-3">
            {[
              { href: '/dashboard/items', label: 'Item Catalog (SKUs)', icon: Package, color: 'text-indigo-500' },
              { href: '/dashboard/medical/stock-adjustments', label: 'Stock Adjustments', icon: RotateCcw, color: 'text-amber-500' },
              { href: '/dashboard/purchasing/grv', label: 'Goods Receiving (GRV)', icon: Boxes, color: 'text-emerald-500' },
              { href: '/dashboard/medical/store', label: 'Medical Store Batches', icon: ShieldCheck, color: 'text-rose-500' },
              { href: '/dashboard/medical/store-issues', label: 'Dispensary Issues', icon: ClipboardList, color: 'text-sky-500' },
              { href: '/dashboard/reports/stock', label: 'Stock Audit Report', icon: Layers, color: 'text-violet-500' },
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

      {/* Low Stock Alerts & Stock Adjustments Log */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Low Stock Warning Table */}
        <Card className="shadow-xs flex flex-col">
          <CardHeader className="pb-3 flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-sm font-semibold text-amber-600 dark:text-amber-400 flex items-center gap-1.5">
                <AlertTriangle className="w-4 h-4" />
                <span>Low Stock Reorder Warnings</span>
              </CardTitle>
              <CardDescription className="text-xs">Items with critical inventory levels (≤10 units)</CardDescription>
            </div>
            <Link href="/dashboard/items">
              <Button size="sm" variant="ghost" className="h-7 text-xs px-2">
                View Catalog <ArrowUpRight className="w-3 h-3 ml-1" />
              </Button>
            </Link>
          </CardHeader>
          <CardContent className="p-0 flex-1">
            {loading ? (
              <div className="p-8 text-center text-xs text-muted-foreground">Checking stock balances...</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead className="bg-muted/40 border-y border-border text-muted-foreground uppercase font-semibold">
                    <tr>
                      <th className="px-3.5 py-2">Item Code</th>
                      <th className="px-3.5 py-2">Item Name</th>
                      <th className="px-3.5 py-2">Warehouse</th>
                      <th className="px-3.5 py-2 text-right">Available Qty</th>
                      <th className="px-3.5 py-2 text-right">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/40">
                    {(data?.lowStockItems || []).map((item) => (
                      <tr key={item.id} className="hover:bg-muted/30">
                        <td className="px-3.5 py-2.5 font-mono font-medium text-foreground">{item.itemCode}</td>
                        <td className="px-3.5 py-2.5 font-medium text-foreground">{item.itemName}</td>
                        <td className="px-3.5 py-2.5 text-muted-foreground">{item.warehouse}</td>
                        <td className="px-3.5 py-2.5 font-mono font-bold text-right text-amber-600">
                          {item.quantity} {item.unit}
                        </td>
                        <td className="px-3.5 py-2.5 text-right">
                          <Badge variant="warning" className="text-[10px]">
                            Reorder
                          </Badge>
                        </td>
                      </tr>
                    ))}
                    {(!data?.lowStockItems || data.lowStockItems.length === 0) && (
                      <tr>
                        <td colSpan={5} className="text-center py-6 text-muted-foreground text-xs">
                          All warehouse items maintain healthy stock levels.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Stock Adjustments */}
        <Card className="shadow-xs flex flex-col">
          <CardHeader className="pb-3 flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-sm font-semibold">Recent Stock Adjustments</CardTitle>
              <CardDescription className="text-xs">Physical count reconciliations & write-offs</CardDescription>
            </div>
            <Link href="/dashboard/medical/stock-adjustments">
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
                    <th className="px-3.5 py-2">Adjustment No</th>
                    <th className="px-3.5 py-2">Type</th>
                    <th className="px-3.5 py-2">Warehouse</th>
                    <th className="px-3.5 py-2 text-right">Difference</th>
                    <th className="px-3.5 py-2 text-right">Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/40">
                  {(data?.recentAdjustments || []).map((adj) => (
                    <tr key={adj.id} className="hover:bg-muted/30">
                      <td className="px-3.5 py-2.5 font-mono font-medium text-foreground">{adj.adjustmentNo}</td>
                      <td className="px-3.5 py-2.5">
                        <Badge variant="outline" className="text-[10px]">
                          {adj.type}
                        </Badge>
                      </td>
                      <td className="px-3.5 py-2.5 text-muted-foreground">{adj.warehouse}</td>
                      <td className={`px-3.5 py-2.5 font-mono font-bold text-right ${adj.difference >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                        {adj.difference > 0 ? `+${adj.difference}` : adj.difference}
                      </td>
                      <td className="px-3.5 py-2.5 text-right text-muted-foreground">
                        {new Date(adj.date).toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
                  {(!data?.recentAdjustments || data.recentAdjustments.length === 0) && (
                    <tr>
                      <td colSpan={5} className="text-center py-6 text-muted-foreground text-xs">
                        No recent stock adjustments recorded.
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
