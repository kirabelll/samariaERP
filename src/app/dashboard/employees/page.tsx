'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useI18n } from '@/lib/i18n';
import { Card, CardBody, Table, Badge, Button, Input, Select } from '@/components/ui';
import type { ColumnDef } from '@/components/ui';
import { useApiList } from '@/hooks/useApi';

interface Employee {
  id: string | number;
  employeeNo: string;
  firstName: string;
  lastName: string;
  department: string;
  position: string;
  phone: string;
  email: string;
  employmentType: string;
  baseSalary: number;
  status: string;
}

export default function EmployeesPage() {
  const { t } = useI18n();
  const [searchTerm, setSearchTerm] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

  const { data, pagination, loading, error } = useApiList<Employee>('/api/employees', {
    page: currentPage,
    limit: pageSize,
    search: searchTerm,
    filters: { department: departmentFilter, status: statusFilter },
  });

  const columns: ColumnDef<Employee>[] = [
    { header: 'Employee No', accessor: 'employeeNo', sortable: true },
    {
      header: 'Full Name',
      accessor: 'firstName',
      sortable: true,
      render: (_val, row) => `${row.firstName} ${row.lastName}`,
    },
    { header: 'Department', accessor: 'department', sortable: true },
    { header: 'Position', accessor: 'position' },
    { header: 'Phone', accessor: 'phone' },
    { header: 'Type', accessor: 'employmentType' },
    {
      header: 'Salary (ETB)',
      accessor: 'baseSalary',
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
          <Link href={`/dashboard/employees/${id}`}>
            <Button size="sm" variant="outline">View</Button>
          </Link>
          <Link href={`/dashboard/employees/${id}/edit`}>
            <Button size="sm" variant="secondary">Edit</Button>
          </Link>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex flex-wrap gap-3 items-center justify-between">
        <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900">Employees</h1>
        <Link href="/dashboard/employees/new">
          <Button variant="primary" size="lg">+ Add Employee</Button>
        </Link>
      </div>

      <Card>
        <CardBody>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Input
              placeholder="Search by name or employee number..."
              value={searchTerm}
              onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
            />
            <Select
              options={[
                { value: '', label: 'All Departments' },
                { value: 'Management', label: 'Management' },
                { value: 'Sales', label: 'Sales' },
                { value: 'Procurement', label: 'Procurement' },
                { value: 'Finance', label: 'Finance' },
                { value: 'HR', label: 'HR' },
                { value: 'Warehouse', label: 'Warehouse' },
                { value: 'Medical', label: 'Medical' },
                { value: 'Transport', label: 'Transport' },
                { value: 'Operations', label: 'Operations' },
              ]}
              value={departmentFilter}
              onChange={(e) => { setDepartmentFilter(e.target.value); setCurrentPage(1); }}
            />
            <Select
              options={[
                { value: '', label: 'All Statuses' },
                { value: 'Active', label: 'Active' },
                { value: 'Inactive', label: 'Inactive' },
                { value: 'Terminated', label: 'Terminated' },
              ]}
              value={statusFilter}
              onChange={(e) => { setStatusFilter(e.target.value); setCurrentPage(1); }}
            />
          </div>
          <div className="mt-4 text-sm text-gray-600">
            {loading ? 'Loading...' : `Showing ${data.length} of ${pagination.total} employees`}
          </div>
        </CardBody>
      </Card>

      <Card>
        <CardBody>
          {error && <div className="text-red-600 mb-4">Error: {error}</div>}
          <Table<Employee>
            data={data}
            columns={columns}
            pageSize={pageSize}
            totalPages={pagination.pages}
            currentPage={currentPage}
            onPageChange={setCurrentPage}
            emptyMessage={loading ? 'Loading employees...' : 'No employees found'}
          />
        </CardBody>
      </Card>
    </div>
  );
}
