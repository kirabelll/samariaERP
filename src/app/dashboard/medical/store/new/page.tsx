'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Card, CardHeader, CardBody, CardFooter, Button, Input, Select } from '@/components/ui';

export default function NewMedicalBatchPage() {
  const router = useRouter();
  const [itemId, setItemId] = useState('');
  const [batchNo, setBatchNo] = useState('');
  const [expiryDate, setExpiryDate] = useState('');
  const [quantity, setQuantity] = useState('');
  const [costPrice, setCostPrice] = useState('');
  const [warehouse, setWarehouse] = useState('');
  const [supplierId, setSupplierId] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!itemId || !batchNo || !expiryDate || !quantity || !costPrice || !warehouse || !supplierId) {
      alert('Please fill in all required fields');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/api/medical/batches', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          itemId,
          batchNo,
          expiryDate,
          quantity: parseFloat(quantity),
          costPrice: parseFloat(costPrice),
          warehouse,
          supplierId,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to save medical batch');
      }

      alert('Medical batch saved successfully!');
      router.push('/dashboard/medical/store');
    } catch (error) {
      alert('Error: ' + (error instanceof Error ? error.message : 'Unknown error'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-gray-900">New Medical Batch</h1>
        <Link href="/dashboard/medical/store" className="text-blue-600 hover:text-blue-800">
          &larr; Back
        </Link>
      </div>

      <Card>
        <CardHeader>
          <h2 className="text-xl font-semibold text-gray-900">Batch Information</h2>
        </CardHeader>
        <CardBody className="space-y-4">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Item ID *</label>
                <Input
                  placeholder="e.g., MED-001"
                  value={itemId}
                  onChange={(e) => setItemId(e.target.value)}
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Batch Number *</label>
                <Input
                  placeholder="e.g., BATCH-2024-001"
                  value={batchNo}
                  onChange={(e) => setBatchNo(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Expiry Date *</label>
                <input
                  type="date"
                  value={expiryDate}
                  onChange={(e) => setExpiryDate(e.target.value)}
                  className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 border px-3 py-2"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Quantity *</label>
                <input
                  type="number"
                  min="0.01"
                  step="0.01"
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                  className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 border px-3 py-2"
                  placeholder="e.g., 100"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Cost Price (ETB) *</label>
                <input
                  type="number"
                  min="0.01"
                  step="0.01"
                  value={costPrice}
                  onChange={(e) => setCostPrice(e.target.value)}
                  className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 border px-3 py-2"
                  placeholder="e.g., 150.00"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Warehouse *</label>
                <Select
                  value={warehouse}
                  onChange={(e) => setWarehouse(e.target.value)}
                  options={[
                    { value: '', label: 'Select Warehouse' },
                    { value: 'medical_store', label: 'Medical Store' },
                    { value: 'quarantine', label: 'Quarantine' },
                  ]}
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Supplier ID *</label>
              <Input
                placeholder="e.g., SUP-001"
                value={supplierId}
                onChange={(e) => setSupplierId(e.target.value)}
                required
              />
            </div>
          </form>
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
              <span className="font-medium">{quantity || '0'} units</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Unit Cost Price:</span>
              <span className="font-medium">ETB {costPrice ? parseFloat(costPrice).toLocaleString('en-US') : '0'}</span>
            </div>
            <div className="border-t pt-3 flex justify-between">
              <span className="text-gray-900 font-semibold">Total Cost:</span>
              <span className="text-2xl font-bold text-gray-900">
                ETB {quantity && costPrice ? (parseFloat(quantity) * parseFloat(costPrice)).toLocaleString('en-US') : '0'}
              </span>
            </div>
          </div>
        </CardBody>
      </Card>

      <div className="flex gap-3">
        <Button
          variant="primary"
          size="lg"
          onClick={(e) => {
            const form = document.querySelector('form');
            if (form) form.dispatchEvent(new Event('submit', { bubbles: true }));
          }}
          disabled={loading}
          className="flex-1"
        >
          {loading ? 'Saving...' : 'Save Batch'}
        </Button>
        <Link href="/dashboard/medical/store" className="flex-1">
          <Button
            variant="outline"
            size="lg"
            className="w-full"
          >
            Cancel
          </Button>
        </Link>
      </div>
    </div>
  );
}
