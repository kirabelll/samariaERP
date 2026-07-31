'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardBody, CardHeader, Button, Input, Select } from '@/components/ui';

interface BankAccount {
  id: string;
  bankName: string;
  accountNo: string;
  accountName: string;
  balance: number;
}

interface FormData {
  type: string;
  cashierName: string;
  amount: string;
  category: string;
  description: string;
  refNo: string;
  bankAccountId: string;
  transactionDate: string;
}

export default function NewPettyCashPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([]);
  const [fetchingBanks, setFetchingBanks] = useState(false);
  const [formData, setFormData] = useState<FormData>({
    type: '',
    cashierName: '',
    amount: '',
    category: '',
    description: '',
    refNo: '',
    bankAccountId: '',
    transactionDate: new Date().toISOString().slice(0, 10),
  });

  useEffect(() => {
    if (formData.type === 'FUND_ALLOCATION') {
      fetchBankAccounts();
    }
  }, [formData.type]);

  const fetchBankAccounts = async () => {
    setFetchingBanks(true);
    try {
      const response = await fetch('/api/finance/bank?status=Active&limit=100');
      if (!response.ok) throw new Error('Failed to fetch bank accounts');

      const result = await response.json();
      setBankAccounts(result.data || []);
    } catch (err: any) {
      console.error('Failed to fetch bank accounts:', err.message);
    } finally {
      setFetchingBanks(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      // Validate required fields
      if (!formData.type || !formData.cashierName || !formData.amount) {
        throw new Error('Please fill in all required fields');
      }

      if (formData.type === 'FUND_ALLOCATION' && !formData.bankAccountId) {
        throw new Error('Bank account is required for fund allocation');
      }

      const response = await fetch('/api/finance/petty-cash', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          amount: parseFloat(formData.amount),
        }),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Failed to create petty cash transaction');
      }

      // Success - redirect to list
      router.push('/dashboard/finance/petty-cash');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4 sm:space-y-6 max-w-4xl">
      <div className="flex items-center justify-between">
        <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-[#1D1D1F]">New Petty Cash Transaction</h1>
        <Button
          variant="secondary"
          onClick={() => router.push('/dashboard/finance/petty-cash')}
        >
          Cancel
        </Button>
      </div>

      {error && (
        <div className="bg-[#FF3B30]/10 border border-[#FF3B30] rounded-2xl p-4 text-[#D70015]">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Transaction Type */}
        <Card>
          <CardHeader>
            <h2 className="text-lg font-semibold text-[#1D1D1F]">Transaction Type</h2>
          </CardHeader>
          <CardBody className="space-y-4">
            <Select
              label="Type"
              name="type"
              value={formData.type}
              onChange={handleChange}
              options={[
                { value: '', label: 'Select transaction type...' },
                { value: 'FUND_ALLOCATION', label: 'Fund Allocation' },
                { value: 'EXPENSE', label: 'Expense' },
                { value: 'REPLENISHMENT', label: 'Replenishment' },
                { value: 'RETURN', label: 'Return' },
              ]}
              required
            />
          </CardBody>
        </Card>

        {/* Cashier & Amount */}
        <Card>
          <CardHeader>
            <h2 className="text-lg font-semibold text-[#1D1D1F]">Transaction Details</h2>
          </CardHeader>
          <CardBody className="space-y-4">
            <Input
              label="Cashier Name"
              name="cashierName"
              type="text"
              placeholder="Enter cashier / custodian name"
              value={formData.cashierName}
              onChange={handleChange}
              required
            />

            <Input
              label="Amount (ETB)"
              name="amount"
              type="number"
              placeholder="0.00"
              step="0.01"
              value={formData.amount}
              onChange={handleChange}
              required
            />

            {(formData.type === 'EXPENSE' || formData.type === 'REPLENISHMENT') && (
              <Select
                label="Category"
                name="category"
                value={formData.category}
                onChange={handleChange}
                options={[
                  { value: '', label: 'Select category...' },
                  { value: 'Office Supplies', label: 'Office Supplies' },
                  { value: 'Transport', label: 'Transport' },
                  { value: 'Meals & Refreshments', label: 'Meals & Refreshments' },
                  { value: 'Utilities', label: 'Utilities' },
                  { value: 'Cleaning', label: 'Cleaning' },
                  { value: 'Printing', label: 'Printing' },
                  { value: 'Miscellaneous', label: 'Miscellaneous' },
                ]}
              />
            )}

            <Input
              label="Transaction Date"
              name="transactionDate"
              type="date"
              value={formData.transactionDate}
              onChange={handleChange}
            />
          </CardBody>
        </Card>

        {/* Bank Account - only for FUND_ALLOCATION */}
        {formData.type === 'FUND_ALLOCATION' && (
          <Card>
            <CardHeader>
              <h2 className="text-lg font-semibold text-[#1D1D1F]">Source Bank Account</h2>
            </CardHeader>
            <CardBody className="space-y-4">
              <Select
                label="Bank Account"
                name="bankAccountId"
                value={formData.bankAccountId}
                onChange={handleChange}
                options={[
                  { value: '', label: fetchingBanks ? 'Loading bank accounts...' : 'Select bank account...' },
                  ...bankAccounts.map((bank) => ({
                    value: bank.id,
                    label: `${bank.bankName} - ${bank.accountNo} (${bank.accountName}) | Bal: ${bank.balance.toLocaleString('en-US')} ETB`,
                  })),
                ]}
                required
                disabled={fetchingBanks}
              />
            </CardBody>
          </Card>
        )}

        {/* Additional Info */}
        <Card>
          <CardHeader>
            <h2 className="text-lg font-semibold text-[#1D1D1F]">Additional Information</h2>
          </CardHeader>
          <CardBody className="space-y-4">
            <Input
              label="Reference No"
              name="refNo"
              type="text"
              placeholder="Receipt / invoice reference"
              value={formData.refNo}
              onChange={handleChange}
            />

            <div>
              <label className="block text-[13px] font-medium text-[#86868B] uppercase tracking-wider mb-1.5">
                Description
              </label>
              <textarea
                name="description"
                placeholder="Enter description or purpose of this transaction"
                className="w-full px-4 py-3 bg-white/80 border border-[#D2D2D7] rounded-xl focus:outline-none focus:ring-4 focus:ring-[rgba(0,122,255,0.25)] focus:border-[#007AFF] transition-all duration-200 text-[#1D1D1F] placeholder:text-[#86868B] min-h-24 resize-vertical"
                value={formData.description}
                onChange={handleChange}
              />
            </div>
          </CardBody>
        </Card>

        {/* Action Buttons */}
        <Card>
          <CardBody>
            <div className="flex gap-3 justify-end">
              <Button
                variant="secondary"
                size="lg"
                onClick={() => router.push('/dashboard/finance/petty-cash')}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                size="lg"
                type="submit"
                disabled={loading}
                isLoading={loading}
              >
                Create Transaction
              </Button>
            </div>
          </CardBody>
        </Card>
      </form>
    </div>
  );
}
