'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useI18n } from '@/lib/i18n';
import { Card, CardBody, Table, Badge, Button, Input, Select } from '@/components/ui';
import type { ColumnDef } from '@/components/ui';
import { useApiList } from '@/hooks/useApi';

interface GoodsReceive {
  id: string;
  grvNo: string;
  supplier?: { companyName: string } | null;
  purchaseOrder?: { poNo: string; supplier: { companyName: string } } | null;
  totalAmount?: number;
  receivedDate: string;
  status: string;
  receivedBy: string;
}

export default function GoodsReceivingPage() {
  const { t } = useI18n();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

  const { data, pagination, loading, error } = useApiList<GoodsReceive>('/api/purchasing/grv', {
    page: currentPage,
    limit: pageSize,
    search: searchTerm,
    filters: { status: statusFilter },
  });

  const columns: ColumnDef<GoodsReceive>[] = [
    { header: 'GRV No', accessor: 'grvNo', sortable: true },
    {
      header: 'Supplier',
      accessor: 'supplier',
      render: (_val, row) => row.supplier?.companyName || row.purchaseOrder?.supplier?.companyName || '-',
    },
    {
      header: 'PO No',
      accessor: 'purchaseOrder',
      render: (_val, row) => row.purchaseOrder?.poNo || '-',
    },
    {
      header: 'Total Amount',
      accessor: 'totalAmount',
      render: (val) => val ? `ETB ${Number(val).toLocaleString('en-US', { minimumFractionDigits: 2 })}` : '-',
    },
    {
      header: 'Received Date',
      accessor: 'receivedDate',
      render: (val) => val ? new Date(val).toLocaleDateString() : '-',
    },
    { header: 'Received By', accessor: 'receivedBy' },
    {
      header: 'Status',
      accessor: 'status',
      render: (status) => <Badge status={status as any}>{status}</Badge>,
    },
    {
      header: 'Actions',
      accessor: 'id',
      render: (id) => (
        <Link href={`/dashboard/purchasing/grv/${id}`}>
          <Button size="sm" variant="outline">View</Button>
        </Link>
      ),
    },
  ];

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex flex-wrap gap-3 items-center justify-between">
        <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900">Goods Receiving</h1>
        <Link href="/dashboard/purchasing/grv/new">
          <Button variant="primary" size="lg">+ New GRV</Button>
        </Link>
      </div>

      <Card>
        <CardBody>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <Input placeholder="Search by GRV number..." value={searchTerm} onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }} />
            <Select
              options={[
                { value: '', label: 'All Statuses' },
                { value: 'Draft', label: 'Draft' },
                { value: 'Confirmed', label: 'Confirmed' },
                { value: 'Cancelled', label: 'Cancelled' },
              ]}
              value={statusFilter}
              onChange={(e) => { setStatusFilter(e.target.value); setCurrentPage(1); }}
            />
          </div>
          <div className="mt-4 text-sm text-gray-600">
            {loading ? 'Loading...' : `Showing ${data.length} of ${pagination.total} GRVs`}
          </div>
        </CardBody>
      </Card>

      <Card>
        <CardBody>
          {error && <div className="text-red-600 mb-4">Error: {error}</div>}
          <Table<GoodsReceive>
            data={data}
            columns={columns}
            pageSize={pageSize}
            totalPages={pagination.pages}
            currentPage={currentPage}
            onPageChange={setCurrentPage}
            emptyMessage={loading ? 'Loading...' : 'No goods receive records found'}
          />
        </CardBody>
      </Card>
    </div>
  );
}
