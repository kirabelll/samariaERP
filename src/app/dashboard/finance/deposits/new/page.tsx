'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardBody, CardHeader, Button, Input, Select } from '@/components/ui';
import { Upload } from 'lucide-react';

interface Customer {
  customerId: string;
  companyName: string;
  agreementNo: string;
  phone?: string;
  tin?: string;
  withholding?: boolean;
  withholdRate?: number;
  creditLimit?: number;
  creditTermDays?: number;
  agreementId?: string;
  agreementStatus?: string;
  division?: string;
  validFrom?: string;
  validTo?: string;
  totalAmount?: number;
  items?: any[];
  terms?: string;
}

interface FormData {
  customerId: string;
  amount: string;
  depositMethod: string;
  bankName: string;
  refNo: string;
  notes: string;
}

export default function NewDepositPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [fetchingCustomers, setFetchingCustomers] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [depositSlipFile, setDepositSlipFile] = useState<File | null>(null);
  const [uploadingSlip, setUploadingSlip] = useState(false);
  const [formData, setFormData] = useState<FormData>({
    customerId: '',
    amount: '',
    depositMethod: 'cash',
    bankName: '',
    refNo: '',
    notes: '',
  });

  useEffect(() => {
    fetchCustomers();
  }, []);

  const fetchCustomers = async () => {
    setFetchingCustomers(true);
    try {
      const response = await fetch('/api/sales/agreements/customers');
      if (!response.ok) throw new Error('Failed to fetch customers');

      const result = await response.json();
      setCustomers(result.data || []);
    } catch (err: any) {
      console.error('Failed to fetch customers:', err.message);
    } finally {
      setFetchingCustomers(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const uploadDepositSlip = async (depositId: string): Promise<string | null> => {
    if (!depositSlipFile) return null;

    try {
      setUploadingSlip(true);
      const uploadData = new window.FormData();
      uploadData.append('file', depositSlipFile);
      uploadData.append('module', 'finance');
      uploadData.append('recordId', depositId);
      uploadData.append('docType', 'deposit_slip');

      const response = await fetch('/api/documents', {
        method: 'POST',
        body: uploadData,
      });

      const result = await response.json();
      if (!response.ok || !result.success) {
        console.error('Failed to upload deposit slip:', result.error);
        return null;
      }

      return result.data.filePath;
    } catch (err) {
      console.error('Error uploading deposit slip:', err);
      return null;
    } finally {
      setUploadingSlip(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      // Validate required fields
      if (!formData.customerId || !formData.amount) {
        throw new Error('Please fill in all required fields');
      }

      if (formData.depositMethod === 'bank_transfer' && !formData.bankName) {
        throw new Error('Bank name is required for bank transfers');
      }

      const response = await fetch('/api/finance/deposits', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to create deposit');
      }

      // Upload deposit slip if a file was selected
      if (depositSlipFile && result.data?.id) {
        const slipPath = await uploadDepositSlip(result.data.id);
        if (slipPath) {
          // Update the deposit with the deposit slip path
          await fetch(`/api/finance/deposits/${result.data.id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ depositSlip: slipPath }),
          });
        }
      }

      // Success - redirect to deposits list
      router.push('/dashboard/finance/deposits');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4 sm:space-y-6 max-w-4xl">
      <div className="flex items-center justify-between">
        <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-[#1D1D1F]">Create New Customer Deposit</h1>
        <Button
          variant="secondary"
          onClick={() => router.push('/dashboard/finance/deposits')}
        >
          Cancel
        </Button>
      </div>

      {error && (
        <div className="bg-[#FF3B30]/10 border border-[#FF3B30] rounded-2xl p-4 text-[#D70015]">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Customer Selection */}
        <Card>
          <CardHeader>
            <h2 className="text-lg font-semibold text-[#1D1D1F]">Customer Information</h2>
          </CardHeader>
          <CardBody className="space-y-4">
            <Select
              label="Customer"
              name="customerId"
              value={formData.customerId}
              onChange={handleChange}
              options={[
                { value: '', label: customers.length === 0 && !fetchingCustomers ? 'No customers with active sales agreements found' : 'Select a customer...' },
                ...customers.map((customer) => ({
                  value: customer.customerId,
                  label: `${customer.companyName} — ${customer.agreementNo}`,
                })),
              ]}
              required
              disabled={fetchingCustomers}
            />
          </CardBody>
        </Card>

        {/* Deposit Details */}
        <Card>
          <CardHeader>
            <h2 className="text-lg font-semibold text-[#1D1D1F]">Deposit Details</h2>
          </CardHeader>
          <CardBody className="space-y-4">
            <Input
              label="Amount"
              name="amount"
              type="number"
              placeholder="0.00"
              step="0.01"
              value={formData.amount}
              onChange={handleChange}
              required
            />

            <Select
              label="Deposit Method"
              name="depositMethod"
              value={formData.depositMethod}
              onChange={handleChange}
              options={[
                { value: 'cash', label: 'Cash' },
                { value: 'bank_transfer', label: 'Bank Transfer' },
                { value: 'check', label: 'Check' },
              ]}
              required
            />

            {formData.depositMethod === 'bank_transfer' && (
              <Input
                label="Bank Name"
                name="bankName"
                type="text"
                placeholder="Enter bank name"
                value={formData.bankName}
                onChange={handleChange}
                required={formData.depositMethod === 'bank_transfer'}
              />
            )}

            <Input
              label="Reference Number"
              name="refNo"
              type="text"
              placeholder="e.g., TR-2024-001"
              value={formData.refNo}
              onChange={handleChange}
            />
          </CardBody>
        </Card>

        {/* Deposit Slip Upload */}
        <Card>
          <CardHeader>
            <h2 className="text-lg font-semibold text-[#1D1D1F]">Deposit Slip</h2>
          </CardHeader>
          <CardBody className="space-y-4">
            <div>
              <label className="block text-[13px] font-medium text-[#86868B] uppercase tracking-wider mb-1.5">
                Upload Deposit Slip (optional)
              </label>
              <div className="relative">
                <input
                  type="file"
                  accept="image/*,.pdf"
                  onChange={(e) => setDepositSlipFile(e.target.files?.[0] || null)}
                  className="hidden"
                  id="deposit-slip-input"
                />
                <label
                  htmlFor="deposit-slip-input"
                  className="flex items-center justify-center gap-2 w-full px-4 py-3 bg-white/80 border border-dashed border-[#D2D2D7] rounded-xl cursor-pointer hover:border-[#007AFF] hover:bg-blue-50/30 transition-all duration-200 text-[#86868B]"
                >
                  <Upload className="w-5 h-5" />
                  {depositSlipFile ? (
                    <span className="text-[#1D1D1F] font-medium">{depositSlipFile.name}</span>
                  ) : (
                    <span>Click to upload deposit slip (image or PDF)</span>
                  )}
                </label>
              </div>
              {depositSlipFile && (
                <div className="mt-2 flex items-center justify-between text-sm">
                  <span className="text-slate-600">
                    {(depositSlipFile.size / 1024).toFixed(1)} KB
                  </span>
                  <button
                    type="button"
                    onClick={() => setDepositSlipFile(null)}
                    className="text-red-600 hover:text-red-800 font-medium"
                  >
                    Remove
                  </button>
                </div>
              )}
            </div>
          </CardBody>
        </Card>

        {/* Notes */}
        <Card>
          <CardHeader>
            <h2 className="text-lg font-semibold text-[#1D1D1F]">Additional Information</h2>
          </CardHeader>
          <CardBody className="space-y-4">
            <div>
              <label className="block text-[13px] font-medium text-[#86868B] uppercase tracking-wider mb-1.5">
                Notes
              </label>
              <textarea
                name="notes"
                placeholder="Enter any additional notes"
                className="w-full px-4 py-3 bg-white/80 border border-[#D2D2D7] rounded-xl focus:outline-none focus:ring-4 focus:ring-[rgba(0,122,255,0.25)] focus:border-[#007AFF] transition-all duration-200 text-[#1D1D1F] placeholder:text-[#86868B] min-h-24 resize-vertical"
                value={formData.notes}
                onChange={handleChange}
              />
            </div>
          </CardBody>
        </Card>

        {/* Action Buttons */}
        <Card>
          <CardBody>
            <div className="flex gap-3 justify-end">
              <Button
                variant="secondary"
                size="lg"
                onClick={() => router.push('/dashboard/finance/deposits')}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                size="lg"
                type="submit"
                disabled={loading || uploadingSlip}
                isLoading={loading || uploadingSlip}
              >
                {uploadingSlip ? 'Uploading Slip...' : 'Create Deposit'}
              </Button>
            </div>
          </CardBody>
        </Card>
      </form>
    </div>
  );
}
