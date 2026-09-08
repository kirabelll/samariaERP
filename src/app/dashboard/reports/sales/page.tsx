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
  PackageCheck,
  Eye,
  X,
  Boxes,
  HelpCircle,
} from 'lucide-react';

interface InvoiceItemBreakdown {
  id?: string;
  ref: string;
  type: 'CEMENT' | 'AGGREGATE' | 'OTHER';
  name?: string;
  description?: string;
  quantity?: number;
  unit?: string;
  unitPrice?: number;
  total?: number;
}

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
  deliveryRefs?: string[];
  deliveryIds?: string[];
  deliveriesCount?: number;
  dispatchesCount?: number;
  liftingsCount?: number;
  itemsBreakdown?: InvoiceItemBreakdown[];
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
  const [selectedInvoiceForModal, setSelectedInvoiceForModal] = useState<SalesRecord | null>(null);
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
        const matchId = rec.id?.toLowerCase().includes(q);
        const matchAnyRef = rec.deliveryRefs?.some((r) => r.toLowerCase().includes(q));
        const matchAnyId = rec.deliveryIds?.some((id) => id.toLowerCase().includes(q));
        const matchItemBreakdown = rec.itemsBreakdown?.some(
          (item) =>
            item.ref?.toLowerCase().includes(q) ||
            item.name?.toLowerCase().includes(q) ||
            item.description?.toLowerCase().includes(q)
        );

        if (!matchInvoice && !matchCust && !matchRef && !matchId && !matchAnyRef && !matchAnyId && !matchItemBreakdown) {
          return false;
        }
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

    // Check in invoiced records (match invoice number, direct ref, list of refs, delivery IDs, or item breakdowns)
    const foundInvoice = data.find((inv) => {
      if (inv.id.toLowerCase() === q || inv.invoiceNo.toLowerCase() === q) return true;
      if (inv.deliveryRefs?.some((r) => r.toLowerCase() === q)) return true;
      if (inv.deliveryIds?.some((id) => id.toLowerCase() === q)) return true;
      if (inv.itemsBreakdown?.some((item) => item.ref?.toLowerCase() === q || item.id?.toLowerCase() === q)) return true;
      if (inv.deliveryRef?.toLowerCase().includes(q)) return true;
      return false;
    });

    if (foundInvoice) {
      const isMulti = (foundInvoice.deliveriesCount || 0) > 1;
      const matchedItem = foundInvoice.itemsBreakdown?.find(
        (item) => item.ref?.toLowerCase() === q || item.id?.toLowerCase() === q
      );

      return {
        type: 'INVOICED',
        title: `Invoiced on ${foundInvoice.invoiceNo}${isMulti ? ` (${foundInvoice.deliveriesCount} shipments in batch)` : ''}`,
        detail: `Customer: ${foundInvoice.customer} | Division: ${foundInvoice.division} | Total Amount: ${formatCurrency(foundInvoice.amount)} | Status: ${foundInvoice.status}`,
        matchedItemDetail: matchedItem
          ? `Matched Item: ${matchedItem.name || matchedItem.ref} | Qty: ${matchedItem.quantity || 'N/A'} ${matchedItem.unit || ''} | Rate: ${matchedItem.unitPrice ? formatCurrency(matchedItem.unitPrice) : 'N/A'}`
          : undefined,
        allRefs: foundInvoice.deliveryRefs || [],
        date: foundInvoice.date ? new Date(foundInvoice.date).toLocaleDateString() : '',
        deliveryRef: foundInvoice.deliveryRef || 'Linked via Invoice ID',
        invoiceId: foundInvoice.id,
        invoiceNo: foundInvoice.invoiceNo,
        invoiceRecord: foundInvoice,
        isMulti,
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
        <div className="flex flex-col">
          <Link
            href={`/dashboard/sales/invoices/${row.id}`}
            className="font-mono font-semibold text-blue-600 hover:text-blue-800 hover:underline inline-flex items-center gap-1"
          >
            {val}
            <ExternalLink className="w-3 h-3 text-gray-400" />
          </Link>
          {row.deliveriesCount && row.deliveriesCount > 1 ? (
            <span className="text-[10px] text-purple-700 font-medium bg-purple-50 px-1.5 py-0.2 rounded mt-0.5 w-fit border border-purple-200">
              Batch ({row.deliveriesCount} items)
            </span>
          ) : null}
        </div>
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
      header: 'Liftings / Dispatches Included',
      accessor: 'deliveryRef',
      render: (val, row) => {
        const items = row.itemsBreakdown || [];
        const count = row.deliveriesCount || items.length;
        const refs = row.deliveryRefs || (val ? val.split(', ') : []);

        if (count === 0 && refs.length === 0) {
          return <span className="text-gray-400 text-xs">—</span>;
        }

        if (count === 1 || refs.length === 1) {
          const singleRef = refs[0] || val;
          const isLifting = singleRef?.startsWith('LFT') || row.division === 'CEMENT';
          return (
            <div className="flex items-center gap-1.5">
              <span
                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-mono font-medium border ${
                  isLifting
                    ? 'bg-blue-50 text-blue-800 border-blue-200'
                    : 'bg-slate-100 text-slate-800 border-slate-200'
                }`}
              >
                <Truck className="w-3 h-3 opacity-70" />
                {singleRef}
              </span>
              {items.length > 0 && (
                <button
                  onClick={() => setSelectedInvoiceForModal(row)}
                  title="View details"
                  className="p-1 text-gray-400 hover:text-blue-600 transition-colors"
                >
                  <Eye className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          );
        }

        // Multiple dispatches / liftings
        return (
          <div className="flex flex-col gap-1 items-start">
            <div className="flex flex-wrap items-center gap-1 max-w-xs">
              {refs.slice(0, 2).map((ref, idx) => (
                <span
                  key={idx}
                  className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[11px] font-mono font-medium bg-slate-100 text-slate-800 border border-slate-200"
                >
                  <Truck className="w-2.5 h-2.5 opacity-60" />
                  {ref}
                </span>
              ))}
              {refs.length > 2 && (
                <span className="text-[11px] font-semibold text-slate-600 px-1 py-0.5 bg-slate-200/70 rounded">
                  +{refs.length - 2} more
                </span>
              )}
            </div>
            <button
              onClick={() => setSelectedInvoiceForModal(row)}
              className="inline-flex items-center gap-1 text-xs font-semibold text-blue-600 hover:text-blue-800 hover:underline cursor-pointer pt-0.5"
            >
              <Boxes className="w-3 h-3" />
              <span>View All {count} Dispatches / Liftings</span>
            </button>
          </div>
        );
      },
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
            Audit invoiced sales, verify all multi-dispatch and multi-lifting items per invoice, and monitor unbilled shipments
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
              Instantly check whether an individual delivery or lifting is billed in single or multi-dispatch invoices
            </span>
          </div>

          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                value={lookupId}
                onChange={(e) => setLookupId(e.target.value)}
                placeholder="Enter Lifting # (e.g. LFT-001), Dispatch # (e.g. DISP-0000012), or Invoice #..."
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
                {lookupResult.matchedItemDetail && (
                  <p className="text-xs font-medium text-emerald-800 bg-emerald-100/70 px-2 py-0.5 rounded w-fit">
                    {lookupResult.matchedItemDetail}
                  </p>
                )}
                {lookupResult.isMulti && lookupResult.allRefs && lookupResult.allRefs.length > 0 && (
                  <div className="flex flex-wrap items-center gap-1 pt-1">
                    <span className="text-[11px] font-semibold text-gray-600">All shipments in this invoice:</span>
                    {lookupResult.allRefs.slice(0, 5).map((ref, idx) => (
                      <span key={idx} className="text-[10px] font-mono font-medium px-1.5 py-0.5 rounded bg-white text-gray-700 border border-emerald-300">
                        {ref}
                      </span>
                    ))}
                    {lookupResult.allRefs.length > 5 && (
                      <span className="text-[10px] font-semibold text-gray-500">
                        +{lookupResult.allRefs.length - 5} more
                      </span>
                    )}
                  </div>
                )}
              </div>

              <div className="flex items-center gap-2">
                {lookupResult.type === 'INVOICED' && lookupResult.invoiceRecord && lookupResult.isMulti && (
                  <button
                    onClick={() => setSelectedInvoiceForModal(lookupResult.invoiceRecord!)}
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold bg-white border border-emerald-300 text-emerald-800 hover:bg-emerald-100 transition-colors cursor-pointer"
                  >
                    <Boxes className="w-3.5 h-3.5" />
                    <span>View All {lookupResult.invoiceRecord.deliveriesCount} Items</span>
                  </button>
                )}
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

      {/* Multi-Dispatch & Multi-Lifting Detail Modal */}
      {selectedInvoiceForModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl max-w-3xl w-full max-h-[85vh] flex flex-col shadow-2xl border border-gray-200 overflow-hidden">
            {/* Modal Header */}
            <div className="p-5 border-b border-gray-200 flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-blue-600 text-white shadow-xs">
                  <Boxes className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-gray-900 text-lg flex items-center gap-2">
                    <span>Invoice {selectedInvoiceForModal.invoiceNo}</span>
                    <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-blue-100 text-blue-800">
                      {selectedInvoiceForModal.division}
                    </span>
                  </h3>
                  <p className="text-xs text-gray-500 mt-0.5">
                    Customer: <span className="font-semibold text-gray-700">{selectedInvoiceForModal.customer}</span> | Total Amount:{' '}
                    <span className="font-semibold text-gray-900">{formatCurrency(selectedInvoiceForModal.amount)}</span>
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSelectedInvoiceForModal(null)}
                className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body: Breakdown Table */}
            <div className="p-5 overflow-y-auto flex-1 space-y-4">
              <div className="flex items-center justify-between text-xs text-gray-600 bg-blue-50/70 p-3 rounded-lg border border-blue-200">
                <span className="font-medium text-blue-900">
                  This invoice contains {selectedInvoiceForModal.itemsBreakdown?.length || selectedInvoiceForModal.deliveriesCount || 0} consolidated deliveries/items.
                </span>
                <Link
                  href={`/dashboard/sales/invoices/${selectedInvoiceForModal.id}`}
                  className="inline-flex items-center gap-1 font-semibold text-blue-700 hover:underline"
                >
                  <span>Open Full Invoice</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </Link>
              </div>

              <div className="border border-gray-200 rounded-xl overflow-hidden shadow-xs">
                <table className="w-full text-left text-xs">
                  <thead className="bg-gray-50 text-gray-600 font-semibold border-b border-gray-200">
                    <tr>
                      <th className="py-2.5 px-3">#</th>
                      <th className="py-2.5 px-3">Reference / Dispatch #</th>
                      <th className="py-2.5 px-3">Type</th>
                      <th className="py-2.5 px-3">Description</th>
                      <th className="py-2.5 px-3 text-right">Quantity</th>
                      <th className="py-2.5 px-3 text-right">Unit Price</th>
                      <th className="py-2.5 px-3 text-right">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {selectedInvoiceForModal.itemsBreakdown && selectedInvoiceForModal.itemsBreakdown.length > 0 ? (
                      selectedInvoiceForModal.itemsBreakdown.map((item, idx) => (
                        <tr key={idx} className="hover:bg-gray-50/70 transition-colors">
                          <td className="py-2.5 px-3 text-gray-400 font-mono">{idx + 1}</td>
                          <td className="py-2.5 px-3 font-mono font-semibold text-gray-900">
                            <span className="inline-flex items-center gap-1">
                              <Truck className="w-3 h-3 text-slate-400" />
                              {item.ref}
                            </span>
                          </td>
                          <td className="py-2.5 px-3">
                            <span
                              className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                                item.type === 'CEMENT'
                                  ? 'bg-blue-100 text-blue-800'
                                  : item.type === 'AGGREGATE'
                                  ? 'bg-amber-100 text-amber-800'
                                  : 'bg-gray-100 text-gray-700'
                              }`}
                            >
                              {item.type}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 text-gray-600 max-w-xs truncate" title={item.description || item.name}>
                            {item.description || item.name || '—'}
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono font-medium text-gray-900">
                            {typeof item.quantity === 'number'
                              ? `${item.quantity.toLocaleString('en-US', { minimumFractionDigits: 2 })} ${item.unit || ''}`
                              : '—'}
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono text-gray-600">
                            {typeof item.unitPrice === 'number' ? formatCurrency(item.unitPrice) : '—'}
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono font-bold text-gray-900">
                            {typeof item.total === 'number' ? formatCurrency(item.total) : '—'}
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={7} className="py-4 text-center text-gray-500">
                          No line items found.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-gray-200 bg-gray-50 flex items-center justify-between">
              <span className="text-xs text-gray-500">
                Invoice Status:{' '}
                <span className="font-semibold text-gray-800">{selectedInvoiceForModal.status}</span>
              </span>
              <button
                onClick={() => setSelectedInvoiceForModal(null)}
                className="px-4 py-1.5 rounded-lg text-xs font-semibold bg-gray-200 hover:bg-gray-300 text-gray-800 transition-colors cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
