'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardHeader, CardBody, CardFooter, Button, Input } from '@/components/ui';

interface Customer {
  id: string;
  companyName: string;
}

interface Item {
  id: string;
  code: string;
  name: string;
  unit: string;
}

interface AgreementItemRow {
  id: number;
  itemId: string;
  qty: string;
  unit: string;
  unitPrice: string;
  priceType: 'excl' | 'incl';
}

interface FormErrors {
  [key: string]: string;
}

export default function NewSalesAgreementPage() {
  const router = useRouter();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [items, setItems] = useState<Item[]>([]);
  const [customersLoading, setCustomersLoading] = useState(true);
  const [itemsLoading, setItemsLoading] = useState(true);

  const [formData, setFormData] = useState({
    customerId: '',
    division: 'CONSTRUCTION',
    validFrom: '',
    validTo: '',
    terms: '',
  });

  const [offloadingSites, setOffloadingSites] = useState<string[]>(['']);

  const [agreementItems, setAgreementItems] = useState<AgreementItemRow[]>([
    { id: 1, itemId: '', qty: '', unit: '', unitPrice: '', priceType: 'excl' },
  ]);

  const [errors, setErrors] = useState<FormErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const fetchCustomers = async () => {
      try {
        const res = await fetch('/api/customers');
        const data = await res.json();
        if (data.success) {
          setCustomers(data.data || []);
        }
      } catch (error) {
        console.error('Error fetching customers:', error);
      } finally {
        setCustomersLoading(false);
      }
    };

    const fetchItems = async () => {
      try {
        const res = await fetch('/api/items?limit=1000');
        const data = await res.json();
        if (data.success) {
          setItems(data.data || []);
        }
      } catch (error) {
        console.error('Error fetching items:', error);
      } finally {
        setItemsLoading(false);
      }
    };

    fetchCustomers();
    fetchItems();
  }, []);

  const calculateTotals = () => {
    let subtotal = 0;
    let vatAmount = 0;
    let grandTotal = 0;

    agreementItems.forEach((item) => {
      const qty = parseFloat(item.qty) || 0;
      const price = parseFloat(item.unitPrice) || 0;
      if (item.priceType === 'incl') {
        const total = qty * price;
        const itemSubtotal = total / 1.15;
        const itemVat = total - itemSubtotal;
        subtotal += itemSubtotal;
        vatAmount += itemVat;
        grandTotal += total;
      } else {
        const itemSubtotal = qty * price;
        const itemVat = itemSubtotal * 0.15;
        subtotal += itemSubtotal;
        vatAmount += itemVat;
        grandTotal += itemSubtotal + itemVat;
      }
    });

    return { subtotal, vatAmount, grandTotal };
  };

  const calculateTotalAmount = (): number => {
    return calculateTotals().grandTotal;
  };

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));

    if (errors[name]) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }
  };

  const handleItemChange = (id: number, changes: Partial<AgreementItemRow>) => {
    setAgreementItems((prevItems) =>
      prevItems.map((item) =>
        item.id === id ? { ...item, ...changes } : item
      )
    );
  };

  const handleAddItem = () => {
    const newId = Math.max(...agreementItems.map((i) => i.id), 0) + 1;
    setAgreementItems([
      ...agreementItems,
      { id: newId, itemId: '', qty: '', unit: '', unitPrice: '', priceType: 'excl' },
    ]);
  };

  const handleRemoveItem = (id: number) => {
    if (agreementItems.length > 1) {
      setAgreementItems(agreementItems.filter((item) => item.id !== id));
    }
  };

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};

    if (!formData.customerId) {
      newErrors.customerId = 'Customer is required';
    }
    if (!formData.division) {
      newErrors.division = 'Division is required';
    }
    if (!formData.validFrom) {
      newErrors.validFrom = 'Valid From date is required';
    }
    if (!formData.validTo) {
      newErrors.validTo = 'Valid To date is required';
    }

    const hasValidItems = agreementItems.some(
      (item) => item.itemId && item.qty && item.unitPrice
    );
    if (!hasValidItems) {
      newErrors.items = 'At least one item with qty and price is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);
    try {
      const itemsData = agreementItems
        .filter((item) => item.itemId && item.qty && item.unitPrice)
        .map((item) => ({
          itemId: item.itemId,
          qty: parseFloat(item.qty),
          unit: item.unit,
          unitPrice: parseFloat(item.unitPrice),
          priceType: item.priceType,
        }));

      const submitData = {
        customerId: formData.customerId,
        division: formData.division,
        items: JSON.stringify(itemsData),
        totalAmount: calculateTotalAmount(),
        validFrom: formData.validFrom,
        validTo: formData.validTo,
        terms: formData.terms,
        offloadingSite: offloadingSites.filter(s => s.trim()).join(' | ') || null,
      };

      const res = await fetch('/api/sales/agreements', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(submitData),
      });

      const data = await res.json();
      if (!data.success) {
        throw new Error(data.error || 'Failed to create agreement');
      }

      alert('Sales Agreement created successfully!');
      router.push('/dashboard/sales/agreements');
    } catch (error) {
      console.error('Error submitting form:', error);
      setErrors({ submit: 'Failed to create agreement' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    router.push('/dashboard/sales/agreements');
  };

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-slate-600">
        <button
          onClick={handleCancel}
          className="text-blue-600 hover:text-blue-700 font-medium"
        >
          Sales Agreements
        </button>
        <span>/</span>
        <span className="text-slate-900 font-medium">New Agreement</span>
      </div>

      {/* Page Header */}
      <div>
        <h1 className="text-3xl font-bold text-slate-900">Create New Sales Agreement</h1>
        <p className="text-slate-600 mt-2">
          Fill in the details below to create a new sales agreement
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Agreement Details Section */}
        <Card>
          <CardHeader>
            <h2 className="text-xl font-bold text-slate-900">Agreement Details</h2>
          </CardHeader>
          <CardBody className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-slate-900 mb-3">
                  Customer {errors.customerId && <span className="text-red-500">*</span>}
                </label>
                <select
                  name="customerId"
                  value={formData.customerId}
                  onChange={handleInputChange}
                  disabled={customersLoading}
                  className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900 ${
                    errors.customerId ? 'border-red-500' : 'border-slate-300'
                  }`}
                >
                  <option value="">
                    {customersLoading ? 'Loading customers...' : 'Select Customer'}
                  </option>
                  {customers.map((customer) => (
                    <option key={customer.id} value={customer.id}>
                      {customer.companyName}
                    </option>
                  ))}
                </select>
                {errors.customerId && (
                  <p className="text-red-500 text-sm mt-1">{errors.customerId}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-900 mb-3">
                  Division {errors.division && <span className="text-red-500">*</span>}
                </label>
                <select
                  name="division"
                  value={formData.division}
                  onChange={handleInputChange}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900"
                >
                  <option value="CONSTRUCTION">Construction</option>
                  <option value="CEMENT">Cement</option>
                  <option value="AGGREGATE">Aggregate</option>
                  <option value="MEDICAL">Medical</option>
                  <option value="GENERAL">General</option>
                  <option value="BOTH">Both</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-900 mb-3">
                  Valid From {errors.validFrom && <span className="text-red-500">*</span>}
                </label>
                <input
                  type="date"
                  name="validFrom"
                  value={formData.validFrom}
                  onChange={handleInputChange}
                  className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900 ${
                    errors.validFrom ? 'border-red-500' : 'border-slate-300'
                  }`}
                />
                {errors.validFrom && (
                  <p className="text-red-500 text-sm mt-1">{errors.validFrom}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-900 mb-3">
                  Valid To {errors.validTo && <span className="text-red-500">*</span>}
                </label>
                <input
                  type="date"
                  name="validTo"
                  value={formData.validTo}
                  onChange={handleInputChange}
                  className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900 ${
                    errors.validTo ? 'border-red-500' : 'border-slate-300'
                  }`}
                />
                {errors.validTo && (
                  <p className="text-red-500 text-sm mt-1">{errors.validTo}</p>
                )}
              </div>
            </div>

            <div>
              <div className="flex justify-between items-center mb-3">
                <label className="block text-sm font-medium text-slate-900">
                  Offloading Sites (Destinations)
                </label>
                <button
                  type="button"
                  onClick={() => setOffloadingSites([...offloadingSites, ''])}
                  className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                >
                  + Add Site
                </button>
              </div>
              <div className="space-y-2">
                {offloadingSites.map((site, idx) => (
                  <div key={idx} className="flex gap-2">
                    <input
                      type="text"
                      value={site}
                      onChange={(e) => {
                        const updated = [...offloadingSites];
                        updated[idx] = e.target.value;
                        setOffloadingSites(updated);
                      }}
                      placeholder={`Destination ${idx + 1} — e.g., Customer Warehouse, Bole`}
                      className="flex-1 px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900"
                    />
                    {offloadingSites.length > 1 && (
                      <button
                        type="button"
                        onClick={() => setOffloadingSites(offloadingSites.filter((_, i) => i !== idx))}
                        className="text-red-500 hover:text-red-700 text-sm font-medium px-2"
                      >
                        Remove
                      </button>
                    )}
                  </div>
                ))}
              </div>
              <p className="text-xs text-slate-500 mt-1">Where goods will be delivered. These will appear in transport agreements.</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-900 mb-3">Terms</label>
              <textarea
                name="terms"
                value={formData.terms}
                onChange={handleInputChange}
                placeholder="Agreement terms and conditions..."
                rows={3}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900"
              />
            </div>
          </CardBody>
        </Card>

        {/* Items Section */}
        <Card>
          <CardHeader>
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-bold text-slate-900">Items</h2>
              <Button type="button" variant="secondary" size="sm" onClick={handleAddItem}>
                + Add Item
              </Button>
            </div>
          </CardHeader>
          <CardBody>
            {errors.items && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4 text-red-700 text-sm">
                {errors.items}
              </div>
            )}
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-3 px-3 text-sm font-semibold text-slate-900 w-[30%]">
                      Item
                    </th>
                    <th className="text-left py-3 px-3 text-sm font-semibold text-slate-900 w-[10%]">
                      Qty
                    </th>
                    <th className="text-left py-3 px-3 text-sm font-semibold text-slate-900 w-[12%]">
                      Unit
                    </th>
                    <th className="text-left py-3 px-3 text-sm font-semibold text-slate-900 w-[14%]">
                      Unit Price (ETB)
                    </th>
                    <th className="text-left py-3 px-3 text-sm font-semibold text-slate-900 w-[16%]">
                      Price Type
                    </th>
                    <th className="text-left py-3 px-3 text-sm font-semibold text-slate-900 w-[10%]">
                      Action
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {agreementItems.map((item) => (
                    <tr key={item.id} className="border-b">
                      <td className="py-3 px-3">
                        <select
                          value={item.itemId}
                          onChange={(e) => {
                            const selectedItem = items.find((i) => i.id === e.target.value);
                            handleItemChange(item.id, {
                              itemId: e.target.value,
                              unit: selectedItem?.unit || item.unit
                            });
                          }}
                          disabled={itemsLoading}
                          className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900 text-sm"
                        >
                          <option value="">
                            {itemsLoading ? 'Loading items...' : 'Select Item'}
                          </option>
                          {items.map((masterItem) => (
                            <option key={masterItem.id} value={masterItem.id}>
                              {masterItem.code} - {masterItem.name}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="py-3 px-3">
                        <input
                          type="number"
                          step="0.01"
                          value={item.qty}
                          onChange={(e) => handleItemChange(item.id, { qty: e.target.value })}
                          placeholder="0.00"
                          className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900 text-sm"
                        />
                      </td>
                      <td className="py-3 px-3">
                        <select
                          value={item.unit}
                          onChange={(e) => handleItemChange(item.id, { unit: e.target.value })}
                          className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900 text-sm"
                        >
                          <option value="">Select</option>
                          <option value="Ton">Ton</option>
                          <option value="m3">m3</option>
                          <option value="QT">Quintal (QT)</option>
                          <option value="Kg">Kg</option>
                          <option value="Pieces">Pieces</option>
                        </select>
                      </td>
                      <td className="py-3 px-3">
                        <input
                          type="number"
                          step="0.01"
                          value={item.unitPrice}
                          onChange={(e) => handleItemChange(item.id, { unitPrice: e.target.value })}
                          placeholder="0.00"
                          className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900 text-sm"
                        />
                      </td>
                      <td className="py-3 px-3">
                        <select
                          value={item.priceType}
                          onChange={(e) => handleItemChange(item.id, { priceType: e.target.value as 'excl' | 'incl' })}
                          className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900 text-sm"
                        >
                          <option value="excl">Excl. VAT</option>
                          <option value="incl">Incl. VAT (15%)</option>
                        </select>
                      </td>
                      <td className="py-3 px-3">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => handleRemoveItem(item.id)}
                          disabled={agreementItems.length === 1}
                        >
                          Remove
                        </Button>
              </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Total Amount Summary */}
            {(() => {
              const totals = calculateTotals();
              return (
                <div className="mt-6 flex justify-end">
                  <div className="text-right space-y-1 bg-slate-50 border border-slate-200 rounded-lg p-4 min-w-[280px]">
                    <div className="text-sm text-slate-600 flex justify-between gap-4">
                      <span>Subtotal:</span>
                      <span className="font-medium text-slate-900">ETB {totals.subtotal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                    </div>
                    <div className="text-sm text-slate-600 flex justify-between gap-4">
                      <span>VAT (15%):</span>
                      <span className="font-medium text-slate-900">ETB {totals.vatAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                    </div>
                    <div className="text-base font-bold text-slate-900 flex justify-between gap-4 border-t border-slate-200 pt-2 mt-2">
                      <span>Total Amount:</span>
                      <span>ETB {totals.grandTotal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                    </div>
                  </div>
                </div>
              );
            })()}
          </CardBody>
        </Card>

        {/* Buttons */}
        <Card>
          <CardFooter>
            <div className="flex gap-4">
              <Button type="submit" variant="primary" size="lg" isLoading={isSubmitting}>
                Save Agreement
              </Button>
              <Button type="button" variant="outline" size="lg" onClick={handleCancel}>
                Cancel
              </Button>
            </div>
          </CardFooter>
        </Card>

        {errors.submit && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">
            {errors.submit}
          </div>
        )}
      </form>
    </div>
  );
}
