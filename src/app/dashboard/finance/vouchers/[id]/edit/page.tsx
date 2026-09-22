'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft,
  Save,
  Pencil,
  AlertCircle,
  CheckCircle2,
  Building2,
  Calendar,
  DollarSign,
  CreditCard,
  FileText,
  Layers,
  Lock,
} from 'lucide-react';
import { Card, CardBody, CardHeader, Button, Badge } from '@/components/ui';

interface EntityOption {
  id: string;
  name: string;
  code?: string;
  pendingAmount?: number;
  withholding?: boolean;
  withholdRate?: number;
}

interface SourceRefOption {
  id: string;
  label: string;
  ref: string;
  amount?: number;
  totalAmount?: number;
  paidAmount?: number;
  remainingAmount?: number;
  isPartial?: boolean;
  status?: string;
  supplierName?: string;
}

interface BankAccountOption {
  id: string;
  bankName: string;
  accountNo: string;
  accountName: string;
}

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
  voucherDate: string;
  createdAt: string;
}

export default function EditVoucherPage() {
  const router = useRouter();
  const params = useParams();
  const voucherId = params?.id as string;

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const [originalVoucher, setOriginalVoucher] = useState<VoucherData | null>(null);

  // Entity lists
  const [customers, setCustomers] = useState<EntityOption[]>([]);
  const [suppliers, setSuppliers] = useState<EntityOption[]>([]);
  const [medicalSuppliers, setMedicalSuppliers] = useState<EntityOption[]>([]);
  const [employees, setEmployees] = useState<EntityOption[]>([]);
  const [transporters, setTransporters] = useState<EntityOption[]>([]);
  const [bankAccounts, setBankAccounts] = useState<BankAccountOption[]>([]);
  const [sourceRefs, setSourceRefs] = useState<SourceRefOption[]>([]);
  const [loadingRefs, setLoadingRefs] = useState(false);

  // Tax calculation state
  const [applyVat, setApplyVat] = useState(false);
  const [vatRate, setVatRate] = useState<number>(15);
  const [applyWithholding, setApplyWithholding] = useState(false);
  const [withholdRate, setWithholdRate] = useState<number>(3);

  // Form State
  const [formData, setFormData] = useState({
    voucherNo: '',
    voucherType: 'PAYMENT',
    sourceModule: 'MANUAL',
    sourceId: '',
    sourceRef: '',
    payeeType: 'SUPPLIER',
    payeeId: '',
    payeeName: '',
    amount: '',
    paymentMethod: 'bank_transfer',
    bankAccountId: '',
    bankName: '',
    checkNo: '',
    refNo: '',
    description: '',
    status: 'Draft',
    voucherDate: '',
  });

  // Calculate tax figures based on entered amount
  const subtotal = useMemo(() => {
    return parseFloat(formData.amount || '0') || 0;
  }, [formData.amount]);

  const totalVAT = useMemo(() => {
    return applyVat ? (subtotal * vatRate) / 100 : 0;
  }, [subtotal, applyVat, vatRate]);

  const grossTotal = useMemo(() => {
    return subtotal + totalVAT;
  }, [subtotal, totalVAT]);

  const withholdAmount = useMemo(() => {
    return applyWithholding ? (subtotal * withholdRate) / 100 : 0;
  }, [subtotal, applyWithholding, withholdRate]);

  const netPayable = useMemo(() => {
    return Math.max(0, grossTotal - withholdAmount);
  }, [grossTotal, withholdAmount]);

  // Fetch initial voucher data & entities
  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        setLoading(true);
        setError(null);

        const [voucherRes, custRes, suppRes, empRes, transRes, bankRes, allCustRes] = await Promise.all([
          fetch(`/api/finance/vouchers/${voucherId}`).then((r) => r.json()),
          fetch('/api/sales/agreements/customers').then((r) => r.json()).catch(() => ({ success: false })),
          fetch('/api/suppliers?limit=1000').then((r) => r.json()).catch(() => ({ success: false })),
          fetch('/api/employees?limit=1000').then((r) => r.json()).catch(() => ({ success: false })),
          fetch('/api/transporters?limit=1000').then((r) => r.json()).catch(() => ({ success: false })),
          fetch('/api/finance/bank?limit=100').then((r) => r.json()).catch(() => ({ success: false })),
          fetch('/api/customers?limit=1000').then((r) => r.json()).catch(() => ({ success: false })),
        ]);

        if (!voucherRes.success || !voucherRes.data) {
          throw new Error(voucherRes.error || 'Failed to fetch voucher');
        }

        const v: VoucherData = voucherRes.data;
        setOriginalVoucher(v);

        // Populate customer map
        const customerMap = new Map<string, EntityOption>();
        if (allCustRes.success && Array.isArray(allCustRes.data)) {
          allCustRes.data.forEach((c: any) => {
            if (c.id) {
              customerMap.set(c.id, {
                id: c.id,
                name: c.companyName || c.name || 'Customer',
                code: c.code || '',
                withholding: c.withholding || false,
                withholdRate: c.withholdRate || 3,
              });
            }
          });
        }
        if (custRes.success && Array.isArray(custRes.data)) {
          custRes.data.forEach((c: any) => {
            if (c.customerId) {
              customerMap.set(c.customerId, {
                id: c.customerId,
                name: `${c.companyName}${c.agreementNo ? ` — ${c.agreementNo}` : ''}`,
                code: c.agreementNo || '',
                withholding: c.withholding || false,
                withholdRate: c.withholdRate || 3,
              });
            }
          });
        }
        setCustomers(Array.from(customerMap.values()));

        if (suppRes.success && Array.isArray(suppRes.data)) {
          const fetchedSuppliers = suppRes.data.map((s: any) => ({
            id: s.id,
            name: s.companyName || s.name || '',
            code: s.code,
            withholding: s.withholding || false,
            withholdRate: s.withholdRate || 3,
          }));
          setSuppliers([
            { id: 'ONE_TIME_SUPPLIER', name: '⚡ One-Time Supplier (Ad-Hoc / Manual)', code: 'ONE-TIME' },
            ...fetchedSuppliers,
          ]);

          const medList = fetchedSuppliers.filter(
            (s: any) =>
              (s.category && s.category.toLowerCase().includes('med')) ||
              (s.category && s.category.toLowerCase().includes('pharma'))
          );
          setMedicalSuppliers(medList.length > 0 ? medList : fetchedSuppliers);
        } else {
          setSuppliers([{ id: 'ONE_TIME_SUPPLIER', name: '⚡ One-Time Supplier (Ad-Hoc / Manual)', code: 'ONE-TIME' }]);
        }

        if (empRes.success && Array.isArray(empRes.data)) {
          setEmployees(
            empRes.data.map((e: any) => ({
              id: e.id,
              name: e.fullName || e.name || `${e.firstName || ''} ${e.lastName || ''}`.trim(),
              code: e.employeeId || e.code,
            }))
          );
        }

        if (transRes.success && Array.isArray(transRes.data)) {
          setTransporters(
            transRes.data.map((t: any) => ({
              id: t.id,
              name: t.companyName || t.name || '',
              code: t.code,
              withholding: t.withholding || false,
              withholdRate: t.withholdRate || 3,
            }))
          );
        }

        if (bankRes.success && Array.isArray(bankRes.data)) {
          setBankAccounts(bankRes.data);
        }

        // Initialize form data from voucher
        setFormData({
          voucherNo: v.voucherNo || '',
          voucherType: v.voucherType || 'PAYMENT',
          sourceModule: v.sourceModule || 'MANUAL',
          sourceId: v.sourceId || '',
          sourceRef: v.sourceRef || '',
          payeeType: v.payeeType || 'SUPPLIER',
          payeeId: v.payeeId || '',
          payeeName: v.payeeName || '',
          amount: String(v.amount || 0),
          paymentMethod: v.paymentMethod || 'bank_transfer',
          bankAccountId: v.bankAccountId || '',
          bankName: v.bankName || '',
          checkNo: v.checkNo || '',
          refNo: v.refNo || '',
          description: v.description || '',
          status: v.status || 'Draft',
          voucherDate: v.voucherDate ? v.voucherDate.slice(0, 10) : new Date().toISOString().slice(0, 10),
        });

        // Detect if VAT or Withholding was previously recorded in description
        if (v.description) {
          if (v.description.includes('VAT')) setApplyVat(true);
          if (v.description.includes('Withholding')) setApplyWithholding(true);
        }
      } catch (err: any) {
        setError(err.message || 'Failed to load voucher details');
      } finally {
        setLoading(false);
      }
    };

    if (voucherId) {
      fetchInitialData();
    }
  }, [voucherId]);

  // Fetch source references when sourceModule changes
  useEffect(() => {
    if (!formData.sourceModule || formData.sourceModule === 'MANUAL') {
      setSourceRefs([]);
      return;
    }

    const fetchRefs = async () => {
      setLoadingRefs(true);
      try {
        let refs: SourceRefOption[] = [];

        switch (formData.sourceModule) {
          case 'PURCHASE': {
            const [poRes, payRes] = await Promise.all([
              fetch('/api/purchasing/orders?limit=100').then((r) => r.json()).catch(() => ({ success: false })),
              fetch('/api/purchasing/payments?limit=100').then((r) => r.json()).catch(() => ({ success: false })),
            ]);

            const paymentRefs: SourceRefOption[] = [];
            if (payRes.success && Array.isArray(payRes.data)) {
              payRes.data.forEach((pm: any) => {
                paymentRefs.push({
                  id: pm.id,
                  label: `Purchasing Payment: ${pm.paymentNo || pm.id} — ${pm.supplier?.companyName || 'Unknown Supplier'} — ETB ${Number(pm.amount || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}`,
                  ref: pm.paymentNo || pm.id,
                  amount: Number(pm.amount || 0),
                  supplierName: pm.supplier?.companyName || '',
                });
              });
            }

            const poRefs: SourceRefOption[] = [];
            if (poRes.success && Array.isArray(poRes.data)) {
              poRes.data.forEach((po: any) => {
                poRefs.push({
                  id: po.id,
                  label: `PO: ${po.poNo} — ${po.supplier?.companyName || 'Unknown'} — ETB ${Number(po.totalAmount || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })} (${po.status})`,
                  ref: po.poNo,
                  amount: Number(po.totalAmount || 0),
                  supplierName: po.supplier?.companyName || '',
                });
              });
            }

            refs = [...paymentRefs, ...poRefs];
            break;
          }
          case 'CEMENT': {
            const res = await fetch('/api/cement/purchases?limit=100');
            const data = await res.json();
            if (data.success && Array.isArray(data.data)) {
              refs = data.data.map((p: any) => {
                const total = Number(p.totalAmount) || 0;
                const paid = Number(p.paidAmount) || 0;
                const remaining = Math.max(0, total - paid);
                return {
                  id: p.id,
                  label: `${p.purchaseNo} — ${p.factory?.name || 'Unknown'} — Total: ETB ${total.toLocaleString('en-US')} | Remaining: ETB ${remaining.toLocaleString('en-US')}`,
                  ref: p.purchaseNo,
                  amount: remaining > 0 ? remaining : total,
                  totalAmount: total,
                  paidAmount: paid,
                  remainingAmount: remaining,
                  status: p.status,
                };
              });
            }
            break;
          }
          case 'PAYROLL': {
            const res = await fetch('/api/hr/payroll?limit=50');
            const data = await res.json();
            if (data.success && Array.isArray(data.data)) {
              refs = data.data.map((pr: any) => ({
                id: pr.id,
                label: `${pr.payrollNo || pr.period || 'Payroll'} — ${pr.status || 'Active'}`,
                ref: pr.payrollNo || pr.period,
                amount: pr.totalNet || pr.totalAmount,
              }));
            }
            break;
          }
          case 'SALES': {
            const res = await fetch('/api/sales/invoices?limit=200');
            const data = await res.json();
            if (data.success && Array.isArray(data.data)) {
              refs = data.data.map((inv: any) => ({
                id: inv.id,
                label: `${inv.invoiceNo} — ${inv.customer?.companyName || 'Customer'} — ETB ${Number(inv.totalAmount || 0).toLocaleString('en-US')}`,
                ref: inv.invoiceNo,
                amount: Number(inv.totalAmount || 0),
              }));
            }
            break;
          }
          case 'MEDICAL': {
            const res = await fetch('/api/medical/requests?limit=200');
            const data = await res.json();
            if (data.success && Array.isArray(data.data)) {
              refs = data.data.map((r: any) => ({
                id: r.id,
                label: `Medical Request: ${r.requestNo} — ${r.status}`,
                ref: r.requestNo,
                amount: Number(r.totalAmount || 0),
              }));
            }
            break;
          }
          case 'AGGREGATE':
          case 'TRANSPORTER': {
            const res = await fetch('/api/aggregate?limit=500');
            const data = await res.json();
            if (data.success && Array.isArray(data.data)) {
              refs = data.data.map((d: any) => {
                const amt = Number(d.transporterPayable || d.netTruckPayment || d.supplierPayable || 0);
                return {
                  id: d.id,
                  label: `${d.dispatchNo} — POD: ${d.padNumber || 'N/A'} — ETB ${amt.toLocaleString('en-US')}`,
                  ref: d.dispatchNo,
                  amount: amt,
                };
              });
            }
            break;
          }
          default:
            break;
        }

        setSourceRefs(refs);
      } catch (err) {
        console.error('Error fetching source refs:', err);
      } finally {
        setLoadingRefs(false);
      }
    };

    fetchRefs();
  }, [formData.sourceModule]);

  const getPayeeOptions = (): EntityOption[] => {
    switch (formData.payeeType) {
      case 'CUSTOMER':
        return customers;
      case 'SUPPLIER':
        return suppliers;
      case 'MEDICAL':
      case 'MEDICAL_SUPPLIER':
        return medicalSuppliers.length > 0 ? medicalSuppliers : suppliers;
      case 'ONE_TIME_SUPPLIER':
        return [{ id: 'ONE_TIME_SUPPLIER', name: '⚡ One-Time Supplier (Ad-Hoc / Manual)', code: 'ONE-TIME' }];
      case 'EMPLOYEE':
        return employees;
      case 'TRANSPORTER':
        return transporters;
      default:
        return [];
    }
  };

  const handlePayeeSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selectedId = e.target.value;
    const options = getPayeeOptions();
    const selected = options.find((o) => o.id === selectedId);

    if (selectedId === 'ONE_TIME_SUPPLIER') {
      setFormData((prev) => ({
        ...prev,
        payeeId: 'ONE_TIME_SUPPLIER',
        payeeName: prev.payeeName && prev.payeeName !== '⚡ One-Time Supplier (Ad-Hoc / Manual)' ? prev.payeeName : '',
      }));
    } else {
      setFormData((prev) => ({
        ...prev,
        payeeId: selectedId,
        payeeName: selected ? `${selected.name}${selected.code ? ` (${selected.code})` : ''}` : '',
      }));

      if (selected?.withholding) {
        setApplyWithholding(true);
        if (selected.withholdRate) setWithholdRate(selected.withholdRate);
      }
    }
  };

  const handleSourceSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selectedId = e.target.value;
    const selected = sourceRefs.find((r) => r.id === selectedId);

    if (!selected) {
      setFormData((prev) => ({ ...prev, sourceId: '', sourceRef: '' }));
      return;
    }

    setFormData((prev) => ({
      ...prev,
      sourceId: selected.id,
      sourceRef: selected.ref,
      ...(selected.amount ? { amount: String(selected.amount) } : {}),
      ...(selected.supplierName && !prev.payeeName ? { payeeName: selected.supplierName } : {}),
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMessage(null);

    if (originalVoucher?.status === 'Posted') {
      setError('Posted vouchers cannot be modified. Please create a reversal or adjustment voucher instead.');
      return;
    }

    if (!formData.payeeName.trim()) {
      setError('Payee Name is required.');
      return;
    }

    const numAmount = parseFloat(formData.amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      setError('Please enter a valid amount greater than 0.');
      return;
    }

    if (!formData.voucherDate) {
      setError('Voucher Date is required.');
      return;
    }

    // Build description with tax breakdown note if enabled
    let finalDescription = formData.description.trim();
    if (applyVat || applyWithholding) {
      const taxNotes = `Subtotal: ETB ${subtotal.toLocaleString('en-US', { minimumFractionDigits: 2 })}${
        applyVat ? ` | VAT (${vatRate}%): +ETB ${totalVAT.toLocaleString('en-US', { minimumFractionDigits: 2 })}` : ''
      } | Gross: ETB ${grossTotal.toLocaleString('en-US', { minimumFractionDigits: 2 })}${
        applyWithholding ? ` | Withholding (${withholdRate}%): -ETB ${withholdAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })}` : ''
      } | Net Payable: ETB ${netPayable.toLocaleString('en-US', { minimumFractionDigits: 2 })}`;

      if (!finalDescription.includes('Subtotal')) {
        finalDescription = finalDescription ? `${finalDescription}\n\n[Tax Breakdown]\n${taxNotes}` : taxNotes;
      }
    }

    setSubmitting(true);
    try {
      let selectedBankName = formData.bankName;
      if (formData.bankAccountId) {
        const matchedBank = bankAccounts.find((b) => b.id === formData.bankAccountId);
        if (matchedBank) selectedBankName = matchedBank.bankName;
      }

      const res = await fetch(`/api/finance/vouchers/${voucherId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          voucherType: formData.voucherType,
          voucherDate: formData.voucherDate,
          sourceModule: formData.sourceModule,
          sourceId: formData.sourceId || null,
          sourceRef: formData.sourceRef.trim() || null,
          payeeType: formData.payeeType,
          payeeId: formData.payeeId || null,
          payeeName: formData.payeeName.trim(),
          amount: applyVat || applyWithholding ? netPayable : numAmount,
          paymentMethod: formData.paymentMethod,
          bankAccountId: formData.bankAccountId || null,
          bankName: selectedBankName || null,
          checkNo: formData.checkNo.trim() || null,
          refNo: formData.refNo.trim() || null,
          description: finalDescription || null,
          status: formData.status,
        }),
      });

      const result = await res.json();
      if (!res.ok || !result.success) {
        throw new Error(result.error || 'Failed to update voucher');
      }

      setSuccessMessage('Voucher updated successfully!');
      setTimeout(() => {
        router.push(`/dashboard/finance/vouchers/${voucherId}`);
      }, 1000);
    } catch (err: any) {
      setError(err.message || 'An error occurred while saving voucher');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="text-slate-600">Loading voucher details...</p>
        </div>
      </div>
    );
  }

  const isPosted = originalVoucher?.status === 'Posted';

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-16">
      {/* Top Breadcrumb & Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <button
            onClick={() => router.push(`/dashboard/finance/vouchers/${voucherId}`)}
            className="inline-flex items-center gap-1.5 text-blue-600 hover:text-blue-800 text-sm font-medium mb-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Voucher Details
          </button>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl sm:text-3xl font-bold text-[#1D1D1F]">
              Edit Voucher <span className="font-mono text-blue-700">{formData.voucherNo}</span>
            </h1>
            <Badge status={isPosted ? 'Active' : formData.status === 'Approved' ? 'Approved' : 'Draft'}>
              {formData.status.replace('_', ' ')}
            </Badge>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="secondary"
            onClick={() => router.push(`/dashboard/finance/vouchers/${voucherId}`)}
          >
            Cancel
          </Button>
          {!isPosted && (
            <Button
              variant="primary"
              onClick={handleSubmit}
              isLoading={submitting}
              icon={<Save className="w-4 h-4 mr-1.5" />}
            >
              Save Changes
            </Button>
          )}
        </div>
      </div>

      {/* Posted Locked Alert */}
      {isPosted && (
        <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 flex items-start gap-3">
          <Lock className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <div>
            <h4 className="font-semibold text-sm">Voucher is Posted and Locked</h4>
            <p className="text-xs text-amber-800 mt-0.5">
              This voucher has already been posted to general ledger and bank transactions. Posted vouchers cannot be edited directly to preserve accounting audit trails.
            </p>
          </div>
        </div>
      )}

      {/* Notifications */}
      {error && (
        <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-800 text-sm flex items-center gap-2">
          <AlertCircle className="w-5 h-5 text-red-600 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {successMessage && (
        <div className="p-4 rounded-xl bg-green-50 border border-green-200 text-green-800 text-sm flex items-center gap-2">
          <CheckCircle2 className="w-5 h-5 text-green-600 shrink-0" />
          <span>{successMessage}</span>
        </div>
      )}

      {/* Main Edit Form */}
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Section 1: Classification & Date */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Layers className="w-5 h-5 text-blue-600" />
              <h2 className="text-lg font-bold text-[#1D1D1F]">Voucher Classification</h2>
            </div>
          </CardHeader>
          <CardBody>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
              {/* Voucher Type */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-700">
                  Voucher Type *
                </label>
                <select
                  disabled={isPosted}
                  value={formData.voucherType}
                  onChange={(e) => setFormData({ ...formData, voucherType: e.target.value })}
                  className="w-full h-10 px-3 py-2 text-sm font-semibold border border-gray-300 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 disabled:text-gray-500"
                >
                  <option value="PAYMENT">🔴 PAYMENT (Disbursement / Expense)</option>
                  <option value="RECEIPT">🟢 RECEIPT (Collection / Revenue)</option>
                  <option value="REFUND">🟠 REFUND (Return / Reversal)</option>
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
                  disabled={isPosted}
                  value={formData.voucherDate}
                  onChange={(e) => setFormData({ ...formData, voucherDate: e.target.value })}
                  className="w-full h-10 px-3 py-2 text-sm border border-gray-300 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
                />
              </div>

              {/* Status */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-700">
                  Status
                </label>
                <select
                  disabled={isPosted}
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                  className="w-full h-10 px-3 py-2 text-sm border border-gray-300 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
                >
                  <option value="Draft">Draft</option>
                  <option value="Pending_Approval">Pending Approval</option>
                  <option value="Approved">Approved</option>
                  <option value="Rejected">Rejected</option>
                </select>
              </div>
            </div>
          </CardBody>
        </Card>

        {/* Section 2: Payee Information */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Building2 className="w-5 h-5 text-blue-600" />
              <h2 className="text-lg font-bold text-[#1D1D1F]">Payee Information</h2>
            </div>
          </CardHeader>
          <CardBody>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              {/* Payee Type */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-700">
                  Payee Type *
                </label>
                <select
                  disabled={isPosted}
                  value={formData.payeeType}
                  onChange={(e) => {
                    const newType = e.target.value;
                    setFormData({
                      ...formData,
                      payeeType: newType,
                      payeeId: newType === 'ONE_TIME_SUPPLIER' ? 'ONE_TIME_SUPPLIER' : '',
                    });
                  }}
                  className="w-full h-10 px-3 py-2 text-sm border border-gray-300 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
                >
                  <option value="SUPPLIER">Supplier</option>
                  <option value="CUSTOMER">Customer</option>
                  <option value="TRANSPORTER">Transporter</option>
                  <option value="EMPLOYEE">Employee / Staff</option>
                  <option value="MEDICAL">Medical / Pharma Supplier</option>
                  <option value="ONE_TIME_SUPPLIER">One-Time / Ad-Hoc Supplier</option>
                  <option value="ASSOCIATION">Transport Association</option>
                  <option value="GOVERNMENT">Government / Tax Authority</option>
                  <option value="OTHER">Other</option>
                </select>
              </div>

              {/* Select from existing directory */}
              {formData.payeeType !== 'ONE_TIME_SUPPLIER' && formData.payeeType !== 'OTHER' && (
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold uppercase tracking-wider text-gray-700">
                    Select Payee from Directory
                  </label>
                  <select
                    disabled={isPosted}
                    value={formData.payeeId}
                    onChange={handlePayeeSelect}
                    className="w-full h-10 px-3 py-2 text-sm border border-gray-300 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
                  >
                    <option value="">-- Choose {formData.payeeType.toLowerCase()} --</option>
                    {getPayeeOptions().map((opt) => (
                      <option key={opt.id} value={opt.id}>
                        {opt.name} {opt.code ? `(${opt.code})` : ''}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Payee Name Input */}
              <div className="space-y-1.5 sm:col-span-2">
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-700">
                  Payee Display Name *
                </label>
                <input
                  type="text"
                  required
                  disabled={isPosted}
                  placeholder="Enter recipient/payer full legal name..."
                  value={formData.payeeName}
                  onChange={(e) => setFormData({ ...formData, payeeName: e.target.value })}
                  className="w-full h-10 px-3 py-2 text-sm font-medium border border-gray-300 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
                />
              </div>
            </div>
          </CardBody>
        </Card>

        {/* Section 3: Source Module & Reference */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <FileText className="w-5 h-5 text-blue-600" />
              <h2 className="text-lg font-bold text-[#1D1D1F]">Source Module & Linking</h2>
            </div>
          </CardHeader>
          <CardBody>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              {/* Source Module */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-700">
                  Source Module
                </label>
                <select
                  disabled={isPosted}
                  value={formData.sourceModule}
                  onChange={(e) => setFormData({ ...formData, sourceModule: e.target.value, sourceId: '', sourceRef: '' })}
                  className="w-full h-10 px-3 py-2 text-sm border border-gray-300 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
                >
                  <option value="MANUAL">Manual / Direct (No Link)</option>
                  <option value="PURCHASE">Purchasing / PO</option>
                  <option value="CEMENT">Cement Purchase</option>
                  <option value="AGGREGATE">Aggregate Settlement</option>
                  <option value="SALES">Sales Invoice</option>
                  <option value="MEDICAL">Medical Request</option>
                  <option value="PAYROLL">Payroll / HR</option>
                  <option value="TRANSPORTER">Transporter Freight</option>
                  <option value="VAT">Tax / VAT</option>
                  <option value="OTHER">Other</option>
                </select>
              </div>

              {/* Source Document Dropdown */}
              {sourceRefs.length > 0 && (
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold uppercase tracking-wider text-gray-700">
                    Linked Source Document {loadingRefs && '(loading...)'}
                  </label>
                  <select
                    disabled={isPosted}
                    value={formData.sourceId}
                    onChange={handleSourceSelect}
                    className="w-full h-10 px-3 py-2 text-sm border border-gray-300 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
                  >
                    <option value="">-- Choose document or enter reference manually --</option>
                    {sourceRefs.map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.label}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Source Reference Text */}
              <div className="space-y-1.5 sm:col-span-2">
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-700">
                  Source Reference / Invoice No / PO No
                </label>
                <input
                  type="text"
                  disabled={isPosted}
                  placeholder="e.g. PO-2026-001, INV-9876, AGG-DISP-04"
                  value={formData.sourceRef}
                  onChange={(e) => setFormData({ ...formData, sourceRef: e.target.value })}
                  className="w-full h-10 px-3 py-2 text-sm border border-gray-300 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
                />
              </div>
            </div>
          </CardBody>
        </Card>

        {/* Section 4: Payment Details & Bank */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <CreditCard className="w-5 h-5 text-blue-600" />
              <h2 className="text-lg font-bold text-[#1D1D1F]">Payment Details & Financials</h2>
            </div>
          </CardHeader>
          <CardBody>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              {/* Payment Method */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-700">
                  Payment Method *
                </label>
                <select
                  disabled={isPosted}
                  value={formData.paymentMethod}
                  onChange={(e) => setFormData({ ...formData, paymentMethod: e.target.value })}
                  className="w-full h-10 px-3 py-2 text-sm border border-gray-300 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
                >
                  <option value="bank_transfer">Bank Transfer / TT</option>
                  <option value="cash">Cash on Hand</option>
                  <option value="check">Check / Cheque</option>
                  <option value="other">Other</option>
                </select>
              </div>

              {/* Bank Account */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-700">
                  Company Bank Account
                </label>
                <select
                  disabled={isPosted}
                  value={formData.bankAccountId}
                  onChange={(e) => {
                    const id = e.target.value;
                    const matched = bankAccounts.find((b) => b.id === id);
                    setFormData({
                      ...formData,
                      bankAccountId: id,
                      bankName: matched ? matched.bankName : '',
                    });
                  }}
                  className="w-full h-10 px-3 py-2 text-sm border border-gray-300 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
                >
                  <option value="">-- Select Bank Account --</option>
                  {bankAccounts.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.bankName} — {b.accountNo} ({b.accountName})
                    </option>
                  ))}
                </select>
              </div>

              {/* Amount */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-700">
                  Base Amount (ETB) *
                </label>
                <input
                  type="number"
                  step="any"
                  min="0.01"
                  required
                  disabled={isPosted}
                  placeholder="0.00"
                  value={formData.amount}
                  onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                  className="w-full h-10 px-3 py-2 text-base font-bold font-mono text-blue-900 border border-gray-300 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
                />
              </div>

              {/* Reference / Slip No */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-700">
                  Payment Reference / Transfer Slip No
                </label>
                <input
                  type="text"
                  disabled={isPosted}
                  placeholder="e.g. TT-98765432, FT-12345"
                  value={formData.refNo}
                  onChange={(e) => setFormData({ ...formData, refNo: e.target.value })}
                  className="w-full h-10 px-3 py-2 text-sm border border-gray-300 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
                />
              </div>

              {/* Check Number */}
              {formData.paymentMethod === 'check' && (
                <div className="space-y-1.5 sm:col-span-2">
                  <label className="block text-xs font-bold uppercase tracking-wider text-gray-700">
                    Check Number
                  </label>
                  <input
                    type="text"
                    disabled={isPosted}
                    placeholder="e.g. CHK-123456"
                    value={formData.checkNo}
                    onChange={(e) => setFormData({ ...formData, checkNo: e.target.value })}
                    className="w-full h-10 px-3 py-2 text-sm border border-gray-300 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
                  />
                </div>
              )}
            </div>

            {/* Tax Calculation Helper Options */}
            <div className="mt-6 pt-6 border-t border-gray-100">
              <h3 className="text-sm font-bold text-gray-800 mb-3 flex items-center gap-2">
                <DollarSign className="w-4 h-4 text-blue-600" />
                <span>Tax Breakdown & Withholding Adjustment</span>
              </h3>

              <div className="flex flex-wrap gap-6 items-center mb-4">
                <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                  <input
                    type="checkbox"
                    disabled={isPosted}
                    checked={applyVat}
                    onChange={(e) => setApplyVat(e.target.checked)}
                    className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500"
                  />
                  <span>Add VAT ({vatRate}%)</span>
                </label>

                <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                  <input
                    type="checkbox"
                    disabled={isPosted}
                    checked={applyWithholding}
                    onChange={(e) => setApplyWithholding(e.target.checked)}
                    className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500"
                  />
                  <span>Deduct Withholding Tax ({withholdRate}%)</span>
                </label>
              </div>

              {(applyVat || applyWithholding) && (
                <div className="bg-blue-50/50 border border-blue-100 rounded-xl p-4 space-y-2 text-sm">
                  <div className="flex justify-between text-gray-600">
                    <span>Subtotal:</span>
                    <span className="font-mono font-semibold">ETB {subtotal.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
                  </div>
                  {applyVat && (
                    <div className="flex justify-between text-blue-700">
                      <span>+ VAT ({vatRate}%):</span>
                      <span className="font-mono font-semibold">+ETB {totalVAT.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-gray-800 font-semibold border-t border-blue-100 pt-1">
                    <span>Gross Total:</span>
                    <span className="font-mono">ETB {grossTotal.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
                  </div>
                  {applyWithholding && (
                    <div className="flex justify-between text-red-600">
                      <span>- Withholding Tax ({withholdRate}%):</span>
                      <span className="font-mono font-semibold">-ETB {withholdAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-base font-bold text-blue-900 border-t border-blue-200 pt-2">
                    <span>Final Net Payable Amount:</span>
                    <span className="font-mono text-lg">ETB {netPayable.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
                  </div>
                </div>
              )}
            </div>
          </CardBody>
        </Card>

        {/* Section 5: Description & Notes */}
        <Card>
          <CardHeader>
            <h2 className="text-lg font-bold text-[#1D1D1F]">Description & Remarks</h2>
          </CardHeader>
          <CardBody>
            <div className="space-y-1.5">
              <label className="block text-xs font-bold uppercase tracking-wider text-gray-700">
                Purpose / Description
              </label>
              <textarea
                rows={4}
                disabled={isPosted}
                placeholder="Enter detailed explanation of voucher payment, invoice breakdown, or notes..."
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="w-full p-3 text-sm border border-gray-300 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
              />
            </div>
          </CardBody>
        </Card>

        {/* Bottom Actions */}
        <div className="flex items-center justify-end gap-3 pt-4">
          <Button
            type="button"
            variant="secondary"
            onClick={() => router.push(`/dashboard/finance/vouchers/${voucherId}`)}
          >
            Cancel
          </Button>
          {!isPosted && (
            <Button
              type="submit"
              variant="primary"
              isLoading={submitting}
              icon={<Save className="w-4 h-4 mr-1.5" />}
            >
              Save Changes
            </Button>
          )}
        </div>
      </form>
    </div>
  );
}
