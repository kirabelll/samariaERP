'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import { useI18n } from '@/lib/i18n';
import { Card, CardBody, Table, Badge, Button, Input, Select } from '@/components/ui';
import { ConfirmDialog } from '@/components/ui/Modal';
import type { ColumnDef } from '@/components/ui';
import { useApiList } from '@/hooks/useApi';

interface Supplier {
  id: string;
  code: string;
  companyName: string;
  supplierType: string;
  tin: string;
  phone: string;
  contactPerson: string;
  location: string;
  category: string;
  status: string;
}

export default function SuppliersPage() {
  const { t } = useI18n();
  const { data: session } = useSession();
  const isAdmin = (session?.user as any)?.role === 'ADMIN';
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string; status?: string } | null>(null);
  const [deleting, setDeleting] = useState(false);
  const pageSize = 10;

  const { data, pagination, loading, error, refetch } = useApiList<Supplier>('/api/suppliers', {
    page: currentPage,
    limit: pageSize,
    search: searchTerm,
    filters: { status: statusFilter },
  });

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/suppliers/${deleteTarget.id}`, { method: 'DELETE' });
      const result = await res.json();
      if (!result.success) throw new Error(result.error);
      setDeleteTarget(null);
      refetch();
    } catch (err: any) {
      alert('Failed to delete: ' + (err.message || 'Unknown error'));
    } finally {
      setDeleting(false);
    }
  };

  const columns: ColumnDef<Supplier>[] = [
    { header: 'Code', accessor: 'code', sortable: true },
    { header: 'Company Name', accessor: 'companyName', sortable: true },
    { header: 'Type', accessor: 'supplierType', sortable: true },
    { header: 'TIN', accessor: 'tin' },
    { header: 'Phone', accessor: 'phone' },
    { header: 'Contact Person', accessor: 'contactPerson' },
    { header: 'Location', accessor: 'location' },
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
          <Link href={`/dashboard/suppliers/${id}`}>
            <Button size="sm" variant="outline">View</Button>
          </Link>
          <Link href={`/dashboard/suppliers/${id}/edit`}>
            <Button size="sm" variant="secondary">Edit</Button>
          </Link>
          {isAdmin && (
            <Button
              size="sm"
              variant="danger"
              onClick={(e) => {
                e.preventDefault();
                setDeleteTarget({
                  id: String(id),
                  name: (row as any)?.companyName || 'this supplier',
                  status: (row as any)?.status,
                });
              }}
            >
              {(row as any)?.status === 'Inactive' ? 'Delete Permanently' : 'Delete'}
            </Button>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex flex-wrap gap-3 items-center justify-between">
        <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900">Suppliers</h1>
        <Link href="/dashboard/suppliers/new">
          <Button variant="primary" size="lg">+ Add New Supplier</Button>
        </Link>
      </div>

      <Card>
        <CardBody>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <Input
              placeholder="Search by name, code, or phone..."
              value={searchTerm}
              onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
            />
            <Select
              options={[
                { value: '', label: 'All Statuses' },
                { value: 'Active', label: 'Active' },
                { value: 'Inactive', label: 'Inactive' },
              ]}
              value={statusFilter}
              onChange={(e) => { setStatusFilter(e.target.value); setCurrentPage(1); }}
            />
          </div>
          <div className="mt-4 text-sm text-gray-600">
            {loading ? 'Loading...' : `Showing ${data.length} of ${pagination.total} suppliers`}
          </div>
        </CardBody>
      </Card>

      <Card>
        <CardBody>
          {error && <div className="text-red-600 mb-4">Error: {error}</div>}
          <Table<Supplier>
            data={data}
            columns={columns}
            pageSize={pageSize}
            totalPages={pagination.pages}
            currentPage={currentPage}
            onPageChange={setCurrentPage}
            emptyMessage={loading ? 'Loading suppliers...' : 'No suppliers found'}
          />
        </CardBody>
      </Card>

      <ConfirmDialog
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title={deleteTarget?.status === 'Inactive' ? 'Permanently Delete Supplier' : 'Deactivate Supplier'}
        message={
          deleteTarget?.status === 'Inactive'
            ? `Are you sure you want to permanently delete "${deleteTarget?.name}"? This action cannot be undone and will remove the supplier record from the database.`
            : `Are you sure you want to delete "${deleteTarget?.name}"? This will set the supplier status to Inactive.`
        }
        confirmText={deleteTarget?.status === 'Inactive' ? 'Permanently Delete' : 'Deactivate'}
        cancelText="Cancel"
        isDangerous={true}
        isLoading={deleting}
      />
    </div>
  );
}
