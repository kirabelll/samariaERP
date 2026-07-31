'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Card, CardHeader, CardBody, Button, Badge, Input, Select, Textarea } from '@/components/ui';
import { useI18n } from '@/lib/i18n';
import { useRouter } from 'next/navigation';

interface MedicalItem {
  id: string;
  name: string;
  currentQty: number;
}

interface ItemBatch {
  id: string;
  batchNo: string;
  currentQty: number;
}

export default function NewStockAdjustment() {
  const { t } = useI18n();
  const router = useRouter();

  const [selectedItem, setSelectedItem] = useState('');
  const [selectedBatch, setSelectedBatch] = useState('');
  const [warehouse, setWarehouse] = useState('main');
  const [adjustmentType, setAdjustmentType] = useState<string>('PHYSICAL_COUNT');
  const [newQty, setNewQty] = useState('');
  const [reason, setReason] = useState('');

  const medicalItems: MedicalItem[] = [
    { id: '1', name: 'Paracetamol Tablets 500mg', currentQty: 485 },
    { id: '2', name: 'Antibiotic Injection (Amoxicillin)', currentQty: 250 },
    { id: '3', name: 'Saline Solution 500ml', currentQty: 185 },
    { id: '4', name: 'Vitamin C Supplement', currentQty: 325 },
    { id: '5', name: 'Antibacterial Cream', currentQty: 150 },
  ];

  const batchesByItem: Record<string, ItemBatch[]> = {
    '1': [
      { id: '1', batchNo: 'BATCH-001', currentQty: 485 },
    ],
    '2': [
      { id: '2', batchNo: 'BATCH-005', currentQty: 100 },
      { id: '3', batchNo: 'BATCH-006', currentQty: 150 },
    ],
    '3': [
      { id: '4', batchNo: 'BATCH-003', currentQty: 185 },
    ],
    '4': [
      { id: '5', batchNo: 'BATCH-006', currentQty: 325 },
    ],
    '5': [
      { id: '6', batchNo: 'BATCH-007', currentQty: 150 },
    ],
  };

  const selectedItemData = medicalItems.find((i) => i.id === selectedItem);
  const selectedBatchData = selectedBatch
    ? (batchesByItem[selectedItem] || []).find((b) => b.id === selectedBatch)
    : null;

  const previousQty = selectedBatchData ? selectedBatchData.currentQty : 0;
  const difference = newQty ? parseInt(newQty) - previousQty : 0;

  const handleSubmit = async () => {
    if (!selectedItem || !adjustmentType || !newQty || !reason) {
      alert('Please fill all required fields');
      return;
    }

    const payload = {
      itemId: selectedItem,
      batchNo: selectedBatchData?.batchNo || null,
      warehouse,
      adjustmentType,
      previousQty,
      newQty: parseInt(newQty),
      reason,
    };

    try {
      const response = await fetch('/api/medical/stock-adjustments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        alert('Stock adjustment created successfully');
        router.push('/dashboard/medical/stock-adjustments');
      } else {
        alert('Failed to create stock adjustment');
      }
    } catch (error) {
      alert('Error creating stock adjustment');
      console.error(error);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/dashboard/medical/stock-adjustments"
          className="text-blue-600 hover:text-blue-800 text-sm font-medium"
        >
          ← Back to Stock Adjustments
        </Link>
        <h1 className="text-3xl font-bold text-gray-900 mt-4">Create Stock Adjustment</h1>
        <p className="text-gray-600 mt-1">Adjust medical item stock levels</p>
      </div>

      {/* Item Selection */}
      <Card>
        <CardHeader>
          <h2 className="text-lg font-semibold text-gray-900">Select Item</h2>
        </CardHeader>
        <CardBody className="space-y-4">
          <Select
            label="Medical Item *"
            value={selectedItem}
            onChange={(e) => {
              setSelectedItem(e.target.value);
              setSelectedBatch('');
              setNewQty('');
            }}
            options={[
              { label: 'Choose item...', value: '' },
              ...medicalItems.map((item) => ({
                label: `${item.name} (Current: ${item.currentQty})`,
                value: item.id,
              })),
            ]}
          />

          {selectedItem && (
            <Select
              label="Batch (if applicable)"
              value={selectedBatch}
              onChange={(e) => setSelectedBatch(e.target.value)}
              options={[
                { label: 'No specific batch', value: '' },
                ...((batchesByItem[selectedItem] || []).map((batch) => ({
                  label: `${batch.batchNo} (Current: ${batch.currentQty})`,
                  value: batch.id,
                }))),
              ]}
            />
          )}
        </CardBody>
      </Card>

      {/* Adjustment Details */}
      <Card>
        <CardHeader>
          <h2 className="text-lg font-semibold text-gray-900">Adjustment Details</h2>
        </CardHeader>
        <CardBody className="space-y-4">
          <Select
            label="Warehouse"
            value={warehouse}
            onChange={(e) => setWarehouse(e.target.value)}
            options={[
              { label: 'Main Warehouse', value: 'main' },
              { label: 'Secondary Store', value: 'secondary' },
            ]}
          />

          <Select
            label="Adjustment Type *"
            value={adjustmentType}
            onChange={(e) =>
              setAdjustmentType(
                e.target.value as string
              )
            }
            options={[
              { label: 'Physical Count', value: 'PHYSICAL_COUNT' },
              { label: 'Damage', value: 'DAMAGE' },
              { label: 'Expiry', value: 'EXPIRY' },
              { label: 'Return', value: 'RETURN' },
              { label: 'Transfer', value: 'TRANSFER' },
              { label: 'Write-off', value: 'WRITE_OFF' },
            ]}
          />

          {selectedItem && (
            <>
              <div
                className="p-4 rounded-lg"
                style={{ backgroundColor: '#F5F5F7' }}
              >
                <p className="text-sm text-gray-600">Current Stock</p>
                <p className="text-2xl font-bold text-gray-900">{previousQty} units</p>
              </div>

              <Input
                label="New Quantity *"
                type="number"
                placeholder="Enter new quantity"
                value={newQty}
                onChange={(e) => setNewQty(e.target.value)}
              />

              {newQty && (
                <div
                  className="p-4 rounded-lg border-2"
                  style={{
                    backgroundColor: '#F5F5F7',
                    borderColor: difference < 0 ? '#FF3B30' : '#34C759',
                  }}
                >
                  <p className="text-sm text-gray-600">Difference</p>
                  <p
                    className="text-2xl font-bold"
                    style={{ color: difference < 0 ? '#FF3B30' : '#34C759' }}
                  >
                    {difference > 0 ? '+' : ''}{difference.toLocaleString('en-US')} units
                  </p>
                </div>
              )}
            </>
          )}
        </CardBody>
      </Card>

      {/* Reason */}
      <Card>
        <CardHeader>
          <h2 className="text-lg font-semibold text-gray-900">Adjustment Reason</h2>
        </CardHeader>
        <CardBody>
          <Textarea
            label="Reason for Adjustment *"
            placeholder="Explain why this adjustment is being made. Be as detailed as possible."
            rows={5}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
          />
        </CardBody>
      </Card>

      {/* Submit */}
      <Card>
        <CardBody>
          <div className="flex gap-3">
            <Button
              variant="secondary"
              onClick={() => router.push('/dashboard/medical/stock-adjustments')}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={handleSubmit}
              disabled={!selectedItem || !adjustmentType || !newQty || !reason}
            >
              Create Adjustment
            </Button>
          </div>
        </CardBody>
      </Card>
    </div>
  );
}
