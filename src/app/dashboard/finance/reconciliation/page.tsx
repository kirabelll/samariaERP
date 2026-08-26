'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardBody, CardHeader, Button, Input, Badge } from '@/components/ui';
import { CheckSquare, Plus, RefreshCw } from 'lucide-react';

interface BankAccount {
  id: string;
  bankName: string;
  accountNo: string;
  accountName: string;
  balance: number;
}

interface ReconciliationItem {
  id: string;
  description: string;
  bookAmount: number;
  bankAmount: number;
  status: string;
  transactionId: string | null;
}

interface Reconciliation {
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
  items?: ReconciliationItem[];
}

export default function ReconciliationPage() {
  const [selectedAccount, setSelectedAccount] = useState('');
  const [accounts, setAccounts] = useState<BankAccount[]>([]);
  const [reconciliations, setReconciliations] = useState<Reconciliation[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // New reconciliation form
  const [showForm, setShowForm] = useState(false);
  const [formLoading, setFormLoading] = useState(false);
  const [formData, setFormData] = useState({
    periodFrom: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    periodTo: new Date().toISOString().split('T')[0],
    bankStatement: '',
  });

  useEffect(() => {
    fetchBankAccounts();
  }, []);

  useEffect(() => {
    if (selectedAccount) {
      fetchReconciliations();
    }
  }, [selectedAccount]);

  const fetchBankAccounts = async () => {
    try {
      const response = await fetch('/api/finance/bank?limit=50');
      const result = await response.json();
      const data = result.data || [];
      setAccounts(data);
      if (data.length > 0) {
        setSelectedAccount(data[0].id);
      }
    } catch (err: any) {
      console.error('Failed to fetch bank accounts:', err.message);
    }
  };

  const fetchReconciliations = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/finance/reconciliation?bankAccountId=${selectedAccount}&limit=20`);
      const result = await response.json();
      if (result.success) {
        setReconciliations(result.data || []);
      } else {
        setError(result.error || 'Failed to fetch reconciliations');
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateReconciliation = async () => {
    if (!selectedAccount || !formData.periodFrom || !formData.periodTo) {
      alert('Please select a bank account and date range');
      return;
    }

    const account = accounts.find(a => a.id === selectedAccount);
    setFormLoading(true);
    try {
      const response = await fetch('/api/finance/reconciliation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bankAccountId: selectedAccount,
          periodFrom: formData.periodFrom,
          periodTo: formData.periodTo,
          openingBalance: account?.balance || 0,
          closingBalance: account?.balance || 0,
          bankStatement: parseFloat(formData.bankStatement) || 0,
          difference: (account?.balance || 0) - (parseFloat(formData.bankStatement) || 0),
        }),
      });
      const result = await response.json();
      if (result.success) {
        setShowForm(false);
        setFormData({
          periodFrom: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          periodTo: new Date().toISOString().split('T')[0],
          bankStatement: '',
        });
        fetchReconciliations();
      } else {
        alert(result.error || 'Failed to create reconciliation');
      }
    } catch {
      alert('Failed to create reconciliation');
    }
    setFormLoading(false);
  };

  const fmt = (val: number) =>
    `ETB ${Number(val || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  const selectedAccountData = accounts.find(a => a.id === selectedAccount);

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex flex-wrap gap-3 items-center justify-between">
        <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-[#1D1D1F] flex items-center gap-2">
          <CheckSquare className="w-7 h-7 text-[#007AFF]" />
          Bank Reconciliation
        </h1>
        <Button variant="primary" size="sm" onClick={() => setShowForm(!showForm)}>
          <Plus className="w-4 h-4 mr-1" /> New Reconciliation
        </Button>
      </div>

      {/* Bank Account Selector */}
      <Card>
        <CardBody>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Bank Account</label>
              <select
                value={selectedAccount}
                onChange={(e) => setSelectedAccount(e.target.value)}
                className="block w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
              >
                <option value="">Select Bank Account</option>
                {accounts.map((account) => (
                  <option key={account.id} value={account.id}>
                    {account.bankName} — {account.accountNo} ({account.accountName})
                  </option>
                ))}
              </select>
            </div>
            {selectedAccountData && (
              <div className="flex items-end">
                <div className="bg-blue-50 rounded-xl px-4 py-3 w-full">
                  <p className="text-xs text-blue-600 uppercase font-medium">Current Book Balance</p>
                  <p className="text-xl font-bold text-blue-900">{fmt(selectedAccountData.balance)}</p>
                </div>
              </div>
            )}
          </div>
        </CardBody>
      </Card>

      {/* New Reconciliation Form */}
      {showForm && (
        <Card className="border-2 border-blue-200">
          <CardHeader>
            <h2 className="text-lg font-semibold text-[#1D1D1F]">Create New Reconciliation</h2>
          </CardHeader>
          <CardBody className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Period From *</label>
                <input
                  type="date"
                  value={formData.periodFrom}
                  onChange={(e) => setFormData({ ...formData, periodFrom: e.target.value })}
                  className="block w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Period To *</label>
                <input
                  type="date"
                  value={formData.periodTo}
                  onChange={(e) => setFormData({ ...formData, periodTo: e.target.value })}
                  className="block w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Bank Statement Balance (ETB)</label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.bankStatement}
                  onChange={(e) => setFormData({ ...formData, bankStatement: e.target.value })}
                  placeholder="Enter bank statement closing balance"
                  className="block w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                />
              </div>
            </div>
            {selectedAccountData && formData.bankStatement && (
              <div className={`rounded-xl px-4 py-3 ${
                Math.abs(selectedAccountData.balance - parseFloat(formData.bankStatement)) < 1 ? 'bg-green-50' : 'bg-amber-50'
              }`}>
                <p className="text-sm font-medium">
                  Difference: <strong>{fmt(selectedAccountData.balance - parseFloat(formData.bankStatement))}</strong>
                  {Math.abs(selectedAccountData.balance - parseFloat(formData.bankStatement)) < 1
                    ? ' — Balanced'
                    : ' — Needs reconciliation'}
                </p>
              </div>
            )}
            <div className="flex gap-3">
              <Button variant="primary" onClick={handleCreateReconciliation} disabled={formLoading}>
                {formLoading ? 'Creating...' : 'Create & Auto-Populate Items'}
              </Button>
              <Button variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
            </div>
          </CardBody>
        </Card>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-red-800 text-sm">{error}</div>
      )}

      {/* Reconciliation List */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-semibold text-[#1D1D1F]">Reconciliation Records</h2>
            <Button variant="outline" size="sm" onClick={fetchReconciliations}>
              <RefreshCw className="w-4 h-4 mr-1" /> Refresh
            </Button>
          </div>
        </CardHeader>
        <CardBody>
          {loading ? (
            <div className="py-12 text-center text-slate-500">Loading reconciliations...</div>
          ) : !selectedAccount ? (
            <div className="py-12 text-center text-slate-500">Select a bank account to view reconciliations</div>
          ) : reconciliations.length === 0 ? (
            <div className="py-12 text-center text-slate-500">
              No reconciliation records found for this account.
              <br />
              <button onClick={() => setShowForm(true)} className="text-[#007AFF] hover:text-[#0055D4] font-medium mt-2 inline-block">
                Create your first reconciliation
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {reconciliations.map((rec) => (
                <div key={rec.id} className="border border-slate-200 rounded-xl p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <Badge status={rec.status === 'Completed' ? 'Active' : rec.status === 'Draft' ? 'Pending' : 'Lifted' as any}>
                          {rec.status}
                        </Badge>
                        <span className="text-sm text-slate-500">
                          {new Date(rec.periodFrom).toLocaleDateString()} — {new Date(rec.periodTo).toLocaleDateString()}
                        </span>
                      </div>
                      <p className="text-xs text-slate-400 mt-1">Created {new Date(rec.createdAt).toLocaleDateString()}</p>
                    </div>
                    <div className="grid grid-cols-3 gap-4 text-right text-sm">
                      <div>
                        <p className="text-xs text-slate-500">Book Balance</p>
                        <p className="font-semibold">{fmt(rec.closingBalance)}</p>
                      </div>
                      <div>
                        <p className="text-xs text-slate-500">Bank Statement</p>
                        <p className="font-semibold">{fmt(rec.bankStatement)}</p>
                      </div>
                      <div>
                        <p className="text-xs text-slate-500">Difference</p>
                        <p className={`font-bold ${Math.abs(Number(rec.difference)) < 1 ? 'text-green-600' : 'text-amber-600'}`}>
                          {fmt(rec.difference)}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Items */}
                  {rec.items && rec.items.length > 0 && (
                    <div className="mt-3 border-t pt-3">
                      <p className="text-xs font-medium text-slate-600 mb-2">{rec.items.length} reconciliation items</p>
                      <div className="space-y-1">
                        {rec.items.slice(0, 5).map((item) => (
                          <div key={item.id} className="flex justify-between text-sm bg-slate-50 rounded-lg px-3 py-2">
                            <span className="text-slate-700">{item.description}</span>
                            <div className="flex items-center gap-3">
                              <span className="text-slate-600">Book: {fmt(item.bookAmount)}</span>
                              <span className="text-slate-600">Bank: {fmt(item.bankAmount)}</span>
                              <Badge status={item.status === 'Reconciled' ? 'Active' : 'Pending' as any}>
                                {item.status}
                              </Badge>
                            </div>
                          </div>
                        ))}
                        {rec.items.length > 5 && (
                          <p className="text-xs text-slate-400 text-center">+ {rec.items.length - 5} more items</p>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardBody>
      </Card>
    </div>
  );
}
