'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Card, CardHeader, CardBody, CardFooter, Button, Input, Select } from '@/components/ui';

export default function NewPayrollPage() {
  const router = useRouter();
  const [periodName, setPeriodName] = useState('');
  const [month, setMonth] = useState('');
  const [year, setYear] = useState(new Date().getFullYear().toString());
  const [status] = useState('Draft');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!periodName || !month || !year) {
      alert('Please fill in all required fields');
      return;
    }

    if (parseInt(month) < 1 || parseInt(month) > 12) {
      alert('Month must be between 1 and 12');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/api/hr/payroll', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          periodName,
          month: parseInt(month),
          year: parseInt(year),
          status,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to save payroll period');
      }

      alert('Payroll period saved successfully!');
      router.push('/dashboard/hr/payroll');
    } catch (error) {
      alert('Error: ' + (error instanceof Error ? error.message : 'Unknown error'));
    } finally {
      setLoading(false);
    }
  };

  const monthOptions = [
    { value: '', label: 'Select Month' },
    { value: '1', label: 'January' },
    { value: '2', label: 'February' },
    { value: '3', label: 'March' },
    { value: '4', label: 'April' },
    { value: '5', label: 'May' },
    { value: '6', label: 'June' },
    { value: '7', label: 'July' },
    { value: '8', label: 'August' },
    { value: '9', label: 'September' },
    { value: '10', label: 'October' },
    { value: '11', label: 'November' },
    { value: '12', label: 'December' },
  ];

  const yearOptions = [{ value: '', label: 'Select Year' }];
  for (let i = new Date().getFullYear(); i >= 2020; i--) {
    yearOptions.push({ value: i.toString(), label: i.toString() });
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-gray-900">New Payroll Period</h1>
        <Link href="/dashboard/hr/payroll" className="text-blue-600 hover:text-blue-800">
          &larr; Back
        </Link>
      </div>

      <Card>
        <CardHeader>
          <h2 className="text-xl font-semibold text-gray-900">Payroll Period Details</h2>
        </CardHeader>
        <CardBody className="space-y-4">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Period Name *</label>
                <Input
                  placeholder="e.g., 2024-08"
                  value={periodName}
                  onChange={(e) => setPeriodName(e.target.value)}
                  required
                />
                <p className="text-xs text-gray-500 mt-1">Format: YYYY-MM (e.g., 2024-08)</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
                <div className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 border px-3 py-2 bg-gray-50">
                  <span className="text-gray-600">{status}</span>
                </div>
                <p className="text-xs text-gray-500 mt-1">New payroll periods start in Draft status</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Month *</label>
                <Select
                  value={month}
                  onChange={(e) => setMonth(e.target.value)}
                  options={monthOptions}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Year *</label>
                <Select
                  value={year}
                  onChange={(e) => setYear(e.target.value)}
                  options={yearOptions}
                />
              </div>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-md p-3">
              <p className="text-sm text-blue-800">
                <strong>Note:</strong> This creates a new payroll period in Draft status. You can add employees and process payroll once created.
              </p>
            </div>
          </form>
        </CardBody>
      </Card>

      <Card>
        <CardHeader>
          <h2 className="text-xl font-semibold text-gray-900">Period Summary</h2>
        </CardHeader>
        <CardBody>
          <div className="space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Period Name:</span>
              <span className="font-medium">{periodName || 'Not set'}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Month:</span>
              <span className="font-medium">
                {month
                  ? monthOptions.find(m => m.value === month)?.label
                  : 'Not set'}
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Year:</span>
              <span className="font-medium">{year || 'Not set'}</span>
            </div>
            <div className="border-t pt-3 flex justify-between">
              <span className="text-gray-900 font-semibold">Status:</span>
              <span className="text-lg font-bold text-yellow-600">
                {status}
              </span>
            </div>
          </div>
        </CardBody>
      </Card>

      <div className="flex gap-3">
        <Button
          variant="primary"
          size="lg"
          onClick={(e) => {
            const form = document.querySelector('form');
            if (form) form.dispatchEvent(new Event('submit', { bubbles: true }));
          }}
          disabled={loading}
          className="flex-1"
        >
          {loading ? 'Saving...' : 'Create Period'}
        </Button>
        <Link href="/dashboard/hr/payroll" className="flex-1">
          <Button
            variant="outline"
            size="lg"
            className="w-full"
          >
            Cancel
          </Button>
        </Link>
      </div>
    </div>
  );
}
