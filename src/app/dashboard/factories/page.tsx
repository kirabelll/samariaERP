'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import { useI18n } from '@/lib/i18n';
import { Card, CardBody, Table, Badge, Button, Input, Select } from '@/components/ui';
import { ConfirmDialog } from '@/components/ui/Modal';
import type { ColumnDef } from '@/components/ui';
import { useApiList } from '@/hooks/useApi';

interface Factory {
  id: string;
  code: string;
  name: string;
  location: string;
  phone: string;
  contactPerson: string;
  factoryType: string;
  status: string;
}

export default function FactoriesPage() {
  const { t } = useI18n();
  const { data: session } = useSession();
  const isAdmin = (session?.user as any)?.role === 'ADMIN';
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null);
  const [deleting, setDeleting] = useState(false);
  const pageSize = 10;

  const { data, pagination, loading, error, refetch } = useApiList<Factory>('/api/factories', {
    page: currentPage,
    limit: pageSize,
    search: searchTerm,
    filters: { status: statusFilter },
  });

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/factories/${deleteTarget.id}`, { method: 'DELETE' });
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

  const columns: ColumnDef<Factory>[] = [
    { header: 'Code', accessor: 'code', sortable: true },
    { header: 'Name', accessor: 'name', sortable: true },
    { header: 'Location', accessor: 'location' },
    { header: 'Phone', accessor: 'phone' },
    { header: 'Contact Person', accessor: 'contactPerson' },
    { header: 'Type', accessor: 'factoryType' },
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
          <Link href={`/dashboard/factories/${id}`}>
            <Button size="sm" variant="outline">View</Button>
          </Link>
          <Link href={`/dashboard/factories/${id}/edit`}>
            <Button size="sm" variant="secondary">Edit</Button>
          </Link>
          {isAdmin && (
            <Button
              size="sm"
              variant="danger"
              onClick={(e) => {
                e.preventDefault();
                setDeleteTarget({ id: String(id), name: (row as any)?.name || 'this factory' });
              }}
            >
              Delete
            </Button>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex flex-wrap gap-3 items-center justify-between">
        <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900">Factories</h1>
        <Link href="/dashboard/factories/new">
          <Button variant="primary" size="lg">+ Add Factory</Button>
        </Link>
      </div>

      <Card>
        <CardBody>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <Input
              placeholder="Search by name or code..."
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
            {loading ? 'Loading...' : `Showing ${data.length} of ${pagination.total} factories`}
          </div>
        </CardBody>
      </Card>

      <Card>
        <CardBody>
          {error && <div className="text-red-600 mb-4">Error: {error}</div>}
          <Table<Factory>
            data={data}
            columns={columns}
            pageSize={pageSize}
            totalPages={pagination.pages}
            currentPage={currentPage}
            onPageChange={setCurrentPage}
            emptyMessage={loading ? 'Loading factories...' : 'No factories found'}
          />
        </CardBody>
      </Card>

      <ConfirmDialog
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title="Delete Factory"
        message={`Are you sure you want to delete "${deleteTarget?.name}"? This will set the factory as inactive.`}
        confirmText="Delete"
        cancelText="Cancel"
        isDangerous={true}
        isLoading={deleting}
      />
    </div>
  );
}
