'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardHeader, CardBody, CardFooter, Button, Input, Select } from '@/components/ui';

interface BankAccount {
  bankName: string;
  accountNo: string;
  accountName: string;
}

interface FormData {
  name: string;
  email: string;
  phone: string;
  tin: string;
  address: string;
  category: string;
  contactPerson: string;
  bankAccounts: BankAccount[];
  withholding: boolean;
  withholdRate: number;
  status: 'Active' | 'Inactive';
}

interface FormErrors {
  [key: string]: string;
}

export default function NewSupplierPage() {
  const router = useRouter();
  const [formData, setFormData] = useState<FormData>({
    name: '',
    email: '',
    phone: '',
    tin: '',
    address: '',
    category: '',
    contactPerson: '',
    bankAccounts: [],
    withholding: false,
    withholdRate: 2,
    status: 'Active',
  });

  const [errors, setErrors] = useState<FormErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [newBankAccount, setNewBankAccount] = useState<BankAccount>({
    bankName: '',
    accountNo: '',
    accountName: '',
  });

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Supplier name is required';
    }
    if (!formData.phone.trim()) {
      newErrors.phone = 'Phone is required';
    }
    if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Invalid email format';
    }
    if (!formData.address.trim()) {
      newErrors.address = 'Address is required';
    }
    if (!formData.category.trim()) {
      newErrors.category = 'Category is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;

    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));

    if (errors[name]) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }
  };

  const handleAddBankAccount = () => {
    if (!newBankAccount.bankName.trim() || !newBankAccount.accountNo.trim() || !newBankAccount.accountName.trim()) {
      setErrors((prev) => ({
        ...prev,
        bankAccount: 'Please fill in all bank account fields',
      }));
      return;
    }

    setFormData((prev) => ({
      ...prev,
      bankAccounts: [...prev.bankAccounts, newBankAccount],
    }));

    setNewBankAccount({
      bankName: '',
      accountNo: '',
      accountName: '',
    });

    setErrors((prev) => {
      const newErrors = { ...prev };
      delete newErrors.bankAccount;
      return newErrors;
    });
  };

  const handleRemoveBankAccount = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      bankAccounts: prev.bankAccounts.filter((_, i) => i !== index),
    }));
  };

  const handleNewBankAccountChange = (
    e: React.ChangeEvent<HTMLInputElement>,
    field: keyof BankAccount
  ) => {
    const { value } = e.target;
    setNewBankAccount((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);
    try {
      const payloadData = {
        companyName: formData.name,
        phone: formData.phone,
        email: formData.email || null,
        tin: formData.tin || null,
        location: formData.address,
        category: formData.category,
        contactPerson: formData.contactPerson || null,
        bankAccounts: formData.bankAccounts,
        withholding: formData.withholding,
        withholdRate: formData.withholdRate,
        status: formData.status,
      };

      const res = await fetch('/api/suppliers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payloadData),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error || 'Failed to create supplier');
      alert('Supplier created successfully!');
      router.push('/dashboard/suppliers');
    } catch (error) {
      console.error('Error submitting form:', error);
      setErrors({ submit: 'Failed to create supplier' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    router.push('/dashboard/suppliers');
  };

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-slate-600">
        <button
          onClick={handleCancel}
          className="text-blue-600 hover:text-blue-700 font-medium"
        >
          Suppliers
        </button>
        <span>/</span>
        <span className="text-slate-900 font-medium">New Supplier</span>
      </div>

      {/* Page Header */}
      <div>
        <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-slate-900">Create New Supplier</h1>
        <p className="text-slate-600 mt-2">Fill in the details below to add a new supplier</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basic Information Section */}
        <Card>
          <CardHeader>
            <h2 className="text-xl font-bold text-slate-900">Basic Information</h2>
          </CardHeader>
          <CardBody className="space-y-6">
            <Input
              label="Supplier Name"
              name="name"
              value={formData.name}
              onChange={handleInputChange}
              error={errors.name}
              placeholder="e.g., Djibouti Cement Suppliers"
              required
            />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Input
                label="Email"
                name="email"
                type="email"
                value={formData.email}
                onChange={handleInputChange}
                error={errors.email}
                placeholder="supplier@example.com"
              />
              <Input
                label="Phone"
                name="phone"
                type="tel"
                value={formData.phone}
                onChange={handleInputChange}
                error={errors.phone}
                placeholder="+251911334455"
                required
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Input
                label="TIN Number"
                name="tin"
                value={formData.tin}
                onChange={handleInputChange}
                placeholder="e.g., 011987654321"
              />
              <Select
                label="Category"
                name="category"
                value={formData.category}
                onChange={handleInputChange}
                error={errors.category}
                options={[
                  { value: '', label: 'Select Category' },
                  { value: 'Construction', label: 'Construction' },
                  { value: 'Medicine/Medical', label: 'Medicine/Medical' },
                  { value: 'Food & Beverage', label: 'Food & Beverage' },
                  { value: 'Industrial', label: 'Industrial' },
                  { value: 'General', label: 'General' },
                  { value: 'Other', label: 'Other' },
                ]}
                required
              />
            </div>

            <Input
              label="Contact Person"
              name="contactPerson"
              value={formData.contactPerson}
              onChange={handleInputChange}
              placeholder="e.g., John Doe"
            />
          </CardBody>
        </Card>

        {/* Address Section */}
        <Card>
          <CardHeader>
            <h2 className="text-xl font-bold text-slate-900">Address Information</h2>
          </CardHeader>
          <CardBody className="space-y-6">
            <Input
              label="Address"
              name="address"
              value={formData.address}
              onChange={handleInputChange}
              error={errors.address}
              placeholder="Street address"
              required
            />
          </CardBody>
        </Card>

        {/* Bank Information Section */}
        <Card>
          <CardHeader>
            <h2 className="text-xl font-bold text-slate-900">Bank Accounts</h2>
          </CardHeader>
          <CardBody className="space-y-6">
            {/* Add Bank Account Form */}
            <div className="border-l-4 border-blue-500 bg-blue-50 p-4 rounded">
              <h3 className="font-semibold text-slate-900 mb-4">Add Bank Account</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <input
                  type="text"
                  placeholder="Bank Name"
                  value={newBankAccount.bankName}
                  onChange={(e) => handleNewBankAccountChange(e, 'bankName')}
                  className="px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <input
                  type="text"
                  placeholder="Account Number"
                  value={newBankAccount.accountNo}
                  onChange={(e) => handleNewBankAccountChange(e, 'accountNo')}
                  className="px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <input
                  type="text"
                  placeholder="Account Holder Name"
                  value={newBankAccount.accountName}
                  onChange={(e) => handleNewBankAccountChange(e, 'accountName')}
                  className="px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              {errors.bankAccount && (
                <p className="text-red-600 text-sm mt-2">{errors.bankAccount}</p>
              )}
              <Button
                type="button"
                variant="primary"
                size="sm"
                onClick={handleAddBankAccount}
                className="mt-4"
              >
                Add Bank Account
              </Button>
            </div>

            {/* Bank Accounts List */}
            {formData.bankAccounts.length > 0 && (
              <div className="space-y-2">
                <h3 className="font-semibold text-slate-900">Added Bank Accounts</h3>
                {formData.bankAccounts.map((bank, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-3 bg-slate-50 border border-slate-200 rounded-lg"
                  >
                    <div className="text-sm">
                      <p className="font-medium text-slate-900">{bank.bankName}</p>
                      <p className="text-slate-600">{bank.accountNo} - {bank.accountName}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleRemoveBankAccount(index)}
                      className="px-3 py-1 text-sm text-red-600 hover:bg-red-50 rounded border border-red-200"
                    >
                      Remove
                    </button>
                  </div>
                ))}
              </div>
            )}
          </CardBody>
        </Card>

        {/* Withholding Section */}
        <Card>
          <CardHeader>
            <h2 className="text-xl font-bold text-slate-900">Withholding Tax</h2>
          </CardHeader>
          <CardBody className="space-y-6">
            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                id="withholding"
                checked={formData.withholding}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    withholding: e.target.checked,
                  }))
                }
                className="w-4 h-4 text-blue-600 rounded"
              />
              <label htmlFor="withholding" className="text-slate-900 font-medium">
                Apply Withholding Tax
              </label>
            </div>

            {formData.withholding && (
              <Input
                label="Withhold Rate (%)"
                type="number"
                value={formData.withholdRate.toString()}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    withholdRate: parseFloat(e.target.value) || 2,
                  }))
                }
                placeholder="e.g., 2"
                min="0"
                max="100"
                step="0.1"
              />
            )}
          </CardBody>
        </Card>

        {/* Status Section */}
        <Card>
          <CardHeader>
            <h2 className="text-xl font-bold text-slate-900">Status</h2>
          </CardHeader>
          <CardBody className="space-y-6">
            <Select
              label="Status"
              name="status"
              value={formData.status}
              onChange={handleInputChange}
              options={[
                { value: 'Active', label: 'Active' },
                { value: 'Inactive', label: 'Inactive' },
              ]}
            />
          </CardBody>
        </Card>

        {/* Buttons */}
        <Card>
          <CardFooter>
            <div className="flex gap-4">
              <Button
                type="submit"
                variant="primary"
                size="lg"
                isLoading={isSubmitting}
              >
                Save Supplier
              </Button>
              <Button
                type="button"
                variant="outline"
                size="lg"
                onClick={handleCancel}
              >
                Cancel
              </Button>
            </div>
          </CardFooter>
        </Card>

        {errors.submit && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">
            {errors.submit}
          </div>
        )}
      </form>
    </div>
  );
}
