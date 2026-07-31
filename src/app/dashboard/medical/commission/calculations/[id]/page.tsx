'use client';
import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Card, CardHeader, CardBody, Button, Badge, Input } from '@/components/ui';

interface CommissionItem {
  id: number;
  invoiceNo: string;
  customer: string;
  invoiceAmount: number;
  paidAmount: number;
  commissionBase: number;
  rate: number;
  commissionAmount: number;
}

interface CommissionDetail {
  id: number;
  calcNo: string;
  salesperson: string;
  period: string;
  basis: string;
  rate: number;
  totalSales: number;
  grossCommission: number;
  adjustments: number;
  netCommission: number;
  status: 'Calculated' | 'Approved' | 'Paid' | 'Reversed';
  items: CommissionItem[];
}

export default function CommissionDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [data, setData] = useState<CommissionDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectReason, setRejectReason] = useState('');

  const fetchDetail = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/commission/calculations/${id}`);
      if (!res.ok) throw new Error('Failed to fetch');
      const result = await res.json();
      setData(result.data);
    } catch (err) {
      console.error('Error fetching commission detail:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDetail();
  }, [id]);

  const handleApprove = async () => {
    if (!data) return;
    setActionLoading(true);
    try {
      const res = await fetch(`/api/commission/calculations/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'Approved' }),
      });
      if (!res.ok) throw new Error('Failed to approve');
      fetchDetail();
    } catch (err) {
      console.error('Error approving:', err);
      alert('Failed to approve calculation');
    } finally {
      setActionLoading(false);
    }
  };

  const handlePay = async () => {
    if (!data) return;
    setActionLoading(true);
    try {
      const res = await fetch(`/api/commission/calculations/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'Paid' }),
      });
      if (!res.ok) throw new Error('Failed to pay');
      fetchDetail();
    } catch (err) {
      console.error('Error paying:', err);
      alert('Failed to mark as paid');
    } finally {
      setActionLoading(false);
    }
  };

  const handleReverse = async () => {
    if (!data) return;
    setActionLoading(true);
    try {
      const res = await fetch(`/api/commission/calculations/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'Reversed', reason: rejectReason }),
      });
      if (!res.ok) throw new Error('Failed to reverse');
      setShowRejectModal(false);
      fetchDetail();
    } catch (err) {
      console.error('Error reversing:', err);
      alert('Failed to reverse calculation');
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return <div className="p-6">Loading...</div>;
  }

  if (!data) {
    return <div className="p-6">Commission calculation not found</div>;
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

  return (
    <div className="space-y-6 p-6" style={{ background: '#F5F5F7' }}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="outline"
            onClick={() => router.back()}
            className="rounded-2xl"
          >
            Back
          </Button>
          <h1 className="text-3xl font-bold" style={{ color: '#1D1D1F' }}>
            {data.calcNo}
          </h1>
        </div>
        <Badge status={data.status} className={getStatusColor(data.status)}>
          {data.status}
        </Badge>
      </div>

      <Card className="rounded-2xl overflow-hidden">
        <CardHeader className="bg-[#F5F5F7] border-b border-[#E5E5EA]">
          <h2 className="text-lg font-bold" style={{ color: '#1D1D1F' }}>Summary</h2>
        </CardHeader>
        <CardBody>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <div className="p-4 rounded-2xl" style={{ background: '#F5F5F7' }}>
              <div className="text-sm" style={{ color: '#666' }}>Salesperson</div>
              <div className="text-lg font-bold" style={{ color: '#1D1D1F' }}>{data.salesperson}</div>
            </div>
            <div className="p-4 rounded-2xl" style={{ background: '#F5F5F7' }}>
              <div className="text-sm" style={{ color: '#666' }}>Period</div>
              <div className="text-lg font-bold" style={{ color: '#1D1D1F' }}>{data.period}</div>
            </div>
            <div className="p-4 rounded-2xl" style={{ background: '#F5F5F7' }}>
              <div className="text-sm" style={{ color: '#666' }}>Basis</div>
              <div className="text-lg font-bold" style={{ color: '#1D1D1F' }}>{data.basis}</div>
            </div>
            <div className="p-4 rounded-2xl" style={{ background: '#F5F5F7' }}>
              <div className="text-sm" style={{ color: '#666' }}>Rate</div>
              <div className="text-lg font-bold" style={{ color: '#1D1D1F' }}>{data.rate}%</div>
            </div>
            <div className="p-4 rounded-2xl" style={{ background: '#F5F5F7' }}>
              <div className="text-sm" style={{ color: '#666' }}>Total Sales</div>
              <div className="text-lg font-bold" style={{ color: '#1D1D1F' }}>
                {data.totalSales.toLocaleString('en-US', { style: 'currency', currency: 'USD' })}
              </div>
            </div>
            <div className="p-4 rounded-2xl" style={{ background: '#007AFF20' }}>
              <div className="text-sm" style={{ color: '#666' }}>Gross Commission</div>
              <div className="text-lg font-bold" style={{ color: '#007AFF' }}>
                {data.grossCommission.toLocaleString('en-US', { style: 'currency', currency: 'USD' })}
              </div>
            </div>
            <div className="p-4 rounded-2xl" style={{ background: '#F5F5F7' }}>
              <div className="text-sm" style={{ color: '#666' }}>Adjustments</div>
              <div className="text-lg font-bold" style={{ color: '#1D1D1F' }}>
                {data.adjustments.toLocaleString('en-US', { style: 'currency', currency: 'USD' })}
              </div>
            </div>
            <div className="p-4 rounded-2xl" style={{ background: '#007AFF20' }}>
              <div className="text-sm" style={{ color: '#666' }}>Net Commission</div>
              <div className="text-lg font-bold" style={{ color: '#007AFF' }}>
                {data.netCommission.toLocaleString('en-US', { style: 'currency', currency: 'USD' })}
              </div>
            </div>
          </div>
        </CardBody>
      </Card>

      <Card className="rounded-2xl overflow-hidden">
        <CardHeader className="bg-[#F5F5F7] border-b border-[#E5E5EA]">
          <h2 className="text-lg font-bold" style={{ color: '#1D1D1F' }}>Commission Items</h2>
        </CardHeader>
        <CardBody>
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
                  <th className="px-4 py-3 text-right" style={{ color: '#1D1D1F' }}>Commission Amount</th>
                </tr>
              </thead>
              <tbody>
                {data.items.map((item) => (
                  <tr key={item.id} className="border-b border-gray-200" style={{ borderColor: '#E5E5EA' }}>
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

      <div className="flex gap-3 flex-wrap">
        {data.status === 'Calculated' && (
          <Button
            onClick={handleApprove}
            disabled={actionLoading}
            style={{ background: '#007AFF', color: 'white' }}
            className="rounded-2xl"
          >
            {actionLoading ? 'Processing...' : 'Approve'}
          </Button>
        )}
        {data.status === 'Approved' && (
          <Button
            onClick={handlePay}
            disabled={actionLoading}
            style={{ background: '#34C759', color: 'white' }}
            className="rounded-2xl"
          >
            {actionLoading ? 'Processing...' : 'Mark as Paid'}
          </Button>
        )}
        {data.status === 'Paid' && (
          <Button
            onClick={() => setShowRejectModal(true)}
            disabled={actionLoading}
            variant="danger"
            className="rounded-2xl"
          >
            Reverse
          </Button>
        )}
      </div>

      {showRejectModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 rounded-2xl">
          <Card className="rounded-2xl w-96">
            <CardHeader className="bg-[#F5F5F7] border-b border-[#E5E5EA]">
              <h2 className="text-lg font-bold" style={{ color: '#1D1D1F' }}>Reverse Calculation</h2>
            </CardHeader>
            <CardBody className="space-y-4">
              <div>
                <label className="block text-sm font-semibold mb-2" style={{ color: '#1D1D1F' }}>
                  Reason for Reversal
                </label>
                <textarea
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  placeholder="Enter reason..."
                  className="w-full px-4 py-2 rounded-2xl border"
                  style={{ borderColor: '#007AFF' }}
                  rows={4}
                />
              </div>
              <div className="flex gap-3">
                <Button
                  variant="outline"
                  onClick={() => setShowRejectModal(false)}
                  className="flex-1 rounded-2xl"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleReverse}
                  disabled={actionLoading || !rejectReason}
                  style={{ background: '#FF3B30', color: 'white' }}
                  className="flex-1 rounded-2xl"
                >
                  {actionLoading ? 'Processing...' : 'Reverse'}
                </Button>
              </div>
            </CardBody>
          </Card>
        </div>
      )}
    </div>
  );
}
