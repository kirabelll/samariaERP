'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  Package,
  Eye,
  Edit2,
  Plus,
  Search,
  Calendar,
  AlertTriangle,
  Building2,
  Warehouse,
  DollarSign,
  X,
  ArrowRight,
  ExternalLink,
} from 'lucide-react';
import { useI18n } from '@/lib/i18n';
import { Card, CardBody, Table, Badge, Button, Input } from '@/components/ui';
import type { ColumnDef } from '@/components/ui';
import { useApiList } from '@/hooks/useApi';

interface MedicalBatch {
  id: string;
  batchNo: string;
  itemId: string;
  costPrice?: number;
  receivedDate?: string;
  item: {
    id: string;
    code: string;
    name: string;
    genericName?: string | null;
    manufacturer?: string | null;
    strength?: string | null;
    unit?: string | null;
    category?: string | null;
    dosageForm?: string | null;
  } | null;
  quantity: number;
  expiryDate: string;
  warehouse: string;
  status: string;
}

function formatWarehouse(warehouse?: string): string {
  if (!warehouse) return 'Medical Store';
  return warehouse
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
}

function formatCurrency(amount?: number) {
  if (!amount && amount !== 0) return '-';
  return `ETB ${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export default function MedicalStorePage() {
  const { t } = useI18n();
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedBatch, setSelectedBatch] = useState<MedicalBatch | null>(null);
  const pageSize = 10;

  const { data, pagination, loading, error } = useApiList<MedicalBatch>('/api/medical/batches', {
    page: currentPage,
    limit: pageSize,
    search: searchTerm,
  });

  const columns: ColumnDef<MedicalBatch>[] = [
    {
      header: 'Batch No',
      accessor: 'batchNo',
      sortable: true,
      render: (val, row) => (
        <Link
          href={`/dashboard/medical/store/${row.id}`}
          className="font-mono font-semibold text-blue-600 hover:text-blue-800 hover:underline inline-flex items-center gap-1"
          title="View batch details"
        >
          {val}
        </Link>
      ),
    },
    {
      header: 'Item',
      accessor: 'item',
      render: (_val, row) => (
        <div>
          <div className="font-medium text-gray-900">{row.item?.name || '-'}</div>
          {row.item?.strength && (
            <div className="text-xs text-gray-500 font-mono">{row.item.strength}</div>
          )}
        </div>
      ),
    },
    {
      header: 'Generic Name',
      accessor: 'item',
      render: (_val, row) => row.item?.genericName || '-',
    },
    {
      header: 'Quantity',
      accessor: 'quantity',
      render: (val, row) => (
        <span className="font-mono font-medium">
          {Number(val).toLocaleString('en-US')} {row.item?.unit || 'units'}
        </span>
      ),
    },
    {
      header: 'Expiry Date',
      accessor: 'expiryDate',
      render: (val) => {
        if (!val) return '-';
        const date = new Date(val);
        const now = new Date();
        const threeMonths = new Date();
        threeMonths.setMonth(threeMonths.getMonth() + 3);
        const isExpired = date < now;
        const isNearExpiry = date < threeMonths && date >= now;
        return (
          <span
            className={
              isExpired
                ? 'text-red-600 font-semibold'
                : isNearExpiry
                ? 'text-orange-600 font-semibold'
                : 'text-gray-700'
            }
          >
            {date.toLocaleDateString()}
            {isExpired && ' (Expired)'}
            {isNearExpiry && ' (Near Expiry)'}
          </span>
        );
      },
    },
    {
      header: 'Manufacturer',
      accessor: 'item',
      render: (_val, row) => row.item?.manufacturer || '-',
    },
    {
      header: 'Warehouse',
      accessor: 'warehouse',
      render: (val) => formatWarehouse(val),
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
        <div className="flex items-center gap-1.5">
          <Link href={`/dashboard/medical/store/${row.id}`}>
            <Button
              size="sm"
              variant="outline"
              icon={<Eye className="w-3.5 h-3.5" />}
              title="View Details"
            >
              View
            </Button>
          </Link>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-wrap justify-between items-center gap-3">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 flex items-center gap-2.5">
            <Package className="w-7 h-7 text-blue-600" />
            Medical Store Management
          </h1>
          <p className="text-gray-600 text-xs sm:text-sm mt-1">
            Track pharmacy batch inventory, expiry dates, warehouses, and valuations
          </p>
        </div>

        <Link href="/dashboard/medical/store/new">
          <Button variant="primary" size="md" icon={<Plus className="w-4 h-4" />}>
            Add Batch
          </Button>
        </Link>
      </div>

      {/* Search & Statistics Card */}
      <Card className="bg-white border border-gray-200 shadow-xs">
        <CardBody className="p-4 sm:p-5">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="relative flex-1 min-w-[240px]">
              <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search by batch no, item name, generic name, or manufacturer..."
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full pl-9 pr-4 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="text-xs sm:text-sm text-gray-600 font-medium">
              {loading ? 'Loading batches...' : `Showing ${data.length} of ${pagination.total} batches`}
            </div>
          </div>
        </CardBody>
      </Card>

      {/* Table Card */}
      <Card className="bg-white border border-gray-200 shadow-xs overflow-hidden">
        <CardBody className="p-0">
          {error && <div className="p-4 bg-red-50 text-red-600 border-b border-red-100 text-sm">Error: {error}</div>}
          <Table<MedicalBatch>
            data={data}
            columns={columns}
            pageSize={pageSize}
            totalPages={pagination.pages}
            currentPage={currentPage}
            onPageChange={setCurrentPage}
            emptyMessage={loading ? 'Loading batches...' : 'No medical batches found'}
          />
        </CardBody>
      </Card>

      {/* Quick View Modal */}
      {selectedBatch && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-fadeIn">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full overflow-hidden border border-gray-200">
            {/* Modal Header */}
            <div className="px-6 py-4 bg-gradient-to-r from-blue-600 to-indigo-600 text-white flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <Package className="w-5 h-5 text-blue-200" />
                <div>
                  <h3 className="font-bold text-base sm:text-lg">
                    Batch: {selectedBatch.batchNo}
                  </h3>
                  <p className="text-xs text-blue-100">{selectedBatch.item?.name || 'Medical Product'}</p>
                </div>
              </div>
              <button
                onClick={() => setSelectedBatch(null)}
                className="text-white/80 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-5 max-h-[75vh] overflow-y-auto">
              {/* Product Information */}
              <div className="p-4 bg-gray-50 rounded-xl border border-gray-200 space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-gray-500 flex items-center gap-1.5">
                  <Building2 className="w-4 h-4 text-blue-600" />
                  Product Information
                </h4>
                <div className="grid grid-cols-2 gap-3 text-xs sm:text-sm">
                  <div>
                    <span className="text-gray-500 block text-xs">Drug / Item Name:</span>
                    <span className="font-semibold text-gray-900">{selectedBatch.item?.name || '-'}</span>
                  </div>
                  <div>
                    <span className="text-gray-500 block text-xs">Generic Name:</span>
                    <span className="font-semibold text-gray-900">{selectedBatch.item?.genericName || '-'}</span>
                  </div>
                  <div>
                    <span className="text-gray-500 block text-xs">Strength & Dosage:</span>
                    <span className="text-gray-800">
                      {selectedBatch.item?.strength || '-'} {selectedBatch.item?.dosageForm ? `(${selectedBatch.item.dosageForm})` : ''}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-500 block text-xs">Manufacturer:</span>
                    <span className="text-gray-800">{selectedBatch.item?.manufacturer || '-'}</span>
                  </div>
                  <div>
                    <span className="text-gray-500 block text-xs">Category:</span>
                    <span className="text-gray-800">{selectedBatch.item?.category || '-'}</span>
                  </div>
                  <div>
                    <span className="text-gray-500 block text-xs">Item Code:</span>
                    <span className="font-mono text-gray-800">{selectedBatch.item?.code || '-'}</span>
                  </div>
                </div>
              </div>

              {/* Batch & Inventory Metrics */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-center">
                <div className="p-3 bg-blue-50/70 rounded-xl border border-blue-100">
                  <span className="text-xs text-blue-700 font-medium uppercase block">Current Stock</span>
                  <span className="text-xl font-bold text-blue-900 font-mono mt-0.5 block">
                    {Number(selectedBatch.quantity).toLocaleString('en-US')} {selectedBatch.item?.unit || 'units'}
                  </span>
                </div>

                <div className="p-3 bg-gray-50 rounded-xl border border-gray-200">
                  <span className="text-xs text-gray-500 font-medium uppercase block">Unit Cost</span>
                  <span className="text-lg font-bold text-gray-900 font-mono mt-0.5 block">
                    {formatCurrency(selectedBatch.costPrice)}
                  </span>
                </div>

                <div className="p-3 bg-green-50/80 rounded-xl border border-green-200">
                  <span className="text-xs text-green-800 font-medium uppercase block">Batch Valuation</span>
                  <span className="text-lg font-bold text-green-700 font-mono mt-0.5 block">
                    {selectedBatch.costPrice
                      ? formatCurrency(selectedBatch.quantity * selectedBatch.costPrice)
                      : '-'}
                  </span>
                </div>
              </div>

              {/* Storage & Expiry */}
              <div className="grid grid-cols-2 gap-4 text-xs sm:text-sm pt-2 border-t border-gray-100">
                <div>
                  <span className="text-gray-500 block text-xs">Warehouse:</span>
                  <span className="font-medium text-gray-900 flex items-center gap-1 mt-0.5">
                    <Warehouse className="w-3.5 h-3.5 text-gray-400" />
                    {formatWarehouse(selectedBatch.warehouse)}
                  </span>
                </div>

                <div>
                  <span className="text-gray-500 block text-xs">Expiry Date:</span>
                  <span className="font-medium text-gray-900 flex items-center gap-1 mt-0.5">
                    <Calendar className="w-3.5 h-3.5 text-gray-400" />
                    {selectedBatch.expiryDate ? new Date(selectedBatch.expiryDate).toLocaleDateString() : '-'}
                  </span>
                </div>

                <div>
                  <span className="text-gray-500 block text-xs">Batch Status:</span>
                  <div className="mt-1">
                    <Badge status={selectedBatch.status as any}>{selectedBatch.status}</Badge>
                  </div>
                </div>

                <div>
                  <span className="text-gray-500 block text-xs">Received Date:</span>
                  <span className="text-gray-700 mt-0.5 block">
                    {selectedBatch.receivedDate ? new Date(selectedBatch.receivedDate).toLocaleDateString() : '-'}
                  </span>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex items-center justify-between">
              <Link href={`/dashboard/medical/store/${selectedBatch.id}`}>
                <Button variant="outline" size="sm" icon={<ExternalLink className="w-3.5 h-3.5" />}>
                  Open Full Details Page
                </Button>
              </Link>
              <Button variant="secondary" size="sm" onClick={() => setSelectedBatch(null)}>
                Close
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
