'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
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
  description?: string;
  amount?: string;
}

interface FormErrors {
  [key: string]: string;
}

export default function EditSupplierAgreementPage() {
  const router = useRouter();
  const params = useParams();
  const recordId = params?.id as string;

  const [data, setData] = useState<any>(null);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [suppliersLoading, setSuppliersLoading] = useState(true);
  const [itemsLoading, setItemsLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState<any>({});
  const [agreementItems, setAgreementItems] = useState<AgreementItemRow[]>([]);
  const [errors, setErrors] = useState<FormErrors>({});

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const response = await fetch(`/api/supplier-agreements/${recordId}`);
        const result = await response.json();

        if (!response.ok || !result.success) {
          throw new Error(result.error || 'Failed to fetch record');
        }

        setData(result.data);
        setFormData({
          supplierId: result.data.supplierId,
          division: result.data.division,
          validFrom: result.data.validFrom?.split('T')[0],
          validTo: result.data.validTo?.split('T')[0],
          terms: result.data.terms || '',
          loadingSite: result.data.loadingSite || '',
          offloadingSite: result.data.offloadingSite || '',
        });

        // Parse items
        if (result.data.items) {
          try {
            const parsedItems = typeof result.data.items === 'string'
              ? JSON.parse(result.data.items)
              : result.data.items;

            if (Array.isArray(parsedItems)) {
              const itemRows: AgreementItemRow[] = parsedItems.map((item: any, index: number) => {
                if (item.type === 'service') {
                  return {
                    id: index + 1,
                    type: 'service',
                    description: item.description,
                    amount: item.amount?.toString() || '',
                  };
                } else {
                  return {
                    id: index + 1,
                    type: 'regular',
                    itemId: item.itemId,
                    itemName: item.itemName,
                    qty: item.qty?.toString() || '',
                    unit: item.unit,
                    unitPrice: item.unitPrice?.toString() || '',
                  };
                }
              });
              setAgreementItems(itemRows);
            }
          } catch {
            setAgreementItems([{ id: 1, type: 'regular', itemId: '', qty: '', unit: '', unitPrice: '' }]);
          }
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred');
      } finally {
        setLoading(false);
      }
    };

    const fetchSuppliers = async () => {
      try {
        const res = await fetch('/api/suppliers?limit=1000');
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

    if (recordId) {
      fetchData();
      fetchSuppliers();
      fetchItems();
    }
  }, [recordId]);

  const calculateTotalAmount = (): number => {
    return agreementItems.reduce((sum, item) => {
      if (item.type === 'regular') {
        const qty = parseFloat(item.qty || '0') || 0;
        const price = parseFloat(item.unitPrice || '0') || 0;
        return sum + qty * price;
      } else {
        return sum + (parseFloat(item.amount || '0') || 0);
      }
    }, 0);
  };

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev: any) => ({
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
      { id: newId, type: 'regular', itemId: '', qty: '', unit: '', unitPrice: '' },
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
    if (!formData.validFrom) {
      newErrors.validFrom = 'Valid From date is required';
    }
    if (!formData.validTo) {
      newErrors.validTo = 'Valid To date is required';
    }

    const hasValidItems = agreementItems.some((item) => {
      if (item.type === 'regular') {
        return item.itemId && item.qty && item.unitPrice;
      } else {
        return item.description && item.amount;
      }
    });

    if (!hasValidItems) {
      newErrors.items = 'At least one item or service is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setSubmitting(true);
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
            return {
              type: 'regular',
              itemId: item.itemId,
              itemName: items.find((i) => i.id === item.itemId)?.name || item.itemName,
              qty: parseFloat(item.qty || '0'),
              unit: item.unit,
              unitPrice: parseFloat(item.unitPrice || '0'),
              amount: (parseFloat(item.qty || '0') * parseFloat(item.unitPrice || '0')),
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

      const response = await fetch(`/api/supplier-agreements/${recordId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(submitData),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Failed to update record');
      }

      alert('Supplier Agreement updated successfully!');
      router.push(`/dashboard/supplier-agreements/${recordId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      alert(err instanceof Error ? err.message : 'Failed to update record');
    } finally {
      setSubmitting(false);
    }
  };

  const handleBack = () => {
    router.push(`/dashboard/supplier-agreements/${recordId}`);
  };

  if (loading || suppliersLoading || itemsLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="text-slate-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="space-y-6">
        <button onClick={handleBack} className="text-blue-600 hover:text-blue-800 font-medium">
          ← Back
        </button>
        <Card>
          <CardBody>
            <p className="text-red-600">{error || 'Record not found'}</p>
          </CardBody>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 text-sm text-slate-600">
        <button onClick={handleBack} className="text-blue-600 hover:text-blue-800 font-medium">
          ← Back
        </button>
      </div>

      <div>
        <h1 className="text-3xl font-bold text-slate-900">Edit Supplier Agreement</h1>
        <p className="text-slate-600 mt-2">{data.agreementNo}</p>
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
                  className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900 ${errors.supplierId ? 'border-red-500' : 'border-slate-300'
                    }`}
                >
                  <option value="">Select Supplier</option>
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
                <label className="block text-sm font-medium text-slate-900 mb-3">Division</label>
                <select
                  name="division"
                  value={formData.division}
                  onChange={handleInputChange}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900"
                >
                  <option value="CONSTRUCTION">Construction</option>
                  <option value="cement">Cement</option>
                  <option value="aggregate">Aggregate</option>
                  <option value="general">General</option>
                  <option value="MEDICAL">Medical</option>
                  <option value="Both">Both</option>
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
                  className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900 ${errors.validFrom ? 'border-red-500' : 'border-slate-300'
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
                  className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900 ${errors.validTo ? 'border-red-500' : 'border-slate-300'
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
              {/* Offloading site is managed in Sales Agreements, not supplier agreements */}
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
                      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
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
                            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900 text-sm"
                          >
                            <option value="">Select Item</option>
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

            <div className="mt-6 flex justify-end">
              <div className="text-lg font-semibold text-slate-900">
                Total Amount: ETB {calculateTotalAmount().toFixed(2)}
              </div>
            </div>
          </CardBody>
        </Card>

        <Card>
          <CardFooter>
            <div className="flex gap-4">
              <Button type="submit" variant="primary" size="lg" isLoading={submitting}>
                Save Changes
              </Button>
              <Button type="button" variant="outline" size="lg" onClick={handleBack}>
                Cancel
              </Button>
            </div>
          </CardFooter>
        </Card>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">
            {error}
          </div>
        )}
      </form>
    </div>
  );
}
