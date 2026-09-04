'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useI18n } from '@/lib/i18n';
import { Card, CardBody, Table, Badge, Button, Input, Select } from '@/components/ui';
import type { ColumnDef } from '@/components/ui';
import { useApiList } from '@/hooks/useApi';

interface Delivery {
  id: string;
  deliveryNo: string;
  salesOrder: { orderNo: string; customer: { companyName: string } } | null;
  deliveryDate: string;
  status: string;
  driverName: string;
  truckPlateNo: string;
}

export default function DeliveriesPage() {
  const { t } = useI18n();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

  const { data, pagination, loading, error, refetch } = useApiList<Delivery>('/api/sales/deliveries', {
    page: currentPage,
    limit: pageSize,
    search: searchTerm,
    filters: { status: statusFilter },
  });

  const handleDelete = async (delivery: Delivery) => {
    if (!window.confirm(`Are you sure you want to permanently delete delivery ${delivery.deliveryNo}?`)) {
      return;
    }
    try {
      const response = await fetch(`/api/sales/deliveries/${delivery.id}`, {
        method: 'DELETE',
      });
      const result = await response.json();
      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Failed to delete delivery');
      }
      alert('Delivery permanently deleted successfully.');
      if (refetch) refetch();
      else window.location.reload();
    } catch (err: any) {
      alert(err.message || 'Failed to permanently delete delivery');
    }
  };

  const columns: ColumnDef<Delivery>[] = [
    { header: 'Delivery No', accessor: 'deliveryNo', sortable: true },
    {
      header: 'Customer',
      accessor: 'salesOrder',
      render: (_val, row) => row.salesOrder?.customer?.companyName || '-',
    },
    {
      header: 'Sales Order',
      accessor: 'salesOrder',
      render: (_val, row) => row.salesOrder?.orderNo || '-',
    },
    {
      header: 'Date',
      accessor: 'deliveryDate',
      render: (val) => val ? new Date(val).toLocaleDateString() : '-',
    },
    { header: 'Driver', accessor: 'driverName' },
    { header: 'Vehicle', accessor: 'truckPlateNo' },
    {
      header: 'Status',
      accessor: 'status',
      render: (status) => <Badge status={status as any}>{status}</Badge>,
    },
    {
      header: 'Actions',
      accessor: 'id',
      render: (id, row) => (
        <div className="flex items-center gap-2">
          <Link href={`/dashboard/sales/deliveries/${id}`}>
            <Button size="sm" variant="outline">View</Button>
          </Link>
          <Button
            size="sm"
            variant="outline"
            onClick={() => handleDelete(row)}
            className="border-red-200 text-red-600 hover:bg-red-50 hover:border-red-300"
          >
            Delete
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex flex-wrap gap-3 items-center justify-between">
        <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900">Deliveries</h1>
        <Link href="/dashboard/sales/deliveries/new">
          <Button variant="primary" size="lg">+ New Delivery</Button>
        </Link>
      </div>

      <Card>
        <CardBody>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <Input placeholder="Search by delivery no..." value={searchTerm} onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }} />
            <Select
              options={[
                { value: '', label: 'All Statuses' },
                { value: 'Pending', label: 'Pending' },
                { value: 'InTransit', label: 'In Transit' },
                { value: 'Delivered', label: 'Delivered' },
                { value: 'Cancelled', label: 'Cancelled' },
              ]}
              value={statusFilter}
              onChange={(e) => { setStatusFilter(e.target.value); setCurrentPage(1); }}
            />
          </div>
          <div className="mt-4 text-sm text-gray-600">
            {loading ? 'Loading...' : `Showing ${data.length} of ${pagination.total} deliveries`}
          </div>
        </CardBody>
      </Card>

      <Card>
        <CardBody>
          {error && <div className="text-red-600 mb-4">Error: {error}</div>}
          <Table<Delivery>
            data={data}
            columns={columns}
            pageSize={pageSize}
            totalPages={pagination.pages}
            currentPage={currentPage}
            onPageChange={setCurrentPage}
            emptyMessage={loading ? 'Loading...' : 'No deliveries found'}
          />
        </CardBody>
      </Card>
    </div>
  );
}
