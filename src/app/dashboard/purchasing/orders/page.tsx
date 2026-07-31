'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useI18n } from '@/lib/i18n';
import { Card, CardBody, Table, Badge, Button, Input, Select } from '@/components/ui';
import type { ColumnDef } from '@/components/ui';
import { useApiList } from '@/hooks/useApi';

interface PurchaseOrder {
  id: string;
  poNo: string;
  supplier: { id: string; companyName: string };
  totalAmount: number;
  status: string;
  createdAt: string;
}

export default function PurchaseOrdersPage() {
  const { t } = useI18n();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

  const { data, pagination, loading, error } = useApiList<PurchaseOrder>('/api/purchasing/orders', {
    page: currentPage,
    limit: pageSize,
    search: searchTerm,
    filters: { status: statusFilter },
  });

  const columns: ColumnDef<PurchaseOrder>[] = [
    { header: 'PO No', accessor: 'poNo', sortable: true },
    {
      header: 'Supplier',
      accessor: 'supplier',
      render: (_val, row) => row.supplier?.companyName || '-',
    },
    {
      header: 'Created Date',
      accessor: 'createdAt',
      render: (val) => val ? new Date(val).toLocaleDateString() : '-',
    },
    {
      header: 'Total (ETB)',
      accessor: 'totalAmount',
      render: (val) => Number(val).toLocaleString('en-US'),
    },
    {
      header: 'Status',
      accessor: 'status',
      render: (status) => <Badge status={status as any}>{status}</Badge>,
    },
    {
      header: 'Actions',
      accessor: 'id',
      render: (id) => (
        <Link href={`/dashboard/purchasing/orders/${id}`}>
          <Button size="sm" variant="outline">View</Button>
        </Link>
      ),
    },
  ];

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex flex-wrap gap-3 items-center justify-between">
        <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900">Purchase Orders</h1>
        <Link href="/dashboard/purchasing/orders/new">
          <Button variant="primary" size="lg">+ New Purchase Order</Button>
        </Link>
      </div>

      <Card>
        <CardBody>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <Input placeholder="Search by PO number or supplier..." value={searchTerm} onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }} />
            <Select
              options={[
                { value: '', label: 'All Statuses' },
                { value: 'Draft', label: 'Draft' },
                { value: 'Approved', label: 'Approved' },
                { value: 'Received', label: 'Received' },
                { value: 'Cancelled', label: 'Cancelled' },
              ]}
              value={statusFilter}
              onChange={(e) => { setStatusFilter(e.target.value); setCurrentPage(1); }}
            />
          </div>
          <div className="mt-4 text-sm text-gray-600">
            {loading ? 'Loading...' : `Showing ${data.length} of ${pagination.total} purchase orders`}
          </div>
        </CardBody>
      </Card>

      <Card>
        <CardBody>
          {error && <div className="text-red-600 mb-4">Error: {error}</div>}
          <Table<PurchaseOrder>
            data={data}
            columns={columns}
            pageSize={pageSize}
            totalPages={pagination.pages}
            currentPage={currentPage}
            onPageChange={setCurrentPage}
            emptyMessage={loading ? 'Loading...' : 'No purchase orders found'}
          />
        </CardBody>
      </Card>
    </div>
  );
}
