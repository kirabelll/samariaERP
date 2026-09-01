'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import {
  Package,
  Eye,
  Search,
  Calendar,
  AlertTriangle,
  Building2,
  Warehouse,
  DollarSign,
  X,
  ArrowDownLeft,
  ArrowUpRight,
  ExternalLink,
  Layers,
  FileText,
  ClipboardList,
  CheckCircle2,
  Clock,
  Filter,
  RefreshCw,
  Trash2,
} from 'lucide-react';
import { useI18n } from '@/lib/i18n';
import { Card, CardBody, Table, Badge, Button, Input } from '@/components/ui';
import type { ColumnDef } from '@/components/ui';

interface MedicalBatch {
  id: string;
  batchNo: string;
  itemId: string;
  costPrice?: number;
  receivedDate?: string;
  item: {
    id: string;
    code: string;
    name: string;
    genericName?: string | null;
    manufacturer?: string | null;
    strength?: string | null;
    unit?: string | null;
    category?: string | null;
    dosageForm?: string | null;
  } | null;
  quantity: number;
  expiryDate: string;
  warehouse: string;
  status: string;
}

interface GRVRecord {
  id: string;
  grvNo: string;
  supplier?: { companyName: string } | null;
  purchaseOrder?: { poNo: string; supplier?: { companyName: string } } | null;
  totalAmount?: number;
  receivedDate: string;
  status: string;
  receivedBy?: string;
  items?: string;
}

interface StoreIssueRecord {
  id: string;
  issueNo: string;
  customer?: { companyName: string; code?: string } | null;
  totalAmount?: number;
  createdAt: string;
  status: string;
  issuedBy?: string;
  items?: string;
}

function formatWarehouse(warehouse?: string): string {
  if (!warehouse) return 'Medical Store';
  return warehouse
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
}

function formatCurrency(amount?: number) {
  if (!amount && amount !== 0) return '-';
  return `ETB ${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export default function MedicalStorePage() {
  const { t } = useI18n();

  // Active view tab
  const [activeTab, setActiveTab] = useState<'available' | 'grv' | 'issues'>('available');

  // Search & Filter State
  const [searchTerm, setSearchTerm] = useState('');
  const [warehouseFilter, setWarehouseFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 15;

  // Data states
  const [batches, setBatches] = useState<MedicalBatch[]>([]);
  const [grvList, setGrvList] = useState<GRVRecord[]>([]);
  const [issueList, setIssueList] = useState<StoreIssueRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedBatch, setSelectedBatch] = useState<MedicalBatch | null>(null);

  // Fetch all store datasets
  const fetchStoreData = async () => {
    try {
      setRefreshing(true);
      const [batchesRes, grvRes, issuesRes] = await Promise.all([
        fetch('/api/medical/batches?limit=1000', { cache: 'no-store' }).then((r) => r.json()).catch(() => ({ success: false, data: [] })),
        fetch('/api/purchasing/grv?limit=200', { cache: 'no-store' }).then((r) => r.json()).catch(() => ({ success: false, data: [] })),
        fetch('/api/medical/store-issues?limit=200', { cache: 'no-store' }).then((r) => r.json()).catch(() => ({ success: false, data: [] })),
      ]);

      if (batchesRes.success && Array.isArray(batchesRes.data)) {
        setBatches(batchesRes.data);
      }
      if (grvRes.success && Array.isArray(grvRes.data)) {
        setGrvList(grvRes.data);
      }
      if (issuesRes.success && Array.isArray(issuesRes.data)) {
        setIssueList(issuesRes.data);
      }
    } catch (err) {
      console.error('Error fetching store inventory datasets:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchStoreData();
  }, []);

  // Filtered available batches
  const filteredBatches = useMemo(() => {
    let result = batches;

    if (warehouseFilter) {
      result = result.filter((b) => b.warehouse === warehouseFilter);
    }

    if (statusFilter) {
      const now = new Date();
      const threeMonths = new Date();
      threeMonths.setMonth(threeMonths.getMonth() + 3);

      if (statusFilter === 'Available') {
        result = result.filter((b) => b.quantity > 0 && new Date(b.expiryDate) >= now && b.status !== 'Inactive');
      } else if (statusFilter === 'Exhausted') {
        result = result.filter((b) => b.quantity <= 0 && b.status !== 'Inactive');
      } else if (statusFilter === 'Expired') {
        result = result.filter((b) => new Date(b.expiryDate) < now && b.status !== 'Inactive');
      } else if (statusFilter === 'NearExpiry') {
        result = result.filter((b) => {
          const exp = new Date(b.expiryDate);
          return exp >= now && exp <= threeMonths && b.status !== 'Inactive';
        });
      } else if (statusFilter === 'Inactive') {
        result = result.filter((b) => b.status === 'Inactive');
      }
    }

    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase();
      result = result.filter(
        (b) =>
          b.batchNo.toLowerCase().includes(q) ||
          b.item?.name?.toLowerCase().includes(q) ||
          b.item?.code?.toLowerCase().includes(q) ||
          b.item?.genericName?.toLowerCase().includes(q) ||
          b.item?.manufacturer?.toLowerCase().includes(q)
      );
    }

    return result;
  }, [batches, warehouseFilter, statusFilter, searchTerm]);

  // Filtered GRVs (Stock In)
  const filteredGRVs = useMemo(() => {
    if (!searchTerm.trim()) return grvList;
    const q = searchTerm.toLowerCase();
    return grvList.filter(
      (g) =>
        g.grvNo.toLowerCase().includes(q) ||
        g.supplier?.companyName?.toLowerCase().includes(q) ||
        g.purchaseOrder?.poNo?.toLowerCase().includes(q) ||
        g.receivedBy?.toLowerCase().includes(q)
    );
  }, [grvList, searchTerm]);

  // Filtered Issues (Stock Out)
  const filteredIssues = useMemo(() => {
    if (!searchTerm.trim()) return issueList;
    const q = searchTerm.toLowerCase();
    return issueList.filter(
      (i) =>
        i.issueNo.toLowerCase().includes(q) ||
        i.customer?.companyName?.toLowerCase().includes(q) ||
        i.issuedBy?.toLowerCase().includes(q)
    );
  }, [issueList, searchTerm]);

  // Delete Handlers
  const handleDeleteIssue = async (issueId: string, issueNo: string) => {
    if (
      !window.confirm(
        `Are you sure you want to delete Store Issue "${issueNo}"?\n\nThis will restore the deducted inventory batches back to available stock.`
      )
    ) {
      return;
    }
    try {
      const res = await fetch(`/api/medical/store-issues/${issueId}`, { method: 'DELETE' });
      const result = await res.json();
      if (!res.ok || !result.success) {
        throw new Error(result.error || 'Failed to delete store issue');
      }
      alert(result.message || 'Store issue deleted successfully and batch quantities restored.');
      fetchStoreData();
    } catch (err: any) {
      alert(err.message || 'Failed to delete store issue');
    }
  };

  const handleDeleteBatch = async (batchId: string, batchNo: string, currentStatus?: string) => {
    const isInactive = currentStatus === 'Inactive';
    const confirmPrompt = isInactive
      ? `This batch "${batchNo}" is INACTIVE.\n\nDo you want to PERMANENTLY delete it from the database? This action cannot be undone.`
      : `Are you sure you want to delete Batch "${batchNo}"?\n\nIt will be marked as Inactive (or deleted permanently if already inactive).`;

    if (!window.confirm(confirmPrompt)) {
      return;
    }
    try {
      const url = isInactive ? `/api/medical/batches/${batchId}?permanent=true` : `/api/medical/batches/${batchId}`;
      const res = await fetch(url, { method: 'DELETE' });
      const result = await res.json();
      if (!res.ok || !result.success) {
        throw new Error(result.error || 'Failed to delete batch');
      }
      alert(result.message || (result.permanent ? 'Batch permanently purged from database.' : 'Batch marked as Inactive.'));
      fetchStoreData();
    } catch (err: any) {
      alert(err.message || 'Failed to delete batch');
    }
  };

  const handleDeleteGRV = async (grvId: string, grvNo: string) => {
    if (!window.confirm(`Are you sure you want to delete GRV "${grvNo}"?`)) {
      return;
    }
    try {
      const res = await fetch(`/api/purchasing/grv/${grvId}`, { method: 'DELETE' });
      const result = await res.json();
      if (!res.ok || !result.success) {
        throw new Error(result.error || 'Failed to delete GRV');
      }
      alert(result.message || 'GRV deleted successfully.');
      fetchStoreData();
    } catch (err: any) {
      alert(err.message || 'Failed to delete GRV');
    }
  };

  // KPI Metrics
  const totalAvailableStockQty = useMemo(() => {
    return batches.reduce((sum, b) => sum + (b.quantity > 0 ? b.quantity : 0), 0);
  }, [batches]);

  const totalInventoryValuation = useMemo(() => {
    return batches.reduce((sum, b) => sum + (b.quantity > 0 ? b.quantity * (b.costPrice || 0) : 0), 0);
  }, [batches]);

  const totalGRVsCount = grvList.length;
  const totalIssuesCount = issueList.length;

  // Pagination slice for Batches
  const paginatedBatches = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredBatches.slice(start, start + pageSize);
  }, [filteredBatches, currentPage]);

  const totalPages = Math.ceil(filteredBatches.length / pageSize) || 1;

  // Columns for Available Stock Table
  const batchColumns: ColumnDef<MedicalBatch>[] = [
    {
      header: 'Batch No',
      accessor: 'batchNo',
      sortable: true,
      render: (val, row) => (
        <Link
          href={`/dashboard/medical/store/${row.id}`}
          className="font-mono font-semibold text-blue-600 hover:text-blue-800 hover:underline inline-flex items-center gap-1 text-xs"
          title="View batch details"
        >
          {val}
        </Link>
      ),
    },
    {
      header: 'Item / Drug',
      accessor: 'item',
      render: (_val, row) => (
        <div>
          <div className="font-semibold text-gray-900 text-xs">{row.item?.name || '-'}</div>
          <div className="flex items-center gap-1.5 mt-0.5 text-[11px] text-gray-500">
            {row.item?.code && <span className="font-mono bg-gray-100 px-1 py-0.2 rounded text-[10px]">{row.item.code}</span>}
            {row.item?.strength && <span>• {row.item.strength}</span>}
            {row.item?.genericName && <span className="italic">({row.item.genericName})</span>}
          </div>
        </div>
      ),
    },
    {
      header: 'Available Qty',
      accessor: 'quantity',
      render: (val, row) => {
        const qty = Number(val);
        const isOutOfStock = qty <= 0;
        const isLow = qty > 0 && qty <= 10;
        return (
          <div>
            <span
              className={`font-mono font-bold text-xs ${
                isOutOfStock ? 'text-red-600' : isLow ? 'text-amber-600' : 'text-emerald-700'
              }`}
            >
              {qty.toLocaleString('en-US')} {row.item?.unit || 'units'}
            </span>
            {isOutOfStock ? (
              <span className="block text-[10px] text-red-500 font-semibold uppercase tracking-wider">Depleted</span>
            ) : isLow ? (
              <span className="block text-[10px] text-amber-500 font-semibold uppercase tracking-wider">Low Stock</span>
            ) : (
              <span className="block text-[10px] text-emerald-600 font-medium">In Stock</span>
            )}
          </div>
        );
      },
    },
    {
      header: 'Unit Cost',
      accessor: 'costPrice',
      render: (val) => (
        <span className="font-mono text-xs text-gray-800">
          {val ? formatCurrency(val) : '-'}
        </span>
      ),
    },
    {
      header: 'Total Value',
      accessor: 'id',
      render: (_val, row) => (
        <span className="font-mono text-xs font-semibold text-gray-900">
          {row.costPrice && row.quantity > 0
            ? formatCurrency(row.quantity * row.costPrice)
            : '-'}
        </span>
      ),
    },
    {
      header: 'Expiry Date',
      accessor: 'expiryDate',
      render: (val) => {
        if (!val) return '-';
        const date = new Date(val);
        const now = new Date();
        const threeMonths = new Date();
        threeMonths.setMonth(threeMonths.getMonth() + 3);
        const isExpired = date < now;
        const isNearExpiry = date < threeMonths && date >= now;
        return (
          <div className="text-xs">
            <span
              className={
                isExpired
                  ? 'text-red-600 font-bold'
                  : isNearExpiry
                  ? 'text-orange-600 font-semibold'
                  : 'text-gray-700 font-medium'
              }
            >
              {date.toLocaleDateString()}
            </span>
            {isExpired && <span className="block text-[10px] text-red-600 font-bold">⚠️ EXPIRED</span>}
            {isNearExpiry && <span className="block text-[10px] text-orange-600 font-bold">⏳ Near Expiry</span>}
          </div>
        );
      },
    },
    {
      header: 'Warehouse',
      accessor: 'warehouse',
      render: (val) => (
        <span className="text-xs text-gray-700 bg-gray-100 px-2 py-0.5 rounded font-medium">
          {formatWarehouse(val)}
        </span>
      ),
    },
    {
      header: 'Actions',
      accessor: 'id',
      render: (_val, row) => (
        <div className="flex items-center gap-1.5">
          <Button
            size="sm"
            variant="outline"
            onClick={() => setSelectedBatch(row)}
            icon={<Eye className="w-3.5 h-3.5" />}
            title="Quick View"
          >
            View
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="border-red-200 text-red-600 hover:bg-red-50 hover:border-red-300"
            onClick={() => handleDeleteBatch(row.id, row.batchNo, row.status)}
            title={row.status === 'Inactive' ? 'Permanently Delete Batch' : 'Delete / Deactivate Batch'}
          >
            {row.status === 'Inactive' ? 'Purge' : 'Delete'}
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16">
      {/* Header */}
      <div className="flex flex-wrap justify-between items-center gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900 flex items-center gap-2.5">
            <Warehouse className="w-7 h-7 text-blue-600" />
            Store Inventory & Stock Movement
          </h1>
          <p className="text-gray-600 text-xs sm:text-sm mt-1">
            Real-time available stock balances tracked strictly through <strong>GRV (Stock In)</strong> and <strong>Store Issues / Orders (Stock Out)</strong>.
          </p>
        </div>

        {/* Action Buttons: Receive GRV & Issue Store */}
        <div className="flex flex-wrap items-center gap-2.5">
          <Button
            variant="outline"
            size="sm"
            onClick={fetchStoreData}
            icon={<RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />}
          >
            Refresh
          </Button>
          <Link href="/dashboard/purchasing/grv/new?division=MEDICAL">
            <Button variant="primary" size="md" icon={<ArrowDownLeft className="w-4 h-4 text-emerald-300" />}>
              Receive GRV (Stock In)
            </Button>
          </Link>
          <Link href="/dashboard/medical/store-issues/new">
            <Button variant="secondary" size="md" icon={<ArrowUpRight className="w-4 h-4 text-blue-600" />}>
              Issue / Stock Out
            </Button>
          </Link>
        </div>
      </div>

      {/* KPI Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-white border border-gray-200 shadow-xs hover:border-blue-400 transition-all">
          <CardBody className="p-4 flex items-center gap-3.5">
            <div className="p-3 bg-blue-50 text-blue-600 rounded-2xl">
              <Package className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs text-gray-500 font-semibold uppercase tracking-wider">Available Stock</p>
              <p className="text-xl sm:text-2xl font-black text-gray-900 font-mono mt-0.5">
                {totalAvailableStockQty.toLocaleString()} <span className="text-xs font-normal text-gray-500">units</span>
              </p>
              <p className="text-[11px] text-emerald-600 font-medium mt-0.5">
                {batches.filter((b) => b.quantity > 0).length} active batches
              </p>
            </div>
          </CardBody>
        </Card>

        <Card className="bg-white border border-gray-200 shadow-xs hover:border-emerald-400 transition-all">
          <CardBody className="p-4 flex items-center gap-3.5">
            <div className="p-3 bg-emerald-50 text-emerald-600 rounded-2xl">
              <ArrowDownLeft className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs text-gray-500 font-semibold uppercase tracking-wider">Stock In (GRVs)</p>
              <p className="text-xl sm:text-2xl font-black text-gray-900 font-mono mt-0.5">
                {totalGRVsCount} <span className="text-xs font-normal text-gray-500">vouchers</span>
              </p>
              <p className="text-[11px] text-gray-500 font-medium mt-0.5">Goods Received into stock</p>
            </div>
          </CardBody>
        </Card>

        <Card className="bg-white border border-gray-200 shadow-xs hover:border-amber-400 transition-all">
          <CardBody className="p-4 flex items-center gap-3.5">
            <div className="p-3 bg-amber-50 text-amber-600 rounded-2xl">
              <ArrowUpRight className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs text-gray-500 font-semibold uppercase tracking-wider">Stock Out (Issues)</p>
              <p className="text-xl sm:text-2xl font-black text-gray-900 font-mono mt-0.5">
                {totalIssuesCount} <span className="text-xs font-normal text-gray-500">issues</span>
              </p>
              <p className="text-[11px] text-gray-500 font-medium mt-0.5">Dispatched store issues</p>
            </div>
          </CardBody>
        </Card>

        <Card className="bg-white border border-gray-200 shadow-xs hover:border-purple-400 transition-all">
          <CardBody className="p-4 flex items-center gap-3.5">
            <div className="p-3 bg-purple-50 text-purple-600 rounded-2xl">
              <DollarSign className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs text-gray-500 font-semibold uppercase tracking-wider">Active Inventory Value</p>
              <p className="text-lg sm:text-xl font-black text-gray-900 font-mono mt-0.5">
                ETB {totalInventoryValuation.toLocaleString('en-US', { maximumFractionDigits: 0 })}
              </p>
              <p className="text-[11px] text-purple-600 font-medium mt-0.5">Valuation at cost</p>
            </div>
          </CardBody>
        </Card>
      </div>

      {/* Tabs Navigation */}
      <div className="border-b border-gray-200 bg-white rounded-t-xl px-4 pt-3 flex flex-wrap gap-2 shadow-2xs">
        <button
          type="button"
          onClick={() => {
            setActiveTab('available');
            setCurrentPage(1);
          }}
          className={`pb-3 px-4 text-xs sm:text-sm font-semibold border-b-2 transition-all flex items-center gap-2 ${
            activeTab === 'available'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-gray-500 hover:text-gray-800'
          }`}
        >
          <Package className="w-4 h-4" />
          <span>1. Available Stock & Batches ({batches.length})</span>
        </button>

        <button
          type="button"
          onClick={() => {
            setActiveTab('grv');
            setCurrentPage(1);
          }}
          className={`pb-3 px-4 text-xs sm:text-sm font-semibold border-b-2 transition-all flex items-center gap-2 ${
            activeTab === 'grv'
              ? 'border-emerald-600 text-emerald-600'
              : 'border-transparent text-gray-500 hover:text-gray-800'
          }`}
        >
          <ArrowDownLeft className="w-4 h-4 text-emerald-500" />
          <span>2. Stock In (GRVs Received) ({grvList.length})</span>
        </button>

        <button
          type="button"
          onClick={() => {
            setActiveTab('issues');
            setCurrentPage(1);
          }}
          className={`pb-3 px-4 text-xs sm:text-sm font-semibold border-b-2 transition-all flex items-center gap-2 ${
            activeTab === 'issues'
              ? 'border-amber-600 text-amber-600'
              : 'border-transparent text-gray-500 hover:text-gray-800'
          }`}
        >
          <ArrowUpRight className="w-4 h-4 text-amber-500" />
          <span>3. Stock Out (Store Issues) ({issueList.length})</span>
        </button>
      </div>

      {/* Tab 1: Available Stock & Batches */}
      {activeTab === 'available' && (
        <div className="space-y-4">
          {/* Filter Bar */}
          <Card className="bg-white border border-gray-200 shadow-xs">
            <CardBody className="p-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="relative">
                  <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Search by drug name, batch no, code, generic..."
                    value={searchTerm}
                    onChange={(e) => {
                      setSearchTerm(e.target.value);
                      setCurrentPage(1);
                    }}
                    className="w-full pl-9 pr-4 py-2 text-xs sm:text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <select
                    value={warehouseFilter}
                    onChange={(e) => {
                      setWarehouseFilter(e.target.value);
                      setCurrentPage(1);
                    }}
                    className="w-full py-2 px-3 text-xs sm:text-sm border border-gray-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">-- All Warehouses --</option>
                    <option value="medical_store">Medical Store (Main Pharmacy)</option>
                    <option value="main">Main Warehouse / Central Store</option>
                    <option value="site_store">Site Store / Dispensary</option>
                  </select>
                </div>

                <div>
                  <select
                    value={statusFilter}
                    onChange={(e) => {
                      setStatusFilter(e.target.value);
                      setCurrentPage(1);
                    }}
                    className="w-full py-2 px-3 text-xs sm:text-sm border border-gray-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">-- All Stock Statuses --</option>
                    <option value="Available">In Stock & Valid</option>
                    <option value="NearExpiry">⏳ Near Expiry (&lt; 3 Months)</option>
                    <option value="Expired">⚠️ Expired</option>
                    <option value="Exhausted">Out of Stock (0 Qty)</option>
                    <option value="Inactive">🗑️ Inactive (Ready to Purge)</option>
                  </select>
                </div>
              </div>
            </CardBody>
          </Card>

          {/* Table Card */}
          <Card className="bg-white border border-gray-200 shadow-xs overflow-hidden">
            <CardBody className="p-0">
              <Table<MedicalBatch>
                data={paginatedBatches}
                columns={batchColumns}
                pageSize={pageSize}
                totalPages={totalPages}
                currentPage={currentPage}
                onPageChange={setCurrentPage}
                emptyMessage={loading ? 'Loading store batches...' : 'No matching available batches found in store.'}
              />
            </CardBody>
          </Card>
        </div>
      )}

      {/* Tab 2: Stock In (GRVs Received) */}
      {activeTab === 'grv' && (
        <div className="space-y-4">
          <Card className="bg-white border border-gray-200 shadow-xs overflow-hidden">
            <div className="p-4 border-b border-gray-100 bg-gray-50/50 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <ArrowDownLeft className="w-5 h-5 text-emerald-600" />
                <h3 className="font-semibold text-sm text-gray-900">
                  Goods Received Vouchers (GRV Stock In Records)
                </h3>
              </div>
              <Link href="/dashboard/purchasing/grv/new?division=MEDICAL">
                <Button size="sm" variant="primary" icon={<ArrowDownLeft className="w-3.5 h-3.5" />}>
                  + New GRV Intake
                </Button>
              </Link>
            </div>
            <CardBody className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-gray-50 border-b border-gray-200 text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    <tr>
                      <th className="px-4 py-3">GRV No</th>
                      <th className="px-4 py-3">Supplier</th>
                      <th className="px-4 py-3">PO Reference</th>
                      <th className="px-4 py-3">Total Amount</th>
                      <th className="px-4 py-3">Received Date</th>
                      <th className="px-4 py-3">Status</th>
                      <th className="px-4 py-3 text-center">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {filteredGRVs.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="px-4 py-8 text-center text-xs text-gray-500">
                          No Goods Received Vouchers found.
                        </td>
                      </tr>
                    ) : (
                      filteredGRVs.map((g) => (
                        <tr key={g.id} className="hover:bg-gray-50/50 transition-colors">
                          <td className="px-4 py-3 font-mono font-semibold text-blue-600 text-xs">
                            <Link href={`/dashboard/purchasing/grv/${g.id}`} className="hover:underline">
                              {g.grvNo}
                            </Link>
                          </td>
                          <td className="px-4 py-3 text-xs font-medium text-gray-900">
                            {g.supplier?.companyName || g.purchaseOrder?.supplier?.companyName || '-'}
                          </td>
                          <td className="px-4 py-3 text-xs font-mono text-gray-600">
                            {g.purchaseOrder?.poNo || 'Direct'}
                          </td>
                          <td className="px-4 py-3 text-xs font-mono font-semibold text-gray-900">
                            {g.totalAmount ? `ETB ${Number(g.totalAmount).toLocaleString('en-US', { minimumFractionDigits: 2 })}` : '-'}
                          </td>
                          <td className="px-4 py-3 text-xs text-gray-600">
                            {g.receivedDate ? new Date(g.receivedDate).toLocaleDateString() : '-'}
                          </td>
                          <td className="px-4 py-3">
                            <Badge status={g.status === 'Received' ? 'Confirmed' : (g.status as any)}>
                              {g.status}
                            </Badge>
                          </td>
                          <td className="px-4 py-3 text-center">
                            <div className="flex items-center justify-center gap-1.5">
                              <Link href={`/dashboard/purchasing/grv/${g.id}`}>
                                <Button size="sm" variant="outline">
                                  View GRV
                                </Button>
                              </Link>
                              <Button
                                size="sm"
                                variant="outline"
                                className="border-red-200 text-red-600 hover:bg-red-50 hover:border-red-300"
                                onClick={() => handleDeleteGRV(g.id, g.grvNo)}
                              >
                                Delete
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </CardBody>
          </Card>
        </div>
      )}

      {/* Tab 3: Stock Out (Store Issues) */}
      {activeTab === 'issues' && (
        <div className="space-y-4">
          <Card className="bg-white border border-gray-200 shadow-xs overflow-hidden">
            <div className="p-4 border-b border-gray-100 bg-gray-50/50 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <ArrowUpRight className="w-5 h-5 text-amber-600" />
                <h3 className="font-semibold text-sm text-gray-900">
                  Medical Store Issues (Stock Out / Dispatches)
                </h3>
              </div>
              <Link href="/dashboard/medical/store-issues/new">
                <Button size="sm" variant="secondary" icon={<ArrowUpRight className="w-3.5 h-3.5" />}>
                  + Issue Store Items
                </Button>
              </Link>
            </div>
            <CardBody className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-gray-50 border-b border-gray-200 text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    <tr>
                      <th className="px-4 py-3">Issue No</th>
                      <th className="px-4 py-3">Customer / Facility</th>
                      <th className="px-4 py-3">Total Amount</th>
                      <th className="px-4 py-3">Issue Date</th>
                      <th className="px-4 py-3">Issued By</th>
                      <th className="px-4 py-3">Status</th>
                      <th className="px-4 py-3 text-center">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {filteredIssues.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="px-4 py-8 text-center text-xs text-gray-500">
                          No store issues recorded yet.
                        </td>
                      </tr>
                    ) : (
                      filteredIssues.map((i) => (
                        <tr key={i.id} className="hover:bg-gray-50/50 transition-colors">
                          <td className="px-4 py-3 font-mono font-semibold text-blue-600 text-xs">
                            <Link href={`/dashboard/medical/store-issues/${i.id}`} className="hover:underline">
                              {i.issueNo}
                            </Link>
                          </td>
                          <td className="px-4 py-3 text-xs font-medium text-gray-900">
                            {i.customer?.companyName || '-'}
                          </td>
                          <td className="px-4 py-3 text-xs font-mono font-semibold text-gray-900">
                            {i.totalAmount ? `ETB ${Number(i.totalAmount).toLocaleString('en-US', { minimumFractionDigits: 2 })}` : '-'}
                          </td>
                          <td className="px-4 py-3 text-xs text-gray-600">
                            {i.createdAt ? new Date(i.createdAt).toLocaleDateString() : '-'}
                          </td>
                          <td className="px-4 py-3 text-xs text-gray-600">
                            {i.issuedBy || 'Officer'}
                          </td>
                          <td className="px-4 py-3">
                            <Badge status={i.status === 'Issued' ? 'Confirmed' : (i.status as any)}>
                              {i.status}
                            </Badge>
                          </td>
                          <td className="px-4 py-3 text-center">
                            <div className="flex items-center justify-center gap-1.5">
                              <Link href={`/dashboard/medical/store-issues/${i.id}`}>
                                <Button size="sm" variant="outline">
                                  View Issue
                                </Button>
                              </Link>
                              <Button
                                size="sm"
                                variant="outline"
                                className="border-red-200 text-red-600 hover:bg-red-50 hover:border-red-300"
                                onClick={() => handleDeleteIssue(i.id, i.issueNo)}
                              >
                                Delete
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </CardBody>
          </Card>
        </div>
      )}

      {/* Quick View Modal */}
      {selectedBatch && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-fadeIn">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full overflow-hidden border border-gray-200">
            {/* Modal Header */}
            <div className="px-6 py-4 bg-gradient-to-r from-blue-600 to-indigo-600 text-white flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <Package className="w-5 h-5 text-blue-200" />
                <div>
                  <h3 className="font-bold text-base sm:text-lg">
                    Batch: {selectedBatch.batchNo}
                  </h3>
                  <p className="text-xs text-blue-100">{selectedBatch.item?.name || 'Medical Product'}</p>
                </div>
              </div>
              <button
                onClick={() => setSelectedBatch(null)}
                className="text-white/80 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-5 max-h-[75vh] overflow-y-auto">
              {/* Product Information */}
              <div className="p-4 bg-gray-50 rounded-xl border border-gray-200 space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-gray-500 flex items-center gap-1.5">
                  <Building2 className="w-4 h-4 text-blue-600" />
                  Product Information
                </h4>
                <div className="grid grid-cols-2 gap-3 text-xs sm:text-sm">
                  <div>
                    <span className="text-gray-500 block text-xs">Drug / Item Name:</span>
                    <span className="font-semibold text-gray-900">{selectedBatch.item?.name || '-'}</span>
                  </div>
                  <div>
                    <span className="text-gray-500 block text-xs">Generic Name:</span>
                    <span className="font-semibold text-gray-900">{selectedBatch.item?.genericName || '-'}</span>
                  </div>
                  <div>
                    <span className="text-gray-500 block text-xs">Strength & Dosage:</span>
                    <span className="text-gray-800">
                      {selectedBatch.item?.strength || '-'} {selectedBatch.item?.dosageForm ? `(${selectedBatch.item.dosageForm})` : ''}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-500 block text-xs">Manufacturer:</span>
                    <span className="text-gray-800">{selectedBatch.item?.manufacturer || '-'}</span>
                  </div>
                  <div>
                    <span className="text-gray-500 block text-xs">Category:</span>
                    <span className="text-gray-800">{selectedBatch.item?.category || '-'}</span>
                  </div>
                  <div>
                    <span className="text-gray-500 block text-xs">Item Code:</span>
                    <span className="font-mono text-gray-800">{selectedBatch.item?.code || '-'}</span>
                  </div>
                </div>
              </div>

              {/* Batch & Inventory Metrics */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-center">
                <div className="p-3 bg-blue-50/70 rounded-xl border border-blue-100">
                  <span className="text-xs text-blue-700 font-medium uppercase block">Current Available Stock</span>
                  <span className="text-xl font-bold text-blue-900 font-mono mt-0.5 block">
                    {Number(selectedBatch.quantity).toLocaleString('en-US')} {selectedBatch.item?.unit || 'units'}
                  </span>
                </div>

                <div className="p-3 bg-gray-50 rounded-xl border border-gray-200">
                  <span className="text-xs text-gray-500 font-medium uppercase block">Unit Cost</span>
                  <span className="text-lg font-bold text-gray-900 font-mono mt-0.5 block">
                    {formatCurrency(selectedBatch.costPrice)}
                  </span>
                </div>

                <div className="p-3 bg-green-50/80 rounded-xl border border-green-200">
                  <span className="text-xs text-green-800 font-medium uppercase block">Batch Valuation</span>
                  <span className="text-lg font-bold text-green-700 font-mono mt-0.5 block">
                    {selectedBatch.costPrice
                      ? formatCurrency(selectedBatch.quantity * selectedBatch.costPrice)
                      : '-'}
                  </span>
                </div>
              </div>

              {/* Storage & Expiry */}
              <div className="grid grid-cols-2 gap-4 text-xs sm:text-sm pt-2 border-t border-gray-100">
                <div>
                  <span className="text-gray-500 block text-xs">Warehouse:</span>
                  <span className="font-medium text-gray-900 flex items-center gap-1 mt-0.5">
                    <Warehouse className="w-3.5 h-3.5 text-gray-400" />
                    {formatWarehouse(selectedBatch.warehouse)}
                  </span>
                </div>

                <div>
                  <span className="text-gray-500 block text-xs">Expiry Date:</span>
                  <span className="font-medium text-gray-900 flex items-center gap-1 mt-0.5">
                    <Calendar className="w-3.5 h-3.5 text-gray-400" />
                    {selectedBatch.expiryDate ? new Date(selectedBatch.expiryDate).toLocaleDateString() : '-'}
                  </span>
                </div>

                <div>
                  <span className="text-gray-500 block text-xs">Batch Status:</span>
                  <div className="mt-1">
                    <Badge status={selectedBatch.status as any}>{selectedBatch.status}</Badge>
                  </div>
                </div>

                <div>
                  <span className="text-gray-500 block text-xs">Received Date:</span>
                  <span className="text-gray-700 mt-0.5 block">
                    {selectedBatch.receivedDate ? new Date(selectedBatch.receivedDate).toLocaleDateString() : '-'}
                  </span>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex items-center justify-between">
              <Link href={`/dashboard/medical/store/${selectedBatch.id}`}>
                <Button variant="outline" size="sm" icon={<ExternalLink className="w-3.5 h-3.5" />}>
                  Open Full Details Page
                </Button>
              </Link>
              <Button variant="secondary" size="sm" onClick={() => setSelectedBatch(null)}>
                Close
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
