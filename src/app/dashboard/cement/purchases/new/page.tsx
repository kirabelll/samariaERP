'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Card, CardHeader, CardBody, Button, Input, Select } from '@/components/ui';
import { AlertTriangle, Banknote, CheckCircle } from 'lucide-react';

interface BankBalanceInfo {
  id: string;
  bankName: string;
  accountNo: string;
  accountName: string;
  balance: number;
  committedFunds: number;
  availableBalance: number;
  currency: string;
}

export default function NewCementPurchasePage() {
  const router = useRouter();
  const [factories, setFactories] = useState<{ value: string; label: string }[]>([]);
  const [factory, setFactory] = useState('');
  const [cementType, setCementType] = useState('');
  const [quantity, setQuantity] = useState('');
  const [unitPrice, setUnitPrice] = useState('');
  const [includeVat, setIncludeVat] = useState(false);
  const [purchaseDate, setPurchaseDate] = useState(new Date().toISOString().split('T')[0]);
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);

  // Bank accounts state
  const [bankAccounts, setBankAccounts] = useState<BankBalanceInfo[]>([]);
  const [selectedBankId, setSelectedBankId] = useState('');
  const [bankLoading, setBankLoading] = useState(true);
  const [isCredit, setIsCredit] = useState(false);
  const [creditConfirmed, setCreditConfirmed] = useState(false);

  // Selected bank info (derived)
  const selectedBank = bankAccounts.find((b) => b.id === selectedBankId) || null;

  useEffect(() => {
    fetch('/api/factories?limit=50')
      .then((r) => r.json())
      .then((json) => {
        if (json.success && json.data) {
          setFactories(json.data.map((f: any) => ({ value: f.id, label: f.name })));
        }
      })
      .catch(console.error);

    // Fetch all active bank accounts
    fetch('/api/finance/bank-balance')
      .then((r) => r.json())
      .then((json) => {
        if (json.success) {
          const accounts = json.accounts || [];
          setBankAccounts(accounts);
          // Auto-select default (CBE or first)
          if (json.data?.id) {
            setSelectedBankId(json.data.id);
          } else if (accounts.length > 0) {
            setSelectedBankId(accounts[0].id);
          }
        }
      })
      .catch(console.error)
      .finally(() => setBankLoading(false));
  }, []);

  const subtotal = quantity && unitPrice
    ? parseFloat(quantity) * parseFloat(unitPrice)
    : 0;
  const vatAmount = includeVat ? subtotal * 0.15 : 0;
  const grandTotal = subtotal + vatAmount;

  const insufficientBalance = selectedBank ? grandTotal > selectedBank.balance : false;
  const canSubmit = !insufficientBalance || (isCredit && creditConfirmed);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!factory || !cementType || !quantity || !unitPrice) {
      alert('Please fill in all required fields');
      return;
    }

    if (!selectedBankId) {
      alert('Please select a bank account');
      return;
    }

    if (insufficientBalance && !isCredit) {
      alert('Insufficient bank balance. Enable credit purchase to proceed.');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/api/cement/purchases', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          factoryId: factory,
          cementType,
          quantityTons: parseFloat(quantity),
          unitPrice: parseFloat(unitPrice),
          totalAmount: grandTotal,
          vatRate: includeVat ? 15 : 0,
          vatAmount: vatAmount,
          paymentDate: purchaseDate,
          status: 'Pending',
          isCredit: isCredit,
          bankAccountId: selectedBankId,
        }),
      });

      const data = await response.json();
      if (!response.ok || !data.success) {
        if (data.error === 'INSUFFICIENT_BALANCE') {
          alert(data.message);
          return;
        }
        throw new Error(data.error || 'Failed to save cement purchase');
      }

      const creditNote = isCredit ? ' (CREDIT PURCHASE)' : '';
      alert(`Cement purchase created successfully!${creditNote} Status: Pending (awaiting Finance check).`);
      router.push('/dashboard/cement');
    } catch (error) {
      alert('Error: ' + (error instanceof Error ? error.message : 'Unknown error'));
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (val: number) =>
    `ETB ${val.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-center justify-between">
        <div>
          <button
            onClick={() => router.push('/dashboard/cement')}
            className="text-blue-600 hover:text-blue-800 text-sm font-medium mb-2 block"
          >
            &larr; Back to Cement Operations
          </button>
          <h1 className="text-2xl sm:text-3xl font-bold text-[#1D1D1F]">New Cement Purchase</h1>
          <p className="text-slate-500 text-sm mt-1">Created by Procurement, checked by Finance, approved by Manager</p>
        </div>
      </div>

      {/* Bank Account Selection & Balance Card */}
      <Card className={insufficientBalance && grandTotal > 0 ? 'border-2 border-red-300' : 'border-2 border-green-200'}>
        <CardBody className="py-4">
          <div className="flex items-center gap-3 mb-3">
            <Banknote className="w-5 h-5 text-[#007AFF]" />
            <h3 className="font-semibold text-[#1D1D1F]">Payment Bank Account</h3>
          </div>
          {bankLoading ? (
            <p className="text-sm text-slate-500">Loading bank accounts...</p>
          ) : bankAccounts.length === 0 ? (
            <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 text-sm text-amber-800">
              <strong>No active bank accounts found.</strong> Please add bank accounts in Finance &gt; Bank Accounts before creating purchases.
            </div>
          ) : (
            <>
              {/* Bank Account Selector */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-slate-700 mb-1">Select Bank Account *</label>
                <select
                  value={selectedBankId}
                  onChange={(e) => setSelectedBankId(e.target.value)}
                  className="block w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                >
                  <option value="">-- Select Bank Account --</option>
                  {bankAccounts.map((acc) => (
                    <option key={acc.id} value={acc.id}>
                      {acc.bankName} — {acc.accountNo} ({acc.accountName}) — Balance: {formatCurrency(acc.balance)}
                    </option>
                  ))}
                </select>
              </div>

              {/* Selected Account Balance Display */}
              {selectedBank && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="bg-slate-50 rounded-xl px-4 py-3">
                    <p className="text-xs text-slate-500 uppercase font-medium">Bank</p>
                    <p className="text-sm font-medium text-[#1D1D1F]">{selectedBank.bankName}</p>
                    <p className="text-xs text-slate-400 font-mono">{selectedBank.accountNo}</p>
                  </div>
                  <div className="bg-slate-50 rounded-xl px-4 py-3">
                    <p className="text-xs text-slate-500 uppercase font-medium">Current Balance</p>
                    <p className="text-lg font-bold text-[#1D1D1F]">{formatCurrency(selectedBank.balance)}</p>
                    {selectedBank.committedFunds > 0 && (
                      <p className="text-xs text-amber-600">Committed: {formatCurrency(selectedBank.committedFunds)}</p>
                    )}
                  </div>
                  <div className={`rounded-xl px-4 py-3 ${
                    grandTotal > 0 && insufficientBalance ? 'bg-red-50' : 'bg-green-50'
                  }`}>
                    <p className="text-xs text-slate-500 uppercase font-medium">After This Purchase</p>
                    {grandTotal > 0 ? (
                      <>
                        <p className={`text-lg font-bold ${insufficientBalance ? 'text-red-600' : 'text-green-700'}`}>
                          {formatCurrency(selectedBank.balance - grandTotal)}
                        </p>
                        {insufficientBalance && (
                          <p className="text-xs text-red-600 font-medium flex items-center gap-1">
                            <AlertTriangle className="w-3 h-3" />
                            Short by {formatCurrency(grandTotal - selectedBank.balance)}
                          </p>
                        )}
                      </>
                    ) : (
                      <p className="text-sm text-slate-400">Enter purchase amount</p>
                    )}
                  </div>
                </div>
              )}
            </>
          )}
        </CardBody>
      </Card>

      {/* Insufficient Balance Warning + Credit Option */}
      {insufficientBalance && grandTotal > 0 && selectedBank && (
        <Card className="border-2 border-amber-300 bg-amber-50">
          <CardBody className="py-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-6 h-6 text-amber-600 shrink-0 mt-0.5" />
              <div className="flex-1">
                <h3 className="font-semibold text-amber-900">Insufficient Bank Balance</h3>
                <p className="text-sm text-amber-800 mt-1">
                  The purchase total of <strong>{formatCurrency(grandTotal)}</strong> exceeds the available balance of <strong>{formatCurrency(selectedBank.balance)}</strong> in {selectedBank.bankName} ({selectedBank.accountNo}).
                  You are short by <strong>{formatCurrency(grandTotal - selectedBank.balance)}</strong>.
                </p>
                <p className="text-xs text-amber-700 mt-2">
                  Tip: You can select a different bank account above, or proceed as credit.
                </p>
                <div className="mt-4">
                  <label className="flex items-center gap-3 cursor-pointer bg-white rounded-xl px-4 py-3 border border-amber-300 hover:border-amber-400 transition-colors">
                    <input
                      type="checkbox"
                      checked={isCredit}
                      onChange={(e) => {
                        setIsCredit(e.target.checked);
                        if (!e.target.checked) setCreditConfirmed(false);
                      }}
                      className="w-5 h-5 rounded border-amber-400 text-amber-600 focus:ring-amber-500"
                    />
                    <div>
                      <span className="text-sm font-semibold text-amber-900">Proceed as Credit Purchase</span>
                      <p className="text-xs text-amber-700">This purchase will be marked as credit. Finance will need to arrange payment.</p>
                    </div>
                  </label>

                  {isCredit && (
                    <label className="flex items-center gap-3 cursor-pointer bg-white rounded-xl px-4 py-3 border border-red-300 mt-2">
                      <input
                        type="checkbox"
                        checked={creditConfirmed}
                        onChange={(e) => setCreditConfirmed(e.target.checked)}
                        className="w-5 h-5 rounded border-red-400 text-red-600 focus:ring-red-500"
                      />
                      <div>
                        <span className="text-sm font-semibold text-red-800">I confirm this credit purchase is authorized</span>
                        <p className="text-xs text-red-600">Manager/Finance approval is required for credit purchases</p>
                      </div>
                    </label>
                  )}
                </div>
              </div>
            </div>
          </CardBody>
        </Card>
      )}

      {/* Sufficient Balance Indicator */}
      {!insufficientBalance && grandTotal > 0 && selectedBank && (
        <div className="flex items-center gap-2 text-sm text-green-700 bg-green-50 border border-green-200 rounded-lg px-4 py-2">
          <CheckCircle className="w-4 h-4" />
          Sufficient balance in {selectedBank.bankName} ({selectedBank.accountNo}) for this purchase
        </div>
      )}

      <form onSubmit={handleSubmit}>
        {/* Purchase Details */}
        <Card>
          <CardHeader>
            <h2 className="text-lg font-semibold text-[#1D1D1F]">Purchase Details</h2>
          </CardHeader>
          <CardBody className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Factory *</label>
                <select
                  value={factory}
                  onChange={(e) => setFactory(e.target.value)}
                  className="block w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                  required
                >
                  <option value="">Select Factory</option>
                  {factories.map((f) => (
                    <option key={f.value} value={f.value}>{f.label}</option>
                  ))}
                </select>
                {factories.length === 0 && (
                  <p className="text-amber-600 text-xs mt-1">Loading factories...</p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Cement Type *</label>
                <Select
                  value={cementType}
                  onChange={(e) => setCementType(e.target.value)}
                  options={[
                    { value: '', label: 'Select Type' },
                    { value: 'OPC', label: 'OPC (Ordinary Portland Cement)' },
                    { value: 'PPC', label: 'PPC (Portland Pozzolana Cement)' },
                    { value: 'White', label: 'White Cement' },
                  ]}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Quantity (QT) *</label>
                <input
                  type="number"
                  min="1"
                  step="1"
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                  className="block w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                  placeholder="e.g., 500"
                  required
                />
                <p className="text-xs text-slate-500 mt-1">Enter quantity in Quintals</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Unit Price per QT (excluding VAT) *</label>
                <input
                  type="number"
                  min="0.01"
                  step="0.01"
                  value={unitPrice}
                  onChange={(e) => setUnitPrice(e.target.value)}
                  className="block w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                  placeholder="e.g., 420.00"
                  required
                />
                <p className="text-xs text-slate-500 mt-1">Price per quintal before VAT</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Purchase Date *</label>
                <input
                  type="date"
                  value={purchaseDate}
                  onChange={(e) => setPurchaseDate(e.target.value)}
                  className="block w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                  required
                />
              </div>
              <div className="flex items-end">
                <label className="flex items-center gap-3 cursor-pointer bg-slate-50 rounded-xl px-4 py-3 w-full border border-slate-200">
                  <input
                    type="checkbox"
                    checked={includeVat}
                    onChange={(e) => setIncludeVat(e.target.checked)}
                    className="w-5 h-5 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                  />
                  <div>
                    <span className="text-sm font-medium text-slate-700">Include 15% VAT</span>
                    <p className="text-xs text-slate-500">Check if factory charges VAT</p>
                  </div>
                </label>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Notes (Optional)</label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={2}
                className="block w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                placeholder="Any additional notes about this purchase..."
              />
            </div>
          </CardBody>
        </Card>

        {/* Cost Summary */}
        <Card className="mt-6">
          <CardHeader>
            <h2 className="text-lg font-semibold text-[#1D1D1F]">Cost Summary</h2>
          </CardHeader>
          <CardBody>
            <div className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-slate-600">Quantity:</span>
                <span className="font-medium">{quantity || '0'} QT</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-600">Unit Price (excl. VAT):</span>
                <span className="font-medium">{formatCurrency(parseFloat(unitPrice) || 0)} / QT</span>
              </div>
              <div className="flex justify-between text-sm border-t pt-2">
                <span className="text-slate-600">Subtotal:</span>
                <span className="font-medium">{formatCurrency(subtotal)}</span>
              </div>
              {includeVat && (
                <div className="flex justify-between text-sm">
                  <span className="text-slate-600">VAT (15%):</span>
                  <span className="font-medium text-amber-700">{formatCurrency(vatAmount)}</span>
                </div>
              )}
              <div className="border-t pt-3 flex justify-between">
                <span className="text-[#1D1D1F] font-semibold text-lg">Grand Total:</span>
                <span className="text-2xl font-bold text-[#1D1D1F]">
                  {formatCurrency(grandTotal)}
                </span>
              </div>
              {selectedBank && (
                <div className="text-xs text-slate-500">
                  Paying from: {selectedBank.bankName} — {selectedBank.accountNo}
                </div>
              )}
              {isCredit && (
                <div className="bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 text-sm text-amber-800 font-medium">
                  This will be submitted as a CREDIT PURCHASE
                </div>
              )}
            </div>
          </CardBody>
        </Card>

        {/* Approval Workflow Info */}
        <Card className="mt-6">
          <CardHeader>
            <h2 className="text-lg font-semibold text-[#1D1D1F]">Approval Workflow</h2>
          </CardHeader>
          <CardBody>
            <div className="flex items-center gap-3 text-sm">
              <div className="flex items-center gap-2">
                <span className="w-8 h-8 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-xs">1</span>
                <span className="font-medium text-slate-700">Procurement Creates</span>
              </div>
              <span className="text-slate-400">&rarr;</span>
              <div className="flex items-center gap-2">
                <span className="w-8 h-8 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center font-bold text-xs">2</span>
                <span className="font-medium text-slate-700">Finance Checks</span>
              </div>
              <span className="text-slate-400">&rarr;</span>
              <div className="flex items-center gap-2">
                <span className="w-8 h-8 rounded-full bg-green-100 text-green-700 flex items-center justify-center font-bold text-xs">3</span>
                <span className="font-medium text-slate-700">Manager Approves</span>
              </div>
            </div>
            <p className="text-xs text-slate-500 mt-3">This purchase will be saved with status &quot;Pending&quot; and requires Finance verification and Manager approval before liftings can be made.</p>
          </CardBody>
        </Card>

        {/* Actions */}
        <div className="flex gap-3 mt-6">
          <Button
            variant="primary"
            size="lg"
            type="submit"
            disabled={loading || !selectedBankId || (insufficientBalance && !canSubmit)}
            className="flex-1"
          >
            {loading ? 'Saving...' : isCredit ? 'Submit Credit Purchase for Approval' : 'Submit Purchase for Approval'}
          </Button>
          <Button
            variant="outline"
            size="lg"
            onClick={() => router.push('/dashboard/cement')}
            className="flex-1"
            type="button"
          >
            Cancel
          </Button>
        </div>
      </form>
    </div>
  );
}
