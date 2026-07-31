'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useI18n } from '@/lib/i18n';
import { Card, CardBody, Table, Badge, Button, Input, Select } from '@/components/ui';
import type { ColumnDef } from '@/components/ui';
import { useApiList } from '@/hooks/useApi';

interface LeaveRequest {
  id: number;
  employee: { employeeNo: string; firstName: string; lastName: string };
  leaveType: string;
  startDate: string;
  endDate: string;
  totalDays: number;
  reason: string;
  status: string;
}

export default function LeaveManagementPage() {
  const { t } = useI18n();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

  const { data, pagination, loading, error } = useApiList<LeaveRequest>('/api/hr/leave', {
    page: currentPage,
    limit: pageSize,
    search: searchTerm,
    filters: { status: statusFilter },
  });

  const columns: ColumnDef<LeaveRequest>[] = [
    {
      header: 'Employee',
      accessor: 'employee',
      render: (_val, row) => row.employee ? `${row.employee.firstName} ${row.employee.lastName}` : '-',
    },
    { header: 'Leave Type', accessor: 'leaveType', sortable: true },
    {
      header: 'Start Date',
      accessor: 'startDate',
      render: (val) => val ? new Date(val).toLocaleDateString() : '-',
    },
    {
      header: 'End Date',
      accessor: 'endDate',
      render: (val) => val ? new Date(val).toLocaleDateString() : '-',
    },
    { header: 'Days', accessor: 'totalDays' },
    { header: 'Reason', accessor: 'reason' },
    {
      header: 'Status',
      accessor: 'status',
      render: (status) => <Badge status={status as any}>{status}</Badge>,
    },
    {
      header: 'Actions',
      accessor: 'id',
      render: (id) => (
        <Link href={`/dashboard/hr/leave/${id}`}>
          <Button size="sm" variant="outline">View</Button>
        </Link>
      ),
    },
  ];

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex flex-wrap gap-3 items-center justify-between">
        <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900">Leave Management</h1>
        <Link href="/dashboard/hr/leave/new">
          <Button variant="primary" size="lg">+ New Leave Request</Button>
        </Link>
      </div>

      <Card>
        <CardBody>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <Input placeholder="Search by employee name..." value={searchTerm} onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }} />
            <Select
              options={[
                { value: '', label: 'All Statuses' },
                { value: 'Pending', label: 'Pending' },
                { value: 'Approved', label: 'Approved' },
                { value: 'Rejected', label: 'Rejected' },
              ]}
              value={statusFilter}
              onChange={(e) => { setStatusFilter(e.target.value); setCurrentPage(1); }}
            />
          </div>
          <div className="mt-4 text-sm text-gray-600">
            {loading ? 'Loading...' : `Showing ${data.length} of ${pagination.total} leave requests`}
          </div>
        </CardBody>
      </Card>

      <Card>
        <CardBody>
          {error && <div className="text-red-600 mb-4">Error: {error}</div>}
          <Table<LeaveRequest>
            data={data}
            columns={columns}
            pageSize={pageSize}
            totalPages={pagination.pages}
            currentPage={currentPage}
            onPageChange={setCurrentPage}
            emptyMessage={loading ? 'Loading...' : 'No leave requests found'}
          />
        </CardBody>
      </Card>
    </div>
  );
}
