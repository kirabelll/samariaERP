'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Card, CardHeader, CardBody, Button, Input, Select } from '@/components/ui';

export default function NewBankAccountPage() {
  const router = useRouter();

  const [bankName, setBankName] = useState('');
  const [accountNo, setAccountNo] = useState('');
  const [accountName, setAccountName] = useState('');
  const [branch, setBranch] = useState('');
  const [currency, setCurrency] = useState('ETB');
  const [balance, setBalance] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!bankName || !accountNo || !accountName) {
      alert('Please fill in all required fields');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/api/finance/bank', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bankName,
          accountNo,
          accountName,
          branch: branch || null,
          currency,
          balance: balance ? parseFloat(balance) : 0,
        }),
      });

      const result = await response.json();
      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Failed to create bank account');
      }

      alert('Bank account created successfully!');
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
        <h1 className="text-2xl sm:text-3xl font-bold text-[#1D1D1F]">Add Bank Account</h1>
        <Link href="/dashboard/finance/bank">
          <Button variant="outline">Cancel</Button>
        </Link>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card>
          <CardHeader>
            <h2 className="text-lg font-semibold text-[#1D1D1F]">Account Details</h2>
          </CardHeader>
          <CardBody className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Bank Name *</label>
                <Input
                  placeholder="e.g., Commercial Bank of Ethiopia"
                  value={bankName}
                  onChange={(e) => setBankName(e.target.value)}
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Account Number *</label>
                <Input
                  placeholder="e.g., 1000123456789"
                  value={accountNo}
                  onChange={(e) => setAccountNo(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Account Name *</label>
                <Input
                  placeholder="e.g., Samaria Trading PLC"
                  value={accountName}
                  onChange={(e) => setAccountName(e.target.value)}
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Branch</label>
                <Input
                  placeholder="e.g., Bole Branch"
                  value={branch}
                  onChange={(e) => setBranch(e.target.value)}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Currency</label>
                <Select
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value)}
                  options={[
                    { value: 'ETB', label: 'ETB - Ethiopian Birr' },
                    { value: 'USD', label: 'USD - US Dollar' },
                    { value: 'EUR', label: 'EUR - Euro' },
                  ]}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Opening Balance (ETB)</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={balance}
                  onChange={(e) => setBalance(e.target.value)}
                  className="block w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                  placeholder="0.00"
                />
              </div>
            </div>
          </CardBody>
        </Card>

        {/* Summary */}
        <Card>
          <CardHeader>
            <h2 className="text-lg font-semibold text-[#1D1D1F]">Summary</h2>
          </CardHeader>
          <CardBody>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-slate-600">Bank:</span>
                <span className="font-medium">{bankName || '—'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-600">Account No:</span>
                <span className="font-medium">{accountNo || '—'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-600">Account Name:</span>
                <span className="font-medium">{accountName || '—'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-600">Branch:</span>
                <span className="font-medium">{branch || '—'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-600">Currency:</span>
                <span className="font-medium">{currency}</span>
              </div>
              <div className="border-t pt-2 flex justify-between">
                <span className="text-slate-900 font-semibold">Opening Balance:</span>
                <span className="text-xl font-bold text-slate-900">
                  {currency} {balance ? parseFloat(balance).toLocaleString('en-US', { minimumFractionDigits: 2 }) : '0.00'}
                </span>
              </div>
            </div>
          </CardBody>
        </Card>

        <div className="flex gap-3">
          <Button variant="primary" size="lg" type="submit" isLoading={loading} className="flex-1">
            Create Bank Account
          </Button>
          <Link href="/dashboard/finance/bank" className="flex-1">
            <Button variant="outline" size="lg" className="w-full">Cancel</Button>
          </Link>
        </div>
      </form>
    </div>
  );
}
