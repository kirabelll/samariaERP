'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardHeader, CardBody, CardFooter, Button, Input, Select } from '@/components/ui';

interface ProformaItem {
  id: number;
  item: string;
  itemId: string;
  qty: number;
  unit: string;
  unitPrice: number;
  vat: number;
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

export default function NewProformaPage() {
  const router = useRouter();
  const [customer, setCustomer] = useState('');
  const [validityDays, setValidityDays] = useState('15');
  const [division, setDivision] = useState('');
  const [items, setItems] = useState<ProformaItem[]>([
    { id: 1, item: '', itemId: '', qty: 1, unit: '', unitPrice: 0, vat: 15, total: 0 },
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
    setItems([...items, { id: newId, item: '', itemId: '', qty: 1, unit: '', unitPrice: 0, vat: 15, total: 0 }]);
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

        if (field === 'qty' || field === 'unitPrice' || field === 'vat') {
          const subtotal = updated.qty * updated.unitPrice;
          updated.total = subtotal + (subtotal * updated.vat / 100);
        }
        return updated;
      }
      return item;
    }));
  };

  const totalAmount = items.reduce((sum, item) => sum + item.total, 0);
  const subtotal = items.reduce((sum, item) => sum + (item.qty * item.unitPrice), 0);
  const vatAmount = items.reduce((sum, item) => {
    const itemSubtotal = item.qty * item.unitPrice;
    return sum + (itemSubtotal * item.vat / 100);
  }, 0);

  const handleSave = async () => {
    if (!customer || items.some(i => !i.item)) {
      alert('Please fill in all required fields');
      return;
    }
    try {
      const res = await fetch('/api/sales/proformas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerId: customer,
          validityDays: parseInt(validityDays),
          items,
          subtotal,
          vatAmount,
          totalAmount,
          division: division || 'CONSTRUCTION',
          status: 'Draft'
        }),
      });
      const d = await res.json();
      if (!d.success) { alert(d.error || 'Failed'); return; }
      alert('Proforma saved successfully!');
      router.push('/dashboard/sales/proformas');
    } catch {
      alert('Failed to save proforma');
    }
  };

  const handleCancel = () => {
    router.push('/dashboard/sales/proformas');
  };

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-gray-900">New Proforma Invoice</h1>

      <Card>
        <CardHeader>
          <h2 className="text-xl font-semibold text-gray-900">Proforma Details</h2>
        </CardHeader>
        <CardBody className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Validity (Days) *</label>
              <Input
                type="number"
                min="1"
                placeholder="e.g., 15"
                value={validityDays}
                onChange={(e) => setValidityDays(e.target.value)}
              />
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
                  <th className="text-left py-2 px-2 text-sm font-semibold text-gray-900">VAT %</th>
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
                      {item.itemId && (
                        <input type="text" value={item.item} readOnly
                          className="w-full mt-1 text-xs text-gray-500 border-0 bg-transparent px-0" />
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
                        className="w-20 rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 border px-2 py-1" />
                    </td>
                    <td className="py-3 px-2">
                      <input type="number" step="0.01" value={item.unitPrice}
                        onChange={(e) => handleItemChange(item.id, 'unitPrice', parseFloat(e.target.value) || 0)}
                        className="w-28 rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 border px-2 py-1" />
                    </td>
                    <td className="py-3 px-2">
                      <input type="number" min="0" max="100" value={item.vat}
                        onChange={(e) => handleItemChange(item.id, 'vat', parseInt(e.target.value) || 0)}
                        className="w-16 rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 border px-2 py-1" />
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
            <div className="text-right space-y-1">
              <div className="text-sm text-gray-600">Subtotal: ETB {subtotal.toLocaleString('en-US')}</div>
              <div className="text-sm text-gray-600">VAT: ETB {vatAmount.toLocaleString('en-US')}</div>
              <div className="text-2xl font-bold text-gray-900">Total: ETB {totalAmount.toLocaleString('en-US')}</div>
            </div>
          </div>
        </CardBody>
      </Card>

      <div className="flex gap-3">
        <Button variant="primary" size="lg" onClick={handleSave} className="flex-1">Save Proforma</Button>
        <Button variant="outline" size="lg" onClick={handleCancel} className="flex-1">Cancel</Button>
      </div>
    </div>
  );
}
