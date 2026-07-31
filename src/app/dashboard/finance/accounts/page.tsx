'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useI18n } from '@/lib/i18n';
import { Card, CardBody, Table, Badge, Button, Input, Select } from '@/components/ui';
import type { ColumnDef } from '@/components/ui';
import { useApiList } from '@/hooks/useApi';

interface ChartOfAccount {
  id: string;
  accountCode: string;
  accountName: string;
  accountType: string;
  parentId: string;
  isActive: boolean;
}

export default function ChartOfAccountsPage() {
  const { t } = useI18n();
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [seeding, setSeeding] = useState(false);
  const [seedResult, setSeedResult] = useState<string | null>(null);
  const pageSize = 20;

  const { data, pagination, loading, error, refetch } = useApiList<ChartOfAccount>('/api/finance/accounts', {
    page: currentPage,
    limit: pageSize,
    search: searchTerm,
    filters: { accountType: typeFilter },
  });

  const handleSeedAccounts = async () => {
    if (!confirm('This will seed the standard Chart of Accounts (25 accounts). Existing accounts will not be duplicated. Continue?')) return;
    setSeeding(true);
    setSeedResult(null);
    try {
      const res = await fetch('/api/finance/accounts', { method: 'PUT' });
      const result = await res.json();
      if (result.success) {
        setSeedResult(`Successfully seeded ${result.accounts?.length || 0} accounts`);
        refetch();
      } else {
        setSeedResult(`Error: ${result.error}`);
      }
    } catch (err: any) {
      setSeedResult(`Error: ${err.message}`);
    } finally {
      setSeeding(false);
    }
  };

  const columns: ColumnDef<ChartOfAccount>[] = [
    { header: 'Account Code', accessor: 'accountCode', sortable: true },
    { header: 'Account Name', accessor: 'accountName', sortable: true },
    { header: 'Type', accessor: 'accountType', sortable: true },
    {
      header: 'Status',
      accessor: 'isActive',
      render: (val) => <Badge status={val ? 'Active' : 'Inactive'}>{val ? 'Active' : 'Inactive'}</Badge>,
    },
    {
      header: 'Actions',
      accessor: 'id',
      render: (id) => (
        <Link href={`/dashboard/finance/accounts/${id}`}>
          <Button size="sm" variant="outline">View</Button>
        </Link>
      ),
    },
  ];

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex flex-wrap gap-3 items-center justify-between">
        <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900">Chart of Accounts</h1>
        <div className="flex gap-2">
          <Button
            variant="secondary"
            size="lg"
            onClick={handleSeedAccounts}
            isLoading={seeding}
          >
            Seed Standard Accounts
          </Button>
          <Link href="/dashboard/finance/accounts/new">
            <Button variant="primary" size="lg">+ Add Account</Button>
          </Link>
        </div>
      </div>

      {seedResult && (
        <div className={`p-4 rounded-xl text-sm ${seedResult.startsWith('Error') ? 'bg-red-50 text-red-800 border border-red-200' : 'bg-green-50 text-green-800 border border-green-200'}`}>
          {seedResult}
        </div>
      )}

      <Card>
        <CardBody>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <Input placeholder="Search by code or name..." value={searchTerm} onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }} />
            <Select
              options={[
                { value: '', label: 'All Types' },
                { value: 'Asset', label: 'Asset' },
                { value: 'Liability', label: 'Liability' },
                { value: 'Equity', label: 'Equity' },
                { value: 'Revenue', label: 'Revenue' },
                { value: 'Expense', label: 'Expense' },
              ]}
              value={typeFilter}
              onChange={(e) => { setTypeFilter(e.target.value); setCurrentPage(1); }}
            />
          </div>
          <div className="mt-4 text-sm text-gray-600">
            {loading ? 'Loading...' : `Showing ${data.length} of ${pagination.total} accounts`}
          </div>
        </CardBody>
      </Card>

      <Card>
        <CardBody>
          {error && <div className="text-red-600 mb-4">Error: {error}</div>}
          <Table<ChartOfAccount>
            data={data}
            columns={columns}
            pageSize={pageSize}
            totalPages={pagination.pages}
            currentPage={currentPage}
            onPageChange={setCurrentPage}
            emptyMessage={loading ? 'Loading...' : 'No accounts found'}
          />
        </CardBody>
      </Card>
    </div>
  );
}
