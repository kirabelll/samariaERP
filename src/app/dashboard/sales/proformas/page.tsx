'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useI18n } from '@/lib/i18n';
import { Card, CardBody, Table, Badge, Button, Input, Select } from '@/components/ui';
import type { ColumnDef } from '@/components/ui';
import { useApiList } from '@/hooks/useApi';

interface Proforma {
  id: string;
  proformaNo: string;
  customer: { id: string; companyName: string };
  division: string;
  createdAt: string;
  validityDays: number;
  totalAmount: number;
  status: string;
}

export default function ProformasPage() {
  const { t } = useI18n();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

  const { data, pagination, loading, error } = useApiList<Proforma>('/api/sales/proformas', {
    page: currentPage,
    limit: pageSize,
    search: searchTerm,
    filters: { status: statusFilter },
  });

  const columns: ColumnDef<Proforma>[] = [
    { header: 'Proforma No', accessor: 'proformaNo', sortable: true },
    {
      header: 'Customer',
      accessor: 'customer',
      render: (_val, row) => row.customer?.companyName || '-',
    },
    { header: 'Division', accessor: 'division' },
    {
      header: 'Date',
      accessor: 'createdAt',
      render: (val) => val ? new Date(val).toLocaleDateString() : '-',
    },
    {
      header: 'Validity (Days)',
      accessor: 'validityDays',
      render: (val) => val || '-',
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
        <div className="flex gap-2">
          <Link href={`/dashboard/sales/proformas/${id}`}>
            <Button size="sm" variant="outline">View</Button>
          </Link>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex flex-wrap gap-3 items-center justify-between">
        <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900">Proformas</h1>
        <Link href="/dashboard/sales/proformas/new">
          <Button variant="primary" size="lg">+ New Proforma</Button>
        </Link>
      </div>

      <Card>
        <CardBody>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <Input placeholder="Search by proforma no or customer..." value={searchTerm} onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }} />
            <Select
              options={[
                { value: '', label: 'All Statuses' },
                { value: 'Draft', label: 'Draft' },
                { value: 'Sent', label: 'Sent' },
                { value: 'Accepted', label: 'Accepted' },
                { value: 'Expired', label: 'Expired' },
                { value: 'Cancelled', label: 'Cancelled' },
              ]}
              value={statusFilter}
              onChange={(e) => { setStatusFilter(e.target.value); setCurrentPage(1); }}
            />
          </div>
          <div className="mt-4 text-sm text-gray-600">
            {loading ? 'Loading...' : `Showing ${data.length} of ${pagination.total} proformas`}
          </div>
        </CardBody>
      </Card>

      <Card>
        <CardBody>
          {error && <div className="text-red-600 mb-4">Error: {error}</div>}
          <Table<Proforma>
            data={data}
            columns={columns}
            pageSize={pageSize}
            totalPages={pagination.pages}
            currentPage={currentPage}
            onPageChange={setCurrentPage}
            emptyMessage={loading ? 'Loading...' : 'No proformas found'}
          />
        </CardBody>
      </Card>
    </div>
  );
}
