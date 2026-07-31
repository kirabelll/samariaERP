'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardHeader, CardBody, CardFooter, Button, Input, Select } from '@/components/ui';

export default function NewCementPurchasePage() {
  const router = useRouter();
  const [factory, setFactory] = useState('');
  const [quantity, setQuantity] = useState('');
  const [unitPrice, setUnitPrice] = useState('');
  const [transportCost, setTransportCost] = useState('');
  const [receiptNumber, setReceiptNumber] = useState('');
  const [purchaseDate, setPurchaseDate] = useState(new Date().toISOString().split('T')[0]);

  const totalQuantity = quantity ? parseInt(quantity) : 0;
  const cementCost = (quantity && unitPrice) ? parseInt(quantity) * parseFloat(unitPrice) : 0;
  const totalAmount = cementCost + (transportCost ? parseFloat(transportCost) : 0);

  const handleSave = () => {
    if (!factory || !quantity || !unitPrice || !receiptNumber || !transportCost) {
      alert('Please fill in all required fields');
      return;
    }
    alert('Cement Purchase saved successfully!');
    router.push('/dashboard/cement/purchase');
  };

  const handleCancel = () => {
    router.push('/dashboard/cement/purchase');
  };

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-gray-900">New Cement Purchase</h1>

      <Card>
        <CardHeader>
          <h2 className="text-xl font-semibold text-gray-900">Purchase Details</h2>
        </CardHeader>
        <CardBody className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Factory</label>
              <Select
                options={[
                  { value: '', label: 'Select Factory' },
                  { value: 'Cement Factory A', label: 'Cement Factory A' },
                  { value: 'Cement Factory B', label: 'Cement Factory B' },
                  { value: 'Danfe Cement', label: 'Danfe Cement Factory' },
                  { value: 'Addis Cement', label: 'Addis Cement Works' },
                ]}
                value={factory}
                onChange={(e) => setFactory(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Purchase Date</label>
              <input
                type="date"
                value={purchaseDate}
                onChange={(e) => setPurchaseDate(e.target.value)}
                className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 border px-3 py-2"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Quantity (Tons)</label>
              <input
                type="number"
                min="1"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 border px-3 py-2"
                placeholder="Enter quantity in tons"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Unit Price (per ton)</label>
              <input
                type="number"
                step="0.01"
                value={unitPrice}
                onChange={(e) => setUnitPrice(e.target.value)}
                className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 border px-3 py-2"
                placeholder="Enter unit price"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Transport Cost</label>
              <input
                type="number"
                step="0.01"
                value={transportCost}
                onChange={(e) => setTransportCost(e.target.value)}
                className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 border px-3 py-2"
                placeholder="Enter transport cost"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Receipt Number</label>
              <Input
                placeholder="e.g., RCP-001"
                value={receiptNumber}
                onChange={(e) => setReceiptNumber(e.target.value)}
              />
            </div>
          </div>
        </CardBody>
      </Card>

      <Card>
        <CardHeader>
          <h2 className="text-xl font-semibold text-gray-900">Cost Summary</h2>
        </CardHeader>
        <CardBody>
          <div className="space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Quantity:</span>
              <span className="font-medium">{totalQuantity} tons</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Cement Cost:</span>
              <span className="font-medium">ETB {cementCost.toLocaleString('en-US')}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Transport Cost:</span>
              <span className="font-medium">ETB {(transportCost ? parseFloat(transportCost) : 0).toLocaleString('en-US')}</span>
            </div>
            <div className="border-t pt-3 flex justify-between">
              <span className="text-gray-900 font-semibold">Total Amount:</span>
              <span className="text-2xl font-bold text-gray-900">
                ETB {totalAmount.toLocaleString('en-US')}
              </span>
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
          Save Purchase
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
