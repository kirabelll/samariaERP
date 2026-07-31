'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Card, CardHeader, CardBody, Button, Input, Badge } from '@/components/ui';

interface POItem {
  id: number;
  type: 'regular' | 'service';
  item?: string;
  description?: string;
  qty?: number;
  unitPrice?: number;
  amount?: number;
  total?: number;
}

interface Supplier {
  id: string;
  companyName: string;
  code: string;
}

interface SupplierAgreement {
  id: string;
  agreementNo: string;
  supplierId: string;
  items: string;
  totalAmount: number;
  status: string;
}

export default function NewPurchaseOrderPage() {
  const router = useRouter();
  const [supplierId, setSupplierId] = useState('');
  const [requestType, setRequestType] = useState('purchase_order');
  const [agreementId, setAgreementId] = useState('');
  const [items, setItems] = useState<POItem[]>([
    { id: 1, type: 'regular', item: '', qty: 1, unitPrice: 0, total: 0 },
  ]);
  const [saving, setSaving] = useState(false);

  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [agreements, setAgreements] = useState<SupplierAgreement[]>([]);
  const [loadingSuppliers, setLoadingSuppliers] = useState(true);
  const [loadingAgreements, setLoadingAgreements] = useState(false);

  // Fetch suppliers on mount
  useEffect(() => {
    const fetchSuppliers = async () => {
      try {
        const res = await fetch('/api/suppliers?limit=1000');
        const data = await res.json();
        if (data.success) {
          setSuppliers(data.data || []);
        }
      } catch (err) {
        console.error('Failed to fetch suppliers:', err);
      } finally {
        setLoadingSuppliers(false);
      }
    };
    fetchSuppliers();
  }, []);

  // Fetch supplier agreements when supplier changes
  useEffect(() => {
    if (!supplierId) {
      setAgreements([]);
      setAgreementId('');
      return;
    }
    const fetchAgreements = async () => {
      setLoadingAgreements(true);
      try {
        const res = await fetch(`/api/supplier-agreements?supplierId=${supplierId}&limit=100`);
        const data = await res.json();
        if (data.success) {
          const filtered = (data.data || []).filter(
            (a: SupplierAgreement) =>
              a.status === 'Draft' || a.status === 'Active' || a.status === 'Approved'
          );
          setAgreements(filtered);
        }
      } catch (err) {
        console.error('Failed to fetch supplier agreements:', err);
      } finally {
        setLoadingAgreements(false);
      }
    };
    fetchAgreements();
  }, [supplierId]);

  // Auto-populate items from selected agreement
  const handleAgreementSelect = (agId: string) => {
    setAgreementId(agId);
    if (!agId) return;

    const agreement = agreements.find((a) => a.id === agId);
    if (!agreement) return;

    try {
      const parsedItems =
        typeof agreement.items === 'string' ? JSON.parse(agreement.items) : agreement.items;

      if (Array.isArray(parsedItems) && parsedItems.length > 0) {
        const poItems: POItem[] = parsedItems.map((ai: any, index: number) => {
          const isService = ai.type === 'service';
          if (isService) {
            return {
              id: index + 1,
              type: 'service',
              description: ai.description || ai.name || '',
              amount: ai.amount || 0,
            };
          }
          const qty = ai.qty || ai.quantity || 1;
          const unitPrice = ai.unitPrice || 0;
          return {
            id: index + 1,
            type: 'regular',
            item: ai.itemName || ai.name || ai.item || '',
            qty,
            unitPrice,
            total: qty * unitPrice,
          };
        });
        setItems(poItems);
      }
    } catch (err) {
      console.error('Failed to parse agreement items:', err);
    }
  };

  const handleAddItem = () => {
    const newId = Math.max(...items.map((i) => i.id), 0) + 1;
    setItems([...items, { id: newId, type: 'regular', item: '', qty: 1, unitPrice: 0, total: 0 }]);
  };

  const handleAddService = () => {
    const newId = Math.max(...items.map((i) => i.id), 0) + 1;
    setItems([...items, { id: newId, type: 'service', description: '', amount: 0 }]);
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
          if (item.type === 'regular' && (field === 'qty' || field === 'unitPrice')) {
            updated.total = (updated.qty || 0) * (updated.unitPrice || 0);
          }
          return updated;
        }
        return item;
      })
    );
  };

  const totalAmount = items.reduce((sum, item) => {
    if (item.type === 'regular') return sum + (item.total || 0);
    return sum + (item.amount || 0);
  }, 0);

  const handleSave = async () => {
    if (!supplierId) {
      alert('Please select a supplier');
      return;
    }

    const hasError = items.some((i) => {
      if (i.type === 'regular') return !i.item;
      if (i.type === 'service') return !i.description;
      return false;
    });

    if (hasError) {
      alert('Please fill in all item details');
      return;
    }

    setSaving(true);
    try {
      const res = await fetch('/api/purchasing/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          supplierId,
          requestType,
          items: JSON.stringify(items),
          totalAmount,
          status: 'Draft',
        }),
      });
      const data = await res.json();
      if (!data.success) {
        alert(data.error || 'Failed to save');
        return;
      }
      router.push('/dashboard/purchasing/orders');
    } catch {
      alert('Failed to save order');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/dashboard/purchasing/orders"
          className="text-blue-600 hover:text-blue-800 text-sm font-medium"
        >
          ← Back to Orders
        </Link>
        <h1 className="text-3xl font-bold text-gray-900 mt-4">New Request</h1>
      </div>

      <Card>
        <CardHeader>
          <h2 className="text-xl font-semibold text-gray-900">Request Details</h2>
        </CardHeader>
        <CardBody className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Request Type *
              </label>
              <select
                value={requestType}
                onChange={(e) => setRequestType(e.target.value)}
                className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 border px-3 py-2"
              >
                <option value="purchase_order">Purchase Order</option>
                <option value="service_request">Service Request</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Supplier *</label>
              <select
                value={supplierId}
                onChange={(e) => {
                  setSupplierId(e.target.value);
                  setAgreementId('');
                }}
                disabled={loadingSuppliers}
                className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 border px-3 py-2"
              >
                <option value="">Select Supplier</option>
                {suppliers.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.companyName} ({s.code})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Supplier Agreement selector */}
          {supplierId && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Pull from Supplier Agreement (optional)
              </label>
              <select
                value={agreementId}
                onChange={(e) => handleAgreementSelect(e.target.value)}
                disabled={loadingAgreements}
                className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 border px-3 py-2"
              >
                <option value="">
                  {loadingAgreements
                    ? 'Loading agreements...'
                    : agreements.length === 0
                    ? 'No agreements for this supplier'
                    : 'Select agreement to auto-fill items'}
                </option>
                {agreements.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.agreementNo} — ETB {(a.totalAmount ?? 0).toLocaleString('en-US')} ({a.status})
                  </option>
                ))}
              </select>
            </div>
          )}
        </CardBody>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold text-gray-900">Line Items</h2>
            <div className="flex gap-2">
              <Button variant="secondary" size="sm" onClick={handleAddItem}>
                + Add Item
              </Button>
              <Button variant="secondary" size="sm" onClick={handleAddService}>
                + Add Service
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardBody>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-2 px-2 text-sm font-semibold text-gray-900">
                    Type
                  </th>
                  <th className="text-left py-2 px-2 text-sm font-semibold text-gray-900">
                    Name / Description
                  </th>
                  <th className="text-left py-2 px-2 text-sm font-semibold text-gray-900">Qty</th>
                  <th className="text-left py-2 px-2 text-sm font-semibold text-gray-900">
                    Unit Price / Amount
                  </th>
                  <th className="text-right py-2 px-2 text-sm font-semibold text-gray-900">
                    Total
                  </th>
                  <th className="text-center py-2 px-2 text-sm font-semibold text-gray-900">
                    Action
                  </th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => (
                  <tr key={item.id} className="border-b">
                    <td className="py-3 px-2">
                      <Badge variant={item.type === 'regular' ? 'info' : 'warning'} size="sm">
                        {item.type === 'regular' ? 'Item' : 'Service'}
                      </Badge>
                    </td>
                    <td className="py-3 px-2">
                      {item.type === 'regular' ? (
                        <Input
                          placeholder="Enter item name"
                          value={item.item || ''}
                          onChange={(e) => handleItemChange(item.id, 'item', e.target.value)}
                          size="sm"
                        />
                      ) : (
                        <Input
                          placeholder="Enter service description"
                          value={item.description || ''}
                          onChange={(e) => handleItemChange(item.id, 'description', e.target.value)}
                          size="sm"
                        />
                      )}
                    </td>
                    <td className="py-3 px-2">
                      {item.type === 'regular' ? (
                        <input
                          type="number"
                          min="1"
                          value={item.qty || 0}
                          onChange={(e) =>
                            handleItemChange(item.id, 'qty', parseInt(e.target.value) || 0)
                          }
                          className="w-20 rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 border px-2 py-1 text-sm"
                        />
                      ) : (
                        <span className="text-gray-400">—</span>
                      )}
                    </td>
                    <td className="py-3 px-2">
                      {item.type === 'regular' ? (
                        <input
                          type="number"
                          step="0.01"
                          value={item.unitPrice || 0}
                          onChange={(e) =>
                            handleItemChange(item.id, 'unitPrice', parseFloat(e.target.value) || 0)
                          }
                          placeholder="Unit Price"
                          className="w-32 rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 border px-2 py-1 text-sm"
                        />
                      ) : (
                        <input
                          type="number"
                          step="0.01"
                          value={item.amount || 0}
                          onChange={(e) =>
                            handleItemChange(item.id, 'amount', parseFloat(e.target.value) || 0)
                          }
                          placeholder="Amount"
                          className="w-32 rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 border px-2 py-1 text-sm"
                        />
                      )}
                    </td>
                    <td className="py-3 px-2 text-right text-sm font-medium">
                      ETB{' '}
                      {(item.type === 'regular'
                        ? item.total || 0
                        : item.amount || 0
                      ).toLocaleString('en-US')}
                    </td>
                    <td className="py-3 px-2 text-center">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleRemoveItem(item.id)}
                      >
                        Remove
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="mt-4 flex justify-end">
            <div className="text-right">
              <div className="text-sm text-gray-600 mb-2">Total Amount:</div>
              <div className="text-3xl font-bold text-gray-900">
                ETB {totalAmount.toLocaleString('en-US')}
              </div>
            </div>
          </div>
        </CardBody>
      </Card>

      <div className="flex gap-3">
        <Button
          variant="primary"
          size="lg"
          onClick={handleSave}
          isLoading={saving}
          className="flex-1"
        >
          Save Request
        </Button>
        <Button
          variant="outline"
          size="lg"
          onClick={() => router.push('/dashboard/purchasing/orders')}
          className="flex-1"
        >
          Cancel
        </Button>
      </div>
    </div>
  );
}
