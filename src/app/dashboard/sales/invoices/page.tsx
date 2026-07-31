'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useI18n } from '@/lib/i18n';
import { Card, CardBody, Table, Badge, Button, Input, Select } from '@/components/ui';
import type { ColumnDef } from '@/components/ui';
import { useApiList } from '@/hooks/useApi';

interface SalesInvoice {
  id: string;
  invoiceNo: string;
  customer: { id: string; companyName: string };
  salesOrder: { orderNo: string } | null;
  division: string;
  items: string; // JSON string containing items
  invoiceDate: string;
  dueDate: string;
  totalAmount: number;
  vatAmount: number;
  status: string;
}

export default function InvoicesPage() {
  const { t } = useI18n();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [divisionFilter, setDivisionFilter] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

  const { data, pagination, loading, error } = useApiList<SalesInvoice>('/api/sales/invoices', {
    page: currentPage,
    limit: pageSize,
    search: searchTerm,
    filters: { status: statusFilter, division: divisionFilter },
  });

  const columns: ColumnDef<SalesInvoice>[] = [
    { header: 'Invoice No', accessor: 'invoiceNo', sortable: true },
    {
      header: 'Division',
      accessor: 'division',
      render: (val) => {
        const div = val as string;
        const colors: Record<string, string> = {
          AGGREGATE: 'bg-orange-100 text-orange-800',
          CEMENT: 'bg-blue-100 text-blue-800',
          CONSTRUCTION: 'bg-green-100 text-green-800',
          MEDICAL: 'bg-purple-100 text-purple-800',
          GENERAL: 'bg-gray-100 text-gray-800',
        };
        return (
          <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${colors[div] || 'bg-gray-100 text-gray-800'}`}>
            {div}
          </span>
        );
      },
    },
    {
      header: 'Customer',
      accessor: 'customer',
      render: (_val, row) => row.customer?.companyName || '-',
    },
    {
      header: 'Items',
      accessor: 'items',
      render: (val) => {
        try {
          const items = typeof val === 'string' ? JSON.parse(val) : val;
          if (Array.isArray(items) && items.length > 0) {
            return items.map((item: any) => item.name || item.itemName || item.itemId || 'Unknown').join(', ');
          }
          return '-';
        } catch {
          return '-';
        }
      },
    },
    {
      header: 'Sales Order',
      accessor: 'salesOrder',
      render: (_val, row) => row.salesOrder?.orderNo || '-',
    },
    {
      header: 'Date',
      accessor: 'invoiceDate',
      render: (val) => val ? new Date(val).toLocaleDateString() : '-',
    },
    {
      header: 'Due Date',
      accessor: 'dueDate',
      render: (val) => val ? new Date(val).toLocaleDateString() : '-',
    },
    {
      header: 'Total (ETB)',
      accessor: 'totalAmount',
      render: (val) => Number(val).toLocaleString('en-US'),
    },
    {
      header: 'Status',
      accessor: 'status',
      render: (status) => <Badge status={status as any}>{status}</Badge>,
    },
    {
      header: 'Actions',
      accessor: 'id',
      render: (id) => (
        <div className="flex gap-2">
          <Link href={`/dashboard/sales/invoices/${id}`}>
            <Button size="sm" variant="outline">View</Button>
          </Link>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex flex-wrap gap-3 items-center justify-between">
        <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900">Sales Invoices</h1>
        <Link href="/dashboard/sales/invoices/new">
          <Button variant="primary" size="lg">+ New Invoice</Button>
        </Link>
      </div>

      <Card>
        <CardBody>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Input placeholder="Search by invoice no or customer..." value={searchTerm} onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }} />
            <Select
              options={[
                { value: '', label: 'All Divisions' },
                { value: 'AGGREGATE', label: 'Aggregate' },
                { value: 'CEMENT', label: 'Cement' },
                { value: 'CONSTRUCTION', label: 'Construction' },
                { value: 'MEDICAL', label: 'Medical' },
                { value: 'GENERAL', label: 'General' },
              ]}
              value={divisionFilter}
              onChange={(e) => { setDivisionFilter(e.target.value); setCurrentPage(1); }}
            />
            <Select
              options={[
                { value: '', label: 'All Statuses' },
                { value: 'Unpaid', label: 'Unpaid' },
                { value: 'Partial', label: 'Partial' },
                { value: 'Paid', label: 'Paid' },
                { value: 'Overdue', label: 'Overdue' },
                { value: 'Cancelled', label: 'Cancelled' },
              ]}
              value={statusFilter}
              onChange={(e) => { setStatusFilter(e.target.value); setCurrentPage(1); }}
            />
          </div>
          <div className="mt-4 text-sm text-gray-600">
            {loading ? 'Loading...' : `Showing ${data.length} of ${pagination.total} invoices`}
          </div>
        </CardBody>
      </Card>

      <Card>
        <CardBody>
          {error && <div className="text-red-600 mb-4">Error: {error}</div>}
          <Table<SalesInvoice>
            data={data}
            columns={columns}
            pageSize={pageSize}
            totalPages={pagination.pages}
            currentPage={currentPage}
            onPageChange={setCurrentPage}
            emptyMessage={loading ? 'Loading...' : 'No invoices found'}
          />
        </CardBody>
      </Card>
    </div>
  );
}
