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
  podNumber?: string | null;
  padNumber?: string | null;
  deliveryNoteNo?: string | null;
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
  const [liftingSortBy, setLiftingSortBy] = useState('liftingNo');
  const [liftingSortOrder, setLiftingSortOrder] = useState<'asc' | 'desc'>('asc');
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

  const [deleteTarget, setDeleteTarget] = useState<CementLifting | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deletePurchaseTarget, setDeletePurchaseTarget] = useState<CementPurchase | null>(null);
  const [deletingPurchase, setDeletingPurchase] = useState(false);

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
    filters: activeTab === 'liftings' ? {
      status: statusFilter,
      sortBy: liftingSortBy,
      sortOrder: liftingSortOrder,
    } : {},
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

  const handleDeletePurchase = async () => {
    if (!deletePurchaseTarget) return;
    setDeletingPurchase(true);
    try {
      const res = await apiDelete(`/api/cement/purchases/${deletePurchaseTarget.id}`);
      if (res.success) {
        setDeletePurchaseTarget(null);
        purchases.refetch();
      } else {
        alert(res.error || 'Failed to delete cement purchase');
      }
    } catch (err: any) {
      alert(err.message || 'Error deleting cement purchase');
    } finally {
      setDeletingPurchase(false);
    }
  };

  const purchaseColumns: ColumnDef<CementPurchase>[] = [
    { header: 'Purchase No', accessor: 'purchaseNo', sortable: true },
    { header: 'Factory', accessor: 'factory', sortable: true, render: (_val, row) => row.factory?.name || '-' },
    { header: 'Date', accessor: 'createdAt', sortable: true, render: (val) => val ? new Date(val).toLocaleDateString() : '-' },
    { header: 'Quantity (tons)', accessor: 'quantityTons', sortable: true, render: (val) => Number(val).toLocaleString('en-US') },
    { header: 'Total (ETB)', accessor: 'totalAmount', sortable: true, render: (val) => Number(val).toLocaleString('en-US') },
    {
      header: 'Status',
      accessor: 'status',
      sortable: true,
      render: (status, row: any) => (
        <div className="flex items-center gap-1.5 flex-wrap">
          <Badge status={status as any}>{status}</Badge>
          {row.paymentStatus === 'Partial' && (
            <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-100 text-amber-800 border border-amber-300">
              Partial Paid
            </span>
          )}
        </div>
      ),
    },
    {
      header: 'Actions', accessor: 'id',
      render: (id, row) => (
        <div className="flex items-center gap-2">
          <Link href={`/dashboard/cement/purchases/${id}`}>
            <Button size="sm" variant="outline">View</Button>
          </Link>
          <Button
            size="sm"
            variant="danger"
            onClick={() => setDeletePurchaseTarget(row)}
          >
            Delete
          </Button>
        </div>
      ),
    },
  ];

  const liftingColumns: ColumnDef<CementLifting>[] = [
    {
      header: 'Lifting No / POD',
      accessor: 'liftingNo',
      sortable: true,
      render: (val, row) => (
        <div>
          <span className="font-semibold text-slate-900">{val}</span>
          {(row.podNumber || row.padNumber) && (
            <div className="text-xs text-blue-600 font-medium">
              POD: {row.podNumber || row.padNumber}
            </div>
          )}
        </div>
      ),
    },
    { header: 'Customer', accessor: 'customer', sortable: true, render: (_val, row) => row.customer?.companyName || '-' },
    { header: 'Factory', accessor: 'factory', sortable: true, render: (_val, row) => row.factory?.name || '-' },
    {
      header: 'Coupon',
      accessor: 'coupon' as any,
      sortable: true,
      render: (_val: any, row: CementLifting) => {
        const couponNo = (row as any).coupon?.couponNo;
        return couponNo ? <span className="text-sm font-medium text-purple-600">{couponNo}</span> : <span className="text-gray-400">—</span>;
      },
    },
    { header: 'Date', accessor: 'liftingDate', sortable: true, render: (val) => val ? new Date(val).toLocaleDateString() : '-' },
    { header: 'Quantity (QT)', accessor: 'factoryWeight', sortable: true, render: (val) => `${Number(val).toLocaleString('en-US')} QT` },
    { header: 'Status', accessor: 'status', sortable: true, render: (status) => <Badge status={status as any}>{status}</Badge> },
    {
      header: 'Actions', accessor: 'id',
      render: (id, row) => (
        <div className="flex items-center gap-1.5">
          <Link href={`/dashboard/cement/liftings/${id}`}>
            <Button size="sm" variant="outline">View</Button>
          </Link>
          <Link href={`/dashboard/cement/liftings/${id}/edit`}>
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

  const activeData = activeTab === 'purchases' ? purchases : liftings;
  const [isExporting, setIsExporting] = useState(false);

  const exportToExcel = async () => {
    try {
      setIsExporting(true);
      const today = new Date().toISOString().split('T')[0];
      let csvContent = '';

      if (activeTab === 'purchases') {
        const params = new URLSearchParams({ page: '1', limit: '10000' });
        if (searchTerm) params.append('search', searchTerm);
        if (statusFilter) params.append('status', statusFilter);

        const res = await fetch(`/api/cement/purchases?${params.toString()}`);
        const json = await res.json();
        const records: any[] = json.data || [];

        if (records.length === 0) {
          alert('No cement purchases found to export.');
          return;
        }

        const headers = [
          'Purchase No',
          'Factory / Supplier',
          'Factory Code',
          'Cement Type',
          'Quantity (Tons)',
          'Unit Price (ETB)',
          'Subtotal (ETB)',
          'VAT Rate (%)',
          'VAT Amount (ETB)',
          'Total Amount (ETB)',
          'Paid Amount (ETB)',
          'Balance Remaining (ETB)',
          'Payment Status',
          'Payment Reference',
          'Payment Date',
          'Purchase Status',
          'Created Date',
          'Created By',
        ];

        const rows = records.map((r: any) => {
          const subtotal = (Number(r.quantityTons) || 0) * (Number(r.unitPrice) || 0);
          return [
            `"${(r.purchaseNo || '').replace(/"/g, '""')}"`,
            `"${(r.factory?.name || '').replace(/"/g, '""')}"`,
            `"${(r.factory?.code || '').replace(/"/g, '""')}"`,
            `"${(r.cementType || '').replace(/"/g, '""')}"`,
            r.quantityTons != null ? r.quantityTons : '',
            r.unitPrice != null ? r.unitPrice : '',
            subtotal ? subtotal.toFixed(2) : (r.totalAmount != null ? r.totalAmount : ''),
            r.vatRate != null ? r.vatRate : 15,
            r.vatAmount != null ? r.vatAmount : '',
            r.totalAmount != null ? r.totalAmount : '',
            r.paidAmount != null ? r.paidAmount : '0',
            r.balanceRemaining != null ? r.balanceRemaining : (Number(r.totalAmount || 0) - Number(r.paidAmount || 0)),
            `"${(r.paymentStatus || 'Unpaid').replace(/"/g, '""')}"`,
            `"${(r.paymentRef || '').replace(/"/g, '""')}"`,
            r.paymentDate ? new Date(r.paymentDate).toLocaleDateString() : '',
            `"${(r.status || '').replace(/"/g, '""')}"`,
            r.createdAt ? new Date(r.createdAt).toLocaleDateString() : '',
            `"${(r.createdBy || '').replace(/"/g, '""')}"`,
          ];
        });

        csvContent = '\uFEFF' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
      } else {
        const params = new URLSearchParams({ page: '1', limit: '10000' });
        if (searchTerm) params.append('search', searchTerm);
        if (statusFilter) params.append('status', statusFilter);

        const res = await fetch(`/api/cement/liftings?${params.toString()}`);
        const json = await res.json();
        const records: any[] = json.data || [];

        if (records.length === 0) {
          alert('No cement liftings found to export.');
          return;
        }

        const headers = [
          'Lifting No',
          'Customer Name',
          'Customer TIN',
          'Customer Phone',
          'Factory / Supplier',
          'Purchase Reference',
          'Coupon No',
          'POD Number',
          'Delivery Note No',
          'Factory Weighbridge Ref',
          'Factory Weight (QT)',
          'Buyer / Site Weight (QT)',
          'Shortage Quantity (QT)',
          'Shortage Penalty (ETB)',
          'Driver Name',
          'Truck Plate No',
          'Transporter / Association',
          'Lifting Date',
          'Status',
          'Registered By',
          'Created Date',
        ];

        const rows = records.map((r: any) => {
          const couponNo = r.coupon?.couponNo || (r as any).couponNo || '';
          const driver = r.driverName || r.truck?.driverName || '';
          const plate = r.truckPlateNo || r.truck?.plateNo || '';
          const association = r.truck?.association?.name || r.truck?.association || '';
          return [
            `"${(r.liftingNo || '').replace(/"/g, '""')}"`,
            `"${(r.customer?.companyName || '').replace(/"/g, '""')}"`,
            `"${(r.customer?.tin || '').replace(/"/g, '""')}"`,
            `"${(r.customer?.phone || '').replace(/"/g, '""')}"`,
            `"${(r.factory?.name || r.purchase?.factory?.name || '').replace(/"/g, '""')}"`,
            `"${(r.purchase?.purchaseNo || '').replace(/"/g, '""')}"`,
            `"${(couponNo || '').replace(/"/g, '""')}"`,
            `"${(r.podNumber || r.padNumber || '').replace(/"/g, '""')}"`,
            `"${(r.deliveryNoteNo || '').replace(/"/g, '""')}"`,
            `"${(r.factoryWeighbridgeRef || '').replace(/"/g, '""')}"`,
            r.factoryWeight != null ? r.factoryWeight : '',
            r.buyerWeighbridgeQty != null ? (Number(r.buyerWeighbridgeQty) > 1000 ? Number(r.buyerWeighbridgeQty) / 100 : r.buyerWeighbridgeQty) : (r.siteWeight != null ? (Number(r.siteWeight) > 1000 ? Number(r.siteWeight) / 100 : r.siteWeight) : ''),
            r.shortageQty != null ? (Number(r.shortageQty) > 1000 ? Number(r.shortageQty) / 100 : r.shortageQty) : (r.shortage != null ? (Number(r.shortage) > 1000 ? Number(r.shortage) / 100 : r.shortage) : ''),
            r.shortagePenalty != null ? r.shortagePenalty : '',
            `"${(driver || '').replace(/"/g, '""')}"`,
            `"${(plate || '').replace(/"/g, '""')}"`,
            `"${(association || '').replace(/"/g, '""')}"`,
            r.liftingDate ? new Date(r.liftingDate).toLocaleDateString() : '',
            `"${(r.status || '').replace(/"/g, '""')}"`,
            `"${(r.registeredBy || '').replace(/"/g, '""')}"`,
            r.createdAt ? new Date(r.createdAt).toLocaleDateString() : '',
          ];
        });

        csvContent = '\uFEFF' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
      }

      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `Cement_${activeTab.toUpperCase()}_Full_Export_${today}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (err: any) {
      alert('Failed to export Excel: ' + (err.message || 'Unknown error'));
    } finally {
      setIsExporting(false);
    }
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
          <button
            onClick={exportToExcel}
            disabled={isExporting || activeData.loading}
            className="px-4 py-2 rounded-lg bg-green-600 text-white font-medium hover:bg-green-700 flex items-center gap-2 text-sm disabled:opacity-50 transition-all shadow-sm"
          >
            <span>📊</span>
            <span>{isExporting ? 'Exporting Excel...' : 'Export Excel'}</span>
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
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
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
            {activeTab === 'liftings' && (
              <>
                <Select
                  options={[
                    { value: 'liftingNo', label: 'Sort: Lifting No / POD' },
                    { value: 'podNumber', label: 'Sort: POD Number' },
                    { value: 'liftingDate', label: 'Sort: Lifting Date' },
                    { value: 'factoryWeight', label: 'Sort: Weight (QT)' },
                    { value: 'status', label: 'Sort: Status' },
                    { value: 'createdAt', label: 'Sort: Date Created' },
                  ]}
                  value={liftingSortBy}
                  onChange={(e) => { setLiftingSortBy(e.target.value); setCurrentPage(1); }}
                />
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => { setLiftingSortOrder((prev) => (prev === 'asc' ? 'desc' : 'asc')); setCurrentPage(1); }}
                    className="flex-1 flex items-center justify-center gap-2 px-3 py-2 border rounded-lg bg-white hover:bg-slate-50 text-sm font-medium text-slate-700 shadow-sm transition-all"
                    title={`Current order: ${liftingSortOrder === 'asc' ? 'Ascending (1→9 / A→Z)' : 'Descending (9→1 / Z→A)'}`}
                  >
                    <span>{liftingSortOrder === 'asc' ? '⬆️ Ascending (A-Z / 1-9)' : '⬇️ Descending (Z-A / 9-1)'}</span>
                  </button>
                </div>
              </>
            )}
          </div>
          <div className="mt-4 text-sm text-gray-600 flex items-center justify-between">
            <span>{activeData.loading ? 'Loading...' : `Showing ${activeData.data.length} of ${activeData.pagination.total} records`}</span>
            {activeTab === 'liftings' && (
              <span className="text-xs text-slate-500 font-medium">
                Sorted by <span className="font-semibold text-slate-700">{liftingSortBy === 'liftingNo' ? 'Lifting No / POD' : liftingSortBy}</span> ({liftingSortOrder.toUpperCase()})
              </span>
            )}
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

      <ConfirmDialog
        isOpen={!!deletePurchaseTarget}
        onClose={() => setDeletePurchaseTarget(null)}
        onConfirm={handleDeletePurchase}
        title="Delete Cement Purchase"
        message={`Are you sure you want to delete purchase "${deletePurchaseTarget?.purchaseNo}"? This action cannot be undone.`}
        confirmText="Delete"
        cancelText="Cancel"
        isDangerous={true}
        isLoading={deletingPurchase}
      />
    </div>
  );
}


