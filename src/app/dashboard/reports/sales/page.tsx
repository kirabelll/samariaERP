'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { Card, CardHeader, CardBody, Table, Badge, Input, Button } from '@/components/ui';
import { StatCard } from '@/components/ui/Card';
import type { ColumnDef } from '@/components/ui';
import {
  FileText,
  Search,
  ExternalLink,
  CheckCircle2,
  AlertCircle,
  Truck,
  Building2,
  Calendar,
  Layers,
  ArrowRight,
  Filter,
} from 'lucide-react';

interface SalesRecord {
  id: string;
  invoiceNo: string;
  date: string;
  customer: string;
  customerCode?: string;
  amount: number;
  vat: number;
  paid: number;
  status: string;
  division: string;
  deliveryRef?: string | null;
  deliveryId?: string | null;
}

interface UninvoicedRecord {
  id: string;
  type: 'CEMENT' | 'AGGREGATE';
  division: string;
  referenceNo: string;
  customerId?: string;
  customer: string;
  source: string;
  quantity: number;
  unit: string;
  unitPrice: number;
  estValue: number;
  deliveryDate: string;
  status: string;
  isInvoiced: boolean;
}

interface DeliveredNotInvoiced {
  count: number;
  cementCount?: number;
  aggregateCount?: number;
  totalValue: number;
  items: UninvoicedRecord[];
}

export default function SalesReportsPage() {
  const [data, setData] = useState<SalesRecord[]>([]);
  const [summary, setSummary] = useState<any>(null);
  const [deliveredNotInvoiced, setDeliveredNotInvoiced] = useState<DeliveredNotInvoiced | null>(null);
  const [loading, setLoading] = useState(true);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDivision, setSelectedDivision] = useState<string>('ALL');
  const [uninvoicedTypeFilter, setUninvoicedTypeFilter] = useState<'ALL' | 'CEMENT' | 'AGGREGATE'>('ALL');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [activeView, setActiveView] = useState<'invoiced' | 'uninvoiced'>('invoiced');
  const [lookupId, setLookupId] = useState('');
  const pageSize = 20;

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      const params = new URLSearchParams({ type: 'sales', page: String(currentPage), limit: String(pageSize) });
      if (startDate) params.set('startDate', startDate);
      if (endDate) params.set('endDate', endDate);
      try {
        const res = await fetch(`/api/reports?${params}`);
        const json = await res.json();
        if (json.success) {
          setData(json.data.records || []);
          setSummary(json.data.summary || null);
          setDeliveredNotInvoiced(json.data.deliveredNotInvoiced || null);
          setTotalPages(json.data.pagination?.pages || 0);
        }
      } catch (err) {
        console.error('Failed to load sales report:', err);
      }
      setLoading(false);
    };
    fetchData();
  }, [currentPage, startDate, endDate]);

  const formatCurrency = (val: number) =>
    `${Number(val || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ETB`;

  // Filtered invoiced records based on search and division
  const filteredInvoiced = useMemo(() => {
    return data.filter((rec) => {
      if (selectedDivision !== 'ALL' && rec.division !== selectedDivision) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchInvoice = rec.invoiceNo?.toLowerCase().includes(q);
        const matchCust = rec.customer?.toLowerCase().includes(q);
        const matchRef = rec.deliveryRef?.toLowerCase().includes(q);
        const matchId = rec.id?.toLowerCase().includes(q) || rec.deliveryId?.toLowerCase().includes(q);
        if (!matchInvoice && !matchCust && !matchRef && !matchId) return false;
      }
      return true;
    });
  }, [data, selectedDivision, searchQuery]);

  // Filtered uninvoiced records
  const filteredUninvoiced = useMemo(() => {
    if (!deliveredNotInvoiced?.items) return [];
    return deliveredNotInvoiced.items.filter((item) => {
      if (uninvoicedTypeFilter !== 'ALL' && item.type !== uninvoicedTypeFilter) return false;
      if (selectedDivision !== 'ALL' && item.division !== selectedDivision) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchRef = item.referenceNo?.toLowerCase().includes(q);
        const matchCust = item.customer?.toLowerCase().includes(q);
        const matchSource = item.source?.toLowerCase().includes(q);
        const matchId = item.id?.toLowerCase().includes(q);
        if (!matchRef && !matchCust && !matchSource && !matchId) return false;
      }
      return true;
    });
  }, [deliveredNotInvoiced, uninvoicedTypeFilter, selectedDivision, searchQuery]);

  // Real-time lookup check for a specific ID or Reference No
  const lookupResult = useMemo(() => {
    if (!lookupId.trim()) return null;
    const q = lookupId.trim().toLowerCase();

    // Check in invoiced records
    const foundInvoice = data.find(
      (inv) =>
        inv.id.toLowerCase() === q ||
        inv.invoiceNo.toLowerCase() === q ||
        (inv.deliveryRef && inv.deliveryRef.toLowerCase() === q) ||
        (inv.deliveryId && inv.deliveryId.toLowerCase() === q)
    );

    if (foundInvoice) {
      return {
        type: 'INVOICED',
        title: `Invoiced on ${foundInvoice.invoiceNo}`,
        detail: `Customer: ${foundInvoice.customer} | Division: ${foundInvoice.division} | Amount: ${formatCurrency(foundInvoice.amount)} | Status: ${foundInvoice.status}`,
        date: foundInvoice.date ? new Date(foundInvoice.date).toLocaleDateString() : '',
        deliveryRef: foundInvoice.deliveryRef || 'Linked via Invoice ID',
        invoiceId: foundInvoice.id,
        invoiceNo: foundInvoice.invoiceNo,
      };
    }

    // Check in uninvoiced items
    const foundUninvoiced = deliveredNotInvoiced?.items.find(
      (u) =>
        u.id.toLowerCase() === q ||
        u.referenceNo.toLowerCase() === q ||
        (u.customerId && u.customerId.toLowerCase() === q)
    );

    if (foundUninvoiced) {
      return {
        type: 'UNINVOICED',
        title: `Delivered (Not Invoiced) — ${foundUninvoiced.referenceNo}`,
        detail: `Customer: ${foundUninvoiced.customer} | ${foundUninvoiced.quantity} ${foundUninvoiced.unit} from ${foundUninvoiced.source} | Est. Value: ${formatCurrency(foundUninvoiced.estValue)} | Status: ${foundUninvoiced.status}`,
        date: foundUninvoiced.deliveryDate ? new Date(foundUninvoiced.deliveryDate).toLocaleDateString() : '',
        deliveryRef: foundUninvoiced.referenceNo,
        deliveryType: foundUninvoiced.type,
        recordId: foundUninvoiced.id,
      };
    }

    return {
      type: 'NOT_FOUND',
      title: 'No matching record found',
      detail: `No active invoice, cement lifting, or aggregate delivery found matching "${lookupId}" in current report period.`,
    };
  }, [lookupId, data, deliveredNotInvoiced]);

  const invoicedColumns: ColumnDef<SalesRecord>[] = [
    {
      header: 'Invoice No',
      accessor: 'invoiceNo',
      sortable: true,
      render: (val, row) => (
        <Link
          href={`/dashboard/sales/invoices/${row.id}`}
          className="font-mono font-semibold text-blue-600 hover:text-blue-800 hover:underline inline-flex items-center gap-1"
        >
          {val}
          <ExternalLink className="w-3 h-3 text-gray-400" />
        </Link>
      ),
    },
    {
      header: 'Date',
      accessor: 'date',
      render: (val) => (val ? new Date(val).toLocaleDateString() : '-'),
    },
    {
      header: 'Customer',
      accessor: 'customer',
      render: (val, row) => (
        <div>
          <span className="font-medium text-gray-900">{val}</span>
          {row.customerCode && <span className="ml-1.5 text-xs text-gray-500">({row.customerCode})</span>}
        </div>
      ),
    },
    {
      header: 'Lifting / Delivery Ref',
      accessor: 'deliveryRef',
      render: (val) =>
        val ? (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-mono font-medium bg-slate-100 text-slate-800 border border-slate-200">
            <Truck className="w-3 h-3 text-slate-500" />
            {val}
          </span>
        ) : (
          <span className="text-gray-400 text-xs">—</span>
        ),
    },
    {
      header: 'Division',
      accessor: 'division',
      render: (val) => (
        <span className="px-2 py-0.5 rounded text-xs font-semibold bg-gray-100 text-gray-700">
          {val}
        </span>
      ),
    },
    {
      header: 'Amount (ETB)',
      accessor: 'amount',
      render: (val) => <span className="font-mono font-medium">{Number(val).toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>,
    },
    {
      header: 'VAT (ETB)',
      accessor: 'vat',
      render: (val) => <span className="font-mono text-gray-600">{Number(val).toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>,
    },
    {
      header: 'Paid (ETB)',
      accessor: 'paid',
      render: (val) => <span className="font-mono text-emerald-600 font-medium">{Number(val).toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>,
    },
    {
      header: 'Status',
      accessor: 'status',
      render: (status) => (
        <span
          className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
            status === 'Paid'
              ? 'bg-emerald-100 text-emerald-800'
              : status === 'Partial'
              ? 'bg-yellow-100 text-yellow-800'
              : 'bg-rose-100 text-rose-800'
          }`}
        >
          {status}
        </span>
      ),
    },
  ];

  const uninvoicedColumns: ColumnDef<UninvoicedRecord>[] = [
    {
      header: 'Type',
      accessor: 'type',
      render: (val) => (
        <span
          className={`px-2 py-0.5 rounded text-xs font-bold ${
            val === 'CEMENT'
              ? 'bg-blue-100 text-blue-800'
              : 'bg-amber-100 text-amber-800'
          }`}
        >
          {val === 'CEMENT' ? 'Cement Lifting' : 'Aggregate Delivery'}
        </span>
      ),
    },
    {
      header: 'Lifting / Dispatch #',
      accessor: 'referenceNo',
      sortable: true,
      render: (val, row) => (
        <div className="font-mono font-semibold text-gray-900 flex items-center gap-1">
          <Truck className="w-3.5 h-3.5 text-gray-500" />
          <span>{val}</span>
        </div>
      ),
    },
    {
      header: 'Customer',
      accessor: 'customer',
      render: (val) => <span className="font-medium text-gray-900">{val}</span>,
    },
    {
      header: 'Source / Factory',
      accessor: 'source',
      render: (val) => <span className="text-gray-600 text-xs">{val}</span>,
    },
    {
      header: 'Delivered Qty',
      accessor: 'quantity',
      render: (val, row) => (
        <span className="font-mono font-medium">
          {Number(val).toLocaleString('en-US', { minimumFractionDigits: 2 })} {row.unit}
        </span>
      ),
    },
    {
      header: 'Unit Price',
      accessor: 'unitPrice',
      render: (val) => <span className="font-mono text-gray-600">{Number(val).toLocaleString('en-US')} ETB</span>,
    },
    {
      header: 'Est. Value (ETB)',
      accessor: 'estValue',
      render: (val) => (
        <span className="font-mono font-bold text-red-600">
          {Number(val).toLocaleString('en-US', { minimumFractionDigits: 2 })} ETB
        </span>
      ),
    },
    {
      header: 'Delivery Date',
      accessor: 'deliveryDate',
      render: (val) => (val ? new Date(val).toLocaleDateString() : '-'),
    },
    {
      header: 'Status',
      accessor: 'status',
      render: (val) => (
        <span
          className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
            val === 'Verified' || val === 'Settled'
              ? 'bg-green-100 text-green-800'
              : 'bg-amber-100 text-amber-800'
          }`}
        >
          {val}
        </span>
      ),
    },
    {
      header: 'Action',
      accessor: 'id',
      render: (val, row) => (
        <Link
          href={
            row.type === 'CEMENT'
              ? '/dashboard/finance/cement-invoices'
              : '/dashboard/aggregate/invoices'
          }
          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200 transition-colors"
        >
          <span>Invoice Now</span>
          <ArrowRight className="w-3 h-3" />
        </Link>
      ),
    },
  ];

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900">Sales & Invoicing Reports</h1>
          <p className="text-xs sm:text-sm text-gray-500 mt-0.5">
            Audit invoiced sales, verify cement liftings & aggregate deliveries by ID, and monitor uninvoiced shipments
          </p>
        </div>
      </div>

      {/* KPI Summary Cards */}
      {summary && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-4">
          <StatCard
            label="Total Invoices"
            value={summary.totalInvoices}
            icon={<span>📄</span>}
            backgroundColor="bg-blue-50"
            iconColor="text-blue-600"
          />
          <StatCard
            label="Total Revenue"
            value={formatCurrency(summary.totalAmount)}
            icon={<span>💰</span>}
            backgroundColor="bg-green-50"
            iconColor="text-green-600"
          />
          <StatCard
            label="Total VAT"
            value={formatCurrency(summary.totalVAT)}
            icon={<span>📊</span>}
            backgroundColor="bg-purple-50"
            iconColor="text-purple-600"
          />
          <StatCard
            label="Outstanding"
            value={formatCurrency(summary.totalOutstanding)}
            icon={<span>⏳</span>}
            backgroundColor="bg-orange-50"
            iconColor="text-orange-600"
          />
          {deliveredNotInvoiced && (
            <StatCard
              label="Delivered (Not Invoiced)"
              value={`${deliveredNotInvoiced.count} items`}
              icon={<span>🚚</span>}
              backgroundColor="bg-red-50"
              iconColor="text-red-600"
            />
          )}
        </div>
      )}

      {/* Quick Check by Lifting ID / Dispatch ID Widget */}
      <Card className="border-blue-200 bg-linear-to-r from-blue-50/50 to-indigo-50/50">
        <CardBody className="p-4 sm:p-5 space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-blue-600 text-white">
                <CheckCircle2 className="w-4 h-4" />
              </div>
              <h3 className="font-semibold text-sm text-gray-900">
                Check Invoice Status by Lifting No, Dispatch No, or ID
              </h3>
            </div>
            <span className="text-xs text-gray-500">
              Instantly check whether a delivery or lifting has already been invoiced
            </span>
          </div>

          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                value={lookupId}
                onChange={(e) => setLookupId(e.target.value)}
                placeholder="Enter Lifting # (e.g. LFT-001), Dispatch # (e.g. DSP-002), or Invoice #..."
                className="w-full pl-9 pr-4 py-2 text-sm bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
              />
              {lookupId && (
                <button
                  onClick={() => setLookupId('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400 hover:text-gray-600"
                >
                  Clear
                </button>
              )}
            </div>
          </div>

          {/* Lookup Result Box */}
          {lookupResult && (
            <div
              className={`p-3.5 rounded-xl border text-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3 animate-in fade-in duration-150 ${
                lookupResult.type === 'INVOICED'
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                  : lookupResult.type === 'UNINVOICED'
                  ? 'bg-amber-50 border-amber-200 text-amber-900'
                  : 'bg-gray-50 border-gray-200 text-gray-700'
              }`}
            >
              <div className="space-y-1">
                <div className="font-bold flex items-center gap-1.5">
                  {lookupResult.type === 'INVOICED' && <CheckCircle2 className="w-4 h-4 text-emerald-600" />}
                  {lookupResult.type === 'UNINVOICED' && <AlertCircle className="w-4 h-4 text-amber-600" />}
                  <span>{lookupResult.title}</span>
                </div>
                <p className="text-xs text-gray-600">{lookupResult.detail}</p>
              </div>

              <div>
                {lookupResult.type === 'INVOICED' && lookupResult.invoiceId && (
                  <Link
                    href={`/dashboard/sales/invoices/${lookupResult.invoiceId}`}
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-600 text-white hover:bg-emerald-700 transition-colors"
                  >
                    <span>View Invoice</span>
                    <ExternalLink className="w-3 h-3" />
                  </Link>
                )}
                {lookupResult.type === 'UNINVOICED' && (
                  <Link
                    href={
                      lookupResult.deliveryType === 'CEMENT'
                        ? '/dashboard/finance/cement-invoices'
                        : '/dashboard/aggregate/invoices'
                    }
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold bg-amber-600 text-white hover:bg-amber-700 transition-colors"
                  >
                    <span>Generate Invoice</span>
                    <ArrowRight className="w-3 h-3" />
                  </Link>
                )}
              </div>
            </div>
          )}
        </CardBody>
      </Card>

      {/* Estimated value banner for uninvoiced shipments */}
      {deliveredNotInvoiced && deliveredNotInvoiced.count > 0 && (
        <Card className="border-red-200 bg-red-50/40">
          <CardBody>
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div>
                <p className="text-xs sm:text-sm text-gray-600">
                  Total unbilled shipments ({deliveredNotInvoiced.cementCount || 0} cement liftings,{' '}
                  {deliveredNotInvoiced.aggregateCount || 0} aggregate deliveries):
                </p>
                <p className="text-2xl font-bold font-mono text-red-600 mt-0.5">
                  {formatCurrency(deliveredNotInvoiced.totalValue)}
                </p>
              </div>
              <button
                onClick={() => setActiveView(activeView === 'uninvoiced' ? 'invoiced' : 'uninvoiced')}
                className="px-4 py-2 rounded-lg text-sm font-semibold bg-red-600 text-white hover:bg-red-700 transition-colors cursor-pointer shadow-xs"
              >
                {activeView === 'uninvoiced' ? 'View Invoiced Sales' : 'View Delivered (Not Invoiced)'}
              </button>
            </div>
          </CardBody>
        </Card>
      )}

      {/* Main Filter & View Toggle Bar */}
      <Card>
        <CardHeader>
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            {/* View Selector Tabs */}
            <div className="flex rounded-lg border border-gray-300 overflow-hidden text-sm font-medium">
              <button
                onClick={() => setActiveView('invoiced')}
                className={`px-4 py-2 transition-colors cursor-pointer ${
                  activeView === 'invoiced'
                    ? 'bg-blue-600 text-white'
                    : 'bg-white text-gray-700 hover:bg-gray-50'
                }`}
              >
                Invoiced Sales ({summary?.totalInvoices || data.length})
              </button>
              <button
                onClick={() => setActiveView('uninvoiced')}
                className={`px-4 py-2 transition-colors border-l border-gray-300 flex items-center gap-2 cursor-pointer ${
                  activeView === 'uninvoiced'
                    ? 'bg-blue-600 text-white'
                    : 'bg-white text-gray-700 hover:bg-gray-50'
                }`}
              >
                <span>Delivered (Not Invoiced)</span>
                {deliveredNotInvoiced && deliveredNotInvoiced.count > 0 && (
                  <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-red-100 text-red-700">
                    {deliveredNotInvoiced.count}
                  </span>
                )}
              </button>
            </div>

            {/* Division & Sub-filters */}
            <div className="flex flex-wrap items-center gap-2.5">
              {activeView === 'uninvoiced' && (
                <div className="inline-flex rounded-lg border border-gray-300 p-0.5 bg-gray-50 text-xs">
                  <button
                    onClick={() => setUninvoicedTypeFilter('ALL')}
                    className={`px-2.5 py-1 rounded transition-colors ${
                      uninvoicedTypeFilter === 'ALL' ? 'bg-white font-bold shadow-xs text-gray-900' : 'text-gray-600'
                    }`}
                  >
                    All Types
                  </button>
                  <button
                    onClick={() => setUninvoicedTypeFilter('CEMENT')}
                    className={`px-2.5 py-1 rounded transition-colors ${
                      uninvoicedTypeFilter === 'CEMENT' ? 'bg-white font-bold shadow-xs text-gray-900' : 'text-gray-600'
                    }`}
                  >
                    Cement ({deliveredNotInvoiced?.cementCount || 0})
                  </button>
                  <button
                    onClick={() => setUninvoicedTypeFilter('AGGREGATE')}
                    className={`px-2.5 py-1 rounded transition-colors ${
                      uninvoicedTypeFilter === 'AGGREGATE' ? 'bg-white font-bold shadow-xs text-gray-900' : 'text-gray-600'
                    }`}
                  >
                    Aggregate ({deliveredNotInvoiced?.aggregateCount || 0})
                  </button>
                </div>
              )}

              <select
                value={selectedDivision}
                onChange={(e) => setSelectedDivision(e.target.value)}
                className="px-3 py-1.5 text-xs bg-white border border-gray-300 rounded-lg text-gray-900 focus:ring-2 focus:ring-blue-500"
              >
                <option value="ALL">All Divisions</option>
                <option value="CEMENT">Cement</option>
                <option value="AGGREGATE">Aggregate</option>
                <option value="CONSTRUCTION">Construction</option>
                <option value="MEDICAL">Medical</option>
              </select>
            </div>
          </div>
        </CardHeader>
        <CardBody className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Search Records</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Customer, Invoice #, Lifting #, Dispatch #..."
                  className="w-full pl-9 pr-3 py-2 text-sm rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Start Date</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => {
                  setStartDate(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full px-3 py-2 text-sm rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">End Date</label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => {
                  setEndDate(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full px-3 py-2 text-sm rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
        </CardBody>
      </Card>

      {/* Main Table Area */}
      <Card>
        <CardBody>
          {activeView === 'invoiced' ? (
            <Table<SalesRecord>
              data={filteredInvoiced}
              columns={invoicedColumns}
              pageSize={pageSize}
              totalPages={totalPages}
              currentPage={currentPage}
              onPageChange={setCurrentPage}
              emptyMessage={loading ? 'Loading invoiced sales report...' : 'No invoiced sales records found for the selected filters.'}
            />
          ) : (
            <Table<UninvoicedRecord>
              data={filteredUninvoiced}
              columns={uninvoicedColumns}
              pageSize={50}
              totalPages={1}
              currentPage={1}
              onPageChange={() => {}}
              emptyMessage={
                loading
                  ? 'Loading uninvoiced deliveries report...'
                  : 'No delivered-but-uninvoiced liftings or aggregate dispatches found.'
              }
            />
          )}
        </CardBody>
      </Card>
    </div>
  );
}
