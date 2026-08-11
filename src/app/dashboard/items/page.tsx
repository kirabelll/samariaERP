'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useI18n } from '@/lib/i18n';
import { Card, CardBody, Table, Badge, Button, Input, Select } from '@/components/ui';
import { ConfirmDialog } from '@/components/ui/Modal';
import type { ColumnDef } from '@/components/ui';
import { useApiList } from '@/hooks/useApi';

interface Item {
  id: string | number;
  code: string;
  name: string;
  nameAmharic: string;
  category: string;
  unit: string;
  itemType: string;
  division: string;
  manufacturer: string;
  status: string;
}

export default function ItemsPage() {
  const { t } = useI18n();
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [deleteTarget, setDeleteTarget] = useState<Item | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const pageSize = 10;

  const { data, pagination, loading, error } = useApiList<Item>('/api/items', {
    page: currentPage,
    limit: pageSize,
    search: searchTerm,
    filters: { category: categoryFilter, status: statusFilter },
  });

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    try {
      const res = await fetch(`/api/items/${deleteTarget.id}?permanent=true`, {
        method: 'DELETE',
      });
      const result = await res.json();
      if (res.ok && result.success) {
        alert('Item deleted successfully');
        window.location.reload();
      } else {
        alert(result.error || 'Failed to delete item');
      }
    } catch (err: any) {
      alert('Error deleting item: ' + err.message);
    } finally {
      setIsDeleting(false);
      setDeleteTarget(null);
    }
  };

  const columns: ColumnDef<Item>[] = [
    { header: 'Code', accessor: 'code', sortable: true },
    { header: 'Name', accessor: 'name', sortable: true },
    { header: 'Category', accessor: 'category', sortable: true },
    { header: 'Unit', accessor: 'unit' },
    { header: 'Type', accessor: 'itemType' },
    { header: 'Division', accessor: 'division' },
    {
      header: 'Status',
      accessor: 'status',
      render: (status) => <Badge status={status as any}>{status}</Badge>,
    },
    {
      header: 'Actions',
      accessor: 'id',
      render: (_val, row) => (
        <div className="flex gap-2">
          <Link href={`/dashboard/items/${row.id}`}>
            <Button size="sm" variant="outline">View</Button>
          </Link>
          <Link href={`/dashboard/items/${row.id}/edit`}>
            <Button size="sm" variant="secondary">Edit</Button>
          </Link>
          <Button
            size="sm"
            variant="danger"
            onClick={() => setDeleteTarget(row)}
          >
            Delete
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex flex-wrap gap-3 items-center justify-between">
        <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900">Items / Products</h1>
        <Link href="/dashboard/items/new">
          <Button variant="primary" size="lg">+ Add New Item</Button>
        </Link>
      </div>

      <Card>
        <CardBody>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Input
              placeholder="Search by name or code..."
              value={searchTerm}
              onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
            />
            <Select
              options={[
                { value: '', label: 'All Categories' },
                { value: 'Aggregate', label: 'Aggregate' },
                { value: 'Cement', label: 'Cement' },
                { value: 'Medicine', label: 'Medicine' },
                { value: 'Medical Supply', label: 'Medical Supply' },
                { value: 'Equipment', label: 'Equipment' },
                { value: 'Other', label: 'Other' },
              ]}
              value={categoryFilter}
              onChange={(e) => { setCategoryFilter(e.target.value); setCurrentPage(1); }}
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
            {loading ? 'Loading...' : `Showing ${data.length} of ${pagination.total} items`}
          </div>
        </CardBody>
      </Card>

      <Card>
        <CardBody>
          {error && <div className="text-red-600 mb-4">Error: {error}</div>}
          <Table<Item>
            data={data}
            columns={columns}
            pageSize={pageSize}
            totalPages={pagination.pages}
            currentPage={currentPage}
            onPageChange={setCurrentPage}
            emptyMessage={loading ? 'Loading items...' : 'No items found'}
          />
        </CardBody>
      </Card>

      <ConfirmDialog
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title="Delete Item"
        message={`Are you sure you want to permanently delete item "${deleteTarget?.name}"? This action cannot be undone.`}
        confirmText="Delete"
        cancelText="Cancel"
        isDangerous={true}
        isLoading={isDeleting}
      />
    </div>
  );
}
