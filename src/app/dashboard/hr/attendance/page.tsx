'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useI18n } from '@/lib/i18n';
import { Card, CardBody, Table, Badge, Button, Input, Select } from '@/components/ui';
import type { ColumnDef } from '@/components/ui';
import { useApiList } from '@/hooks/useApi';

interface Attendance {
  id: number;
  employee: { employeeNo: string; firstName: string; lastName: string };
  date: string;
  checkIn: string;
  checkOut: string;
  hoursWorked: number;
  overtime: number;
  status: string;
}

export default function AttendancePage() {
  const { t } = useI18n();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

  const { data, pagination, loading, error } = useApiList<Attendance>('/api/hr/attendance', {
    page: currentPage,
    limit: pageSize,
    search: searchTerm,
    filters: { status: statusFilter },
  });

  const columns: ColumnDef<Attendance>[] = [
    {
      header: 'Employee',
      accessor: 'employee',
      render: (_val, row) => row.employee ? `${row.employee.firstName} ${row.employee.lastName}` : '-',
    },
    {
      header: 'Date',
      accessor: 'date',
      render: (val) => val ? new Date(val).toLocaleDateString() : '-',
    },
    { header: 'Check In', accessor: 'checkIn' },
    { header: 'Check Out', accessor: 'checkOut' },
    {
      header: 'Hours',
      accessor: 'hoursWorked',
      render: (val) => val ? Number(val).toFixed(1) : '-',
    },
    {
      header: 'Overtime',
      accessor: 'overtime',
      render: (val) => val ? Number(val).toFixed(1) : '0',
    },
    {
      header: 'Status',
      accessor: 'status',
      render: (status) => <Badge status={status as any}>{status}</Badge>,
    },
  ];

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex flex-wrap gap-3 items-center justify-between">
        <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900">Attendance</h1>
        <Link href="/dashboard/hr/attendance/new">
          <Button variant="primary" size="lg">+ Record Attendance</Button>
        </Link>
      </div>

      <Card>
        <CardBody>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <Input placeholder="Search by employee name..." value={searchTerm} onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }} />
            <Select
              options={[
                { value: '', label: 'All Statuses' },
                { value: 'Present', label: 'Present' },
                { value: 'Absent', label: 'Absent' },
                { value: 'Late', label: 'Late' },
                { value: 'HalfDay', label: 'Half Day' },
              ]}
              value={statusFilter}
              onChange={(e) => { setStatusFilter(e.target.value); setCurrentPage(1); }}
            />
          </div>
          <div className="mt-4 text-sm text-gray-600">
            {loading ? 'Loading...' : `Showing ${data.length} of ${pagination.total} records`}
          </div>
        </CardBody>
      </Card>

      <Card>
        <CardBody>
          {error && <div className="text-red-600 mb-4">Error: {error}</div>}
          <Table<Attendance>
            data={data}
            columns={columns}
            pageSize={pageSize}
            totalPages={pagination.pages}
            currentPage={currentPage}
            onPageChange={setCurrentPage}
            emptyMessage={loading ? 'Loading...' : 'No attendance records found'}
          />
        </CardBody>
      </Card>
    </div>
  );
}
