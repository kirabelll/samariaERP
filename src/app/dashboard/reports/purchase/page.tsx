'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardBody, Table, Badge } from '@/components/ui';
import { StatCard } from '@/components/ui/Card';
import type { ColumnDef } from '@/components/ui';

interface PurchaseRecord {
  id: number;
  poNumber: string;
  date: string;
  supplier: string;
  amount: number;
  status: string;
  type?: string;
}

export default function PurchaseReportsPage() {
  const [data, setData] = useState<PurchaseRecord[]>([]);
  const [summary, setSummary] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const pageSize = 20;

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      const params = new URLSearchParams({ type: 'purchase', page: String(currentPage), limit: String(pageSize) });
      if (startDate) params.set('startDate', startDate);
      if (endDate) params.set('endDate', endDate);
      try {
        const res = await fetch(`/api/reports?${params}`);
        const json = await res.json();
        if (json.success) {
          setData(json.data.records);
          setSummary(json.data.summary);
          setTotalPages(json.data.pagination?.pages || 0);
        }
      } catch (err) { console.error(err); }
      setLoading(false);
    };
    fetchData();
  }, [currentPage, startDate, endDate]);

  const columns: ColumnDef<PurchaseRecord>[] = [
    { header: 'PO / Purchase No', accessor: 'poNumber', sortable: true },
    { header: 'Type', accessor: 'type', render: (val) => <Badge status={val === 'Cement' ? 'Active' : 'Pending'}>{val || 'PO'}</Badge> },
    { header: 'Date', accessor: 'date', render: (val) => val ? new Date(val).toLocaleDateString() : '-' },
    { header: 'Supplier / Factory', accessor: 'supplier' },
    { header: 'Amount (ETB)', accessor: 'amount', render: (val) => Number(val).toLocaleString('en-US') },
    { header: 'Status', accessor: 'status', render: (status) => <Badge status={status as any}>{status}</Badge> },
  ];

  return (
    <div className="space-y-4 sm:space-y-6">
      <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900">Purchase Reports</h1>

      {summary && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <StatCard label="Total Orders" value={summary.totalOrders} icon={<span>📋</span>} backgroundColor="bg-blue-50" iconColor="text-blue-600" />
          <StatCard label="Total Amount" value={`${Number(summary.totalAmount).toLocaleString('en-US')} ETB`} icon={<span>💰</span>} backgroundColor="bg-green-50" iconColor="text-green-600" />
        </div>
      )}

      <Card>
        <CardHeader><h2 className="text-lg font-semibold">Filter by Date Range</h2></CardHeader>
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
          <Table<PurchaseRecord>
            data={data}
            columns={columns}
            pageSize={pageSize}
            totalPages={totalPages}
            currentPage={currentPage}
            onPageChange={setCurrentPage}
            emptyMessage={loading ? 'Loading report...' : 'No purchase data found'}
          />
        </CardBody>
      </Card>
    </div>
  );
}
