'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { Card, CardHeader, CardBody, Button, Badge } from '@/components/ui';
import { CheckCircle, XCircle, ArrowLeft, Receipt, Loader } from 'lucide-react';

interface PaymentData {
  id: string;
  receiptNo: string;
  customerId: string;
  invoiceId: string | null;
  amount: number;
  paymentMethod: string;
  bankName: string | null;
  refNo: string | null;
  depositSlip: string | null;
  status: string;
  paymentDate: string;
  createdAt: string;
  customer?: { id: string; companyName: string; phone?: string };
  invoice?: { id: string; invoiceNo: string; totalAmount: number; status: string };
}

export default function CustomerPaymentDetailPage() {
  const router = useRouter();
  const params = useParams();
  const recordId = params?.id as string;

  const [data, setData] = useState<PaymentData | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchData = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/sales/payments/${recordId}`);
      const result = await response.json();
      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Failed to fetch record');
      }
      setData(result.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (recordId) fetchData();
  }, [recordId]);

  const handleStatusChange = async (newStatus: 'Verified' | 'Rejected') => {
    if (!data) return;
    const action = newStatus === 'Verified' ? 'verify' : 'reject';
    if (!confirm(`Are you sure you want to ${action} this payment of ETB ${Number(data.amount).toLocaleString('en-US')}?`)) return;

    setActionLoading(true);
    try {
      const res = await fetch(`/api/sales/payments/${recordId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: newStatus,
          ...(newStatus === 'Verified' ? { verifiedBy: 'admin' } : {}),
        }),
      });
      const result = await res.json();
      if (result.success) {
        setData(result.data);
        const invoiceMsg = result.invoiceUpdate
          ? ` Invoice ${result.invoiceUpdate.invoiceNo} updated to "${result.invoiceUpdate.newStatus}".`
          : '';
        alert(`Payment ${action === 'verify' ? 'verified' : 'rejected'} successfully!${invoiceMsg}`);
      } else {
        alert(result.error || `Failed to ${action} payment`);
      }
    } catch {
      alert(`Failed to ${action} payment`);
    }
    setActionLoading(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader className="w-8 h-8 animate-spin text-blue-500" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="space-y-6">
        <Link href="/dashboard/sales/payments" className="text-blue-600 hover:text-blue-800 font-medium">
          <ArrowLeft className="w-4 h-4 inline" /> Back to Payments
        </Link>
        <Card>
          <CardBody>
            <p className="text-red-600">{error || 'Record not found'}</p>
          </CardBody>
        </Card>
      </div>
    );
  }

  const statusColor: Record<string, string> = {
    Pending: 'Pending',
    Verified: 'Active',
    Rejected: 'Rejected',
  };

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-[#86868B]">
        <Link href="/dashboard/sales/payments" className="text-[#007AFF] hover:text-[#0055D4]">
          <ArrowLeft className="w-4 h-4 inline" /> Customer Payments
        </Link>
        <span>/</span>
        <span className="text-[#1D1D1F] font-medium">{data.receiptNo}</span>
      </div>

      {/* Header */}
      <div className="flex flex-wrap justify-between items-start gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-[#1D1D1F]">
            <Receipt className="w-7 h-7 inline mr-2 text-blue-600" />
            {data.receiptNo}
          </h1>
          <p className="text-slate-500 text-sm mt-1">
            Payment from <span className="font-semibold text-slate-700">{data.customer?.companyName || '—'}</span>
          </p>
        </div>
        <div className="flex gap-2 items-center">
          <Badge status={statusColor[data.status] || 'Pending'}>{data.status}</Badge>
        </div>
      </div>

      {/* Action Buttons for Pending */}
      {data.status === 'Pending' && (
        <div className="flex gap-3">
          <Button
            variant="primary"
            size="lg"
            onClick={() => handleStatusChange('Verified')}
            isLoading={actionLoading}
          >
            <CheckCircle className="w-4 h-4 mr-1" /> Verify Payment
          </Button>
          <Button
            variant="outline"
            size="lg"
            onClick={() => handleStatusChange('Rejected')}
            isLoading={actionLoading}
          >
            <XCircle className="w-4 h-4 mr-1" /> Reject
          </Button>
        </div>
      )}

      {/* Payment Details */}
      <Card>
        <CardHeader>
          <h2 className="text-lg font-semibold text-[#1D1D1F]">Payment Details</h2>
        </CardHeader>
        <CardBody>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Receipt No</label>
              <p className="text-lg font-medium text-slate-900 mt-1">{data.receiptNo}</p>
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Amount</label>
              <p className="text-lg font-bold text-slate-900 mt-1">ETB {Number(data.amount).toLocaleString('en-US', { minimumFractionDigits: 2 })}</p>
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Customer</label>
              <p className="text-lg font-medium text-slate-900 mt-1">{data.customer?.companyName || data.customerId}</p>
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Invoice</label>
              <p className="text-lg font-medium text-slate-900 mt-1">
                {data.invoice ? (
                  <Link href={`/dashboard/sales/invoices/${data.invoice.id}`} className="text-blue-600 hover:text-blue-800">
                    {data.invoice.invoiceNo} (ETB {Number(data.invoice.totalAmount).toLocaleString('en-US')})
                  </Link>
                ) : '—'}
              </p>
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Payment Method</label>
              <p className="text-lg font-medium text-slate-900 mt-1 capitalize">{data.paymentMethod?.replace('_', ' ') || '—'}</p>
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Bank</label>
              <p className="text-lg font-medium text-slate-900 mt-1">{data.bankName || '—'}</p>
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Reference No</label>
              <p className="text-lg font-medium text-slate-900 mt-1">{data.refNo || '—'}</p>
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Payment Date</label>
              <p className="text-lg font-medium text-slate-900 mt-1">
                {data.paymentDate ? new Date(data.paymentDate).toLocaleDateString() : '—'}
              </p>
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Status</label>
              <div className="mt-1">
                <Badge status={statusColor[data.status] || 'Pending'}>{data.status}</Badge>
              </div>
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Created</label>
              <p className="text-lg font-medium text-slate-900 mt-1">
                {new Date(data.createdAt).toLocaleString('en-US')}
              </p>
            </div>
          </div>
        </CardBody>
      </Card>

      {/* Bottom Actions */}
      <div className="flex gap-3 pb-8">
        <Button variant="outline" onClick={() => router.push('/dashboard/sales/payments')}>
          Back to Payments
        </Button>
        {data.status === 'Pending' && (
          <Button variant="outline" onClick={() => router.push(`/dashboard/sales/payments/${recordId}/edit`)}>
            Edit
          </Button>
        )}
      </div>
    </div>
  );
}
