'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardBody, CardHeader, Button, Input, Select } from '@/components/ui';

interface EntityOption {
  id: string;
  name: string;
  code?: string;
}

interface SourceRefOption {
  id: string;
  label: string;
  ref: string;
  amount?: number;
  dispatchNo?: string;
  padNumber?: string;
  supplierPayable?: number;
  customerReceivable?: number;
}

interface BankAccountOption {
  id: string;
  bankName: string;
  accountNo: string;
  accountName: string;
}

interface FormData {
  voucherType: string;
  sourceModule: string;
  sourceId: string;
  sourceReference: string;
  payeeType: string;
  payeeId: string;
  payeeName: string;
  amount: string;
  paymentMethod: string;
  bankAccountId: string;
  bankName: string;
  checkNo: string;
  referenceNo: string;
  description: string;
}

export default function NewVoucherPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Entity lists
  const [customers, setCustomers] = useState<EntityOption[]>([]);
  const [suppliers, setSuppliers] = useState<EntityOption[]>([]);
  const [employees, setEmployees] = useState<EntityOption[]>([]);
  const [transporters, setTransporters] = useState<EntityOption[]>([]);
  const [bankAccounts, setBankAccounts] = useState<BankAccountOption[]>([]);
  const [sourceRefs, setSourceRefs] = useState<SourceRefOption[]>([]);
  const [loadingEntities, setLoadingEntities] = useState(false);
  const [loadingRefs, setLoadingRefs] = useState(false);
  // Multi-select for AGGREGATE deliveries
  const [selectedDeliveryIds, setSelectedDeliveryIds] = useState<Set<string>>(new Set());

  const [formData, setFormData] = useState<FormData>({
    voucherType: 'PAYMENT',
    sourceModule: '',
    sourceId: '',
    sourceReference: '',
    payeeType: '',
    payeeId: '',
    payeeName: '',
    amount: '',
    paymentMethod: 'cash',
    bankAccountId: '',
    bankName: '',
    checkNo: '',
    referenceNo: '',
    description: '',
  });

  // Fetch all entity lists on mount
  useEffect(() => {
    const fetchAll = async () => {
      try {
        const [custRes, suppRes, empRes, transRes, bankRes] = await Promise.all([
          fetch('/api/sales/agreements/customers').then(r => r.json()),
          fetch('/api/suppliers?limit=1000').then(r => r.json()),
          fetch('/api/employees?limit=1000').then(r => r.json()),
          fetch('/api/transporters?limit=1000').then(r => r.json()),
          fetch('/api/finance/bank?limit=100').then(r => r.json()),
        ]);

        if (custRes.success) {
          setCustomers((custRes.data || []).map((c: any) => ({
            id: c.customerId,
            name: `${c.companyName} — ${c.agreementNo}`,
            code: c.agreementNo,
          })));
        }
        if (suppRes.success) {
          setSuppliers((suppRes.data || []).map((s: any) => ({
            id: s.id,
            name: s.companyName || s.name || '',
            code: s.code,
          })));
        }
        if (empRes.success) {
          setEmployees((empRes.data || []).map((e: any) => ({
            id: e.id,
            name: e.fullName || e.name || `${e.firstName || ''} ${e.lastName || ''}`.trim(),
            code: e.employeeId || e.code,
          })));
        }
        if (transRes.success) {
          setTransporters((transRes.data || []).map((t: any) => ({
            id: t.id,
            name: t.companyName || t.name || '',
            code: t.code,
          })));
        }
        if (bankRes.success) {
          setBankAccounts(bankRes.data || []);
        }
      } catch (err) {
        console.error('Error loading entities:', err);
      }
    };
    fetchAll();
  }, []);

  // Get entity list based on payee type
  const getPayeeOptions = (): EntityOption[] => {
    switch (formData.payeeType) {
      case 'CUSTOMER': return customers;
      case 'SUPPLIER': return suppliers;
      case 'EMPLOYEE': return employees;
      case 'TRANSPORTER': return transporters;
      default: return [];
    }
  };

  // Fetch source references when source module or payee changes
  useEffect(() => {
    if (!formData.sourceModule) {
      setSourceRefs([]);
      return;
    }

    const fetchRefs = async () => {
      setLoadingRefs(true);
      try {
        let refs: SourceRefOption[] = [];

        switch (formData.sourceModule) {
          case 'PURCHASE': {
            const res = await fetch('/api/purchasing/orders?limit=100');
            const data = await res.json();
            if (data.success) {
              // Only show Approved or Active purchase orders — not Draft or Pending
              const approvedOnly = (data.data || []).filter((po: any) =>
                po.status === 'Approved' || po.status === 'Active' || po.status === 'Received'
              );
              refs = approvedOnly.map((po: any) => ({
                id: po.id,
                label: `${po.poNo} — ${po.supplier?.companyName || 'Unknown'} (${po.status})`,
                ref: po.poNo,
                amount: po.totalAmount,
              }));
            }
            break;
          }
          case 'AGGREGATE': {
            const aggParams = new URLSearchParams({ limit: '500' });
            if (formData.payeeType === 'CUSTOMER' && formData.payeeId) {
              aggParams.set('customerId', formData.payeeId);
            } else if (formData.payeeType === 'SUPPLIER' && formData.payeeId) {
              aggParams.set('supplierId', formData.payeeId);
            } else if (formData.payeeType === 'TRANSPORTER' && formData.payeeId) {
              aggParams.set('transporterId', formData.payeeId);
            }

            const res = await fetch(`/api/aggregate?${aggParams.toString()}`);
            const data = await res.json();
            if (data.success) {
              refs = (data.data || []).map((d: any) => {
                let amount = 0;
                let typeStr = 'Payable';

                if (formData.payeeType === 'CUSTOMER') {
                  amount = Number(d.customerReceivable || 0);
                  typeStr = 'Customer Receivable';
                } else if (formData.payeeType === 'TRANSPORTER') {
                  amount = Number(d.transporterPayable || d.netTruckPayment || d.grossTruckFee || 0);
                  typeStr = 'Transporter Freight';
                } else if (formData.payeeType === 'SUPPLIER') {
                  amount = Number(d.supplierPayable || 0);
                  typeStr = 'Supplier Material';
                } else {
                  amount = Number(d.supplierPayable || d.netTruckPayment || 0);
                  typeStr = 'Payable';
                }

                const podStr = d.padNumber ? `POD: ${d.padNumber}` : 'POD: N/A';
                const partyStr = d.customer?.companyName || d.supplier?.companyName || d.transporter?.companyName || '';

                return {
                  id: d.id,
                  dispatchNo: d.dispatchNo,
                  padNumber: d.padNumber || 'N/A',
                  label: `${d.dispatchNo} — ${podStr}${partyStr ? ` — ${partyStr}` : ''} — ETB ${amount.toLocaleString('en-US', { minimumFractionDigits: 2 })} (${typeStr})`,
                  ref: d.dispatchNo,
                  amount: Math.round(amount * 100) / 100,
                  supplierPayable: Number(d.supplierPayable || 0),
                  transporterPayable: Number(d.transporterPayable || d.netTruckPayment || 0),
                  customerReceivable: Number(d.customerReceivable || 0),
                };
              });
            }
            break;
          }
          case 'CEMENT': {
            const res = await fetch('/api/cement/purchases?limit=100&paymentStatus=Unpaid,Partial');
            const data = await res.json();
            if (data.success) {
              // Only show Active or Approved cement purchases that are unpaid/partially paid
              const approvedOnly = (data.data || []).filter((p: any) =>
                p.status === 'Active' || p.status === 'Approved' || p.status === 'Checked'
              );
              refs = approvedOnly.map((p: any) => ({
                id: p.id,
                label: `${p.purchaseNo} — ${p.factory?.name || 'Unknown'} (${p.status}) — ${p.paymentStatus || 'Unpaid'}`,
                ref: p.purchaseNo,
                amount: p.totalAmount,
              }));
            }
            break;
          }
          case 'PAYROLL': {
            const res = await fetch('/api/hr/payroll?limit=50');
            const data = await res.json();
            if (data.success) {
              // Only show Approved payroll
              const approvedOnly = (data.data || []).filter((pr: any) =>
                pr.status === 'Approved' || pr.status === 'Active' || pr.status === 'Finalized'
              );
              refs = approvedOnly.map((pr: any) => ({
                id: pr.id,
                label: `${pr.payrollNo || pr.period || 'Payroll'} — ${pr.status || 'Active'}`,
                ref: pr.payrollNo || pr.period,
                amount: pr.totalNet || pr.totalAmount,
              }));
            }
            break;
          }
          case 'MEDICAL': {
            const res = await fetch('/api/medical/purchase-requests?limit=100');
            const data = await res.json();
            if (data.success) {
              // Only show Approved medical requests
              const approvedOnly = (data.data || []).filter((r: any) =>
                r.status === 'Approved' || r.status === 'Active'
              );
              refs = approvedOnly.map((r: any) => ({
                id: r.id,
                label: `${r.requestNo || r.id} — ${r.customer?.companyName || 'Unknown'}`,
                ref: r.requestNo || r.id,
                amount: r.totalAmount,
              }));
            }
            break;
          }
          case 'SALES': {
            // Fetch unpaid/partial customer invoices using server-side filters
            const invoiceParams = new URLSearchParams({ limit: '200', status: 'Unpaid,Partial' });
            if (formData.payeeId) {
              invoiceParams.set('customerId', formData.payeeId);
            }
            const invRes = await fetch(`/api/sales/invoices?${invoiceParams.toString()}`);
            const invData = await invRes.json();
            if (invData.success) {
              refs = (invData.data || []).map((inv: any) => ({
                id: inv.id,
                label: `${inv.invoiceNo} — ${inv.customer?.companyName || 'Unknown'} — ${inv.status} — Due: ${inv.dueDate ? new Date(inv.dueDate).toLocaleDateString() : 'N/A'}`,
                ref: inv.invoiceNo,
                amount: Number(inv.totalAmount),
              }));
            }
            break;
          }
          case 'TRANSPORTER': {
            const res = await fetch('/api/aggregate?limit=100');
            const data = await res.json();
            if (data.success) {
              // Only show Delivered/Completed dispatches for transporter payment
              const approvedOnly = (data.data || []).filter((d: any) =>
                d.status === 'Approved' || d.status === 'Delivered' || d.status === 'Completed' || d.status === 'Active'
              );
              refs = approvedOnly.map((d: any) => ({
                id: d.id,
                label: `${d.dispatchNo} — Truck: ${d.driverName || 'N/A'} (${d.status || 'Active'})`,
                ref: d.dispatchNo,
                amount: d.netTruckPayment,
              }));
            }
            break;
          }
          default: {
            // ASSOCIATION, VAT — no specific refs
            break;
          }
        }

        setSourceRefs(refs);
      } catch (err) {
        console.error('Error loading source refs:', err);
        setSourceRefs([]);
      } finally {
        setLoadingRefs(false);
      }
    };

    fetchRefs();
  }, [formData.sourceModule, formData.payeeId]);

  // When payee type changes, reset payee selection
  useEffect(() => {
    setFormData((prev) => ({
      ...prev,
      payeeId: '',
      payeeName: '',
    }));
  }, [formData.payeeType]);

  // When source module changes, reset source selection
  useEffect(() => {
    setFormData((prev) => ({
      ...prev,
      sourceId: '',
      sourceReference: '',
    }));
    setSelectedDeliveryIds(new Set());
  }, [formData.sourceModule]);

  // Auto-set source module based on payee type
  useEffect(() => {
    if (!formData.payeeType) return;
    const moduleMap: Record<string, string> = {
      'SUPPLIER': 'PURCHASE',
      'CUSTOMER': 'SALES',
      'TRANSPORTER': 'TRANSPORTER',
      'EMPLOYEE': 'PAYROLL',
      'ASSOCIATION': 'ASSOCIATION',
      'GOVERNMENT': 'VAT',
    };
    const suggested = moduleMap[formData.payeeType];
    if (suggested) {
      setFormData((prev) => ({
        ...prev,
        sourceModule: suggested,
        // Auto-set RECEIPT when customer is selected (collecting money from them)
        ...(formData.payeeType === 'CUSTOMER' ? { voucherType: 'RECEIPT' } : {}),
      }));
    }
  }, [formData.payeeType]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handlePayeeSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selectedId = e.target.value;
    const options = getPayeeOptions();
    const selected = options.find((o) => o.id === selectedId);

    setFormData((prev) => ({
      ...prev,
      payeeId: selectedId,
      payeeName: selected ? `${selected.name}${selected.code ? ` (${selected.code})` : ''}` : '',
    }));
  };

  const handleSourceSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selectedId = e.target.value;
    const selected = sourceRefs.find((r) => r.id === selectedId);

    setFormData((prev) => ({
      ...prev,
      sourceId: selectedId,
      sourceReference: selected?.ref || '',
      // Auto-fill amount from source if available and no amount yet
      amount: selected?.amount && !prev.amount ? String(selected.amount) : prev.amount,
    }));
  };

  // Toggle aggregate delivery selection (multi-select)
  const handleDeliveryToggle = (deliveryId: string) => {
    setSelectedDeliveryIds((prev) => {
      const next = new Set(prev);
      if (next.has(deliveryId)) {
        next.delete(deliveryId);
      } else {
        next.add(deliveryId);
      }
      // Update form: comma-separated IDs, refs, and sum of amounts
      const selectedRefs = sourceRefs.filter((r) => next.has(r.id));
      const totalAmount = selectedRefs.reduce((sum, r) => sum + (r.amount || 0), 0);
      setFormData((prev) => ({
        ...prev,
        sourceId: Array.from(next).join(','),
        sourceReference: selectedRefs.map((r) => r.ref).join(', '),
        amount: totalAmount > 0 ? String(Math.round(totalAmount * 100) / 100) : prev.amount,
      }));
      return next;
    });
  };

  const handleSelectAllDeliveries = () => {
    if (selectedDeliveryIds.size === sourceRefs.length) {
      // Deselect all
      setSelectedDeliveryIds(new Set());
      setFormData((prev) => ({ ...prev, sourceId: '', sourceReference: '', amount: '' }));
    } else {
      // Select all
      const allIds = new Set(sourceRefs.map((r) => r.id));
      const totalAmount = sourceRefs.reduce((sum, r) => sum + (r.amount || 0), 0);
      setSelectedDeliveryIds(allIds);
      setFormData((prev) => ({
        ...prev,
        sourceId: Array.from(allIds).join(','),
        sourceReference: sourceRefs.map((r) => r.ref).join(', '),
        amount: String(Math.round(totalAmount * 100) / 100),
      }));
    }
  };

  const handleBankSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selectedId = e.target.value;
    const selected = bankAccounts.find((b) => b.id === selectedId);

    setFormData((prev) => ({
      ...prev,
      bankAccountId: selectedId,
      bankName: selected ? `${selected.bankName} — ${selected.accountNo}` : '',
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      if (!formData.payeeType) {
        throw new Error('Please select a payee type');
      }
      if (!formData.payeeName) {
        throw new Error('Please select a payee');
      }
      if (!formData.amount || parseFloat(formData.amount) <= 0) {
        throw new Error('Please enter a valid amount');
      }
      if (formData.paymentMethod === 'bank_transfer' && !formData.bankAccountId) {
        throw new Error('Please select a bank account for bank transfers');
      }
      if (formData.paymentMethod === 'check' && !formData.checkNo) {
        throw new Error('Check number is required for check payments');
      }

      const payload = {
        voucherType: formData.voucherType,
        sourceModule: formData.sourceModule,
        sourceId: formData.sourceId || null,
        sourceRef: formData.sourceReference || null,
        payeeType: formData.payeeType,
        payeeId: formData.payeeId || null,
        payeeName: formData.payeeName,
        amount: parseFloat(formData.amount),
        paymentMethod: formData.paymentMethod,
        bankAccountId: formData.bankAccountId || null,
        bankName: formData.bankName || null,
        checkNo: formData.checkNo || null,
        refNo: formData.referenceNo || null,
        description: formData.description || null,
      };

      const response = await fetch('/api/finance/vouchers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Failed to create voucher');
      }

      router.push(`/dashboard/finance/vouchers/${result.data.id}`);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const payeeOptions = getPayeeOptions();

  return (
    <div className="space-y-4 sm:space-y-6 max-w-4xl">
      <div className="flex items-center justify-between">
        <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-[#1D1D1F]">Create New Payment Voucher</h1>
        <Button
          variant="secondary"
          onClick={() => router.push('/dashboard/finance/vouchers')}
        >
          Cancel
        </Button>
      </div>

      {error && (
        <div className="bg-[#FF3B30]/10 border border-[#FF3B30] rounded-2xl p-4 text-[#D70015]">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Voucher Type & Payee Type */}
        <Card>
          <CardHeader>
            <h2 className="text-lg font-semibold text-[#1D1D1F]">Voucher Information</h2>
          </CardHeader>
          <CardBody className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Select
                label="Voucher Type"
                name="voucherType"
                value={formData.voucherType}
                onChange={handleChange}
                options={[
                  { value: 'PAYMENT', label: 'Payment Voucher' },
                  { value: 'RECEIPT', label: 'Receipt Voucher' },
                  { value: 'REFUND', label: 'Refund Voucher' },
                ]}
                required
              />

              <Select
                label="Payee Type"
                name="payeeType"
                value={formData.payeeType}
                onChange={handleChange}
                options={[
                  { value: '', label: '-- Select Payee Type --' },
                  { value: 'CUSTOMER', label: 'Customer' },
                  { value: 'SUPPLIER', label: 'Supplier' },
                  { value: 'TRANSPORTER', label: 'Transporter' },
                  { value: 'EMPLOYEE', label: 'Employee' },
                  { value: 'ASSOCIATION', label: 'Association' },
                  { value: 'GOVERNMENT', label: 'Government / Tax' },
                ]}
                required
              />
            </div>
          </CardBody>
        </Card>

        {/* Payee Selection */}
        {formData.payeeType && (
          <Card>
            <CardHeader>
              <h2 className="text-lg font-semibold text-[#1D1D1F]">
                Select {formData.payeeType === 'CUSTOMER' ? 'Customer' :
                  formData.payeeType === 'SUPPLIER' ? 'Supplier' :
                  formData.payeeType === 'TRANSPORTER' ? 'Transporter' :
                  formData.payeeType === 'EMPLOYEE' ? 'Employee' :
                  'Payee'}
              </h2>
            </CardHeader>
            <CardBody className="space-y-4">
              {payeeOptions.length > 0 ? (
                <div>
                  <label className="block text-[13px] font-medium text-[#86868B] uppercase tracking-wider mb-1.5">
                    {formData.payeeType === 'CUSTOMER' ? 'Customer' :
                     formData.payeeType === 'SUPPLIER' ? 'Supplier' :
                     formData.payeeType === 'TRANSPORTER' ? 'Transporter' :
                     formData.payeeType === 'EMPLOYEE' ? 'Employee' : 'Payee'} *
                  </label>
                  <select
                    value={formData.payeeId}
                    onChange={handlePayeeSelect}
                    className="w-full px-4 py-3 bg-white/80 border border-[#D2D2D7] rounded-xl focus:outline-none focus:ring-4 focus:ring-[rgba(0,122,255,0.25)] focus:border-[#007AFF] transition-all duration-200 text-[#1D1D1F]"
                    required
                  >
                    <option value="">-- Select --</option>
                    {payeeOptions.map((opt) => (
                      <option key={opt.id} value={opt.id}>
                        {opt.name}{opt.code ? ` (${opt.code})` : ''}
                      </option>
                    ))}
                  </select>
                </div>
              ) : (
                <div>
                  <Input
                    label="Payee Name"
                    name="payeeName"
                    type="text"
                    placeholder="Enter payee name"
                    value={formData.payeeName}
                    onChange={handleChange}
                    required
                  />
                  <p className="text-xs text-amber-600 mt-1">
                    {formData.payeeType === 'CUSTOMER'
                      ? 'No customers with active sales agreements found. Enter the name manually.'
                      : `No ${formData.payeeType.toLowerCase()}s found in the system. Enter the name manually.`}
                  </p>
                </div>
              )}

              {formData.payeeName && (
                <div className="bg-green-50 border border-green-200 rounded-xl px-4 py-3">
                  <span className="text-sm text-green-800">
                    Selected: <strong>{formData.payeeName}</strong>
                  </span>
                </div>
              )}
            </CardBody>
          </Card>
        )}

        {/* Source Module & Reference */}
        {formData.payeeType && (
          <Card>
            <CardHeader>
              <h2 className="text-lg font-semibold text-[#1D1D1F]">Source Reference</h2>
              <p className="text-sm text-[#86868B] mt-1">Link this voucher to its source document</p>
            </CardHeader>
            <CardBody className="space-y-4">
              <Select
                label="Source Module"
                name="sourceModule"
                value={formData.sourceModule}
                onChange={handleChange}
                options={[
                  { value: '', label: '-- Select Module --' },
                  { value: 'SALES', label: 'Sales Invoices (Customer)' },
                  { value: 'PURCHASE', label: 'Purchase Orders' },
                  { value: 'AGGREGATE', label: 'Aggregate Dispatches' },
                  { value: 'CEMENT', label: 'Cement Purchases' },
                  { value: 'PAYROLL', label: 'Payroll' },
                  { value: 'MEDICAL', label: 'Medical' },
                  { value: 'TRANSPORTER', label: 'Transporter Settlements' },
                  { value: 'ASSOCIATION', label: 'Association' },
                  { value: 'VAT', label: 'VAT / Tax' },
                ]}
              />

              {formData.sourceModule && sourceRefs.length > 0 && formData.sourceModule === 'AGGREGATE' && (
                <div>
                  <label className="block text-[13px] font-medium text-[#86868B] uppercase tracking-wider mb-1.5">
                    Select Deliveries to Settle ({selectedDeliveryIds.size} selected)
                  </label>
                  <div className="border border-[#D2D2D7] rounded-xl overflow-hidden bg-white/80">
                    <div className="px-4 py-2 bg-gray-50 border-b border-[#D2D2D7] flex items-center justify-between">
                      <label className="flex items-center gap-2 cursor-pointer text-sm">
                        <input
                          type="checkbox"
                          checked={selectedDeliveryIds.size === sourceRefs.length && sourceRefs.length > 0}
                          onChange={handleSelectAllDeliveries}
                          className="w-4 h-4 rounded"
                        />
                        <span className="font-medium">Select All</span>
                      </label>
                      {selectedDeliveryIds.size > 0 && (
                        <span className="text-sm text-blue-600 font-medium">
                          Total: ETB {sourceRefs.filter((r) => selectedDeliveryIds.has(r.id)).reduce((s, r) => s + (r.amount || 0), 0).toLocaleString('en-US', { maximumFractionDigits: 2 })}
                        </span>
                      )}
                    </div>
                    <div className="max-h-60 overflow-y-auto">
                      {sourceRefs.map((ref) => (
                        <label key={ref.id} className="flex items-center gap-3 px-4 py-3 hover:bg-blue-50 cursor-pointer border-b border-gray-100 last:border-0">
                          <input
                            type="checkbox"
                            checked={selectedDeliveryIds.has(ref.id)}
                            onChange={() => handleDeliveryToggle(ref.id)}
                            className="w-4 h-4 rounded"
                          />
                          <div className="flex-1 text-sm">
                            <div className="flex items-center gap-2">
                              <span className="font-semibold text-slate-900">
                                Dispatch: {ref.dispatchNo || ref.ref}
                              </span>
                              <span className="px-2 py-0.5 bg-blue-50 text-blue-700 text-xs font-semibold rounded-md border border-blue-200">
                                POD: {ref.padNumber || 'N/A'}
                              </span>
                            </div>
                            <p className="text-xs text-slate-500 mt-0.5">{ref.label}</p>
                          </div>
                          <div className="text-right">
                            <span className="text-sm font-bold text-slate-900">
                              ETB {(ref.amount || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </span>
                            <p className="text-[11px] font-medium text-slate-500">
                              {formData.payeeType === 'CUSTOMER' ? 'Customer Receivable' :
                               formData.payeeType === 'TRANSPORTER' ? 'Transporter Freight' :
                               formData.payeeType === 'SUPPLIER' ? 'Supplier Material' : 'Payable'}
                            </p>
                          </div>
                        </label>
                      ))}
                    </div>
                  </div>
                  {loadingRefs && <p className="text-xs text-slate-500 mt-1">Loading references...</p>}
                </div>
              )}

              {formData.sourceModule && sourceRefs.length > 0 && formData.sourceModule !== 'AGGREGATE' && (
                <div>
                  <label className="block text-[13px] font-medium text-[#86868B] uppercase tracking-wider mb-1.5">
                    Source Document
                  </label>
                  <select
                    value={formData.sourceId}
                    onChange={handleSourceSelect}
                    className="w-full px-4 py-3 bg-white/80 border border-[#D2D2D7] rounded-xl focus:outline-none focus:ring-4 focus:ring-[rgba(0,122,255,0.25)] focus:border-[#007AFF] transition-all duration-200 text-[#1D1D1F]"
                  >
                    <option value="">-- Select Source Document --</option>
                    {sourceRefs.map((ref) => (
                      <option key={ref.id} value={ref.id}>
                        {ref.label}{ref.amount ? ` — ETB ${ref.amount.toLocaleString('en-US')}` : ''}
                      </option>
                    ))}
                  </select>
                  {loadingRefs && <p className="text-xs text-slate-500 mt-1">Loading references...</p>}
                </div>
              )}

              {formData.sourceModule && sourceRefs.length === 0 && !loadingRefs && (
                <div>
                  <Input
                    label="Source Reference (Manual)"
                    name="sourceReference"
                    type="text"
                    placeholder="e.g., PO-0000001"
                    value={formData.sourceReference}
                    onChange={handleChange}
                  />
                  <p className="text-xs text-slate-500 mt-1">No records found. Enter reference manually if needed.</p>
                </div>
              )}

              {formData.sourceReference && (
                <div className="bg-blue-50 border border-blue-200 rounded-xl px-4 py-3">
                  <span className="text-sm text-blue-800">
                    Source Ref: <strong>{formData.sourceReference}</strong>
                  </span>
                </div>
              )}
            </CardBody>
          </Card>
        )}

        {/* Payment Details */}
        {formData.payeeType && (
          <Card>
            <CardHeader>
              <h2 className="text-lg font-semibold text-[#1D1D1F]">Payment Details</h2>
            </CardHeader>
            <CardBody className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input
                  label="Amount (ETB)"
                  name="amount"
                  type="number"
                  placeholder="0.00"
                  step="0.01"
                  value={formData.amount}
                  onChange={handleChange}
                  required
                />

                <Select
                  label="Payment Method"
                  name="paymentMethod"
                  value={formData.paymentMethod}
                  onChange={handleChange}
                  options={[
                    { value: 'cash', label: 'Cash' },
                    { value: 'bank_transfer', label: 'Bank Transfer' },
                    { value: 'check', label: 'Check' },
                  ]}
                  required
                />
              </div>

              {formData.paymentMethod === 'bank_transfer' && (
                <div>
                  <label className="block text-[13px] font-medium text-[#86868B] uppercase tracking-wider mb-1.5">
                    Bank Account *
                  </label>
                  {bankAccounts.length > 0 ? (
                    <select
                      value={formData.bankAccountId}
                      onChange={handleBankSelect}
                      className="w-full px-4 py-3 bg-white/80 border border-[#D2D2D7] rounded-xl focus:outline-none focus:ring-4 focus:ring-[rgba(0,122,255,0.25)] focus:border-[#007AFF] transition-all duration-200 text-[#1D1D1F]"
                      required
                    >
                      <option value="">-- Select Bank Account --</option>
                      {bankAccounts.map((bank) => (
                        <option key={bank.id} value={bank.id}>
                          {bank.bankName} — {bank.accountNo} ({bank.accountName})
                        </option>
                      ))}
                    </select>
                  ) : (
                    <Input
                      label="Bank Name"
                      name="bankName"
                      type="text"
                      placeholder="Enter bank name"
                      value={formData.bankName}
                      onChange={handleChange}
                      required
                    />
                  )}
                </div>
              )}

              {formData.paymentMethod === 'check' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Input
                    label="Check Number"
                    name="checkNo"
                    type="text"
                    placeholder="Enter check number"
                    value={formData.checkNo}
                    onChange={handleChange}
                    required
                  />
                  <div>
                    <label className="block text-[13px] font-medium text-[#86868B] uppercase tracking-wider mb-1.5">
                      Bank Account
                    </label>
                    {bankAccounts.length > 0 ? (
                      <select
                        value={formData.bankAccountId}
                        onChange={handleBankSelect}
                        className="w-full px-4 py-3 bg-white/80 border border-[#D2D2D7] rounded-xl focus:outline-none focus:ring-4 focus:ring-[rgba(0,122,255,0.25)] focus:border-[#007AFF] transition-all duration-200 text-[#1D1D1F]"
                      >
                        <option value="">-- Select Bank Account --</option>
                        {bankAccounts.map((bank) => (
                          <option key={bank.id} value={bank.id}>
                            {bank.bankName} — {bank.accountNo} ({bank.accountName})
                          </option>
                        ))}
                      </select>
                    ) : (
                      <Input
                        label=""
                        name="bankName"
                        type="text"
                        placeholder="Enter bank name"
                        value={formData.bankName}
                        onChange={handleChange}
                      />
                    )}
                  </div>
                </div>
              )}

              <Input
                label="Reference Number (Optional)"
                name="referenceNo"
                type="text"
                placeholder="e.g., transaction reference"
                value={formData.referenceNo}
                onChange={handleChange}
              />
            </CardBody>
          </Card>
        )}

        {/* Description */}
        {formData.payeeType && (
          <Card>
            <CardHeader>
              <h2 className="text-lg font-semibold text-[#1D1D1F]">Additional Information</h2>
            </CardHeader>
            <CardBody className="space-y-4">
              <div>
                <label className="block text-[13px] font-medium text-[#86868B] uppercase tracking-wider mb-1.5">
                  Description
                </label>
                <textarea
                  name="description"
                  placeholder="Enter any additional notes or description"
                  className="w-full px-4 py-3 bg-white/80 border border-[#D2D2D7] rounded-xl focus:outline-none focus:ring-4 focus:ring-[rgba(0,122,255,0.25)] focus:border-[#007AFF] transition-all duration-200 text-[#1D1D1F] placeholder:text-[#86868B] min-h-24 resize-vertical"
                  value={formData.description}
                  onChange={handleChange}
                />
              </div>
            </CardBody>
          </Card>
        )}

        {/* Summary */}
        {formData.payeeName && formData.amount && (
          <Card>
            <CardHeader>
              <h2 className="text-lg font-semibold text-[#1D1D1F]">Voucher Summary</h2>
            </CardHeader>
            <CardBody>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-slate-50 rounded-xl p-3">
                  <p className="text-xs text-slate-500 uppercase">Type</p>
                  <p className="text-sm font-semibold text-slate-900 mt-1">{formData.voucherType}</p>
                </div>
                <div className="bg-slate-50 rounded-xl p-3">
                  <p className="text-xs text-slate-500 uppercase">Payee</p>
                  <p className="text-sm font-semibold text-slate-900 mt-1 truncate">{formData.payeeName}</p>
                </div>
                <div className="bg-blue-50 rounded-xl p-3">
                  <p className="text-xs text-blue-600 uppercase">Amount</p>
                  <p className="text-lg font-bold text-blue-900 mt-1">
                    ETB {parseFloat(formData.amount || '0').toLocaleString('en-US', { minimumFractionDigits: 2 })}
                  </p>
                </div>
                <div className="bg-slate-50 rounded-xl p-3">
                  <p className="text-xs text-slate-500 uppercase">Method</p>
                  <p className="text-sm font-semibold text-slate-900 mt-1 capitalize">{formData.paymentMethod.replace('_', ' ')}</p>
                </div>
              </div>
            </CardBody>
          </Card>
        )}

        {/* Action Buttons — always visible */}
        <Card>
          <CardBody>
            <div className="flex gap-3 justify-end">
              <Button
                variant="secondary"
                size="lg"
                onClick={() => router.push('/dashboard/finance/vouchers')}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                size="lg"
                type="submit"
                disabled={loading}
                isLoading={loading}
              >
                Create Voucher
              </Button>
            </div>
          </CardBody>
        </Card>
      </form>
    </div>
  );
}
