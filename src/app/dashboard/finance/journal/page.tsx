'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useI18n } from '@/lib/i18n';
import { Card, CardBody, Table, Badge, Button, Input, Select } from '@/components/ui';
import type { ColumnDef } from '@/components/ui';
import { useApiList } from '@/hooks/useApi';

interface JournalEntry {
  id: number;
  voucherNo: string;
  entryDate: string;
  description: string;
  account: { accountName: string; accountCode: string } | null;
  debit: number;
  credit: number;
  refModule: string;
  refId: string;
  postedBy: string;
}

export default function JournalEntriesPage() {
  const { t } = useI18n();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [rebuilding, setRebuilding] = useState(false);
  const [rebuildResult, setRebuildResult] = useState<string | null>(null);
  const pageSize = 10;

  const { data, pagination, loading, error, refetch } = useApiList<JournalEntry>('/api/finance/journal', {
    page: currentPage,
    limit: pageSize,
    search: searchTerm,
    filters: { status: statusFilter },
  });

  const handleRebuildJournal = async () => {
    if (!confirm('This will regenerate journal entries from all existing transactions (vouchers, purchases, invoices, liftings, payments). Existing entries will not be duplicated. Continue?')) return;
    setRebuilding(true);
    setRebuildResult(null);
    try {
      const res = await fetch('/api/finance/journal/rebuild', { method: 'POST' });
      const result = await res.json();
      if (result.success) {
        const r = result.results;
        const summary = [
          r.postedVouchers?.created && `${r.postedVouchers.created} vouchers`,
          r.cementPurchases?.created && `${r.cementPurchases.created} purchases`,
          r.salesInvoices?.created && `${r.salesInvoices.created} invoices`,
          r.cementLiftings?.created && `${r.cementLiftings.created} liftings`,
          r.cementPurchasePayments?.created && `${r.cementPurchasePayments.created} purchase payments`,
          r.customerPayments?.created && `${r.customerPayments.created} customer payments`,
        ].filter(Boolean).join(', ');
        setRebuildResult(`Rebuild complete: ${summary || 'no new entries needed'}`);
        refetch();
      } else {
        setRebuildResult(`Error: ${result.error}`);
      }
    } catch (err: any) {
      setRebuildResult(`Error: ${err.message}`);
    } finally {
      setRebuilding(false);
    }
  };

  const columns: ColumnDef<JournalEntry>[] = [
    { header: 'Voucher No', accessor: 'voucherNo', sortable: true },
    {
      header: 'Date',
      accessor: 'entryDate',
      render: (val) => val ? new Date(val).toLocaleDateString() : '-',
    },
    { header: 'Description', accessor: 'description' },
    {
      header: 'Account',
      accessor: 'account',
      render: (_val, row) => row.account ? `${row.account.accountCode} - ${row.account.accountName}` : '-',
    },
    {
      header: 'Debit (ETB)',
      accessor: 'debit',
      render: (val) => Number(val).toLocaleString('en-US'),
    },
    {
      header: 'Credit (ETB)',
      accessor: 'credit',
      render: (val) => Number(val).toLocaleString('en-US'),
    },
    { header: 'Reference', accessor: 'refModule' },
    {
      header: 'Actions',
      accessor: 'id',
      render: (id) => (
        <Link href={`/dashboard/finance/journal/${id}`}>
          <Button size="sm" variant="outline">View</Button>
        </Link>
      ),
    },
  ];

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex flex-wrap gap-3 items-center justify-between">
        <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900">Journal Entries</h1>
        <div className="flex gap-2">
          <Button
            variant="secondary"
            size="lg"
            onClick={handleRebuildJournal}
            isLoading={rebuilding}
          >
            Rebuild Journal
          </Button>
          <Link href="/dashboard/finance/journal/new">
            <Button variant="primary" size="lg">+ New Journal Entry</Button>
          </Link>
        </div>
      </div>

      {rebuildResult && (
        <div className={`p-4 rounded-xl text-sm ${rebuildResult.startsWith('Error') ? 'bg-red-50 text-red-800 border border-red-200' : 'bg-green-50 text-green-800 border border-green-200'}`}>
          {rebuildResult}
        </div>
      )}

      <Card>
        <CardBody>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <Input placeholder="Search by entry no or description..." value={searchTerm} onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }} />
            <Select
              options={[
                { value: '', label: 'All Statuses' },
                { value: 'Draft', label: 'Draft' },
                { value: 'Posted', label: 'Posted' },
                { value: 'Cancelled', label: 'Cancelled' },
              ]}
              value={statusFilter}
              onChange={(e) => { setStatusFilter(e.target.value); setCurrentPage(1); }}
            />
          </div>
          <div className="mt-4 text-sm text-gray-600">
            {loading ? 'Loading...' : `Showing ${data.length} of ${pagination.total} journal entries`}
          </div>
        </CardBody>
      </Card>

      <Card>
        <CardBody>
          {error && <div className="text-red-600 mb-4">Error: {error}</div>}
          <Table<JournalEntry>
            data={data}
            columns={columns}
            pageSize={pageSize}
            totalPages={pagination.pages}
            currentPage={currentPage}
            onPageChange={setCurrentPage}
            emptyMessage={loading ? 'Loading...' : 'No journal entries found'}
          />
        </CardBody>
      </Card>
    </div>
  );
}
