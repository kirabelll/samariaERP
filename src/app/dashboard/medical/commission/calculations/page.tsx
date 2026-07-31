'use client';
import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardHeader, CardBody, Button, Badge, Input } from '@/components/ui';
import type { ColumnDef } from '@/components/ui';

interface CommissionCalculation {
  id: number;
  calcNo: string;
  salesperson: string;
  period: string;
  basis: 'invoiced' | 'paid';
  totalSales: number;
  rate: number;
  grossCommission: number;
  netCommission: number;
  status: 'Calculated' | 'Approved' | 'Paid' | 'Reversed';
  date: string;
}

const getStatusColor = (status: string) => {
  switch (status) {
    case 'Calculated': return 'bg-blue-100 text-blue-800';
    case 'Approved': return 'bg-green-100 text-green-800';
    case 'Paid': return 'bg-emerald-100 text-emerald-800';
    case 'Reversed': return 'bg-red-100 text-red-800';
    default: return 'bg-gray-100 text-gray-800';
  }
};

export default function CommissionCalculationsPage() {
  const router = useRouter();
  const [data, setData] = useState<CommissionCalculation[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  const fetchCalculations = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/commission/calculations');
      if (!res.ok) throw new Error('Failed to fetch');
      const result = await res.json();
      setData(result.data || []);
    } catch (err) {
      console.error('Error fetching commission calculations:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCalculations();
  }, []);

  const filteredData = data.filter(
    (item) =>
      (item.calcNo ?? '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (item.salesperson ?? '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6 p-6" style={{ background: '#F5F5F7' }}>
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold" style={{ color: '#1D1D1F' }}>
          Commission Calculations
        </h1>
        <Button
          onClick={() => router.push('/dashboard/medical/commission/calculations/new')}
          style={{ background: '#007AFF', color: 'white' }}
          className="rounded-2xl"
        >
          New Calculation
        </Button>
      </div>

      <div className="mb-4">
        <Input
          placeholder="Search by Calc No or Salesperson..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="rounded-2xl"
          style={{ borderColor: '#007AFF' }}
        />
      </div>

      <Card className="rounded-2xl overflow-hidden">
        <CardBody>
          {loading ? (
            <div className="text-center py-8">Loading...</div>
          ) : filteredData.length === 0 ? (
            <div className="text-center py-8">No commission calculations found</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr style={{ background: '#F5F5F7', borderBottom: '1px solid #E5E5EA' }}>
                    <th className="px-4 py-3 text-left text-sm font-semibold" style={{ color: '#1D1D1F' }}>
                      Calc No
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-semibold" style={{ color: '#1D1D1F' }}>
                      Salesperson
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-semibold" style={{ color: '#1D1D1F' }}>
                      Period
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-semibold" style={{ color: '#1D1D1F' }}>
                      Basis
                    </th>
                    <th className="px-4 py-3 text-right text-sm font-semibold" style={{ color: '#1D1D1F' }}>
                      Total Sales
                    </th>
                    <th className="px-4 py-3 text-right text-sm font-semibold" style={{ color: '#1D1D1F' }}>
                      Rate %
                    </th>
                    <th className="px-4 py-3 text-right text-sm font-semibold" style={{ color: '#1D1D1F' }}>
                      Gross Commission
                    </th>
                    <th className="px-4 py-3 text-right text-sm font-semibold" style={{ color: '#1D1D1F' }}>
                      Net Commission
                    </th>
                    <th className="px-4 py-3 text-center text-sm font-semibold" style={{ color: '#1D1D1F' }}>
                      Status
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-semibold" style={{ color: '#1D1D1F' }}>
                      Date
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filteredData.map((item) => (
                    <tr
                      key={item.id}
                      onClick={() => router.push(`/dashboard/medical/commission/calculations/${item.id}`)}
                      className="border-b border-gray-200 hover:bg-gray-50 cursor-pointer"
                      style={{ borderColor: '#E5E5EA' }}
                    >
                      <td className="px-4 py-3 text-sm" style={{ color: '#007AFF' }}>
                        <strong>{item.calcNo}</strong>
                      </td>
                      <td className="px-4 py-3 text-sm" style={{ color: '#1D1D1F' }}>
                        {item.salesperson}
                      </td>
                      <td className="px-4 py-3 text-sm" style={{ color: '#1D1D1F' }}>
                        {item.period}
                      </td>
                      <td className="px-4 py-3 text-sm text-[#1D1D1F]">
                        <Badge status={item.basis === 'paid' ? 'Completed' : 'Pending'} className="capitalize">{item.basis}</Badge>
                      </td>
                      <td className="px-4 py-3 text-sm text-right" style={{ color: '#1D1D1F' }}>
                        {item.totalSales.toLocaleString('en-US', { style: 'currency', currency: 'USD' })}
                      </td>
                      <td className="px-4 py-3 text-sm text-right" style={{ color: '#1D1D1F' }}>
                        {item.rate}%
                      </td>
                      <td className="px-4 py-3 text-sm text-right" style={{ color: '#1D1D1F' }}>
                        {item.grossCommission.toLocaleString('en-US', { style: 'currency', currency: 'USD' })}
                      </td>
                      <td className="px-4 py-3 text-sm text-right" style={{ color: '#1D1D1F' }}>
                        {item.netCommission.toLocaleString('en-US', { style: 'currency', currency: 'USD' })}
                      </td>
                      <td className="px-4 py-3 text-sm text-center">
                        <Badge status={item.status} className={getStatusColor(item.status)}>
                          {item.status}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-sm" style={{ color: '#1D1D1F' }}>
                        {new Date(item.date).toLocaleDateString()}
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
