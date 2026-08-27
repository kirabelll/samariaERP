'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Card, CardHeader, CardBody, CardFooter, Button } from '@/components/ui';

interface Supplier {
  id: string;
  companyName: string;
  withholding?: boolean;
  withholdRate?: number;
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

  // Tax & Withholding states
  const [applyVat, setApplyVat] = useState(false);
  const [vatRate, setVatRate] = useState<number>(15);
  const [applyWithholding, setApplyWithholding] = useState(false);
  const [withholdRate, setWithholdRate] = useState<number>(3);

  const [formData, setFormData] = useState({
    supplierId: '',
    purchaseOrderId: '',
    amount: '',
    paymentDate: new Date().toISOString().split('T')[0],
    paymentMethod: 'bank_transfer',
    bankName: '',
    refNo: '',
    description: '',
    otherExpenses: false,
  });

  // Calculated totals based on subtotal, VAT and withholding
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

    if (name === 'supplierId') {
      const selected = suppliers.find((s) => s.id === value);
      if (selected?.withholding) {
        setApplyWithholding(true);
        if (selected.withholdRate) {
          setWithholdRate(selected.withholdRate);
        }
      }
    }

    if (name === 'purchaseOrderId') {
      const selectedPo = purchaseOrders.find((p) => p.id === value);
      if (selectedPo && selectedPo.totalAmount > 0) {
        setFormData((prev) => ({
          ...prev,
          purchaseOrderId: value,
          amount: String(selectedPo.totalAmount),
        }));
        return;
      }
    }

    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
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
      // Determine effective payable amount and audit breakdown
      const effectiveAmount = (applyVat || applyWithholding) && netPayable > 0
        ? Math.round(netPayable * 100) / 100
        : parseFloat(formData.amount);

      let autoBreakdown = '';
      if (applyVat || applyWithholding) {
        const parts = [
          `Subtotal (excl. VAT): ETB ${subtotal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
        ];
        if (applyVat) {
          parts.push(`VAT (${vatRate}%): +ETB ${totalVAT.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`);
          parts.push(`Gross: ETB ${grossTotal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`);
        }
        if (applyWithholding) {
          parts.push(`Withholding (${withholdRate}%): -ETB ${withholdAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`);
        }
        parts.push(`Net Payable: ETB ${netPayable.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`);
        autoBreakdown = ` [${parts.join(' | ')}]`;
      }

      let finalDescription = formData.description || '';
      if (autoBreakdown && !finalDescription.includes('Net Payable:')) {
        finalDescription = finalDescription ? `${finalDescription}${autoBreakdown}` : autoBreakdown.trim().replace(/^\[|\]$/g, '');
      }

      const res = await fetch('/api/purchasing/payments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          supplierId: formData.supplierId,
          purchaseOrderId: formData.purchaseOrderId || null,
          amount: effectiveAmount,
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
        <p className="text-slate-600 mt-2">Create a new supplier payment record</p>
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
                <label className="flex items-center gap-3">
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
                <label className="block text-sm font-medium text-slate-900 mb-3">Amount / Subtotal (excl. VAT) *</label>
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
                {(applyVat || applyWithholding) && subtotal > 0 && (
                  <p className="text-xs text-emerald-700 mt-1 font-medium flex items-center gap-1">
                    <span>✓ Calculated Net Payable:</span>
                    <strong>ETB {netPayable.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong>
                  </p>
                )}
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

        {/* 3. VAT & Totals Card */}
        <Card>
          <CardHeader className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-lg font-semibold text-slate-900">3. VAT & Totals</h2>
            <div className="flex flex-wrap items-center gap-2">
              <label className="flex items-center gap-2 text-xs font-medium text-slate-700 cursor-pointer bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-lg hover:bg-slate-100 transition-colors">
                <input
                  type="checkbox"
                  checked={applyVat}
                  onChange={(e) => setApplyVat(e.target.checked)}
                  className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500"
                />
                <span>Apply VAT ({vatRate}%)</span>
              </label>
              {applyVat && (
                <div className="flex items-center gap-1">
                  <span className="text-xs text-slate-500">Rate:</span>
                  <select
                    value={vatRate}
                    onChange={(e) => setVatRate(Number(e.target.value) || 0)}
                    className="px-2 py-1 text-xs border border-slate-300 rounded-lg bg-white font-medium text-slate-700"
                  >
                    <option value={15}>15% (Standard VAT)</option>
                    <option value={10}>10%</option>
                    <option value={5}>5%</option>
                    <option value={0}>0% (Exempt)</option>
                  </select>
                </div>
              )}
            </div>
          </CardHeader>
          <CardBody>
            <div className="max-w-md ml-auto space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-slate-600">Subtotal (excl. VAT):</span>
                <span className="font-medium text-slate-900">
                  ETB {subtotal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>

              {applyVat ? (
                <div className="flex justify-between text-sm">
                  <span className="text-slate-600">VAT ({vatRate}%):</span>
                  <span className="font-medium text-blue-600">
                    + ETB {totalVAT.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>
              ) : (
                <div className="flex justify-between text-sm text-slate-400">
                  <span>VAT (0% - Not Applied):</span>
                  <span>+ ETB 0.00</span>
                </div>
              )}

              <div className="flex justify-between text-sm border-t pt-2">
                <span className="text-slate-900 font-medium">Gross Total:</span>
                <span className="font-semibold text-slate-900">
                  ETB {grossTotal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>

              {/* Withholding Tax */}
              <div className="border-t pt-3 space-y-2">
                <div className="flex items-center justify-between">
                  <label className="flex items-center gap-2 text-sm cursor-pointer">
                    <input
                      type="checkbox"
                      checked={applyWithholding}
                      onChange={(e) => setApplyWithholding(e.target.checked)}
                      className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-slate-700 font-medium">
                      Apply Withholding Tax ({withholdRate}%)
                    </span>
                  </label>
                  {applyWithholding && (
                    <div className="flex items-center gap-1">
                      <span className="text-xs text-slate-500">Rate:</span>
                      <select
                        value={withholdRate}
                        onChange={(e) => setWithholdRate(Number(e.target.value) || 0)}
                        className="px-2 py-1 text-xs border border-slate-300 rounded-lg bg-white font-medium text-slate-700"
                      >
                        <option value={3}>3% (Goods/Services)</option>
                        <option value={2}>2% (Standard Goods)</option>
                        <option value={5}>5%</option>
                        <option value={10}>10%</option>
                      </select>
                    </div>
                  )}
                </div>

                {applyWithholding && (
                  <div className="flex justify-between text-sm">
                    <span className="text-red-600">Withholding ({withholdRate}% of subtotal):</span>
                    <span className="font-medium text-red-600">
                      - ETB {withholdAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                  </div>
                )}
              </div>

              <div className="border-t border-slate-900 pt-3">
                <div className="flex justify-between items-baseline">
                  <span className="text-lg font-bold text-slate-900">Net Payable:</span>
                  <span className="text-2xl font-bold text-[#007AFF]">
                    ETB {netPayable.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>
              </div>

              {/* VAT Note Info Box */}
              {applyVat && totalVAT > 0 && (
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 mt-4">
                  <p className="text-xs text-amber-800 font-medium">VAT Note</p>
                  <p className="text-xs text-amber-700 mt-1">
                    This purchasing payment VAT of ETB {totalVAT.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} will be recorded
                    as Input VAT for the current filing period. View VAT reports under Finance &rarr; VAT Management.
                  </p>
                </div>
              )}
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
            Record Payment
          </Button>
        </div>
      </form>
    </div>
  );
}
