'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardBody, CardHeader, Button, Badge } from '@/components/ui';
import {
  CheckSquare,
  Plus,
  RefreshCw,
  Printer,
  Trash2,
  CheckCircle,
  AlertTriangle,
  ArrowRight,
  FileSpreadsheet,
  Building2,
  Calendar,
  Layers,
  X,
} from 'lucide-react';

interface BankAccount {
  id: string;
  bankName: string;
  accountNo: string;
  accountName: string;
  balance: number;
}

interface SystemTransaction {
  id: string;
  index: number;
  date: string;
  refNo: string;
  collection: number;
  payment: number;
  desc: string;
  type: string;
  reconStatus: string;
}

interface BankStatementLine {
  id: string;
  payment: number | '';
  collection: number | '';
  desc?: string;
}

interface ReconciliationRecord {
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
  items?: any[];
}

export default function ReconciliationPage() {
  // Navigation & selection state
  const [selectedAccountId, setSelectedAccountId] = useState('');
  const [accounts, setAccounts] = useState<BankAccount[]>([]);
  const [loadingAccounts, setLoadingAccounts] = useState(false);

  // Date period state (default: current month)
  const [periodFrom, setPeriodFrom] = useState(() => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().split('T')[0];
  });
  const [periodTo, setPeriodTo] = useState(() => {
    return new Date().toISOString().split('T')[0];
  });

  // System side state
  const [systemBeginning, setSystemBeginning] = useState<number>(0);
  const [systemTransactions, setSystemTransactions] = useState<SystemTransaction[]>([]);
  const [loadingSystemData, setLoadingSystemData] = useState(false);

  // Bank side state
  const [bankBeginning, setBankBeginning] = useState<number | ''>(0);
  const [bankLines, setBankLines] = useState<BankStatementLine[]>([
    { id: 'b-1', payment: '', collection: '' },
  ]);

  // Saved reconciliations list
  const [reconciliations, setReconciliations] = useState<ReconciliationRecord[]>([]);
  const [loadingReconciliations, setLoadingReconciliations] = useState(false);

  // UI modes
  const [saving, setSaving] = useState(false);
  const [saveSuccessMsg, setSaveSuccessMsg] = useState<string | null>(null);
  const [printMode, setPrintMode] = useState(false);
  const [activeTab, setActiveTab] = useState<'workspace' | 'history'>('workspace');

  // Load Bank Accounts
  useEffect(() => {
    fetchBankAccounts();
  }, []);

  // When account or period changes, fetch system transactions & reconciliations
  useEffect(() => {
    if (selectedAccountId) {
      loadSystemData();
      fetchReconciliations();
    }
  }, [selectedAccountId, periodFrom, periodTo]);

  const fetchBankAccounts = async () => {
    setLoadingAccounts(true);
    try {
      const response = await fetch('/api/finance/bank?limit=100');
      const result = await response.json();
      const data: BankAccount[] = result.data || [];
      setAccounts(data);
      if (data.length > 0 && !selectedAccountId) {
        setSelectedAccountId(data[0].id);
      }
    } catch (err) {
      console.error('Failed to load bank accounts:', err);
    } finally {
      setLoadingAccounts(false);
    }
  };

  const loadSystemData = async () => {
    if (!selectedAccountId || !periodFrom || !periodTo) return;
    setLoadingSystemData(true);
    try {
      const res = await fetch(
        `/api/finance/reconciliation/preview?bankAccountId=${selectedAccountId}&periodFrom=${periodFrom}&periodTo=${periodTo}`
      );
      const json = await res.json();
      if (json.success && json.data) {
        setSystemBeginning(Number(json.data.systemBeginning) || 0);
        setSystemTransactions(json.data.transactions || []);
        // Default Bank Beginning to System Beginning if Bank Beginning is zero or empty
        setBankBeginning((prev) => (prev === '' || prev === 0 ? Number(json.data.systemBeginning) || 0 : prev));
      }
    } catch (err) {
      console.error('Failed to load system transactions:', err);
    } finally {
      setLoadingSystemData(false);
    }
  };

  const fetchReconciliations = async () => {
    if (!selectedAccountId) return;
    setLoadingReconciliations(true);
    try {
      const response = await fetch(
        `/api/finance/reconciliation?bankAccountId=${selectedAccountId}&limit=50`
      );
      const result = await response.json();
      if (result.success) {
        setReconciliations(result.data || []);
      }
    } catch (err) {
      console.error('Failed to fetch reconciliations:', err);
    } finally {
      setLoadingReconciliations(false);
    }
  };

  // ---------------- CALCULATIONS ----------------
  // System calculations
  const systemCollectionsSum = useMemo(() => {
    return systemTransactions.reduce((acc, t) => acc + (Number(t.collection) || 0), 0);
  }, [systemTransactions]);

  const systemPaymentsSum = useMemo(() => {
    return systemTransactions.reduce((acc, t) => acc + (Number(t.payment) || 0), 0);
  }, [systemTransactions]);

  // System Total Collections = System Beginning + Sum of Period Collections (as formatted in Samaria BMS)
  const systemTotalCollections = useMemo(() => {
    return Math.round((Number(systemBeginning || 0) + systemCollectionsSum) * 100) / 100;
  }, [systemBeginning, systemCollectionsSum]);

  const systemTotalPayments = useMemo(() => {
    return Math.round(systemPaymentsSum * 100) / 100;
  }, [systemPaymentsSum]);

  // System Ending Balance = Total Collections - Total Payments
  const systemEndingBalance = useMemo(() => {
    return Math.round((systemTotalCollections - systemTotalPayments) * 100) / 100;
  }, [systemTotalCollections, systemTotalPayments]);

  // Bank calculations
  const bankBeginningNum = Number(bankBeginning) || 0;

  const bankCollectionsSum = useMemo(() => {
    return bankLines.reduce((acc, l) => acc + (Number(l.collection) || 0), 0);
  }, [bankLines]);

  const bankPaymentsSum = useMemo(() => {
    return bankLines.reduce((acc, l) => acc + (Number(l.payment) || 0), 0);
  }, [bankLines]);

  // Bank Ending Balance ("diffrence") = Bank Beginning + Total Collections - Total Payments
  const bankEndingBalance = useMemo(() => {
    return Math.round((bankBeginningNum + bankCollectionsSum - bankPaymentsSum) * 100) / 100;
  }, [bankBeginningNum, bankCollectionsSum, bankPaymentsSum]);

  // Reconciliation Variance: Difference between Bank Ending and System Ending
  const reconciliationVariance = useMemo(() => {
    return Math.round((bankEndingBalance - systemEndingBalance) * 100) / 100;
  }, [bankEndingBalance, systemEndingBalance]);

  const isBalanced = Math.abs(reconciliationVariance) < 0.01;

  // ---------------- BANK LINE HANDLERS ----------------
  const handleAddBankLine = () => {
    setBankLines((prev) => [
      ...prev,
      { id: `b-${Date.now()}-${Math.random()}`, payment: '', collection: '' },
    ]);
  };

  const handleUpdateBankLine = (id: string, field: 'payment' | 'collection' | 'desc', val: any) => {
    setBankLines((prev) =>
      prev.map((line) => {
        if (line.id !== id) return line;
        return {
          ...line,
          [field]: val === '' ? '' : parseFloat(val) || 0,
        };
      })
    );
  };

  const handleRemoveBankLine = (id: string) => {
    setBankLines((prev) => (prev.length > 1 ? prev.filter((l) => l.id !== id) : prev));
  };

  // Helper: Auto-fill bank lines from system lines to save time
  const handleCopySystemToBank = () => {
    if (systemTransactions.length === 0) return;
    const copiedLines: BankStatementLine[] = systemTransactions.map((st, idx) => ({
      id: `b-copy-${idx}-${st.id}`,
      collection: st.collection > 0 ? st.collection : '',
      payment: st.payment > 0 ? st.payment : '',
      desc: st.desc,
    }));
    setBankBeginning(systemBeginning);
    setBankLines(copiedLines);
  };

  // ---------------- SAVE RECONCILIATION ----------------
  const handleSaveReconciliation = async () => {
    if (!selectedAccountId) {
      alert('Please select a bank account');
      return;
    }
    setSaving(true);
    setSaveSuccessMsg(null);

    try {
      const itemsPayload: any[] = [];

      // Add system items
      systemTransactions.forEach((st) => {
        itemsPayload.push({
          description: `[System] ${st.date} ${st.refNo ? '#' + st.refNo : ''} - ${st.desc}`,
          bookAmount: st.collection > 0 ? st.collection : st.payment,
          bankAmount: 0,
          difference: 0,
          status: 'Matched',
          transactionId: st.id,
        });
      });

      // Add bank statement items
      bankLines.forEach((bl, idx) => {
        const amt = Number(bl.collection || bl.payment || 0);
        if (amt > 0) {
          itemsPayload.push({
            description: `[Bank Statement #${idx + 1}] ${bl.collection ? 'Collection' : 'Payment'} ${bl.desc || ''}`,
            bookAmount: 0,
            bankAmount: amt,
            difference: 0,
            status: 'Matched',
          });
        }
      });

      const response = await fetch('/api/finance/reconciliation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bankAccountId: selectedAccountId,
          periodFrom,
          periodTo,
          openingBalance: systemBeginning,
          closingBalance: systemEndingBalance,
          bankStatement: bankEndingBalance,
          difference: reconciliationVariance,
          status: isBalanced ? 'Reconciled' : 'Draft',
          items: itemsPayload,
        }),
      });

      const result = await response.json();
      if (result.success) {
        setSaveSuccessMsg('Reconciliation record saved successfully!');
        fetchReconciliations();
        setTimeout(() => setSaveSuccessMsg(null), 4000);
      } else {
        alert(result.error || 'Failed to save reconciliation');
      }
    } catch (err: any) {
      alert('Error saving reconciliation: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  // Delete saved reconciliation
  const handleDeleteReconciliation = async (id: string) => {
    if (!confirm('Are you sure you want to delete this reconciliation record?')) return;
    try {
      const res = await fetch(`/api/finance/reconciliation/${id}`, { method: 'DELETE' });
      if (res.ok) {
        fetchReconciliations();
      }
    } catch (err) {
      console.error('Failed to delete:', err);
    }
  };

  // Format currency
  const fmt = (val: number | string | undefined | null) => {
    if (val === undefined || val === null || val === '') return '-';
    const num = Number(val);
    if (isNaN(num)) return '-';
    return num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  const selectedAccount = accounts.find((a) => a.id === selectedAccountId);

  return (
    <div className="space-y-6">
      {/* ----------------- SCREEN VIEW (Hidden when printing) ----------------- */}
      <div className="print:hidden space-y-6">
        {/* Page Header */}
        <div className="flex flex-wrap gap-4 items-center justify-between">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-md shadow-blue-500/20">
                <CheckSquare className="w-6 h-6" />
              </div>
              Bank Reconciliation
            </h1>
            <p className="text-sm text-slate-500 mt-1">
              Match and balance bank statement transactions against ERP system records (BMS format).
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant={activeTab === 'workspace' ? 'primary' : 'outline'}
              size="sm"
              onClick={() => setActiveTab('workspace')}
            >
              <FileSpreadsheet className="w-4 h-4 mr-1.5" /> Reconciliation Workspace
            </Button>
            <Button
              variant={activeTab === 'history' ? 'primary' : 'outline'}
              size="sm"
              onClick={() => setActiveTab('history')}
            >
              <Layers className="w-4 h-4 mr-1.5" /> Saved Records ({reconciliations.length})
            </Button>
            <Button variant="outline" size="sm" onClick={() => window.print()}>
              <Printer className="w-4 h-4 mr-1.5" /> Print BMS Report
            </Button>
          </div>
        </div>

        {/* Account & Date Controls Card */}
        <Card className="shadow-sm border-slate-200">
          <CardBody className="p-5">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
              {/* Bank Account Selection */}
              <div className="md:col-span-2">
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1.5 flex items-center gap-1.5">
                  <Building2 className="w-4 h-4 text-blue-600" /> Bank Account
                </label>
                <select
                  value={selectedAccountId}
                  onChange={(e) => setSelectedAccountId(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm font-medium text-slate-900 shadow-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                >
                  {accounts.map((acc) => (
                    <option key={acc.id} value={acc.id}>
                      {acc.bankName} — {acc.accountNo} ({acc.accountName})
                    </option>
                  ))}
                </select>
              </div>

              {/* Period From */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1.5 flex items-center gap-1.5">
                  <Calendar className="w-4 h-4 text-blue-600" /> Period From
                </label>
                <input
                  type="date"
                  value={periodFrom}
                  onChange={(e) => setPeriodFrom(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-sm text-slate-900 shadow-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                />
              </div>

              {/* Period To & Refresh */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1.5 flex items-center gap-1.5">
                  <Calendar className="w-4 h-4 text-blue-600" /> Period To
                </label>
                <div className="flex gap-2">
                  <input
                    type="date"
                    value={periodTo}
                    onChange={(e) => setPeriodTo(e.target.value)}
                    className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-sm text-slate-900 shadow-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={loadSystemData}
                    disabled={loadingSystemData}
                    title="Reload Transactions"
                  >
                    <RefreshCw className={`w-4 h-4 ${loadingSystemData ? 'animate-spin text-blue-600' : ''}`} />
                  </Button>
                </div>
              </div>
            </div>

            {/* Quick Summary Pill Bar */}
            {selectedAccount && (
              <div className="mt-4 pt-4 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-600">
                <div className="flex items-center gap-4 flex-wrap">
                  <span>
                    Bank: <strong className="text-slate-900">{selectedAccount.bankName}</strong>
                  </span>
                  <span>
                    Account No: <strong className="text-slate-900">{selectedAccount.accountNo}</strong>
                  </span>
                  <span>
                    Current Live Book Balance:{' '}
                    <strong className="text-blue-700">ETB {fmt(selectedAccount.balance)}</strong>
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={handleCopySystemToBank}
                    className="text-blue-600 hover:text-blue-800 font-medium hover:underline flex items-center gap-1 text-xs"
                    title="Copy all system rows to bank statement grid for rapid matching"
                  >
                    <ArrowRight className="w-3.5 h-3.5" /> Auto-fill Bank Lines from System
                  </button>
                </div>
              </div>
            )}
          </CardBody>
        </Card>

        {/* ---------------- WORKSPACE TAB ---------------- */}
        {activeTab === 'workspace' && (
          <div className="space-y-6">
            {/* Reconciliation Comparison Status Banner */}
            <div
              className={`rounded-2xl p-5 border shadow-sm transition-all ${
                isBalanced
                  ? 'bg-emerald-50/80 border-emerald-200 text-emerald-950'
                  : 'bg-amber-50/80 border-amber-200 text-amber-950'
              }`}
            >
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-center gap-3.5">
                  <div
                    className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 shadow-sm ${
                      isBalanced ? 'bg-emerald-600 text-white' : 'bg-amber-500 text-white'
                    }`}
                  >
                    {isBalanced ? <CheckCircle className="w-7 h-7" /> : <AlertTriangle className="w-7 h-7" />}
                  </div>
                  <div>
                    <h3 className="text-base font-bold flex items-center gap-2">
                      {isBalanced ? 'RECONCILED & BALANCED' : 'OUT OF BALANCE'}
                      <Badge status={isBalanced ? ('Active' as any) : ('Pending' as any)}>
                        {isBalanced ? 'Matched (0.00 Diff)' : `ETB ${fmt(Math.abs(reconciliationVariance))} Difference`}
                      </Badge>
                    </h3>
                    <p className="text-xs opacity-80 mt-0.5">
                      {isBalanced
                        ? 'Bank Ending Balance equals System Ending Balance. Ready to save or print.'
                        : 'Bank Statement and ERP System ending balances do not match. Review differences below.'}
                    </p>
                  </div>
                </div>

                {/* Values Summary Pill */}
                <div className="flex items-center gap-6 text-right">
                  <div>
                    <p className="text-[11px] uppercase tracking-wider font-semibold opacity-70">Bank End Balance</p>
                    <p className="text-lg font-bold text-slate-900">ETB {fmt(bankEndingBalance)}</p>
                  </div>
                  <div>
                    <p className="text-[11px] uppercase tracking-wider font-semibold opacity-70">System End Balance</p>
                    <p className="text-lg font-bold text-slate-900">ETB {fmt(systemEndingBalance)}</p>
                  </div>
                  <div>
                    <p className="text-[11px] uppercase tracking-wider font-semibold opacity-70">Variance</p>
                    <p
                      className={`text-lg font-extrabold ${
                        isBalanced ? 'text-emerald-700' : 'text-amber-700'
                      }`}
                    >
                      ETB {fmt(reconciliationVariance)}
                    </p>
                  </div>

                  <Button
                    variant={isBalanced ? 'primary' : 'outline'}
                    size="sm"
                    onClick={handleSaveReconciliation}
                    disabled={saving}
                    className="shadow-sm"
                  >
                    {saving ? 'Saving...' : 'Save Record'}
                  </Button>
                </div>
              </div>

              {saveSuccessMsg && (
                <div className="mt-3 pt-3 border-t border-emerald-200 text-xs font-semibold text-emerald-800">
                  ✓ {saveSuccessMsg}
                </div>
              )}
            </div>

            {/* SIDE-BY-SIDE RECONCILIATION (MATCHING BMS FORMAT) */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              {/* ================= LEFT COLUMN: BANK ================= */}
              <div className="lg:col-span-5 bg-white rounded-2xl border border-slate-200 shadow-sm p-4 sm:p-5">
                <div className="flex items-center justify-between mb-3">
                  <h2 className="text-xl font-bold text-slate-900 tracking-tight">Bank</h2>
                  <Button variant="ghost" size="sm" onClick={handleAddBankLine} className="text-xs text-blue-600">
                    <Plus className="w-3.5 h-3.5 mr-1" /> Add Line
                  </Button>
                </div>

                {/* Dark Header Banner: BEGINNING */}
                <div className="bg-[#443E3B] text-white rounded-t-lg px-4 py-2.5 flex items-center justify-between font-semibold text-sm">
                  <span className="tracking-wider text-xs">BEGINNING</span>
                  <div className="flex items-center gap-1.5">
                    <input
                      type="number"
                      step="0.01"
                      value={bankBeginning}
                      onChange={(e) => setBankBeginning(e.target.value === '' ? '' : parseFloat(e.target.value) || 0)}
                      placeholder="0.00"
                      className="w-32 bg-[#2E2A28] text-white text-right px-2 py-1 rounded text-sm font-bold border border-[#5C5551] focus:outline-none focus:ring-1 focus:ring-blue-400"
                    />
                  </div>
                </div>

                {/* Bank Table Header */}
                <div className="bg-[#5C5551] text-white grid grid-cols-12 text-xs font-bold py-2 px-3 border-t border-[#6B645F]">
                  <div className="col-span-2">#</div>
                  <div className="col-span-5 text-right">PAYMENT</div>
                  <div className="col-span-5 text-right">COLLECTION</div>
                </div>

                {/* Bank Lines */}
                <div className="divide-y divide-slate-100 min-h-[140px] text-sm">
                  {bankLines.map((line, idx) => (
                    <div
                      key={line.id}
                      className="grid grid-cols-12 items-center py-2 px-3 hover:bg-slate-50 transition-colors group"
                    >
                      <div className="col-span-2 text-xs font-medium text-slate-500 flex items-center gap-1">
                        <span>{idx + 1}</span>
                        <button
                          onClick={() => handleRemoveBankLine(line.id)}
                          className="opacity-0 group-hover:opacity-100 text-slate-400 hover:text-red-500 transition-opacity"
                          title="Remove line"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>

                      {/* Payment column input */}
                      <div className="col-span-5 text-right pr-2">
                        <input
                          type="number"
                          step="0.01"
                          value={line.payment}
                          onChange={(e) => handleUpdateBankLine(line.id, 'payment', e.target.value)}
                          placeholder="0.00"
                          className="w-full text-right bg-transparent border-b border-dashed border-slate-300 focus:border-blue-500 px-1 py-0.5 text-slate-900 font-mono text-sm focus:outline-none"
                        />
                      </div>

                      {/* Collection column input */}
                      <div className="col-span-5 text-right pl-2">
                        <input
                          type="number"
                          step="0.01"
                          value={line.collection}
                          onChange={(e) => handleUpdateBankLine(line.id, 'collection', e.target.value)}
                          placeholder="0.00"
                          className="w-full text-right bg-transparent border-b border-dashed border-slate-300 focus:border-blue-500 px-1 py-0.5 text-slate-900 font-mono text-sm focus:outline-none"
                        />
                      </div>
                    </div>
                  ))}
                </div>

                {/* Bank Totals & Difference Row (as in screenshot) */}
                <div className="mt-4 pt-3 border-t-2 border-slate-800">
                  <div className="flex items-center justify-between text-sm py-1.5 font-bold">
                    <span className="text-slate-600 font-medium">diffrence</span>
                    <span className="text-slate-900 font-mono text-base">{fmt(bankEndingBalance)}</span>
                  </div>
                </div>
              </div>

              {/* ================= RIGHT COLUMN: SYSTEM ================= */}
              <div className="lg:col-span-7 bg-white rounded-2xl border border-slate-200 shadow-sm p-4 sm:p-5">
                <div className="flex items-center justify-between mb-3">
                  <h2 className="text-xl font-bold text-slate-900 tracking-tight">system</h2>
                  <span className="text-xs text-slate-500">
                    {systemTransactions.length} transaction{systemTransactions.length === 1 ? '' : 's'} in period
                  </span>
                </div>

                {/* Dark Header Banner: SYSTEM BEGINNING */}
                <div className="bg-[#443E3B] text-white rounded-t-lg px-4 py-2.5 flex items-center justify-between font-semibold text-sm">
                  <span className="tracking-wider text-xs">SYSTEM BEGINNING</span>
                  <span className="font-bold font-mono text-sm">{fmt(systemBeginning)}</span>
                </div>

                {/* System Table Header */}
                <div className="bg-[#5C5551] text-white grid grid-cols-12 text-[11px] font-bold py-2 px-3 border-t border-[#6B645F] gap-1">
                  <div className="col-span-1">#</div>
                  <div className="col-span-2">DATE (YYYY-MM-DD)</div>
                  <div className="col-span-2">INCOME/PAY NO</div>
                  <div className="col-span-2 text-right">COLLECTION</div>
                  <div className="col-span-2 text-right">PAYMENT</div>
                  <div className="col-span-3">DESC</div>
                </div>

                {/* System Transaction Lines */}
                <div className="divide-y divide-slate-100 min-h-[140px] text-xs">
                  {loadingSystemData ? (
                    <div className="py-8 text-center text-slate-400">Loading system transactions...</div>
                  ) : systemTransactions.length === 0 ? (
                    <div className="py-8 text-center text-slate-400">
                      No system transactions found for this period.
                    </div>
                  ) : (
                    systemTransactions.map((txn, idx) => (
                      <div
                        key={txn.id}
                        className="grid grid-cols-12 items-center py-2 px-3 hover:bg-slate-50 transition-colors gap-1 font-mono text-[11px]"
                      >
                        <div className="col-span-1 text-slate-500 font-sans">{idx + 1}</div>
                        <div className="col-span-2 text-slate-700">{txn.date}</div>
                        <div className="col-span-2 text-slate-800 font-semibold truncate" title={txn.refNo}>
                          {txn.refNo || '-'}
                        </div>
                        <div className="col-span-2 text-right text-emerald-700 font-medium">
                          {txn.collection > 0 ? fmt(txn.collection) : ''}
                        </div>
                        <div className="col-span-2 text-right text-slate-900 font-medium">
                          {txn.payment > 0 ? fmt(txn.payment) : ''}
                        </div>
                        <div className="col-span-3 text-slate-600 font-sans truncate text-[11px]" title={txn.desc}>
                          {txn.desc || '-'}
                        </div>
                      </div>
                    ))
                  )}
                </div>

                {/* System Subtotals Row (as in screenshot) */}
                <div className="mt-4 pt-3 border-t-2 border-slate-300">
                  <div className="grid grid-cols-12 text-xs font-bold py-1.5 px-3">
                    <div className="col-span-5 text-right font-sans text-slate-500 uppercase text-[11px]">
                      Totals:
                    </div>
                    <div className="col-span-2 text-right font-mono text-emerald-800">
                      {fmt(systemTotalCollections)}
                    </div>
                    <div className="col-span-2 text-right font-mono text-slate-900">
                      {fmt(systemTotalPayments)}
                    </div>
                    <div className="col-span-3"></div>
                  </div>

                  {/* System Difference (Ending Balance) Row */}
                  <div className="border-t border-slate-200 mt-2 pt-2 pb-1">
                    <div className="flex items-center justify-between text-sm px-3 font-bold">
                      <span className="text-slate-600 font-medium">diffrence</span>
                      <span className="text-slate-900 font-mono text-base">{fmt(systemEndingBalance)}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ---------------- HISTORY TAB ---------------- */}
        {activeTab === 'history' && (
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <h2 className="text-lg font-bold text-slate-900">Saved Reconciliation Records</h2>
                <Button variant="outline" size="sm" onClick={fetchReconciliations}>
                  <RefreshCw className="w-4 h-4 mr-1" /> Refresh
                </Button>
              </div>
            </CardHeader>
            <CardBody>
              {loadingReconciliations ? (
                <div className="py-12 text-center text-slate-400">Loading records...</div>
              ) : reconciliations.length === 0 ? (
                <div className="py-12 text-center text-slate-400">
                  No saved reconciliations found for this account.
                </div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {reconciliations.map((rec) => {
                    const isBalancedRec = Math.abs(Number(rec.difference)) < 0.01;
                    return (
                      <div key={rec.id} className="py-4 flex flex-wrap items-center justify-between gap-4">
                        <div>
                          <div className="flex items-center gap-2.5">
                            <Badge status={isBalancedRec ? ('Active' as any) : ('Pending' as any)}>
                              {rec.status}
                            </Badge>
                            <span className="text-sm font-semibold text-slate-900">
                              {new Date(rec.periodFrom).toLocaleDateString()} —{' '}
                              {new Date(rec.periodTo).toLocaleDateString()}
                            </span>
                          </div>
                          <p className="text-xs text-slate-400 mt-1">
                            Account: {rec.bankAccount?.bankName} ({rec.bankAccount?.accountNo}) • Created{' '}
                            {new Date(rec.createdAt).toLocaleDateString()}
                          </p>
                        </div>

                        <div className="flex items-center gap-6 text-sm">
                          <div className="text-right">
                            <p className="text-xs text-slate-500">System End</p>
                            <p className="font-semibold">{fmt(rec.closingBalance)}</p>
                          </div>
                          <div className="text-right">
                            <p className="text-xs text-slate-500">Bank Statement</p>
                            <p className="font-semibold">{fmt(rec.bankStatement)}</p>
                          </div>
                          <div className="text-right">
                            <p className="text-xs text-slate-500">Variance</p>
                            <p
                              className={`font-bold ${
                                isBalancedRec ? 'text-emerald-600' : 'text-amber-600'
                              }`}
                            >
                              {fmt(rec.difference)}
                            </p>
                          </div>

                          <div className="flex items-center gap-2 pl-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setPeriodFrom(new Date(rec.periodFrom).toISOString().split('T')[0]);
                                setPeriodTo(new Date(rec.periodTo).toISOString().split('T')[0]);
                                setBankBeginning(rec.openingBalance);
                                setActiveTab('workspace');
                              }}
                            >
                              Open in Workspace
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDeleteReconciliation(rec.id)}
                              className="text-red-500 hover:text-red-700"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardBody>
          </Card>
        )}
      </div>

      {/* ----------------- BMS PRINT REPORT VIEW (Visible when window.print() or print mode) ----------------- */}
      <div className="hidden print:block font-sans text-slate-900 bg-white p-6 max-w-6xl mx-auto">
        {/* Report Metadata Header */}
        <div className="border-b pb-4 mb-6">
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-2xl font-black tracking-tight text-slate-900">SAMARIA TRADING PLC</h1>
              <p className="text-sm font-bold text-slate-600">BANK RECONCILIATION STATEMENT</p>
            </div>
            <div className="text-right text-xs">
              <p>
                <strong>Bank:</strong> {selectedAccount?.bankName} ({selectedAccount?.accountNo})
              </p>
              <p>
                <strong>Period:</strong> {periodFrom} to {periodTo}
              </p>
              <p>
                <strong>Printed on:</strong> {new Date().toLocaleDateString()}
              </p>
            </div>
          </div>
        </div>

        {/* Side by Side Print Grid */}
        <div className="grid grid-cols-2 gap-8 items-start">
          {/* Left Column: Bank */}
          <div>
            <h2 className="text-base font-bold mb-2">Bank</h2>

            {/* Dark banner: BEGINNING */}
            <div className="bg-[#443E3B] text-white px-3 py-1.5 flex justify-between font-bold text-xs">
              <span>BEGINNING</span>
              <span>{fmt(bankBeginningNum)}</span>
            </div>

            {/* Table Header */}
            <div className="bg-[#5C5551] text-white grid grid-cols-12 text-[11px] font-bold py-1.5 px-3">
              <div className="col-span-2">#</div>
              <div className="col-span-5 text-right">PAYMENT</div>
              <div className="col-span-5 text-right">COLLECTION</div>
            </div>

            {/* Bank Lines */}
            <div className="divide-y divide-slate-200 text-xs">
              {bankLines
                .filter((l) => Number(l.payment) > 0 || Number(l.collection) > 0)
                .map((line, idx) => (
                  <div key={line.id} className="grid grid-cols-12 py-1.5 px-3 font-mono text-[11px]">
                    <div className="col-span-2 font-sans">{idx + 1}</div>
                    <div className="col-span-5 text-right">{line.payment ? fmt(line.payment) : ''}</div>
                    <div className="col-span-5 text-right">{line.collection ? fmt(line.collection) : ''}</div>
                  </div>
                ))}
            </div>

            {/* Bank Difference */}
            <div className="border-t-2 border-slate-900 mt-4 pt-2">
              <div className="flex justify-between text-xs font-bold px-3">
                <span>diffrence</span>
                <span className="font-mono">{fmt(bankEndingBalance)}</span>
              </div>
            </div>
          </div>

          {/* Right Column: system */}
          <div>
            <h2 className="text-base font-bold mb-2">system</h2>

            {/* Dark banner: SYSTEM BEGINNING */}
            <div className="bg-[#443E3B] text-white px-3 py-1.5 flex justify-between font-bold text-xs">
              <span>SYSTEM BEGINNING</span>
              <span>{fmt(systemBeginning)}</span>
            </div>

            {/* Table Header */}
            <div className="bg-[#5C5551] text-white grid grid-cols-12 text-[10px] font-bold py-1.5 px-2">
              <div className="col-span-1">#</div>
              <div className="col-span-3">DATE (YYYY-MM-DD)</div>
              <div className="col-span-2">INCOME/PAY NO</div>
              <div className="col-span-2 text-right">COLLECTION</div>
              <div className="col-span-2 text-right">PAYMENT</div>
              <div className="col-span-2">DESC</div>
            </div>

            {/* System Lines */}
            <div className="divide-y divide-slate-200 text-xs">
              {systemTransactions.map((txn, idx) => (
                <div key={txn.id} className="grid grid-cols-12 py-1 px-2 font-mono text-[10px]">
                  <div className="col-span-1 font-sans">{idx + 1}</div>
                  <div className="col-span-3">{txn.date}</div>
                  <div className="col-span-2 truncate">{txn.refNo || '-'}</div>
                  <div className="col-span-2 text-right">{txn.collection > 0 ? fmt(txn.collection) : ''}</div>
                  <div className="col-span-2 text-right">{txn.payment > 0 ? fmt(txn.payment) : ''}</div>
                  <div className="col-span-2 font-sans truncate text-[9px]">{txn.desc || '-'}</div>
                </div>
              ))}
            </div>

            {/* System Totals */}
            <div className="border-t-2 border-slate-400 mt-3 pt-1.5">
              <div className="grid grid-cols-12 text-[10px] font-bold px-2 py-1">
                <div className="col-span-6 text-right">Totals:</div>
                <div className="col-span-2 text-right font-mono">{fmt(systemTotalCollections)}</div>
                <div className="col-span-2 text-right font-mono">{fmt(systemTotalPayments)}</div>
                <div className="col-span-2"></div>
              </div>

              {/* System Difference */}
              <div className="border-t border-slate-300 mt-1 pt-1.5">
                <div className="flex justify-between text-xs font-bold px-2">
                  <span>diffrence</span>
                  <span className="font-mono">{fmt(systemEndingBalance)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Verification / Signatures Footer */}
        <div className="mt-12 pt-6 border-t border-slate-300 grid grid-cols-3 gap-8 text-center text-xs">
          <div>
            <p className="border-b border-slate-400 pb-8 mb-1"></p>
            <p className="font-bold">Prepared By</p>
          </div>
          <div>
            <p className="border-b border-slate-400 pb-8 mb-1"></p>
            <p className="font-bold">Checked By</p>
          </div>
          <div>
            <p className="border-b border-slate-400 pb-8 mb-1"></p>
            <p className="font-bold">Approved By</p>
          </div>
        </div>
      </div>
    </div>
  );
}
