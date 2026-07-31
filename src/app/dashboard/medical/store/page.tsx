'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useI18n } from '@/lib/i18n';
import { Card, CardBody, Table, Badge, Button, Input, Select } from '@/components/ui';
import type { ColumnDef } from '@/components/ui';
import { useApiList } from '@/hooks/useApi';

interface MedicalBatch {
  id: number;
  batchNo: string;
  item: { name: string; genericName: string; manufacturer: string } | null;
  quantity: number;
  expiryDate: string;
  warehouse: string;
  status: string;
}

function formatWarehouse(warehouse: string): string {
  return warehouse
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
}

export default function MedicalStorePage() {
  const { t } = useI18n();
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

  const { data, pagination, loading, error } = useApiList<MedicalBatch>('/api/medical/batches', {
    page: currentPage,
    limit: pageSize,
    search: searchTerm,
  });

  const columns: ColumnDef<MedicalBatch>[] = [
    { header: 'Batch No', accessor: 'batchNo', sortable: true },
    { header: 'Item', accessor: 'item', render: (_val, row) => row.item?.name || '-' },
    { header: 'Generic Name', accessor: 'item', render: (_val, row) => row.item?.genericName || '-' },
    { header: 'Quantity', accessor: 'quantity', render: (val) => Number(val).toLocaleString('en-US') },
    {
      header: 'Expiry Date', accessor: 'expiryDate',
      render: (val) => {
        if (!val) return '-';
        const date = new Date(val);
        const now = new Date();
        const threeMonths = new Date();
        threeMonths.setMonth(threeMonths.getMonth() + 3);
        const isExpired = date < now;
        const isNearExpiry = date < threeMonths && date >= now;
        return (
          <span className={isExpired ? 'text-red-600 font-semibold' : isNearExpiry ? 'text-orange-600 font-semibold' : ''}>
            {date.toLocaleDateString()}
            {isExpired && ' (Expired)'}
            {isNearExpiry && ' (Near Expiry)'}
          </span>
        );
      },
    },
    { header: 'Manufacturer', accessor: 'item', render: (_val, row) => row.item?.manufacturer || '-' },
    { header: 'Warehouse', accessor: 'warehouse', render: (val) => formatWarehouse(val) },
    {
      header: 'Status', accessor: 'status',
      render: (status) => <Badge status={status as any}>{status}</Badge>,
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-gray-900">Store Management</h1>
        <Link href="/dashboard/medical/store/new">
          <Button variant="primary" size="lg">+ Add Batch</Button>
        </Link>
      </div>

      <Card>
        <CardBody>
          <Input placeholder="Search by batch no or item name..." value={searchTerm} onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }} />
          <div className="mt-4 text-sm text-gray-600">
            {loading ? 'Loading...' : `Showing ${data.length} of ${pagination.total} batches`}
          </div>
        </CardBody>
      </Card>

      <Card>
        <CardBody>
          {error && <div className="text-red-600 mb-4">Error: {error}</div>}
          <Table<MedicalBatch>
            data={data}
            columns={columns}
            pageSize={pageSize}
            totalPages={pagination.pages}
            currentPage={currentPage}
            onPageChange={setCurrentPage}
            emptyMessage={loading ? 'Loading...' : 'No batches found'}
          />
        </CardBody>
      </Card>
    </div>
  );
}
