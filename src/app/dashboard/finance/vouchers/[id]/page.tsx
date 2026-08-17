'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { Card, CardBody, CardHeader, Button, Badge } from '@/components/ui';

interface VoucherData {
  id: string;
  voucherNo: string;
  voucherType: string;
  sourceModule: string;
  sourceId?: string;
  sourceRef?: string;
  payeeType: string;
  payeeId?: string;
  payeeName: string;
  amount: number;
  paymentMethod: string;
  bankAccountId?: string;
  bankName?: string;
  checkNo?: string;
  refNo?: string;
  description?: string;
  status: string;
  preparedBy?: string;
  checkedBy?: string;
  checkedAt?: string;
  approvedBy?: string;
  approvedAt?: string;
  postedBy?: string;
  postedAt?: string;
  rejectionReason?: string;
  voucherDate: string;
  createdAt: string;
}

export default function VoucherDetailPage() {
  const router = useRouter();
  const params = useParams();
  const voucherId = params?.id as string;
  const { data: session } = useSession();
  const userRole = (session?.user as any)?.role || '';

  // ADMIN and MANAGER can approve pending vouchers
  const canApprove = userRole === 'ADMIN' || userRole === 'MANAGER';
  // ADMIN, MANAGER, and FINANCE can post approved vouchers
  const canPost = userRole === 'ADMIN' || userRole === 'MANAGER' || userRole === 'FINANCE';

  const [voucher, setVoucher] = useState<VoucherData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  const fetchVoucher = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/finance/vouchers/${voucherId}`);
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to fetch voucher');
      }
      setVoucher(data.data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (voucherId) fetchVoucher();
  }, [voucherId]);

  const handleStatusChange = async (newStatus: string) => {
    if (!confirm(`Are you sure you want to change the status to "${newStatus}"?`)) return;

    setActionLoading(true);
    try {
      const res = await fetch(`/api/finance/vouchers/${voucherId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to update status');
      }
      setVoucher(data.data);

      if (data.journal) {
        if (data.journal.created) {
          alert(`Voucher posted! Auto-journal ${data.journal.journalVoucherNo} created.`);
        } else {
          alert(`Voucher posted. Note: ${data.journal.reason}`);
        }
      }
    } catch (err: any) {
      alert(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm(`Are you sure you want to delete voucher "${voucher?.voucherNo}"? This will cancel the voucher and reverse any bank transactions.`)) return;

    setActionLoading(true);
    try {
      const res = await fetch(`/api/finance/vouchers/${voucherId}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to delete voucher');
      }
      alert('Voucher deleted successfully.');
      router.push('/dashboard/finance/vouchers');
    } catch (err: any) {
      alert(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const formatDate = (date?: string) => {
    if (!date) return '—';
    try {
      return new Date(date).toLocaleDateString('en-US', {
        year: 'numeric', month: 'short', day: 'numeric',
      });
    } catch {
      return date;
    }
  };

  const formatDateTime = (date?: string) => {
    if (!date) return '—';
    try {
      return new Date(date).toLocaleString('en-US', {
        year: 'numeric', month: 'short', day: 'numeric',
        hour: '2-digit', minute: '2-digit',
      });
    } catch {
      return date;
    }
  };

  const formatCurrency = (val?: number) => {
    if (val === undefined || val === null) return '—';
    return `ETB ${val.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const handlePrint = () => {
    if (!voucher) return;
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>${voucher.voucherNo} - Payment Voucher</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 40px; color: #333; }
          .header { text-align: center; border-bottom: 2px solid #333; padding-bottom: 20px; margin-bottom: 20px; }
          .header h1 { margin: 0; font-size: 24px; }
          .header h2 { margin: 5px 0; font-size: 18px; color: #666; }
          .header p { margin: 5px 0; color: #888; }
          .voucher-info { display: flex; justify-content: space-between; margin-bottom: 20px; }
          .voucher-info div { flex: 1; }
          .field { margin-bottom: 10px; }
          .field label { font-size: 11px; text-transform: uppercase; color: #888; font-weight: bold; display: block; }
          .field span { font-size: 14px; display: block; margin-top: 2px; }
          .amount-box { background: #f0f4ff; border: 1px solid #ccc; padding: 15px; text-align: center; margin: 20px 0; border-radius: 4px; }
          .amount-box .label { font-size: 12px; color: #666; text-transform: uppercase; }
          .amount-box .value { font-size: 28px; font-weight: bold; }
          table { width: 100%; border-collapse: collapse; margin: 20px 0; }
          table th, table td { border: 1px solid #ccc; padding: 8px 12px; text-align: left; font-size: 13px; }
          table th { background: #f5f5f5; font-weight: bold; }
          .signatures { display: flex; justify-content: space-between; margin-top: 60px; }
          .sig-block { text-align: center; width: 30%; }
          .sig-line { border-top: 1px solid #333; margin-top: 50px; padding-top: 5px; font-size: 12px; }
          @media print { body { padding: 20px; } }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>SAMARIA TRADING PLC</h1>
          <h2>${voucher.voucherType === 'PAYMENT' ? 'PAYMENT VOUCHER' : voucher.voucherType === 'RECEIPT' ? 'RECEIPT VOUCHER' : 'REFUND VOUCHER'}</h2>
          <p>Voucher No: <strong>${voucher.voucherNo}</strong></p>
        </div>

        <div class="voucher-info">
          <div>
            <div class="field"><label>Voucher Date</label><span>${new Date(voucher.voucherDate).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</span></div>
            <div class="field"><label>Payee</label><span><strong>${voucher.payeeName}</strong></span></div>
            <div class="field"><label>Payee Type</label><span>${voucher.payeeType}</span></div>
          </div>
          <div>
            <div class="field"><label>Payment Method</label><span>${voucher.paymentMethod.replace('_', ' ')}</span></div>
            ${voucher.bankName ? `<div class="field"><label>Bank</label><span>${voucher.bankName}</span></div>` : ''}
            ${voucher.checkNo ? `<div class="field"><label>Check No</label><span>${voucher.checkNo}</span></div>` : ''}
            ${voucher.refNo ? `<div class="field"><label>Reference No</label><span>${voucher.refNo}</span></div>` : ''}
          </div>
        </div>

        <div class="amount-box">
          <div class="label">Amount</div>
          <div class="value">ETB ${voucher.amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
        </div>

        ${voucher.description ? `<div class="field"><label>Description / Purpose</label><span>${voucher.description}</span></div>` : ''}

        <table>
          <tr><th>Source Module</th><td>${voucher.sourceModule}</td></tr>
          ${voucher.sourceRef ? `<tr><th>Source Reference</th><td>${voucher.sourceRef}</td></tr>` : ''}
          <tr><th>Status</th><td>${voucher.status.replace('_', ' ')}</td></tr>
        </table>

        <div class="signatures">
          <div class="sig-block">
            <div class="sig-line">Prepared By</div>
            ${voucher.preparedBy ? `<p style="font-size:12px;margin-top:5px">${voucher.preparedBy}</p>` : ''}
          </div>
          <div class="sig-block">
            <div class="sig-line">Checked By</div>
            ${voucher.checkedBy ? `<p style="font-size:12px;margin-top:5px">${voucher.checkedBy}</p>` : ''}
          </div>
          <div class="sig-block">
            <div class="sig-line">Approved By</div>
            ${voucher.approvedBy ? `<p style="font-size:12px;margin-top:5px">${voucher.approvedBy}</p>` : ''}
          </div>
        </div>

        <script>window.onload = function() { window.print(); }</script>
      </body>
      </html>
    `);
    printWindow.document.close();
  };

  const getBadgeStatus = (status: string) => {
    switch (status) {
      case 'Draft': return 'Draft';
      case 'Pending_Approval': return 'Draft';
      case 'Approved': return 'Active';
      case 'Posted': return 'Active';
      case 'Rejected': return 'Rejected';
      case 'Cancelled': return 'Rejected';
      default: return 'Draft';
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'PAYMENT': return 'bg-red-100 text-red-800';
      case 'RECEIPT': return 'bg-green-100 text-green-800';
      case 'REFUND': return 'bg-amber-100 text-amber-800';
      default: return 'bg-slate-100 text-slate-800';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="text-slate-600">Loading voucher...</p>
        </div>
      </div>
    );
  }

  if (error || !voucher) {
    return (
      <div className="space-y-6">
        <Button variant="secondary" onClick={() => router.push('/dashboard/finance/vouchers')}>
          &larr; Back to Vouchers
        </Button>
        <Card>
          <CardBody>
            <p className="text-red-600">{error || 'Voucher not found'}</p>
          </CardBody>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <button
            onClick={() => router.push('/dashboard/finance/vouchers')}
            className="text-blue-600 hover:text-blue-800 text-sm font-medium mb-2 block"
          >
            &larr; Back to Vouchers
          </button>
          <h1 className="text-2xl sm:text-3xl font-bold text-[#1D1D1F]">{voucher.voucherNo}</h1>
          <div className="flex items-center gap-3 mt-2">
            <span className={`px-3 py-1 rounded-full text-sm font-semibold ${getTypeColor(voucher.voucherType)}`}>
              {voucher.voucherType}
            </span>
            <Badge status={getBadgeStatus(voucher.status)}>{voucher.status.replace('_', ' ')}</Badge>
          </div>
        </div>
        <div className="text-right flex flex-col items-end gap-2">
          <div>
            <p className="text-sm text-slate-500">Amount</p>
            <p className="text-3xl font-bold text-[#1D1D1F]">{formatCurrency(voucher.amount)}</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-sm font-medium transition-colors"
            >
              Print Voucher
            </button>
            <Button
              variant="danger"
              size="md"
              onClick={handleDelete}
              isLoading={actionLoading}
            >
              Delete
            </Button>
          </div>
        </div>
      </div>

      {/* Voucher Details */}
      <Card>
        <CardHeader>
          <h2 className="text-lg font-semibold text-[#1D1D1F]">Voucher Details</h2>
        </CardHeader>
        <CardBody>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Voucher Number</p>
              <p className="text-base font-medium text-slate-900 mt-1">{voucher.voucherNo}</p>
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Voucher Date</p>
              <p className="text-base font-medium text-slate-900 mt-1">{formatDate(voucher.voucherDate)}</p>
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Source Module</p>
              <p className="text-base font-medium text-slate-900 mt-1">{voucher.sourceModule}</p>
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Source Reference</p>
              <p className="text-base font-medium text-slate-900 mt-1">{voucher.sourceRef || '—'}</p>
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Created</p>
              <p className="text-base font-medium text-slate-900 mt-1">{formatDateTime(voucher.createdAt)}</p>
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Reference No</p>
              <p className="text-base font-medium text-slate-900 mt-1">{voucher.refNo || '—'}</p>
            </div>
          </div>
        </CardBody>
      </Card>

      {/* Payee Details */}
      <Card>
        <CardHeader>
          <h2 className="text-lg font-semibold text-[#1D1D1F]">Payee Information</h2>
        </CardHeader>
        <CardBody>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Payee Type</p>
              <p className="text-base font-medium text-slate-900 mt-1">{voucher.payeeType}</p>
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Payee Name</p>
              <p className="text-lg font-semibold text-slate-900 mt-1">{voucher.payeeName}</p>
            </div>
          </div>
        </CardBody>
      </Card>

      {/* Payment Details */}
      <Card>
        <CardHeader>
          <h2 className="text-lg font-semibold text-[#1D1D1F]">Payment Information</h2>
        </CardHeader>
        <CardBody>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
              <p className="text-xs font-semibold text-blue-600 uppercase tracking-wide">Amount</p>
              <p className="text-2xl font-bold text-blue-900 mt-1">{formatCurrency(voucher.amount)}</p>
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Payment Method</p>
              <p className="text-base font-medium text-slate-900 mt-1 capitalize">{voucher.paymentMethod.replace('_', ' ')}</p>
            </div>
            {voucher.bankName && (
              <div>
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Bank</p>
                <p className="text-base font-medium text-slate-900 mt-1">{voucher.bankName}</p>
              </div>
            )}
            {voucher.checkNo && (
              <div>
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Check Number</p>
                <p className="text-base font-medium text-slate-900 mt-1">{voucher.checkNo}</p>
              </div>
            )}
          </div>
        </CardBody>
      </Card>

      {/* Description */}
      {voucher.description && (
        <Card>
          <CardHeader>
            <h2 className="text-lg font-semibold text-[#1D1D1F]">Description</h2>
          </CardHeader>
          <CardBody>
            <p className="text-slate-700 whitespace-pre-wrap">{voucher.description}</p>
          </CardBody>
        </Card>
      )}

      {/* Approval Trail */}
      {(voucher.preparedBy || voucher.checkedBy || voucher.approvedBy || voucher.postedBy) && (
        <Card>
          <CardHeader>
            <h2 className="text-lg font-semibold text-[#1D1D1F]">Approval Trail</h2>
          </CardHeader>
          <CardBody>
            <div className="space-y-3">
              {voucher.preparedBy && (
                <div className="flex justify-between items-center py-2 border-b border-slate-100">
                  <div>
                    <p className="text-sm font-medium text-slate-900">Prepared by</p>
                    <p className="text-sm text-slate-600">{voucher.preparedBy}</p>
                  </div>
                  <p className="text-sm text-slate-500">{formatDateTime(voucher.createdAt)}</p>
                </div>
              )}
              {voucher.checkedBy && (
                <div className="flex justify-between items-center py-2 border-b border-slate-100">
                  <div>
                    <p className="text-sm font-medium text-slate-900">Checked by</p>
                    <p className="text-sm text-slate-600">{voucher.checkedBy}</p>
                  </div>
                  <p className="text-sm text-slate-500">{formatDateTime(voucher.checkedAt)}</p>
                </div>
              )}
              {voucher.approvedBy && (
                <div className="flex justify-between items-center py-2 border-b border-slate-100">
                  <div>
                    <p className="text-sm font-medium text-slate-900">Approved by</p>
                    <p className="text-sm text-slate-600">{voucher.approvedBy}</p>
                  </div>
                  <p className="text-sm text-slate-500">{formatDateTime(voucher.approvedAt)}</p>
                </div>
              )}
              {voucher.postedBy && (
                <div className="flex justify-between items-center py-2">
                  <div>
                    <p className="text-sm font-medium text-slate-900">Posted by</p>
                    <p className="text-sm text-slate-600">{voucher.postedBy}</p>
                  </div>
                  <p className="text-sm text-slate-500">{formatDateTime(voucher.postedAt)}</p>
                </div>
              )}
            </div>
          </CardBody>
        </Card>
      )}

      {/* Rejection Reason */}
      {voucher.rejectionReason && (
        <Card>
          <CardBody>
            <div className="bg-red-50 border border-red-200 rounded-xl p-4">
              <p className="text-sm font-semibold text-red-800">Rejection Reason</p>
              <p className="text-red-700 mt-1">{voucher.rejectionReason}</p>
            </div>
          </CardBody>
        </Card>
      )}

      {/* Actions */}
      {voucher.status !== 'Posted' && voucher.status !== 'Cancelled' && (
        <Card>
          <CardHeader>
            <h2 className="text-lg font-semibold text-[#1D1D1F]">Actions</h2>
          </CardHeader>
          <CardBody>
            <div className="flex flex-wrap gap-3">
              {voucher.status === 'Draft' && (
                <Button
                  variant="primary"
                  onClick={() => handleStatusChange('Pending_Approval')}
                  isLoading={actionLoading}
                >
                  Submit for Approval
                </Button>
              )}
              {voucher.status === 'Pending_Approval' && canApprove && (
                <>
                  <Button
                    variant="primary"
                    onClick={() => handleStatusChange('Approved')}
                    isLoading={actionLoading}
                  >
                    Approve
                  </Button>
                  <Button
                    variant="secondary"
                    onClick={() => handleStatusChange('Rejected')}
                    isLoading={actionLoading}
                  >
                    Reject
                  </Button>
                </>
              )}
              {voucher.status === 'Pending_Approval' && !canApprove && (
                <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
                  <p className="text-sm text-amber-800">
                    Awaiting approval — only Manager or Owner can approve this voucher.
                  </p>
                </div>
              )}
              {voucher.status === 'Approved' && canPost && (
                <Button
                  variant="primary"
                  onClick={() => handleStatusChange('Posted')}
                  isLoading={actionLoading}
                >
                  Post Voucher
                </Button>
              )}
              {voucher.status === 'Approved' && !canPost && (
                <div className="bg-green-50 border border-green-200 rounded-xl px-4 py-3">
                  <p className="text-sm text-green-800">
                    Approved — only Finance, Manager, or Admin can post this voucher.
                  </p>
                </div>
              )}
              {voucher.status === 'Rejected' && (
                <Button
                  variant="secondary"
                  onClick={() => handleStatusChange('Draft')}
                  isLoading={actionLoading}
                >
                  Revert to Draft
                </Button>
              )}
              {voucher.status !== 'Posted' && (
                <Button
                  variant="danger"
                  onClick={handleDelete}
                  isLoading={actionLoading}
                >
                  Delete Voucher
                </Button>
              )}
            </div>
          </CardBody>
        </Card>
      )}
    </div>
  );
}
