'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useI18n } from '@/lib/i18n';
import { Card, CardBody, Table, Badge, Button, Input, Select } from '@/components/ui';
import type { ColumnDef } from '@/components/ui';
import { useApiList } from '@/hooks/useApi';

interface SupplierAgreement {
  id: string;
  agreementNo: string;
  supplier: { id: string; name: string };
  totalAmount: number;
  validFrom: string;
  validTo: string;
  status: string;
}

export default function SupplierAgreementsPage() {
  const { t } = useI18n();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(50); // Increased default to 50
  const [debugInfo, setDebugInfo] = useState<any>(null);

  const showDebugInfo = async () => {
    try {
      const response = await fetch('/api/supplier-agreements/debug');
      const data = await response.json();
      setDebugInfo(data.debug);
      alert(`Total supplier agreements in DB: ${data.debug.totalAgreements}\n\nStatus breakdown:\n${data.debug.statusBreakdown.map((s: any) => `${s.status}: ${s.count}`).join('\n')}\n\nCheck console for full details`);
      console.log('Debug Info:', data.debug);
    } catch (error) {
      alert('Debug failed: ' + error);
    }
  };

  // Construct filters object
  const apiFilters: Record<string, string> = {};
  if (statusFilter === 'EXCLUDE_VOID') {
    // Exclude void agreements but show all others
    apiFilters.includeVoid = 'false';
  } else if (statusFilter === '' || !statusFilter) {
    // Show all records including void by default
    apiFilters.includeVoid = 'true';
  } else if (statusFilter) {
    // Show specific status
    apiFilters.status = statusFilter;
  }

  // Use the /all endpoint when pageSize is 1000 or when we want to show all
  const apiEndpoint = pageSize >= 1000 ? '/api/supplier-agreements/all' : '/api/supplier-agreements';
  const apiOptions = pageSize >= 1000 
    ? { search: searchTerm, filters: apiFilters } // No pagination for /all endpoint
    : { page: currentPage, limit: pageSize, search: searchTerm, filters: apiFilters };

  const { data, pagination, loading, error } = useApiList<SupplierAgreement>(apiEndpoint, apiOptions);

  const columns: ColumnDef<SupplierAgreement>[] = [
    { header: 'Agreement No', accessor: 'agreementNo', sortable: true },
    {
      header: 'Supplier',
      accessor: 'supplier',
      render: (_val, row) => row.supplier?.companyName || '-',
    },
    {
      header: 'Total (ETB)',
      accessor: 'totalAmount',
      render: (val) => (val ?? 0).toLocaleString('en-US'),
    },
    {
      header: 'Valid From',
      accessor: 'validFrom',
      render: (val) => val ? new Date(val).toLocaleDateString() : '-',
    },
    {
      header: 'Valid To',
      accessor: 'validTo',
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
      render: (id) => (
        <div className="flex gap-2">
          <Link href={`/dashboard/supplier-agreements/${id}`}>
            <Button size="sm" variant="outline">View</Button>
          </Link>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex flex-wrap gap-3 items-center justify-between">
        <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900">Supplier Agreements</h1>
        <div className="flex gap-2">
          <Button onClick={showDebugInfo} variant="outline" size="lg">🐛 Debug DB</Button>
          <Link href="/dashboard/supplier-agreements/new">
            <Button variant="primary" size="lg">+ New Agreement</Button>
          </Link>
        </div>
      </div>

      <Card>
        <CardBody>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Input
              placeholder="Search by agreement no or supplier..."
              value={searchTerm}
              onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
            />
            <Select
              options={[
                { value: '', label: 'All Agreements (Including Void)' },
                { value: 'Active', label: 'Active Only' },
                { value: 'Draft', label: 'Draft Only' },
                { value: 'Expired', label: 'Expired Only' },
                { value: 'Cancelled', label: 'Cancelled Only' },
                { value: 'Void', label: 'Void Only' },
                { value: 'EXCLUDE_VOID', label: 'All Active Statuses (Exclude Void)' },
              ]}
              value={statusFilter}
              onChange={(e) => { setStatusFilter(e.target.value); setCurrentPage(1); }}
            />
            <Select
              options={[
                { value: '10', label: '10 per page' },
                { value: '25', label: '25 per page' },
                { value: '50', label: '50 per page' },
                { value: '100', label: '100 per page' },
                { value: '500', label: '500 per page' },
                { value: '1000', label: 'Show All' },
              ]}
              value={String(pageSize)}
              onChange={(e) => { setPageSize(Number(e.target.value)); setCurrentPage(1); }}
            />
          </div>
          <div className="mt-4 flex flex-wrap gap-4 items-center justify-between">
            <div className="text-sm text-gray-600 font-medium">
              {loading ? 'Loading agreements...' : `Showing ${data.length} of ${pagination.total} agreements`}
            </div>
            {pageSize >= 1000 && (
              <div className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                Showing all records (no pagination)
              </div>
            )}
            {error && (
              <div className="text-xs bg-red-100 text-red-800 px-2 py-1 rounded">
                Error: {error}
              </div>
            )}
          </div>
        </CardBody>
      </Card>

      <Card>
        <CardBody>
          {error && <div className="text-red-600 mb-4">Error: {error}</div>}
          <Table<SupplierAgreement>
            data={data}
            columns={columns}
            pageSize={pageSize >= 1000 ? data.length : pageSize}
            totalPages={pageSize >= 1000 ? 1 : pagination.pages}
            currentPage={pageSize >= 1000 ? 1 : currentPage}
            onPageChange={pageSize >= 1000 ? undefined : setCurrentPage}
            emptyMessage={loading ? 'Loading...' : 'No supplier agreements found'}
          />
        </CardBody>
      </Card>
    </div>
  );
}
