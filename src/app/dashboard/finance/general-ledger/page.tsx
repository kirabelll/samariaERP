'use client';

import React, { useState, useEffect, useMemo, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams, useRouter } from 'next/navigation';
import {
  BookOpen,
  Calendar,
  Filter,
  Download,
  Printer,
  RotateCcw,
  Search,
  ChevronDown,
  ArrowUpRight,
  ArrowDownLeft,
  DollarSign,
  FileText,
  Layers,
  Sparkles,
  CheckSquare,
  Square,
  Building2,
  ExternalLink,
} from 'lucide-react';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Card, { CardBody } from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';

interface AccountOption {
  id: string;
  accountCode: string;
  accountName: string;
  accountType: string;
}

interface LedgerTransaction {
  id: string;
  index: number;
  postingDate: string;
  accountId: string;
  accountCode: string;
  accountName: string;
  accountType: string;
  debit: number;
  credit: number;
  runningBalance: number;
  balanceType: 'Dr' | 'Cr';
  voucherType: string;
  voucherSubtype: string;
  voucherNo: string;
  againstAccount: string;
  party: string;
  description: string;
  refModule: string;
  refId: string;
  postedBy: string;
}

interface LedgerSummary {
  totalDebit: number;
  totalCredit: number;
  netPeriodMovement: number;
  closingBalance: number;
  closingBalanceType: 'Dr' | 'Cr';
  transactionCount: number;
}

interface OpeningBalance {
  debit: number;
  credit: number;
  balance: number;
  balanceType: 'Dr' | 'Cr';
}

function formatDate(dateString?: string) {
  if (!dateString) return '-';
  try {
    const d = new Date(dateString);
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    return `${day}-${month}-${year}`;
  } catch {
    return dateString;
  }
}

function formatCurrency(amount: number) {
  const formatted = Math.abs(amount).toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  return `${amount < 0 ? 'Br -' : 'Br '}${formatted}`;
}

function GeneralLedgerContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const initialAccountId = searchParams.get('accountId') || '';
  const initialAccountCode = searchParams.get('accountCode') || '';
  const initialSearch = searchParams.get('search') || '';

  // Filter States
  const [selectedAccountId, setSelectedAccountId] = useState<string>(initialAccountId);
  const [selectedAccountCode, setSelectedAccountCode] = useState<string>(initialAccountCode);
  const [fromDate, setFromDate] = useState<string>('');
  const [toDate, setToDate] = useState<string>('');
  const [voucherType, setVoucherType] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState<string>(initialSearch);
  const [includeOpening, setIncludeOpening] = useState<boolean>(true);
  const [showRemarks, setShowRemarks] = useState<boolean>(true);

  // Data States
  const [accounts, setAccounts] = useState<AccountOption[]>([]);
  const [currentAccount, setCurrentAccount] = useState<AccountOption | null>(null);
  const [transactions, setTransactions] = useState<LedgerTransaction[]>([]);
  const [opening, setOpening] = useState<OpeningBalance>({ debit: 0, credit: 0, balance: 0, balanceType: 'Dr' });
  const [summary, setSummary] = useState<LedgerSummary>({
    totalDebit: 0,
    totalCredit: 0,
    netPeriodMovement: 0,
    closingBalance: 0,
    closingBalanceType: 'Dr',
    transactionCount: 0,
  });

  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [rebuilding, setRebuilding] = useState<boolean>(false);
  const [rebuildMsg, setRebuildMsg] = useState<string | null>(null);

  // Fetch data
  const fetchLedgerData = async () => {
    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams();
      if (selectedAccountId) params.append('accountId', selectedAccountId);
      else if (selectedAccountCode) params.append('accountCode', selectedAccountCode);

      if (fromDate) params.append('fromDate', fromDate);
      if (toDate) params.append('toDate', toDate);
      if (voucherType) params.append('voucherType', voucherType);
      if (searchTerm) params.append('search', searchTerm);

      const res = await fetch(`/api/finance/general-ledger?${params.toString()}`);
      const json = await res.json();

      if (json.success && json.data) {
        setAccounts(json.data.accounts || []);
        setCurrentAccount(json.data.account || null);
        setOpening(json.data.opening || { debit: 0, credit: 0, balance: 0, balanceType: 'Dr' });
        setTransactions(json.data.transactions || []);
        setSummary(json.data.summary || {
          totalDebit: 0,
          totalCredit: 0,
          netPeriodMovement: 0,
          closingBalance: 0,
          closingBalanceType: 'Dr',
          transactionCount: 0,
        });
      } else {
        setError(json.error || 'Failed to load general ledger data');
      }
    } catch (err: any) {
      setError(err.message || 'Network error fetching general ledger');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLedgerData();
  }, [selectedAccountId, selectedAccountCode, fromDate, toDate, voucherType]);

  // Rebuild Journal Entries
  const handleRebuildJournal = async () => {
    if (!confirm('This will synchronize and regenerate journal entries from all source vouchers and invoices. Continue?')) {
      return;
    }
    setRebuilding(true);
    setRebuildMsg(null);
    try {
      const res = await fetch('/api/finance/journal/rebuild', { method: 'POST' });
      const result = await res.json();
      if (result.success) {
        setRebuildMsg('Journal entries synchronized successfully');
        await fetchLedgerData();
      } else {
        setRebuildMsg(`Error: ${result.error}`);
      }
    } catch (err: any) {
      setRebuildMsg(`Error: ${err.message}`);
    } finally {
      setRebuilding(false);
    }
  };

  // Quick Date Presets
  const applyDatePreset = (preset: 'today' | 'this_month' | 'last_month' | 'this_year' | 'all') => {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth();

    const pad = (n: number) => String(n).padStart(2, '0');
    const toDateStr = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

    if (preset === 'today') {
      const todayStr = toDateStr(now);
      setFromDate(todayStr);
      setToDate(todayStr);
    } else if (preset === 'this_month') {
      const start = new Date(year, month, 1);
      const end = new Date(year, month + 1, 0);
      setFromDate(toDateStr(start));
      setToDate(toDateStr(end));
    } else if (preset === 'last_month') {
      const start = new Date(year, month - 1, 1);
      const end = new Date(year, month, 0);
      setFromDate(toDateStr(start));
      setToDate(toDateStr(end));
    } else if (preset === 'this_year') {
      const start = new Date(year, 0, 1);
      const end = new Date(year, 11, 31);
      setFromDate(toDateStr(start));
      setToDate(toDateStr(end));
    } else if (preset === 'all') {
      setFromDate('');
      setToDate('');
    }
  };

  // Reset Filters
  const handleResetFilters = () => {
    setSelectedAccountId('');
    setSelectedAccountCode('');
    setFromDate('');
    setToDate('');
    setVoucherType('');
    setSearchTerm('');
  };

  // Export CSV
  const handleExportCSV = () => {
    const headers = [
      'Row',
      'Posting Date',
      'Account Code',
      'Account Name',
      'Debit (ETB)',
      'Credit (ETB)',
      'Balance (ETB)',
      'Voucher Type',
      'Voucher Subtype',
      'Voucher No',
      'Against Account',
      'Party / Description',
    ];

    const rows = transactions.map((t) => [
      t.index,
      formatDate(t.postingDate),
      t.accountCode,
      `"${t.accountName.replace(/"/g, '""')}"`,
      t.debit,
      t.credit,
      t.runningBalance,
      `"${t.voucherType}"`,
      `"${t.voucherSubtype}"`,
      `"${t.voucherNo}"`,
      `"${(t.againstAccount || '').replace(/"/g, '""')}"`,
      `"${(t.description || t.party || '').replace(/"/g, '""')}"`,
    ]);

    // Add totals row
    rows.push([
      'TOTAL',
      '',
      '',
      '',
      summary.totalDebit,
      summary.totalCredit,
      summary.closingBalance,
      '',
      '',
      '',
      '',
      '',
    ]);

    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute(
      'download',
      `General_Ledger_${selectedAccountCode || 'All'}_${fromDate || 'start'}_to_${toDate || 'end'}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Print
  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex flex-wrap gap-3 items-center justify-between">
        <div>
          <div className="flex items-center gap-2 text-xs text-gray-500 mb-1">
            <Link href="/dashboard/finance/accounts" className="hover:text-blue-600">
              Chart of Accounts
            </Link>
            <span>/</span>
            <span className="font-semibold text-gray-700">General Ledger</span>
          </div>
          <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900 flex items-center gap-2">
            <BookOpen className="w-7 h-7 text-blue-600" />
            General Ledger
          </h1>
          <p className="text-gray-600 text-xs sm:text-sm mt-1">
            Complete transaction ledger report with debit, credit, against accounts, and running balances
          </p>
        </div>

        <div className="flex flex-wrap gap-2 items-center">
          <Button
            variant="secondary"
            size="sm"
            onClick={handleRebuildJournal}
            isLoading={rebuilding}
            icon={<RotateCcw className="w-3.5 h-3.5" />}
          >
            Sync Ledger
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={handleExportCSV}
            icon={<Download className="w-4 h-4" />}
          >
            Export CSV
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={handlePrint}
            icon={<Printer className="w-4 h-4" />}
          >
            Print
          </Button>
        </div>
      </div>

      {rebuildMsg && (
        <div
          className={`p-3.5 rounded-xl text-xs sm:text-sm flex items-center justify-between ${
            rebuildMsg.startsWith('Error')
              ? 'bg-red-50 text-red-800 border border-red-200'
              : 'bg-green-50 text-green-800 border border-green-200'
          }`}
        >
          <span>{rebuildMsg}</span>
          <button onClick={() => setRebuildMsg(null)} className="text-xs font-semibold hover:underline">
            Dismiss
          </button>
        </div>
      )}

      {/* Filter Card (Styled like Frappe / ERPNext General Ledger top toolbar) */}
      <Card className="p-4 sm:p-5 bg-white shadow-xs border border-gray-200">
        <div className="space-y-4">
          {/* Top Row: Account & Date Filter Inputs */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Account Selector */}
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold uppercase tracking-wider text-gray-600">
                Account
              </label>
              <select
                value={selectedAccountId}
                onChange={(e) => {
                  setSelectedAccountId(e.target.value);
                  setSelectedAccountCode('');
                }}
                className="w-full h-9 rounded-md border border-gray-300 bg-white px-3 py-1 text-sm shadow-2xs focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">All Accounts</option>
                {accounts.map((acc) => (
                  <option key={acc.id} value={acc.id}>
                    {acc.accountCode} - {acc.accountName} ({acc.accountType})
                  </option>
                ))}
              </select>
            </div>

            {/* From Date */}
            <Input
              label="From Date"
              type="date"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
              icon={<Calendar className="w-4 h-4" />}
            />

            {/* To Date */}
            <Input
              label="To Date"
              type="date"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
              icon={<Calendar className="w-4 h-4" />}
            />

            {/* Voucher Type */}
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold uppercase tracking-wider text-gray-600">
                Voucher Type
              </label>
              <select
                value={voucherType}
                onChange={(e) => setVoucherType(e.target.value)}
                className="w-full h-9 rounded-md border border-gray-300 bg-white px-3 py-1 text-sm shadow-2xs focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">All Voucher Types</option>
                <option value="Journal Entry">Journal Entry</option>
                <option value="Sales Invoice">Sales Invoice</option>
                <option value="Purchase Invoice">Purchase Invoice</option>
                <option value="Stock Entry">Stock Entry (Lifting)</option>
                <option value="Payment Voucher">Payment Voucher</option>
                <option value="Supplier Payment">Supplier Payment</option>
                <option value="Customer Payment">Customer Payment</option>
                <option value="Payroll">Payroll</option>
              </select>
            </div>
          </div>

          {/* Quick Date Presets & Search */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-gray-100">
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-xs font-medium text-gray-500 mr-1">Presets:</span>
              <Button size="sm" variant="secondary" onClick={() => applyDatePreset('today')}>
                Today
              </Button>
              <Button size="sm" variant="secondary" onClick={() => applyDatePreset('this_month')}>
                This Month
              </Button>
              <Button size="sm" variant="secondary" onClick={() => applyDatePreset('last_month')}>
                Last Month
              </Button>
              <Button size="sm" variant="secondary" onClick={() => applyDatePreset('this_year')}>
                This Year
              </Button>
              <Button size="sm" variant="secondary" onClick={() => applyDatePreset('all')}>
                All Time
              </Button>
            </div>

            <div className="flex items-center gap-3">
              <div className="relative w-64">
                <Search className="w-3.5 h-3.5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search voucher, party, remarks..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && fetchLedgerData()}
                  className="w-full pl-8 pr-3 py-1 text-xs border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>

              <button
                onClick={handleResetFilters}
                className="text-xs text-gray-500 hover:text-gray-800 flex items-center gap-1"
                title="Reset all filters"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                Reset
              </button>
            </div>
          </div>

          {/* Options / Checkboxes (Frappe ERPNext style) */}
          <div className="flex flex-wrap items-center gap-5 text-xs text-gray-600 pt-1">
            <label className="flex items-center gap-1.5 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={includeOpening}
                onChange={(e) => setIncludeOpening(e.target.checked)}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <span>Show Opening Entries</span>
            </label>

            <label className="flex items-center gap-1.5 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={showRemarks}
                onChange={(e) => setShowRemarks(e.target.checked)}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <span>Show Description / Remarks</span>
            </label>

            {currentAccount && (
              <div className="ml-auto text-xs font-semibold text-blue-700 bg-blue-50 px-2.5 py-1 rounded-md border border-blue-200">
                Active Account: {currentAccount.accountCode} - {currentAccount.accountName} ({currentAccount.accountType})
              </div>
            )}
          </div>
        </div>
      </Card>

      {/* Metric Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Opening Balance */}
        <Card className="p-4 bg-white shadow-xs border border-gray-200 border-l-4 border-l-gray-400">
          <p className="text-xs text-gray-500 font-medium uppercase tracking-wider">Opening Balance</p>
          <p className="text-xl sm:text-2xl font-bold text-gray-900 mt-1 font-mono">
            {formatCurrency(opening.balance)}
          </p>
          <div className="flex items-center justify-between text-xs text-gray-500 mt-1">
            <span>{fromDate ? `Before ${formatDate(fromDate)}` : 'Initial Balance'}</span>
            <span className="font-semibold">{opening.balanceType}</span>
          </div>
        </Card>

        {/* Total Debit */}
        <Card className="p-4 bg-white shadow-xs border border-gray-200 border-l-4 border-l-blue-500">
          <p className="text-xs text-gray-500 font-medium uppercase tracking-wider">Total Debit</p>
          <p className="text-xl sm:text-2xl font-bold text-blue-600 mt-1 font-mono">
            {formatCurrency(summary.totalDebit)}
          </p>
          <div className="flex items-center justify-between text-xs text-gray-500 mt-1">
            <span>Period Inflow / Additions</span>
            <span>{summary.transactionCount} entries</span>
          </div>
        </Card>

        {/* Total Credit */}
        <Card className="p-4 bg-white shadow-xs border border-gray-200 border-l-4 border-l-purple-500">
          <p className="text-xs text-gray-500 font-medium uppercase tracking-wider">Total Credit</p>
          <p className="text-xl sm:text-2xl font-bold text-purple-600 mt-1 font-mono">
            {formatCurrency(summary.totalCredit)}
          </p>
          <div className="flex items-center justify-between text-xs text-gray-500 mt-1">
            <span>Period Outflow / Deductions</span>
            <span>{summary.transactionCount} entries</span>
          </div>
        </Card>

        {/* Closing Balance */}
        <Card className="p-4 bg-white shadow-xs border border-gray-200 border-l-4 border-l-green-500">
          <p className="text-xs text-gray-500 font-medium uppercase tracking-wider">Closing Balance</p>
          <p className="text-xl sm:text-2xl font-bold text-green-700 mt-1 font-mono">
            {formatCurrency(summary.closingBalance)}
          </p>
          <div className="flex items-center justify-between text-xs text-gray-500 mt-1">
            <span>Opening + Net Movement</span>
            <span className="font-semibold">{summary.closingBalanceType}</span>
          </div>
        </Card>
      </div>

      {/* General Ledger Table (Exact Frappe / ERPNext Layout) */}
      <Card className="bg-white shadow-xs border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-gray-500">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-3 text-sm">Loading General Ledger entries...</p>
          </div>
        ) : error ? (
          <div className="p-12 text-center text-red-600">
            <p>Error: {error}</p>
            <Button variant="outline" size="sm" onClick={fetchLedgerData} className="mt-3">
              Retry
            </Button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs sm:text-sm text-left border-collapse">
              <thead className="bg-gray-50 border-b border-gray-200 text-gray-700 font-semibold uppercase tracking-wider text-[11px]">
                <tr>
                  <th className="px-3 py-3 w-10 text-center text-gray-400">#</th>
                  <th className="px-3 py-3 whitespace-nowrap">Posting Date</th>
                  <th className="px-4 py-3 whitespace-nowrap">Account</th>
                  <th className="px-4 py-3 text-right whitespace-nowrap">Debit (ETB)</th>
                  <th className="px-4 py-3 text-right whitespace-nowrap">Credit (ETB)</th>
                  <th className="px-4 py-3 text-right whitespace-nowrap">Balance (ETB)</th>
                  <th className="px-4 py-3 whitespace-nowrap">Voucher Type</th>
                  <th className="px-4 py-3 whitespace-nowrap">Voucher Subtype</th>
                  <th className="px-4 py-3 whitespace-nowrap">Voucher No</th>
                  <th className="px-4 py-3 whitespace-nowrap">Against Account</th>
                  {showRemarks && <th className="px-4 py-3 whitespace-nowrap">Party / Remarks</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 font-sans">
                {/* 1. Opening Balance Row */}
                {includeOpening && (
                  <tr className="bg-gray-50/70 font-medium text-gray-800 border-b border-gray-200">
                    <td className="px-3 py-2.5 text-center text-gray-400">1</td>
                    <td className="px-3 py-2.5 text-gray-500 whitespace-nowrap">{fromDate ? formatDate(fromDate) : '-'}</td>
                    <td className="px-4 py-2.5 font-semibold text-gray-900">Opening</td>
                    <td className="px-4 py-2.5 text-right font-mono text-gray-500">
                      {formatCurrency(opening.debit)}
                    </td>
                    <td className="px-4 py-2.5 text-right font-mono text-gray-500">
                      {formatCurrency(opening.credit)}
                    </td>
                    <td className="px-4 py-2.5 text-right font-mono font-bold text-gray-900">
                      {formatCurrency(opening.balance)}
                    </td>
                    <td className="px-4 py-2.5 text-gray-400" colSpan={showRemarks ? 5 : 4}></td>
                  </tr>
                )}

                {/* 2. Transaction Rows */}
                {transactions.length === 0 ? (
                  <tr>
                    <td colSpan={showRemarks ? 11 : 10} className="px-6 py-10 text-center text-gray-500">
                      No transaction entries found matching the filter criteria.
                    </td>
                  </tr>
                ) : (
                  transactions.map((t, idx) => {
                    const rowNum = includeOpening ? idx + 2 : idx + 1;
                    return (
                      <tr key={t.id} className="hover:bg-blue-50/40 transition-colors text-gray-800">
                        <td className="px-3 py-2.5 text-center text-gray-400 font-mono text-xs">{rowNum}</td>
                        <td className="px-3 py-2.5 whitespace-nowrap text-gray-600 font-mono text-xs">
                          {formatDate(t.postingDate)}
                        </td>
                        <td className="px-4 py-2.5 font-medium text-gray-900 max-w-[200px] truncate" title={`${t.accountCode} - ${t.accountName}`}>
                          <span className="font-mono text-xs text-gray-500 mr-1">{t.accountCode}</span>
                          <span>- {t.accountName}</span>
                        </td>
                        <td className="px-4 py-2.5 text-right font-mono text-xs text-gray-900">
                          {t.debit > 0 ? formatCurrency(t.debit) : 'Br 0.00'}
                        </td>
                        <td className="px-4 py-2.5 text-right font-mono text-xs text-gray-900">
                          {t.credit > 0 ? formatCurrency(t.credit) : 'Br 0.00'}
                        </td>
                        <td className="px-4 py-2.5 text-right font-mono text-xs font-semibold text-gray-900">
                          {formatCurrency(t.runningBalance)}
                        </td>
                        <td className="px-4 py-2.5 text-gray-700 whitespace-nowrap">
                          <span className="inline-block px-2 py-0.5 rounded text-[11px] font-medium bg-gray-100 text-gray-800 border border-gray-200">
                            {t.voucherType}
                          </span>
                        </td>
                        <td className="px-4 py-2.5 text-gray-600 text-xs whitespace-nowrap">{t.voucherSubtype}</td>
                        <td className="px-4 py-2.5 font-mono text-xs text-blue-600 hover:text-blue-800 font-semibold whitespace-nowrap">
                          <Link href={`/dashboard/finance/journal?search=${encodeURIComponent(t.voucherNo)}`} className="hover:underline inline-flex items-center gap-1">
                            {t.voucherNo}
                          </Link>
                        </td>
                        <td className="px-4 py-2.5 text-gray-600 text-xs max-w-[180px] truncate" title={t.againstAccount}>
                          {t.againstAccount || '-'}
                        </td>
                        {showRemarks && (
                          <td className="px-4 py-2.5 text-gray-500 text-xs max-w-[220px] truncate" title={t.description || t.party}>
                            {t.description || t.party || '-'}
                          </td>
                        )}
                      </tr>
                    );
                  })
                )}

                {/* 3. Total Row */}
                <tr className="bg-gray-100/80 font-bold text-gray-900 border-t-2 border-gray-300">
                  <td className="px-3 py-3 text-center text-gray-400"></td>
                  <td className="px-3 py-3 whitespace-nowrap"></td>
                  <td className="px-4 py-3 font-bold text-gray-900">Total</td>
                  <td className="px-4 py-3 text-right font-mono text-xs text-blue-700 font-bold">
                    {formatCurrency(summary.totalDebit)}
                  </td>
                  <td className="px-4 py-3 text-right font-mono text-xs text-purple-700 font-bold">
                    {formatCurrency(summary.totalCredit)}
                  </td>
                  <td className="px-4 py-3 text-right font-mono text-xs text-gray-900 font-bold">
                    {formatCurrency(summary.netPeriodMovement)}
                  </td>
                  <td className="px-4 py-3" colSpan={showRemarks ? 5 : 4}></td>
                </tr>

                {/* 4. Closing (Opening + Total) Row */}
                <tr className="bg-blue-50/50 font-bold text-gray-900 border-t border-b border-blue-200">
                  <td className="px-3 py-3 text-center text-gray-400"></td>
                  <td className="px-3 py-3 whitespace-nowrap"></td>
                  <td className="px-4 py-3 font-bold text-blue-900">Closing (Opening + Total)</td>
                  <td className="px-4 py-3 text-right font-mono text-xs text-blue-800 font-bold">
                    {formatCurrency(opening.debit + summary.totalDebit)}
                  </td>
                  <td className="px-4 py-3 text-right font-mono text-xs text-purple-800 font-bold">
                    {formatCurrency(opening.credit + summary.totalCredit)}
                  </td>
                  <td className="px-4 py-3 text-right font-mono text-xs text-green-700 font-bold text-sm">
                    {formatCurrency(summary.closingBalance)}
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-500" colSpan={showRemarks ? 5 : 4}>
                    Net Closing Balance
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}

export default function GeneralLedgerPage() {
  return (
    <Suspense
      fallback={
        <div className="p-12 text-center text-gray-500">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-3 text-sm">Loading General Ledger...</p>
        </div>
      }
    >
      <GeneralLedgerContent />
    </Suspense>
  );
}
