'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Card, CardHeader, CardBody, CardFooter, Button, Input, Select } from '@/components/ui';

export default function NewLeavePage() {
  const router = useRouter();
  const [employeeId, setEmployeeId] = useState('');
  const [leaveType, setLeaveType] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);

  const calculateDays = () => {
    if (!startDate || !endDate) return 0;
    const start = new Date(startDate);
    const end = new Date(endDate);
    const diffTime = Math.abs(end.getTime() - start.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
    return diffDays;
  };

  const days = calculateDays();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!employeeId || !leaveType || !startDate || !endDate || !reason) {
      alert('Please fill in all required fields');
      return;
    }

    if (days <= 0) {
      alert('End date must be after start date');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/api/hr/leave', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          employeeId,
          leaveType,
          startDate,
          endDate,
          days,
          reason,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to save leave request');
      }

      alert('Leave request saved successfully!');
      router.push('/dashboard/hr/leave');
    } catch (error) {
      alert('Error: ' + (error instanceof Error ? error.message : 'Unknown error'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-gray-900">New Leave Request</h1>
        <Link href="/dashboard/hr/leave" className="text-blue-600 hover:text-blue-800">
          &larr; Back
        </Link>
      </div>

      <Card>
        <CardHeader>
          <h2 className="text-xl font-semibold text-gray-900">Leave Details</h2>
        </CardHeader>
        <CardBody className="space-y-4">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Employee ID *</label>
                <Input
                  placeholder="e.g., EMP-001"
                  value={employeeId}
                  onChange={(e) => setEmployeeId(e.target.value)}
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Leave Type *</label>
                <Select
                  value={leaveType}
                  onChange={(e) => setLeaveType(e.target.value)}
                  options={[
                    { value: '', label: 'Select Leave Type' },
                    { value: 'Annual', label: 'Annual Leave' },
                    { value: 'Sick', label: 'Sick Leave' },
                    { value: 'Maternity', label: 'Maternity Leave' },
                    { value: 'Paternity', label: 'Paternity Leave' },
                    { value: 'Other', label: 'Other' },
                  ]}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Start Date *</label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 border px-3 py-2"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">End Date *</label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 border px-3 py-2"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Reason *</label>
              <textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 border px-3 py-2"
                placeholder="Enter reason for leave"
                rows={4}
                required
              />
            </div>
          </form>
        </CardBody>
      </Card>

      <Card>
        <CardHeader>
          <h2 className="text-xl font-semibold text-gray-900">Leave Summary</h2>
        </CardHeader>
        <CardBody>
          <div className="space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Employee ID:</span>
              <span className="font-medium">{employeeId || 'Not set'}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Leave Type:</span>
              <span className="font-medium">{leaveType || 'Not set'}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Start Date:</span>
              <span className="font-medium">{startDate || 'Not set'}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">End Date:</span>
              <span className="font-medium">{endDate || 'Not set'}</span>
            </div>
            <div className="border-t pt-3 flex justify-between">
              <span className="text-gray-900 font-semibold">Number of Days:</span>
              <span className="text-2xl font-bold text-gray-900">
                {days} days
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
          {loading ? 'Saving...' : 'Save Request'}
        </Button>
        <Link href="/dashboard/hr/leave" className="flex-1">
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
