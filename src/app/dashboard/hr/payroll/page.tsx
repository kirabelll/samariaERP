'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useI18n } from '@/lib/i18n';
import { Card, CardBody, Table, Badge, Button, Input, Select } from '@/components/ui';
import type { ColumnDef } from '@/components/ui';
import { useApiList } from '@/hooks/useApi';

interface PayrollItem {
  id: number;
  grossSalary: number;
  deductions: number;
  netSalary: number;
  employee: {
    id: number;
    firstName: string;
    lastName: string;
  };
}

interface PayrollPeriod {
  id: number;
  periodName: string;
  month: number;
  year: number;
  items: PayrollItem[];
  status: string;
}

export default function PayrollProcessingPage() {
  const { t } = useI18n();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

  const { data, pagination, loading, error } = useApiList<PayrollPeriod>('/api/hr/payroll', {
    page: currentPage,
    limit: pageSize,
    search: searchTerm,
    filters: { status: statusFilter },
  });

  const columns: ColumnDef<PayrollPeriod>[] = [
    { header: 'Period', accessor: 'periodName', sortable: true },
    {
      header: 'Start Date',
      accessor: 'month',
      render: (_, row) => {
        const date = new Date(row.year, row.month - 1, 1);
        return date.toLocaleDateString();
      },
    },
    {
      header: 'End Date',
      accessor: 'month',
      render: (_, row) => {
        const date = new Date(row.year, row.month, 0);
        return date.toLocaleDateString();
      },
    },
    {
      header: 'Pay Date',
      accessor: 'month',
      render: (_, row) => {
        const date = new Date(row.year, row.month, 5);
        return date.toLocaleDateString();
      },
    },
    {
      header: 'Total Gross (ETB)',
      accessor: 'items',
      render: (items: PayrollItem[]) => {
        const total = items.reduce((sum, item) => sum + (item.grossSalary || 0), 0);
        return Number(total).toLocaleString('en-US');
      },
    },
    {
      header: 'Total Net (ETB)',
      accessor: 'items',
      render: (items: PayrollItem[]) => {
        const total = items.reduce((sum, item) => sum + (item.netSalary || 0), 0);
        return Number(total).toLocaleString('en-US');
      },
    },
    {
      header: 'Employees',
      accessor: 'items',
      render: (items: PayrollItem[]) => items.length,
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
        <Link href={`/dashboard/hr/payroll/${id}`}>
          <Button size="sm" variant="outline">View</Button>
        </Link>
      ),
    },
  ];

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex flex-wrap gap-3 items-center justify-between">
        <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900">Payroll Processing</h1>
        <Link href="/dashboard/hr/payroll/new">
          <Button variant="primary" size="lg">+ New Payroll Period</Button>
        </Link>
      </div>

      <Card>
        <CardBody>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <Input placeholder="Search by period name..." value={searchTerm} onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }} />
            <Select
              options={[
                { value: '', label: 'All Statuses' },
                { value: 'Draft', label: 'Draft' },
                { value: 'Processing', label: 'Processing' },
                { value: 'Approved', label: 'Approved' },
                { value: 'Paid', label: 'Paid' },
                { value: 'Locked', label: 'Locked' },
              ]}
              value={statusFilter}
              onChange={(e) => { setStatusFilter(e.target.value); setCurrentPage(1); }}
            />
          </div>
          <div className="mt-4 text-sm text-gray-600">
            {loading ? 'Loading...' : `Showing ${data.length} of ${pagination.total} payroll periods`}
          </div>
        </CardBody>
      </Card>

      <Card>
        <CardBody>
          {error && <div className="text-red-600 mb-4">Error: {error}</div>}
          <Table<PayrollPeriod>
            data={data}
            columns={columns}
            pageSize={pageSize}
            totalPages={pagination.pages}
            currentPage={currentPage}
            onPageChange={setCurrentPage}
            emptyMessage={loading ? 'Loading...' : 'No payroll periods found'}
          />
        </CardBody>
      </Card>
    </div>
  );
}
