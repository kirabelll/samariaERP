'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardHeader, CardBody, CardFooter, Button, Input, Select } from '@/components/ui';

interface RequestItem {
  id: number;
  itemId?: string;
  drugName: string;
  genericName: string;
  strength: string;
  qty: number;
  unitPrice: number;
}

export default function NewMedicalPurchaseRequestPage() {
  const router = useRouter();
  const [supplier, setSupplier] = useState('');
  const [urgency, setUrgency] = useState('Normal');
  const [notes, setNotes] = useState('');
  const [items, setItems] = useState<RequestItem[]>([
    { id: 1, itemId: '', drugName: '', genericName: '', strength: '', qty: 1, unitPrice: 0 },
  ]);
  const [suppliers, setSuppliers] = useState<{ id: string; companyName: string; code: string }[]>([]);
  const [loadingSuppliers, setLoadingSuppliers] = useState(true);
  const [medicalItems, setMedicalItems] = useState<{ id: string; code: string; name: string; genericName?: string; strength?: string }[]>([]);
  const [loadingItems, setLoadingItems] = useState(true);

  React.useEffect(() => {
    async function fetchSuppliers() {
      try {
        setLoadingSuppliers(true);
        let res = await fetch('/api/suppliers?category=Medicine&limit=100');
        let data = await res.json();
        let list = data.success && Array.isArray(data.data) ? data.data : [];
        if (list.length === 0) {
          res = await fetch('/api/suppliers?limit=100');
          data = await res.json();
          list = data.success && Array.isArray(data.data) ? data.data : [];
        }
        setSuppliers(list.map((s: any) => ({
          id: s.id,
          companyName: s.companyName || `${s.firstName || ''} ${s.lastName || ''}`.trim() || s.code,
          code: s.code || '',
        })));
      } catch (err) {
        console.error('Error fetching suppliers:', err);
      } finally {
        setLoadingSuppliers(false);
      }
    }

    async function fetchMedicalItems() {
      try {
        setLoadingItems(true);
        let res = await fetch('/api/items?division=MEDICAL&limit=100');
        let data = await res.json();
        let list = data.success && Array.isArray(data.data) ? data.data : [];
        if (list.length === 0) {
          res = await fetch('/api/items?limit=100');
          data = await res.json();
          list = data.success && Array.isArray(data.data) ? data.data : [];
        }
        setMedicalItems(list);
      } catch (err) {
        console.error('Error fetching medical items:', err);
      } finally {
        setLoadingItems(false);
      }
    }

    fetchSuppliers();
    fetchMedicalItems();
  }, []);

  const handleAddItem = () => {
    const newId = Math.max(...items.map(i => i.id), 0) + 1;
    setItems([...items, { id: newId, itemId: '', drugName: '', genericName: '', strength: '', qty: 1, unitPrice: 0 }]);
  };

  const handleRemoveItem = (id: number) => {
    setItems(items.filter(i => i.id !== id));
  };

  const handleItemChange = (id: number, field: string, value: any) => {
    setItems(items.map(item =>
      item.id === id ? { ...item, [field]: value } : item
    ));
  };

  const totalAmount = items.reduce((sum, item) => sum + (item.qty * item.unitPrice), 0);

  const handleSave = async () => {
    if (!supplier) {
      alert('Please select a supplier');
      return;
    }
    if (!urgency || items.some(i => !i.drugName)) {
      alert('Please fill in all required fields');
      return;
    }

    try {
      const res = await fetch('/api/medical/requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          supplierId: supplier,
          customerId: supplier,
          items: items,
          priority: urgency,
          notes: notes || undefined,
          status: 'Submitted'
        }),
      });
      const d = await res.json();
      if (!d.success) { alert(d.error || 'Failed'); return; }
      alert('Medical Purchase Request saved successfully!');
      router.push('/dashboard/medical/requests');
    } catch {
      alert('Failed to save request');
    }
  };

  const handleCancel = () => {
    router.push('/dashboard/medical/requests');
  };

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-gray-900">New Medical Purchase Request</h1>

      <Card>
        <CardHeader>
          <h2 className="text-xl font-semibold text-gray-900">Request Details</h2>
        </CardHeader>
        <CardBody className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Supplier *</label>
              <select
                value={supplier}
                onChange={(e) => setSupplier(e.target.value)}
                className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 border px-3 py-2"
                disabled={loadingSuppliers}
              >
                <option value="">{loadingSuppliers ? 'Loading suppliers...' : 'Select Supplier'}</option>
                {suppliers.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.companyName} {s.code ? `(${s.code})` : ''}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Priority *</label>
              <select
                value={urgency}
                onChange={(e) => setUrgency(e.target.value)}
                className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 border px-3 py-2"
              >
                <option value="Normal">Normal</option>
                <option value="High">High</option>
                <option value="Low">Low</option>
                <option value="Urgent">Urgent</option>
              </select>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Notes</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 border px-3 py-2"
              placeholder="Additional notes..."
            />
          </div>
        </CardBody>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold text-gray-900">Items</h2>
            <Button
              variant="secondary"
              size="sm"
              onClick={handleAddItem}
            >
              + Add Item
            </Button>
          </div>
        </CardHeader>
        <CardBody>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-2 px-2 text-sm font-semibold text-gray-900 min-w-[200px]">Drug Name</th>
                  <th className="text-left py-2 px-2 text-sm font-semibold text-gray-900 min-w-[150px]">Generic Name</th>
                  <th className="text-left py-2 px-2 text-sm font-semibold text-gray-900 min-w-[100px]">Strength</th>
                  <th className="text-left py-2 px-2 text-sm font-semibold text-gray-900">Qty</th>
                  <th className="text-left py-2 px-2 text-sm font-semibold text-gray-900">Unit Price</th>
                  <th className="text-left py-2 px-2 text-sm font-semibold text-gray-900">Action</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => (
                  <tr key={item.id} className="border-b">
                    <td className="py-3 px-2">
                      <select
                        value={item.itemId || ''}
                        onChange={(e) => {
                          const selectedItemId = e.target.value;
                          const foundItem = medicalItems.find(m => m.id === selectedItemId);
                          if (foundItem) {
                            setItems(items.map(i => i.id === item.id ? {
                              ...i,
                              itemId: foundItem.id,
                              drugName: foundItem.name,
                              genericName: foundItem.genericName || i.genericName,
                              strength: foundItem.strength || i.strength,
                            } : i));
                          } else {
                            setItems(items.map(i => i.id === item.id ? {
                              ...i,
                              itemId: '',
                              drugName: '',
                            } : i));
                          }
                        }}
                        className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 border px-3 py-2 text-sm"
                        disabled={loadingItems}
                      >
                        <option value="">{loadingItems ? 'Loading items...' : 'Select Medical Item'}</option>
                        {medicalItems.map((m) => (
                          <option key={m.id} value={m.id}>
                            {m.name} {m.code ? `(${m.code})` : ''}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="py-3 px-2">
                      <Input
                        placeholder="Generic name"
                        value={item.genericName}
                        onChange={(e) => handleItemChange(item.id, 'genericName', e.target.value)}
                      />
                    </td>
                    <td className="py-3 px-2">
                      <Input
                        placeholder="e.g., 500mg"
                        value={item.strength}
                        onChange={(e) => handleItemChange(item.id, 'strength', e.target.value)}
                      />
                    </td>
                    <td className="py-3 px-2">
                      <input
                        type="number"
                        min="1"
                        value={item.qty}
                        onChange={(e) => handleItemChange(item.id, 'qty', parseInt(e.target.value) || 1)}
                        className="w-20 rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 border px-2 py-1"
                      />
                    </td>
                    <td className="py-3 px-2">
                      <input
                        type="number"
                        step="0.01"
                        value={item.unitPrice}
                        onChange={(e) => handleItemChange(item.id, 'unitPrice', parseFloat(e.target.value) || 0)}
                        className="w-28 rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 border px-2 py-1"
                      />
                    </td>
                    <td className="py-3 px-2">
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
          className="flex-1"
        >
          Save Request
        </Button>
        <Button
          variant="outline"
          size="lg"
          onClick={handleCancel}
          className="flex-1"
        >
          Cancel
        </Button>
      </div>
    </div>
  );
}
