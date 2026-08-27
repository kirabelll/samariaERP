'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import {
  CheckSquare,
  RefreshCw,
  Building2,
  Calendar,
  DollarSign,
  ArrowUpRight,
  ArrowDownLeft,
  CheckCircle2,
  AlertTriangle,
  Search,
  Filter,
  Save,
  Clock,
  History,
  FileSpreadsheet,
  Check,
  X,
  ExternalLink,
  ChevronRight,
} from 'lucide-react';
import { Card, CardBody, CardHeader, Button, Badge } from '@/components/ui';

interface BankAccount {
  id: string;
  bankName: string;
  accountNo: string;
  accountName: string;
  balance: number;
}

interface ReconTransaction {
  id: string;
  source: 'VOUCHER' | 'BANK_TXN';
  date: string;
  refNo: string;
  description: string;
  party: string;
  type: 'DEPOSIT' | 'WITHDRAWAL';
  status: string;
  bookAmount: number;
  bankAmount: number;
  isReconciled: boolean;
  reconStatus: string;
}

interface ReconciliationSummary {
  openingBalance: number;
  totalDeposits: number;
  totalWithdrawals: number;
  closingBookBalance: number;
  bookBalanceAsOfDate: number;
  clearedDeposits: number;
  unclearedDeposits: number;
  clearedWithdrawals: number;
  unclearedWithdrawals: number;
  bankStatement: number;
  adjustedBookBalance: number;
  difference: number;
  adjustedDifference: number;
  isBalanced: boolean;
}

interface PastReconciliation {
  id: string;
  bankAccountId: string;
  periodFrom: string;
  periodTo: string;
  openingBalance: number;
  closingBalance: number;
  bankStatement: number;
  difference: number;
  status: string;
  createdAt: string;
  bankAccount?: BankAccount;
  items?: Array<{
    id: string;
    description: string;
    bookAmount: number;
    bankAmount: number;
    status: string;
    transactionId: string | null;
  }>;
}

export default function ReconciliationPage() {
  const [activeTab, setActiveTab] = useState<'workspace' | 'history'>('workspace');
  const [selectedAccountId, setSelectedAccountId] = useState('');
  const [accounts, setAccounts] = useState<BankAccount[]>([]);
  const [loadingAccounts, setLoadingAccounts] = useState(true);

  // Period & Statement Filters
  const [periodFrom, setPeriodFrom] = useState(
    new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0]
  );
  const [periodTo, setPeriodTo] = useState(
    new Date().toISOString().split('T')[0]
  );
  const [bankStatementInput, setBankStatementInput] = useState('');

  // Transactions & Summary State
  const [loadingTxns, setLoadingTxns] = useState(false);
  const [transactions, setTransactions] = useState<ReconTransaction[]>([]);
  const [serverSummary, setServerSummary] = useState<ReconciliationSummary | null>(null);
  const [clearedSet, setClearedSet] = useState<Set<string>>(new Set());

  // Past Reconciliations State
  const [pastRecons, setPastRecons] = useState<PastReconciliation[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [savingRecon, setSavingRecon] = useState(false);
  const [saveSuccessMsg, setSaveSuccessMsg] = useState<string | null>(null);

  // Filter & Search states
  const [filterType, setFilterType] = useState<'ALL' | 'UNRECONCILED' | 'RECONCILED' | 'DEPOSITS' | 'WITHDRAWALS'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // 1. Fetch bank accounts on mount
  useEffect(() => {
    async function loadBankAccounts() {
      try {
        setLoadingAccounts(true);
        const res = await fetch('/api/finance/bank?limit=100');
        const json = await res.json();
        const list = json.data || [];
        setAccounts(list);
        if (list.length > 0) {
          setSelectedAccountId(list[0].id);
        }
      } catch (err) {
        console.error('Failed to load bank accounts:', err);
      } finally {
        setLoadingAccounts(false);
      }
    }
    loadBankAccounts();
  }, []);

  // 2. Fetch live transactions and summary whenever account, dates or statement change
  const fetchTransactions = async () => {
    if (!selectedAccountId) return;
    setLoadingTxns(true);
    setSaveSuccessMsg(null);
    try {
      const params = new URLSearchParams({
        bankAccountId: selectedAccountId,
        periodFrom,
        periodTo,
        bankStatement: bankStatementInput || '0',
      });

      const res = await fetch(`/api/finance/reconciliation/transactions?${params.toString()}`);
      const json = await res.json();

      if (json.success && Array.isArray(json.transactions)) {
        setTransactions(json.transactions);
        setServerSummary(json.summary);

        // Initialize cleared set with transactions that are marked reconciled
        const initialCleared = new Set<string>();
        json.transactions.forEach((tx: ReconTransaction) => {
          if (tx.isReconciled) initialCleared.add(tx.id);
        });
        setClearedSet(initialCleared);

        // Auto-set statement input placeholder to closing book balance if user hasn't typed one
        if (!bankStatementInput && json.summary?.closingBookBalance) {
          // keep statement input as entered or blank for manual input
        }
      } else {
        setTransactions([]);
        setServerSummary(null);
      }
    } catch (err) {
      console.error('Failed to load reconciliation transactions:', err);
    } finally {
      setLoadingTxns(false);
    }
  };

  useEffect(() => {
    if (selectedAccountId) {
      fetchTransactions();
      if (activeTab === 'history') {
        fetchHistory();
      }
    }
  }, [selectedAccountId, periodFrom, periodTo]);

  // Fetch past reconciliation history
  const fetchHistory = async () => {
    if (!selectedAccountId) return;
    setLoadingHistory(true);
    try {
      const res = await fetch(`/api/finance/reconciliation?bankAccountId=${selectedAccountId}&limit=50`);
      const json = await res.json();
      if (json.success) {
        setPastRecons(json.data || []);
      }
    } catch (err) {
      console.error('Failed to load history:', err);
    } finally {
      setLoadingHistory(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'history' && selectedAccountId) {
      fetchHistory();
    }
  }, [activeTab, selectedAccountId]);

  const selectedAccount = accounts.find((a) => a.id === selectedAccountId);

  // Toggle single transaction clearance
  const toggleClearance = (txId: string) => {
    setClearedSet((prev) => {
      const next = new Set(prev);
      if (next.has(txId)) next.delete(txId);
      else next.add(txId);
      return next;
    });
  };

  // Bulk actions
  const clearAllFiltered = () => {
    setClearedSet((prev) => {
      const next = new Set(prev);
      filteredTransactions.forEach((tx) => next.add(tx.id));
      return next;
    });
  };

  const unmatchAllFiltered = () => {
    setClearedSet((prev) => {
      const next = new Set(prev);
      filteredTransactions.forEach((tx) => next.delete(tx.id));
      return next;
    });
  };

  // Quick Date Presets
  const setDatePreset = (preset: 'TODAY' | 'THIS_MONTH' | 'LAST_MONTH' | 'THIS_YEAR' | 'ALL_TIME') => {
    const now = new Date();
    if (preset === 'TODAY') {
      const t = now.toISOString().split('T')[0];
      setPeriodFrom(t);
      setPeriodTo(t);
    } else if (preset === 'THIS_MONTH') {
      const f = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
      const t = now.toISOString().split('T')[0];
      setPeriodFrom(f);
      setPeriodTo(t);
    } else if (preset === 'LAST_MONTH') {
      const f = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString().split('T')[0];
      const t = new Date(now.getFullYear(), now.getMonth(), 0).toISOString().split('T')[0];
      setPeriodFrom(f);
      setPeriodTo(t);
    } else if (preset === 'THIS_YEAR') {
      const f = new Date(now.getFullYear(), 0, 1).toISOString().split('T')[0];
      const t = now.toISOString().split('T')[0];
      setPeriodFrom(f);
      setPeriodTo(t);
    } else if (preset === 'ALL_TIME') {
      setPeriodFrom('2020-01-01');
      setPeriodTo(now.toISOString().split('T')[0]);
    }
  };

  // Dynamic Live Summary Calculations based on user's current interactive clearance state
  const liveSummary = useMemo(() => {
    const bankStatementVal = parseFloat(bankStatementInput) || 0;
    const closingBookBalance = selectedAccount ? Number(selectedAccount.balance || 0) : (serverSummary?.closingBookBalance || 0);

    let totalDeposits = 0;
    let totalWithdrawals = 0;
    let clearedDeposits = 0;
    let unclearedDeposits = 0;
    let clearedWithdrawals = 0;
    let unclearedWithdrawals = 0;

    transactions.forEach((tx) => {
      const isCleared = clearedSet.has(tx.id);
      if (tx.type === 'DEPOSIT') {
        totalDeposits += tx.bookAmount;
        if (isCleared) clearedDeposits += tx.bookAmount;
        else unclearedDeposits += tx.bookAmount;
      } else {
        totalWithdrawals += tx.bookAmount;
        if (isCleared) clearedWithdrawals += tx.bookAmount;
        else unclearedWithdrawals += tx.bookAmount;
      }
    });

    // Bank Reconciliation Balance Formula:
    // Adjusted Book Balance = Closing Book Balance + Uncleared Deposits - Uncleared Withdrawals
    const adjustedBookBalance = closingBookBalance + unclearedDeposits - unclearedWithdrawals;
    
    // Difference between Book & Statement:
    const bookVsStatementDiff = closingBookBalance - bankStatementVal;
    
    // Adjusted Difference (After accounting for outstanding timing items):
    const adjustedDifference = adjustedBookBalance - bankStatementVal;

    const isBalanced = bankStatementInput !== '' && (Math.abs(bookVsStatementDiff) < 0.01 || Math.abs(adjustedDifference) < 0.01);

    return {
      closingBookBalance,
      totalDeposits,
      totalWithdrawals,
      clearedDeposits,
      unclearedDeposits,
      clearedWithdrawals,
      unclearedWithdrawals,
      bankStatement: bankStatementVal,
      adjustedBookBalance,
      bookVsStatementDiff,
      adjustedDifference,
      isBalanced,
      clearedCount: clearedSet.size,
      totalCount: transactions.length,
      unclearedCount: transactions.length - clearedSet.size,
    };
  }, [transactions, clearedSet, bankStatementInput, selectedAccount, serverSummary]);

  // Filtered Transactions
  const filteredTransactions = useMemo(() => {
    return transactions.filter((tx) => {
      const isCleared = clearedSet.has(tx.id);

      // Filter Tab
      if (filterType === 'UNRECONCILED' && isCleared) return false;
      if (filterType === 'RECONCILED' && !isCleared) return false;
      if (filterType === 'DEPOSITS' && tx.type !== 'DEPOSIT') return false;
      if (filterType === 'WITHDRAWALS' && tx.type !== 'WITHDRAWAL') return false;

      // Search Query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesRef = tx.refNo.toLowerCase().includes(q);
        const matchesDesc = tx.description.toLowerCase().includes(q);
        const matchesParty = tx.party.toLowerCase().includes(q);
        const matchesAmt = tx.bookAmount.toString().includes(q);
        if (!matchesRef && !matchesDesc && !matchesParty && !matchesAmt) return false;
      }

      return true;
    });
  }, [transactions, clearedSet, filterType, searchQuery]);

  // Save / Record Reconciliation to Database
  const handleSaveReconciliation = async () => {
    if (!selectedAccountId) return;
    setSavingRecon(true);
    setSaveSuccessMsg(null);
    try {
      const payload = {
        bankAccountId: selectedAccountId,
        periodFrom,
        periodTo,
        openingBalance: liveSummary.closingBookBalance,
        closingBalance: liveSummary.closingBookBalance,
        bankStatement: liveSummary.bankStatement,
        difference: liveSummary.adjustedDifference,
      };

      const res = await fetch('/api/finance/reconciliation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const json = await res.json();
      if (json.success) {
        setSaveSuccessMsg(`Reconciliation record (${json.data?.id || 'Saved'}) created successfully!`);
        fetchHistory();
      } else {
        alert(json.error || 'Failed to save reconciliation');
      }
    } catch (err: any) {
      alert(err.message || 'Error occurred while saving reconciliation');
    } finally {
      setSavingRecon(false);
    }
  };

  const fmt = (num: number) =>
    `ETB ${Number(num || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16">
      {/* Page Title & Navigation Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900 flex items-center gap-2.5">
            <CheckSquare className="w-6 h-6 text-blue-600" />
            Bank Reconciliation
          </h1>
          <p className="text-xs sm:text-sm text-gray-600 mt-1">
            Reconcile your ERP book transactions with your physical bank statement balance and analyze variances.
          </p>
        </div>

        {/* Tab Switcher */}
        <div className="flex items-center bg-gray-100 p-1 rounded-xl gap-1 text-xs">
          <button
            type="button"
            onClick={() => setActiveTab('workspace')}
            className={`px-3.5 py-1.5 rounded-lg font-semibold transition-all flex items-center gap-1.5 ${
              activeTab === 'workspace'
                ? 'bg-white text-blue-600 shadow-xs'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Live Workspace</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('history')}
            className={`px-3.5 py-1.5 rounded-lg font-semibold transition-all flex items-center gap-1.5 ${
              activeTab === 'history'
                ? 'bg-white text-blue-600 shadow-xs'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <History className="w-3.5 h-3.5" />
            <span>Audit History ({pastRecons.length})</span>
          </button>
        </div>
      </div>

      {saveSuccessMsg && (
        <div className="p-4 rounded-xl bg-green-50 border border-green-200 text-green-800 text-sm flex items-center gap-2 shadow-xs animate-fadeIn">
          <Check className="w-5 h-5 text-green-600 shrink-0" />
          <span>{saveSuccessMsg}</span>
        </div>
      )}

      {/* Account & Period Control Card */}
      <Card className="bg-white border border-gray-200 shadow-xs">
        <CardBody className="p-4 sm:p-6 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Bank Account Selector */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold uppercase tracking-wider text-gray-700">
                Bank Account *
              </label>
              <select
                value={selectedAccountId}
                onChange={(e) => setSelectedAccountId(e.target.value)}
                disabled={loadingAccounts}
                className="w-full h-10 px-3 py-2 text-sm border border-gray-300 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-2xs font-medium"
              >
                {loadingAccounts ? (
                  <option>Loading accounts...</option>
                ) : accounts.length === 0 ? (
                  <option>No bank accounts found</option>
                ) : (
                  accounts.map((acc) => (
                    <option key={acc.id} value={acc.id}>
                      {acc.bankName} — {acc.accountNo} ({acc.accountName})
                    </option>
                  ))
                )}
              </select>
            </div>

            {/* Date Range Selectors */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-700">
                  Statement Period *
                </label>
                <div className="flex items-center gap-1 text-[11px]">
                  <button
                    type="button"
                    onClick={() => setDatePreset('THIS_MONTH')}
                    className="text-blue-600 hover:underline font-medium"
                  >
                    This Month
                  </button>
                  <span className="text-gray-300">|</span>
                  <button
                    type="button"
                    onClick={() => setDatePreset('LAST_MONTH')}
                    className="text-blue-600 hover:underline font-medium"
                  >
                    Last Month
                  </button>
                  <span className="text-gray-300">|</span>
                  <button
                    type="button"
                    onClick={() => setDatePreset('ALL_TIME')}
                    className="text-blue-600 hover:underline font-medium"
                  >
                    All Time
                  </button>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="date"
                  value={periodFrom}
                  onChange={(e) => setPeriodFrom(e.target.value)}
                  className="w-full h-10 px-2.5 py-1.5 text-xs sm:text-sm border border-gray-300 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <input
                  type="date"
                  value={periodTo}
                  onChange={(e) => setPeriodTo(e.target.value)}
                  className="w-full h-10 px-2.5 py-1.5 text-xs sm:text-sm border border-gray-300 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            {/* Bank Statement Ending Balance Input */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold uppercase tracking-wider text-gray-700">
                Bank Statement Ending Balance (ETB) *
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-gray-400">
                  ETB
                </span>
                <input
                  type="number"
                  step="any"
                  placeholder="Enter balance on bank statement"
                  value={bankStatementInput}
                  onChange={(e) => setBankStatementInput(e.target.value)}
                  className="w-full h-10 pl-11 pr-4 py-2 text-sm font-mono font-bold border border-blue-300 rounded-xl bg-blue-50/30 focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-2xs text-blue-900 placeholder:text-gray-400"
                />
              </div>
            </div>
          </div>
        </CardBody>
      </Card>

      {activeTab === 'workspace' ? (
        <>
          {/* Real-time Reconciliation Formula & Variance Banner */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* 1. Book Closing Balance */}
            <Card className="bg-white border border-gray-200 shadow-xs">
              <CardBody className="p-4 space-y-1">
                <div className="flex items-center justify-between text-xs text-gray-500 font-medium uppercase tracking-wider">
                  <span>1. ERP Book Balance</span>
                  <Building2 className="w-4 h-4 text-blue-600" />
                </div>
                <div className="text-xl font-bold font-mono text-gray-900 mt-1">
                  {fmt(liveSummary.closingBookBalance)}
                </div>
                <p className="text-[11px] text-gray-500">
                  Current general ledger balance
                </p>
              </CardBody>
            </Card>

            {/* 2. Timing Items: Uncleared Deposits & Payments */}
            <Card className="bg-white border border-gray-200 shadow-xs">
              <CardBody className="p-4 space-y-1">
                <div className="flex items-center justify-between text-xs text-gray-500 font-medium uppercase tracking-wider">
                  <span>2. Timing Adjustments</span>
                  <Clock className="w-4 h-4 text-amber-500" />
                </div>
                <div className="text-sm font-mono space-y-0.5 mt-1">
                  <div className="flex justify-between text-emerald-700">
                    <span>+ Deposits in Transit:</span>
                    <span className="font-semibold">{fmt(liveSummary.unclearedDeposits)}</span>
                  </div>
                  <div className="flex justify-between text-red-600">
                    <span>- Uncleared Checks:</span>
                    <span className="font-semibold">{fmt(liveSummary.unclearedWithdrawals)}</span>
                  </div>
                </div>
              </CardBody>
            </Card>

            {/* 3. Bank Statement Balance */}
            <Card className="bg-white border border-gray-200 shadow-xs">
              <CardBody className="p-4 space-y-1">
                <div className="flex items-center justify-between text-xs text-gray-500 font-medium uppercase tracking-wider">
                  <span>3. Bank Statement</span>
                  <FileSpreadsheet className="w-4 h-4 text-indigo-600" />
                </div>
                <div className="text-xl font-bold font-mono text-indigo-900 mt-1">
                  {bankStatementInput ? fmt(liveSummary.bankStatement) : 'Not Entered'}
                </div>
                <p className="text-[11px] text-gray-500">
                  Physical bank statement ending balance
                </p>
              </CardBody>
            </Card>

            {/* 4. Discrepancy & Difference */}
            <Card
              className={`border shadow-xs ${
                !bankStatementInput
                  ? 'bg-gray-50 border-gray-200 text-gray-800'
                  : liveSummary.isBalanced
                  ? 'bg-green-50/80 border-green-200 text-green-900'
                  : 'bg-amber-50/80 border-amber-200 text-amber-900'
              }`}
            >
              <CardBody className="p-4 space-y-1">
                <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider">
                  <span>4. Net Difference</span>
                  {liveSummary.isBalanced ? (
                    <CheckCircle2 className="w-4 h-4 text-green-600" />
                  ) : (
                    <AlertTriangle className="w-4 h-4 text-amber-600" />
                  )}
                </div>
                <div className="text-xl font-bold font-mono mt-1">
                  {bankStatementInput ? fmt(liveSummary.bookVsStatementDiff) : 'ETB 0.00'}
                </div>
                <p className="text-[11px] font-medium mt-0.5">
                  {!bankStatementInput
                    ? 'Enter bank statement balance above'
                    : liveSummary.isBalanced
                    ? '✨ Perfectly Balanced & Reconciled'
                    : `Discrepancy: ${fmt(Math.abs(liveSummary.bookVsStatementDiff))} needs matching`}
                </p>
              </CardBody>
            </Card>
          </div>

          {/* Transactions Table Card */}
          <Card className="bg-white border border-gray-200 shadow-xs overflow-hidden">
            <CardHeader className="border-b border-gray-100 bg-gray-50/50 pb-3">
              <div className="flex flex-wrap items-center justify-between gap-3">
                {/* Search & Filter Tabs */}
                <div className="flex flex-wrap items-center gap-2">
                  <div className="relative min-w-[220px]">
                    <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      placeholder="Search voucher, payee, amount..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full pl-9 pr-4 py-1.5 text-xs sm:text-sm border border-gray-300 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  {/* Filter Pills */}
                  <div className="flex items-center bg-gray-200/70 p-0.5 rounded-lg text-xs">
                    {(['ALL', 'UNRECONCILED', 'RECONCILED', 'DEPOSITS', 'WITHDRAWALS'] as const).map((t) => (
                      <button
                        key={t}
                        type="button"
                        onClick={() => setFilterType(t)}
                        className={`px-2.5 py-1 rounded-md font-semibold transition-colors ${
                          filterType === t
                            ? 'bg-white text-blue-700 shadow-2xs'
                            : 'text-gray-600 hover:text-gray-900'
                        }`}
                      >
                        {t === 'ALL'
                          ? `All (${transactions.length})`
                          : t === 'UNRECONCILED'
                          ? `Unmatched (${liveSummary.unclearedCount})`
                          : t === 'RECONCILED'
                          ? `Cleared (${liveSummary.clearedCount})`
                          : t === 'DEPOSITS'
                          ? `Deposits`
                          : `Withdrawals`}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Bulk Actions & Save Button */}
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={clearAllFiltered}
                    className="px-2.5 py-1 text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200 rounded-lg hover:bg-blue-100 transition-colors"
                  >
                    Clear / Match Filtered ({filteredTransactions.length})
                  </button>
                  <button
                    type="button"
                    onClick={unmatchAllFiltered}
                    className="px-2.5 py-1 text-xs font-semibold bg-gray-100 text-gray-700 border border-gray-200 rounded-lg hover:bg-gray-200 transition-colors"
                  >
                    Unmatch Filtered
                  </button>
                  <Button
                    size="sm"
                    variant="primary"
                    onClick={handleSaveReconciliation}
                    isLoading={savingRecon}
                    icon={<Save className="w-3.5 h-3.5" />}
                  >
                    Save Reconciliation
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardBody className="p-0">
              {loadingTxns ? (
                <div className="p-12 text-center text-xs text-gray-500">
                  <RefreshCw className="w-5 h-5 animate-spin mx-auto text-blue-600 mb-2" />
                  Loading bank transactions and calculating balances...
                </div>
              ) : filteredTransactions.length === 0 ? (
                <div className="p-12 text-center space-y-2">
                  <div className="w-10 h-10 rounded-2xl bg-blue-50 text-blue-600 mx-auto flex items-center justify-center">
                    <CheckSquare className="w-5 h-5" />
                  </div>
                  <h3 className="font-semibold text-sm text-gray-900">No transactions matching filter</h3>
                  <p className="text-xs text-gray-500 max-w-sm mx-auto">
                    Try adjusting your date range or search query to find bank vouchers and journal entries.
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-gray-50 border-b border-gray-200 text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      <tr>
                        <th className="px-4 py-3 w-12 text-center">Match</th>
                        <th className="px-4 py-3 min-w-[100px]">Date</th>
                        <th className="px-4 py-3 min-w-[140px]">Reference / Voucher</th>
                        <th className="px-4 py-3 min-w-[180px]">Party / Payee</th>
                        <th className="px-4 py-3 min-w-[200px]">Description</th>
                        <th className="px-4 py-3 min-w-[100px] text-center">Type</th>
                        <th className="px-4 py-3 min-w-[130px] text-right">Book Amount (ETB)</th>
                        <th className="px-4 py-3 min-w-[130px] text-right">Bank Amount (ETB)</th>
                        <th className="px-4 py-3 w-28 text-center">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {filteredTransactions.map((tx) => {
                        const isCleared = clearedSet.has(tx.id);
                        const isDeposit = tx.type === 'DEPOSIT';

                        return (
                          <tr
                            key={tx.id}
                            onClick={() => toggleClearance(tx.id)}
                            className={`cursor-pointer transition-colors ${
                              isCleared ? 'bg-blue-50/50 hover:bg-blue-50/80' : 'hover:bg-gray-50'
                            }`}
                          >
                            <td className="px-4 py-3 text-center" onClick={(e) => e.stopPropagation()}>
                              <input
                                type="checkbox"
                                checked={isCleared}
                                onChange={() => toggleClearance(tx.id)}
                                className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 cursor-pointer"
                              />
                            </td>
                            <td className="px-4 py-3 text-xs font-mono text-gray-600 whitespace-nowrap">
                              {new Date(tx.date).toLocaleDateString()}
                            </td>
                            <td className="px-4 py-3 font-semibold text-xs text-blue-700">
                              <span className="hover:underline flex items-center gap-1">
                                {tx.refNo}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-xs font-medium text-gray-900">
                              {tx.party}
                            </td>
                            <td className="px-4 py-3 text-xs text-gray-600 max-w-xs truncate">
                              {tx.description}
                            </td>
                            <td className="px-4 py-3 text-center">
                              <span
                                className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                                  isDeposit
                                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                    : 'bg-red-50 text-red-700 border border-red-200'
                                }`}
                              >
                                {isDeposit ? 'Deposit' : 'Withdrawal'}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-right font-mono font-bold text-xs text-gray-900">
                              <span className={isDeposit ? 'text-emerald-700' : 'text-gray-900'}>
                                {isDeposit ? '+' : '-'}{fmt(tx.bookAmount)}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-right font-mono text-xs text-gray-700">
                              {fmt(isCleared ? tx.bookAmount : 0)}
                            </td>
                            <td className="px-4 py-3 text-center">
                              <span
                                className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
                                  isCleared
                                    ? 'bg-green-100 text-green-800'
                                    : 'bg-amber-100 text-amber-800'
                                }`}
                              >
                                {isCleared ? 'Cleared' : 'Outstanding'}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </CardBody>
          </Card>
        </>
      ) : (
        /* Past Reconciliation Audit History View */
        <Card className="bg-white border border-gray-200 shadow-xs">
          <CardHeader className="border-b border-gray-100 bg-gray-50/50 pb-3">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-semibold text-gray-900 flex items-center gap-2">
                <History className="w-5 h-5 text-blue-600" />
                Past Reconciliation History Records ({pastRecons.length})
              </h2>
              <Button size="sm" variant="outline" onClick={fetchHistory} icon={<RefreshCw className="w-3.5 h-3.5" />}>
                Refresh
              </Button>
            </div>
          </CardHeader>
          <CardBody className="p-4 sm:p-6">
            {loadingHistory ? (
              <div className="p-8 text-center text-xs text-gray-500">Loading history records...</div>
            ) : pastRecons.length === 0 ? (
              <div className="p-12 text-center space-y-2">
                <p className="text-xs text-gray-500">No reconciliation records saved for this account yet.</p>
                <button
                  type="button"
                  onClick={() => setActiveTab('workspace')}
                  className="text-xs font-semibold text-blue-600 hover:underline"
                >
                  Go to Live Workspace to create one
                </button>
              </div>
            ) : (
              <div className="divide-y divide-gray-100 border border-gray-200 rounded-xl overflow-hidden">
                {pastRecons.map((rec) => {
                  const isZeroDiff = Math.abs(Number(rec.difference)) < 0.01;
                  return (
                    <div key={rec.id} className="p-4 hover:bg-gray-50 transition-colors space-y-3">
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-sm text-gray-900">{rec.id}</span>
                            <Badge status={rec.status === 'Completed' ? 'Active' : 'Pending' as any}>
                              {rec.status}
                            </Badge>
                            <span className="text-xs text-gray-500 font-mono">
                              {new Date(rec.periodFrom).toLocaleDateString()} — {new Date(rec.periodTo).toLocaleDateString()}
                            </span>
                          </div>
                          <p className="text-[11px] text-gray-400 mt-0.5">
                            Created on {new Date(rec.createdAt).toLocaleDateString()} at {new Date(rec.createdAt).toLocaleTimeString()}
                          </p>
                        </div>

                        <div className="grid grid-cols-3 gap-4 text-right text-xs">
                          <div>
                            <span className="text-gray-500 block">Book Balance:</span>
                            <span className="font-bold font-mono text-gray-900">{fmt(rec.closingBalance)}</span>
                          </div>
                          <div>
                            <span className="text-gray-500 block">Bank Statement:</span>
                            <span className="font-bold font-mono text-indigo-900">{fmt(rec.bankStatement)}</span>
                          </div>
                          <div>
                            <span className="text-gray-500 block">Difference:</span>
                            <span className={`font-bold font-mono ${isZeroDiff ? 'text-green-600' : 'text-amber-600'}`}>
                              {fmt(rec.difference)}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Line items if available */}
                      {rec.items && rec.items.length > 0 && (
                        <div className="bg-gray-50 p-2.5 rounded-lg text-xs space-y-1">
                          <p className="font-semibold text-gray-700">{rec.items.length} Reconciliation Lines</p>
                          <div className="space-y-1 max-h-32 overflow-y-auto">
                            {rec.items.slice(0, 5).map((it) => (
                              <div key={it.id} className="flex justify-between text-[11px] text-gray-600">
                                <span>{it.description}</span>
                                <span className="font-mono">{fmt(it.bookAmount)}</span>
                              </div>
                            ))}
                            {rec.items.length > 5 && (
                              <p className="text-[10px] text-gray-400 text-center">
                                + {rec.items.length - 5} more items
                              </p>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </CardBody>
        </Card>
      )}
    </div>
  );
}
 