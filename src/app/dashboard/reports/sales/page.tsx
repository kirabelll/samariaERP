'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardBody, Table, Badge, Input } from '@/components/ui';
import { StatCard } from '@/components/ui/Card';
import type { ColumnDef } from '@/components/ui';

interface SalesRecord {
  id: number;
  invoiceNo: string;
  date: string;
  customer: string;
  amount: number;
  vat: number;
  paid: number;
  status: string;
  division: string;
}

interface UninvoicedRecord {
  id: string;
  liftingNo: string;
  customer: string;
  factory: string;
  weight: number;
  unitPrice: number;
  estValue: number;
  deliveryDate: string;
  status: string;
}

interface DeliveredNotInvoiced {
  count: number;
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
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [activeView, setActiveView] = useState<'invoiced' | 'uninvoiced'>('invoiced');
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
          setData(json.data.records);
          setSummary(json.data.summary);
          setDeliveredNotInvoiced(json.data.deliveredNotInvoiced || null);
          setTotalPages(json.data.pagination?.pages || 0);
        }
      } catch (err) { console.error(err); }
      setLoading(false);
    };
    fetchData();
  }, [currentPage, startDate, endDate]);

  const formatCurrency = (val: number) => `${Number(val).toLocaleString('en-US')} ETB`;

  const columns: ColumnDef<SalesRecord>[] = [
    { header: 'Invoice No', accessor: 'invoiceNo', sortable: true },
    { header: 'Date', accessor: 'date', render: (val) => val ? new Date(val).toLocaleDateString() : '-' },
    { header: 'Customer', accessor: 'customer' },
    { header: 'Amount (ETB)', accessor: 'amount', render: (val) => Number(val).toLocaleString('en-US') },
    { header: 'VAT (ETB)', accessor: 'vat', render: (val) => Number(val).toLocaleString('en-US') },
    { header: 'Paid (ETB)', accessor: 'paid', render: (val) => Number(val).toLocaleString('en-US') },
    { header: 'Division', accessor: 'division' },
    { header: 'Status', accessor: 'status', render: (status) => <Badge status={status as any}>{status}</Badge> },
  ];

  const uninvoicedColumns: ColumnDef<UninvoicedRecord>[] = [
    { header: 'Lifting No', accessor: 'liftingNo', sortable: true },
    { header: 'Customer', accessor: 'customer' },
    { header: 'Factory', accessor: 'factory' },
    { header: 'Weight (tons)', accessor: 'weight', render: (val) => Number(val).toLocaleString('en-US', { minimumFractionDigits: 2 }) },
    { header: 'Unit Price', accessor: 'unitPrice', render: (val) => Number(val).toLocaleString('en-US') },
    { header: 'Est. Value (ETB)', accessor: 'estValue', render: (val) => Number(val).toLocaleString('en-US') },
    { header: 'Delivery Date', accessor: 'deliveryDate', render: (val) => val ? new Date(val).toLocaleDateString() : '-' },
    {
      header: 'Status', accessor: 'status',
      render: (val) => (
        <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
          val === 'Verified' ? 'bg-green-100 text-green-800' : 'bg-amber-100 text-amber-800'
        }`}>{val}</span>
      ),
    },
  ];

  return (
    <div className="space-y-4 sm:space-y-6">
      <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900">Sales Reports</h1>

      {summary && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          <StatCard label="Total Invoices" value={summary.totalInvoices} icon={<span>📄</span>} backgroundColor="bg-blue-50" iconColor="text-blue-600" />
          <StatCard label="Total Revenue" value={formatCurrency(summary.totalAmount)} icon={<span>💰</span>} backgroundColor="bg-green-50" iconColor="text-green-600" />
          <StatCard label="Total VAT" value={formatCurrency(summary.totalVAT)} icon={<span>📊</span>} backgroundColor="bg-purple-50" iconColor="text-purple-600" />
          <StatCard label="Outstanding" value={formatCurrency(summary.totalOutstanding)} icon={<span>⏳</span>} backgroundColor="bg-orange-50" iconColor="text-orange-600" />
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

      {/* Estimated value card for uninvoiced */}
      {deliveredNotInvoiced && deliveredNotInvoiced.count > 0 && (
        <Card>
          <CardBody>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Estimated value of delivered but not yet invoiced liftings</p>
                <p className="text-2xl font-bold text-red-600 mt-1">{formatCurrency(deliveredNotInvoiced.totalValue)}</p>
              </div>
              <button
                onClick={() => { setActiveView(activeView === 'uninvoiced' ? 'invoiced' : 'uninvoiced'); }}
                className="px-4 py-2 rounded-lg text-sm font-medium bg-red-50 text-red-700 hover:bg-red-100 border border-red-200 transition-colors"
              >
                {activeView === 'uninvoiced' ? 'View Invoiced Sales' : 'View Uninvoiced Deliveries'}
              </button>
            </div>
          </CardBody>
        </Card>
      )}

      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <h2 className="text-lg font-semibold">Filter by Date Range</h2>
            {/* View Toggle */}
            <div className="flex rounded-lg border border-gray-300 overflow-hidden">
              <button
                onClick={() => setActiveView('invoiced')}
                className={`px-4 py-2 text-sm font-medium transition-colors ${
                  activeView === 'invoiced'
                    ? 'bg-blue-600 text-white'
                    : 'bg-white text-gray-700 hover:bg-gray-50'
                }`}
              >
                Invoiced
              </button>
              <button
                onClick={() => setActiveView('uninvoiced')}
                className={`px-4 py-2 text-sm font-medium transition-colors border-l border-gray-300 ${
                  activeView === 'uninvoiced'
                    ? 'bg-blue-600 text-white'
                    : 'bg-white text-gray-700 hover:bg-gray-50'
                }`}
              >
                Delivered (Not Invoiced)
                {deliveredNotInvoiced && deliveredNotInvoiced.count > 0 && (
                  <span className="ml-2 px-2 py-0.5 rounded-full text-xs bg-red-100 text-red-700">{deliveredNotInvoiced.count}</span>
                )}
              </button>
            </div>
          </div>
        </CardHeader>
        <CardBody>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
              <input type="date" value={startDate} onChange={(e) => { setStartDate(e.target.value); setCurrentPage(1); }}
                className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
              <input type="date" value={endDate} onChange={(e) => { setEndDate(e.target.value); setCurrentPage(1); }}
                className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500" />
            </div>
          </div>
        </CardBody>
      </Card>

      <Card>
        <CardBody>
          {activeView === 'invoiced' ? (
            <Table<SalesRecord>
              data={data}
              columns={columns}
              pageSize={pageSize}
              totalPages={totalPages}
              currentPage={currentPage}
              onPageChange={setCurrentPage}
              emptyMessage={loading ? 'Loading report...' : 'No sales data found for the selected period'}
            />
          ) : (
            <Table<UninvoicedRecord>
              data={deliveredNotInvoiced?.items || []}
              columns={uninvoicedColumns}
              pageSize={50}
              totalPages={1}
              currentPage={1}
              onPageChange={() => {}}
              emptyMessage={loading ? 'Loading report...' : 'No delivered-but-uninvoiced liftings found'}
            />
          )}
        </CardBody>
      </Card>
    </div>
  );
}
