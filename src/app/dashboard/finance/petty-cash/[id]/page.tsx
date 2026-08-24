'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import { Card, CardBody, CardHeader, Button, Badge, Modal, Input, Select } from '@/components/ui';

interface BankAccountInfo {
  id: string;
  bankName: string;
  accountNo: string;
  accountName: string;
  branch?: string | null;
  balance?: number;
}

interface PettyCashDetail {
  id: string;
  voucherNo: string;
  type: string;
  cashierId: string | null;
  cashierName: string;
  amount: number;
  category: string | null;
  description: string | null;
  refNo: string | null;
  bankAccountId: string | null;
  bankAccount?: BankAccountInfo | null;
  approvedBy: string | null;
  status: string;
  transactionDate: string;
  createdBy: string | null;
  createdAt: string;
  updatedAt: string;
}

export default function PettyCashDetailPage() {
  const router = useRouter();
  const params = useParams();
  const recordId = params?.id as string;
  const { data: session } = useSession();

  const [record, setRecord] = useState<PettyCashDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [copiedId, setCopiedId] = useState(false);

  // Edit Modal State
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editFormData, setEditFormData] = useState({
    cashierName: '',
    amount: '',
    category: '',
    description: '',
    refNo: '',
    transactionDate: '',
  });

  const fetchRecord = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch(`/api/finance/petty-cash/${recordId}`);
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to fetch petty cash record');
      }
      setRecord(data.data);
      setEditFormData({
        cashierName: data.data.cashierName || '',
        amount: data.data.amount?.toString() || '',
        category: data.data.category || '',
        description: data.data.description || '',
        refNo: data.data.refNo || '',
        transactionDate: data.data.transactionDate
          ? new Date(data.data.transactionDate).toISOString().slice(0, 10)
          : '',
      });
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (recordId) {
      fetchRecord();
    }
  }, [recordId]);

  const handleCopyId = () => {
    if (!record?.id) return;
    navigator.clipboard.writeText(record.id);
    setCopiedId(true);
    setTimeout(() => setCopiedId(false), 2000);
  };

  const handleStatusUpdate = async (newStatus: string) => {
    if (!confirm(`Are you sure you want to change status to "${newStatus}"?`)) return;

    setActionLoading(true);
    try {
      const currentUserName = session?.user?.name || session?.user?.email || 'Authorized User';
      const payload: any = { status: newStatus };
      if (newStatus === 'Approved') {
        payload.approvedBy = currentUserName;
      }

      const res = await fetch(`/api/finance/petty-cash/${recordId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to update transaction status');
      }
      setRecord(data.data);
    } catch (err: any) {
      alert(`Error: ${err.message}`);
    } finally {
      setActionLoading(false);
    }
  };

  const handleCancel = async () => {
    if (!confirm(`Are you sure you want to cancel petty cash voucher "${record?.voucherNo}"?`)) return;

    setActionLoading(true);
    try {
      const res = await fetch(`/api/finance/petty-cash/${recordId}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to cancel record');
      }
      setRecord(data.data);
    } catch (err: any) {
      alert(`Error: ${err.message}`);
    } finally {
      setActionLoading(false);
    }
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionLoading(true);
    try {
      const res = await fetch(`/api/finance/petty-cash/${recordId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cashierName: editFormData.cashierName,
          amount: parseFloat(editFormData.amount),
          category: editFormData.category || null,
          description: editFormData.description || null,
          refNo: editFormData.refNo || null,
          transactionDate: editFormData.transactionDate,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to save changes');
      }
      setRecord(data.data);
      setIsEditOpen(false);
    } catch (err: any) {
      alert(`Error: ${err.message}`);
    } finally {
      setActionLoading(false);
    }
  };

  const formatCurrency = (val?: number) => {
    if (val === undefined || val === null) return '0.00';
    return val.toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  };

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return '—';
    try {
      return new Date(dateStr).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      });
    } catch {
      return dateStr;
    }
  };

  const formatDateTime = (dateStr?: string) => {
    if (!dateStr) return '—';
    try {
      return new Date(dateStr).toLocaleString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return dateStr;
    }
  };

  const getTypeBadge = (type: string) => {
    const map: Record<string, { label: string; bg: string }> = {
      FUND_ALLOCATION: { label: 'Fund Allocation', bg: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
      EXPENSE: { label: 'Expense', bg: 'bg-amber-50 text-amber-700 border-amber-200' },
      REPLENISHMENT: { label: 'Replenishment', bg: 'bg-blue-50 text-blue-700 border-blue-200' },
      RETURN: { label: 'Return', bg: 'bg-purple-50 text-purple-700 border-purple-200' },
    };
    const current = map[type] || { label: type, bg: 'bg-slate-50 text-slate-700 border-slate-200' };
    return (
      <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold border ${current.bg}`}>
        {current.label}
      </span>
    );
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'Pending':
        return <Badge status="Pending">Pending</Badge>;
      case 'Approved':
        return <Badge status="Approved">Approved</Badge>;
      case 'Posted':
        return <Badge status="Active">Posted</Badge>;
      case 'Cancelled':
        return <Badge status="Cancelled">Cancelled</Badge>;
      default:
        return <Badge status="Draft">{status}</Badge>;
    }
  };

  const handlePrint = () => {
    if (!record) return;
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const formattedDate = formatDate(record.transactionDate);
    const formattedAmount = formatCurrency(record.amount);

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>${record.voucherNo} - Petty Cash Voucher</title>
        <style>
          @page { size: A4; margin: 20mm; }
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
            color: #1D1D1F;
            background: #fff;
            margin: 0;
            padding: 30px;
            box-sizing: border-box;
          }
          .header {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            border-bottom: 2px solid #1D1D1F;
            padding-bottom: 20px;
            margin-bottom: 25px;
          }
          .company-title {
            font-size: 24px;
            font-weight: 800;
            color: #1D1D1F;
            margin: 0 0 4px 0;
            letter-spacing: -0.5px;
          }
          .company-sub {
            font-size: 13px;
            color: #86868B;
            margin: 0;
          }
          .doc-type {
            text-align: right;
          }
          .doc-title {
            font-size: 20px;
            font-weight: 700;
            color: #007AFF;
            margin: 0 0 4px 0;
            text-transform: uppercase;
          }
          .voucher-num {
            font-size: 14px;
            font-weight: 600;
            color: #1D1D1F;
            margin: 0;
          }
          .grid-2 {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 20px;
            margin-bottom: 25px;
          }
          .info-card {
            background: #F5F5F7;
            border-radius: 10px;
            padding: 16px;
          }
          .field-group {
            margin-bottom: 10px;
          }
          .field-group:last-child {
            margin-bottom: 0;
          }
          .field-label {
            font-size: 10px;
            font-weight: 700;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            color: #86868B;
            margin-bottom: 2px;
          }
          .field-value {
            font-size: 14px;
            font-weight: 600;
            color: #1D1D1F;
          }
          .amount-box {
            background: #F0F7FF;
            border: 1.5px solid #007AFF;
            border-radius: 12px;
            padding: 20px;
            text-align: center;
            margin: 25px 0;
          }
          .amount-label {
            font-size: 12px;
            font-weight: 700;
            text-transform: uppercase;
            letter-spacing: 1px;
            color: #007AFF;
            margin-bottom: 6px;
          }
          .amount-value {
            font-size: 32px;
            font-weight: 800;
            color: #1D1D1F;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            margin: 20px 0;
          }
          th, td {
            padding: 10px 14px;
            text-align: left;
            border-bottom: 1px solid #E5E5EA;
            font-size: 13px;
          }
          th {
            background: #F5F5F7;
            color: #86868B;
            font-weight: 700;
            text-transform: uppercase;
            font-size: 11px;
          }
          .desc-section {
            background: #FAFAFA;
            border: 1px solid #E5E5EA;
            border-radius: 10px;
            padding: 16px;
            margin: 20px 0;
          }
          .desc-title {
            font-size: 11px;
            font-weight: 700;
            text-transform: uppercase;
            color: #86868B;
            margin-bottom: 6px;
          }
          .desc-text {
            font-size: 14px;
            line-height: 1.5;
            color: #1D1D1F;
            white-space: pre-wrap;
          }
          .signatures {
            display: grid;
            grid-template-columns: 1fr 1fr 1fr;
            gap: 24px;
            margin-top: 50px;
            padding-top: 20px;
          }
          .sig-box {
            text-align: center;
          }
          .sig-line {
            border-top: 1px solid #86868B;
            margin-top: 40px;
            padding-top: 6px;
            font-size: 12px;
            font-weight: 600;
            color: #1D1D1F;
          }
          .sig-name {
            font-size: 11px;
            color: #86868B;
            margin-top: 2px;
          }
          @media print {
            body { padding: 0; }
          }
        </style>
      </head>
      <body>
        <div class="header">
          <div>
            <h1 class="company-title">SAMARIA TRADING PLC</h1>
            <p class="company-sub">Finance & Treasury Department | Petty Cash Management</p>
          </div>
          <div class="doc-type">
            <div class="doc-title">PETTY CASH VOUCHER</div>
            <div class="voucher-num">${record.voucherNo}</div>
          </div>
        </div>

        <div class="grid-2">
          <div class="info-card">
            <div class="field-group">
              <div class="field-label">Transaction Date</div>
              <div class="field-value">${formattedDate}</div>
            </div>
            <div class="field-group">
              <div class="field-label">Voucher Type</div>
              <div class="field-value">${record.type.replace(/_/g, ' ')}</div>
            </div>
            <div class="field-group">
              <div class="field-label">Status</div>
              <div class="field-value">${record.status}</div>
            </div>
          </div>

          <div class="info-card">
            <div class="field-group">
              <div class="field-label">Cashier / Custodian</div>
              <div class="field-value">${record.cashierName}</div>
            </div>
            <div class="field-group">
              <div class="field-label">Category</div>
              <div class="field-value">${record.category || 'N/A'}</div>
            </div>
            <div class="field-group">
              <div class="field-label">Reference No</div>
              <div class="field-value">${record.refNo || 'N/A'}</div>
            </div>
          </div>
        </div>

        <div class="amount-box">
          <div class="amount-label">Transaction Amount</div>
          <div class="amount-value">${formattedAmount} <span style="font-size: 18px; font-weight: 600;">ETB</span></div>
        </div>

        ${record.bankAccount ? `
          <div class="info-card" style="margin-bottom: 20px;">
            <div class="field-group">
              <div class="field-label">Source Bank Account</div>
              <div class="field-value">${record.bankAccount.bankName} - ${record.bankAccount.accountNo} (${record.bankAccount.accountName})</div>
            </div>
          </div>
        ` : ''}

        ${record.description ? `
          <div class="desc-section">
            <div class="desc-title">Description & Purpose</div>
            <div class="desc-text">${record.description}</div>
          </div>
        ` : ''}

        <div class="signatures">
          <div class="sig-box">
            <div class="sig-line">Prepared / Custodian</div>
            <div class="sig-name">${record.cashierName}</div>
          </div>
          <div class="sig-box">
            <div class="sig-line">Checked By (Finance)</div>
            <div class="sig-name">${record.createdBy || 'Accountant'}</div>
          </div>
          <div class="sig-box">
            <div class="sig-line">Approved By</div>
            <div class="sig-name">${record.approvedBy || 'Manager / Authorizer'}</div>
          </div>
        </div>

        <script>
          window.onload = function() { window.print(); }
        </script>
      </body>
      </html>
    `);
    printWindow.document.close();
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#007AFF]"></div>
        <p className="text-sm font-medium text-[#86868B]">Loading petty cash details...</p>
      </div>
    );
  }

  if (error || !record) {
    return (
      <div className="space-y-6 max-w-4xl">
        <Button
          variant="secondary"
          onClick={() => router.push('/dashboard/finance/petty-cash')}
        >
          &larr; Back to Petty Cash
        </Button>
        <Card>
          <CardBody>
            <div className="p-4 bg-[#FF3B30]/10 border border-[#FF3B30]/20 rounded-xl text-[#D70015]">
              <h3 className="font-semibold text-base mb-1">Record Not Found</h3>
              <p className="text-sm">{error || 'The requested petty cash record could not be loaded.'}</p>
            </div>
          </CardBody>
        </Card>
      </div>
    );
  }

  const isEditable = record.status !== 'Posted' && record.status !== 'Cancelled';

  return (
    <div className="space-y-6 max-w-5xl pb-10">
      {/* Top Header & Breadcrumb */}
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <Link
            href="/dashboard/finance/petty-cash"
            className="inline-flex items-center text-sm font-medium text-[#007AFF] hover:underline gap-1.5 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to Petty Cash Records
          </Link>

          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="inline-flex items-center gap-2 px-3.5 py-2 bg-white hover:bg-[#F5F5F7] border border-[#D2D2D7] text-[#1D1D1F] rounded-xl text-sm font-medium shadow-sm transition-all active:scale-95"
            >
              <svg className="w-4 h-4 text-[#86868B]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
              </svg>
              Print Voucher
            </button>

            {isEditable && (
              <Button
                variant="secondary"
                size="md"
                onClick={() => setIsEditOpen(true)}
              >
                Edit
              </Button>
            )}
          </div>
        </div>

        {/* Title and Key Badges */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white/70 backdrop-blur-md p-6 rounded-2xl border border-[#E5E5EA] shadow-sm">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#1D1D1F]">
                {record.voucherNo}
              </h1>
              {getTypeBadge(record.type)}
              {getStatusBadge(record.status)}
            </div>

            {/* ID with Copy Button */}
            <div className="flex items-center gap-2 text-xs text-[#86868B]">
              <span className="font-semibold uppercase tracking-wider">Record ID:</span>
              <code className="px-2 py-0.5 bg-[#F5F5F7] border border-[#E5E5EA] rounded-md font-mono text-[#1D1D1F] text-[11px] select-all">
                {record.id}
              </code>
              <button
                type="button"
                onClick={handleCopyId}
                className="text-[#007AFF] hover:text-[#0055C4] font-medium text-xs flex items-center gap-1 transition-colors"
                title="Copy full record ID"
              >
                {copiedId ? (
                  <span className="text-[#34C759] font-semibold flex items-center gap-1">
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    Copied!
                  </span>
                ) : (
                  <span className="flex items-center gap-1">
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                    Copy ID
                  </span>
                )}
              </button>
            </div>
          </div>

          {/* Amount Badge Banner */}
          <div className="text-left sm:text-right bg-[#F5F5F7] sm:bg-transparent p-4 sm:p-0 rounded-xl sm:rounded-none">
            <span className="text-xs font-semibold uppercase tracking-wider text-[#86868B] block">
              Total Amount
            </span>
            <div className="text-2xl sm:text-3xl font-extrabold text-[#1D1D1F] tracking-tight">
              {formatCurrency(record.amount)}{' '}
              <span className="text-sm font-semibold text-[#86868B]">ETB</span>
            </div>
          </div>
        </div>
      </div>

      {/* Grid: Main Information */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Core Information */}
        <div className="md:col-span-2 space-y-6">
          <Card>
            <CardHeader className="border-b border-[#F5F5F7] py-4">
              <h2 className="text-base font-semibold text-[#1D1D1F] flex items-center gap-2">
                <svg className="w-5 h-5 text-[#007AFF]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                Transaction Overview
              </h2>
            </CardHeader>
            <CardBody className="p-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div>
                  <span className="text-xs font-medium text-[#86868B] uppercase tracking-wider block mb-1">
                    Voucher Number
                  </span>
                  <span className="text-sm font-semibold text-[#1D1D1F]">
                    {record.voucherNo}
                  </span>
                </div>

                <div>
                  <span className="text-xs font-medium text-[#86868B] uppercase tracking-wider block mb-1">
                    Transaction Date
                  </span>
                  <span className="text-sm font-semibold text-[#1D1D1F]">
                    {formatDate(record.transactionDate)}
                  </span>
                </div>

                <div>
                  <span className="text-xs font-medium text-[#86868B] uppercase tracking-wider block mb-1">
                    Transaction Type
                  </span>
                  <div className="mt-0.5">{getTypeBadge(record.type)}</div>
                </div>

                <div>
                  <span className="text-xs font-medium text-[#86868B] uppercase tracking-wider block mb-1">
                    Expense Category
                  </span>
                  <span className="text-sm font-medium text-[#1D1D1F]">
                    {record.category || '—'}
                  </span>
                </div>

                <div>
                  <span className="text-xs font-medium text-[#86868B] uppercase tracking-wider block mb-1">
                    Cashier / Custodian
                  </span>
                  <span className="text-sm font-semibold text-[#1D1D1F]">
                    {record.cashierName}
                  </span>
                </div>

                <div>
                  <span className="text-xs font-medium text-[#86868B] uppercase tracking-wider block mb-1">
                    Reference / Receipt No
                  </span>
                  <span className="text-sm font-medium text-[#1D1D1F]">
                    {record.refNo || '—'}
                  </span>
                </div>
              </div>
            </CardBody>
          </Card>

          {/* Bank Account Details (if linked) */}
          {record.bankAccount && (
            <Card>
              <CardHeader className="border-b border-[#F5F5F7] py-4">
                <h2 className="text-base font-semibold text-[#1D1D1F] flex items-center gap-2">
                  <svg className="w-5 h-5 text-[#34C759]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                  </svg>
                  Source Bank Account
                </h2>
              </CardHeader>
              <CardBody className="p-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <div>
                    <span className="text-xs font-medium text-[#86868B] uppercase tracking-wider block mb-1">
                      Bank Name
                    </span>
                    <span className="text-sm font-semibold text-[#1D1D1F]">
                      {record.bankAccount.bankName}
                    </span>
                  </div>

                  <div>
                    <span className="text-xs font-medium text-[#86868B] uppercase tracking-wider block mb-1">
                      Account Number
                    </span>
                    <span className="text-sm font-mono font-medium text-[#1D1D1F]">
                      {record.bankAccount.accountNo}
                    </span>
                  </div>

                  <div>
                    <span className="text-xs font-medium text-[#86868B] uppercase tracking-wider block mb-1">
                      Account Name
                    </span>
                    <span className="text-sm font-medium text-[#1D1D1F]">
                      {record.bankAccount.accountName}
                    </span>
                  </div>

                  {record.bankAccount.branch && (
                    <div>
                      <span className="text-xs font-medium text-[#86868B] uppercase tracking-wider block mb-1">
                        Branch
                      </span>
                      <span className="text-sm font-medium text-[#1D1D1F]">
                        {record.bankAccount.branch}
                      </span>
                    </div>
                  )}
                </div>
              </CardBody>
            </Card>
          )}

          {/* Description & Justification */}
          <Card>
            <CardHeader className="border-b border-[#F5F5F7] py-4">
              <h2 className="text-base font-semibold text-[#1D1D1F] flex items-center gap-2">
                <svg className="w-5 h-5 text-[#86868B]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h7" />
                </svg>
                Description & Notes
              </h2>
            </CardHeader>
            <CardBody className="p-6">
              {record.description ? (
                <p className="text-sm text-[#1D1D1F] leading-relaxed whitespace-pre-wrap">
                  {record.description}
                </p>
              ) : (
                <p className="text-sm italic text-[#86868B]">No description provided for this transaction.</p>
              )}
            </CardBody>
          </Card>
        </div>

        {/* Sidebar: Status, Actions & Audit Trail */}
        <div className="space-y-6">
          {/* Status & Actions Card */}
          <Card>
            <CardHeader className="border-b border-[#F5F5F7] py-4">
              <h2 className="text-base font-semibold text-[#1D1D1F]">Workflow Actions</h2>
            </CardHeader>
            <CardBody className="p-6 space-y-4">
              <div>
                <span className="text-xs font-medium text-[#86868B] uppercase tracking-wider block mb-1.5">
                  Current Status
                </span>
                <div>{getStatusBadge(record.status)}</div>
              </div>

              {/* Status Action Buttons */}
              <div className="pt-2 border-t border-[#F5F5F7] space-y-2.5">
                {record.status === 'Pending' && (
                  <>
                    <Button
                      variant="primary"
                      size="md"
                      className="w-full"
                      onClick={() => handleStatusUpdate('Approved')}
                      isLoading={actionLoading}
                    >
                      Approve Transaction
                    </Button>

                    <Button
                      variant="danger"
                      size="md"
                      className="w-full"
                      onClick={handleCancel}
                      isLoading={actionLoading}
                    >
                      Cancel Transaction
                    </Button>
                  </>
                )}

                {record.status === 'Approved' && (
                  <>
                    <Button
                      variant="primary"
                      size="md"
                      className="w-full"
                      onClick={() => handleStatusUpdate('Posted')}
                      isLoading={actionLoading}
                    >
                      Post to Ledger
                    </Button>

                    <Button
                      variant="secondary"
                      size="md"
                      className="w-full"
                      onClick={() => handleStatusUpdate('Pending')}
                      isLoading={actionLoading}
                    >
                      Revert to Pending
                    </Button>

                    <Button
                      variant="danger"
                      size="md"
                      className="w-full"
                      onClick={handleCancel}
                      isLoading={actionLoading}
                    >
                      Cancel Transaction
                    </Button>
                  </>
                )}

                {record.status === 'Posted' && (
                  <div className="p-3 bg-[#34C759]/10 border border-[#34C759]/20 rounded-xl text-center">
                    <p className="text-xs font-semibold text-[#248A3D]">
                      ✓ Transaction is posted and finalized.
                    </p>
                  </div>
                )}

                {record.status === 'Cancelled' && (
                  <div className="p-3 bg-[#FF3B30]/10 border border-[#FF3B30]/20 rounded-xl text-center">
                    <p className="text-xs font-semibold text-[#D70015]">
                      ✗ This transaction has been cancelled.
                    </p>
                  </div>
                )}
              </div>
            </CardBody>
          </Card>

          {/* Audit & System Information */}
          <Card>
            <CardHeader className="border-b border-[#F5F5F7] py-4">
              <h2 className="text-base font-semibold text-[#1D1D1F]">Audit Information</h2>
            </CardHeader>
            <CardBody className="p-6 space-y-4 text-xs">
              <div>
                <span className="font-medium text-[#86868B] uppercase tracking-wider block mb-1">
                  Database Record ID
                </span>
                <span className="font-mono text-[#1D1D1F] break-all select-all block bg-[#F5F5F7] p-2 rounded-lg border border-[#E5E5EA]">
                  {record.id}
                </span>
              </div>

              <div>
                <span className="font-medium text-[#86868B] uppercase tracking-wider block mb-1">
                  Created By
                </span>
                <span className="text-[#1D1D1F] font-medium">
                  {record.createdBy || 'System User'}
                </span>
              </div>

              <div>
                <span className="font-medium text-[#86868B] uppercase tracking-wider block mb-1">
                  Created At
                </span>
                <span className="text-[#1D1D1F]">
                  {formatDateTime(record.createdAt)}
                </span>
              </div>

              {record.approvedBy && (
                <div>
                  <span className="font-medium text-[#86868B] uppercase tracking-wider block mb-1">
                    Approved By
                  </span>
                  <span className="text-[#1D1D1F] font-medium">
                    {record.approvedBy}
                  </span>
                </div>
              )}

              <div>
                <span className="font-medium text-[#86868B] uppercase tracking-wider block mb-1">
                  Last Updated
                </span>
                <span className="text-[#1D1D1F]">
                  {formatDateTime(record.updatedAt)}
                </span>
              </div>
            </CardBody>
          </Card>
        </div>
      </div>

      {/* Edit Record Modal */}
      <Modal
        isOpen={isEditOpen}
        onClose={() => setIsEditOpen(false)}
        title={`Edit Transaction (${record.voucherNo})`}
        size="lg"
      >
        <form onSubmit={handleEditSubmit} className="space-y-4">
          <Input
            label="Cashier / Custodian Name"
            name="cashierName"
            type="text"
            value={editFormData.cashierName}
            onChange={(e) => setEditFormData({ ...editFormData, cashierName: e.target.value })}
            required
          />

          <Input
            label="Amount (ETB)"
            name="amount"
            type="number"
            step="0.01"
            value={editFormData.amount}
            onChange={(e) => setEditFormData({ ...editFormData, amount: e.target.value })}
            required
          />

          <Select
            label="Category"
            name="category"
            value={editFormData.category}
            onChange={(e) => setEditFormData({ ...editFormData, category: e.target.value })}
            options={[
              { value: '', label: 'Select Category...' },
              { value: 'Office Supplies', label: 'Office Supplies' },
              { value: 'Transport', label: 'Transport' },
              { value: 'Meals & Refreshments', label: 'Meals & Refreshments' },
              { value: 'Utilities', label: 'Utilities' },
              { value: 'Cleaning', label: 'Cleaning' },
              { value: 'Printing', label: 'Printing' },
              { value: 'Miscellaneous', label: 'Miscellaneous' },
            ]}
          />

          <Input
            label="Reference No"
            name="refNo"
            type="text"
            placeholder="Receipt or bill reference"
            value={editFormData.refNo}
            onChange={(e) => setEditFormData({ ...editFormData, refNo: e.target.value })}
          />

          <Input
            label="Transaction Date"
            name="transactionDate"
            type="date"
            value={editFormData.transactionDate}
            onChange={(e) => setEditFormData({ ...editFormData, transactionDate: e.target.value })}
          />

          <div>
            <label className="block text-[13px] font-medium text-[#86868B] uppercase tracking-wider mb-1.5">
              Description
            </label>
            <textarea
              name="description"
              rows={3}
              className="w-full px-4 py-3 bg-white border border-[#D2D2D7] rounded-xl focus:outline-none focus:ring-4 focus:ring-[rgba(0,122,255,0.25)] focus:border-[#007AFF] transition-all text-[#1D1D1F] text-sm"
              value={editFormData.description}
              onChange={(e) => setEditFormData({ ...editFormData, description: e.target.value })}
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-[#F5F5F7]">
            <Button
              variant="secondary"
              onClick={() => setIsEditOpen(false)}
              disabled={actionLoading}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              type="submit"
              isLoading={actionLoading}
            >
              Save Changes
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
