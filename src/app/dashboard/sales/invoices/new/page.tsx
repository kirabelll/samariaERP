'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Card, CardHeader, CardBody, Button, Input } from '@/components/ui';

interface InvoiceItem {
  id: number;
  item: string;
  qty: number;
  unitPrice: number;
  vat: number;
  total: number;
}

interface Customer {
  customerId: string;
  companyName: string;
  agreementNo: string;
  code?: string;
  tin?: string;
  withholding?: boolean;
  withholdRate?: number;
  creditLimit?: number;
  division?: string;
}

interface AgreementItem {
  itemId?: string;
  itemName?: string;
  name?: string;
  qty?: number;
  quantity?: number;
  unit?: string;
  unitPrice?: number;
}

interface SalesAgreement {
  id: string;
  agreementNo: string;
  items: string;
  totalAmount: number;
  status: string;
  validFrom: string;
  validTo: string;
  customer?: Customer;
}

export default function NewInvoicePage() {
  const router = useRouter();
  const [customerId, setCustomerId] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [agreementId, setAgreementId] = useState('');
  const [items, setItems] = useState<InvoiceItem[]>([]);
  const [saving, setSaving] = useState(false);
  const [applyWithholding, setApplyWithholding] = useState(false);

  // Data lists
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [agreements, setAgreements] = useState<SalesAgreement[]>([]);
  const [systemItems, setSystemItems] = useState<{ id: string; name: string; code: string }[]>([]);
  const [loadingCustomers, setLoadingCustomers] = useState(true);
  const [loadingAgreements, setLoadingAgreements] = useState(false);

  const selectedCustomer = customers.find(c => c.customerId === customerId);
  const selectedAgreement = agreements.find(a => a.id === agreementId);

  // Fetch customers on mount
  useEffect(() => {
    const fetchCustomers = async () => {
      try {
        const res = await fetch('/api/sales/agreements/customers');
        const data = await res.json();
        if (data.success) {
          setCustomers(data.data || []);
        }
      } catch (err) {
        console.error('Failed to fetch customers:', err);
      } finally {
        setLoadingCustomers(false);
      }
    };
    fetchCustomers();

    // Fetch system items for name resolution
    fetch('/api/items?limit=500')
      .then((r) => r.json())
      .then((data) => {
        if (data.success) setSystemItems(data.data || []);
      })
      .catch(console.error);
  }, []);

  // Fetch agreements when customer changes
  useEffect(() => {
    if (!customerId) {
      setAgreements([]);
      setAgreementId('');
      setItems([]);
      setApplyWithholding(false);
      return;
    }

    const customer = customers.find(c => c.customerId === customerId);
    if (customer?.withholding) {
      setApplyWithholding(true);
    } else {
      setApplyWithholding(false);
    }

    const fetchAgreements = async () => {
      setLoadingAgreements(true);
      try {
        const res = await fetch(`/api/sales/agreements?customerId=${customerId}&limit=100`);
        const data = await res.json();
        if (data.success) {
          const activeAgreements = (data.data || []).filter(
            (a: SalesAgreement) =>
              a.status === 'Draft' || a.status === 'Active' || a.status === 'Approved'
          );
          setAgreements(activeAgreements);

          // Auto-select if only one agreement
          if (activeAgreements.length === 1) {
            handleAgreementSelect(activeAgreements[0].id, activeAgreements);
          }
        }
      } catch (err) {
        console.error('Failed to fetch agreements:', err);
      } finally {
        setLoadingAgreements(false);
      }
    };
    fetchAgreements();
  }, [customerId]);

  // Auto-populate items from selected agreement
  const handleAgreementSelect = (agId: string, agList?: SalesAgreement[]) => {
    setAgreementId(agId);
    if (!agId) {
      setItems([]);
      return;
    }

    const list = agList || agreements;
    const agreement = list.find((a) => a.id === agId);
    if (!agreement) return;

    try {
      const parsedItems: AgreementItem[] =
        typeof agreement.items === 'string'
          ? JSON.parse(agreement.items)
          : agreement.items;

      if (Array.isArray(parsedItems) && parsedItems.length > 0) {
        const invoiceItems: InvoiceItem[] = parsedItems.map((ai, index) => {
          const qty = ai.qty || ai.quantity || 1;
          const unitPrice = ai.unitPrice || 0;
          const vat = 15;
          const subtotal = qty * unitPrice;
          const total = subtotal + subtotal * (vat / 100);

          // Resolve item name: use itemName/name first, then look up itemId in system items
          let itemName = ai.itemName || ai.name || '';
          if (!itemName && ai.itemId) {
            const found = systemItems.find(si => si.id === ai.itemId);
            itemName = found ? found.name : ai.itemId;
          }

          return {
            id: index + 1,
            item: itemName,
            qty,
            unitPrice,
            vat,
            total,
          };
        });
        setItems(invoiceItems);
      }
    } catch (err) {
      console.error('Failed to parse agreement items:', err);
    }
  };

  const handleAddItem = () => {
    const newId = Math.max(...items.map((i) => i.id), 0) + 1;
    setItems([...items, { id: newId, item: '', qty: 1, unitPrice: 0, vat: 15, total: 0 }]);
  };

  const handleRemoveItem = (id: number) => {
    if (items.length <= 1) return;
    setItems(items.filter((i) => i.id !== id));
  };

  const handleItemChange = (id: number, field: string, value: any) => {
    setItems(
      items.map((item) => {
        if (item.id === id) {
          const updated = { ...item, [field]: value };
          if (field === 'qty' || field === 'unitPrice' || field === 'vat') {
            const subtotal = updated.qty * updated.unitPrice;
            updated.total = subtotal + (subtotal * updated.vat) / 100;
          }
          return updated;
        }
        return item;
      })
    );
  };

  // Calculations
  const subtotal = items.reduce((sum, item) => sum + item.qty * item.unitPrice, 0);
  const totalVAT = items.reduce((sum, item) => {
    const itemSubtotal = item.qty * item.unitPrice;
    return sum + (itemSubtotal * item.vat) / 100;
  }, 0);
  const grossTotal = subtotal + totalVAT;
  const withholdRate = selectedCustomer?.withholdRate || 2;
  const withholdAmount = applyWithholding ? subtotal * (withholdRate / 100) : 0;
  const totalAmount = grossTotal - withholdAmount;

  // Can save?
  const hasAgreement = agreements.length > 0 && agreementId;
  const noAgreementExists = !loadingAgreements && customerId && agreements.length === 0;

  const handleSave = async () => {
    if (!customerId) {
      alert('Please select a customer');
      return;
    }

    if (!agreementId) {
      alert('Please select a customer agreement. An active agreement is required to create an invoice.');
      return;
    }

    if (items.length === 0 || items.some((i) => !i.item)) {
      alert('Please ensure all items have names');
      return;
    }

    setSaving(true);
    try {
      const res = await fetch('/api/sales/invoices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerId,
          salesOrderId: agreementId,
          items: JSON.stringify(items),
          subtotal,
          vatRate: 15,
          vatAmount: totalVAT,
          withholding: withholdAmount,
          totalAmount,
          dueDate: dueDate || undefined,
          division: selectedCustomer?.division || 'CONSTRUCTION',
          status: 'Unpaid',
        }),
      });
      const d = await res.json();
      if (!d.success) {
        alert(d.error || 'Failed to save invoice');
        return;
      }
      router.push('/dashboard/sales/invoices');
    } catch {
      alert('Failed to save invoice');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6 max-w-5xl">
      <div>
        <Link
          href="/dashboard/sales/invoices"
          className="text-blue-600 hover:text-blue-800 text-sm font-medium"
        >
          &larr; Back to Invoices
        </Link>
        <h1 className="text-2xl sm:text-3xl font-bold text-[#1D1D1F] mt-4">New Invoice</h1>
        <p className="text-slate-500 text-sm mt-1">Create an invoice from a customer agreement</p>
      </div>

      {/* Step 1: Customer & Agreement */}
      <Card>
        <CardHeader>
          <h2 className="text-lg font-semibold text-[#1D1D1F]">1. Customer & Agreement</h2>
        </CardHeader>
        <CardBody className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Customer *</label>
              <select
                value={customerId}
                onChange={(e) => {
                  setCustomerId(e.target.value);
                  setAgreementId('');
                  setItems([]);
                }}
                disabled={loadingCustomers}
                className="block w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
              >
                <option value="">Select Customer</option>
                {customers.map((c) => (
                  <option key={c.customerId} value={c.customerId}>
                    {c.companyName} — {c.agreementNo}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Due Date</label>
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="block w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
              />
            </div>
          </div>

          {/* Agreement Selection - Required */}
          {customerId && (
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Customer Agreement *
              </label>
              {loadingAgreements ? (
                <p className="text-blue-600 text-sm">Loading agreements...</p>
              ) : noAgreementExists ? (
                <div className="bg-red-50 border border-red-300 rounded-xl p-4">
                  <p className="text-red-700 font-semibold text-sm">
                    No active agreement found for this customer.
                  </p>
                  <p className="text-red-600 text-xs mt-1">
                    You must create a Sales Agreement before generating an invoice.
                    Invoices cannot be saved without a valid agreement.
                  </p>
                  <Link
                    href="/dashboard/sales/agreements/new"
                    className="inline-block mt-3 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 text-sm font-medium"
                  >
                    + Create Agreement for this Customer
                  </Link>
                </div>
              ) : (
                <>
                  <select
                    value={agreementId}
                    onChange={(e) => handleAgreementSelect(e.target.value)}
                    className="block w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                    required
                  >
                    <option value="">Select Agreement</option>
                    {agreements.map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.agreementNo} — ETB {(a.totalAmount ?? 0).toLocaleString('en-US')} ({a.status}) — Valid: {new Date(a.validFrom).toLocaleDateString()} to {new Date(a.validTo).toLocaleDateString()}
                      </option>
                    ))}
                  </select>
                  <p className="mt-1 text-xs text-slate-500">
                    Selecting an agreement will auto-populate the invoice items and prices
                  </p>
                </>
              )}
            </div>
          )}

          {/* Customer Info Panel */}
          {selectedCustomer && agreementId && (
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                <div>
                  <span className="text-blue-600 font-medium block">Customer</span>
                  <span className="text-slate-900">{selectedCustomer.companyName}</span>
                </div>
                <div>
                  <span className="text-blue-600 font-medium block">TIN</span>
                  <span className="text-slate-900">{selectedCustomer.tin || '—'}</span>
                </div>
                <div>
                  <span className="text-blue-600 font-medium block">Withholding</span>
                  <span className="text-slate-900">
                    {selectedCustomer.withholding ? `Yes (${selectedCustomer.withholdRate || 2}%)` : 'No'}
                  </span>
                </div>
                <div>
                  <span className="text-blue-600 font-medium block">Agreement</span>
                  <span className="text-slate-900">{selectedAgreement?.agreementNo || '—'}</span>
                </div>
              </div>
            </div>
          )}
        </CardBody>
      </Card>

      {/* Step 2: Items Table (only show when agreement selected) */}
      {agreementId && items.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex justify-between items-center">
              <h2 className="text-lg font-semibold text-[#1D1D1F]">2. Invoice Items</h2>
              <Button variant="secondary" size="sm" onClick={handleAddItem}>
                + Add Item
              </Button>
            </div>
          </CardHeader>
          <CardBody>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-200">
                    <th className="text-left py-2 px-2 text-xs font-semibold text-slate-500 uppercase">Item</th>
                    <th className="text-left py-2 px-2 text-xs font-semibold text-slate-500 uppercase">Qty</th>
                    <th className="text-left py-2 px-2 text-xs font-semibold text-slate-500 uppercase">Unit Price</th>
                    <th className="text-left py-2 px-2 text-xs font-semibold text-slate-500 uppercase">VAT %</th>
                    <th className="text-left py-2 px-2 text-xs font-semibold text-slate-500 uppercase">Total (incl. VAT)</th>
                    <th className="text-left py-2 px-2 text-xs font-semibold text-slate-500 uppercase">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item) => (
                    <tr key={item.id} className="border-b border-slate-100">
                      <td className="py-3 px-2">
                        <Input
                          placeholder="Item name"
                          value={item.item}
                          onChange={(e) => handleItemChange(item.id, 'item', e.target.value)}
                        />
                      </td>
                      <td className="py-3 px-2">
                        <input
                          type="number"
                          min="0.01"
                          step="0.01"
                          value={item.qty}
                          onChange={(e) =>
                            handleItemChange(item.id, 'qty', parseFloat(e.target.value) || 0)
                          }
                          className="w-20 rounded-xl border border-slate-300 px-2 py-1.5 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                        />
                      </td>
                      <td className="py-3 px-2">
                        <input
                          type="number"
                          step="0.01"
                          value={item.unitPrice}
                          onChange={(e) =>
                            handleItemChange(item.id, 'unitPrice', parseFloat(e.target.value) || 0)
                          }
                          className="w-28 rounded-xl border border-slate-300 px-2 py-1.5 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                        />
                      </td>
                      <td className="py-3 px-2">
                        <input
                          type="number"
                          min="0"
                          max="100"
                          value={item.vat}
                          onChange={(e) =>
                            handleItemChange(item.id, 'vat', parseInt(e.target.value) || 0)
                          }
                          className="w-16 rounded-xl border border-slate-300 px-2 py-1.5 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                        />
                      </td>
                      <td className="py-3 px-2 text-sm font-medium text-slate-900">
                        ETB {(item.total ?? 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                      <td className="py-3 px-2">
                        <button
                          onClick={() => handleRemoveItem(item.id)}
                          className="text-red-500 hover:text-red-700 text-xs font-medium"
                        >
                          Remove
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardBody>
        </Card>
      )}

      {/* Step 3: VAT & Totals (only show when items exist) */}
      {agreementId && items.length > 0 && (
        <Card>
          <CardHeader>
            <h2 className="text-lg font-semibold text-[#1D1D1F]">3. VAT & Totals</h2>
          </CardHeader>
          <CardBody>
            <div className="max-w-md ml-auto space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-slate-600">Subtotal (excl. VAT):</span>
                <span className="font-medium text-slate-900">
                  ETB {subtotal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>

              <div className="flex justify-between text-sm">
                <span className="text-slate-600">VAT (15%):</span>
                <span className="font-medium text-blue-600">
                  + ETB {totalVAT.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>

              <div className="flex justify-between text-sm border-t pt-2">
                <span className="text-slate-900 font-medium">Gross Total:</span>
                <span className="font-semibold text-slate-900">
                  ETB {grossTotal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>

              {/* Withholding Tax */}
              {selectedCustomer?.withholding && (
                <div className="border-t pt-3 space-y-2">
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={applyWithholding}
                      onChange={(e) => setApplyWithholding(e.target.checked)}
                      className="rounded border-slate-300"
                    />
                    <span className="text-slate-700">
                      Apply Withholding Tax ({withholdRate}%)
                    </span>
                  </label>
                  {applyWithholding && (
                    <div className="flex justify-between text-sm">
                      <span className="text-red-600">Withholding ({withholdRate}% of subtotal):</span>
                      <span className="font-medium text-red-600">
                        - ETB {withholdAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </span>
                    </div>
                  )}
                </div>
              )}

              <div className="border-t border-slate-900 pt-3">
                <div className="flex justify-between">
                  <span className="text-lg font-bold text-slate-900">Net Payable:</span>
                  <span className="text-2xl font-bold text-[#007AFF]">
                    ETB {totalAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>
              </div>

              {/* VAT Info Box */}
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 mt-4">
                <p className="text-xs text-amber-800 font-medium">VAT Note</p>
                <p className="text-xs text-amber-700 mt-1">
                  This invoice VAT of ETB {totalVAT.toLocaleString('en-US', { minimumFractionDigits: 2 })} will be recorded as
                  Output VAT for the current filing period. View VAT reports under Finance &rarr; VAT Management.
                </p>
              </div>
            </div>
          </CardBody>
        </Card>
      )}

      {/* Actions */}
      <div className="flex gap-3">
        <Button
          variant="primary"
          size="lg"
          onClick={handleSave}
          isLoading={saving}
          disabled={!customerId || !agreementId || items.length === 0 || noAgreementExists}
          className="flex-1"
        >
          {noAgreementExists ? 'Cannot Save — No Agreement' : 'Save Invoice'}
        </Button>
        <Button
          variant="outline"
          size="lg"
          onClick={() => router.push('/dashboard/sales/invoices')}
          className="flex-1"
        >
          Cancel
        </Button>
      </div>
    </div>
  );
}
