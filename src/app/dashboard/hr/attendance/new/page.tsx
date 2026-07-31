'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Card, CardHeader, CardBody, CardFooter, Button, Input, Select } from '@/components/ui';

export default function NewAttendancePage() {
  const router = useRouter();
  const [employeeId, setEmployeeId] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [checkIn, setCheckIn] = useState('');
  const [checkOut, setCheckOut] = useState('');
  const [status, setStatus] = useState('');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!employeeId || !date || !status) {
      alert('Please fill in all required fields');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/api/hr/attendance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          employeeId,
          date,
          checkIn: checkIn || null,
          checkOut: checkOut || null,
          status,
          notes: notes || null,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to save attendance record');
      }

      alert('Attendance record saved successfully!');
      router.push('/dashboard/hr/attendance');
    } catch (error) {
      alert('Error: ' + (error instanceof Error ? error.message : 'Unknown error'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-gray-900">New Attendance Record</h1>
        <Link href="/dashboard/hr/attendance" className="text-blue-600 hover:text-blue-800">
          &larr; Back
        </Link>
      </div>

      <Card>
        <CardHeader>
          <h2 className="text-xl font-semibold text-gray-900">Attendance Information</h2>
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
                <label className="block text-sm font-medium text-gray-700 mb-2">Date *</label>
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 border px-3 py-2"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Check-In Time</label>
                <input
                  type="time"
                  value={checkIn}
                  onChange={(e) => setCheckIn(e.target.value)}
                  className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 border px-3 py-2"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Check-Out Time</label>
                <input
                  type="time"
                  value={checkOut}
                  onChange={(e) => setCheckOut(e.target.value)}
                  className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 border px-3 py-2"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Status *</label>
              <Select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                options={[
                  { value: '', label: 'Select Status' },
                  { value: 'Present', label: 'Present' },
                  { value: 'Absent', label: 'Absent' },
                  { value: 'Late', label: 'Late' },
                  { value: 'HalfDay', label: 'Half Day' },
                  { value: 'Holiday', label: 'Holiday' },
                  { value: 'Leave', label: 'Leave' },
                ]}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Notes</label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 border px-3 py-2"
                placeholder="Enter any additional notes"
                rows={3}
              />
            </div>
          </form>
        </CardBody>
      </Card>

      <Card>
        <CardHeader>
          <h2 className="text-xl font-semibold text-gray-900">Record Summary</h2>
        </CardHeader>
        <CardBody>
          <div className="space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Employee ID:</span>
              <span className="font-medium">{employeeId || 'Not set'}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Date:</span>
              <span className="font-medium">{date || 'Not set'}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Check-In:</span>
              <span className="font-medium">{checkIn || '-'}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Check-Out:</span>
              <span className="font-medium">{checkOut || '-'}</span>
            </div>
            <div className="border-t pt-3 flex justify-between">
              <span className="text-gray-900 font-semibold">Status:</span>
              <span className="text-lg font-bold text-gray-900">
                {status || 'Not set'}
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
          {loading ? 'Saving...' : 'Save Record'}
        </Button>
        <Link href="/dashboard/hr/attendance" className="flex-1">
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
