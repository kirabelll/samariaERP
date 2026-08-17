'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter, useParams } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { Card, CardBody, CardHeader, Button, Badge } from '@/components/ui';
import { ChevronLeft, Loader, CheckCircle, XCircle, Clock, ShieldCheck, FileCheck, Trash2, CreditCard } from 'lucide-react';

interface CementPurchase {
  id: string;
  purchaseNo: string;
  factoryId: string;
  factory?: {
    id: string;
    name: string;
  };
  cementType: string;
  quantityTons: number;
  unitPrice: number;
  totalAmount: number;
  paidAmount: number;
  paymentStatus: string;
  balanceRemaining: number;
  status: string;
  paymentRef?: string;
  paymentDate?: string;
  createdAt: string;
  liftings?: any[];
}


interface PaymentTransaction {
  id: string;
  amount: number;
  refNo: string;
  description: string;
  transDate: string;
  bankAccount: { bankName: string; accountNo: string; accountName: string };
}

export default function CementPurchaseDetailPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;
  const { data: session } = useSession();
  const userRole = (session?.user as any)?.role || '';
  const canApprove = userRole === 'ADMIN' || userRole === 'MANAGER' || userRole === 'FINANCE';

  const [purchase, setPurchase] = useState<CementPurchase | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const handleDelete = async () => {
    setDeleting(true);
    try {
      const res = await fetch(`/api/cement/purchases/${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        router.push('/dashboard/cement/purchases');
      } else {
        alert(data.error || 'Failed to delete purchase');
      }
    } catch {
      alert('Failed to delete purchase');
    } finally {
      setDeleting(false);
    }
  };


  // Payment state
  const [payments, setPayments] = useState<PaymentTransaction[]>([]);
  const [paymentSummary, setPaymentSummary] = useState<{ totalAmount: number; totalPaid: number; remainingPayable: number; paymentStatus: string } | null>(null);

  const fetchPayments = async () => {
    try {
      const res = await fetch(`/api/cement/purchases/${id}/payments`);
      const json = await res.json();
      if (json.success) {
        setPayments(json.data.transactions || []);
        setPaymentSummary(json.data.summary || null);
      }
    } catch (err) {
      console.error('Failed to fetch payments:', err);
    }
  };

  const fetchPurchase = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`/api/cement/purchases/${id}`);
      const data = await response.json();

      if (data.success && data.data) {
        setPurchase(data.data);
      } else {
        setError(data.error || 'Failed to load cement purchase');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (id) {
      fetchPurchase();
      fetchPayments();
    }
  }, [id]);

  const handleAction = async (action: string) => {
    if (!confirm(`Are you sure you want to ${action} this purchase?`)) return;

    setActionLoading(action);
    try {
      const res = await fetch(`/api/cement/purchases/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, notes: rejectReason || undefined }),
      });
      const data = await res.json();
      if (data.success) {
        setPurchase(data.data);
        setShowRejectModal(false);
        setRejectReason('');
      } else {
        alert(data.error || `Failed to ${action} purchase`);
      }
    } catch {
      alert(`Failed to ${action} purchase`);
    }
    setActionLoading(null);
  };

  const statusColor = (status: string) => {
    switch (status) {
      case 'Active': return 'bg-[#34C759]/10 text-[#248A3D]';
      case 'Approved': return 'bg-[#007AFF]/10 text-[#0055D4]';
      case 'Checked': return 'bg-[#007AFF]/10 text-[#0055D4]';
      case 'Exhausted': return 'bg-[#86868B]/10 text-[#86868B]';
      case 'Cancelled': return 'bg-[#FF3B30]/10 text-[#D70015]';
      case 'Rejected': return 'bg-[#FF3B30]/10 text-[#D70015]';
      case 'Pending': return 'bg-[#FF9500]/10 text-[#D97706]';
      default: return 'bg-[#007AFF]/10 text-[#0055D4]';
    }
  };

  // Workflow steps: Pending → Checked → Approved → Active (after payment)
  const workflowSteps = [
    { key: 'Pending', label: 'Procurement Creates', icon: Clock, description: 'Purchase submitted' },
    { key: 'Checked', label: 'Finance Checks', icon: FileCheck, description: 'Verified by finance' },
    { key: 'Approved', label: 'Manager Approves', icon: ShieldCheck, description: 'Approved — awaiting payment' },
    { key: 'Active', label: 'Payment Made', icon: CheckCircle, description: 'Paid & active' },
  ];

  const getStepStatus = (stepKey: string) => {
    if (!purchase) return 'upcoming';
    const statusOrder = ['Pending', 'Checked', 'Approved', 'Active'];
    const currentIdx = statusOrder.indexOf(purchase.status);
    const stepIdx = statusOrder.indexOf(stepKey);

    if (purchase.status === 'Rejected' || purchase.status === 'Cancelled') {
      return stepIdx <= currentIdx ? 'rejected' : 'upcoming';
    }
    // Exhausted is past Active
    if (purchase.status === 'Exhausted') {
      return 'done';
    }
    if (stepIdx < currentIdx) return 'done';
    if (stepIdx === currentIdx) return 'current';
    return 'upcoming';
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-2">
          <Link href="/dashboard/cement" className="text-[#007AFF] hover:text-[#0055D4]">
            <ChevronLeft className="w-5 h-5" />
          </Link>
          <Link href="/dashboard/cement" className="text-[#007AFF] hover:text-[#0055D4]">
            Cement Operations
          </Link>
        </div>
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <Loader className="w-8 h-8 animate-spin mx-auto text-[#007AFF] mb-4" />
            <p className="text-[#86868B]">Loading cement purchase details...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error || !purchase) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-2">
          <Link href="/dashboard/cement" className="text-[#007AFF] hover:text-[#0055D4]">
            <ChevronLeft className="w-5 h-5" />
          </Link>
          <Link href="/dashboard/cement" className="text-[#007AFF] hover:text-[#0055D4]">
            Cement Operations
          </Link>
        </div>
        <Card className="rounded-2xl">
          <CardBody className="text-center py-12">
            <p className="text-red-600 text-lg font-medium mb-4">{error || 'Cement purchase not found'}</p>
            <Link href="/dashboard/cement">
              <Button variant="primary">Back to Cement Operations</Button>
            </Link>
          </CardBody>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-[#86868B]">
        <Link href="/dashboard" className="text-[#007AFF] hover:text-[#0055D4]">Dashboard</Link>
        <span>/</span>
        <Link href="/dashboard/cement" className="text-[#007AFF] hover:text-[#0055D4]">Cement</Link>
        <span>/</span>
        <span className="text-[#1D1D1F] font-medium">{purchase.purchaseNo}</span>
      </div>

      {/* Header */}
      <div className="flex flex-wrap justify-between items-start gap-4">
        <div>
          <h1 className="text-3xl font-bold text-[#1D1D1F]">{purchase.purchaseNo}</h1>
          <p className="text-[#86868B] mt-2">Cement purchase details and approval workflow</p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => setShowDeleteModal(true)}
            className="text-red-600 border-red-300 hover:bg-red-50"
          >
            <Trash2 className="w-4 h-4 mr-2" />
            Delete
          </Button>
          <Link href="/dashboard/cement">
            <Button variant="outline">Back to List</Button>
          </Link>
        </div>
      </div>

      {/* Approval Workflow */}
      <Card className="rounded-2xl">
        <CardHeader>
          <h2 className="text-lg font-semibold text-[#1D1D1F]">Approval Workflow</h2>
        </CardHeader>
        <CardBody>
          <div className="flex items-center justify-between max-w-2xl mx-auto">
            {workflowSteps.map((step, idx) => {
              const stepStatus = getStepStatus(step.key);
              const Icon = step.icon;
              return (
                <React.Fragment key={step.key}>
                  <div className="flex flex-col items-center text-center">
                    <div className={`w-12 h-12 rounded-full flex items-center justify-center mb-2 ${
                      stepStatus === 'done' ? 'bg-green-100 text-green-600' :
                      stepStatus === 'current' ? 'bg-blue-100 text-blue-600 ring-2 ring-blue-400' :
                      stepStatus === 'rejected' ? 'bg-red-100 text-red-500' :
                      'bg-slate-100 text-slate-400'
                    }`}>
                      {stepStatus === 'done' ? (
                        <CheckCircle className="w-6 h-6" />
                      ) : stepStatus === 'rejected' ? (
                        <XCircle className="w-6 h-6" />
                      ) : (
                        <Icon className="w-6 h-6" />
                      )}
                    </div>
                    <p className={`text-xs font-semibold ${
                      stepStatus === 'done' ? 'text-green-700' :
                      stepStatus === 'current' ? 'text-blue-700' :
                      stepStatus === 'rejected' ? 'text-red-600' :
                      'text-slate-400'
                    }`}>{step.label}</p>
                    <p className="text-[10px] text-slate-500 mt-0.5">{step.description}</p>
                  </div>
                  {idx < workflowSteps.length - 1 && (
                    <div className={`flex-1 h-0.5 mx-2 mt-[-24px] ${
                      getStepStatus(workflowSteps[idx + 1].key) === 'done' || getStepStatus(workflowSteps[idx + 1].key) === 'current'
                        ? 'bg-blue-400' : 'bg-slate-200'
                    }`} />
                  )}
                </React.Fragment>
              );
            })}
          </div>

          {/* Action Buttons */}
          <div className="mt-6 pt-4 border-t border-slate-200">
            {purchase.status === 'Pending' && canApprove && (
              <div className="flex flex-wrap gap-3 justify-center">
                <Button
                  variant="primary"
                  onClick={() => handleAction('check')}
                  isLoading={actionLoading === 'check'}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  <FileCheck className="w-4 h-4 mr-2" />
                  Finance Check
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setShowRejectModal(true)}
                  className="text-red-600 border-red-300 hover:bg-red-50"
                >
                  <XCircle className="w-4 h-4 mr-2" />
                  Reject
                </Button>
              </div>
            )}
            {purchase.status === 'Pending' && !canApprove && (
              <div className="text-center">
                <p className="text-amber-600 font-medium text-sm">
                  Awaiting Finance Check — only Manager or Owner can process this purchase.
                </p>
              </div>
            )}

            {purchase.status === 'Checked' && canApprove && (
              <div className="flex flex-wrap gap-3 justify-center">
                <Button
                  variant="primary"
                  onClick={() => handleAction('approve')}
                  isLoading={actionLoading === 'approve'}
                  className="bg-green-600 hover:bg-green-700"
                >
                  <ShieldCheck className="w-4 h-4 mr-2" />
                  Manager Approve
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setShowRejectModal(true)}
                  className="text-red-600 border-red-300 hover:bg-red-50"
                >
                  <XCircle className="w-4 h-4 mr-2" />
                  Reject
                </Button>
              </div>
            )}
            {purchase.status === 'Checked' && !canApprove && (
              <div className="text-center">
                <p className="text-blue-600 font-medium text-sm">
                  Finance checked — awaiting Manager or Owner approval.
                </p>
              </div>
            )}

            {purchase.status === 'Approved' && (
              <div className="text-center space-y-2">
                <p className="text-blue-600 font-semibold flex items-center justify-center gap-2">
                  <ShieldCheck className="w-5 h-5" />
                  Purchase is approved — awaiting payment to activate
                </p>
                <p className="text-amber-600 text-sm">
                  Purchase must be paid before coupons can be filled and liftings can happen.
                </p>
              </div>
            )}

            {purchase.status === 'Active' && (
              <div className="text-center">
                <p className="text-green-600 font-semibold flex items-center justify-center gap-2">
                  <CheckCircle className="w-5 h-5" />
                  {(paymentSummary?.paymentStatus || purchase.paymentStatus) === 'Partial'
                    ? 'Purchase is Active (Partially Paid) — ready for coupons and liftings'
                    : 'Purchase is approved and paid — ready for coupons and liftings'}
                </p>
              </div>
            )}

            {purchase.status === 'Rejected' && (
              <div className="text-center">
                <p className="text-red-600 font-semibold flex items-center justify-center gap-2">
                  <XCircle className="w-5 h-5" />
                  This purchase was rejected
                </p>
              </div>
            )}

            {purchase.status === 'Exhausted' && (
              <div className="text-center">
                <p className="text-slate-500 font-semibold">
                  Purchase balance exhausted — all quantity has been lifted
                </p>
              </div>
            )}
          </div>
        </CardBody>
      </Card>

      {/* Reject Modal */}
      {showRejectModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md mx-4 space-y-4">
            <h3 className="text-lg font-semibold text-[#1D1D1F]">Reject Purchase</h3>
            <p className="text-sm text-slate-600">Please provide a reason for rejecting this purchase.</p>
            <textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              className="w-full border border-slate-300 rounded-xl p-3 text-sm focus:border-red-500 focus:ring-2 focus:ring-red-500/20"
              rows={3}
              placeholder="Reason for rejection..."
            />
            <div className="flex gap-3 justify-end">
              <Button variant="outline" onClick={() => { setShowRejectModal(false); setRejectReason(''); }}>
                Cancel
              </Button>
              <Button
                variant="primary"
                onClick={() => handleAction('reject')}
                isLoading={actionLoading === 'reject'}
                className="bg-red-600 hover:bg-red-700"
              >
                Confirm Reject
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Main Details */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="rounded-2xl lg:col-span-2">
          <CardHeader>
            <h2 className="text-lg font-semibold text-[#1D1D1F]">Purchase Information</h2>
          </CardHeader>
          <CardBody className="space-y-6">
            <div className="grid grid-cols-2 gap-6">
              <div>
                <p className="text-xs font-medium text-[#86868B] uppercase tracking-wider mb-2">Factory</p>
                <p className="text-lg font-semibold text-[#1D1D1F]">{purchase.factory?.name || '-'}</p>
              </div>
              <div>
                <p className="text-xs font-medium text-[#86868B] uppercase tracking-wider mb-2">Cement Type</p>
                <p className="text-lg font-semibold text-[#1D1D1F]">{purchase.cementType}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-6">
              <div>
                <p className="text-xs font-medium text-[#86868B] uppercase tracking-wider mb-2">Quantity (QT)</p>
                <p className="text-lg font-semibold text-[#1D1D1F]">{((purchase.quantityTons ?? 0) || 0).toLocaleString('en-US')}</p>
              </div>
              <div>
                <p className="text-xs font-medium text-[#86868B] uppercase tracking-wider mb-2">Unit Price (ETB)</p>
                <p className="text-lg font-semibold text-[#1D1D1F]">ETB {((purchase.unitPrice ?? 0) || 0).toLocaleString('en-US')}</p>
              </div>
            </div>

            <div className="border-t pt-6">
              <p className="text-xs font-medium text-[#86868B] uppercase tracking-wider mb-2">Total Amount (ETB)</p>
              <p className="text-3xl font-bold text-[#007AFF]">ETB {((purchase.totalAmount ?? 0) || 0).toLocaleString('en-US')}</p>
            </div>

            {purchase.paymentDate && (
              <div className="border-t pt-6">
                <p className="text-xs font-medium text-[#86868B] uppercase tracking-wider mb-2">Purchase Date</p>
                <p className="text-lg font-semibold text-[#1D1D1F]">
                  {new Date(purchase.paymentDate).toLocaleDateString()}
                </p>
              </div>
            )}
          </CardBody>
        </Card>

        {/* Status & Balance */}
        <div className="space-y-4">
          <Card className="rounded-2xl">
            <CardHeader>
              <h3 className="text-lg font-semibold text-[#1D1D1F]">Status</h3>
            </CardHeader>
            <CardBody>
              <div className="flex items-center gap-2 flex-wrap">
                <Badge status={purchase.status as any} className={`inline-block text-base px-3 py-1 ${statusColor(purchase.status)}`}>
                  {purchase.status}
                </Badge>
                {(paymentSummary?.paymentStatus || purchase.paymentStatus) === 'Partial' && (
                  <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-amber-100 text-amber-800 border border-amber-300">
                    Partial Paid
                  </span>
                )}
              </div>
            </CardBody>
          </Card>

          <Card className="rounded-2xl">
            <CardHeader>
              <h3 className="text-lg font-semibold text-[#1D1D1F]">Balance Remaining</h3>
            </CardHeader>
            <CardBody>
              <p className="text-4xl font-bold text-[#34C759]">
                {((purchase.balanceRemaining ?? 0) || 0).toLocaleString('en-US')}
              </p>
              <p className="text-sm text-[#86868B] mt-2">QT available for lifting</p>
            </CardBody>
          </Card>

          <Card className="rounded-2xl">
            <CardHeader>
              <h3 className="text-lg font-semibold text-[#1D1D1F]">Created</h3>
            </CardHeader>
            <CardBody>
              <p className="text-sm text-[#1D1D1F]">
                {new Date(purchase.createdAt).toLocaleDateString('en-US', {
                  weekday: 'short', year: 'numeric', month: 'short', day: 'numeric',
                })}
              </p>
              <p className="text-xs text-[#86868B] mt-1">
                {new Date(purchase.createdAt).toLocaleTimeString('en-US', {
                  hour: '2-digit', minute: '2-digit',
                })}
              </p>
            </CardBody>
          </Card>
        </div>
      </div>

      {/* Payment Settlement */}
      <Card className="rounded-2xl">
        <CardHeader>
          <h2 className="text-lg font-semibold text-[#1D1D1F]">Payment Settlement</h2>
        </CardHeader>
        <CardBody className="space-y-6">
          {/* Payment Summary */}
          {(() => {
            const paymentsTotal = payments.reduce((sum, p) => sum + Number(p.amount), 0);
            const totalPurchaseAmount = Number(purchase.totalAmount) || 0;
            const totalPurchasePaid = Math.max(paymentSummary?.totalPaid || 0, Number(purchase.paidAmount) || 0, paymentsTotal);
            const remainingPayableAmount = Math.max(0, totalPurchaseAmount - totalPurchasePaid);
            const computedPaymentStatus = totalPurchasePaid >= totalPurchaseAmount && totalPurchaseAmount > 0
              ? 'Paid'
              : totalPurchasePaid > 0
              ? 'Partial'
              : (paymentSummary?.paymentStatus || purchase.paymentStatus || 'Unpaid');

            return (
              <div className="space-y-4">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="bg-blue-50 rounded-xl p-4 text-center">
                    <p className="text-xs text-blue-600 font-medium uppercase">Total Amount</p>
                    <p className="text-xl font-bold text-blue-900 mt-1">ETB {totalPurchaseAmount.toLocaleString('en-US')}</p>
                  </div>
                  <div className="bg-green-50 rounded-xl p-4 text-center">
                    <p className="text-xs text-green-600 font-medium uppercase">Total Paid</p>
                    <p className="text-xl font-bold text-green-900 mt-1">ETB {totalPurchasePaid.toLocaleString('en-US')}</p>
                  </div>
                  <div className="bg-orange-50 rounded-xl p-4 text-center">
                    <p className="text-xs text-orange-600 font-medium uppercase">Remaining</p>
                    <p className="text-xl font-bold text-orange-900 mt-1">ETB {remainingPayableAmount.toLocaleString('en-US')}</p>
                  </div>
                  <div className={`rounded-xl p-4 text-center ${
                    computedPaymentStatus === 'Paid' ? 'bg-green-50' :
                    computedPaymentStatus === 'Partial' ? 'bg-amber-50' : 'bg-red-50'
                  }`}>
                    <p className="text-xs font-medium uppercase text-slate-600">Payment Status</p>
                    <p className={`text-xl font-bold mt-1 ${
                      computedPaymentStatus === 'Paid' ? 'text-green-700' :
                      computedPaymentStatus === 'Partial' ? 'text-amber-700' : 'text-red-700'
                    }`}>
                      {computedPaymentStatus}
                    </p>
                  </div>
                </div>

                {remainingPayableAmount > 0 && (
                  <div className="flex justify-end pt-2">
                    <Link href={`/dashboard/finance/vouchers/new?module=CEMENT&sourceId=${purchase.id}&amount=${remainingPayableAmount}`}>
                      <Button variant="primary" className="bg-green-600 hover:bg-green-700 flex items-center gap-2">
                        <CreditCard className="w-4 h-4" />
                        Pay Remaining Balance (ETB {remainingPayableAmount.toLocaleString('en-US')})
                      </Button>
                    </Link>
                  </div>
                )}
              </div>
            );
          })()}

          {/* Payment History */}
          {payments.length > 0 && (
            <div>
              <h3 className="text-base font-semibold text-[#1D1D1F] mb-3">Payment History</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-200">
                      <th className="px-4 py-2 text-left text-xs font-semibold text-slate-500 uppercase">Date</th>
                      <th className="px-4 py-2 text-left text-xs font-semibold text-slate-500 uppercase">Bank</th>
                      <th className="px-4 py-2 text-left text-xs font-semibold text-slate-500 uppercase">Ref No</th>
                      <th className="px-4 py-2 text-right text-xs font-semibold text-slate-500 uppercase">Amount (ETB)</th>
                      <th className="px-4 py-2 text-left text-xs font-semibold text-slate-500 uppercase">Description</th>
                    </tr>
                  </thead>
                  <tbody>
                    {payments.map((p) => (
                      <tr key={p.id} className="border-b border-slate-100">
                        <td className="px-4 py-2 text-slate-900">{new Date(p.transDate).toLocaleDateString()}</td>
                        <td className="px-4 py-2 text-slate-900">{p.bankAccount?.bankName} — {p.bankAccount?.accountNo}</td>
                        <td className="px-4 py-2 text-slate-700 font-medium">{p.refNo || '—'}</td>
                        <td className="px-4 py-2 text-right font-bold text-green-700">ETB {Number(p.amount).toLocaleString('en-US')}</td>
                        <td className="px-4 py-2 text-slate-500 text-xs">{p.description || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {payments.length === 0 && (
            <p className="text-center text-slate-400 py-4">No payments recorded yet for this purchase.</p>
          )}
        </CardBody>
      </Card>

      {/* Recent Liftings */}
      {purchase.liftings && purchase.liftings.length > 0 && (
        <Card className="rounded-2xl">
          <CardHeader>
            <h2 className="text-lg font-semibold text-[#1D1D1F]">Recent Liftings</h2>
          </CardHeader>
          <CardBody>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200">
                    <th className="px-4 py-2 text-left text-xs font-semibold text-slate-500 uppercase">Lifting No</th>
                    <th className="px-4 py-2 text-left text-xs font-semibold text-slate-500 uppercase">Truck</th>
                    <th className="px-4 py-2 text-left text-xs font-semibold text-slate-500 uppercase">Factory Weight</th>
                    <th className="px-4 py-2 text-left text-xs font-semibold text-slate-500 uppercase">Status</th>
                    <th className="px-4 py-2 text-left text-xs font-semibold text-slate-500 uppercase">Date</th>
                  </tr>
                </thead>
                <tbody>
                  {purchase.liftings.map((l: any) => (
                    <tr key={l.id} className="border-b border-slate-100">
                      <td className="px-4 py-2 text-slate-900 font-medium">{l.liftingNo}</td>
                      <td className="px-4 py-2 text-slate-900">{l.truck?.plateNo || '—'}</td>
                      <td className="px-4 py-2 text-slate-900">{Number(l.factoryWeight || 0).toLocaleString('en-US')} QT</td>
                      <td className="px-4 py-2">
                        <Badge status={l.status === 'Delivered' ? 'Active' : l.status === 'Cancelled' ? 'Rejected' : 'Draft'}>
                          {l.status}
                        </Badge>
                      </td>
                      <td className="px-4 py-2 text-slate-500 text-xs">
                        {new Date(l.createdAt).toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardBody>
        </Card>
      )}
      {/* Delete Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md mx-4 space-y-4">
            <h3 className="text-lg font-semibold text-[#1D1D1F]">Delete Purchase</h3>
            <p className="text-sm text-slate-600">
              Are you sure you want to delete purchase <strong className="text-slate-900">{purchase.purchaseNo}</strong>? This action cannot be undone.
            </p>
            <div className="flex gap-3 justify-end">
              <Button variant="outline" onClick={() => setShowDeleteModal(false)} disabled={deleting}>
                Cancel
              </Button>
              <Button
                variant="primary"
                onClick={handleDelete}
                isLoading={deleting}
                className="bg-red-600 hover:bg-red-700 text-white"
              >
                Delete
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
