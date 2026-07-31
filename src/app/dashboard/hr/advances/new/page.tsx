'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Card, CardHeader, CardBody, Button, Input } from '@/components/ui';

export default function NewAdvancePage() {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [employees, setEmployees] = useState<{ value: string; label: string }[]>([]);
  const [formData, setFormData] = useState({
    employeeId: '',
    amount: '',
    monthlyDeduction: '',
    reason: '',
  });

  useEffect(() => {
    fetch('/api/employees?limit=200')
      .then((r) => r.json())
      .then((json) => {
        if (json.success) {
          setEmployees(json.data.map((e: any) => ({
            value: e.id,
            label: `${e.firstName} ${e.lastName}`,
          })));
        }
      })
      .catch(console.error);
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const months = parseFloat(formData.amount) && parseFloat(formData.monthlyDeduction)
    ? Math.ceil(parseFloat(formData.amount) / parseFloat(formData.monthlyDeduction))
    : 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.employeeId || !formData.amount) {
      alert('Please fill in all required fields');
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch('/api/hr/advances', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          employeeId: formData.employeeId,
          amount: parseFloat(formData.amount),
          remainingBal: parseFloat(formData.amount),
          monthlyDeduction: parseFloat(formData.monthlyDeduction) || 0,
          reason: formData.reason,
        }),
      });
      const data = await res.json();
      if (data.success) {
        alert('Advance request submitted successfully!');
        router.push('/dashboard/hr/advances');
      } else {
        alert(data.error || 'Failed to create advance');
      }
    } catch {
      alert('Failed to create advance');
    }
    setSubmitting(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 text-sm text-slate-500">
        <Link href="/dashboard/hr/advances" className="text-blue-600 hover:text-blue-800">Employee Advances</Link>
        <span>/</span><span>New Advance</span>
      </div>
      <h1 className="text-2xl font-bold text-slate-900">New Employee Advance</h1>

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card>
          <CardHeader><h2 className="text-lg font-semibold text-gray-900">Advance Details</h2></CardHeader>
          <CardBody>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Employee *</label>
                <select name="employeeId" value={formData.employeeId} onChange={handleChange} required className="w-full px-4 py-2.5 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                  <option value="">Select Employee</option>
                  {employees.map((e) => <option key={e.value} value={e.value}>{e.label}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Advance Amount (ETB) *</label>
                <input name="amount" type="number" step="0.01" min="1" value={formData.amount} onChange={handleChange} required placeholder="Enter amount" className="w-full px-4 py-2.5 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Monthly Deduction (ETB)</label>
                <input name="monthlyDeduction" type="number" step="0.01" min="0" value={formData.monthlyDeduction} onChange={handleChange} placeholder="Deducted from salary each month" className="w-full px-4 py-2.5 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
              </div>
              <div className="bg-blue-50 p-4 rounded-lg border border-blue-200 flex flex-col justify-center">
                <p className="text-xs text-gray-600 mb-1">Estimated Repayment</p>
                <p className="text-xl font-bold text-gray-900">{months > 0 ? `${months} months` : '-'}</p>
              </div>
            </div>
            <div className="mt-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">Reason</label>
              <textarea name="reason" value={formData.reason} onChange={handleChange} rows={3} placeholder="Reason for advance..." className="w-full px-4 py-2.5 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
            </div>
          </CardBody>
        </Card>

        <div className="flex gap-3 justify-end">
          <Link href="/dashboard/hr/advances"><Button variant="outline" size="lg">Cancel</Button></Link>
          <Button variant="primary" size="lg" type="submit" isLoading={submitting}>Submit Advance Request</Button>
        </div>
      </form>
    </div>
  );
}
