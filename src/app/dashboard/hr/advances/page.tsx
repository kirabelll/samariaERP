'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useI18n } from '@/lib/i18n';
import { Card, CardBody, Table, Badge, Button, Input, Select } from '@/components/ui';
import type { ColumnDef } from '@/components/ui';
import { useApiList } from '@/hooks/useApi';

interface EmployeeAdvance {
  id: number;
  employee: { employeeNo: string; firstName: string; lastName: string };
  issueDate: string;
  amount: number;
  reason: string;
  repaymentMethod: string;
  monthlyDeduction: number;
  remainingBal: number;
  status: string;
}

export default function EmployeeAdvancesPage() {
  const { t } = useI18n();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

  const { data, pagination, loading, error } = useApiList<EmployeeAdvance>('/api/hr/advances', {
    page: currentPage,
    limit: pageSize,
    search: searchTerm,
    filters: { status: statusFilter },
  });

  const columns: ColumnDef<EmployeeAdvance>[] = [
    {
      header: 'Employee',
      accessor: 'employee',
      render: (_val, row) => row.employee ? `${row.employee.firstName} ${row.employee.lastName}` : '-',
    },
    {
      header: 'Date',
      accessor: 'issueDate',
      render: (val) => val ? new Date(val).toLocaleDateString() : '-',
    },
    {
      header: 'Amount (ETB)',
      accessor: 'amount',
      render: (val) => Number(val).toLocaleString('en-US'),
    },
    { header: 'Reason', accessor: 'reason' },
    {
      header: 'Monthly Deduction',
      accessor: 'monthlyDeduction',
      render: (val) => Number(val).toLocaleString('en-US'),
    },
    {
      header: 'Remaining',
      accessor: 'remainingBal',
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
        <Link href={`/dashboard/hr/advances/${id}`}>
          <Button size="sm" variant="outline">View</Button>
        </Link>
      ),
    },
  ];

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex flex-wrap gap-3 items-center justify-between">
        <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900">Employee Advances</h1>
        <Link href="/dashboard/hr/advances/new">
          <Button variant="primary" size="lg">+ New Advance</Button>
        </Link>
      </div>

      <Card>
        <CardBody>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <Input placeholder="Search by employee name..." value={searchTerm} onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }} />
            <Select
              options={[
                { value: '', label: 'All Statuses' },
                { value: 'Active', label: 'Active' },
                { value: 'Repaid', label: 'Repaid' },
                { value: 'Cancelled', label: 'Cancelled' },
              ]}
              value={statusFilter}
              onChange={(e) => { setStatusFilter(e.target.value); setCurrentPage(1); }}
            />
          </div>
          <div className="mt-4 text-sm text-gray-600">
            {loading ? 'Loading...' : `Showing ${data.length} of ${pagination.total} advances`}
          </div>
        </CardBody>
      </Card>

      <Card>
        <CardBody>
          {error && <div className="text-red-600 mb-4">Error: {error}</div>}
          <Table<EmployeeAdvance>
            data={data}
            columns={columns}
            pageSize={pageSize}
            totalPages={pagination.pages}
            currentPage={currentPage}
            onPageChange={setCurrentPage}
            emptyMessage={loading ? 'Loading...' : 'No employee advances found'}
          />
        </CardBody>
      </Card>
    </div>
  );
}
