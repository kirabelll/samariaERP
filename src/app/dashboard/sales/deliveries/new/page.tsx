'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Card, CardHeader, CardBody, CardFooter, Button, Input, Select } from '@/components/ui';

interface DeliveryItem {
  id: number;
  itemId: string;
  itemName: string;
  quantity: number;
  unit: string;
}

interface Customer {
  customerId: string;
  companyName: string;
  agreementNo: string;
  code?: string;
}

interface Item {
  id: string;
  name: string;
  code: string;
  unit: string;
}

export default function NewDeliveryPage() {
  const router = useRouter();
  const [customerId, setCustomerId] = useState('');
  const [salesOrderId, setSalesOrderId] = useState('');
  const [division, setDivision] = useState('CONSTRUCTION');
  const [driverName, setDriverName] = useState('');
  const [truckPlateNo, setTruckPlateNo] = useState('');
  const [deliveryDate, setDeliveryDate] = useState(new Date().toISOString().split('T')[0]);
  const [items, setItems] = useState<DeliveryItem[]>([
    { id: 1, itemId: '', itemName: '', quantity: 1, unit: 'pcs' },
  ]);
  const [loading, setLoading] = useState(false);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [masterItems, setMasterItems] = useState<Item[]>([]);
  const [loadingData, setLoadingData] = useState(false);
  const [loadingCustomers, setLoadingCustomers] = useState(true);

  // Fetch customers and items on mount
  useEffect(() => {
    const fetchData = async () => {
      setLoadingData(true);
      setLoadingCustomers(true);
      try {
        const [customersRes, itemsRes] = await Promise.all([
          fetch('/api/sales/agreements/customers'),
          fetch('/api/items?limit=1000'),
        ]);

        if (customersRes.ok) {
          const customersData = await customersRes.json();
          if (customersData.success) {
            setCustomers(customersData.data || []);
          }
        }

        if (itemsRes.ok) {
          const itemsData = await itemsRes.json();
          setMasterItems(itemsData.data || []);
        }
      } catch (error) {
        console.error('Error fetching data:', error);
      } finally {
        setLoadingData(false);
        setLoadingCustomers(false);
      }
    };

    fetchData();
  }, []);

  const handleAddItem = () => {
    const newId = Math.max(...items.map(i => i.id), 0) + 1;
    setItems([...items, { id: newId, itemId: '', itemName: '', quantity: 1, unit: 'pcs' }]);
  };

  const handleRemoveItem = (id: number) => {
    if (items.length <= 1) return;
    setItems(items.filter(i => i.id !== id));
  };

  const handleItemChange = (id: number, field: string, value: any) => {
    setItems(items.map(item => {
      if (item.id === id) {
        if (field === 'itemId') {
          // When item is selected, get the item details
          const selectedItem = masterItems.find(i => i.id === value);
          return {
            ...item,
            itemId: value,
            itemName: selectedItem?.name || '',
            unit: selectedItem?.unit || item.unit,
          };
        }
        return { ...item, [field]: value };
      }
      return item;
    }));
  };

  const handleSave = async () => {
    if (!customerId || !division || !driverName || !truckPlateNo || !deliveryDate) {
      alert('Please fill in all required fields');
      return;
    }
    if (items.some(i => !i.itemId || i.quantity <= 0)) {
      alert('Please fill in all item IDs and quantities');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/api/sales/deliveries', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerId,
          salesOrderId: salesOrderId || null,
          division,
          driverName,
          truckPlateNo,
          deliveryDate,
          items: JSON.stringify(items.map(i => ({
            itemId: i.itemId,
            qty: i.quantity,
            unit: i.unit,
          }))),
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to save delivery');
      }

      alert('Delivery saved successfully!');
      router.push('/dashboard/sales/deliveries');
    } catch (error) {
      alert('Error: ' + (error instanceof Error ? error.message : 'Unknown error'));
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    router.push('/dashboard/sales/deliveries');
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-gray-900">New Delivery</h1>
        <Link href="/dashboard/sales/deliveries" className="text-blue-600 hover:text-blue-800">
          &larr; Back
        </Link>
      </div>

      <Card>
        <CardHeader>
          <h2 className="text-xl font-semibold text-gray-900">Delivery Details</h2>
        </CardHeader>
        <CardBody className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Customer *</label>
              <select
                value={customerId}
                onChange={(e) => setCustomerId(e.target.value)}
                disabled={loadingCustomers}
                className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 border px-3 py-2"
              >
                <option value="">{loadingCustomers ? 'Loading...' : 'Select Customer'}</option>
                {customers.map(customer => (
                  <option key={customer.customerId} value={customer.customerId}>
                    {customer.companyName} — {customer.agreementNo}
                  </option>
                ))}
              </select>
              {customers.length === 0 && !loadingCustomers && (
                <p className="text-xs text-red-500 mt-1">No customers with active sales agreements found</p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Sales Order ID (Optional)</label>
              <Input
                placeholder="e.g., SO-001"
                value={salesOrderId}
                onChange={(e) => setSalesOrderId(e.target.value)}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Division *</label>
              <select
                value={division}
                onChange={(e) => setDivision(e.target.value)}
                className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 border px-3 py-2"
              >
                <option value="CONSTRUCTION">Construction</option>
                <option value="MEDICAL">Medical</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Delivery Date *</label>
              <input
                type="date"
                value={deliveryDate}
                onChange={(e) => setDeliveryDate(e.target.value)}
                className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 border px-3 py-2"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Driver Name *</label>
              <Input
                placeholder="e.g., John Doe"
                value={driverName}
                onChange={(e) => setDriverName(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Truck Plate Number *</label>
              <Input
                placeholder="e.g., AA-123-45"
                value={truckPlateNo}
                onChange={(e) => setTruckPlateNo(e.target.value)}
              />
            </div>
          </div>
        </CardBody>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold text-gray-900">Delivery Items</h2>
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
                  <th className="text-left py-2 px-2 text-sm font-semibold text-gray-900">Quantity</th>
                  <th className="text-left py-2 px-2 text-sm font-semibold text-gray-900">Unit</th>
                  <th className="text-left py-2 px-2 text-sm font-semibold text-gray-900">Action</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => (
                  <tr key={item.id} className="border-b">
                    <td className="py-3 px-2">
                      <select
                        value={item.itemId}
                        onChange={(e) => handleItemChange(item.id, 'itemId', e.target.value)}
                        disabled={loadingData}
                        className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 border px-2 py-1"
                      >
                        <option value="">Select Item</option>
                        {masterItems.map(masterItem => (
                          <option key={masterItem.id} value={masterItem.id}>
                            {masterItem.name} ({masterItem.code})
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="py-3 px-2">
                      <input
                        type="number"
                        min="0.01"
                        step="0.01"
                        value={item.quantity}
                        onChange={(e) => handleItemChange(item.id, 'quantity', parseFloat(e.target.value) || 0)}
                        className="w-24 rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 border px-2 py-1"
                      />
                    </td>
                    <td className="py-3 px-2">
                      <input
                        type="text"
                        value={item.unit}
                        readOnly
                        className="w-20 rounded-md border-gray-300 bg-gray-100 shadow-sm border px-2 py-1"
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
          <div className="mt-4 text-sm text-gray-500">
            Total: {items.length} item{items.length !== 1 ? 's' : ''}
          </div>
        </CardBody>
      </Card>

      <div className="flex gap-3">
        <Button
          variant="primary"
          size="lg"
          onClick={handleSave}
          disabled={loading}
          className="flex-1"
        >
          {loading ? 'Saving...' : 'Save Delivery'}
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
