'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Card, CardBody, Table, Badge, Button, Input, Select } from '@/components/ui';
import type { ColumnDef } from '@/components/ui';
import { useApiList } from '@/hooks/useApi';

interface SalesOrder {
  id: string;
  orderNo: string;
  customer: { id: string; companyName: string; phone?: string; code?: string } | null;
  division: string;
  orderDate: string;
  totalAmount: number;
  status: string;
  items?: string | any[];
}

const DIVISIONS = [
  { value: '', label: 'All Divisions' },
  { value: 'CONSTRUCTION', label: 'Construction' },
  { value: 'CEMENT', label: 'Cement' },
  { value: 'AGGREGATE', label: 'Aggregate' },
  { value: 'MEDICAL', label: 'Medical (Licensed)' },
  { value: 'GENERAL', label: 'General' },
];

export default function SalesOrdersPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [divisionFilter, setDivisionFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const filters: Record<string, string> = {};
  if (statusFilter) filters.status = statusFilter;
  if (divisionFilter) filters.division = divisionFilter;

  const { data, pagination, loading, error, refetch } = useApiList<SalesOrder>('/api/sales/orders', {
    page: currentPage,
    limit: pageSize,
    search: searchTerm,
    filters,
  });

  const handleDeleteOrder = async (id: string, orderNo: string) => {
    const confirmed = window.confirm(
      `Are you sure you want to delete Sales Order "${orderNo}"?\n\nThis will cancel or permanently remove this order.`
    );
    if (!confirmed) return;

    try {
      const res = await fetch(`/api/sales/orders/${id}`, { method: 'DELETE' });
      const result = await res.json();
      if (!res.ok || !result.success) {
        throw new Error(result.error || 'Failed to delete sales order');
      }
      alert(result.message || 'Sales order deleted successfully');
      refetch();
    } catch (err: any) {
      alert(err.message || 'Failed to delete sales order');
    }
  };

  const getDivisionBadge = (division?: string) => {
    const div = (division || '').toUpperCase();
    switch (div) {
      case 'MEDICAL':
        return <span className="px-2 py-0.5 rounded-md text-xs font-semibold bg-purple-100 text-purple-800 border border-purple-200">🏥 Medical</span>;
      case 'CEMENT':
        return <span className="px-2 py-0.5 rounded-md text-xs font-semibold bg-amber-100 text-amber-800 border border-amber-200">🏗️ Cement</span>;
      case 'AGGREGATE':
        return <span className="px-2 py-0.5 rounded-md text-xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200">🪨 Aggregate</span>;
      case 'CONSTRUCTION':
        return <span className="px-2 py-0.5 rounded-md text-xs font-semibold bg-blue-100 text-blue-800 border border-blue-200">🏢 Construction</span>;
      default:
        return <span className="px-2 py-0.5 rounded-md text-xs font-medium bg-gray-100 text-gray-700">📦 {division || 'General'}</span>;
    }
  };

  const columns: ColumnDef<SalesOrder>[] = [
    {
      header: 'Order No',
      accessor: 'orderNo',
      sortable: true,
      render: (val, row) => (
        <Link href={`/dashboard/sales/orders/${row.id}`} className="font-mono text-xs font-semibold text-blue-600 hover:text-blue-800 hover:underline">
          {val}
        </Link>
      ),
    },
    {
      header: 'Customer',
      accessor: 'customer',
      render: (_val, row) => (
        <div>
          <div className="font-medium text-gray-900">{row.customer?.companyName || '-'}</div>
          {row.customer?.phone && <div className="text-xs text-gray-500">{row.customer.phone}</div>}
        </div>
      ),
    },
    {
      header: 'Division',
      accessor: 'division',
      render: (val) => getDivisionBadge(val),
    },
    {
      header: 'Date',
      accessor: 'orderDate',
      render: (val) => (val ? new Date(val).toLocaleDateString() : '-'),
    },
    {
      header: 'Total (ETB)',
      accessor: 'totalAmount',
      render: (val) => (
        <span className="font-mono font-bold text-gray-900">
          ETB {Number(val ?? 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
        </span>
      ),
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
        <div className="flex flex-wrap items-center gap-1.5">
          <Link href={`/dashboard/sales/orders/${id}`}>
            <Button size="sm" variant="outline">View</Button>
          </Link>
          <Link href={`/dashboard/sales/deliveries/new?salesOrderId=${id}`}>
            <Button size="sm" variant="secondary" title="Create delivery from this order">+ Deliver</Button>
          </Link>
          <Button
            size="sm"
            variant="outline"
            className="border-red-200 text-red-600 hover:bg-red-50 hover:border-red-300"
            onClick={() => handleDeleteOrder(id, row.orderNo || 'this order')}
          >
            Delete
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex flex-wrap gap-3 items-center justify-between">
        <div>
          <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900">Sales Orders</h1>
          <p className="text-gray-600 text-xs sm:text-sm mt-0.5">
            Manage customer sales orders across Construction, Cement, Aggregate, and Medical divisions
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href="/dashboard/sales/deliveries">
            <Button variant="outline" size="sm">🚚 Deliveries</Button>
          </Link>
          <Link href="/dashboard/sales/invoices">
            <Button variant="outline" size="sm">📄 Invoices</Button>
          </Link>
          <Link href="/dashboard/sales/orders/new">
            <Button variant="primary" size="sm">+ New Order</Button>
          </Link>
        </div>
      </div>

      {/* Filter and Search Card */}
      <Card>
        <CardBody>
          <div className="flex flex-col lg:flex-row items-center justify-between gap-4">
            <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto flex-1">
              <div className="w-full sm:w-72">
                <Input
                  placeholder="Search by order no or customer..."
                  value={searchTerm}
                  onChange={(e) => {
                    setSearchTerm(e.target.value);
                    setCurrentPage(1);
                  }}
                />
              </div>

              <div className="w-full sm:w-48">
                <Select
                  options={DIVISIONS}
                  value={divisionFilter}
                  onChange={(e) => {
                    setDivisionFilter(e.target.value);
                    setCurrentPage(1);
                  }}
                />
              </div>

              <div className="w-full sm:w-44">
                <Select
                  options={[
                    { value: '', label: 'All Statuses' },
                    { value: 'Draft', label: 'Draft' },
                    { value: 'Pending', label: 'Pending' },
                    { value: 'Confirmed', label: 'Confirmed' },
                    { value: 'Delivered', label: 'Delivered' },
                    { value: 'Invoiced', label: 'Invoiced' },
                    { value: 'Cancelled', label: 'Cancelled' },
                  ]}
                  value={statusFilter}
                  onChange={(e) => {
                    setStatusFilter(e.target.value);
                    setCurrentPage(1);
                  }}
                />
              </div>
            </div>

            <div className="flex items-center gap-2 self-end lg:self-center">
              <label className="text-xs text-gray-500 font-medium whitespace-nowrap">Per page:</label>
              <select
                className="border border-gray-300 rounded-lg px-2.5 py-1.5 text-xs bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                value={String(pageSize)}
                onChange={(e) => {
                  setPageSize(Number(e.target.value));
                  setCurrentPage(1);
                }}
              >
                <option value="10">10 per page</option>
                <option value="20">20 per page</option>
                <option value="50">50 per page</option>
                <option value="100">100 per page</option>
              </select>
            </div>
          </div>

          <div className="mt-4 text-sm text-gray-600 font-medium">
            {loading ? 'Loading sales orders...' : `Showing ${data.length} of ${pagination.total} sales orders`}
          </div>
        </CardBody>
      </Card>

      {/* Orders Table */}
      <Card>
        <CardBody>
          {error && <div className="text-red-600 mb-4 font-medium">Error: {error}</div>}
          <Table<SalesOrder>
            data={data}
            columns={columns}
            pageSize={pageSize}
            totalPages={pagination.pages}
            currentPage={currentPage}
            onPageChange={setCurrentPage}
            emptyMessage={loading ? 'Loading sales orders...' : 'No sales orders found. Click "+ New Order" to create one.'}
          />
        </CardBody>
      </Card>
    </div>
  );
}
