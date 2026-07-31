'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Card, CardHeader, CardBody, CardFooter, Button, Input, Select, Badge, Table } from '@/components/ui';
import FileUpload from '@/components/ui/FileUpload';
import { uploadDocument } from '@/lib/upload-helper';

interface InvoiceDetail {
  id: string;
  invoiceNo: string;
  invoiceDate: string;
  totalAmount: number;
  items: any[];
  vatRate: number;
  vatAmount: number;
  subtotal: number;
  status: string;
}

interface SelectedInvoice {
  id: string;
  invoiceNo: string;
  totalAmount: number;
  withholdAmount: number;
  netPayable: number;
  allocatedAmount: number;
}

interface CustomerWithholding {
  enabled: boolean;
  rate: number; // percentage, e.g. 2
}

export default function NewPaymentPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [submitting, setSubmitting] = useState(false);
  const [loadingCustomers, setLoadingCustomers] = useState(true);
  const [customers, setCustomers] = useState<{ value: string; label: string }[]>([]);
  const [customersRaw, setCustomersRaw] = useState<any[]>([]);
  const [customerWithholding, setCustomerWithholding] = useState<CustomerWithholding>({ enabled: false, rate: 2 });
  const [invoices, setInvoices] = useState<InvoiceDetail[]>([]);
  const [selectedInvoices, setSelectedInvoices] = useState<SelectedInvoice[]>([]);
  const [depositFiles, setDepositFiles] = useState<File[]>([]);
  const [bankAccounts, setBankAccounts] = useState<{ id: string; bankName: string; accountNo: string; accountName: string }[]>([]);
  const [formData, setFormData] = useState({
    customerId: searchParams?.get('customerId') || '',
    amount: '',
    paymentDate: new Date().toISOString().split('T')[0],
    paymentMethod: 'bank_transfer',
    bankName: '',
    bankAccountId: '',
    refNo: '',
  });

  // Pre-select a single invoice if passed via URL
  const preselectedInvoiceId = searchParams?.get('invoiceId') || '';

  const selectedTotal = useMemo(() => {
    return selectedInvoices.reduce((sum, inv) => sum + inv.allocatedAmount, 0);
  }, [selectedInvoices]);

  const totalWithholding = useMemo(() => {
    return selectedInvoices.reduce((sum, inv) => sum + inv.withholdAmount, 0);
  }, [selectedInvoices]);

  const totalInvoiceAmount = useMemo(() => {
    return selectedInvoices.reduce((sum, inv) => sum + inv.totalAmount, 0);
  }, [selectedInvoices]);

  useEffect(() => {
    // Fetch customers with active sales agreements
    setLoadingCustomers(true);
    fetch('/api/sales/agreements/customers')
      .then((r) => r.json())
      .then((json) => {
        if (json.success) {
          setCustomersRaw(json.data);
          setCustomers(json.data.map((c: any) => ({ value: String(c.customerId), label: `${c.companyName} — ${c.agreementNo}` })));
        }
      })
      .catch(console.error)
      .finally(() => setLoadingCustomers(false));
  }, []);

  useEffect(() => {
    fetch('/api/finance/bank?status=Active')
      .then(r => r.json())
      .then(json => {
        if (json.success && json.data) {
          setBankAccounts(json.data);
          // Auto-select if only one bank account exists
          if (json.data.length === 1) {
            setFormData(prev => ({ ...prev, bankName: json.data[0].bankName, bankAccountId: json.data[0].id }));
          }
        }
      })
      .catch(err => console.error('Failed to fetch bank accounts:', err));
  }, []);

  // Update customer withholding info when customer changes
  useEffect(() => {
    if (formData.customerId && customersRaw.length > 0) {
      const cust = customersRaw.find((c: any) => String(c.customerId) === formData.customerId);
      if (cust) {
        setCustomerWithholding({
          enabled: !!cust.withholding,
          rate: cust.withholdRate || 2,
        });
      } else {
        setCustomerWithholding({ enabled: false, rate: 2 });
      }
    } else {
      setCustomerWithholding({ enabled: false, rate: 2 });
    }
  }, [formData.customerId, customersRaw]);

  // Helper: compute withholding for an invoice total
  const computeWithholding = (invoiceTotal: number, wh: CustomerWithholding) => {
    if (!wh.enabled) return { withholdAmount: 0, netPayable: invoiceTotal };
    const withholdAmount = Math.round(invoiceTotal * (wh.rate / 100) * 100) / 100;
    const netPayable = Math.round((invoiceTotal - withholdAmount) * 100) / 100;
    return { withholdAmount, netPayable };
  };

  useEffect(() => {
    // Fetch unpaid/partial invoices for selected customer
    if (formData.customerId) {
      fetch(`/api/sales/invoices?limit=100&customerId=${formData.customerId}&status=Unpaid,Partial`)
        .then((r) => r.json())
        .then((json) => {
          if (json.success) {
            setInvoices(json.data);
            // Auto-select invoice from URL param if present
            if (preselectedInvoiceId && json.data.length > 0) {
              const preselected = json.data.find((inv: InvoiceDetail) => inv.id === preselectedInvoiceId);
              if (preselected) {
                const amount = Number(preselected.totalAmount);
                const { withholdAmount, netPayable } = computeWithholding(amount, customerWithholding);
                const newSelected: SelectedInvoice[] = [{
                  id: preselected.id,
                  invoiceNo: preselected.invoiceNo,
                  totalAmount: amount,
                  withholdAmount,
                  netPayable,
                  allocatedAmount: netPayable,
                }];
                setSelectedInvoices(newSelected);
                const total = newSelected.reduce((sum, inv) => sum + inv.allocatedAmount, 0);
                setFormData((prev) => ({
                  ...prev,
                  amount: total.toFixed(4).replace(/\.?0+$/, ''),
                }));
              }
            }
          }
        })
        .catch(console.error);
    } else {
      setInvoices([]);
      setSelectedInvoices([]);
    }
  }, [formData.customerId, customerWithholding]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleToggleInvoice = (invoice: InvoiceDetail) => {
    setSelectedInvoices((prev) => {
      const exists = prev.find((s) => s.id === invoice.id);
      let updated: SelectedInvoice[];
      if (exists) {
        // Remove from selection
        updated = prev.filter((s) => s.id !== invoice.id);
      } else {
        // Add to selection with net payable (after withholding)
        const amount = Number(invoice.totalAmount);
        const { withholdAmount, netPayable } = computeWithholding(amount, customerWithholding);
        updated = [...prev, {
          id: invoice.id,
          invoiceNo: invoice.invoiceNo,
          totalAmount: amount,
          withholdAmount,
          netPayable,
          allocatedAmount: netPayable,
        }];
      }
      // Auto-update total amount
      const total = updated.reduce((sum, inv) => sum + inv.allocatedAmount, 0);
      setFormData((prev) => ({
        ...prev,
        amount: total > 0 ? total.toFixed(4).replace(/\.?0+$/, '') : '',
      }));
      return updated;
    });
  };

  const handleSelectAll = () => {
    if (selectedInvoices.length === invoices.length) {
      // Deselect all
      setSelectedInvoices([]);
      setFormData((prev) => ({ ...prev, amount: '' }));
    } else {
      // Select all with withholding applied
      const allSelected: SelectedInvoice[] = invoices.map((inv) => {
        const amount = Number(inv.totalAmount);
        const { withholdAmount, netPayable } = computeWithholding(amount, customerWithholding);
        return {
          id: inv.id,
          invoiceNo: inv.invoiceNo,
          totalAmount: amount,
          withholdAmount,
          netPayable,
          allocatedAmount: netPayable,
        };
      });
      setSelectedInvoices(allSelected);
      const total = allSelected.reduce((sum, inv) => sum + inv.allocatedAmount, 0);
      setFormData((prev) => ({
        ...prev,
        amount: total.toFixed(4).replace(/\.?0+$/, ''),
      }));
    }
  };

  const handleAllocatedAmountChange = (invoiceId: string, newAmount: string) => {
    setSelectedInvoices((prev) => {
      const updated = prev.map((inv) => {
        if (inv.id === invoiceId) {
          const parsed = parseFloat(newAmount) || 0;
          // Max is netPayable (totalAmount minus withholding)
          return { ...inv, allocatedAmount: Math.min(parsed, inv.netPayable) };
        }
        return inv;
      });
      const total = updated.reduce((sum, inv) => sum + inv.allocatedAmount, 0);
      setFormData((prevForm) => ({
        ...prevForm,
        amount: total > 0 ? total.toFixed(4).replace(/\.?0+$/, '') : '',
      }));
      return updated;
    });
  };

  const handleRemoveInvoice = (invoiceId: string) => {
    setSelectedInvoices((prev) => {
      const updated = prev.filter((s) => s.id !== invoiceId);
      const total = updated.reduce((sum, inv) => sum + inv.allocatedAmount, 0);
      setFormData((prevForm) => ({
        ...prevForm,
        amount: total > 0 ? total.toFixed(4).replace(/\.?0+$/, '') : '',
      }));
      return updated;
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.customerId || !formData.amount) {
      alert('Please fill in all required fields');
      return;
    }

    if (selectedInvoices.length === 0) {
      alert('Please select at least one invoice');
      return;
    }

    // Check if bank name is required
    if ((formData.paymentMethod === 'bank_transfer' || formData.paymentMethod === 'check') && !formData.bankName) {
      alert('Bank Name is required for bank transfers and checks');
      return;
    }

    // Validate no zero allocations
    const zeroAllocations = selectedInvoices.filter((inv) => inv.allocatedAmount <= 0);
    if (zeroAllocations.length > 0) {
      alert('All selected invoices must have an allocated amount greater than zero');
      return;
    }

    setSubmitting(true);
    try {
      const invoiceAllocations = selectedInvoices.map((inv) => ({
        invoiceId: inv.id,
        amount: inv.allocatedAmount,
      }));

      const res = await fetch('/api/sales/payments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerId: formData.customerId,
          invoiceIds: selectedInvoices.map((inv) => inv.id),
          invoiceAllocations,
          amount: parseFloat(formData.amount),
          withholdingAmount: totalWithholding > 0 ? totalWithholding : undefined,
          paymentDate: formData.paymentDate,
          paymentMethod: formData.paymentMethod,
          bankName: formData.bankName || null,
          bankAccountId: formData.bankAccountId || null,
          refNo: formData.refNo || null,
        }),
      });
      const data = await res.json();
      if (data.success) {
        // Upload deposit slip if provided — attach to the first payment
        if (depositFiles.length > 0) {
          const recordId = data.data?.id?.toString() || data.data?.[0]?.id?.toString() || 'new';
          for (const file of depositFiles) {
            await uploadDocument(file, 'SALES', recordId, 'deposit_slip');
          }
        }
        const invoiceCount = selectedInvoices.length;
        alert(`Payment recorded successfully for ${invoiceCount} invoice${invoiceCount > 1 ? 's' : ''}!`);
        router.push('/dashboard/sales/payments');
      } else {
        alert(data.error || 'Failed to record payment');
      }
    } catch {
      alert('Failed to record payment');
    }
    setSubmitting(false);
  };

  const isInvoiceSelected = (invoiceId: string) => selectedInvoices.some((s) => s.id === invoiceId);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 text-sm text-slate-500">
        <Link href="/dashboard/sales/payments" className="text-blue-600 hover:text-blue-800">Customer Payments</Link>
        <span>/</span>
        <span>Record Payment</span>
      </div>

      <h1 className="text-2xl font-bold text-slate-900">Record Customer Payment</h1>

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card>
          <CardHeader><h2 className="text-lg font-semibold text-gray-900">Customer Selection</h2></CardHeader>
          <CardBody>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Customer *</label>
                <select
                  name="customerId"
                  value={formData.customerId}
                  onChange={(e) => {
                    handleChange(e);
                    setSelectedInvoices([]);
                  }}
                  required
                  disabled={loadingCustomers}
                  className="w-full px-4 py-2.5 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">{loadingCustomers ? 'Loading...' : 'Select Customer'}</option>
                  {customers.map((c) => (
                    <option key={c.value} value={c.value}>{c.label}</option>
                  ))}
                </select>
                {customers.length === 0 && !loadingCustomers && (
                  <p className="text-xs text-red-500 mt-1">No customers with active sales agreements found</p>
                )}
                {customerWithholding.enabled && formData.customerId && (
                  <p className="text-xs text-amber-700 mt-1 font-medium">
                    This customer has {customerWithholding.rate}% withholding tax enabled
                  </p>
                )}
              </div>
            </div>
          </CardBody>
        </Card>

        {/* Invoices Table with Checkboxes */}
        {invoices.length > 0 && (
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-gray-900">Unpaid / Partial Invoices</h2>
                {invoices.length > 1 && (
                  <Button variant="outline" size="sm" onClick={handleSelectAll} type="button">
                    {selectedInvoices.length === invoices.length ? 'Deselect All' : 'Select All'}
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardBody>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="text-center py-3 px-4 font-semibold text-gray-900 w-12">
                        <input
                          type="checkbox"
                          checked={invoices.length > 0 && selectedInvoices.length === invoices.length}
                          onChange={handleSelectAll}
                          className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                      </th>
                      <th className="text-left py-3 px-4 font-semibold text-gray-900">Invoice No</th>
                      <th className="text-left py-3 px-4 font-semibold text-gray-900">Date</th>
                      <th className="text-left py-3 px-4 font-semibold text-gray-900">Items Summary</th>
                      <th className="text-right py-3 px-4 font-semibold text-gray-900">Total Amount</th>
                      <th className="text-right py-3 px-4 font-semibold text-gray-900">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {invoices.map((inv) => (
                      <tr
                        key={inv.id}
                        className={`border-b cursor-pointer transition-colors ${isInvoiceSelected(inv.id) ? 'bg-blue-50 hover:bg-blue-100' : 'hover:bg-gray-50'}`}
                        onClick={() => handleToggleInvoice(inv)}
                      >
                        <td className="py-3 px-4 text-center" onClick={(e) => e.stopPropagation()}>
                          <input
                            type="checkbox"
                            checked={isInvoiceSelected(inv.id)}
                            onChange={() => handleToggleInvoice(inv)}
                            className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                          />
                        </td>
                        <td className="py-3 px-4 font-medium">{inv.invoiceNo}</td>
                        <td className="py-3 px-4">{new Date(inv.invoiceDate).toLocaleDateString()}</td>
                        <td className="py-3 px-4 text-gray-600 text-xs">
                          {Array.isArray(inv.items) ? inv.items.map(i => i.description || i.item).join(', ').substring(0, 40) : 'N/A'}
                        </td>
                        <td className="py-3 px-4 text-right font-medium">{(inv.totalAmount ?? 0).toLocaleString('en-US')} ETB</td>
                        <td className="py-3 px-4 text-right">
                          <Badge variant={inv.status === 'Unpaid' ? 'error' : 'warning'} size="sm">
                            {inv.status}
                          </Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardBody>
          </Card>
        )}

        {/* Selected Invoices Summary */}
        {selectedInvoices.length > 0 && (
          <Card>
            <CardHeader>
              <h2 className="text-lg font-semibold text-gray-900">
                Selected Invoices ({selectedInvoices.length})
              </h2>
            </CardHeader>
            <CardBody>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-3 px-4 font-semibold text-gray-900">Invoice No</th>
                      <th className="text-right py-3 px-4 font-semibold text-gray-900">Invoice Total</th>
                      {customerWithholding.enabled && (
                        <th className="text-right py-3 px-4 font-semibold text-gray-900">WHT ({customerWithholding.rate}%)</th>
                      )}
                      <th className="text-right py-3 px-4 font-semibold text-gray-900 w-48">Payment Amount (ETB)</th>
                      <th className="text-center py-3 px-4 font-semibold text-gray-900 w-20">Remove</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedInvoices.map((inv) => (
                      <tr key={inv.id} className="border-b">
                        <td className="py-3 px-4 font-medium">{inv.invoiceNo}</td>
                        <td className="py-3 px-4 text-right text-gray-600">{inv.totalAmount.toLocaleString('en-US')} ETB</td>
                        {customerWithholding.enabled && (
                          <td className="py-3 px-4 text-right text-red-600">-{inv.withholdAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ETB</td>
                        )}
                        <td className="py-3 px-4 text-right">
                          <input
                            type="number"
                            step="0.01"
                            min="0.01"
                            max={inv.netPayable}
                            value={inv.allocatedAmount}
                            onChange={(e) => handleAllocatedAmountChange(inv.id, e.target.value)}
                            className="w-40 px-3 py-1.5 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent text-right"
                          />
                        </td>
                        <td className="py-3 px-4 text-center">
                          <button
                            type="button"
                            onClick={() => handleRemoveInvoice(inv.id)}
                            className="text-red-500 hover:text-red-700 transition-colors"
                            title="Remove invoice"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                              <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                            </svg>
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    {customerWithholding.enabled && totalWithholding > 0 && (
                      <>
                        <tr className="border-t border-gray-200">
                          <td className="py-2 px-4 text-gray-700">Invoice Total</td>
                          <td className="py-2 px-4 text-right text-gray-700">
                            {totalInvoiceAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ETB
                          </td>
                          {customerWithholding.enabled && <td className="py-2 px-4"></td>}
                          <td className="py-2 px-4"></td>
                          <td className="py-2 px-4"></td>
                        </tr>
                        <tr>
                          <td className="py-2 px-4 text-red-700">Withholding Tax ({customerWithholding.rate}%)</td>
                          <td className="py-2 px-4 text-right text-red-700">
                            -{totalWithholding.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ETB
                          </td>
                          {customerWithholding.enabled && <td className="py-2 px-4"></td>}
                          <td className="py-2 px-4"></td>
                          <td className="py-2 px-4"></td>
                        </tr>
                      </>
                    )}
                    <tr className="border-t-2 border-gray-300">
                      <td className="py-3 px-4 font-bold text-gray-900">Net Payment</td>
                      <td className="py-3 px-4"></td>
                      {customerWithholding.enabled && <td className="py-3 px-4"></td>}
                      <td className="py-3 px-4 text-right font-bold text-lg text-blue-700">
                        {selectedTotal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ETB
                      </td>
                      <td className="py-3 px-4"></td>
                    </tr>
                  </tfoot>
                </table>
              </div>
              {customerWithholding.enabled && totalWithholding > 0 && (
                <div className="mt-3 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                  <p className="text-sm text-amber-800 font-medium">
                    Withholding Tax ({customerWithholding.rate}%): ETB {totalWithholding.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </p>
                  <p className="text-xs text-amber-600 mt-1">
                    Invoice Total: ETB {totalInvoiceAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} - Withholding: ETB {totalWithholding.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} = Net Payment: ETB {selectedTotal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </p>
                </div>
              )}
              {selectedInvoices.some((inv) => inv.allocatedAmount < inv.netPayable) && (
                <p className="mt-3 text-sm text-amber-600">
                  Note: Some invoices have partial payment amounts. They will be marked as &quot;Partial&quot; after payment.
                </p>
              )}
            </CardBody>
          </Card>
        )}

        <Card>
          <CardHeader><h2 className="text-lg font-semibold text-gray-900">Payment Details</h2></CardHeader>
          <CardBody>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Total Amount (ETB) *</label>
                <input
                  name="amount"
                  type="number"
                  step="0.0001"
                  min="0.01"
                  required
                  value={formData.amount}
                  onChange={handleChange}
                  placeholder="Auto-calculated from selected invoices"
                  className="w-full px-4 py-2.5 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-gray-50"
                  readOnly
                />
                {selectedInvoices.length > 0 && (
                  <p className="text-xs text-gray-500 mt-1">
                    Adjust individual invoice amounts in the table above if needed
                  </p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Payment Date *</label>
                <input
                  name="paymentDate"
                  type="date"
                  required
                  value={formData.paymentDate}
                  onChange={handleChange}
                  className="w-full px-4 py-2.5 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Payment Method *</label>
                <select
                  name="paymentMethod"
                  value={formData.paymentMethod}
                  onChange={handleChange}
                  className="w-full px-4 py-2.5 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="bank_transfer">Bank Transfer</option>
                  <option value="cash">Cash</option>
                  <option value="check">Check</option>
                </select>
              </div>
              {(formData.paymentMethod === 'bank_transfer' || formData.paymentMethod === 'check') && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Bank Account *</label>
                  <select
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    value={formData.bankAccountId}
                    onChange={(e) => {
                      const selected = bankAccounts.find(b => b.id === e.target.value);
                      setFormData(prev => ({
                        ...prev,
                        bankAccountId: e.target.value,
                        bankName: selected ? `${selected.bankName} - ${selected.accountNo}` : '',
                      }));
                    }}
                    required={formData.paymentMethod === 'bank_transfer'}
                  >
                    <option value="">Select Bank Account</option>
                    {bankAccounts.map(bank => (
                      <option key={bank.id} value={bank.id}>
                        {bank.bankName} — {bank.accountNo} ({bank.accountName})
                      </option>
                    ))}
                  </select>
                </div>
              )}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Reference No</label>
                <input
                  name="refNo"
                  value={formData.refNo}
                  onChange={handleChange}
                  placeholder="Bank transfer ref, check no, etc."
                  className="w-full px-4 py-2.5 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>
          </CardBody>
        </Card>

        {/* Deposit Slip Upload */}
        <Card>
          <CardHeader><h2 className="text-lg font-semibold text-gray-900">Deposit Slip / Proof of Payment</h2></CardHeader>
          <CardBody>
            <FileUpload
              onFilesSelected={(files) => setDepositFiles(files)}
              label="Upload Deposit Slip"
              maxFiles={3}
              maxFileSize={10 * 1024 * 1024}
              acceptedFileTypes={['image/*', 'application/pdf']}
              helperText="Upload a photo or scan of the bank deposit slip or transfer confirmation (max 10MB)"
            />
          </CardBody>
        </Card>

        <div className="flex gap-3 justify-end">
          <Link href="/dashboard/sales/payments">
            <Button variant="outline" size="lg">Cancel</Button>
          </Link>
          <Button
            variant="primary"
            size="lg"
            type="submit"
            isLoading={submitting}
            disabled={selectedInvoices.length === 0}
          >
            {selectedInvoices.length > 1
              ? `Record Payment for ${selectedInvoices.length} Invoices`
              : 'Record Payment'}
          </Button>
        </div>
      </form>
    </div>
  );
}
