'use client';
import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardHeader, CardBody, Button, Badge, Input } from '@/components/ui';

interface Employee {
  id: number;
  firstName: string;
  lastName: string;
  employeeId: string;
}

interface CommissionPreview {
  calcNo: string;
  salesperson: string;
  period: string;
  basis: string;
  totalSales: number;
  rate: number;
  grossCommission: number;
  adjustments: number;
  netCommission: number;
  items: Array<{
    invoiceNo: string;
    customer: string;
    invoiceAmount: number;
    paidAmount: number;
    commissionBase: number;
    rate: number;
    commissionAmount: number;
  }>;
}

export default function NewCommissionCalculationPage() {
  const router = useRouter();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [preview, setPreview] = useState<CommissionPreview | null>(null);

  const [formData, setFormData] = useState({
    salespersonId: '',
    periodFrom: '',
    periodTo: '',
    basis: 'invoiced' as 'invoiced' | 'paid',
  });

  const fetchEmployees = async () => {
    try {
      const res = await fetch('/api/employees?role=salesperson');
      if (!res.ok) throw new Error('Failed to fetch');
      const result = await res.json();
      setEmployees(result.data || []);
    } catch (err) {
      console.error('Error fetching employees:', err);
    }
  };

  useEffect(() => {
    fetchEmployees();
  }, []);

  const handleCalculate = async () => {
    if (!formData.salespersonId || !formData.periodFrom || !formData.periodTo) {
      alert('Please fill all required fields');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/commission/calculations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (!res.ok) throw new Error('Failed to calculate');
      const result = await res.json();

      setPreview(result.data);
      setShowPreview(true);
    } catch (err) {
      console.error('Error calculating commission:', err);
      alert('Failed to calculate commission');
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmAndSave = async () => {
    if (!preview) return;

    setLoading(true);
    try {
      const res = await fetch('/api/commission/calculations/confirm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ calcNo: preview.calcNo }),
      });

      if (!res.ok) throw new Error('Failed to save');
      const result = await res.json();

      router.push(`/dashboard/medical/commission/calculations/${result.data.id}`);
    } catch (err) {
      console.error('Error saving commission:', err);
      alert('Failed to save commission calculation');
    } finally {
      setLoading(false);
    }
  };

  if (showPreview && preview) {
    return (
      <div className="space-y-6 p-6" style={{ background: '#F5F5F7' }}>
        <div className="flex items-center gap-4">
          <Button
            variant="outline"
            onClick={() => setShowPreview(false)}
            className="rounded-2xl"
          >
            Back
          </Button>
          <h1 className="text-3xl font-bold" style={{ color: '#1D1D1F' }}>
            Commission Calculation Preview
          </h1>
        </div>

        <Card className="rounded-2xl overflow-hidden">
          <CardBody>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6">
              <div className="p-4 rounded-2xl" style={{ background: '#F5F5F7' }}>
                <div className="text-sm" style={{ color: '#666' }}>Salesperson</div>
                <div className="text-lg font-bold" style={{ color: '#1D1D1F' }}>{preview.salesperson}</div>
              </div>
              <div className="p-4 rounded-2xl" style={{ background: '#F5F5F7' }}>
                <div className="text-sm" style={{ color: '#666' }}>Period</div>
                <div className="text-lg font-bold" style={{ color: '#1D1D1F' }}>{preview.period}</div>
              </div>
              <div className="p-4 rounded-2xl" style={{ background: '#F5F5F7' }}>
                <div className="text-sm" style={{ color: '#666' }}>Basis</div>
                <div className="text-lg font-bold" style={{ color: '#1D1D1F' }}>{preview.basis}</div>
              </div>
              <div className="p-4 rounded-2xl" style={{ background: '#F5F5F7' }}>
                <div className="text-sm" style={{ color: '#666' }}>Rate</div>
                <div className="text-lg font-bold" style={{ color: '#1D1D1F' }}>{preview.rate}%</div>
              </div>
              <div className="p-4 rounded-2xl" style={{ background: '#F5F5F7' }}>
                <div className="text-sm" style={{ color: '#666' }}>Total Sales</div>
                <div className="text-lg font-bold" style={{ color: '#1D1D1F' }}>
                  {preview.totalSales.toLocaleString('en-US', { style: 'currency', currency: 'USD' })}
                </div>
              </div>
              <div className="p-4 rounded-2xl" style={{ background: '#007AFF20' }}>
                <div className="text-sm" style={{ color: '#666' }}>Gross Commission</div>
                <div className="text-lg font-bold" style={{ color: '#007AFF' }}>
                  {preview.grossCommission.toLocaleString('en-US', { style: 'currency', currency: 'USD' })}
                </div>
              </div>
            </div>

            <div className="mb-6 p-4 rounded-2xl" style={{ background: '#F5F5F7' }}>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <div className="text-sm" style={{ color: '#666' }}>Adjustments</div>
                  <div className="text-xl font-bold" style={{ color: '#1D1D1F' }}>
                    {preview.adjustments.toLocaleString('en-US', { style: 'currency', currency: 'USD' })}
                  </div>
                </div>
                <div>
                  <div className="text-sm" style={{ color: '#666' }}>Net Commission</div>
                  <div className="text-xl font-bold" style={{ color: '#007AFF' }}>
                    {preview.netCommission.toLocaleString('en-US', { style: 'currency', currency: 'USD' })}
                  </div>
                </div>
              </div>
            </div>

            <h2 className="text-xl font-bold mb-4" style={{ color: '#1D1D1F' }}>Commission Items</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr style={{ background: '#F5F5F7', borderBottom: '1px solid #E5E5EA' }}>
                    <th className="px-4 py-3 text-left" style={{ color: '#1D1D1F' }}>Invoice No</th>
                    <th className="px-4 py-3 text-left" style={{ color: '#1D1D1F' }}>Customer</th>
                    <th className="px-4 py-3 text-right" style={{ color: '#1D1D1F' }}>Invoice Amount</th>
                    <th className="px-4 py-3 text-right" style={{ color: '#1D1D1F' }}>Paid Amount</th>
                    <th className="px-4 py-3 text-right" style={{ color: '#1D1D1F' }}>Commission Base</th>
                    <th className="px-4 py-3 text-right" style={{ color: '#1D1D1F' }}>Rate</th>
                    <th className="px-4 py-3 text-right" style={{ color: '#1D1D1F' }}>Commission</th>
                  </tr>
                </thead>
                <tbody>
                  {preview.items.map((item, idx) => (
                    <tr key={idx} className="border-b border-gray-200" style={{ borderColor: '#E5E5EA' }}>
                      <td className="px-4 py-3">{item.invoiceNo}</td>
                      <td className="px-4 py-3">{item.customer}</td>
                      <td className="px-4 py-3 text-right">
                        {item.invoiceAmount.toLocaleString('en-US', { style: 'currency', currency: 'USD' })}
                      </td>
                      <td className="px-4 py-3 text-right">
                        {item.paidAmount.toLocaleString('en-US', { style: 'currency', currency: 'USD' })}
                      </td>
                      <td className="px-4 py-3 text-right">
                        {item.commissionBase.toLocaleString('en-US', { style: 'currency', currency: 'USD' })}
                      </td>
                      <td className="px-4 py-3 text-right">{item.rate}%</td>
                      <td className="px-4 py-3 text-right" style={{ color: '#007AFF' }}>
                        <strong>
                          {item.commissionAmount.toLocaleString('en-US', { style: 'currency', currency: 'USD' })}
                        </strong>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardBody>
        </Card>

        <div className="flex gap-4">
          <Button
            variant="outline"
            onClick={() => setShowPreview(false)}
            className="rounded-2xl"
          >
            Back to Edit
          </Button>
          <Button
            onClick={handleConfirmAndSave}
            disabled={loading}
            style={{ background: '#007AFF', color: 'white' }}
            className="rounded-2xl"
          >
            {loading ? 'Saving...' : 'Confirm & Save'}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6" style={{ background: '#F5F5F7' }}>
      <div className="flex items-center gap-4">
        <Button
          variant="outline"
          onClick={() => router.back()}
          className="rounded-2xl"
        >
          Cancel
        </Button>
        <h1 className="text-3xl font-bold" style={{ color: '#1D1D1F' }}>
          New Commission Calculation
        </h1>
      </div>

      <Card className="rounded-2xl overflow-hidden">
        <CardBody>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-semibold mb-2" style={{ color: '#1D1D1F' }}>
                Salesperson *
              </label>
              <select
                value={formData.salespersonId}
                onChange={(e) => setFormData({ ...formData, salespersonId: e.target.value })}
                className="w-full px-4 py-2 rounded-2xl border"
                style={{ borderColor: '#007AFF' }}
              >
                <option value="">Select a salesperson</option>
                {employees.map((emp) => (
                  <option key={emp.id} value={emp.id}>
                    {emp.firstName} {emp.lastName}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold mb-2" style={{ color: '#1D1D1F' }}>
                  Period From *
                </label>
                <input
                  type="date"
                  value={formData.periodFrom}
                  onChange={(e) => setFormData({ ...formData, periodFrom: e.target.value })}
                  className="w-full px-4 py-2 rounded-2xl border"
                  style={{ borderColor: '#007AFF' }}
                />
              </div>
              <div>
                <label className="block text-sm font-semibold mb-2" style={{ color: '#1D1D1F' }}>
                  Period To *
                </label>
                <input
                  type="date"
                  value={formData.periodTo}
                  onChange={(e) => setFormData({ ...formData, periodTo: e.target.value })}
                  className="w-full px-4 py-2 rounded-2xl border"
                  style={{ borderColor: '#007AFF' }}
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold mb-2" style={{ color: '#1D1D1F' }}>
                Basis *
              </label>
              <select
                value={formData.basis}
                onChange={(e) => setFormData({ ...formData, basis: e.target.value as 'invoiced' | 'paid' })}
                className="w-full px-4 py-2 rounded-2xl border"
                style={{ borderColor: '#007AFF' }}
              >
                <option value="invoiced">Invoiced</option>
                <option value="paid">Paid</option>
              </select>
            </div>
          </div>
        </CardBody>
      </Card>

      <Button
        onClick={handleCalculate}
        disabled={loading}
        style={{ background: '#007AFF', color: 'white' }}
        className="rounded-2xl w-full py-3"
      >
        {loading ? 'Calculating...' : 'Calculate'}
      </Button>
    </div>
  );
}
