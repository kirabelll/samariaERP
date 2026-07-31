'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useI18n } from '@/lib/i18n';
import { Card, CardBody, Table, Badge, Button, Input } from '@/components/ui';
import type { ColumnDef } from '@/components/ui';
import { useApiList } from '@/hooks/useApi';

interface MedicalPricing {
  id: number;
  item: { name: string; genericName: string } | null;
  costPrice: number;
  sellingPrice: number;
  margin: number;
  effectiveDate: string;
  status: string;
}

export default function MedicalPricingPage() {
  const { t } = useI18n();
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

  const { data, pagination, loading, error } = useApiList<MedicalPricing>('/api/medical/pricing', {
    page: currentPage,
    limit: pageSize,
    search: searchTerm,
  });

  const columns: ColumnDef<MedicalPricing>[] = [
    { header: 'Item', accessor: 'item', render: (_val, row) => row.item?.name || '-' },
    { header: 'Generic Name', accessor: 'item', render: (_val, row) => row.item?.genericName || '-' },
    { header: 'Cost Price (ETB)', accessor: 'costPrice', render: (val) => Number(val).toLocaleString('en-US') },
    { header: 'Selling Price (ETB)', accessor: 'sellingPrice', render: (val) => Number(val).toLocaleString('en-US') },
    {
      header: 'Margin %', accessor: 'margin',
      render: (val) => `${Number(val).toFixed(1)}%`,
    },
    { header: 'Effective Date', accessor: 'effectiveDate', render: (val) => val ? new Date(val).toLocaleDateString() : '-' },
    { header: 'Status', accessor: 'status', render: (status) => <Badge status={status as any}>{status}</Badge> },
    {
      header: 'Actions', accessor: 'id',
      render: (id) => (
        <Link href={`/dashboard/medical/pricing/${id}/edit`}>
          <Button size="sm" variant="secondary">Edit</Button>
        </Link>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-gray-900">Pricing & Offers</h1>
        <Link href="/dashboard/medical/pricing/new">
          <Button variant="primary" size="lg">+ Set Price</Button>
        </Link>
      </div>

      <Card>
        <CardBody>
          <Input placeholder="Search by item name..." value={searchTerm} onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }} />
          <div className="mt-4 text-sm text-gray-600">
            {loading ? 'Loading...' : `Showing ${data.length} of ${pagination.total} pricing records`}
          </div>
        </CardBody>
      </Card>

      <Card>
        <CardBody>
          {error && <div className="text-red-600 mb-4">Error: {error}</div>}
          <Table<MedicalPricing>
            data={data}
            columns={columns}
            pageSize={pageSize}
            totalPages={pagination.pages}
            currentPage={currentPage}
            onPageChange={setCurrentPage}
            emptyMessage={loading ? 'Loading...' : 'No pricing records found'}
          />
        </CardBody>
      </Card>
    </div>
  );
}
