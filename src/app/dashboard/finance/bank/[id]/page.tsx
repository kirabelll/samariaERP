'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { Card, CardHeader, CardBody, Button, Badge, Table, Input } from '@/components/ui';
import type { ColumnDef } from '@/components/ui';

interface BankTransaction {
  id: string;
  type: string;
  amount: number;
  refNo: string | null;
  description: string | null;
  refModule: string | null;
  reconStatus: string;
  transDate: string;
  createdBy: string | null;
  bankAccount?: {
    id: string;
    bankName: string;
    accountNo: string;
    accountName: string;
  };
}

export default function BankAccountDetailPage() {
  const router = useRouter();
  const params = useParams();
  const recordId = params?.id as string;

  // Account data
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Transactions
  const [transactions, setTransactions] = useState<BankTransaction[]>([]);
  const [txnLoading, setTxnLoading] = useState(false);
  const [txnError, setTxnError] = useState<string | null>(null);
  const [txnPage, setTxnPage] = useState(1);
  const [txnTotal, setTxnTotal] = useState(0);
  const [txnPages, setTxnPages] = useState(1);
  const [txnSearch, setTxnSearch] = useState('');
  const [txnTypeFilter, setTxnTypeFilter] = useState('');
  const txnLimit = 15;

  // Recalculate state
  const [recalculating, setRecalculating] = useState(false);
  const [recalcResult, setRecalcResult] = useState<any>(null);
  const [deletingTxnId, setDeletingTxnId] = useState<string | null>(null);

  // Fetch account details
  const fetchAccount = async () => {
    try {
      const response = await fetch(`/api/finance/bank/${recordId}`);
      const result = await response.json();
      if (response.ok && result.success) {
        setData(result.data);
      }
    } catch (err) {
      console.error('Failed to refresh account data:', err);
    }
  };

  // Fetch transactions
  const fetchTransactions = async () => {
    try {
      setTxnLoading(true);
      const params = new URLSearchParams({
        bankAccountId: recordId,
        page: String(txnPage),
        limit: String(txnLimit),
      });
      if (txnSearch) params.set('search', txnSearch);
      if (txnTypeFilter) params.set('type', txnTypeFilter);

      const response = await fetch(`/api/finance/bank/transactions?${params}`);
      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Failed to fetch transactions');
      }

      setTransactions(result.data || []);
      setTxnTotal(result.pagination?.total || 0);
      setTxnPages(result.pagination?.pages || 1);
    } catch (err) {
      setTxnError(err instanceof Error ? err.message : 'Failed to load transactions');
    } finally {
      setTxnLoading(false);
    }
  };

  useEffect(() => {
    if (recordId) {
      setLoading(true);
      fetchAccount().finally(() => setLoading(false));
    }
  }, [recordId]);

  useEffect(() => {
    if (recordId) {
      fetchTransactions();
    }
  }, [recordId, txnPage, txnSearch, txnTypeFilter]);

  const handleEdit = () => {
    router.push(`/dashboard/finance/bank/${recordId}/edit`);
  };

  const handleBack = () => {
    router.push(`/dashboard/finance/bank`);
  };



  const handleRecalculate = async () => {
    if (!confirm('Recalculate this account\'s balance from all transactions? This will correct any drift between the stored balance and actual transaction history.')) return;
    setRecalculating(true);
    setRecalcResult(null);
    try {
      const response = await fetch(`/api/finance/bank/${recordId}`, { method: 'PATCH' });
      const result = await response.json();
      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Failed to recalculate');
      }
      setData(result.data);
      setRecalcResult(result.reconciliation);
    } catch (err) {
      alert('Error: ' + (err instanceof Error ? err.message : 'Unknown error'));
    } finally {
      setRecalculating(false);
    }
  };

  const handleDeleteTransaction = async (txn: BankTransaction) => {
    const amountStr = Number(txn.amount).toLocaleString('en-US', { minimumFractionDigits: 2 });
    const confirmMsg = `Are you sure you want to DELETE this transaction?\n\nDate: ${new Date(txn.transDate).toLocaleDateString()}\nType: ${txn.type.toUpperCase()}\nAmount: ETB ${amountStr}\nRef: ${txn.refNo || 'N/A'}\nDescription: ${txn.description || 'N/A'}\n\nThis will permanently delete the transaction record and adjust the bank account balance accordingly.`;

    if (!confirm(confirmMsg)) return;

    setDeletingTxnId(txn.id);
    try {
      const response = await fetch(`/api/finance/bank/transactions/${txn.id}`, {
        method: 'DELETE',
      });
      const result = await response.json();
      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Failed to delete transaction');
      }
      alert('Transaction deleted successfully.');
      fetchAccount();
      fetchTransactions();
    } catch (err) {
      alert('Error: ' + (err instanceof Error ? err.message : 'Failed to delete transaction'));
    } finally {
      setDeletingTxnId(null);
    }
  };

  // Running balance calculation
  const calculateRunningBalance = () => {
    let balance = Number(data?.balance || 0);
    // Transactions are newest first; we show running balance from current backward
    return transactions.map((txn) => {
      const current = balance;
      if (txn.type === 'deposit') {
        balance -= Number(txn.amount);
      } else {
        balance += Number(txn.amount);
      }
      return current;
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="text-slate-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="space-y-6">
        <button
          onClick={handleBack}
          className="text-blue-600 hover:text-blue-800 font-medium"
        >
          ← Back
        </button>
        <Card>
          <CardBody>
            <p className="text-red-600">{error || 'Record not found'}</p>
          </CardBody>
        </Card>
      </div>
    );
  }

  const runningBalances = calculateRunningBalance();

  const txnColumns: ColumnDef<BankTransaction>[] = [
    {
      header: 'Date',
      accessor: 'transDate',
      render: (val) => {
        const d = new Date(val as string);
        return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
      },
    },
    {
      header: 'Type',
      accessor: 'type',
      render: (val) => {
        const type = val as string;
        const colors: Record<string, string> = {
          deposit: 'bg-green-100 text-green-800',
          withdrawal: 'bg-red-100 text-red-800',
          transfer: 'bg-blue-100 text-blue-800',
        };
        return (
          <span className={`px-2 py-1 rounded-full text-xs font-semibold ${colors[type] || 'bg-gray-100 text-gray-800'}`}>
            {type.charAt(0).toUpperCase() + type.slice(1)}
          </span>
        );
      },
    },
    {
      header: 'Reference',
      accessor: 'refNo',
      render: (val) => val || '—',
    },
    {
      header: 'Description',
      accessor: 'description',
      render: (val) => {
        const desc = val as string || '—';
        return <span className="max-w-xs truncate block" title={desc}>{desc}</span>;
      },
    },
    {
      header: 'Module',
      accessor: 'refModule',
      render: (val) => {
        if (!val) return '—';
        const mod = val as string;
        return (
          <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 text-xs font-medium">
            {mod.replace(/_/g, ' ')}
          </span>
        );
      },
    },
    {
      header: 'Debit (Out)',
      accessor: 'amount',
      render: (val, row) => {
        const txn = row as BankTransaction;
        if (txn.type === 'withdrawal') {
          return <span className="text-red-600 font-semibold">{Number(val).toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>;
        }
        return '';
      },
    },
    {
      header: 'Credit (In)',
      accessor: 'id',
      render: (_val, row) => {
        const txn = row as BankTransaction;
        if (txn.type === 'deposit') {
          return <span className="text-green-600 font-semibold">{Number(txn.amount).toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>;
        }
        return '';
      },
    },
    {
      header: 'Status',
      accessor: 'reconStatus',
      render: (val) => <Badge status={val as any}>{val as string}</Badge>,
    },
    {
      header: 'Action',
      accessor: 'id',
      render: (_val, row) => {
        const txn = row as BankTransaction;
        return (
          <button
            onClick={() => handleDeleteTransaction(txn)}
            disabled={deletingTxnId === txn.id}
            className="text-xs font-semibold text-red-700 hover:text-red-900 bg-red-50 hover:bg-red-100 border border-red-200 px-2.5 py-1 rounded-lg transition-colors disabled:opacity-50"
          >
            {deletingTxnId === txn.id ? 'Deleting...' : 'Delete'}
          </button>
        );
      },
    },
  ];

  // Totals
  const totalDebit = transactions.filter(t => t.type === 'withdrawal').reduce((s, t) => s + Number(t.amount), 0);
  const totalCredit = transactions.filter(t => t.type === 'deposit').reduce((s, t) => s + Number(t.amount), 0);

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-slate-600">
        <button
          onClick={handleBack}
          className="text-blue-600 hover:text-blue-800 font-medium"
        >
          Bank Accounts
        </button>
        <span>/</span>
        <span className="text-slate-900 font-medium">{data.bankName} — {data.accountNo}</span>
      </div>

      {/* Account Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardBody className="text-center">
            <p className="text-xs font-semibold text-slate-500 uppercase">Bank</p>
            <p className="text-lg font-bold text-slate-900 mt-1">{data.bankName}</p>
          </CardBody>
        </Card>
        <Card>
          <CardBody className="text-center">
            <p className="text-xs font-semibold text-slate-500 uppercase">Account Number</p>
            <p className="text-lg font-bold text-slate-900 mt-1">{data.accountNo}</p>
          </CardBody>
        </Card>
        <Card>
          <CardBody className="text-center">
            <p className="text-xs font-semibold text-slate-500 uppercase">Account Name</p>
            <p className="text-lg font-bold text-slate-900 mt-1">{data.accountName}</p>
          </CardBody>
        </Card>
        <Card>
          <CardBody className="text-center">
            <p className="text-xs font-semibold text-slate-500 uppercase">Current Balance</p>
            <p className="text-2xl font-bold text-blue-700 mt-1">
              ETB {Number(data.balance).toLocaleString('en-US', { minimumFractionDigits: 2 })}
            </p>
            <Badge status={data.status as any}>{data.status}</Badge>
          </CardBody>
        </Card>
      </div>

      {/* Additional Details */}
      <Card>
        <CardHeader className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-slate-900">Account Details</h2>
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleRecalculate}
              disabled={recalculating}
            >
              {recalculating ? 'Recalculating...' : 'Recalculate Balance'}
            </Button>
            <Link href={`/dashboard/finance/bank/transactions/new?bankAccountId=${recordId}`}>
              <Button variant="primary" size="sm">+ New Transaction</Button>
            </Link>
            <Button variant="outline" size="sm" onClick={handleEdit}>
              Edit
            </Button>
          </div>
        </CardHeader>
        <CardBody>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase">Branch</p>
              <p className="text-sm font-medium text-slate-900 mt-1">{data.branch || 'N/A'}</p>
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase">Currency</p>
              <p className="text-sm font-medium text-slate-900 mt-1">{data.currency || 'ETB'}</p>
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase">Status</p>
              <p className="mt-1"><Badge status={data.status as any}>{data.status}</Badge></p>
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase">Created</p>
              <p className="text-sm font-medium text-slate-900 mt-1">
                {data.createdAt ? new Date(data.createdAt).toLocaleDateString('en-GB') : 'N/A'}
              </p>
            </div>
          </div>
          {/* Recalculation Result */}
          {recalcResult && (
            <div className={`mt-4 p-4 rounded-lg border ${recalcResult.corrected ? 'bg-amber-50 border-amber-300' : 'bg-green-50 border-green-300'}`}>
              <h4 className={`font-semibold text-sm ${recalcResult.corrected ? 'text-amber-900' : 'text-green-900'}`}>
                {recalcResult.corrected ? 'Balance Corrected' : 'Balance is Accurate'}
              </h4>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mt-2 text-sm">
                <div>
                  <span className="text-slate-500">Initial Balance:</span>
                  <p className="font-semibold text-slate-900">ETB {Number(recalcResult.initialBalance || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}</p>
                </div>
                <div>
                  <span className="text-slate-500">Total Deposits:</span>
                  <p className="font-semibold text-green-700">ETB {Number(recalcResult.totalDeposits).toLocaleString('en-US', { minimumFractionDigits: 2 })}</p>
                  <span className="text-xs text-slate-400">{recalcResult.depositCount} transactions</span>
                </div>
                <div>
                  <span className="text-slate-500">Total Withdrawals:</span>
                  <p className="font-semibold text-red-700">ETB {Number(recalcResult.totalWithdrawals).toLocaleString('en-US', { minimumFractionDigits: 2 })}</p>
                  <span className="text-xs text-slate-400">{recalcResult.withdrawalCount} transactions</span>
                </div>
                <div>
                  <span className="text-slate-500">Calculated Balance:</span>
                  <p className="font-semibold text-blue-700">ETB {Number(recalcResult.calculatedBalance).toLocaleString('en-US', { minimumFractionDigits: 2 })}</p>
                </div>
                {recalcResult.corrected && (
                  <div>
                    <span className="text-slate-500">Previous Balance:</span>
                    <p className="font-semibold text-slate-700">ETB {Number(recalcResult.previousBalance).toLocaleString('en-US', { minimumFractionDigits: 2 })}</p>
                    <span className="text-xs text-amber-600 font-medium">Difference: ETB {Number(recalcResult.difference).toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
                  </div>
                )}
              </div>
            </div>
          )}
        </CardBody>
      </Card>

      {/* Transactions Section */}
      <Card>
        <CardHeader>
          <h2 className="text-lg font-bold text-slate-900">Transaction History</h2>
        </CardHeader>
        <CardBody>
          {/* Filters */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <Input
              placeholder="Search by reference or description..."
              value={txnSearch}
              onChange={(e) => { setTxnSearch(e.target.value); setTxnPage(1); }}
            />
            <select
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              value={txnTypeFilter}
              onChange={(e) => { setTxnTypeFilter(e.target.value); setTxnPage(1); }}
            >
              <option value="">All Types</option>
              <option value="deposit">Deposit (Credit)</option>
              <option value="withdrawal">Withdrawal (Debit)</option>
            </select>
            <div className="text-sm text-gray-600 flex items-center">
              {txnLoading ? 'Loading...' : `Showing ${transactions.length} of ${txnTotal} transactions`}
            </div>
          </div>

          {/* Summary row */}
          {transactions.length > 0 && (
            <div className="flex flex-wrap gap-6 mb-4 p-3 bg-slate-50 rounded-lg text-sm">
              <div>
                <span className="text-slate-500">Total Debit (Out): </span>
                <span className="font-semibold text-red-600">ETB {totalDebit.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
              </div>
              <div>
                <span className="text-slate-500">Total Credit (In): </span>
                <span className="font-semibold text-green-600">ETB {totalCredit.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
              </div>
              <div>
                <span className="text-slate-500">Net (this page): </span>
                <span className={`font-semibold ${totalCredit - totalDebit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  ETB {(totalCredit - totalDebit).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                </span>
              </div>
            </div>
          )}

          {txnError && <div className="text-red-600 mb-4">Error: {txnError}</div>}

          <Table<BankTransaction>
            data={transactions}
            columns={txnColumns}
            pageSize={txnLimit}
            totalPages={txnPages}
            currentPage={txnPage}
            onPageChange={setTxnPage}
            emptyMessage={txnLoading ? 'Loading transactions...' : 'No transactions found for this account'}
          />
        </CardBody>
      </Card>
    </div>
  );
}
