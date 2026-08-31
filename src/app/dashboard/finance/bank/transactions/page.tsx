'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Card, CardBody, Table, Badge, Button, Input, Select } from '@/components/ui';
import type { ColumnDef } from '@/components/ui';
import { useApiList } from '@/hooks/useApi';

interface BankTransaction {
  id: string;
  bankAccountId: string;
  type: 'deposit' | 'withdrawal' | 'transfer' | string;
  amount: number;
  refNo: string | null;
  description: string | null;
  refModule: string | null;
  transDate: string;
  reconStatus: string;
  bankAccount: {
    id: string;
    bankName: string;
    accountNo: string;
    accountName: string;
  } | null;
}

export default function BankTransactionsPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  const { data, pagination, loading, error, refetch } = useApiList<BankTransaction>('/api/finance/bank/transactions', {
    page: currentPage,
    limit: pageSize,
    search: searchTerm,
    filters: {
      type: typeFilter,
    },
  });

  const columns: ColumnDef<BankTransaction>[] = [
    {
      header: 'Date',
      accessor: 'transDate',
      render: (val) => (val ? new Date(val).toLocaleDateString() : '-'),
    },
    {
      header: 'Bank Account',
      accessor: 'bankAccount',
      render: (_val, row) => (
        <div>
          <div className="font-semibold text-gray-900">{row.bankAccount?.bankName || 'Unknown Bank'}</div>
          <div className="text-xs text-gray-500 font-mono">{row.bankAccount?.accountNo}</div>
        </div>
      ),
    },
    {
      header: 'Type',
      accessor: 'type',
      render: (type) => {
        const t = String(type).toLowerCase();
        let badgeColor = 'bg-gray-100 text-gray-800';
        if (t === 'deposit') badgeColor = 'bg-emerald-100 text-emerald-800 font-semibold';
        else if (t === 'withdrawal') badgeColor = 'bg-rose-100 text-rose-800 font-semibold';
        else if (t === 'transfer') badgeColor = 'bg-blue-100 text-blue-800 font-semibold';

        return (
          <span className={`px-2 py-0.5 rounded-md text-xs uppercase tracking-wide ${badgeColor}`}>
            {type}
          </span>
        );
      },
    },
    {
      header: 'Reference',
      accessor: 'refNo',
      render: (val) => <span className="font-mono text-xs font-medium text-gray-700">{val || '-'}</span>,
    },
    {
      header: 'Description',
      accessor: 'description',
      render: (val) => <span className="text-gray-700 text-xs sm:text-sm">{val || '-'}</span>,
    },
    {
      header: 'Amount (ETB)',
      accessor: 'amount',
      render: (val, row) => {
        const num = Number(val ?? 0);
        const isDeposit = String(row.type).toLowerCase() === 'deposit';
        return (
          <span className={`font-mono font-bold text-sm ${isDeposit ? 'text-emerald-700' : 'text-rose-700'}`}>
            {isDeposit ? '+' : '-'} ETB {num.toLocaleString('en-US', { minimumFractionDigits: 2 })}
          </span>
        );
      },
    },
    {
      header: 'Reconciliation',
      accessor: 'reconStatus',
      render: (status) => (
        <Badge status={status === 'Reconciled' ? 'Active' : 'Draft'}>
          {status || 'Pending'}
        </Badge>
      ),
    },
    {
      header: 'GL Trace',
      accessor: 'id',
      render: (_id, row) => (
        <Link
          href={`/dashboard/finance/general-ledger?search=${encodeURIComponent(row.refNo || row.bankAccount?.accountNo || '')}`}
        >
          <Button size="sm" variant="outline" title="Trace this transaction in Chart of Accounts / General Ledger">
            📖 Ledger
          </Button>
        </Link>
      ),
    },
  ];

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex flex-wrap gap-3 items-center justify-between">
        <div>
          <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900">Bank Transactions</h1>
          <p className="text-gray-600 text-xs sm:text-sm mt-0.5">
            Audit history of deposits, withdrawals, and bank transfers posted to Chart of Accounts
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href="/dashboard/finance/accounts">
            <Button variant="outline" size="sm">📊 Chart of Accounts</Button>
          </Link>
          <Link href="/dashboard/finance/general-ledger">
            <Button variant="outline" size="sm">📖 General Ledger</Button>
          </Link>
          <Link href="/dashboard/finance/bank">
            <Button variant="secondary" size="sm">🏦 Bank Accounts</Button>
          </Link>
          <Link href="/dashboard/finance/bank/transactions/new">
            <Button variant="primary" size="sm">+ New Transaction</Button>
          </Link>
        </div>
      </div>

      <Card>
        <CardBody>
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto flex-1">
              <div className="w-full sm:w-80">
                <Input
                  placeholder="Search by reference or description..."
                  value={searchTerm}
                  onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
                />
              </div>
              <div className="w-full sm:w-48">
                <Select
                  value={typeFilter}
                  onChange={(e) => { setTypeFilter(e.target.value); setCurrentPage(1); }}
                  options={[
                    { value: '', label: 'All Transaction Types' },
                    { value: 'deposit', label: 'Deposits (+)' },
                    { value: 'withdrawal', label: 'Withdrawals (-)' },
                    { value: 'transfer', label: 'Transfers (⇄)' },
                  ]}
                />
              </div>
            </div>

            <div className="flex items-center gap-2">
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
            {loading ? 'Loading transactions...' : `Showing ${data.length} of ${pagination.total} bank transactions`}
          </div>
        </CardBody>
      </Card>

      <Card>
        <CardBody>
          {error && <div className="text-red-600 mb-4">Error: {error}</div>}
          <Table<BankTransaction>
            data={data}
            columns={columns}
            pageSize={pageSize}
            totalPages={pagination.pages}
            currentPage={currentPage}
            onPageChange={setCurrentPage}
            emptyMessage={loading ? 'Loading transactions...' : 'No bank transactions found. Click "+ New Transaction" to create one.'}
          />
        </CardBody>
      </Card>
    </div>
  );
}
