'use client';

import React, { useState, useEffect } from 'react';
import { Download, Calendar } from 'lucide-react';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Card, { CardHeader, CardBody, CardFooter } from '@/components/ui/Card';

interface CashbookEntry {
  id: string;
  date: string;
  voucherNo: string;
  description: string;
  receipts: number;
  payments: number;
  balance: number;
  type: 'receipt' | 'payment';
}

interface CashbookSummary {
  totalReceipts: number;
  totalPayments: number;
  netMovement: number;
  closingBalance: number;
  receiptCount: number;
  paymentCount: number;
}

// Helper to get current month date range
function getDefaultDates() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return {
    from: `${year}-${month}-01`,
    to: `${year}-${month}-${day}`,
  };
}

export default function CashbookPage() {
  const defaults = getDefaultDates();
  const [startDate, setStartDate] = useState(defaults.from);
  const [endDate, setEndDate] = useState(defaults.to);
  const [cashbookEntries, setCashbookEntries] = useState<CashbookEntry[]>([]);
  const [summary, setSummary] = useState<CashbookSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchCashbookData();
  }, [startDate, endDate]);

  const fetchCashbookData = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(
        `/api/finance/cashbook?from=${startDate}&to=${endDate}`
      );
      const data = await response.json();

      if (data.success && data.data) {
        setCashbookEntries(data.data.entries || []);
        setSummary(data.data.summary || null);
      } else {
        setCashbookEntries([]);
        setSummary(null);
      }
    } catch (err) {
      console.error('Error fetching cashbook data:', err);
      setError('Failed to fetch cashbook data');
      setCashbookEntries([]);
      setSummary(null);
    } finally {
      setLoading(false);
    }
  };

  const totalReceipts = summary?.totalReceipts || 0;
  const totalPayments = summary?.totalPayments || 0;
  const closingBalance = summary?.closingBalance || 0;

  const handleResetDates = () => {
    const d = getDefaultDates();
    setStartDate(d.from);
    setEndDate(d.to);
  };

  const handleExport = () => {
    const csvContent = [
      ['Cashbook Report'],
      [`Period: ${startDate} to ${endDate}`],
      [''],
      ['Date', 'Voucher No', 'Description', 'Receipts (ETB)', 'Payments (ETB)', 'Balance (ETB)'],
      ...cashbookEntries.map(entry => [
        entry.date,
        entry.voucherNo,
        entry.description,
        entry.receipts.toFixed(2),
        entry.payments.toFixed(2),
        entry.balance.toFixed(2),
      ]),
      [''],
      ['Total Receipts', '', '', totalReceipts.toFixed(2), '', ''],
      ['Total Payments', '', '', '', totalPayments.toFixed(2), ''],
      ['Closing Balance', '', '', '', '', closingBalance.toFixed(2)],
    ]
      .map(row => row.join(','))
      .join('\n');

    const element = document.createElement('a');
    element.setAttribute('href', 'data:text/csv;charset=utf-8,' + encodeURIComponent(csvContent));
    element.setAttribute('download', `cashbook-${startDate}-to-${endDate}.csv`);
    element.style.display = 'none';
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  if (loading) {
    return (
      <div className="space-y-4 sm:space-y-6">
        <div className="flex flex-wrap gap-3 items-center justify-between">
          <div>
            <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900">Cashbook</h1>
            <p className="text-gray-600 mt-1">Track cash receipts and payments</p>
          </div>
        </div>
        <Card className="p-6">
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="text-gray-600 mt-4">Loading cashbook data...</p>
          </div>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-4 sm:space-y-6">
        <div className="flex flex-wrap gap-3 items-center justify-between">
          <div>
            <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900">Cashbook</h1>
            <p className="text-gray-600 mt-1">Track cash receipts and payments</p>
          </div>
        </div>
        <Card className="p-6 bg-red-50 border border-red-200">
          <p className="text-red-700">{error}</p>
          <Button variant="secondary" onClick={fetchCashbookData} className="mt-3">
            Retry
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex flex-wrap gap-3 items-center justify-between">
        <div>
          <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900">Cashbook</h1>
          <p className="text-gray-600 mt-1">Track cash receipts and payments</p>
        </div>
        <Button
          variant="secondary"
          icon={<Download className="w-4 h-4" />}
          onClick={handleExport}
        >
          Export CSV
        </Button>
      </div>

      {/* Filters */}
      <Card className="p-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Input
            label="Start Date"
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            icon={<Calendar className="w-4 h-4" />}
          />
          <Input
            label="End Date"
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            icon={<Calendar className="w-4 h-4" />}
          />
          <div className="flex items-end">
            <Button
              variant="secondary"
              onClick={handleResetDates}
            >
              This Month
            </Button>
          </div>
        </div>
      </Card>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="p-6 border-l-4 border-l-green-500">
          <p className="text-sm text-gray-600 font-medium">Total Receipts</p>
          <p className="text-3xl font-bold text-green-600 mt-2">
            ETB {totalReceipts.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </p>
          <p className="text-xs text-gray-500 mt-2">
            {summary?.receiptCount || 0} transaction{(summary?.receiptCount || 0) !== 1 ? 's' : ''}
          </p>
        </Card>

        <Card className="p-6 border-l-4 border-l-red-500">
          <p className="text-sm text-gray-600 font-medium">Total Payments</p>
          <p className="text-3xl font-bold text-red-600 mt-2">
            ETB {totalPayments.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </p>
          <p className="text-xs text-gray-500 mt-2">
            {summary?.paymentCount || 0} transaction{(summary?.paymentCount || 0) !== 1 ? 's' : ''}
          </p>
        </Card>

        <Card className="p-6 border-l-4 border-l-blue-500">
          <p className="text-sm text-gray-600 font-medium">Net Cash Position</p>
          <p className={`text-3xl font-bold mt-2 ${closingBalance >= 0 ? 'text-blue-600' : 'text-red-600'}`}>
            ETB {closingBalance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </p>
          <p className="text-xs text-gray-500 mt-2">
            Receipts minus payments
          </p>
        </Card>
      </div>

      {/* Cashbook Table */}
      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 font-semibold text-gray-900">Date</th>
                <th className="px-6 py-3 font-semibold text-gray-900">Voucher No</th>
                <th className="px-6 py-3 font-semibold text-gray-900">Description</th>
                <th className="px-6 py-3 font-semibold text-gray-900 text-right">Receipts (ETB)</th>
                <th className="px-6 py-3 font-semibold text-gray-900 text-right">Payments (ETB)</th>
                <th className="px-6 py-3 font-semibold text-gray-900 text-right">Balance (ETB)</th>
              </tr>
            </thead>
            <tbody>
              {cashbookEntries.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                    No transactions found for the selected period.
                    <br />
                    <span className="text-xs text-gray-400 mt-1 block">
                      Verified customer payments and approved/posted payment vouchers will appear here.
                    </span>
                  </td>
                </tr>
              ) : (
                cashbookEntries.map((entry, index) => (
                  <tr
                    key={entry.id}
                    className={`border-b border-gray-200 hover:bg-gray-50 ${
                      entry.type === 'receipt' ? '' : ''
                    }`}
                  >
                    <td className="px-6 py-4 text-gray-600">
                      {new Date(entry.date + 'T00:00:00').toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 font-medium text-gray-900">{entry.voucherNo}</td>
                    <td className="px-6 py-4 text-gray-900">{entry.description}</td>
                    <td className="px-6 py-4 text-right">
                      {entry.receipts > 0 ? (
                        <span className="font-medium text-green-600">
                          ETB {entry.receipts.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </span>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right">
                      {entry.payments > 0 ? (
                        <span className="font-medium text-red-600">
                          ETB {entry.payments.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </span>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right font-bold text-gray-900">
                      ETB {entry.balance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Summary Footer */}
        {cashbookEntries.length > 0 && (
          <div className="px-6 py-4 bg-gray-50 border-t border-gray-200">
            <div className="grid grid-cols-6 gap-4 text-sm font-semibold">
              <div className="col-span-3">
                <p className="text-gray-600">Summary</p>
              </div>
              <div className="text-right">
                <p className="text-gray-600">Receipts</p>
                <p className="text-green-600 text-lg">ETB {totalReceipts.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
              </div>
              <div className="text-right">
                <p className="text-gray-600">Payments</p>
                <p className="text-red-600 text-lg">ETB {totalPayments.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
              </div>
              <div className="text-right">
                <p className="text-gray-600">Net Position</p>
                <p className="text-gray-900 text-lg">ETB {closingBalance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
              </div>
            </div>
          </div>
        )}
      </Card>

      {/* Additional Info */}
      <Card className="p-6 bg-blue-50 border-l-4 border-l-blue-500">
        <h3 className="font-semibold text-gray-900 mb-2">Cashbook Summary</h3>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-sm">
          <div>
            <p className="text-gray-600">Period</p>
            <p className="font-bold text-gray-900">{startDate} to {endDate}</p>
          </div>
          <div>
            <p className="text-gray-600">Net Movement</p>
            <p className={`font-bold ${(summary?.netMovement || 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              ETB {(summary?.netMovement || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
          </div>
          <div>
            <p className="text-gray-600">Net Cash Position</p>
            <p className="font-bold text-gray-900">ETB {closingBalance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
          </div>
          <div>
            <p className="text-gray-600">Total Transactions</p>
            <p className="font-bold text-gray-900">{cashbookEntries.length}</p>
          </div>
        </div>
      </Card>
    </div>
  );
}
