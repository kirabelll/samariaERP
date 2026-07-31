'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useI18n } from '@/lib/i18n';
import { Card, CardBody, Table, Badge, Button, Input, Select } from '@/components/ui';
import type { ColumnDef } from '@/components/ui';
import { useApiList } from '@/hooks/useApi';

interface CustomerPayment {
  id: string;
  receiptNo: string;
  customer: { id: string; companyName: string };
  invoice: { invoiceNo: string } | null;
  paymentDate: string;
  amount: number;
  paymentMethod: string;
  refNo: string;
  status: string;
}

export default function CustomerPaymentsPage() {
  const { t } = useI18n();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

  const { data, pagination, loading, error } = useApiList<CustomerPayment>('/api/sales/payments', {
    page: currentPage,
    limit: pageSize,
    search: searchTerm,
    filters: { status: statusFilter },
  });

  const columns: ColumnDef<CustomerPayment>[] = [
    { header: 'Receipt No', accessor: 'receiptNo', sortable: true },
    {
      header: 'Customer',
      accessor: 'customer',
      render: (_val, row) => row.customer?.companyName || '-',
    },
    {
      header: 'Invoice',
      accessor: 'invoice',
      render: (_val, row) => row.invoice?.invoiceNo || '-',
    },
    {
      header: 'Date',
      accessor: 'paymentDate',
      render: (val) => val ? new Date(val).toLocaleDateString() : '-',
    },
    {
      header: 'Amount (ETB)',
      accessor: 'amount',
      render: (val) => Number(val).toLocaleString('en-US'),
    },
    { header: 'Method', accessor: 'paymentMethod' },
    { header: 'Reference', accessor: 'refNo' },
    {
      header: 'Status',
      accessor: 'status',
      render: (status) => <Badge status={status as any}>{status}</Badge>,
    },
    {
      header: 'Actions',
      accessor: 'id',
      render: (id) => (
        <Link href={`/dashboard/sales/payments/${id}`}>
          <Button size="sm" variant="outline">View</Button>
        </Link>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-gray-900">Customer Payments</h1>
        <Link href="/dashboard/sales/payments/new">
          <Button variant="primary" size="lg">+ Record Payment</Button>
        </Link>
      </div>

      <Card>
        <CardBody>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <Input placeholder="Search by receipt no or customer..." value={searchTerm} onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }} />
            <Select
              options={[
                { value: '', label: 'All Statuses' },
                { value: 'Active', label: 'Active' },
                { value: 'Cancelled', label: 'Cancelled' },
              ]}
              value={statusFilter}
              onChange={(e) => { setStatusFilter(e.target.value); setCurrentPage(1); }}
            />
          </div>
          <div className="mt-4 text-sm text-gray-600">
            {loading ? 'Loading...' : `Showing ${data.length} of ${pagination.total} payments`}
          </div>
        </CardBody>
      </Card>

      <Card>
        <CardBody>
          {error && <div className="text-red-600 mb-4">Error: {error}</div>}
          <Table<CustomerPayment>
            data={data}
            columns={columns}
            pageSize={pageSize}
            totalPages={pagination.pages}
            currentPage={currentPage}
            onPageChange={setCurrentPage}
            emptyMessage={loading ? 'Loading...' : 'No payments found'}
          />
        </CardBody>
      </Card>
    </div>
  );
}
