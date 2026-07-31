'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useI18n } from '@/lib/i18n';
import { Card, CardBody, Table, Badge, Button, Input } from '@/components/ui';
import type { ColumnDef } from '@/components/ui';
import { useApiList } from '@/hooks/useApi';

interface BankAccount {
  id: number;
  bankName: string;
  accountNo: string;
  accountName: string;
  currency: string;
  balance: number;
  status: string;
}

export default function BankAccountsPage() {
  const { t } = useI18n();
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

  const { data, pagination, loading, error } = useApiList<BankAccount>('/api/finance/bank', {
    page: currentPage,
    limit: pageSize,
    search: searchTerm,
  });

  const columns: ColumnDef<BankAccount>[] = [
    { header: 'Bank Name', accessor: 'bankName', sortable: true },
    { header: 'Account No', accessor: 'accountNo' },
    { header: 'Account Name', accessor: 'accountName', sortable: true },
    { header: 'Currency', accessor: 'currency' },
    {
      header: 'Balance',
      accessor: 'balance',
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
        <Link href={`/dashboard/finance/bank/${id}`}>
          <Button size="sm" variant="outline">View</Button>
        </Link>
      ),
    },
  ];

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex flex-wrap gap-3 items-center justify-between">
        <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900">Bank Accounts</h1>
        <div className="flex gap-2">
          <Link href="/dashboard/finance/bank/transactions/new">
            <Button variant="outline" size="lg">+ New Transaction</Button>
          </Link>
          <Link href="/dashboard/finance/bank/new">
            <Button variant="primary" size="lg">+ Add Bank Account</Button>
          </Link>
        </div>
      </div>

      <Card>
        <CardBody>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input placeholder="Search by bank name or account..." value={searchTerm} onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }} />
          </div>
          <div className="mt-4 text-sm text-gray-600">
            {loading ? 'Loading...' : `Showing ${data.length} of ${pagination.total} bank accounts`}
          </div>
        </CardBody>
      </Card>

      <Card>
        <CardBody>
          {error && <div className="text-red-600 mb-4">Error: {error}</div>}
          <Table<BankAccount>
            data={data}
            columns={columns}
            pageSize={pageSize}
            totalPages={pagination.pages}
            currentPage={currentPage}
            onPageChange={setCurrentPage}
            emptyMessage={loading ? 'Loading...' : 'No bank accounts found'}
          />
        </CardBody>
      </Card>
    </div>
  );
}
