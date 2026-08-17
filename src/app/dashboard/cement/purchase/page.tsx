'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Card, CardHeader, CardBody, CardFooter, Button, Input, Select, Table, Modal } from '@/components/ui';
import { useI18n } from '@/lib/i18n';

interface FormData {
  factory: string;
  cementType: string;
  quantity: string;
  unitPrice: string;
  paymentReference: string;
  paymentDate: string;
}

interface ExistingPurchase {
  id: string;
  purchaseNo: string;
  factory: string;
  cementType: string;
  quantity: number;
  unitPrice: number;
  totalAmount: number;
  balanceRemaining: number;
  date: string;
}

export default function CementFactoryPurchase() {
  const { t } = useI18n();
  const [formData, setFormData] = useState<FormData>({
    factory: '',
    cementType: '',
    quantity: '',
    unitPrice: '',
    paymentReference: '',
    paymentDate: '',
  });

  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Sample data
  const factories = [
    { value: '1', label: 'Ethiopian Cement Factory' },
    { value: '2', label: 'Dangote Cement (Addis)' },
    { value: '3', label: 'Lafarge Cement (East Africa)' },
    { value: '4', label: 'Derba Cement Works' },
  ];

  const cementTypes = [
    { value: 'ordinary', label: 'Ordinary Portland Cement (OPC)' },
    { value: 'pozzolana', label: 'Pozzolana Cement' },
    { value: 'composite', label: 'Composite Cement' },
  ];

  const existingPurchases: ExistingPurchase[] = [
    {
      id: '1',
      purchaseNo: 'PUR-2024-001',
      factory: 'Ethiopian Cement Factory',
      cementType: 'Ordinary Portland',
      quantity: 500,
      unitPrice: 850,
      totalAmount: 425000,
      balanceRemaining: 180,
      date: '2024-03-01',
    },
    {
      id: '2',
      purchaseNo: 'PUR-2024-002',
      factory: 'Dangote Cement (Addis)',
      cementType: 'Pozzolana',
      quantity: 750,
      unitPrice: 900,
      totalAmount: 675000,
      balanceRemaining: 130,
      date: '2024-03-05',
    },
    {
      id: '3',
      purchaseNo: 'PUR-2024-003',
      factory: 'Lafarge Cement (East Africa)',
      cementType: 'Composite',
      quantity: 600,
      unitPrice: 880,
      totalAmount: 528000,
      balanceRemaining: 120,
      date: '2024-03-08',
    },
  ];

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const totalAmount = parseFloat(formData.quantity || '0') * parseFloat(formData.unitPrice || '0');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    // Simulate API call
    setTimeout(() => {
      setIsSubmitting(false);
      setShowSuccessModal(true);
      // Reset form
      setFormData({
        factory: '',
        cementType: '',
        quantity: '',
        unitPrice: '',
        paymentReference: '',
        paymentDate: '',
      });
    }, 1500);
  };

  const columns = [
    { header: 'Purchase No', accessor: 'purchaseNo' as const },
    { header: 'Factory', accessor: 'factory' as const },
    { header: 'Cement Type', accessor: 'cementType' as const },
    { header: 'Quantity (tons)', accessor: 'quantity' as const },
    { header: 'Unit Price (₦)', accessor: 'unitPrice' as const },
    { header: 'Total Amount (₦)', accessor: 'totalAmount' as const,
      render: (val: number) => `₦${(val ?? 0).toLocaleString('en-US')}`
    },
    { header: 'Balance (tons)', accessor: 'balanceRemaining' as const },
    { header: 'Date', accessor: 'date' as const },
  ];

  return (
    <div className="space-y-6">
      <div>
        <Link href="/dashboard/cement" className="text-blue-600 hover:text-blue-800 text-sm font-medium">
          ← Back to Cement Operations
        </Link>
        <h1 className="text-3xl font-bold text-gray-900 mt-4">Cement Factory Purchase</h1>
        <p className="text-gray-600 mt-1">Record cement purchases from factories</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Purchase Details */}
        <Card>
          <CardHeader>
            <h2 className="text-lg font-semibold text-gray-900">Purchase Details</h2>
          </CardHeader>
          <CardBody>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Select
                label="Factory *"
                name="factory"
                required
                options={factories}
                value={formData.factory}
                onChange={handleInputChange}
              />
              <Select
                label="Cement Type *"
                name="cementType"
                required
                options={cementTypes}
                value={formData.cementType}
                onChange={handleInputChange}
              />
              <Input
                label="Quantity (tons) *"
                name="quantity"
                type="number"
                step="0.1"
                required
                placeholder="Enter quantity"
                value={formData.quantity}
                onChange={handleInputChange}
              />
              <Input
                label="Unit Price (₦) *"
                name="unitPrice"
                type="number"
                step="0.01"
                required
                placeholder="Enter unit price"
                value={formData.unitPrice}
                onChange={handleInputChange}
              />
            </div>
          </CardBody>
        </Card>

        {/* Total Amount */}
        <Card>
          <CardBody>
            <div className="bg-blue-50 p-6 rounded-lg border border-blue-200">
              <p className="text-sm text-gray-600 mb-2">Total Amount</p>
              <p className="text-4xl font-bold text-gray-900">₦{(totalAmount ?? 0).toLocaleString('en-US')}</p>
            </div>
          </CardBody>
        </Card>


        {/* Form Actions */}
        <Card>
          <CardFooter className="flex gap-3 justify-end">
            <Link href="/dashboard/cement">
              <Button variant="outline" size="md">
                Cancel
              </Button>
            </Link>
            <Button
              variant="primary"
              size="md"
              type="submit"
              isLoading={isSubmitting}
              disabled={!formData.factory || !formData.quantity || !formData.unitPrice}
            >
              Save Purchase
            </Button>
          </CardFooter>
        </Card>
      </form>

      {/* Existing Purchases */}
      <Card>
        <CardHeader>
          <h2 className="text-lg font-semibold text-gray-900">Recent Factory Purchases</h2>
        </CardHeader>
        <CardBody>
          <Table
            data={existingPurchases}
            columns={columns}
            emptyMessage="No purchases found"
          />
        </CardBody>
      </Card>

      {/* Success Modal */}
      <Modal
        isOpen={showSuccessModal}
        onClose={() => setShowSuccessModal(false)}
        title="Purchase Recorded Successfully"
        body={
          <div className="space-y-4">
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <p className="text-sm text-gray-700">
                Your cement purchase has been recorded with Purchase No: <strong>PUR-2024-004</strong>
              </p>
            </div>
            <p className="text-gray-600">
              The cement is now available in the factory's balance for lifting operations. You can proceed with creating liftings for this purchase.
            </p>
          </div>
        }
        footer={
          <div className="flex gap-3">
            <Link href="/dashboard/cement">
              <Button variant="secondary">
                Back to Cement Operations
              </Button>
            </Link>
            <Link href="/dashboard/cement/lifting">
              <Button variant="primary">
                Create Lifting
              </Button>
            </Link>
          </div>
        }
      />
    </div>
  );
}
