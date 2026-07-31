'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Card, CardHeader, CardBody, Button, Badge, Input, Select, Table } from '@/components/ui';
import { useI18n } from '@/lib/i18n';
import { useRouter } from 'next/navigation';

interface MedicalCustomer {
  id: string;
  name: string;
  licenseStatus: 'Valid' | 'Expired';
  licenseExpiryDate: string;
}

interface MedicalItem {
  id: string;
  name: string;
  unitPrice: number;
}

interface IssueBatch {
  id: string;
  batchNo: string;
  expiryDate: string;
  availableQty: number;
}

interface IssueItem {
  itemId: string;
  itemName: string;
  batchNo: string;
  qty: number;
  unitPrice: number;
  total: number;
}

export default function NewStoreIssue() {
  const { t } = useI18n();
  const router = useRouter();

  const [selectedCustomer, setSelectedCustomer] = useState('');
  const [requestReference, setRequestReference] = useState('');
  const [deliveryMethod, setDeliveryMethod] = useState<'pickup' | 'delivery'>('pickup');
  const [receiverName, setReceiverName] = useState('');
  const [receiverPhone, setReceiverPhone] = useState('');
  const [selectedItem, setSelectedItem] = useState('');
  const [selectedBatch, setSelectedBatch] = useState('');
  const [issueQty, setIssueQty] = useState('');
  const [issueItems, setIssueItems] = useState<IssueItem[]>([
    {
      itemId: '1',
      itemName: 'Paracetamol Tablets 500mg',
      batchNo: 'BATCH-001',
      qty: 100,
      unitPrice: 50,
      total: 5000,
    },
    {
      itemId: '2',
      itemName: 'Antibacterial Cream',
      batchNo: 'BATCH-003',
      qty: 50,
      unitPrice: 200,
      total: 10000,
    },
  ]);

  const medicalCustomers: MedicalCustomer[] = [
    {
      id: '1',
      name: 'Unity Hospital',
      licenseStatus: 'Valid',
      licenseExpiryDate: '2025-12-31',
    },
    {
      id: '2',
      name: 'Addis Medical Center',
      licenseStatus: 'Valid',
      licenseExpiryDate: '2025-06-30',
    },
    {
      id: '3',
      name: 'Green Light Clinic',
      licenseStatus: 'Expired',
      licenseExpiryDate: '2024-03-15',
    },
  ];

  const medicalItems: MedicalItem[] = [
    { id: '1', name: 'Paracetamol Tablets 500mg', unitPrice: 50 },
    { id: '2', name: 'Antibacterial Cream', unitPrice: 200 },
    { id: '3', name: 'Saline Solution 500ml', unitPrice: 150 },
    { id: '4', name: 'Antibiotic Injection (Amoxicillin)', unitPrice: 300 },
    { id: '5', name: 'Vitamin C Supplement', unitPrice: 75 },
  ];

  const batchesByItem: Record<string, IssueBatch[]> = {
    '1': [
      { id: '1', batchNo: 'BATCH-001', expiryDate: '2026-06-30', availableQty: 500 },
      { id: '2', batchNo: 'BATCH-002', expiryDate: '2027-03-15', availableQty: 300 },
    ],
    '2': [
      { id: '3', batchNo: 'BATCH-003', expiryDate: '2025-12-31', availableQty: 200 },
    ],
    '3': [
      { id: '4', batchNo: 'BATCH-004', expiryDate: '2025-09-20', availableQty: 150 },
    ],
  };

  const selectedCustomerData = medicalCustomers.find((c) => c.id === selectedCustomer);
  const totalAmount = issueItems.reduce((sum, item) => sum + item.total, 0);
  const selectedItemData = medicalItems.find((i) => i.id === selectedItem);
  const availableBatches = selectedItem ? batchesByItem[selectedItem] || [] : [];

  const handleAddItem = () => {
    if (!selectedItem || !selectedBatch || !issueQty) {
      alert('Please fill all item fields');
      return;
    }

    const batch = availableBatches.find((b) => b.id === selectedBatch);
    if (!batch) return;

    const qty = parseInt(issueQty);
    if (qty > batch.availableQty) {
      alert('Quantity exceeds available stock');
      return;
    }

    const newItem: IssueItem = {
      itemId: selectedItem,
      itemName: selectedItemData?.name || '',
      batchNo: batch.batchNo,
      qty,
      unitPrice: selectedItemData?.unitPrice || 0,
      total: qty * (selectedItemData?.unitPrice || 0),
    };

    setIssueItems([...issueItems, newItem]);
    setSelectedItem('');
    setSelectedBatch('');
    setIssueQty('');
  };

  const handleRemoveItem = (index: number) => {
    setIssueItems(issueItems.filter((_, i) => i !== index));
  };

  const handleSubmit = async () => {
    if (!selectedCustomer || issueItems.length === 0 || !receiverName) {
      alert('Please fill all required fields and add at least one item');
      return;
    }

    if (selectedCustomerData?.licenseStatus === 'Expired') {
      alert('Customer license has expired. Cannot issue items.');
      return;
    }

    const payload = {
      customerId: selectedCustomer,
      requestReference: requestReference || null,
      deliveryMethod,
      receiverName,
      receiverPhone,
      items: issueItems.map((item) => ({
        itemId: item.itemId,
        batchNo: item.batchNo,
        qty: item.qty,
      })),
      totalAmount,
    };

    try {
      const response = await fetch('/api/medical/store-issues', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        alert('Store issue created successfully');
        router.push('/dashboard/medical/store-issues');
      } else {
        alert('Failed to create store issue');
      }
    } catch (error) {
      alert('Error creating store issue');
      console.error(error);
    }
  };

  const itemColumns = [
    { header: 'Item', accessor: 'itemName' as const },
    { header: 'Batch No', accessor: 'batchNo' as const },
    { header: 'Qty', accessor: 'qty' as const },
    {
      header: 'Unit Price (ETB)',
      accessor: 'unitPrice' as const,
      render: (val: number) => (val ?? 0).toLocaleString('en-US'),
    },
    {
      header: 'Total (ETB)',
      accessor: 'total' as const,
      render: (val: number) => (val ?? 0).toLocaleString('en-US'),
    },
    {
      header: 'Actions',
      accessor: 'itemId' as const,
      render: (_val: any) => (
        <button
          onClick={() => handleRemoveItem(issueItems.findIndex((item) => item.itemId === _val))}
          className="text-red-600 hover:text-red-800 text-sm font-medium"
        >
          Remove
        </button>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/dashboard/medical/store-issues"
          className="text-blue-600 hover:text-blue-800 text-sm font-medium"
        >
          ← Back to Store Issues
        </Link>
        <h1 className="text-3xl font-bold text-gray-900 mt-4">Create New Store Issue</h1>
        <p className="text-gray-600 mt-1">Issue medical items to customer</p>
      </div>

      {/* Customer Selection */}
      <Card>
        <CardHeader>
          <h2 className="text-lg font-semibold text-gray-900">Customer Details</h2>
        </CardHeader>
        <CardBody className="space-y-4">
          <Select
            label="Select Customer *"
            value={selectedCustomer}
            onChange={(e) => setSelectedCustomer(e.target.value)}
            options={medicalCustomers.map((c) => ({
              label: c.name,
              value: c.id,
            }))}
          />

          {selectedCustomerData && (
            <div
              className="p-4 rounded-lg"
              style={{ backgroundColor: '#F5F5F7' }}
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-semibold text-gray-900">{selectedCustomerData.name}</p>
                  <p className="text-sm text-gray-600 mt-1">
                    License expires: {selectedCustomerData.licenseExpiryDate}
                  </p>
                </div>
                <Badge
                  status={
                    selectedCustomerData.licenseStatus === 'Valid'
                      ? 'Completed'
                      : 'Rejected'
                  }
                >
                  {selectedCustomerData.licenseStatus} License
                </Badge>
              </div>
            </div>
          )}

          <Input
            label="Request Reference (Optional)"
            placeholder="Link to medical request if available"
            value={requestReference}
            onChange={(e) => setRequestReference(e.target.value)}
          />
        </CardBody>
      </Card>

      {/* Items Section */}
      <Card>
        <CardHeader>
          <h2 className="text-lg font-semibold text-gray-900">Add Items</h2>
        </CardHeader>
        <CardBody className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Select
              label="Select Item *"
              value={selectedItem}
              onChange={(e) => {
                setSelectedItem(e.target.value);
                setSelectedBatch('');
              }}
              options={[
                { label: 'Choose item...', value: '' },
                ...medicalItems.map((item) => ({
                  label: item.name,
                  value: item.id,
                })),
              ]}
            />

            {selectedItem && (
              <>
                <Select
                  label="Select Batch (FEFO) *"
                  value={selectedBatch}
                  onChange={(e) => setSelectedBatch(e.target.value)}
                  options={[
                    { label: 'Choose batch...', value: '' },
                    ...availableBatches.map((batch) => ({
                      label: `${batch.batchNo} (Exp: ${batch.expiryDate}, Available: ${batch.availableQty})`,
                      value: batch.id,
                    })),
                  ]}
                />

                <Input
                  label="Quantity *"
                  type="number"
                  placeholder="Enter quantity"
                  value={issueQty}
                  onChange={(e) => setIssueQty(e.target.value)}
                />
              </>
            )}
          </div>

          <Button
            variant="secondary"
            onClick={handleAddItem}
            disabled={!selectedItem || !selectedBatch || !issueQty}
          >
            Add Item to Issue
          </Button>

          {/* Items Table */}
          {issueItems.length > 0 && (
            <div className="mt-6">
              <h3 className="font-semibold text-gray-900 mb-3">Items to Issue</h3>
              <Table data={issueItems} columns={itemColumns} emptyMessage="No items added" />
            </div>
          )}
        </CardBody>
      </Card>

      {/* Delivery Details */}
      <Card>
        <CardHeader>
          <h2 className="text-lg font-semibold text-gray-900">Delivery Details</h2>
        </CardHeader>
        <CardBody className="space-y-4">
          <Select
            label="Delivery Method *"
            value={deliveryMethod}
            onChange={(e) => setDeliveryMethod((e.target as HTMLSelectElement).value as 'pickup' | 'delivery')}
            options={[
              { label: 'Pickup', value: 'pickup' },
              { label: 'Delivery', value: 'delivery' },
            ]}
          />

          <Input
            label="Receiver Name *"
            placeholder="Name of person receiving items"
            value={receiverName}
            onChange={(e) => setReceiverName(e.target.value)}
          />

          <Input
            label="Receiver Phone"
            placeholder="Contact phone number"
            value={receiverPhone}
            onChange={(e) => setReceiverPhone(e.target.value)}
          />
        </CardBody>
      </Card>

      {/* Summary and Submit */}
      <Card>
        <CardHeader>
          <h2 className="text-lg font-semibold text-gray-900">Summary</h2>
        </CardHeader>
        <CardBody>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div>
              <p className="text-sm text-gray-600">Items Count</p>
              <p className="text-2xl font-bold text-gray-900">{issueItems.length}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Total Quantity</p>
              <p className="text-2xl font-bold text-gray-900">
                {issueItems.reduce((sum, item) => sum + item.qty, 0)}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Total Amount</p>
              <p
                className="text-2xl font-bold"
                style={{ color: '#007AFF' }}
              >
                ETB {(totalAmount ?? 0).toLocaleString('en-US')}
              </p>
            </div>
          </div>

          <div className="flex gap-3">
            <Button
              variant="secondary"
              onClick={() => router.push('/dashboard/medical/store-issues')}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={handleSubmit}
              disabled={!selectedCustomer || issueItems.length === 0}
            >
              Create Store Issue
            </Button>
          </div>
        </CardBody>
      </Card>
    </div>
  );
}
