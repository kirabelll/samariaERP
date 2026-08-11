'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useI18n } from '@/lib/i18n';
import { Card, CardBody, Table, Badge, Button, Input, Select } from '@/components/ui';
import { ConfirmDialog } from '@/components/ui/Modal';
import type { ColumnDef } from '@/components/ui';
import { useApiList } from '@/hooks/useApi';

interface AggregateDelivery {
  id: string;
  dispatchNo: string;
  customerId: string;
  supplierId: string;
  transporterId: string;
  truckId: string;
  itemId: string;
  loadedVolume: number;
  deliveredVolume: number | null;
  shortageVolume: number | null;
  transportRate: number;
  aggregateValue: number;
  grossTruckFee: number | null;
  shortageDeduction: number | null;
  netTruckPayment: number | null;
  dispatchDate: string;
  deliveryDate: string | null;
  status: string;
  customer: { companyName: string; code: string } | null;
  supplier: { companyName: string; code: string } | null;
  transporter: { companyName: string } | null;
  truck: { plateNo: string; truckType: string | null } | null;
}

export default function AggregateOperationsPage() {
  const { t } = useI18n();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [deleteTarget, setDeleteTarget] = useState<AggregateDelivery | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const pageSize = 10;

  const { data, pagination, loading, error } = useApiList<AggregateDelivery>('/api/aggregate', {
    page: currentPage,
    limit: pageSize,
    search: searchTerm,
    filters: { status: statusFilter },
  });

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    try {
      const res = await fetch(`/api/aggregate/${deleteTarget.id}?permanent=true`, {
        method: 'DELETE',
      });
      const result = await res.json();
      if (res.ok && result.success) {
        alert('Aggregate dispatch deleted successfully');
        window.location.reload();
      } else {
        alert(result.error || 'Failed to delete aggregate dispatch');
      }
    } catch (err: any) {
      alert('Error deleting dispatch: ' + err.message);
    } finally {
      setIsDeleting(false);
      setDeleteTarget(null);
    }
  };

  const columns: ColumnDef<AggregateDelivery>[] = [
    { header: 'Dispatch No', accessor: 'dispatchNo', sortable: true },
    {
      header: 'Customer',
      accessor: 'customer',
      render: (_val, row) => row.customer?.companyName || '-',
    },
    {
      header: 'Supplier',
      accessor: 'supplier',
      render: (_val, row) => row.supplier?.companyName || '-',
    },
    {
      header: 'Transporter',
      accessor: 'transporter',
      render: (_val, row) => row.transporter?.companyName || '-',
    },
    {
      header: 'Truck',
      accessor: 'truck',
      render: (_val, row) => row.truck?.plateNo || '-',
    },
    {
      header: 'Loaded (m³)',
      accessor: 'loadedVolume',
      render: (val) => val != null ? Number(val).toLocaleString('en-US', { minimumFractionDigits: 2 }) : '-',
    },
    {
      header: 'Delivered (m³)',
      accessor: 'deliveredVolume',
      render: (val) => val != null ? Number(val).toLocaleString('en-US', { minimumFractionDigits: 2 }) : '-',
    },
    {
      header: 'Net Payment (ETB)',
      accessor: 'netTruckPayment',
      render: (val) => val != null ? Number(val).toLocaleString('en-US', { minimumFractionDigits: 2 }) : '-',
    },
    {
      header: 'Date',
      accessor: 'dispatchDate',
      render: (val) => val ? new Date(val).toLocaleDateString() : '-',
    },
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
          <Link href={`/dashboard/aggregate/${row.id}`}>
            <Button size="sm" variant="outline">View</Button>
          </Link>
          <Link href={`/dashboard/aggregate/${row.id}/edit`}>
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
        <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900">Aggregate Operations</h1>
        <Link href="/dashboard/aggregate/new">
          <Button variant="primary" size="lg">+ New Delivery</Button>
        </Link>
      </div>

      <Card>
        <CardBody>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <Input placeholder="Search by dispatch no..." value={searchTerm} onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }} />
            <Select
              options={[
                { value: '', label: 'All Statuses' },
                { value: 'Dispatched', label: 'Dispatched' },
                { value: 'Delivered', label: 'Delivered' },
                { value: 'Verified', label: 'Verified' },
                { value: 'Settled', label: 'Settled' },
                { value: 'Cancelled', label: 'Cancelled' },
              ]}
              value={statusFilter}
              onChange={(e) => { setStatusFilter(e.target.value); setCurrentPage(1); }}
            />
          </div>
          <div className="mt-4 text-sm text-gray-600">
            {loading ? 'Loading...' : `Showing ${data.length} of ${pagination.total} deliveries`}
          </div>
        </CardBody>
      </Card>

      <Card>
        <CardBody>
          {error && <div className="text-red-600 mb-4">Error: {error}</div>}
          <Table<AggregateDelivery>
            data={data}
            columns={columns}
            pageSize={pageSize}
            totalPages={pagination.pages}
            currentPage={currentPage}
            onPageChange={setCurrentPage}
            emptyMessage={loading ? 'Loading...' : 'No aggregate deliveries found'}
          />
        </CardBody>
      </Card>

      <ConfirmDialog
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title="Delete Aggregate Dispatch"
        message={`Are you sure you want to permanently delete dispatch ${deleteTarget?.dispatchNo}? This action cannot be undone.`}
        confirmText="Delete"
        cancelText="Cancel"
        isDangerous={true}
        isLoading={isDeleting}
      />
    </div>
  );
}
