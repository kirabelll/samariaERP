'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Card, CardBody, CardHeader, Button, Input } from '@/components/ui';

interface Transaction {
  id: string;
  type: 'receipt' | 'payment';
  description: string;
  amount: number;
  reference: string;
  time: string;
}

interface DailyCashData {
  date: string;
  openingBalance: number;
  totalReceipts: number;
  totalPayments: number;
  closingBalance: number;
  physicalCount: number;
  transactions: Transaction[];
  status: 'open' | 'closed';
}

export default function DailyCashPage() {
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [data, setData] = useState<DailyCashData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [physicalCount, setPhysicalCount] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    fetchDailyCash();
  }, [selectedDate]);

  const fetchDailyCash = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/finance/daily-cash?date=${selectedDate}`);
      if (!response.ok) throw new Error('Failed to fetch daily cash data');

      const result = await response.json();
      const dailyCashData = result.data || {
        date: selectedDate,
        openingBalance: 0,
        totalReceipts: 0,
        totalPayments: 0,
        closingBalance: 0,
        physicalCount: 0,
        transactions: [],
        status: 'open',
      };
      setData(dailyCashData);
      setPhysicalCount(dailyCashData?.physicalCount?.toString() || '');
    } catch (err: any) {
      setError(err.message);
      // Initialize empty data for new day
      setData({
        date: selectedDate,
        openingBalance: 0,
        totalReceipts: 0,
        totalPayments: 0,
        closingBalance: 0,
        physicalCount: 0,
        transactions: [],
        status: 'open',
      });
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'ETB',
    }).format(amount);
  };

  const handlePhysicalCountChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setPhysicalCount(value);

    if (value && data) {
      try {
        await fetch(`/api/finance/daily-cash`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            date: selectedDate,
            physicalCount: parseFloat(value),
          }),
        });
        // Optionally refresh data
        await fetchDailyCash();
      } catch (err) {
        console.error('Failed to update physical count:', err);
      }
    }
  };

  const handleDayAction = async (action: 'open' | 'close') => {
    setActionLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/finance/daily-cash`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          date: selectedDate,
          action,
        }),
      });

      if (!response.ok) throw new Error(`Failed to ${action} day`);

      await fetchDailyCash();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const difference = data ? data.physicalCount - data.closingBalance : 0;

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-[#86868B]">Loading daily cash data...</div>
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex flex-wrap gap-3 items-center justify-between">
        <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-[#1D1D1F]">Daily Cash Management</h1>
        <Input
          type="date"
          value={selectedDate}
          onChange={(e) => setSelectedDate(e.target.value)}
          className="w-auto"
        />
      </div>

      {error && (
        <div className="bg-[#FF3B30]/10 border border-[#FF3B30] rounded-2xl p-4 text-[#D70015]">
          {error}
        </div>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardBody>
            <p className="text-xs font-medium text-[#86868B] uppercase tracking-wider mb-2">
              Opening Balance
            </p>
            <p className="text-3xl font-bold text-[#1D1D1F]">{formatCurrency(data?.openingBalance || 0)}</p>
          </CardBody>
        </Card>

        <Card>
          <CardBody>
            <p className="text-xs font-medium text-[#86868B] uppercase tracking-wider mb-2">
              Total Receipts
            </p>
            <p className="text-3xl font-bold text-[#34C759]">{formatCurrency(data?.totalReceipts || 0)}</p>
          </CardBody>
        </Card>

        <Card>
          <CardBody>
            <p className="text-xs font-medium text-[#86868B] uppercase tracking-wider mb-2">
              Total Payments
            </p>
            <p className="text-3xl font-bold text-[#FF3B30]">{formatCurrency(data?.totalPayments || 0)}</p>
          </CardBody>
        </Card>

        <Card>
          <CardBody>
            <p className="text-xs font-medium text-[#86868B] uppercase tracking-wider mb-2">
              Closing Balance
            </p>
            <p className="text-3xl font-bold text-[#007AFF]">{formatCurrency(data?.closingBalance || 0)}</p>
          </CardBody>
        </Card>
      </div>

      {/* Physical Count & Variance */}
      <Card>
        <CardHeader>
          <h2 className="text-lg font-semibold text-[#1D1D1F]">Physical Count & Variance</h2>
        </CardHeader>
        <CardBody className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <Input
                label="Physical Count"
                type="number"
                placeholder="0.00"
                step="0.01"
                value={physicalCount}
                onChange={handlePhysicalCountChange}
              />
            </div>
            <div>
              <p className="text-xs font-medium text-[#86868B] uppercase tracking-wider mb-1">
                Variance (Difference)
              </p>
              <div
                className={`text-4xl font-bold py-3 px-4 rounded-xl ${
                  difference < 0
                    ? 'text-[#FF3B30] bg-[#FF3B30]/10'
                    : difference > 0
                      ? 'text-[#34C759] bg-[#34C759]/10'
                      : 'text-[#1D1D1F] bg-[#F5F5F7]'
                }`}
              >
                {formatCurrency(difference)}
              </div>
            </div>
          </div>
        </CardBody>
      </Card>

      {/* Day Status & Actions */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-[#1D1D1F]">Day Status</h2>
            <div className="text-xs font-semibold px-3 py-1 rounded-full bg-[#007AFF]/10 text-[#0055D4]">
              {data?.status === 'open' ? 'Open' : 'Closed'}
            </div>
          </div>
        </CardHeader>
        <CardBody>
          <div className="flex gap-3">
            {data?.status === 'open' && (
              <Button
                variant="primary"
                size="lg"
                isLoading={actionLoading}
                disabled={actionLoading}
                onClick={() => handleDayAction('close')}
              >
                Close Day
              </Button>
            )}
            {data?.status === 'closed' && (
              <Button
                variant="secondary"
                size="lg"
                isLoading={actionLoading}
                disabled={actionLoading}
                onClick={() => handleDayAction('open')}
              >
                Reopen Day
              </Button>
            )}
          </div>
        </CardBody>
      </Card>

      {/* Transactions */}
      <Card>
        <CardHeader>
          <h2 className="text-lg font-semibold text-[#1D1D1F]">Transactions</h2>
        </CardHeader>
        <CardBody>
          {data && data.transactions.length === 0 ? (
            <div className="flex justify-center items-center h-40">
              <div className="text-[#86868B]">No transactions for this day</div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-[#D2D2D7]">
                    <th className="px-4 py-3 text-left text-sm font-semibold text-[#86868B]">
                      Time
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-[#86868B]">
                      Type
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-[#86868B]">
                      Description
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-[#86868B]">
                      Reference
                    </th>
                    <th className="px-4 py-3 text-right text-sm font-semibold text-[#86868B]">
                      Amount
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {data?.transactions.map((transaction) => (
                    <tr key={transaction.id} className="border-b border-[#F5F5F7]">
                      <td className="px-4 py-3 text-sm text-[#86868B]">{transaction.time}</td>
                      <td className="px-4 py-3 text-sm">
                        <span
                          className={`px-2 py-1 rounded-full text-xs font-semibold ${
                            transaction.type === 'receipt'
                              ? 'bg-[#34C759]/10 text-[#248A3D]'
                              : 'bg-[#FF3B30]/10 text-[#D70015]'
                          }`}
                        >
                          {transaction.type === 'receipt' ? 'Receipt' : 'Payment'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-[#1D1D1F]">{transaction.description}</td>
                      <td className="px-4 py-3 text-sm">
                        <Link href={`/dashboard/finance/vouchers/${transaction.id}`} className="text-blue-600 hover:text-blue-800 hover:underline font-medium">
                          {transaction.reference}
                        </Link>
                      </td>
                      <td className="px-4 py-3 text-sm font-semibold text-right text-[#1D1D1F]">
                        <span
                          className={transaction.type === 'receipt' ? 'text-[#34C759]' : 'text-[#FF3B30]'}
                        >
                          {transaction.type === 'receipt' ? '+' : '-'}
                          {formatCurrency(transaction.amount)}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardBody>
      </Card>
    </div>
  );
}
