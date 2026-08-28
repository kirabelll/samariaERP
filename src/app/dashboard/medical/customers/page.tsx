'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useI18n } from '@/lib/i18n';
import { Card, CardBody, Table, Badge, Button, Input, Select } from '@/components/ui';
import type { ColumnDef } from '@/components/ui';
import { useApiList } from '@/hooks/useApi';

interface MedicalCustomer {
  id: number;
  code: string;
  companyName: string;
  customerType: string;
  phone: string;
  contactPerson: string;
  licenseType: string;
  licenseNo: string;
  licenseExpiry: string;
  status: string;
}

export default function MedicalCustomersPage() {
  const { t } = useI18n();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

  const { data, pagination, loading, error, refetch } = useApiList<MedicalCustomer>('/api/customers', {
    page: currentPage,
    limit: pageSize,
    search: searchTerm,
    filters: { division: 'MEDICAL', status: statusFilter },
  });

  const handleDelete = async (id: number | string, companyName: string) => {
    const confirmed = window.confirm(
      `Are you sure you want to delete "${companyName}"?\n\nThis will deactivate or permanently remove the customer record.`
    );
    if (!confirmed) return;

    try {
      const res = await fetch(`/api/customers/${id}`, { method: 'DELETE' });
      const result = await res.json();
      if (!res.ok || !result.success) {
        throw new Error(result.error || 'Failed to delete customer');
      }
      alert(result.message || 'Customer deleted successfully');
      refetch();
    } catch (err: any) {
      alert(err.message || 'Failed to delete customer');
    }
  };

  const columns: ColumnDef<MedicalCustomer>[] = [
    { header: 'Code', accessor: 'code', sortable: true },
    { header: 'Company Name', accessor: 'companyName', sortable: true },
    { header: 'Phone', accessor: 'phone' },
    { header: 'Contact Person', accessor: 'contactPerson' },
    { header: 'License Type', accessor: 'licenseType' },
    { header: 'License No', accessor: 'licenseNo' },
    {
      header: 'License Expiry',
      accessor: 'licenseExpiry',
      render: (val) => {
        if (!val) return '-';
        const date = new Date(val);
        const isExpired = date < new Date();
        return (
          <span className={isExpired ? 'text-red-600 font-semibold' : ''}>
            {date.toLocaleDateString()}
            {isExpired && ' (Expired)'}
          </span>
        );
      },
    },
    {
      header: 'Status',
      accessor: 'status',
      render: (status) => <Badge status={status as any}>{status}</Badge>,
    },
    {
      header: 'Actions',
      accessor: 'id',
      render: (id, row) => (
        <div className="flex gap-2">
          <Link href={`/dashboard/medical/customers/${id}`}>
            <Button size="sm" variant="outline">View</Button>
          </Link>
          <Link href={`/dashboard/medical/customers/${id}/edit`}>
            <Button size="sm" variant="secondary">Edit</Button>
          </Link>
          <Button
            size="sm"
            variant="danger"
            onClick={() => handleDelete(id, (row as any)?.companyName || 'this customer')}
          >
            Delete
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-gray-900">Licensed Medical Customers</h1>
        <Link href="/dashboard/medical/customers/new">
          <Button variant="primary" size="lg">+ Register Customer</Button>
        </Link>
      </div>

      <Card>
        <CardBody>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <Input placeholder="Search by name, code, or phone..." value={searchTerm} onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }} />
            <Select
              options={[
                { value: '', label: 'All Statuses' },
                { value: 'Active', label: 'Active' },
                { value: 'Inactive', label: 'Inactive' },
                { value: 'Suspended', label: 'Suspended' },
              ]}
              value={statusFilter}
              onChange={(e) => { setStatusFilter(e.target.value); setCurrentPage(1); }}
            />
          </div>
          <div className="mt-4 text-sm text-gray-600">
            {loading ? 'Loading...' : `Showing ${data.length} of ${pagination.total} licensed customers`}
          </div>
        </CardBody>
      </Card>

      <Card>
        <CardBody>
          {error && <div className="text-red-600 mb-4">Error: {error}</div>}
          <Table<MedicalCustomer>
            data={data}
            columns={columns}
            pageSize={pageSize}
            totalPages={pagination.pages}
            currentPage={currentPage}
            onPageChange={setCurrentPage}
            emptyMessage={loading ? 'Loading...' : 'No licensed customers found'}
          />
        </CardBody>
      </Card>
    </div>
  );
}
