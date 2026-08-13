'use client';

import React, { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useI18n } from '@/lib/i18n';
import { Card, CardBody, CardHeader, Table, Badge, Button, Input, Select, ConfirmDialog } from '@/components/ui';
import type { ColumnDef } from '@/components/ui';
import { useApiList, apiDelete } from '@/hooks/useApi';
import { StatCard } from '@/components/ui/Card';

interface CementPurchase {
  id: number;
  purchaseNo: string;
  factory: { name: string } | null;
  createdAt: string;
  quantityTons: number;
  unitPrice: number;
  totalAmount: number;
  status: string;
}

interface CementLifting {
  id: number;
  liftingNo: string;
  customer: { companyName: string } | null;
  factory: { name: string } | null;
  coupon?: { couponNo: string } | null;
  liftingDate: string;
  factoryWeight: number;
  status: string;
}

export default function CementOperationsPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-gray-500">Loading...</div>}>
      <CementOperationsContent />
    </Suspense>
  );
}

function CementOperationsContent() {
  const { t } = useI18n();
  const searchParams = useSearchParams();
  const initialTab = searchParams.get('tab') === 'liftings' ? 'liftings' : 'purchases';
  const [activeTab, setActiveTab] = useState<'purchases' | 'liftings'>(initialTab);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

  const [deleteTarget, setDeleteTarget] = useState<CementLifting | null>(null);
  const [deleting, setDeleting] = useState(false);

  const purchases = useApiList<CementPurchase>('/api/cement/purchases', {
    page: activeTab === 'purchases' ? currentPage : 1,
    limit: pageSize,
    search: activeTab === 'purchases' ? searchTerm : '',
    filters: activeTab === 'purchases' ? { status: statusFilter } : {},
  });

  const liftings = useApiList<CementLifting>('/api/cement/liftings', {
    page: activeTab === 'liftings' ? currentPage : 1,
    limit: pageSize,
    search: activeTab === 'liftings' ? searchTerm : '',
    filters: activeTab === 'liftings' ? { status: statusFilter } : {},
  });

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const res = await apiDelete(`/api/cement/liftings/${deleteTarget.id}`);
      if (res.success) {
        setDeleteTarget(null);
        liftings.refetch();
        purchases.refetch();
      } else {
        alert(res.error || 'Failed to delete cement lifting');
      }
    } catch (err: any) {
      alert(err.message || 'Error deleting cement lifting');
    } finally {
      setDeleting(false);
    }
  };

  const purchaseColumns: ColumnDef<CementPurchase>[] = [
    { header: 'Purchase No', accessor: 'purchaseNo', sortable: true },
    { header: 'Factory', accessor: 'factory', render: (_val, row) => row.factory?.name || '-' },
    { header: 'Date', accessor: 'createdAt', render: (val) => val ? new Date(val).toLocaleDateString() : '-' },
    { header: 'Quantity (tons)', accessor: 'quantityTons', render: (val) => Number(val).toLocaleString('en-US') },
    { header: 'Total (ETB)', accessor: 'totalAmount', render: (val) => Number(val).toLocaleString('en-US') },
    { header: 'Status', accessor: 'status', render: (status) => <Badge status={status as any}>{status}</Badge> },
    {
      header: 'Actions', accessor: 'id',
      render: (id) => <Link href={`/dashboard/cement/purchases/${id}`}><Button size="sm" variant="outline">View</Button></Link>,
    },
  ];

  const liftingColumns: ColumnDef<CementLifting>[] = [
    { header: 'Lifting No', accessor: 'liftingNo', sortable: true },
    { header: 'Customer', accessor: 'customer', render: (_val, row) => row.customer?.companyName || '-' },
    { header: 'Factory', accessor: 'factory', render: (_val, row) => row.factory?.name || '-' },
    {
      header: 'Coupon',
      accessor: 'coupon' as any,
      render: (_val: any, row: CementLifting) => {
        const couponNo = (row as any).coupon?.couponNo;
        return couponNo ? <span className="text-sm font-medium text-purple-600">{couponNo}</span> : <span className="text-gray-400">—</span>;
      },
    },
    { header: 'Date', accessor: 'liftingDate', render: (val) => val ? new Date(val).toLocaleDateString() : '-' },
    { header: 'Quantity (tons)', accessor: 'factoryWeight', render: (val) => Number(val).toLocaleString('en-US') },
    { header: 'Status', accessor: 'status', render: (status) => <Badge status={status as any}>{status}</Badge> },
    {
      header: 'Actions', accessor: 'id',
      render: (id, row) => (
        <div className="flex items-center gap-2">
          <Link href={`/dashboard/cement/liftings/${id}`}>
            <Button size="sm" variant="outline">View</Button>
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

  const activeData = activeTab === 'purchases' ? purchases : liftings;

  const exportToExcel = () => {
    const today = new Date().toISOString().split('T')[0];
    let csvContent = '';
    if (activeTab === 'purchases') {
      csvContent = 'Purchase No,Factory,Date,Quantity (tons),Total (ETB),Status\n';
      (purchases.data as CementPurchase[]).forEach((row) => {
        csvContent += `"${row.purchaseNo}","${row.factory?.name || '-'}","${row.createdAt ? new Date(row.createdAt).toLocaleDateString() : '-'}","${Number(row.quantityTons).toLocaleString('en-US')}","${Number(row.totalAmount).toLocaleString('en-US')}","${row.status}"\n`;
      });
    } else {
      csvContent = 'Lifting No,Customer,Factory,Coupon,Date,Quantity (tons),Status\n';
      (liftings.data as CementLifting[]).forEach((row) => {
        csvContent += `"${row.liftingNo}","${row.customer?.companyName || '-'}","${row.factory?.name || '-'}","${row.coupon?.couponNo || '-'}","${row.liftingDate ? new Date(row.liftingDate).toLocaleDateString() : '-'}","${Number(row.factoryWeight).toLocaleString('en-US')}","${row.status}"\n`;
      });
    }
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `cement-${activeTab}-${today}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex flex-wrap gap-3 items-center justify-between">
        <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900">Cement Operations</h1>
        <div className="flex flex-wrap gap-2">
          <Link href="/dashboard/cement/purchases/new">
            <Button variant="primary">+ New Purchase</Button>
          </Link>
          <Link href="/dashboard/cement/lifting/new">
            <Button variant="primary">+ New Lifting</Button>
          </Link>
          <button onClick={exportToExcel} className="px-4 py-2 rounded-lg bg-green-600 text-white font-medium hover:bg-green-700 flex items-center gap-2 text-sm">
            Export Excel
          </button>
        </div>
      </div>

      <div className="flex gap-2">
        <button
          onClick={() => { setActiveTab('purchases'); setCurrentPage(1); setSearchTerm(''); setStatusFilter(''); }}
          className={`px-4 py-2 rounded-lg font-medium ${activeTab === 'purchases' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
        >
          Purchases ({purchases.pagination.total})
        </button>
        <button
          onClick={() => { setActiveTab('liftings'); setCurrentPage(1); setSearchTerm(''); setStatusFilter(''); }}
          className={`px-4 py-2 rounded-lg font-medium ${activeTab === 'liftings' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
        >
          Liftings ({liftings.pagination.total})
        </button>
      </div>

      <Card>
        <CardBody>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <Input placeholder={`Search ${activeTab}...`} value={searchTerm} onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }} />
            <Select
              options={activeTab === 'purchases' ? [
                { value: '', label: 'All Statuses' },
                { value: 'Pending', label: 'Pending' },
                { value: 'Checked', label: 'Checked' },
                { value: 'Approved', label: 'Approved' },
                { value: 'Active', label: 'Active' },
                { value: 'Completed', label: 'Completed' },
                { value: 'Cancelled', label: 'Cancelled' },
              ] : [
                { value: '', label: 'All Statuses' },
                { value: 'Lifted', label: 'Lifted' },
                { value: 'Delivered', label: 'Delivered' },
                { value: 'Verified', label: 'Verified' },
                { value: 'Cancelled', label: 'Cancelled' },
              ]}
              value={statusFilter}
              onChange={(e) => { setStatusFilter(e.target.value); setCurrentPage(1); }}
            />
          </div>
          <div className="mt-4 text-sm text-gray-600">
            {activeData.loading ? 'Loading...' : `Showing ${activeData.data.length} of ${activeData.pagination.total} records`}
          </div>
        </CardBody>
      </Card>

      <Card>
        <CardBody>
          {activeData.error && <div className="text-red-600 mb-4">Error: {activeData.error}</div>}
          {activeTab === 'purchases' ? (
            <Table<CementPurchase>
              data={purchases.data}
              columns={purchaseColumns}
              pageSize={pageSize}
              totalPages={purchases.pagination.pages}
              currentPage={currentPage}
              onPageChange={setCurrentPage}
              emptyMessage={purchases.loading ? 'Loading...' : 'No cement purchases found'}
            />
          ) : (
            <Table<CementLifting>
              data={liftings.data}
              columns={liftingColumns}
              pageSize={pageSize}
              totalPages={liftings.pagination.pages}
              currentPage={currentPage}
              onPageChange={setCurrentPage}
              emptyMessage={liftings.loading ? 'Loading...' : 'No cement liftings found'}
            />
          )}
        </CardBody>
      </Card>

      <ConfirmDialog
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title="Delete Cement Lifting"
        message={`Are you sure you want to delete lifting "${deleteTarget?.liftingNo}"? This action will revert factory balance and coupon status if applicable.`}
        confirmText="Delete"
        cancelText="Cancel"
        isDangerous={true}
        isLoading={deleting}
      />
    </div>
  );
}

