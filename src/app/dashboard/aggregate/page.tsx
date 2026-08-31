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
  padNumber?: string | null;
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
  customerPrice?: number | null;
  supplierPrice?: number | null;
  customerReceivable?: number | null;
  supplierPayable?: number | null;
  netMaterialAmount?: number | null;
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
  item?: { id: string; name: string; code?: string | null; category?: string | null; unit?: string | null } | null;
}

export default function AggregateOperationsPage() {
  const { t } = useI18n();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [deleteTarget, setDeleteTarget] = useState<AggregateDelivery | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const pageSize = 10;

  const { data, pagination, loading, error } = useApiList<AggregateDelivery>('/api/aggregate', {
    page: currentPage,
    limit: pageSize,
    search: searchTerm,
    filters: {
      status: statusFilter,
      startDate: startDate,
      endDate: endDate,
    },
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
      header: 'Pad / Receipt No',
      accessor: 'padNumber',
      render: (_val, row) => row.padNumber || '-',
    },
    {
      header: 'Item / Material',
      accessor: 'item',
      render: (_val, row) => row.item?.name || '-',
    },
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
      header: 'Dispatch Date',
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

  const [isExporting, setIsExporting] = useState(false);

  const exportToExcel = async () => {
    try {
      setIsExporting(true);
      const params = new URLSearchParams({
        page: '1',
        limit: '10000',
      });
      if (searchTerm) params.append('search', searchTerm);
      if (statusFilter) params.append('status', statusFilter);
      if (startDate) params.append('startDate', startDate);
      if (endDate) params.append('endDate', endDate);

      const res = await fetch(`/api/aggregate?${params.toString()}`);
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || 'Failed to fetch aggregate records');
      }

      const records: AggregateDelivery[] = json.data || [];
      if (records.length === 0) {
        alert('No aggregate records found to export.');
        return;
      }

      const headers = [
        'Dispatch No',
        'Pad / Receipt No',
        'Item Name',
        'Item Code',
        'Item Category',
        'Customer Name',
        'Customer Code',
        'Supplier Name',
        'Supplier Code',
        'Transporter',
        'Truck Plate No',
        'Loaded Volume (m3)',
        'Delivered Volume (m3)',
        'Shortage Volume (m3)',
        'Transport Rate (ETB)',
        'Aggregate Value (ETB)',
        'Customer Receivable (ETB)',
        'Supplier Payable (ETB)',
        'Net Profit Amount (ETB)',
        'Gross Truck Fee (ETB)',
        'Shortage Deduction (ETB)',
        'Net Truck Payment (ETB)',
        'Dispatch Date',
        'Delivery Date',
        'Status',
      ];

      const rows = records.map((r) => {
        const custPrice = Number(r.customerPrice ?? r.aggregateValue ?? 0);
        const suppPrice = Number(r.supplierPrice ?? r.aggregateValue ?? 0);
        const loadedVol = Number(r.loadedVolume || 0);
        const deliveredVol = Number(r.deliveredVolume ?? r.loadedVolume ?? 0);
        const custReceivable = r.customerReceivable != null ? r.customerReceivable : (loadedVol * custPrice);
        const suppPayable = r.supplierPayable != null ? r.supplierPayable : (deliveredVol * suppPrice);
        const grossTruck = Number(r.grossTruckFee || 0);
        const netMatAmount = custReceivable - suppPayable - grossTruck;

        return [
          `"${(r.dispatchNo || '').replace(/"/g, '""')}"`,
          `"${(r.padNumber || '').replace(/"/g, '""')}"`,
          `"${(r.item?.name || '').replace(/"/g, '""')}"`,
          `"${(r.item?.code || '').replace(/"/g, '""')}"`,
          `"${(r.item?.category || '').replace(/"/g, '""')}"`,
          `"${(r.customer?.companyName || '').replace(/"/g, '""')}"`,
          `"${(r.customer?.code || '').replace(/"/g, '""')}"`,
          `"${(r.supplier?.companyName || '').replace(/"/g, '""')}"`,
          `"${(r.supplier?.code || '').replace(/"/g, '""')}"`,
          `"${(r.transporter?.companyName || '').replace(/"/g, '""')}"`,
          `"${(r.truck?.plateNo || '').replace(/"/g, '""')}"`,
          r.loadedVolume != null ? r.loadedVolume : '',
          r.deliveredVolume != null ? r.deliveredVolume : '',
          r.shortageVolume != null ? r.shortageVolume : '',
          r.transportRate != null ? r.transportRate : '',
          r.aggregateValue != null ? r.aggregateValue : '',
          custReceivable != null ? Number(custReceivable.toFixed(2)) : '',
          suppPayable != null ? Number(suppPayable.toFixed(2)) : '',
          netMatAmount != null ? Number(netMatAmount.toFixed(2)) : '',
          r.grossTruckFee != null ? r.grossTruckFee : '',
          r.shortageDeduction != null ? r.shortageDeduction : '',
          r.netTruckPayment != null ? r.netTruckPayment : '',
          r.dispatchDate ? new Date(r.dispatchDate).toLocaleDateString() : '',
          r.deliveryDate ? new Date(r.deliveryDate).toLocaleDateString() : '',
          `"${(r.status || '').replace(/"/g, '""')}"`,
        ];
      });

      const csvContent = '\uFEFF' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      const today = new Date().toISOString().split('T')[0];
      link.setAttribute('href', url);
      link.setAttribute('download', `Aggregate_Deliveries_${today}.csv`);
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
        <div>
          <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900">Aggregate Operations</h1>
          <p className="text-sm text-gray-500 mt-1">Manage quarry dispatch tickets, deliveries, and transporter freight records.</p>
        </div>
        <div className="flex flex-wrap gap-2.5 items-center">
          <Link href="/dashboard/aggregate/new">
            <Button variant="primary" size="lg">+ New Delivery</Button>
          </Link>
          <button
            onClick={exportToExcel}
            disabled={isExporting || loading}
            className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold flex items-center gap-2 text-sm shadow-sm transition-all disabled:opacity-50"
          >
            <span>📊</span>
            <span>{isExporting ? 'Exporting Excel...' : 'Export Excel'}</span>
          </button>
        </div>
      </div>

      <Card>
        <CardBody>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 items-end">
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Search</label>
              <Input
                placeholder="Search by dispatch or pad/receipt no..."
                value={searchTerm}
                onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Status</label>
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
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Dispatch Date From</label>
              <Input
                type="date"
                value={startDate}
                onChange={(e) => { setStartDate(e.target.value); setCurrentPage(1); }}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Dispatch Date To</label>
              <div className="flex gap-2">
                <Input
                  type="date"
                  value={endDate}
                  onChange={(e) => { setEndDate(e.target.value); setCurrentPage(1); }}
                />
                {(startDate || endDate || statusFilter || searchTerm) && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setSearchTerm('');
                      setStatusFilter('');
                      setStartDate('');
                      setEndDate('');
                      setCurrentPage(1);
                    }}
                    title="Clear Filters"
                  >
                    Clear
                  </Button>
                )}
              </div>
            </div>
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
