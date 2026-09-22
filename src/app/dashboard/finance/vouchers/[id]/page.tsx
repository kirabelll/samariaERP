'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter, useParams } from 'next/navigation';
import { useSession } from 'next-auth/react';
import {
  Pencil,
  Printer,
  Trash2,
  X,
  Save,
  CheckCircle2,
  AlertCircle,
  Building2,
  Calendar,
  DollarSign,
  CreditCard,
  FileText,
  Layers,
  ExternalLink,
} from 'lucide-react';
import { Card, CardBody, CardHeader, Button, Badge } from '@/components/ui';
import {
  SourceReferenceBadgeList,
  SourceModuleBadge,
} from '@/components/finance/SourceReferenceLink';
import { getPayeeLink } from '@/lib/source-reference-helper';

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

interface BankAccountOption {
  id: string;
  bankName: string;
  accountNo: string;
  accountName: string;
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

function extractTaxBreakdown(description?: string | null, totalAmount: number = 0): TaxBreakdown {
  if (!description) {
    return {
      subtotal: totalAmount,
      grossTotal: totalAmount,
      netPayable: totalAmount,
      hasVat: false,
      hasWithholding: false,
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
  const withholdRate = whtMatch && whtMatch[1] ? parseFloat(whtMatch[1]) : 3;
  const withholdAmount = whtMatch ? parseNum(whtMatch[2]) : 0;
  const parsedNet = netMatch ? parseNum(netMatch[1]) : 0;

  const hasVat = vatAmount > 0 || vatMatch !== null;
  const hasWithholding = withholdAmount > 0 || whtMatch !== null;

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

  // Edit Modal State
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editLoading, setEditLoading] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);
  const [bankAccounts, setBankAccounts] = useState<BankAccountOption[]>([]);
  const [editForm, setEditForm] = useState({
    voucherType: 'PAYMENT',
    voucherDate: '',
    payeeName: '',
    payeeType: 'SUPPLIER',
    amount: '',
    paymentMethod: 'bank_transfer',
    bankAccountId: '',
    bankName: '',
    checkNo: '',
    refNo: '',
    sourceModule: 'MANUAL',
    sourceRef: '',
    description: '',
    status: 'Draft',
  });

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

  // Fetch Bank Accounts for Edit Form
  const fetchBankAccounts = async () => {
    try {
      const res = await fetch('/api/finance/bank?limit=100');
      const json = await res.json();
      if (json.success && Array.isArray(json.data)) {
        setBankAccounts(json.data);
      }
    } catch (err) {
      console.error('Failed to fetch bank accounts:', err);
    }
  };

  const handleOpenEdit = () => {
    if (!voucher) return;
    setEditError(null);
    setEditForm({
      voucherType: voucher.voucherType || 'PAYMENT',
      voucherDate: voucher.voucherDate ? voucher.voucherDate.slice(0, 10) : '',
      payeeName: voucher.payeeName || '',
      payeeType: voucher.payeeType || 'SUPPLIER',
      amount: String(voucher.amount || 0),
      paymentMethod: voucher.paymentMethod || 'bank_transfer',
      bankAccountId: voucher.bankAccountId || '',
      bankName: voucher.bankName || '',
      checkNo: voucher.checkNo || '',
      refNo: voucher.refNo || '',
      sourceModule: voucher.sourceModule || 'MANUAL',
      sourceRef: voucher.sourceRef || '',
      description: voucher.description || '',
      status: voucher.status || 'Draft',
    });
    fetchBankAccounts();
    setIsEditOpen(true);
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    setEditError(null);

    if (!editForm.payeeName.trim()) {
      setEditError('Payee Name is required');
      return;
    }
    const amt = parseFloat(editForm.amount);
    if (isNaN(amt) || amt <= 0) {
      setEditError('Amount must be a valid number greater than 0');
      return;
    }

    setEditLoading(true);
    try {
      // Find bank name if bankAccountId selected
      let selectedBankName = editForm.bankName;
      if (editForm.bankAccountId) {
        const matchingBank = bankAccounts.find((b) => b.id === editForm.bankAccountId);
        if (matchingBank) selectedBankName = matchingBank.bankName;
      }

      const res = await fetch(`/api/finance/vouchers/${voucherId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          voucherType: editForm.voucherType,
          voucherDate: editForm.voucherDate,
          payeeName: editForm.payeeName.trim(),
          payeeType: editForm.payeeType,
          amount: amt,
          paymentMethod: editForm.paymentMethod,
          bankAccountId: editForm.bankAccountId || null,
          bankName: selectedBankName || null,
          checkNo: editForm.checkNo.trim() || null,
          refNo: editForm.refNo.trim() || null,
          sourceModule: editForm.sourceModule,
          sourceRef: editForm.sourceRef.trim() || null,
          description: editForm.description.trim() || null,
          status: editForm.status,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to update voucher');
      }

      setVoucher(data.data);
      setIsEditOpen(false);
    } catch (err: any) {
      setEditError(err.message || 'Error updating voucher');
    } finally {
      setEditLoading(false);
    }
  };

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
          <div class="label">Net Payable / Settled Amount</div>
          <div class="value">ETB ${voucher.amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
        </div>

        ${(() => {
          const printTax = extractTaxBreakdown(voucher.description, voucher.amount);
          if (printTax.hasVat || printTax.hasWithholding) {
            return `
              <table style="margin: 15px 0;">
                <tr style="background:#f9f9f9;"><th colspan="2" style="text-align:left;">VAT & Withholding Breakdown</th></tr>
                <tr><td>Subtotal (excl. VAT)</td><td style="text-align:right;">ETB ${printTax.subtotal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td></tr>
                ${printTax.hasVat ? `<tr><td>VAT (${printTax.vatRate || 15}%)</td><td style="text-align:right;color:#0055D4;">+ ETB ${(printTax.vatAmount || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td></tr>` : ''}
                <tr><td>Gross Total</td><td style="text-align:right;font-weight:bold;">ETB ${printTax.grossTotal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td></tr>
                ${printTax.hasWithholding ? `<tr><td>Withholding Tax (${printTax.withholdRate || 3}%)</td><td style="text-align:right;color:#D70015;">- ETB ${(printTax.withholdAmount || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td></tr>` : ''}
                <tr style="background:#f0f4ff;font-weight:bold;"><td>Net Payable</td><td style="text-align:right;color:#0055D4;">ETB ${voucher.amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td></tr>
              </table>
            `;
          }
          return '';
        })()}

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
    <div className="space-y-6 max-w-4xl pb-12">
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
          <div className="flex flex-wrap items-center gap-2">
            {/* Edit Button */}
            {voucher.status !== 'Posted' && (
              <Button
                variant="secondary"
                size="md"
                onClick={handleOpenEdit}
                icon={<Pencil className="w-4 h-4 mr-1.5" />}
              >
                Edit
              </Button>
            )}

            <button
              onClick={handlePrint}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-sm font-medium transition-colors flex items-center gap-1.5"
            >
              <Printer className="w-4 h-4" />
              <span>Print</span>
            </button>

            {voucher.status !== 'Posted' && (
              <Button
                variant="danger"
                size="md"
                onClick={handleDelete}
                isLoading={actionLoading}
                icon={<Trash2 className="w-4 h-4 mr-1.5" />}
              >
                Delete
              </Button>
            )}
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
              <div className="mt-1">
                <SourceModuleBadge sourceModule={voucher.sourceModule} />
              </div>
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Source Reference</p>
              <div className="mt-1">
                <SourceReferenceBadgeList
                  sourceModule={voucher.sourceModule}
                  sourceId={voucher.sourceId}
                  sourceRef={voucher.sourceRef}
                  size="md"
                />
              </div>
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
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Payee Name</p>
              <div className="mt-1">
                {(() => {
                  const payeeUrl = getPayeeLink(voucher.payeeType, voucher.payeeId);
                  if (payeeUrl) {
                    return (
                      <Link
                        href={payeeUrl}
                        className="inline-flex items-center gap-1.5 text-base font-medium text-blue-600 hover:text-blue-800 hover:underline group"
                        title={`View ${voucher.payeeName} profile`}
                      >
                        <span>{voucher.payeeName}</span>
                        <ExternalLink className="w-3.5 h-3.5 opacity-60 group-hover:opacity-100" />
                      </Link>
                    );
                  }
                  return <p className="text-base font-medium text-slate-900">{voucher.payeeName}</p>;
                })()}
              </div>
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Payee Type</p>
              <p className="text-base font-medium text-slate-900 mt-1">{voucher.payeeType}</p>
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
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Payment Method</p>
              <p className="text-base font-medium text-slate-900 mt-1">{voucher.paymentMethod.replace('_', ' ')}</p>
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Amount</p>
              <p className="text-base font-medium text-slate-900 mt-1">{formatCurrency(voucher.amount)}</p>
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

      {/* Tax Breakdown */}
      {(() => {
        const tax = extractTaxBreakdown(voucher.description, voucher.amount);
        if (!tax.hasVat && !tax.hasWithholding) return null;

        return (
          <Card className="border-blue-200 bg-blue-50/20">
            <CardHeader>
              <h2 className="text-lg font-semibold text-blue-900 flex items-center gap-2">
                <span>Tax Breakdown</span>
                <span className="text-xs font-normal text-blue-700 bg-blue-100 px-2 py-0.5 rounded-full">
                  Auto-calculated
                </span>
              </h2>
            </CardHeader>
            <CardBody>
              <div className="divide-y divide-blue-100">
                <div className="flex justify-between items-center py-2 text-sm">
                  <span className="text-slate-600">Subtotal (excl. VAT)</span>
                  <span className="font-semibold text-slate-900 font-mono">{formatCurrency(tax.subtotal)}</span>
                </div>
                {tax.hasVat && (
                  <div className="flex justify-between items-center py-2 text-sm">
                    <span className="text-blue-700 flex items-center gap-1.5">
                      <span>+ VAT ({tax.vatRate || 15}%)</span>
                    </span>
                    <span className="font-semibold text-blue-700 font-mono">+{formatCurrency(tax.vatAmount)}</span>
                  </div>
                )}
                <div className="flex justify-between items-center py-2 text-sm font-semibold bg-blue-50/50 -mx-6 px-6">
                  <span className="text-slate-800">Gross Total</span>
                  <span className="text-slate-900 font-mono">{formatCurrency(tax.grossTotal)}</span>
                </div>
                {tax.hasWithholding && (
                  <div className="flex justify-between items-center py-2 text-sm">
                    <span className="text-red-600 flex items-center gap-1.5">
                      <span>- Withholding Tax ({tax.withholdRate || 3}%)</span>
                    </span>
                    <span className="font-semibold text-red-600 font-mono">-{formatCurrency(tax.withholdAmount)}</span>
                  </div>
                )}
                <div className="flex justify-between items-center pt-3 text-base font-bold bg-blue-100/50 -mx-6 px-6 pb-1">
                  <span className="text-blue-950">Net Payable / Settled</span>
                  <span className="text-blue-900 font-mono text-lg">{formatCurrency(tax.netPayable)}</span>
                </div>
              </div>
            </CardBody>
          </Card>
        );
      })()}

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
                    <p className="text-xs text-slate-500">{voucher.preparedBy}</p>
                  </div>
                  <span className="text-xs text-slate-400">{formatDateTime(voucher.createdAt)}</span>
                </div>
              )}
              {voucher.checkedBy && (
                <div className="flex justify-between items-center py-2 border-b border-slate-100">
                  <div>
                    <p className="text-sm font-medium text-slate-900">Checked by</p>
                    <p className="text-xs text-slate-500">{voucher.checkedBy}</p>
                  </div>
                  <span className="text-xs text-slate-400">{formatDateTime(voucher.checkedAt)}</span>
                </div>
              )}
              {voucher.approvedBy && (
                <div className="flex justify-between items-center py-2 border-b border-slate-100">
                  <div>
                    <p className="text-sm font-medium text-slate-900">Approved by</p>
                    <p className="text-xs text-slate-500">{voucher.approvedBy}</p>
                  </div>
                  <span className="text-xs text-slate-400">{formatDateTime(voucher.approvedAt)}</span>
                </div>
              )}
              {voucher.postedBy && (
                <div className="flex justify-between items-center py-2">
                  <div>
                    <p className="text-sm font-medium text-slate-900">Posted by</p>
                    <p className="text-xs text-slate-500">{voucher.postedBy}</p>
                  </div>
                  <span className="text-xs text-slate-400">{formatDateTime(voucher.postedAt)}</span>
                </div>
              )}
            </div>
          </CardBody>
        </Card>
      )}

      {/* Actions Bar */}
      {voucher.status !== 'Cancelled' && (
        <Card>
          <CardHeader>
            <h2 className="text-lg font-semibold text-[#1D1D1F]">Actions</h2>
          </CardHeader>
          <CardBody>
            <div className="flex flex-wrap gap-3">
              {voucher.status === 'Draft' && (
                <>
                  <Button
                    variant="primary"
                    onClick={() => handleStatusChange('Pending_Approval')}
                    isLoading={actionLoading}
                  >
                    Submit for Approval
                  </Button>
                  <Button
                    variant="secondary"
                    onClick={handleOpenEdit}
                    icon={<Pencil className="w-4 h-4 mr-1.5" />}
                  >
                    Edit Voucher
                  </Button>
                </>
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
                  <Button
                    variant="secondary"
                    onClick={handleOpenEdit}
                    icon={<Pencil className="w-4 h-4 mr-1.5" />}
                  >
                    Edit
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
                <>
                  <Button
                    variant="primary"
                    onClick={() => handleStatusChange('Posted')}
                    isLoading={actionLoading}
                  >
                    Post Voucher
                  </Button>
                  <Button
                    variant="secondary"
                    onClick={handleOpenEdit}
                    icon={<Pencil className="w-4 h-4 mr-1.5" />}
                  >
                    Edit
                  </Button>
                </>
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

      {/* Edit Voucher Modal Dialog */}
      {isEditOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-fadeIn">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto border border-gray-200 animate-scaleUp">
            <div className="flex items-center justify-between p-5 border-b border-gray-100 bg-gray-50/70">
              <div className="flex items-center gap-2">
                <Pencil className="w-5 h-5 text-blue-600" />
                <h3 className="text-lg font-bold text-gray-900">
                  Edit Voucher: <span className="font-mono text-blue-700">{voucher.voucherNo}</span>
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsEditOpen(false)}
                className="p-1.5 text-gray-400 hover:text-gray-600 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {editError && (
              <div className="m-5 p-3 rounded-xl bg-red-50 border border-red-200 text-red-800 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
                <span>{editError}</span>
              </div>
            )}

            <form onSubmit={handleSaveEdit} className="p-5 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Voucher Type */}
                <div className="space-y-1.5 sm:col-span-2">
                  <label className="block text-xs font-bold uppercase tracking-wider text-gray-700">
                    Voucher Type *
                  </label>
                  <select
                    value={editForm.voucherType}
                    onChange={(e) => setEditForm({ ...editForm, voucherType: e.target.value })}
                    className="w-full h-10 px-3 py-2 text-sm font-semibold border border-gray-300 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="PAYMENT">🔴 PAYMENT (Disbursement / Expense)</option>
                    <option value="RECEIPT">🟢 RECEIPT (Collection / Revenue)</option>
                    <option value="REFUND">🟠 REFUND (Return / Reversal)</option>
                  </select>
                </div>

                {/* Payee Name */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold uppercase tracking-wider text-gray-700">
                    Payee Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={editForm.payeeName}
                    onChange={(e) => setEditForm({ ...editForm, payeeName: e.target.value })}
                    className="w-full h-10 px-3 py-2 text-sm border border-gray-300 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium"
                  />
                </div>

                {/* Payee Type */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold uppercase tracking-wider text-gray-700">
                    Payee Type *
                  </label>
                  <select
                    value={editForm.payeeType}
                    onChange={(e) => setEditForm({ ...editForm, payeeType: e.target.value })}
                    className="w-full h-10 px-3 py-2 text-sm border border-gray-300 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="SUPPLIER">Supplier</option>
                    <option value="CUSTOMER">Customer</option>
                    <option value="TRANSPORTER">Transporter</option>
                    <option value="EMPLOYEE">Employee / Staff</option>
                    <option value="MEDICAL">Medical / Pharma Supplier</option>
                    <option value="OTHER">Other</option>
                  </select>
                </div>

                {/* Voucher Date */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold uppercase tracking-wider text-gray-700">
                    Voucher Date *
                  </label>
                  <input
                    type="date"
                    required
                    value={editForm.voucherDate}
                    onChange={(e) => setEditForm({ ...editForm, voucherDate: e.target.value })}
                    className="w-full h-10 px-3 py-2 text-sm border border-gray-300 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                {/* Amount */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold uppercase tracking-wider text-gray-700">
                    Net / Total Amount (ETB) *
                  </label>
                  <input
                    type="number"
                    step="any"
                    min="0.01"
                    required
                    value={editForm.amount}
                    onChange={(e) => setEditForm({ ...editForm, amount: e.target.value })}
                    className="w-full h-10 px-3 py-2 text-sm font-mono font-bold border border-gray-300 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 text-blue-900"
                  />
                </div>

                {/* Payment Method */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold uppercase tracking-wider text-gray-700">
                    Payment Method *
                  </label>
                  <select
                    value={editForm.paymentMethod}
                    onChange={(e) => setEditForm({ ...editForm, paymentMethod: e.target.value })}
                    className="w-full h-10 px-3 py-2 text-sm border border-gray-300 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="bank_transfer">Bank Transfer</option>
                    <option value="cash">Cash</option>
                    <option value="check">Check / Cheque</option>
                    <option value="other">Other</option>
                  </select>
                </div>

                {/* Bank Account */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold uppercase tracking-wider text-gray-700">
                    Bank Account
                  </label>
                  <select
                    value={editForm.bankAccountId}
                    onChange={(e) => {
                      const bankId = e.target.value;
                      const matched = bankAccounts.find((b) => b.id === bankId);
                      setEditForm({
                        ...editForm,
                        bankAccountId: bankId,
                        bankName: matched ? matched.bankName : editForm.bankName,
                      });
                    }}
                    className="w-full h-10 px-3 py-2 text-sm border border-gray-300 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">-- None / Default --</option>
                    {bankAccounts.map((acc) => (
                      <option key={acc.id} value={acc.id}>
                        {acc.bankName} — {acc.accountNo} ({acc.accountName})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Check No */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold uppercase tracking-wider text-gray-700">
                    Check Number
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. CHK-12345"
                    value={editForm.checkNo}
                    onChange={(e) => setEditForm({ ...editForm, checkNo: e.target.value })}
                    className="w-full h-10 px-3 py-2 text-sm border border-gray-300 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                {/* Reference No */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold uppercase tracking-wider text-gray-700">
                    Ref No / Slip No
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. TT-987654"
                    value={editForm.refNo}
                    onChange={(e) => setEditForm({ ...editForm, refNo: e.target.value })}
                    className="w-full h-10 px-3 py-2 text-sm border border-gray-300 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                {/* Source Module */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold uppercase tracking-wider text-gray-700">
                    Source Module
                  </label>
                  <select
                    value={editForm.sourceModule}
                    onChange={(e) => setEditForm({ ...editForm, sourceModule: e.target.value })}
                    className="w-full h-10 px-3 py-2 text-sm border border-gray-300 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="MANUAL">Manual / Direct</option>
                    <option value="PURCHASE">Purchase Order / Bill</option>
                    <option value="CEMENT">Cement Purchase</option>
                    <option value="AGGREGATE">Aggregate Settlement</option>
                    <option value="MEDICAL">Medical Purchase Request</option>
                    <option value="PAYROLL">Payroll</option>
                  </select>
                </div>

                {/* Source Reference */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold uppercase tracking-wider text-gray-700">
                    Source Reference / Invoice No
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. PO-001 / INV-2026-004"
                    value={editForm.sourceRef}
                    onChange={(e) => setEditForm({ ...editForm, sourceRef: e.target.value })}
                    className="w-full h-10 px-3 py-2 text-sm border border-gray-300 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              {/* Description */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-700">
                  Description / Purpose
                </label>
                <textarea
                  rows={3}
                  value={editForm.description}
                  onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                  placeholder="Enter details, tax breakdown notes, or purpose of voucher..."
                  className="w-full p-3 text-sm border border-gray-300 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Modal Actions */}
              <div className="flex items-center justify-between gap-3 pt-3 border-t border-gray-100">
                <Link
                  href={`/dashboard/finance/vouchers/${voucherId}/edit`}
                  className="text-xs font-semibold text-blue-600 hover:text-blue-800 hover:underline inline-flex items-center gap-1"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>Open Full Page Editor</span>
                </Link>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setIsEditOpen(false)}
                    className="px-4 py-2 text-sm font-semibold text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-xl transition-colors"
                  >
                    Cancel
                  </button>
                  <Button
                    type="submit"
                    isLoading={editLoading}
                    icon={<Save className="w-4 h-4 mr-1.5" />}
                  >
                    Save Changes
                  </Button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
