'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Card, CardHeader, CardBody, CardFooter, Button } from '@/components/ui';

interface Supplier {
  id: string;
  companyName: string;
}

interface PurchaseOrder {
  id: string;
  poNo: string;
  totalAmount: number;
}

export default function NewSupplierPaymentPage() {
  const router = useRouter();
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    supplierId: '',
    purchaseOrderId: '',
    amount: '',
    deductVat: false,
    deductWithholding: false,
    paymentDate: new Date().toISOString().split('T')[0],
    paymentMethod: 'bank_transfer',
    bankName: '',
    refNo: '',
    description: '',
    otherExpenses: false,
  });

  const ethiopianBanks = [
    'CBE',
    'Awash',
    'Dashen',
    'Abyssinia',
    'Wegagen',
    'Oromia',
    'United',
    'Zemen',
    'Nib',
    'Cooperative',
    'Hibret',
    'Berhan',
    'Bunna',
    'Enat',
  ];

  useEffect(() => {
    fetchSuppliers();
  }, []);

  useEffect(() => {
    if (formData.supplierId && !formData.otherExpenses) {
      fetchPurchaseOrders(formData.supplierId);
    }
  }, [formData.supplierId, formData.otherExpenses]);

  const fetchSuppliers = async () => {
    try {
      const response = await fetch('/api/suppliers?limit=100');
      const data = await response.json();
      if (data.success) {
        setSuppliers(data.data);
      }
    } catch (error) {
      console.error('Error fetching suppliers:', error);
    }
  };

  const fetchPurchaseOrders = async (supplierId: string) => {
    try {
      const response = await fetch(`/api/purchasing/orders?supplierId=${supplierId}&limit=100`);
      const data = await response.json();
      if (data.success) {
        setPurchaseOrders(data.data);
      }
    } catch (error) {
      console.error('Error fetching purchase orders:', error);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    const checked = (e.target as HTMLInputElement).checked;

    if (name === 'purchaseOrderId') {
      const selectedPO = purchaseOrders.find((p) => p.id === value);
      setFormData((prev) => ({
        ...prev,
        purchaseOrderId: value,
        amount: selectedPO ? selectedPO.totalAmount.toString() : prev.amount,
      }));
      return;
    }

    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  // Calculation logic
  const grossAmount = parseFloat(formData.amount) || 0;
  const vatRate = 0.15; // 15% VAT
  const withholdingRate = 0.03; // 3% Withholding

  const vatDeduction = formData.deductVat ? grossAmount * vatRate : 0;
  const withholdingDeduction = formData.deductWithholding ? grossAmount * withholdingRate : 0;
  const totalDeductions = vatDeduction + withholdingDeduction;
  const netPayable = Math.max(0, grossAmount - totalDeductions);

  const formatETB = (val: number) => {
    return val.toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.supplierId || !formData.amount || !formData.paymentMethod) {
      alert('Please fill in all required fields');
      return;
    }

    if ((formData.paymentMethod === 'bank_transfer' || formData.paymentMethod === 'check') && !formData.bankName) {
      alert('Bank Name is required for bank transfers and checks');
      return;
    }

    setSubmitting(true);
    try {
      // Build description including deduction details if applied
      let finalDescription = formData.description || '';
      if (formData.deductVat || formData.deductWithholding) {
        const deductionNotes = [
          `Gross Amount: ${formatETB(grossAmount)} ETB`,
          formData.deductVat ? `VAT (15%): -${formatETB(vatDeduction)} ETB` : null,
          formData.deductWithholding ? `Withholding (3%): -${formatETB(withholdingDeduction)} ETB` : null,
          `Net Payment: ${formatETB(netPayable)} ETB`,
        ]
          .filter(Boolean)
          .join(' | ');

        finalDescription = finalDescription
          ? `${finalDescription}\n[${deductionNotes}]`
          : `[${deductionNotes}]`;
      }

      const res = await fetch('/api/purchasing/payments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          supplierId: formData.supplierId,
          purchaseOrderId: formData.purchaseOrderId || null,
          amount: netPayable,
          paymentDate: formData.paymentDate,
          paymentMethod: formData.paymentMethod,
          bankName: formData.bankName || null,
          refNo: formData.refNo || null,
          description: finalDescription || null,
        }),
      });

      const data = await res.json();
      if (data.success) {
        alert('Payment recorded successfully!');
        router.push('/dashboard/purchasing/payments');
      } else {
        alert(data.error || 'Failed to record payment');
      }
    } catch (error) {
      console.error('Error:', error);
      alert('Failed to record payment');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-slate-600">
        <Link href="/dashboard/purchasing/payments" className="text-blue-600 hover:text-blue-800">
          Supplier Payments
        </Link>
        <span>/</span>
        <span className="text-slate-900 font-medium">New Payment</span>
      </div>

      {/* Page Header */}
      <div>
        <h1 className="text-3xl font-bold text-slate-900">Record Supplier Payment</h1>
        <p className="text-slate-600 mt-2">Create a new supplier payment record with optional tax deductions</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Payment Details Card */}
        <Card>
          <CardHeader>
            <h2 className="text-lg font-semibold text-slate-900">Payment Details</h2>
          </CardHeader>
          <CardBody className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Supplier Selection */}
              <div>
                <label className="block text-sm font-medium text-slate-900 mb-3">Supplier *</label>
                <select
                  name="supplierId"
                  value={formData.supplierId}
                  onChange={handleChange}
                  required
                  className="w-full px-4 py-2.5 rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent text-slate-900"
                >
                  <option value="">Select Supplier</option>
                  {suppliers.map((supplier) => (
                    <option key={supplier.id} value={supplier.id}>
                      {supplier.companyName}
                    </option>
                  ))}
                </select>
              </div>

              {/* Other Expenses Checkbox */}
              <div className="flex items-end pb-2.5">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    name="otherExpenses"
                    checked={formData.otherExpenses}
                    onChange={handleChange}
                    className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-sm font-medium text-slate-900">Other Expenses / Petty Cash</span>
                </label>
              </div>

              {/* Purchase Order Selection */}
              {!formData.otherExpenses && (
                <div>
                  <label className="block text-sm font-medium text-slate-900 mb-3">Purchase Order (Optional)</label>
                  <select
                    name="purchaseOrderId"
                    value={formData.purchaseOrderId}
                    onChange={handleChange}
                    className="w-full px-4 py-2.5 rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent text-slate-900"
                  >
                    <option value="">Select PO (No Specific PO)</option>
                    {purchaseOrders.map((po) => (
                      <option key={po.id} value={po.id}>
                        {po.poNo} - ETB {po.totalAmount.toLocaleString('en-US')}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Amount */}
              <div>
                <label className="block text-sm font-medium text-slate-900 mb-3">Gross / Invoice Amount (ETB) *</label>
                <input
                  type="number"
                  name="amount"
                  value={formData.amount}
                  onChange={handleChange}
                  step="0.01"
                  min="0.01"
                  required
                  placeholder="0.00"
                  className="w-full px-4 py-2.5 rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent text-slate-900"
                />
              </div>

              {/* Payment Date */}
              <div>
                <label className="block text-sm font-medium text-slate-900 mb-3">Payment Date *</label>
                <input
                  type="date"
                  name="paymentDate"
                  value={formData.paymentDate}
                  onChange={handleChange}
                  required
                  className="w-full px-4 py-2.5 rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent text-slate-900"
                />
              </div>

              {/* Payment Method */}
              <div>
                <label className="block text-sm font-medium text-slate-900 mb-3">Payment Method *</label>
                <select
                  name="paymentMethod"
                  value={formData.paymentMethod}
                  onChange={handleChange}
                  required
                  className="w-full px-4 py-2.5 rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent text-slate-900"
                >
                  <option value="bank_transfer">Bank Transfer</option>
                  <option value="cash">Cash</option>
                  <option value="check">Check</option>
                </select>
              </div>

              {/* Bank Name (conditional) */}
              {(formData.paymentMethod === 'bank_transfer' || formData.paymentMethod === 'check') && (
                <div>
                  <label className="block text-sm font-medium text-slate-900 mb-3">Bank Name *</label>
                  <select
                    name="bankName"
                    value={formData.bankName}
                    onChange={handleChange}
                    required={formData.paymentMethod === 'bank_transfer' || formData.paymentMethod === 'check'}
                    className="w-full px-4 py-2.5 rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent text-slate-900"
                  >
                    <option value="">Select Bank</option>
                    {ethiopianBanks.map((bank) => (
                      <option key={bank} value={bank}>
                        {bank}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Reference Number */}
              <div>
                <label className="block text-sm font-medium text-slate-900 mb-3">Reference No</label>
                <input
                  type="text"
                  name="refNo"
                  value={formData.refNo}
                  onChange={handleChange}
                  placeholder="Bank transfer ref, check no, etc."
                  className="w-full px-4 py-2.5 rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent text-slate-900"
                />
              </div>
            </div>

            {/* Tax Deductions Section */}
            <div className="pt-4 border-t border-slate-200">
              <h3 className="text-sm font-semibold text-slate-900 uppercase tracking-wider mb-4">
                Tax Deductions
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* VAT Deduction Checkbox Card */}
                <label className={`flex items-start gap-3.5 p-4 rounded-xl border transition-all cursor-pointer ${
                  formData.deductVat
                    ? 'bg-blue-50/70 border-blue-300 ring-1 ring-blue-300'
                    : 'bg-slate-50/60 border-slate-200 hover:bg-slate-50'
                }`}>
                  <input
                    type="checkbox"
                    name="deductVat"
                    checked={formData.deductVat}
                    onChange={handleChange}
                    className="w-5 h-5 rounded border-slate-300 text-blue-600 focus:ring-blue-500 mt-0.5"
                  />
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-semibold text-slate-900">Deduct VAT (15%)</span>
                      {formData.deductVat && grossAmount > 0 && (
                        <span className="text-xs font-bold text-red-600 bg-red-50 px-2 py-0.5 rounded border border-red-200">
                          - {formatETB(vatDeduction)} ETB
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-500 mt-1">
                      Deducts standard 15% Value Added Tax from the payment amount.
                    </p>
                  </div>
                </label>

                {/* Withholding Deduction Checkbox Card */}
                <label className={`flex items-start gap-3.5 p-4 rounded-xl border transition-all cursor-pointer ${
                  formData.deductWithholding
                    ? 'bg-blue-50/70 border-blue-300 ring-1 ring-blue-300'
                    : 'bg-slate-50/60 border-slate-200 hover:bg-slate-50'
                }`}>
                  <input
                    type="checkbox"
                    name="deductWithholding"
                    checked={formData.deductWithholding}
                    onChange={handleChange}
                    className="w-5 h-5 rounded border-slate-300 text-blue-600 focus:ring-blue-500 mt-0.5"
                  />
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-semibold text-slate-900">Deduct Withholding (3%)</span>
                      {formData.deductWithholding && grossAmount > 0 && (
                        <span className="text-xs font-bold text-red-600 bg-red-50 px-2 py-0.5 rounded border border-red-200">
                          - {formatETB(withholdingDeduction)} ETB
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-500 mt-1">
                      Deducts standard 3% Withholding Tax from the payment amount.
                    </p>
                  </div>
                </label>
              </div>

              {/* Real-time Calculation Summary Card */}
              {grossAmount > 0 && (
                <div className="mt-5 p-5 bg-gradient-to-br from-slate-50 to-slate-100 rounded-2xl border border-slate-200/80 shadow-sm">
                  <div className="flex items-center justify-between mb-3 border-b border-slate-200 pb-2.5">
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-600">
                      Payment Calculation Breakdown
                    </span>
                    <span className="text-xs font-medium text-slate-500">
                      Ethiopian Birr (ETB)
                    </span>
                  </div>

                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between items-center text-slate-700">
                      <span>Gross Invoice Amount:</span>
                      <span className="font-semibold text-slate-900">{formatETB(grossAmount)} ETB</span>
                    </div>

                    <div className="flex justify-between items-center text-slate-600">
                      <span className="flex items-center gap-1.5">
                        VAT Deduction (15%):
                        {formData.deductVat ? (
                          <span className="text-[11px] font-semibold text-blue-600 bg-blue-50 px-1.5 py-0.2 rounded border border-blue-200">Applied</span>
                        ) : (
                          <span className="text-[11px] text-slate-400">None</span>
                        )}
                      </span>
                      <span className={formData.deductVat ? 'font-semibold text-red-600' : 'text-slate-400'}>
                        {formData.deductVat ? `- ${formatETB(vatDeduction)} ETB` : '0.00 ETB'}
                      </span>
                    </div>

                    <div className="flex justify-between items-center text-slate-600">
                      <span className="flex items-center gap-1.5">
                        Withholding Tax Deduction (3%):
                        {formData.deductWithholding ? (
                          <span className="text-[11px] font-semibold text-blue-600 bg-blue-50 px-1.5 py-0.2 rounded border border-blue-200">Applied</span>
                        ) : (
                          <span className="text-[11px] text-slate-400">None</span>
                        )}
                      </span>
                      <span className={formData.deductWithholding ? 'font-semibold text-red-600' : 'text-slate-400'}>
                        {formData.deductWithholding ? `- ${formatETB(withholdingDeduction)} ETB` : '0.00 ETB'}
                      </span>
                    </div>

                    {(formData.deductVat || formData.deductWithholding) && (
                      <div className="flex justify-between items-center text-slate-600 pt-1 border-t border-dashed border-slate-200">
                        <span>Total Deductions:</span>
                        <span className="font-semibold text-red-600">- {formatETB(totalDeductions)} ETB</span>
                      </div>
                    )}

                    <div className="flex justify-between items-center pt-3 border-t border-slate-300">
                      <span className="text-base font-bold text-slate-900">Total Net Payment:</span>
                      <span className="text-xl font-extrabold text-blue-700">
                        {formatETB(netPayable)} <span className="text-sm font-semibold text-slate-600">ETB</span>
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-medium text-slate-900 mb-3">Description</label>
              <textarea
                name="description"
                value={formData.description}
                onChange={handleChange}
                placeholder="Additional notes about this payment..."
                rows={3}
                className="w-full px-4 py-2.5 rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent text-slate-900"
              />
            </div>
          </CardBody>
        </Card>

        {/* Action Buttons */}
        <div className="flex gap-3 justify-end">
          <Link href="/dashboard/purchasing/payments">
            <Button variant="outline" size="lg">
              Cancel
            </Button>
          </Link>
          <Button variant="primary" size="lg" type="submit" isLoading={submitting}>
            Record Payment {netPayable > 0 ? `(${formatETB(netPayable)} ETB)` : ''}
          </Button>
        </div>
      </form>
    </div>
  );
}
