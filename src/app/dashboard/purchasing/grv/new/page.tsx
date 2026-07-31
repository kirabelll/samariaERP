'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardHeader, CardBody, CardFooter, Button, Input, Select } from '@/components/ui';

interface GRVItem {
  id: number;
  item: string;
  orderedQty: number;
  receivedQty: number;
  condition: string;
}

export default function NewGoodsReceivedVoucherPage() {
  const router = useRouter();
  const [supplier, setSupplier] = useState('');
  const [receivedDate, setReceivedDate] = useState(new Date().toISOString().split('T')[0]);
  const [items, setItems] = useState<GRVItem[]>([
    { id: 1, item: '', orderedQty: 0, receivedQty: 0, condition: 'Good' },
  ]);

  const handleAddItem = () => {
    const newId = Math.max(...items.map(i => i.id), 0) + 1;
    setItems([...items, { id: newId, item: '', orderedQty: 0, receivedQty: 0, condition: 'Good' }]);
  };

  const handleRemoveItem = (id: number) => {
    setItems(items.filter(i => i.id !== id));
  };

  const handleItemChange = (id: number, field: string, value: any) => {
    setItems(items.map(item =>
      item.id === id ? { ...item, [field]: value } : item
    ));
  };

  const handleSave = async () => {
    if (!supplier || items.some(i => !i.item)) {
      alert('Please fill in all required fields');
      return;
    }
    try {
      const totalAmount = 0; // TODO: calculate from items
      const res = await fetch('/api/purchasing/grv', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ supplierId: supplier, items, totalAmount, receivedDate, status: 'Received' }),
      });
      const d = await res.json();
      if (!d.success) { alert(d.error || 'Failed'); return; }
      alert('Goods Receipt Voucher saved successfully!');
      router.push('/dashboard/purchasing/grv');
    } catch {
      alert('Failed to save GRV');
    }
  };

  const handleCancel = () => {
    router.push('/dashboard/purchasing/grv');
  };

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-gray-900">New Goods Received Voucher</h1>

      <Card>
        <CardHeader>
          <h2 className="text-xl font-semibold text-gray-900">Receipt Details</h2>
        </CardHeader>
        <CardBody className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Supplier *</label>
              <select
                value={supplier}
                onChange={(e) => setSupplier(e.target.value)}
                className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 border px-3 py-2"
              >
                <option value="">Select Supplier</option>
                <option value="supp_001">Addis Pharma Supplies</option>
                <option value="supp_002">Cement Factory A</option>
                <option value="supp_003">Mekelle Medical Imports</option>
                <option value="supp_004">Dire Dawa Suppliers</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Received Date</label>
              <input
                type="date"
                value={receivedDate}
                onChange={(e) => setReceivedDate(e.target.value)}
                className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 border px-3 py-2"
              />
            </div>
          </div>
        </CardBody>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold text-gray-900">Received Items</h2>
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
                  <th className="text-left py-2 px-2 text-sm font-semibold text-gray-900">Item</th>
                  <th className="text-left py-2 px-2 text-sm font-semibold text-gray-900">Ordered Qty</th>
                  <th className="text-left py-2 px-2 text-sm font-semibold text-gray-900">Received Qty</th>
                  <th className="text-left py-2 px-2 text-sm font-semibold text-gray-900">Condition</th>
                  <th className="text-left py-2 px-2 text-sm font-semibold text-gray-900">Action</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => (
                  <tr key={item.id} className="border-b">
                    <td className="py-3 px-2">
                      <Input
                        placeholder="Enter item name"
                        value={item.item}
                        onChange={(e) => handleItemChange(item.id, 'item', e.target.value)}
                      />
                    </td>
                    <td className="py-3 px-2">
                      <input
                        type="number"
                        min="0"
                        value={item.orderedQty}
                        onChange={(e) => handleItemChange(item.id, 'orderedQty', parseInt(e.target.value))}
                        className="w-24 rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 border px-2 py-1"
                      />
                    </td>
                    <td className="py-3 px-2">
                      <input
                        type="number"
                        min="0"
                        value={item.receivedQty}
                        onChange={(e) => handleItemChange(item.id, 'receivedQty', parseInt(e.target.value))}
                        className="w-24 rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 border px-2 py-1"
                      />
                    </td>
                    <td className="py-3 px-2">
                      <select
                        value={item.condition}
                        onChange={(e) => handleItemChange(item.id, 'condition', e.target.value)}
                        className="rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 border px-2 py-1"
                      >
                        <option value="Good">Good</option>
                        <option value="Damaged">Damaged</option>
                        <option value="Defective">Defective</option>
                      </select>
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
        </CardBody>
      </Card>

      <div className="flex gap-3">
        <Button
          variant="primary"
          size="lg"
          onClick={handleSave}
          className="flex-1"
        >
          Save GRV
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
