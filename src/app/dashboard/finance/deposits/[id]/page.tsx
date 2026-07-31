'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { Card, CardBody, Button, Badge } from '@/components/ui';
import { ChevronLeft, Download, CheckCircle, XCircle } from 'lucide-react';

interface DepositApplication {
  id: string;
  invoiceId?: string;
  orderId?: string;
  amount: number;
  appliedBy?: string;
  createdAt: string;
}

interface CustomerDeposit {
  id: string;
  depositNo: string;
  customerId?: string;
  customerName?: string;
  customer?: {
    companyName: string;
    code: string;
  };
  amount: number;
  depositMethod: 'cash' | 'bank_transfer' | 'check';
  appliedAmount: number;
  unappliedAmount: number;
  status: 'Pending' | 'Verified' | 'Applied' | 'Partially_Applied' | 'Refunded' | 'Rejected';
  depositSlip?: string | null;
  bankName?: string | null;
  checkNo?: string | null;
  referenceNo?: string | null;
  refNo?: string | null;
  verifiedBy?: string | null;
  verifiedAt?: string | null;
  depositDate?: string;
  createdAt: string;
  applications?: DepositApplication[];
}

interface PageProps {
  params: { id: string };
}

export default function DepositDetailPage({ params }: PageProps) {
  const router = useRouter();
  const { data: session } = useSession();
  const userRole = (session?.user as any)?.role || '';

  // ADMIN, MANAGER, and FINANCE can verify/reject deposits
  const canVerify = userRole === 'ADMIN' || userRole === 'MANAGER' || userRole === 'FINANCE';

  const [deposit, setDeposit] = useState<CustomerDeposit | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    fetchDeposit();
  }, [params.id]);

  const fetchDeposit = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/finance/deposits/${params.id}`);
      const data = await response.json();

      if (data.success) {
        setDeposit(data.data);
      } else {
        setError('Deposit not found');
      }
    } catch (err) {
      console.error('Error fetching deposit:', err);
      setError('Failed to load deposit details');
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (newStatus: string) => {
    const actionLabel = newStatus === 'Verified' ? 'verify' : 'reject';
    if (!confirm(`Are you sure you want to ${actionLabel} this deposit?`)) return;

    setActionLoading(true);
    setSuccessMessage(null);
    try {
      const res = await fetch(`/api/finance/deposits/${params.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: newStatus,
          verifiedBy: (session?.user as any)?.name || (session?.user as any)?.email || 'system',
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || `Failed to ${actionLabel} deposit`);
      }
      setDeposit(data.data);

      if (newStatus === 'Verified') {
        const applied = data.data.appliedAmount?.toLocaleString('en-US', { minimumFractionDigits: 2 }) || '0.00';
        setSuccessMessage(
          `Deposit verified successfully! ETB ${applied} has been applied to unpaid invoices.`
        );
      } else if (newStatus === 'Rejected') {
        setSuccessMessage('Deposit has been rejected.');
      }
    } catch (err: any) {
      alert(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Pending':
        return 'Pending';
      case 'Verified':
        return 'Approved';
      case 'Applied':
        return 'Active';
      case 'Partially_Applied':
        return 'Pending';
      case 'Refunded':
        return 'Draft';
      case 'Rejected':
        return 'Rejected';
      default:
        return 'Draft';
    }
  };

  const formatCurrency = (amount: number) => {
    return `ETB ${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const methodLabel = (method: string) => {
    const methods: { [key: string]: string } = {
      cash: 'Cash',
      bank_transfer: 'Bank Transfer',
      check: 'Check',
    };
    return methods[method] || method;
  };

  const formatDateTime = (date?: string | null) => {
    if (!date) return null;
    try {
      return new Date(date).toLocaleString('en-US', {
        year: 'numeric', month: 'short', day: 'numeric',
        hour: '2-digit', minute: '2-digit',
      });
    } catch {
      return date;
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <button
          onClick={() => router.back()}
          className="flex items-center gap-2 text-blue-600 hover:text-blue-800 font-medium"
        >
          <ChevronLeft className="w-4 h-4" />
          Back
        </button>
        <Card>
          <CardBody className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="text-slate-600 mt-4">Loading deposit details...</p>
          </CardBody>
        </Card>
      </div>
    );
  }

  if (error || !deposit) {
    return (
      <div className="space-y-6">
        <button
          onClick={() => router.back()}
          className="flex items-center gap-2 text-blue-600 hover:text-blue-800 font-medium"
        >
          <ChevronLeft className="w-4 h-4" />
          Back
        </button>
        <Card>
          <CardBody className="bg-red-50 border border-red-200 p-4">
            <p className="text-red-700">{error || 'Deposit not found'}</p>
          </CardBody>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <button
          onClick={() => router.back()}
          className="flex items-center gap-2 text-blue-600 hover:text-blue-800 font-medium mb-4"
        >
          <ChevronLeft className="w-4 h-4" />
          Back to Deposits
        </button>
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">Deposit Details</h1>
            <p className="text-slate-600 mt-2">Deposit No: {deposit.depositNo}</p>
          </div>
          <Badge status={getStatusColor(deposit.status)}>{deposit.status.replace('_', ' ')}</Badge>
        </div>
      </div>

      {/* Success Message */}
      {successMessage && (
        <div className="bg-green-50 border border-green-200 rounded-xl p-4 flex items-start gap-3">
          <CheckCircle className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
          <p className="text-green-800 font-medium">{successMessage}</p>
        </div>
      )}

      {/* Main Details */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          {/* Applied / Unapplied Amounts - Prominent Display */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Card>
              <CardBody>
                <div className="text-center">
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Total Deposit</p>
                  <p className="text-2xl font-bold text-slate-900 mt-1">
                    {formatCurrency(deposit.amount)}
                  </p>
                </div>
              </CardBody>
            </Card>
            <Card>
              <CardBody>
                <div className="text-center">
                  <p className="text-xs font-semibold text-green-600 uppercase tracking-wide">Applied</p>
                  <p className="text-2xl font-bold text-green-700 mt-1">
                    {formatCurrency(deposit.appliedAmount)}
                  </p>
                </div>
              </CardBody>
            </Card>
            <Card>
              <CardBody>
                <div className="text-center">
                  <p className="text-xs font-semibold text-orange-600 uppercase tracking-wide">Unapplied</p>
                  <p className="text-2xl font-bold text-orange-700 mt-1">
                    {formatCurrency(deposit.unappliedAmount)}
                  </p>
                </div>
              </CardBody>
            </Card>
          </div>

          {/* Deposit Information */}
          <Card>
            <CardBody>
              <h2 className="text-lg font-semibold text-slate-900 mb-4">Deposit Information</h2>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-slate-600 mb-1">Deposit Number</p>
                    <p className="text-base font-semibold text-slate-900">{deposit.depositNo}</p>
                  </div>
                  <div>
                    <p className="text-sm text-slate-600 mb-1">Deposit Date</p>
                    <p className="text-base font-semibold text-slate-900">
                      {new Date(deposit.depositDate || deposit.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-slate-600 mb-1">Amount</p>
                    <p className="text-lg font-bold text-slate-900">
                      {formatCurrency(deposit.amount)}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-slate-600 mb-1">Status</p>
                    <Badge status={getStatusColor(deposit.status)}>{deposit.status.replace('_', ' ')}</Badge>
                  </div>
                </div>
              </div>
            </CardBody>
          </Card>

          {/* Customer Details */}
          <Card>
            <CardBody>
              <h2 className="text-lg font-semibold text-slate-900 mb-4">Customer Details</h2>
              <div className="space-y-4">
                <div>
                  <p className="text-sm text-slate-600 mb-1">Customer Name</p>
                  <p className="text-base font-semibold text-slate-900">
                    {deposit.customer?.companyName || deposit.customerName || '-'}
                  </p>
                </div>
                {deposit.customer?.code && (
                  <div>
                    <p className="text-sm text-slate-600 mb-1">Customer Code</p>
                    <p className="text-base font-semibold text-slate-900">
                      {deposit.customer.code}
                    </p>
                  </div>
                )}
              </div>
            </CardBody>
          </Card>

          {/* Deposit Method Details */}
          <Card>
            <CardBody>
              <h2 className="text-lg font-semibold text-slate-900 mb-4">Deposit Method</h2>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-slate-600 mb-1">Method</p>
                    <p className="text-base font-semibold text-slate-900">
                      {methodLabel(deposit.depositMethod)}
                    </p>
                  </div>
                  {deposit.bankName && (
                    <div>
                      <p className="text-sm text-slate-600 mb-1">Bank Name</p>
                      <p className="text-base font-semibold text-slate-900">
                        {deposit.bankName}
                      </p>
                    </div>
                  )}
                  {deposit.checkNo && (
                    <div>
                      <p className="text-sm text-slate-600 mb-1">Check Number</p>
                      <p className="text-base font-semibold text-slate-900">
                        {deposit.checkNo}
                      </p>
                    </div>
                  )}
                  {(deposit.referenceNo || deposit.refNo) && (
                    <div>
                      <p className="text-sm text-slate-600 mb-1">Reference No</p>
                      <p className="text-base font-semibold text-slate-900">
                        {deposit.referenceNo || deposit.refNo}
                      </p>
                    </div>
                  )}
                  {deposit.depositSlip && (
                    <div>
                      <p className="text-sm text-slate-600 mb-1">Deposit Slip</p>
                      <a
                        href={deposit.depositSlip}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:text-blue-800 underline text-sm font-medium"
                      >
                        View Deposit Slip
                      </a>
                    </div>
                  )}
                </div>
              </div>
            </CardBody>
          </Card>

          {/* Verification Trail */}
          {(deposit.verifiedBy || deposit.verifiedAt) && (
            <Card>
              <CardBody>
                <h2 className="text-lg font-semibold text-slate-900 mb-4">Verification Details</h2>
                <div className="space-y-3">
                  {deposit.verifiedBy && (
                    <div className="flex justify-between items-center py-2 border-b border-slate-100">
                      <div>
                        <p className="text-sm font-medium text-slate-900">Verified by</p>
                        <p className="text-sm text-slate-600">{deposit.verifiedBy}</p>
                      </div>
                      {deposit.verifiedAt && (
                        <p className="text-sm text-slate-500">{formatDateTime(deposit.verifiedAt)}</p>
                      )}
                    </div>
                  )}
                </div>
              </CardBody>
            </Card>
          )}

          {/* Deposit Applications */}
          {deposit.applications && deposit.applications.length > 0 && (
            <Card>
              <CardBody>
                <h2 className="text-lg font-semibold text-slate-900 mb-4">Invoice Applications</h2>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-slate-200">
                        <th className="text-left py-2 px-3 text-xs font-semibold text-slate-500 uppercase">Invoice ID</th>
                        <th className="text-right py-2 px-3 text-xs font-semibold text-slate-500 uppercase">Amount Applied</th>
                        <th className="text-left py-2 px-3 text-xs font-semibold text-slate-500 uppercase">Applied By</th>
                        <th className="text-left py-2 px-3 text-xs font-semibold text-slate-500 uppercase">Date</th>
                      </tr>
                    </thead>
                    <tbody>
                      {deposit.applications.map((app) => (
                        <tr key={app.id} className="border-b border-slate-100">
                          <td className="py-2 px-3 text-slate-900 font-medium">
                            {app.invoiceId ? app.invoiceId.slice(0, 12) + '...' : app.orderId || '-'}
                          </td>
                          <td className="py-2 px-3 text-right text-green-700 font-semibold">
                            {formatCurrency(app.amount)}
                          </td>
                          <td className="py-2 px-3 text-slate-600">{app.appliedBy || '-'}</td>
                          <td className="py-2 px-3 text-slate-600">
                            {app.createdAt ? new Date(app.createdAt).toLocaleDateString() : '-'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardBody>
            </Card>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          {/* Action Buttons */}
          <Card>
            <CardBody>
              <h3 className="text-lg font-semibold text-slate-900 mb-4">Actions</h3>
              <div className="space-y-3">
                {/* Verify / Reject buttons for Pending deposits */}
                {deposit.status === 'Pending' && canVerify && (
                  <>
                    <Button
                      variant="primary"
                      size="lg"
                      onClick={() => handleStatusChange('Verified')}
                      isLoading={actionLoading}
                      className="w-full bg-green-600 hover:bg-green-700 text-white"
                    >
                      <CheckCircle className="w-5 h-5 mr-2" />
                      Verify Deposit
                    </Button>
                    <Button
                      variant="secondary"
                      size="lg"
                      onClick={() => handleStatusChange('Rejected')}
                      isLoading={actionLoading}
                      className="w-full bg-red-50 hover:bg-red-100 text-red-700 border border-red-200"
                    >
                      <XCircle className="w-5 h-5 mr-2" />
                      Reject Deposit
                    </Button>
                  </>
                )}

                {/* Show message if user lacks permission */}
                {deposit.status === 'Pending' && !canVerify && (
                  <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
                    <p className="text-sm text-amber-800">
                      Awaiting verification — only Admin, Manager, or Finance can verify this deposit.
                    </p>
                  </div>
                )}

                {/* Show current status info for non-Pending */}
                {deposit.status === 'Rejected' && (
                  <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3">
                    <p className="text-sm font-semibold text-red-800">Deposit Rejected</p>
                    <p className="text-sm text-red-700 mt-1">This deposit has been rejected and cannot be applied.</p>
                  </div>
                )}

                {(deposit.status === 'Applied' || deposit.status === 'Partially_Applied') && (
                  <div className="bg-green-50 border border-green-200 rounded-xl px-4 py-3">
                    <p className="text-sm font-semibold text-green-800">
                      {deposit.status === 'Applied' ? 'Fully Applied' : 'Partially Applied'}
                    </p>
                    <p className="text-sm text-green-700 mt-1">
                      {formatCurrency(deposit.appliedAmount)} of {formatCurrency(deposit.amount)} applied to invoices.
                    </p>
                  </div>
                )}

                {/* Print button - always visible */}
                <button
                  onClick={() => window.print()}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-slate-200 hover:bg-slate-300 text-slate-900 font-medium rounded-lg transition-colors"
                >
                  <Download className="w-5 h-5" />
                  Print
                </button>
              </div>
            </CardBody>
          </Card>

          {/* Summary Card */}
          <Card>
            <CardBody>
              <h3 className="text-lg font-semibold text-slate-900 mb-4">Summary</h3>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-slate-600">Total Deposit:</span>
                  <span className="font-semibold text-slate-900">
                    {formatCurrency(deposit.amount)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600">Applied:</span>
                  <span className="font-semibold text-green-600">
                    {formatCurrency(deposit.appliedAmount)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600">Unapplied:</span>
                  <span className="font-semibold text-orange-600">
                    {formatCurrency(deposit.unappliedAmount)}
                  </span>
                </div>
                <div className="flex justify-between pt-3 border-t border-slate-200">
                  <span className="font-semibold text-slate-900">Status:</span>
                  <Badge status={getStatusColor(deposit.status)}>{deposit.status.replace('_', ' ')}</Badge>
                </div>
              </div>
            </CardBody>
          </Card>
        </div>
      </div>
    </div>
  );
}
