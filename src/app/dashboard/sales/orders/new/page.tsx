'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardHeader, CardBody, CardFooter, Button, Input, Select } from '@/components/ui';

interface OrderItem {
  id: number;
  item: string;
  itemId: string;
  qty: number;
  unit: string;
  unitPrice: number;
  total: number;
}

interface Customer {
  customerId: string;
  companyName: string;
  agreementNo: string;
  status?: string;
}

interface SystemItem {
  id: string;
  name: string;
  code: string;
  unitPrice?: number;
  unit?: { name: string };
}

export default function NewSalesOrderPage() {
  const router = useRouter();
  const [customer, setCustomer] = useState('');
  const [division, setDivision] = useState('');
  const [items, setItems] = useState<OrderItem[]>([
    { id: 1, item: '', itemId: '', qty: 1, unit: '', unitPrice: 0, total: 0 },
  ]);

  const [customers, setCustomers] = useState<Customer[]>([]);
  const [systemItems, setSystemItems] = useState<SystemItem[]>([]);
  const [loadingCustomers, setLoadingCustomers] = useState(true);

  useEffect(() => {
    // Fetch customers with active sales agreements
    fetch('/api/sales/agreements/customers')
      .then((r) => r.json())
      .then((data) => {
        if (data.success) {
          setCustomers(data.data || []);
        }
      })
      .catch(console.error)
      .finally(() => setLoadingCustomers(false));

    // Fetch items/products
    fetch('/api/items?limit=500')
      .then((r) => r.json())
      .then((data) => {
        if (data.success) setSystemItems(data.data || []);
      })
      .catch(console.error);
  }, []);

  const handleAddItem = () => {
    const newId = Math.max(...items.map(i => i.id), 0) + 1;
    setItems([...items, { id: newId, item: '', itemId: '', qty: 1, unit: '', unitPrice: 0, total: 0 }]);
  };

  const handleRemoveItem = (id: number) => {
    setItems(items.filter(i => i.id !== id));
  };

  const handleItemChange = (id: number, field: string, value: any) => {
    setItems(items.map(item => {
      if (item.id === id) {
        const updated = { ...item, [field]: value };

        // If selecting from catalog, auto-fill price and unit
        if (field === 'itemId' && value) {
          const catalogItem = systemItems.find(si => si.id === value);
          if (catalogItem) {
            updated.item = catalogItem.name;
            updated.unitPrice = catalogItem.unitPrice || 0;
            updated.unit = catalogItem.unit?.name || '';
          }
        }

        if (field === 'qty' || field === 'unitPrice') {
          updated.total = updated.qty * updated.unitPrice;
        }
        return updated;
      }
      return item;
    }));
  };

  const totalAmount = items.reduce((sum, item) => sum + item.total, 0);

  const handleSave = async () => {
    if (!customer || items.some(i => !i.item)) {
      alert('Please fill in all required fields');
      return;
    }
    try {
      const res = await fetch('/api/sales/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerId: customer,
          items,
          totalAmount,
          division: division || 'CONSTRUCTION',
          status: 'Pending',
        }),
      });
      const d = await res.json();
      if (!d.success) { alert(d.error || 'Failed'); return; }
      alert('Sales Order saved successfully!');
      router.push('/dashboard/sales/orders');
    } catch {
      alert('Failed to save sales order');
    }
  };

  const handleCancel = () => {
    router.push('/dashboard/sales/orders');
  };

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-gray-900">New Sales Order</h1>

      <Card>
        <CardHeader>
          <h2 className="text-xl font-semibold text-gray-900">Order Details</h2>
        </CardHeader>
        <CardBody className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Customer *</label>
              <select
                value={customer}
                onChange={(e) => setCustomer(e.target.value)}
                className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 border px-3 py-2"
              >
                <option value="">{loadingCustomers ? 'Loading...' : 'Select Customer'}</option>
                {customers.map((c) => (
                  <option key={c.customerId} value={c.customerId}>{c.companyName} — {c.agreementNo}</option>
                ))}
              </select>
              {customers.length === 0 && !loadingCustomers && (
                <p className="text-xs text-red-500 mt-1">No customers with active sales agreements found</p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Division</label>
              <select
                value={division}
                onChange={(e) => setDivision(e.target.value)}
                className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 border px-3 py-2"
              >
                <option value="">Select Division</option>
                <option value="CONSTRUCTION">Construction</option>
                <option value="CEMENT">Cement</option>
                <option value="AGGREGATE">Aggregate</option>
                <option value="MEDICAL">Medical</option>
                <option value="GENERAL">General</option>
              </select>
            </div>
          </div>
        </CardBody>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold text-gray-900">Items</h2>
            <Button variant="secondary" size="sm" onClick={handleAddItem}>+ Add Item</Button>
          </div>
        </CardHeader>
        <CardBody>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-2 px-2 text-sm font-semibold text-gray-900">Item</th>
                  <th className="text-left py-2 px-2 text-sm font-semibold text-gray-900">Qty</th>
                  <th className="text-left py-2 px-2 text-sm font-semibold text-gray-900">Unit Price</th>
                  <th className="text-left py-2 px-2 text-sm font-semibold text-gray-900">Total</th>
                  <th className="text-left py-2 px-2 text-sm font-semibold text-gray-900">Action</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => (
                  <tr key={item.id} className="border-b">
                    <td className="py-3 px-2">
                      {systemItems.length > 0 ? (
                        <select
                          value={item.itemId}
                          onChange={(e) => handleItemChange(item.id, 'itemId', e.target.value)}
                          className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 border px-2 py-1"
                        >
                          <option value="">Select or type below</option>
                          {systemItems.map((si) => (
                            <option key={si.id} value={si.id}>{si.code ? `${si.code} — ` : ''}{si.name}</option>
                          ))}
                        </select>
                      ) : (
                        <Input
                          placeholder="Enter item name"
                          value={item.item}
                          onChange={(e) => handleItemChange(item.id, 'item', e.target.value)}
                        />
                      )}
                      {!item.itemId && systemItems.length > 0 && (
                        <Input
                          placeholder="Or type item name"
                          value={item.item}
                          onChange={(e) => handleItemChange(item.id, 'item', e.target.value)}
                          className="mt-1"
                        />
                      )}
                    </td>
                    <td className="py-3 px-2">
                      <input type="number" min="1" value={item.qty}
                        onChange={(e) => handleItemChange(item.id, 'qty', parseInt(e.target.value) || 0)}
                        className="w-24 rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 border px-2 py-1" />
                    </td>
                    <td className="py-3 px-2">
                      <input type="number" step="0.01" value={item.unitPrice}
                        onChange={(e) => handleItemChange(item.id, 'unitPrice', parseFloat(e.target.value) || 0)}
                        className="w-32 rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 border px-2 py-1" />
                    </td>
                    <td className="py-3 px-2 text-sm font-medium">ETB {item.total.toLocaleString('en-US')}</td>
                    <td className="py-3 px-2">
                      <Button variant="outline" size="sm" onClick={() => handleRemoveItem(item.id)}>Remove</Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="mt-4 flex justify-end">
            <div className="text-right">
              <div className="text-sm text-gray-600 mb-2">Total Amount:</div>
              <div className="text-3xl font-bold text-gray-900">ETB {totalAmount.toLocaleString('en-US')}</div>
            </div>
          </div>
        </CardBody>
      </Card>

      <div className="flex gap-3">
        <Button variant="primary" size="lg" onClick={handleSave} className="flex-1">Save Order</Button>
        <Button variant="outline" size="lg" onClick={handleCancel} className="flex-1">Cancel</Button>
      </div>
    </div>
  );
}
