'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Card, CardHeader, CardBody, Button, Input, Select } from '@/components/ui';

interface BankAccount {
  id: string;
  bankName: string;
  accountNo: string;
  accountName: string;
  balance: number;
}

export default function NewBankTransactionPage() {
  const router = useRouter();
  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([]);
  const [loadingAccounts, setLoadingAccounts] = useState(true);

  const [bankAccountId, setBankAccountId] = useState('');
  const [destinationBankAccountId, setDestinationBankAccountId] = useState('');
  const [type, setType] = useState('');
  const [amount, setAmount] = useState('');
  const [refNo, setRefNo] = useState('');
  const [description, setDescription] = useState('');
  const [transDate, setTransDate] = useState(new Date().toISOString().split('T')[0]);
  const [loading, setLoading] = useState(false);

  // Aggregate delivery settlement
  const [linkToAggregate, setLinkToAggregate] = useState(false);
  const [aggregateDeliveries, setAggregateDeliveries] = useState<{ id: string; label: string; amount: number }[]>([]);
  const [selectedDeliveryIds, setSelectedDeliveryIds] = useState<Set<string>>(new Set());
  const [loadingDeliveries, setLoadingDeliveries] = useState(false);

  const selectedAccount = bankAccounts.find(b => b.id === bankAccountId);
  const selectedDestAccount = bankAccounts.find(b => b.id === destinationBankAccountId);
  const destinationOptions = bankAccounts.filter(b => b.id !== bankAccountId);

  useEffect(() => {
    fetch('/api/finance/bank?limit=50&status=Active')
      .then(r => r.json())
      .then(json => {
        if (json.success) setBankAccounts(json.data || []);
      })
      .catch(console.error)
      .finally(() => setLoadingAccounts(false));
  }, []);

  // Fetch verified aggregate deliveries when linking is enabled
  useEffect(() => {
    if (!linkToAggregate) {
      setAggregateDeliveries([]);
      setSelectedDeliveryIds(new Set());
      return;
    }
    setLoadingDeliveries(true);
    fetch('/api/aggregate?limit=500')
      .then(r => r.json())
      .then(json => {
        if (json.success) {
          const verified = (json.data || []).filter((d: any) => d.status === 'Verified');
          setAggregateDeliveries(verified.map((d: any) => ({
            id: d.id,
            label: `${d.dispatchNo} — ${d.transporter?.companyName || 'Unknown'} — Truck: ${d.truck?.plateNo || 'N/A'}`,
            amount: d.netTruckPayment || 0,
          })));
        }
      })
      .catch(console.error)
      .finally(() => setLoadingDeliveries(false));
  }, [linkToAggregate]);

  const handleDeliveryToggle = (deliveryId: string) => {
    setSelectedDeliveryIds((prev) => {
      const next = new Set(prev);
      if (next.has(deliveryId)) {
        next.delete(deliveryId);
      } else {
        next.add(deliveryId);
      }
      // Auto-fill amount
      const total = aggregateDeliveries.filter((d) => next.has(d.id)).reduce((s, d) => s + d.amount, 0);
      if (total > 0) setAmount(String(Math.round(total * 100) / 100));
      return next;
    });
  };

  const handleSelectAllDeliveries = () => {
    if (selectedDeliveryIds.size === aggregateDeliveries.length) {
      setSelectedDeliveryIds(new Set());
      setAmount('');
    } else {
      const allIds = new Set(aggregateDeliveries.map((d) => d.id));
      const total = aggregateDeliveries.reduce((s, d) => s + d.amount, 0);
      setSelectedDeliveryIds(allIds);
      setAmount(String(Math.round(total * 100) / 100));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!bankAccountId || !type || !amount || !transDate) {
      alert('Please fill in all required fields');
      return;
    }

    if (type === 'transfer' && !destinationBankAccountId) {
      alert('Please select a destination bank account for the transfer');
      return;
    }

    setLoading(true);
    try {
      const payload: any = {
        bankAccountId,
        type,
        amount: parseFloat(amount),
        refNo: refNo || null,
        description: description || null,
        transDate,
      };

      if (type === 'transfer') {
        payload.destinationBankAccountId = destinationBankAccountId;
      }

      // Link to aggregate deliveries for settlement
      if (linkToAggregate && selectedDeliveryIds.size > 0) {
        payload.refModule = 'AGGREGATE_SETTLEMENT';
        payload.refId = Array.from(selectedDeliveryIds).join(',');
      }

      const response = await fetch('/api/finance/bank/transactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const result = await response.json();
      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Failed to save bank transaction');
      }

      alert('Bank transaction saved successfully!');
      router.push('/dashboard/finance/bank');
    } catch (error) {
      alert('Error: ' + (error instanceof Error ? error.message : 'Unknown error'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl sm:text-3xl font-bold text-[#1D1D1F]">New Bank Transaction</h1>
        <Link href="/dashboard/finance/bank">
          <Button variant="outline">Cancel</Button>
        </Link>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card>
          <CardHeader>
            <h2 className="text-lg font-semibold text-[#1D1D1F]">Transaction Details</h2>
          </CardHeader>
          <CardBody className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Bank Account *</label>
                <select
                  value={bankAccountId}
                  onChange={(e) => setBankAccountId(e.target.value)}
                  className="block w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                  required
                >
                  <option value="">Select Bank Account</option>
                  {bankAccounts.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.bankName} — {b.accountNo} ({b.accountName}) — Balance: ETB {b.balance?.toLocaleString('en-US')}
                    </option>
                  ))}
                </select>
                {loadingAccounts && <p className="text-blue-600 text-xs mt-1">Loading accounts...</p>}
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Transaction Type *</label>
                <Select
                  value={type}
                  onChange={(e) => {
                    setType(e.target.value);
                    if (e.target.value !== 'transfer') {
                      setDestinationBankAccountId('');
                    }
                  }}
                  options={[
                    { value: '', label: 'Select Type' },
                    { value: 'deposit', label: 'Deposit' },
                    { value: 'withdrawal', label: 'Withdrawal' },
                    { value: 'transfer', label: 'Transfer' },
                  ]}
                />
              </div>
            </div>

            {type === 'transfer' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Destination Bank Account *</label>
                  <select
                    value={destinationBankAccountId}
                    onChange={(e) => setDestinationBankAccountId(e.target.value)}
                    className="block w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                    required
                  >
                    <option value="">Select Destination Account</option>
                    {destinationOptions.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.bankName} — {b.accountNo} ({b.accountName}) — Balance: ETB {b.balance?.toLocaleString('en-US')}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="flex items-end">
                  <div className="w-full space-y-1">
                    {selectedAccount && (
                      <p className="text-sm text-slate-600">
                        Source Balance: <span className="font-semibold text-slate-900">ETB {selectedAccount.balance?.toLocaleString('en-US')}</span>
                      </p>
                    )}
                    {selectedDestAccount && (
                      <p className="text-sm text-slate-600">
                        Destination Balance: <span className="font-semibold text-slate-900">ETB {selectedDestAccount.balance?.toLocaleString('en-US')}</span>
                      </p>
                    )}
                  </div>
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Amount (ETB) *</label>
                <input
                  type="number"
                  min="0.01"
                  step="0.01"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="block w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                  placeholder="e.g., 10000.00"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Transaction Date *</label>
                <input
                  type="date"
                  value={transDate}
                  onChange={(e) => setTransDate(e.target.value)}
                  className="block w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Reference Number</label>
                <Input
                  placeholder="e.g., CHQ-001 or TXN-001"
                  value={refNo}
                  onChange={(e) => setRefNo(e.target.value)}
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Description</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="block w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 min-h-24 resize-vertical"
                placeholder="Enter transaction description"
                rows={3}
              />
            </div>

            {type === 'withdrawal' && (
              <div className="border-t pt-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={linkToAggregate}
                    onChange={(e) => setLinkToAggregate(e.target.checked)}
                    className="w-4 h-4 rounded"
                  />
                  <span className="text-sm font-medium text-slate-700">
                    Link to Aggregate Deliveries (auto-settle on payment)
                  </span>
                </label>

                {linkToAggregate && (
                  <div className="mt-3 border border-slate-300 rounded-xl overflow-hidden bg-white">
                    <div className="px-4 py-2 bg-gray-50 border-b flex items-center justify-between">
                      <label className="flex items-center gap-2 cursor-pointer text-sm">
                        <input
                          type="checkbox"
                          checked={selectedDeliveryIds.size === aggregateDeliveries.length && aggregateDeliveries.length > 0}
                          onChange={handleSelectAllDeliveries}
                          className="w-4 h-4 rounded"
                        />
                        <span className="font-medium">Select All ({aggregateDeliveries.length} verified)</span>
                      </label>
                      {selectedDeliveryIds.size > 0 && (
                        <span className="text-sm text-blue-600 font-medium">
                          Total: ETB {aggregateDeliveries.filter((d) => selectedDeliveryIds.has(d.id)).reduce((s, d) => s + d.amount, 0).toLocaleString('en-US', { maximumFractionDigits: 2 })}
                        </span>
                      )}
                    </div>
                    {loadingDeliveries ? (
                      <p className="px-4 py-3 text-sm text-slate-500">Loading deliveries...</p>
                    ) : aggregateDeliveries.length === 0 ? (
                      <p className="px-4 py-3 text-sm text-slate-500">No verified deliveries pending settlement.</p>
                    ) : (
                      <div className="max-h-60 overflow-y-auto">
                        {aggregateDeliveries.map((d) => (
                          <label key={d.id} className="flex items-center gap-3 px-4 py-2.5 hover:bg-blue-50 cursor-pointer border-b border-gray-100 last:border-0">
                            <input
                              type="checkbox"
                              checked={selectedDeliveryIds.has(d.id)}
                              onChange={() => handleDeliveryToggle(d.id)}
                              className="w-4 h-4 rounded"
                            />
                            <span className="flex-1 text-sm font-medium">{d.label}</span>
                            <span className="text-sm text-gray-600">ETB {d.amount.toLocaleString('en-US', { maximumFractionDigits: 2 })}</span>
                          </label>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </CardBody>
        </Card>

        {/* Summary */}
        <Card>
          <CardHeader>
            <h2 className="text-lg font-semibold text-[#1D1D1F]">Transaction Summary</h2>
          </CardHeader>
          <CardBody>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-slate-600">{type === 'transfer' ? 'Source Account:' : 'Bank Account:'}</span>
                <span className="font-medium">{selectedAccount ? `${selectedAccount.bankName} — ${selectedAccount.accountNo}` : '—'}</span>
              </div>
              {type === 'transfer' && (
                <div className="flex justify-between">
                  <span className="text-slate-600">Destination Account:</span>
                  <span className="font-medium">{selectedDestAccount ? `${selectedDestAccount.bankName} — ${selectedDestAccount.accountNo}` : '—'}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-slate-600">Type:</span>
                <span className="font-medium capitalize">{type || '—'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-600">Reference:</span>
                <span className="font-medium">{refNo || '—'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-600">Date:</span>
                <span className="font-medium">{transDate}</span>
              </div>
              <div className="border-t pt-2 flex justify-between">
                <span className="text-slate-900 font-semibold">Amount:</span>
                <span className="text-xl font-bold text-slate-900">
                  ETB {amount ? parseFloat(amount).toLocaleString('en-US', { minimumFractionDigits: 2 }) : '0.00'}
                </span>
              </div>
            </div>
          </CardBody>
        </Card>

        <div className="flex gap-3">
          <Button variant="primary" size="lg" type="submit" isLoading={loading} className="flex-1">
            Save Transaction
          </Button>
          <Link href="/dashboard/finance/bank" className="flex-1">
            <Button variant="outline" size="lg" className="w-full">Cancel</Button>
          </Link>
        </div>
      </form>
    </div>
  );
}
