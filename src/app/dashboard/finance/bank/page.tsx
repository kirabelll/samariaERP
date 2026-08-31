'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useI18n } from '@/lib/i18n';
import { Card, CardBody, Table, Badge, Button, Input } from '@/components/ui';
import type { ColumnDef } from '@/components/ui';
import { useApiList } from '@/hooks/useApi';

interface BankAccount {
  id: string | number;
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
  const [pageSize, setPageSize] = useState(10);
  const [isSeeding, setIsSeeding] = useState(false);
  const [seedNotice, setSeedNotice] = useState<string | null>(null);

  const { data, pagination, loading, error, refetch } = useApiList<BankAccount>('/api/finance/bank', {
    page: currentPage,
    limit: pageSize,
    search: searchTerm,
  });

  const handleSeedBanks = async () => {
    setIsSeeding(true);
    setSeedNotice(null);
    try {
      const res = await fetch('/api/finance/bank/seed', { method: 'POST' });
      const json = await res.json();
      if (json.success) {
        setSeedNotice(`✓ Standard Ethiopian Banks (CBE, Coop, Awash, Dashen, Abyssinia, Telebirr) configured and linked to Chart of Accounts!`);
        if (refetch) refetch();
        else window.location.reload();
      } else {
        alert(json.error || 'Failed to seed banks');
      }
    } catch (err: any) {
      alert('Error: ' + err.message);
    } finally {
      setIsSeeding(false);
    }
  };

  const columns: ColumnDef<BankAccount>[] = [
    { header: 'Bank Name', accessor: 'bankName', sortable: true },
    { header: 'Account No', accessor: 'accountNo' },
    { header: 'Account Name', accessor: 'accountName', sortable: true },
    { header: 'Currency', accessor: 'currency' },
    {
      header: 'Current Balance',
      accessor: 'balance',
      render: (val) => (
        <span className="font-bold text-blue-700 font-mono">
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
      render: (id, row) => {
        const cleanNo = row.accountNo ? row.accountNo.replace(/[^a-zA-Z0-9]/g, '').slice(-8) : '';
        const acctCode = cleanNo ? `1020-${cleanNo}` : '';
        return (
          <div className="flex flex-wrap gap-1.5 items-center">
            <Link href={`/dashboard/finance/bank/${id}`}>
              <Button size="sm" variant="outline">View</Button>
            </Link>
            <Link href={`/dashboard/finance/general-ledger?search=${encodeURIComponent(acctCode || row.bankName)}`}>
              <Button size="sm" variant="outline" title="View general ledger for this bank account">📖 Ledger</Button>
            </Link>
            <Link href={`/dashboard/finance/bank/transactions/new?bankAccountId=${id}`}>
              <Button size="sm" variant="secondary">+ Transact</Button>
            </Link>
          </div>
        );
      },
    },
  ];

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex flex-wrap gap-3 items-center justify-between">
        <div>
          <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900">Bank Accounts</h1>
          <p className="text-gray-600 text-xs sm:text-sm mt-0.5">
            Manage commercial bank accounts, opening balances, and subledger transactions linked to Chart of Accounts
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href="/dashboard/finance/accounts">
            <Button variant="outline" size="sm">📊 Chart of Accounts</Button>
          </Link>
          <Link href="/dashboard/finance/general-ledger">
            <Button variant="outline" size="sm">📖 General Ledger</Button>
          </Link>
          <Link href="/dashboard/finance/bank/transactions">
            <Button variant="secondary" size="sm">📋 All Transactions</Button>
          </Link>
          <Button
            variant="outline"
            size="sm"
            onClick={handleSeedBanks}
            isLoading={isSeeding}
          >
            🇪🇹 Seed Standard Banks
          </Button>
          <Link href="/dashboard/finance/bank/new">
            <Button variant="primary" size="sm">+ Add Bank Account</Button>
          </Link>
        </div>
      </div>

      {seedNotice && (
        <div className="p-3.5 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-xl text-xs sm:text-sm flex justify-between items-center">
          <span>{seedNotice}</span>
          <button onClick={() => setSeedNotice(null)} className="font-bold text-xs text-emerald-900">✕</button>
        </div>
      )}

      <Card>
        <CardBody>
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="w-full sm:w-80">
              <Input
                placeholder="Search by bank name or account..."
                value={searchTerm}
                onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
              />
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
                <option value="25">25 per page</option>
                <option value="50">50 per page</option>
                <option value="100">100 per page</option>
                <option value="500">500 per page</option>
                <option value="10000">Show All</option>
              </select>
            </div>
          </div>
          <div className="mt-4 text-sm text-gray-600 font-medium">
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
            pageSize={pageSize >= 10000 ? data.length : pageSize}
            totalPages={pageSize >= 10000 ? 1 : pagination.pages}
            currentPage={pageSize >= 10000 ? 1 : currentPage}
            onPageChange={pageSize >= 10000 ? undefined : setCurrentPage}
            emptyMessage={loading ? 'Loading...' : 'No bank accounts found'}
          />
        </CardBody>
      </Card>
    </div>
  );
}
