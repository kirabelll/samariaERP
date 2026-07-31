'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Card, CardHeader, CardBody, Table, Badge, Button } from '@/components/ui';
import type { ColumnDef } from '@/components/ui';

interface JournalRecord {
  id: string;
  voucherNo: string;
  date: string;
  description: string;
  account: string;
  debit: number;
  credit: number;
  refModule?: string;
  refId?: string;
}

interface AccountBalance {
  id: string;
  code: string;
  name: string;
  type: string;
  balance: number;
}

interface VoucherRecord {
  id: string;
  voucherNo: string;
  date: string;
  type: string;
  payeeName: string;
  amount: number;
  paymentMethod: string;
  status: string;
  sourceModule: string;
  sourceRef: string;
}

interface VoucherSummary {
  totalVouchers: number;
  totalAmount: number;
  byType: { type: string; count: number; amount: number }[];
  byStatus: { status: string; count: number; amount: number }[];
}

export default function FinancialReportsPage() {
  const [entries, setEntries] = useState<JournalRecord[]>([]);
  const [balances, setBalances] = useState<AccountBalance[]>([]);
  const [vouchers, setVouchers] = useState<VoucherRecord[]>([]);
  const [voucherSummary, setVoucherSummary] = useState<VoucherSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'balances' | 'journal' | 'vouchers'>('balances');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [voucherType, setVoucherType] = useState('');
  const [voucherStatus, setVoucherStatus] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const pageSize = 20;

  // Drill-down state
  const [selectedAccount, setSelectedAccount] = useState<AccountBalance | null>(null);
  const [accountEntries, setAccountEntries] = useState<JournalRecord[]>([]);
  const [accountEntriesLoading, setAccountEntriesLoading] = useState(false);
  const [accountEntriesPage, setAccountEntriesPage] = useState(1);
  const [accountEntriesTotalPages, setAccountEntriesTotalPages] = useState(0);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        if (activeTab === 'vouchers') {
          const params = new URLSearchParams({ type: 'voucher', page: String(currentPage), limit: String(pageSize) });
          if (startDate) params.set('startDate', startDate);
          if (endDate) params.set('endDate', endDate);
          if (voucherType) params.set('voucherType', voucherType);
          if (voucherStatus) params.set('voucherStatus', voucherStatus);
          const res = await fetch(`/api/reports?${params}`);
          const json = await res.json();
          if (json.success) {
            setVouchers(json.data.records || []);
            setVoucherSummary(json.data.summary || null);
            setTotalPages(json.data.pagination?.pages || 0);
          }
        } else {
          const params = new URLSearchParams({ type: 'financial', page: String(currentPage), limit: String(pageSize) });
          if (startDate) params.set('startDate', startDate);
          if (endDate) params.set('endDate', endDate);
          const res = await fetch(`/api/reports?${params}`);
          const json = await res.json();
          if (json.success) {
            setEntries(json.data.records || []);
            setBalances(json.data.accountBalances || []);
            setTotalPages(json.data.pagination?.pages || 0);
          }
        }
      } catch (err) { console.error(err); }
      setLoading(false);
    };
    fetchData();
  }, [currentPage, startDate, endDate, activeTab, voucherType, voucherStatus]);

  // Fetch journal entries for selected account
  useEffect(() => {
    if (!selectedAccount) {
      setAccountEntries([]);
      return;
    }
    const fetchAccountEntries = async () => {
      setAccountEntriesLoading(true);
      try {
        const params = new URLSearchParams({
          type: 'journal',
          accountId: selectedAccount.id,
          page: String(accountEntriesPage),
          limit: '10',
        });
        const res = await fetch(`/api/reports?${params}`);
        const json = await res.json();
        if (json.success) {
          setAccountEntries(json.data.records || []);
          setAccountEntriesTotalPages(json.data.pagination?.pages || 0);
        }
      } catch (err) { console.error(err); }
      setAccountEntriesLoading(false);
    };
    fetchAccountEntries();
  }, [selectedAccount, accountEntriesPage]);

  const formatCurrency = (val: number) => `ETB ${Number(val).toLocaleString('en-US', { minimumFractionDigits: 2 })}`;

  const handleAccountClick = (row: AccountBalance) => {
    if (selectedAccount?.id === row.id) {
      setSelectedAccount(null);
    } else {
      setSelectedAccount(row);
      setAccountEntriesPage(1);
    }
  };

  const journalColumns: ColumnDef<JournalRecord>[] = [
    { header: 'Voucher No', accessor: 'voucherNo', sortable: true },
    { header: 'Date', accessor: 'date', render: (val) => val ? new Date(val).toLocaleDateString() : '-' },
    { header: 'Description', accessor: 'description' },
    { header: 'Account', accessor: 'account' },
    { header: 'Debit (ETB)', accessor: 'debit', render: (val) => Number(val).toLocaleString('en-US') },
    { header: 'Credit (ETB)', accessor: 'credit', render: (val) => Number(val).toLocaleString('en-US') },
  ];

  const balanceColumns: ColumnDef<AccountBalance>[] = [
    { header: 'Code', accessor: 'code', sortable: true },
    { header: 'Account Name', accessor: 'name', sortable: true },
    { header: 'Type', accessor: 'type' },
    {
      header: 'Balance (ETB)', accessor: 'balance',
      render: (val) => (
        <span className={Number(val) < 0 ? 'text-red-600' : ''}>
          {Number(val).toLocaleString('en-US')}
        </span>
      ),
    },
  ];

  const accountEntryColumns: ColumnDef<JournalRecord>[] = [
    { header: 'Voucher No', accessor: 'voucherNo', sortable: true },
    { header: 'Date', accessor: 'date', render: (val) => val ? new Date(val).toLocaleDateString() : '-' },
    { header: 'Description', accessor: 'description' },
    { header: 'Debit (ETB)', accessor: 'debit', render: (val) => Number(val) > 0 ? Number(val).toLocaleString('en-US') : '-' },
    { header: 'Credit (ETB)', accessor: 'credit', render: (val) => Number(val) > 0 ? Number(val).toLocaleString('en-US') : '-' },
    { header: 'Ref Module', accessor: 'refModule' as any },
  ];

  const voucherColumns: ColumnDef<VoucherRecord>[] = [
    {
      header: 'Voucher No', accessor: 'voucherNo', sortable: true,
      render: (val, row) => (
        <Link href={`/dashboard/finance/vouchers/${row.id}`} className="text-blue-600 hover:underline font-medium">
          {val}
        </Link>
      ),
    },
    { header: 'Date', accessor: 'date', render: (val) => val ? new Date(val).toLocaleDateString() : '-' },
    {
      header: 'Type', accessor: 'type',
      render: (val) => (
        <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
          val === 'PAYMENT' ? 'bg-red-100 text-red-800' :
          val === 'RECEIPT' ? 'bg-green-100 text-green-800' :
          'bg-amber-100 text-amber-800'
        }`}>{val}</span>
      ),
    },
    { header: 'Payee', accessor: 'payeeName' },
    { header: 'Amount (ETB)', accessor: 'amount', render: (val) => formatCurrency(Number(val)) },
    { header: 'Method', accessor: 'paymentMethod', render: (val) => String(val).replace('_', ' ') },
    {
      header: 'Status', accessor: 'status',
      render: (val) => {
        const badgeStatus = val === 'Posted' || val === 'Approved' ? 'Active' : val === 'Rejected' || val === 'Cancelled' ? 'Rejected' : 'Draft';
        return <Badge status={badgeStatus as any}>{String(val).replace('_', ' ')}</Badge>;
      },
    },
    { header: 'Source', accessor: 'sourceModule' },
  ];

  return (
    <div className="space-y-4 sm:space-y-6">
      <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900">Financial Reports</h1>

      {/* Tabs */}
      <div className="flex flex-wrap gap-2">
        {(['balances', 'journal', 'vouchers'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => { setActiveTab(tab); setCurrentPage(1); setSelectedAccount(null); }}
            className={`px-4 py-2 rounded-lg font-medium ${activeTab === tab ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
          >
            {tab === 'balances' ? 'Account Balances' : tab === 'journal' ? 'Journal Entries' : 'Voucher Register'}
          </button>
        ))}
      </div>

      {/* Filters */}
      {(activeTab === 'journal' || activeTab === 'vouchers') && (
        <Card>
          <CardHeader><h2 className="text-lg font-semibold">Filters</h2></CardHeader>
          <CardBody>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
                <input type="date" value={startDate} onChange={(e) => { setStartDate(e.target.value); setCurrentPage(1); }}
                  className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
                <input type="date" value={endDate} onChange={(e) => { setEndDate(e.target.value); setCurrentPage(1); }}
                  className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500" />
              </div>
              {activeTab === 'vouchers' && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Voucher Type</label>
                    <select value={voucherType} onChange={(e) => { setVoucherType(e.target.value); setCurrentPage(1); }}
                      className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500">
                      <option value="">All Types</option>
                      <option value="PAYMENT">Payment</option>
                      <option value="RECEIPT">Receipt</option>
                      <option value="REFUND">Refund</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                    <select value={voucherStatus} onChange={(e) => { setVoucherStatus(e.target.value); setCurrentPage(1); }}
                      className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500">
                      <option value="">All Statuses</option>
                      <option value="Draft">Draft</option>
                      <option value="Pending_Approval">Pending Approval</option>
                      <option value="Approved">Approved</option>
                      <option value="Posted">Posted</option>
                      <option value="Rejected">Rejected</option>
                      <option value="Cancelled">Cancelled</option>
                    </select>
                  </div>
                </>
              )}
            </div>
          </CardBody>
        </Card>
      )}

      {/* Voucher Summary Cards */}
      {activeTab === 'vouchers' && voucherSummary && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardBody>
              <p className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-1">Total Vouchers</p>
              <p className="text-2xl font-bold text-[#1D1D1F]">{voucherSummary.totalVouchers}</p>
            </CardBody>
          </Card>
          <Card>
            <CardBody>
              <p className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-1">Total Amount</p>
              <p className="text-2xl font-bold text-[#1D1D1F]">{formatCurrency(voucherSummary.totalAmount)}</p>
            </CardBody>
          </Card>
          {voucherSummary.byType.map((t) => (
            <Card key={t.type}>
              <CardBody>
                <p className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-1">{t.type} ({t.count})</p>
                <p className={`text-2xl font-bold ${t.type === 'PAYMENT' ? 'text-red-600' : t.type === 'RECEIPT' ? 'text-green-600' : 'text-amber-600'}`}>
                  {formatCurrency(t.amount)}
                </p>
              </CardBody>
            </Card>
          ))}
        </div>
      )}

      {/* Data Table */}
      <Card>
        <CardBody>
          {activeTab === 'balances' ? (
            <>
              <p className="text-sm text-gray-500 mb-3">Click on any account to view its journal entries</p>
              <Table<AccountBalance>
                data={balances}
                columns={balanceColumns}
                pageSize={100}
                totalPages={1}
                currentPage={1}
                onPageChange={() => {}}
                onRowClick={handleAccountClick}
                emptyMessage={loading ? 'Loading...' : 'No account balances found'}
              />
            </>
          ) : activeTab === 'journal' ? (
            <Table<JournalRecord>
              data={entries}
              columns={journalColumns}
              pageSize={pageSize}
              totalPages={totalPages}
              currentPage={currentPage}
              onPageChange={setCurrentPage}
              emptyMessage={loading ? 'Loading...' : 'No journal entries found'}
            />
          ) : (
            <Table<VoucherRecord>
              data={vouchers}
              columns={voucherColumns}
              pageSize={pageSize}
              totalPages={totalPages}
              currentPage={currentPage}
              onPageChange={setCurrentPage}
              emptyMessage={loading ? 'Loading...' : 'No vouchers found'}
            />
          )}
        </CardBody>
      </Card>

      {/* Account Drill-Down Panel */}
      {activeTab === 'balances' && selectedAccount && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">
                  Journal Entries for {selectedAccount.code} - {selectedAccount.name}
                </h2>
                <p className="text-sm text-gray-500 mt-1">
                  Account Type: <span className="font-medium">{selectedAccount.type}</span> | Balance: <span className={`font-medium ${selectedAccount.balance < 0 ? 'text-red-600' : 'text-green-600'}`}>{formatCurrency(selectedAccount.balance)}</span>
                </p>
              </div>
              <button
                onClick={() => setSelectedAccount(null)}
                className="text-gray-400 hover:text-gray-600 text-xl leading-none px-2"
                title="Close"
              >
                x
              </button>
            </div>
          </CardHeader>
          <CardBody>
            <Table<JournalRecord>
              data={accountEntries}
              columns={accountEntryColumns}
              pageSize={10}
              totalPages={accountEntriesTotalPages}
              currentPage={accountEntriesPage}
              onPageChange={setAccountEntriesPage}
              isLoading={accountEntriesLoading}
              emptyMessage={accountEntriesLoading ? 'Loading journal entries...' : 'No journal entries found for this account'}
            />
          </CardBody>
        </Card>
      )}
    </div>
  );
}
