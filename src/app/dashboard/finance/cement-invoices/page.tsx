'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Card, CardBody, CardHeader, Table, Badge, Button, Input } from '@/components/ui';
import type { ColumnDef } from '@/components/ui';
import { FileText, Download } from 'lucide-react';

interface InvoiceInfo {
  id: string;
  invoiceNo: string;
  totalAmount: number;
  status: string;
  liftingId: string | null;
}

interface LiftingRecord {
  id: string;
  liftingNo: string;
  factoryWeight: number;
  liftingDate: string;
  status: string;
  customer?: { companyName: string };
  purchase?: { purchaseNo: string; cementType: string; unitPrice: number; factory?: { name: string } };
  coupon?: { couponNo: string; status?: string; tonnage?: number };
  // Populated client-side from separate invoice fetch
  _invoice?: InvoiceInfo | null;
}

export default function CementInvoicesPage() {
  const [liftings, setLiftings] = useState<LiftingRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'uninvoiced' | 'invoiced'>('uninvoiced');
  const [search, setSearch] = useState('');

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        // Fetch liftings and cement invoices in parallel
        const [liftRes, invRes] = await Promise.all([
          fetch('/api/cement/liftings?limit=200'),
          fetch('/api/sales/invoices?limit=500&division=CEMENT'),
        ]);
        const liftJson = await liftRes.json();
        const invJson = await invRes.json();

        const allLiftings: LiftingRecord[] = liftJson.success ? (liftJson.data || []) : [];
        const allInvoices: InvoiceInfo[] = invJson.success ? (invJson.data || []) : [];

        // Build a map: liftingId -> invoice
        const invoiceByLiftingId = new Map<string, InvoiceInfo>();
        allInvoices.forEach((inv: any) => {
          if (inv.liftingId) {
            invoiceByLiftingId.set(inv.liftingId, {
              id: inv.id,
              invoiceNo: inv.invoiceNo,
              totalAmount: inv.totalAmount,
              status: inv.status,
              liftingId: inv.liftingId,
            });
          }
        });

        // Attach invoice info to each lifting
        const enriched = allLiftings.map((l) => ({
          ...l,
          _invoice: invoiceByLiftingId.get(l.id) || null,
        }));

        setLiftings(enriched);
      } catch (err) {
        console.error(err);
      }
      setLoading(false);
    };
    fetchData();
  }, []);

  const filtered = liftings.filter((l) => {
    const hasInvoice = !!l._invoice;
    if (filter === 'uninvoiced' && hasInvoice) return false;
    if (filter === 'invoiced' && !hasInvoice) return false;
    if (search) {
      const s = search.toLowerCase();
      return (
        l.liftingNo.toLowerCase().includes(s) ||
        l.customer?.companyName?.toLowerCase().includes(s) ||
        l.purchase?.purchaseNo?.toLowerCase().includes(s) ||
        l.purchase?.factory?.name?.toLowerCase().includes(s) ||
        l.coupon?.couponNo?.toLowerCase().includes(s)
      );
    }
    return true;
  });

  const totalLiftings = liftings.length;
  const invoicedCount = liftings.filter((l) => !!l._invoice).length;
  const uninvoicedCount = totalLiftings - invoicedCount;

  const columns: ColumnDef<LiftingRecord>[] = [
    { header: 'Lifting No', accessor: 'liftingNo', sortable: true,
      render: (val, row) => (
        <Link href={`/dashboard/cement/liftings/${row.id}`} className="text-[#007AFF] hover:text-[#0055D4] font-medium">
          {val}
        </Link>
      ),
    },
    { header: 'Customer', accessor: 'customer', render: (_val, row) => row.customer?.companyName || '—' },
    { header: 'Factory', accessor: 'purchase', render: (_val, row) => row.purchase?.factory?.name || '—' },
    { header: 'Cement Type', accessor: 'id', render: (_val, row) => row.purchase?.cementType || '—' },
    {
      header: 'Coupon',
      accessor: 'coupon' as any,
      render: (_val: any, row: LiftingRecord) => {
        const couponNo = (row as any).coupon?.couponNo;
        return couponNo ? <span className="text-sm font-medium text-purple-600">{couponNo}</span> : <span className="text-gray-400">—</span>;
      },
    },
    { header: 'Weight (QT)', accessor: 'factoryWeight', render: (val) => Number(val).toLocaleString('en-US') },
    { header: 'Date', accessor: 'liftingDate', render: (val) => val ? new Date(val).toLocaleDateString() : '—' },
    { header: 'Status', accessor: 'status', render: (status) => <Badge status={status as any}>{status}</Badge> },
    {
      header: 'Invoice',
      accessor: '_invoice',
      render: (_val, row) => {
        const inv = row._invoice;
        if (!inv) return <span className="text-sm text-orange-500 font-medium">Not Invoiced</span>;
        return (
          <Link href={`/dashboard/sales/invoices/${inv.id}`} className="text-[#007AFF] hover:text-[#0055D4] text-sm font-medium">
            {inv.invoiceNo} ({inv.status})
          </Link>
        );
      },
    },
    {
      header: 'Action',
      accessor: 'id',
      render: (id, row) => {
        if (row._invoice) {
          return (
            <Link href={`/dashboard/sales/invoices/${row._invoice.id}`}>
              <Button variant="outline" size="sm">View</Button>
            </Link>
          );
        }
        return (
          <Link href={`/dashboard/finance/cement-invoices/new?liftingId=${id}`}>
            <Button variant="primary" size="sm">Create Invoice</Button>
          </Link>
        );
      },
    },
  ];

  const exportToExcel = () => {
    const headers = ['Lifting No', 'Customer', 'Factory', 'Cement Type', 'Coupon', 'Weight (QT)', 'Date', 'Status', 'Invoice No', 'Invoice Amount', 'Invoice Status'];
    const rows = filtered.map((l) => [
      l.liftingNo,
      l.customer?.companyName || '',
      l.purchase?.factory?.name || '',
      l.purchase?.cementType || '',
      l.coupon?.couponNo || '',
      l.factoryWeight,
      l.liftingDate ? new Date(l.liftingDate).toLocaleDateString() : '',
      l.status,
      l._invoice?.invoiceNo || '',
      l._invoice?.totalAmount ?? '',
      l._invoice?.status || '',
    ]);
    const csvContent = [headers, ...rows].map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    const date = new Date().toISOString().split('T')[0];
    link.href = url;
    link.download = `cement-invoices-${date}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex flex-wrap gap-3 items-center justify-between">
        <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900 flex items-center gap-2">
          <FileText className="w-7 h-7 text-[#007AFF]" />
          Cement Invoices
        </h1>
        <button onClick={exportToExcel} className="px-4 py-2 rounded-lg bg-green-600 text-white font-medium hover:bg-green-700 flex items-center gap-2 text-sm">
          <Download className="w-4 h-4" /> Export Excel
        </button>
      </div>

      {/* Summary Stats */}
      {!loading && (
        <div className="grid grid-cols-3 gap-4">
          <Card>
            <CardBody className="text-center py-3">
              <p className="text-2xl font-bold text-[#1D1D1F]">{totalLiftings}</p>
              <p className="text-xs text-[#86868B] uppercase font-medium">Total Liftings</p>
            </CardBody>
          </Card>
          <Card>
            <CardBody className="text-center py-3">
              <p className="text-2xl font-bold text-[#34C759]">{invoicedCount}</p>
              <p className="text-xs text-[#86868B] uppercase font-medium">Invoiced</p>
            </CardBody>
          </Card>
          <Card>
            <CardBody className="text-center py-3">
              <p className="text-2xl font-bold text-orange-500">{uninvoicedCount}</p>
              <p className="text-xs text-[#86868B] uppercase font-medium">Not Invoiced</p>
            </CardBody>
          </Card>
        </div>
      )}

      <Card>
        <CardBody>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Input
              placeholder="Search by lifting, customer, factory..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <div className="flex gap-2">
              {(['uninvoiced', 'all', 'invoiced'] as const).map((f) => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    filter === f
                      ? 'bg-[#007AFF] text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {f === 'uninvoiced' ? `Not Invoiced (${uninvoicedCount})` : f === 'invoiced' ? `Invoiced (${invoicedCount})` : `All (${totalLiftings})`}
                </button>
              ))}
            </div>
          </div>
          <div className="mt-3 text-sm text-gray-600">
            {loading ? 'Loading...' : `Showing ${filtered.length} liftings`}
          </div>
        </CardBody>
      </Card>

      <Card>
        <CardBody>
          <Table<LiftingRecord>
            data={filtered}
            columns={columns}
            pageSize={20}
            emptyMessage={loading ? 'Loading liftings...' : 'No liftings found'}
          />
        </CardBody>
      </Card>
    </div>
  );
}
