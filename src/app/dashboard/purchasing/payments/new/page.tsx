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

    setFormData({
      ...formData,
      [name]: type === 'checkbox' ? checked : value,
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
      const res = await fetch('/api/purchasing/payments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          supplierId: formData.supplierId,
          purchaseOrderId: formData.purchaseOrderId || null,
          amount: parseFloat(formData.amount),
          paymentDate: formData.paymentDate,
          paymentMethod: formData.paymentMethod,
          bankName: formData.bankName || null,
          refNo: formData.refNo || null,
          description: formData.description || null,
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
                <label className="block text-sm font-medium text-slate-900 mb-3">Amount (ETB) *</label>
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
            Record Payment
          </Button>
        </div>
      </form>
    </div>
  );
}
