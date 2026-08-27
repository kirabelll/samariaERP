'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Card, CardBody, Button, Badge } from '@/components/ui';
import { ChevronLeft, Download, CheckCircle, XCircle } from 'lucide-react';

interface SupplierPayment {
  id: string;
  paymentNo: string;
  supplierId: string;
  supplier: {
    companyName: string;
    withholding?: boolean;
    withholdRate?: number;
  };
  purchaseOrderId?: string | null;
  purchaseOrder?: {
    orderNo?: string;
    poNo?: string;
  } | null;
  amount: number;
  paymentMethod: string;
  bankName?: string | null;
  refNo?: string | null;
  description?: string | null;
  status: string;
  paymentDate: string;
  createdAt: string;
}

interface TaxBreakdown {
  subtotal: number;
  vatRate?: number;
  vatAmount?: number;
  grossTotal: number;
  withholdRate?: number;
  withholdAmount?: number;
  netPayable: number;
  hasVat: boolean;
  hasWithholding: boolean;
}

function extractTaxBreakdown(description?: string | null, totalAmount: number = 0, supplier?: { withholding?: boolean; withholdRate?: number }): TaxBreakdown {
  if (!description) {
    return {
      subtotal: totalAmount,
      grossTotal: totalAmount,
      netPayable: totalAmount,
      hasVat: false,
      hasWithholding: !!supplier?.withholding,
      withholdRate: supplier?.withholdRate || 3,
    };
  }

  const parseNum = (str?: string) => (str ? parseFloat(str.replace(/,/g, '')) : 0);

  const subtotalMatch = description.match(/Subtotal(?:\s*\(excl\.\s*VAT\))?:\s*ETB\s*([\d,]+(?:\.\d+)?)/i);
  const vatMatch = description.match(/VAT\s*(?:\((\d+)%\))?:\s*\+?\s*ETB\s*([\d,]+(?:\.\d+)?)/i);
  const grossMatch = description.match(/Gross(?: Total)?:\s*ETB\s*([\d,]+(?:\.\d+)?)/i);
  const whtMatch = description.match(/Withholding\s*(?:\((\d+)%\))?:\s*-?\s*ETB\s*([\d,]+(?:\.\d+)?)/i);
  const netMatch = description.match(/Net Payable:\s*ETB\s*([\d,]+(?:\.\d+)?)/i);

  const parsedSubtotal = subtotalMatch ? parseNum(subtotalMatch[1]) : 0;
  const vatRate = vatMatch && vatMatch[1] ? parseFloat(vatMatch[1]) : 15;
  const vatAmount = vatMatch ? parseNum(vatMatch[2]) : 0;
  const parsedGross = grossMatch ? parseNum(grossMatch[1]) : 0;
  const withholdRate = whtMatch && whtMatch[1] ? parseFloat(whtMatch[1]) : (supplier?.withholdRate || 3);
  const withholdAmount = whtMatch ? parseNum(whtMatch[2]) : 0;
  const parsedNet = netMatch ? parseNum(netMatch[1]) : 0;

  const hasVat = vatAmount > 0 || vatMatch !== null;
  const hasWithholding = withholdAmount > 0 || whtMatch !== null || !!supplier?.withholding;

  const subtotal = parsedSubtotal > 0 ? parsedSubtotal : totalAmount;
  const grossTotal = parsedGross > 0 ? parsedGross : subtotal + vatAmount;
  const netPayable = parsedNet > 0 ? parsedNet : totalAmount;

  return {
    subtotal,
    vatRate: hasVat ? vatRate : undefined,
    vatAmount: hasVat ? vatAmount : undefined,
    grossTotal,
    withholdRate: hasWithholding ? withholdRate : undefined,
    withholdAmount: hasWithholding ? withholdAmount : undefined,
    netPayable,
    hasVat,
    hasWithholding,
  };
}

interface PageProps {
  params: { id: string };
}

export default function PaymentDetailPage({ params }: PageProps) {
  const router = useRouter();
  const [payment, setPayment] = useState<SupplierPayment | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    fetchPayment();
  }, [params.id]);

  const fetchPayment = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/purchasing/payments/${params.id}`);
      const data = await response.json();

      if (data.success) {
        setPayment(data.data);
      } else {
        setError('Payment not found');
      }
    } catch (err) {
      console.error('Error fetching payment:', err);
      setError('Failed to load payment details');
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async () => {
    if (!payment || actionLoading) return;

    setActionLoading(true);
    try {
      const response = await fetch(`/api/purchasing/payments/${params.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'Approved' }),
      });

      if (response.ok) {
        alert('Payment approved successfully');
        await fetchPayment();
      } else {
        alert('Failed to approve payment');
      }
    } catch (err) {
      console.error('Error approving payment:', err);
      alert('Error approving payment');
    } finally {
      setActionLoading(false);
    }
  };

  const handleReject = async () => {
    if (!payment || actionLoading) return;

    const reason = prompt('Please enter rejection reason:');
    if (!reason) return;

    setActionLoading(true);
    try {
      const response = await fetch(`/api/purchasing/payments/${params.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'Rejected', rejectionReason: reason }),
      });

      if (response.ok) {
        alert('Payment rejected');
        await fetchPayment();
      } else {
        alert('Failed to reject payment');
      }
    } catch (err) {
      console.error('Error rejecting payment:', err);
      alert('Error rejecting payment');
    } finally {
      setActionLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Pending':
        return 'Pending';
      case 'Approved':
        return 'Approved';
      case 'Paid':
        return 'Active';
      case 'Rejected':
        return 'Rejected';
      default:
        return 'Draft';
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'ETB',
      minimumFractionDigits: 2,
    }).format(amount);
  };

  const methodLabel = (method: string) => {
    const methods: { [key: string]: string } = {
      cash: 'Cash',
      bank_transfer: 'Bank Transfer',
      check: 'Check',
    };
    return methods[method] || method;
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
            <p className="text-slate-600 mt-4">Loading payment details...</p>
          </CardBody>
        </Card>
      </div>
    );
  }

  if (error || !payment) {
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
            <p className="text-red-700">{error || 'Payment not found'}</p>
          </CardBody>
        </Card>
      </div>
    );
  }

  const taxBreakdown = payment ? extractTaxBreakdown(payment.description, payment.amount, payment.supplier) : null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <button
          onClick={() => router.back()}
          className="flex items-center gap-2 text-blue-600 hover:text-blue-800 font-medium mb-4"
        >
          <ChevronLeft className="w-4 h-4" />
          Back to Payments
        </button>
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">Payment Details</h1>
            <p className="text-slate-600 mt-2">Payment No: {payment.paymentNo}</p>
          </div>
          <Badge status={getStatusColor(payment.status)}>{payment.status}</Badge>
        </div>
      </div>

      {/* Main Details */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          {/* Payment Information */}
          <Card>
            <CardBody>
              <h2 className="text-lg font-semibold text-slate-900 mb-4">Payment Information</h2>
              <div className="space-y-4">
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                  <div>
                    <p className="text-sm text-slate-600 mb-1">Payment Number</p>
                    <p className="text-base font-semibold text-slate-900">{payment.paymentNo}</p>
                  </div>
                  <div>
                    <p className="text-sm text-slate-600 mb-1">Payment Date</p>
                    <p className="text-base font-semibold text-slate-900">
                      {new Date(payment.paymentDate).toLocaleDateString()}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-slate-600 mb-1">Net Paid Amount</p>
                    <p className="text-lg font-bold text-blue-600">
                      {formatCurrency(payment.amount)}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-slate-600 mb-1">Status</p>
                    <Badge status={getStatusColor(payment.status)}>{payment.status}</Badge>
                  </div>
                  {payment.refNo && (
                    <div>
                      <p className="text-sm text-slate-600 mb-1">Reference No</p>
                      <p className="text-base font-semibold text-slate-900">{payment.refNo}</p>
                    </div>
                  )}
                </div>
              </div>
            </CardBody>
          </Card>

          {/* VAT & Withholding Breakdown Card */}
          {taxBreakdown && (
            <Card>
              <CardBody>
                <h2 className="text-lg font-semibold text-slate-900 mb-4">VAT & Withholding Breakdown</h2>
                <div className="space-y-3 bg-slate-50 p-4 rounded-xl border border-slate-200">
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-600">Subtotal (excl. VAT):</span>
                    <span className="font-medium text-slate-900">
                      {formatCurrency(taxBreakdown.subtotal)}
                    </span>
                  </div>

                  {taxBreakdown.hasVat && taxBreakdown.vatAmount !== undefined ? (
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-600">VAT ({taxBreakdown.vatRate || 15}%):</span>
                      <span className="font-medium text-blue-600">
                        + {formatCurrency(taxBreakdown.vatAmount)}
                      </span>
                    </div>
                  ) : (
                    <div className="flex justify-between text-sm text-slate-400">
                      <span>VAT (0% - Not Applied):</span>
                      <span>+ ETB 0.00</span>
                    </div>
                  )}

                  <div className="flex justify-between text-sm border-t border-slate-200 pt-2">
                    <span className="text-slate-900 font-medium">Gross Total:</span>
                    <span className="font-semibold text-slate-900">
                      {formatCurrency(taxBreakdown.grossTotal)}
                    </span>
                  </div>

                  {taxBreakdown.hasWithholding && taxBreakdown.withholdAmount !== undefined ? (
                    <div className="flex justify-between text-sm">
                      <span className="text-red-600">Withholding Tax ({taxBreakdown.withholdRate || 3}% of subtotal):</span>
                      <span className="font-medium text-red-600">
                        - {formatCurrency(taxBreakdown.withholdAmount)}
                      </span>
                    </div>
                  ) : null}

                  <div className="border-t border-slate-900 pt-3 flex justify-between items-baseline">
                    <span className="text-base font-bold text-slate-900">Net Paid Amount:</span>
                    <span className="text-2xl font-bold text-[#007AFF]">
                      {formatCurrency(payment.amount)}
                    </span>
                  </div>

                  {taxBreakdown.hasVat && (taxBreakdown.vatAmount || 0) > 0 && (
                    <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mt-3">
                      <p className="text-xs text-amber-800 font-medium">VAT Note</p>
                      <p className="text-xs text-amber-700 mt-0.5">
                        This purchasing payment VAT of {formatCurrency(taxBreakdown.vatAmount || 0)} is recorded as Input VAT for the current tax filing period.
                      </p>
                    </div>
                  )}
                </div>
              </CardBody>
            </Card>
          )}

          {/* Supplier Details */}
          <Card>
            <CardBody>
              <h2 className="text-lg font-semibold text-slate-900 mb-4">Supplier Details</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-slate-600 mb-1">Supplier Name</p>
                  <p className="text-base font-semibold text-slate-900">
                    {payment.supplier.companyName}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-slate-600 mb-1">Withholding Registered</p>
                  <p className="text-base font-semibold text-slate-900">
                    {payment.supplier.withholding ? `Yes (${payment.supplier.withholdRate || 3}%)` : 'No'}
                  </p>
                </div>
              </div>
            </CardBody>
          </Card>

          {/* Payment Method Details */}
          <Card>
            <CardBody>
              <h2 className="text-lg font-semibold text-slate-900 mb-4">Payment Method</h2>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-slate-600 mb-1">Method</p>
                    <p className="text-base font-semibold text-slate-900">
                      {methodLabel(payment.paymentMethod)}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-slate-600 mb-1">Bank Name</p>
                    <p className="text-base font-semibold text-slate-900">
                      {payment.bankName || '-'}
                    </p>
                  </div>
                </div>
              </div>
            </CardBody>
          </Card>

          {/* Purchase Order Reference */}
          {payment.purchaseOrder && (
            <Card>
              <CardBody>
                <h2 className="text-lg font-semibold text-slate-900 mb-4">Purchase Order Reference</h2>
                <div className="space-y-4">
                  <div>
                    <p className="text-sm text-slate-600 mb-1">PO Number</p>
                    <p className="text-base font-semibold text-slate-900">
                      {payment.purchaseOrder.poNo || payment.purchaseOrder.orderNo}
                    </p>
                  </div>
                </div>
              </CardBody>
            </Card>
          )}

          {/* Description & Notes */}
          {payment.description && (
            <Card>
              <CardBody>
                <h2 className="text-lg font-semibold text-slate-900 mb-2">Notes & Remarks</h2>
                <p className="text-sm text-slate-700 whitespace-pre-wrap">{payment.description}</p>
              </CardBody>
            </Card>
          )}
        </div>

        {/* Sidebar Actions & Summary */}
        <div className="space-y-6">
          <Card>
            <CardBody>
              <h3 className="text-lg font-semibold text-slate-900 mb-4">Actions</h3>
              <div className="space-y-2">
                {payment.status === 'Pending' && (
                  <>
                    <button
                      onClick={handleApprove}
                      disabled={actionLoading}
                      className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white font-medium rounded-lg transition-colors"
                    >
                      <CheckCircle className="w-5 h-5" />
                      Approve
                    </button>
                    <button
                      onClick={handleReject}
                      disabled={actionLoading}
                      className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-red-600 hover:bg-red-700 disabled:bg-gray-400 text-white font-medium rounded-lg transition-colors"
                    >
                      <XCircle className="w-5 h-5" />
                      Reject
                    </button>
                  </>
                )}
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
          {taxBreakdown && (
            <Card>
              <CardBody>
                <h3 className="text-lg font-semibold text-slate-900 mb-4">Payment Summary</h3>
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between">
                    <span className="text-slate-600">Subtotal (excl. VAT):</span>
                    <span className="font-semibold text-slate-900">
                      {formatCurrency(taxBreakdown.subtotal)}
                    </span>
                  </div>
                  {taxBreakdown.hasVat && taxBreakdown.vatAmount ? (
                    <div className="flex justify-between text-blue-600">
                      <span>VAT ({taxBreakdown.vatRate || 15}%):</span>
                      <span className="font-medium">
                        + {formatCurrency(taxBreakdown.vatAmount)}
                      </span>
                    </div>
                  ) : null}
                  {taxBreakdown.hasWithholding && taxBreakdown.withholdAmount ? (
                    <div className="flex justify-between text-red-600">
                      <span>Withholding ({taxBreakdown.withholdRate || 3}%):</span>
                      <span className="font-medium">
                        - {formatCurrency(taxBreakdown.withholdAmount)}
                      </span>
                    </div>
                  ) : null}
                  <div className="flex justify-between pt-3 border-t border-slate-200">
                    <span className="font-semibold text-slate-900">Net Paid:</span>
                    <span className="font-bold text-lg text-blue-600">
                      {formatCurrency(payment.amount)}
                    </span>
                  </div>
                </div>
              </CardBody>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
