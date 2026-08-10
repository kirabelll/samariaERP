'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardHeader, CardBody, CardFooter, Button, Input, Select } from '@/components/ui';

interface Supplier {
  id: string;
  companyName: string;
  code?: string;
}

interface Item {
  id: string;
  code: string;
  name: string;
  unit: string;
}

interface AgreementItemRow {
  id: number;
  type: 'regular' | 'service';
  itemId?: string;
  itemName?: string;
  qty?: string;
  unit?: string;
  unitPrice?: string;
  priceType?: 'excl' | 'incl';
  description?: string;
  amount?: string;
}

interface FormErrors {
  [key: string]: string;
}

export default function NewSupplierAgreementPage() {
  const router = useRouter();
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [items, setItems] = useState<Item[]>([]);
  const [suppliersLoading, setSuppliersLoading] = useState(true);
  const [itemsLoading, setItemsLoading] = useState(true);

  const [formData, setFormData] = useState({
    supplierId: '',
    division: 'CONSTRUCTION',
    validFrom: '',
    validTo: '',
    terms: '',
    loadingSite: '',
    offloadingSite: '',
  });

  const [agreementItems, setAgreementItems] = useState<AgreementItemRow[]>([
    { id: 1, type: 'regular', itemId: '', qty: '', unit: '', unitPrice: '', priceType: 'excl' },
  ]);

  const [errors, setErrors] = useState<FormErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const fetchSuppliers = async () => {
      try {
        const res = await fetch('/api/suppliers?limit=1000&status=Active');
        const data = await res.json();
        if (data.success) {
          setSuppliers(data.data || []);
        }
      } catch (error) {
        console.error('Error fetching suppliers:', error);
      } finally {
        setSuppliersLoading(false);
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

    fetchSuppliers();
    fetchItems();
  }, []);

  const calculateTotals = () => {
    let subtotal = 0;
    let vatAmount = 0;
    let grandTotal = 0;

    agreementItems.forEach((item) => {
      if (item.type === 'regular') {
        const qty = parseFloat(item.qty || '0') || 0;
        const price = parseFloat(item.unitPrice || '0') || 0;
        const itemSubtotal = qty * price;

        if (item.priceType === 'incl') {
          const itemVat = itemSubtotal * 0.15;
          subtotal += itemSubtotal;
          vatAmount += itemVat;
          grandTotal += itemSubtotal + itemVat;
        } else {
          subtotal += itemSubtotal;
          grandTotal += itemSubtotal;
        }
      } else {
        const amt = parseFloat(item.amount || '0') || 0;
        subtotal += amt;
        grandTotal += amt;
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
      { id: newId, type: 'regular', itemId: '', qty: '', unit: '', unitPrice: '', priceType: 'excl' },
    ]);
  };

  const handleAddService = () => {
    const newId = Math.max(...agreementItems.map((i) => i.id), 0) + 1;
    setAgreementItems([
      ...agreementItems,
      { id: newId, type: 'service', description: '', amount: '' },
    ]);
  };

  const handleRemoveItem = (id: number) => {
    if (agreementItems.length > 1) {
      setAgreementItems(agreementItems.filter((item) => item.id !== id));
    }
  };

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};

    if (!formData.supplierId) {
      newErrors.supplierId = 'Supplier is required';
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

    if (formData.validFrom && formData.validTo) {
      const from = new Date(formData.validFrom);
      const to = new Date(formData.validTo);
      if (to <= from) {
        newErrors.validTo = 'Valid To must be after Valid From';
      }
    }

    const hasValidItem = agreementItems.some((item) => {
      if (item.type === 'regular') {
        return item.itemId && item.qty && item.unitPrice;
      } else {
        return item.description && item.amount;
      }
    });

    if (!hasValidItem) {
      newErrors.items = 'At least one valid item or service is required';
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
        .filter((item) => {
          if (item.type === 'regular') {
            return item.itemId && item.qty && item.unitPrice;
          } else {
            return item.description && item.amount;
          }
        })
        .map((item) => {
          if (item.type === 'regular') {
            const qty = parseFloat(item.qty || '0');
            const unitPrice = parseFloat(item.unitPrice || '0');
            let amount = qty * unitPrice;
            if (item.priceType === 'incl') {
              const subtotal = qty * (unitPrice / 1.15);
              const vat = subtotal * 0.15;
              amount = subtotal + vat;
            }
            return {
              type: 'regular',
              itemId: item.itemId,
              itemName: items.find((i) => i.id === item.itemId)?.name || item.itemName,
              qty,
              unit: item.unit,
              unitPrice,
              priceType: item.priceType || 'excl',
              amount,
            };
          } else {
            return {
              type: 'service',
              description: item.description,
              amount: parseFloat(item.amount || '0'),
            };
          }
        });

      const submitData = {
        supplierId: formData.supplierId,
        division: formData.division,
        items: itemsData,
        totalAmount: calculateTotalAmount(),
        validFrom: formData.validFrom,
        validTo: formData.validTo,
        terms: formData.terms,
        loadingSite: formData.loadingSite,
        offloadingSite: formData.offloadingSite,
      };

      const res = await fetch('/api/supplier-agreements', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(submitData),
      });

      const data = await res.json();
      if (!data.success) {
        throw new Error(data.error || 'Failed to create agreement');
      }

      alert('Supplier Agreement created successfully!');
      router.push('/dashboard/supplier-agreements');
    } catch (error) {
      console.error('Error submitting form:', error);
      setErrors({ submit: 'Failed to create agreement' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    router.push('/dashboard/supplier-agreements');
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 text-sm text-slate-600">
        <button
          onClick={handleCancel}
          className="text-blue-600 hover:text-blue-700 font-medium"
        >
          Supplier Agreements
        </button>
        <span>/</span>
        <span className="text-slate-900 font-medium">New Agreement</span>
      </div>

      <div>
        <h1 className="text-3xl font-bold text-slate-900">Create New Supplier Agreement</h1>
        <p className="text-slate-600 mt-2">
          Fill in the details below to create a new supplier agreement
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card>
          <CardHeader>
            <h2 className="text-xl font-bold text-slate-900">Agreement Details</h2>
          </CardHeader>
          <CardBody className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-slate-900 mb-3">
                  Supplier {errors.supplierId && <span className="text-red-500">*</span>}
                </label>
                <select
                  name="supplierId"
                  value={formData.supplierId}
                  onChange={handleInputChange}
                  disabled={suppliersLoading}
                  className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900 ${
                    errors.supplierId ? 'border-red-500' : 'border-slate-300'
                  }`}
                >
                  <option value="">
                    {suppliersLoading ? 'Loading suppliers...' : 'Select Supplier'}
                  </option>
                  {suppliers.map((supplier) => (
                    <option key={supplier.id} value={supplier.id}>
                      {supplier.companyName}
                      {supplier.code ? ` (${supplier.code})` : ''}
                    </option>
                  ))}
                </select>
                {errors.supplierId && (
                  <p className="text-red-500 text-sm mt-1">{errors.supplierId}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-900 mb-3">
                  Division
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

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-slate-900 mb-3">
                  Loading Site (Origin)
                </label>
                <input
                  type="text"
                  name="loadingSite"
                  value={formData.loadingSite}
                  onChange={handleInputChange}
                  placeholder="e.g., Addis Ababa Quarry, Dire Dawa Factory"
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900"
                />
                <p className="text-xs text-slate-500 mt-1">Where materials are loaded/picked up from the supplier</p>
              </div>
              {/* Offloading site is managed in Sales Agreements, not here */}
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

        <Card>
          <CardHeader>
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-bold text-slate-900">Items & Services</h2>
              <div className="flex gap-2">
                <Button type="button" variant="secondary" size="sm" onClick={handleAddItem}>
                  + Add Item
                </Button>
                <Button type="button" variant="secondary" size="sm" onClick={handleAddService}>
                  + Add Service
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardBody>
            {errors.items && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4 text-red-700 text-sm">
                {errors.items}
              </div>
            )}
            <div className="space-y-4">
              {agreementItems.map((item) => (
                <div key={item.id} className="border border-slate-200 rounded-lg p-4">
                  {item.type === 'regular' ? (
                    <div>
                      <div className="flex justify-between items-center mb-3">
                        <span className="text-sm font-semibold text-slate-700">Regular Item</span>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => handleRemoveItem(item.id)}
                          disabled={agreementItems.length === 1}
                        >
                          Remove
                        </Button>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-slate-700 mb-2">
                            Item
                          </label>
                          <select
                            value={item.itemId || ''}
                            onChange={(e) => {
                              const selectedItem = items.find((i) => i.id === e.target.value);
                              handleItemChange(item.id, {
                                itemId: e.target.value,
                                unit: selectedItem?.unit || '',
                              });
                            }}
                            disabled={itemsLoading}
                            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900 text-sm"
                          >
                            <option value="">
                              {itemsLoading ? 'Loading...' : 'Select Item'}
                            </option>
                            {items.map((masterItem) => (
                              <option key={masterItem.id} value={masterItem.id}>
                                {masterItem.code} - {masterItem.name}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-slate-700 mb-2">
                            Qty
                          </label>
                          <input
                            type="number"
                            step="0.01"
                            value={item.qty || ''}
                            onChange={(e) => handleItemChange(item.id, { qty: e.target.value })}
                            placeholder="0.00"
                            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900 text-sm"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-slate-700 mb-2">
                            Unit
                          </label>
                          <input
                            type="text"
                            value={item.unit || ''}
                            disabled
                            className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-slate-100 text-slate-600 text-sm"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-slate-700 mb-2">
                            Unit Price (ETB)
                          </label>
                          <input
                            type="number"
                            step="0.01"
                            value={item.unitPrice || ''}
                            onChange={(e) => handleItemChange(item.id, { unitPrice: e.target.value })}
                            placeholder="0.00"
                            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900 text-sm"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-slate-700 mb-2">
                            VAT Type
                          </label>
                          <select
                            value={item.priceType || 'excl'}
                            onChange={(e) => handleItemChange(item.id, { priceType: e.target.value as 'excl' | 'incl' })}
                            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900 text-sm"
                          >
                            <option value="excl">Excl. VAT</option>
                            <option value="incl">Incl. VAT (15%)</option>
                          </select>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div>
                      <div className="flex justify-between items-center mb-3">
                        <span className="text-sm font-semibold text-slate-700">Service</span>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => handleRemoveItem(item.id)}
                          disabled={agreementItems.length === 1}
                        >
                          Remove
                        </Button>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="md:col-span-2">
                          <label className="block text-sm font-medium text-slate-700 mb-2">
                            Description
                          </label>
                          <input
                            type="text"
                            value={item.description || ''}
                            onChange={(e) => handleItemChange(item.id, { description: e.target.value })}
                            placeholder="Service description"
                            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900 text-sm"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-slate-700 mb-2">
                            Amount (ETB)
                          </label>
                          <input
                            type="number"
                            step="0.01"
                            value={item.amount || ''}
                            onChange={(e) => handleItemChange(item.id, { amount: e.target.value })}
                            placeholder="0.00"
                            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900 text-sm"
                          />
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ))}
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
