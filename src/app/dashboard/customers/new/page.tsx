'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardHeader, CardBody, CardFooter, Button, Input, Select } from '@/components/ui';
import { formatNumberInput, parseFormattedNumber } from '@/lib/utils';

interface FormData {
  companyName: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  tin: string;
  contactPerson: string;
  address: string;
  city: string;
  location: string;
  customerType: 'COMPANY' | 'INDIVIDUAL';
  division: 'CONSTRUCTION' | 'MEDICAL' | 'BOTH';
  creditLimit: string;
  creditTermDays: string;
  withholding: boolean;
  withholdRate: string;
  status: 'Active' | 'Inactive';
}

interface FormErrors {
  [key: string]: string;
}

export default function NewCustomerPage() {
  const router = useRouter();
  const [formData, setFormData] = useState<FormData>({
    companyName: '',
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    tin: '',
    contactPerson: '',
    address: '',
    city: '',
    location: '',
    customerType: 'COMPANY',
    division: 'CONSTRUCTION',
    creditLimit: '',
    creditTermDays: '',
    withholding: false,
    withholdRate: '',
    status: 'Active',
  });

  const [errors, setErrors] = useState<FormErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};

    if (!formData.companyName.trim()) {
      newErrors.companyName = 'Company name is required';
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
    if (formData.creditLimit && isNaN(parseFormattedNumber(formData.creditLimit))) {
      newErrors.creditLimit = 'Credit limit must be a number';
    }
    if (formData.creditTermDays && isNaN(parseInt(formData.creditTermDays))) {
      newErrors.creditTermDays = 'Credit term days must be a number';
    }
    if (formData.withholding && formData.withholdRate && isNaN(parseFloat(formData.withholdRate))) {
      newErrors.withholdRate = 'Withhold rate must be a number';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value, type } = e.target;

    let finalValue: any = value;

    if (type === 'checkbox') {
      finalValue = (e.target as HTMLInputElement).checked;
    } else if (name === 'creditLimit') {
      finalValue = formatNumberInput(value);
    }

    setFormData((prev) => ({
      ...prev,
      [name]: finalValue,
    }));

    if (errors[name]) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);
    try {
      // Combine address and city into location
      const location = `${formData.address}${formData.city ? ', ' + formData.city : ''}`;

      // Build API payload with proper field mapping
      const payload: any = {
        customerType: formData.customerType,
        companyName: formData.companyName,
        phone: formData.phone,
        division: formData.division,
        status: formData.status,
      };

      // Add optional fields only if they have values
      if (formData.firstName.trim()) {
        payload.firstName = formData.firstName;
      }
      if (formData.lastName.trim()) {
        payload.lastName = formData.lastName;
      }
      if (formData.email.trim()) {
        payload.email = formData.email;
      }
      if (formData.tin.trim()) {
        payload.tin = formData.tin;
      }
      if (formData.contactPerson.trim()) {
        payload.contactPerson = formData.contactPerson;
      }
      if (formData.creditLimit.trim()) {
        payload.creditLimit = parseFormattedNumber(formData.creditLimit);
      }
      if (formData.creditTermDays.trim()) {
        payload.creditTermDays = parseInt(formData.creditTermDays);
      }
      if (formData.withholding) {
        payload.withholding = true;
        if (formData.withholdRate.trim()) {
          payload.withholdRate = parseFloat(formData.withholdRate);
        }
      }

      const res = await fetch('/api/customers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error || 'Failed to create customer');
      alert('Customer created successfully!');
      router.push('/dashboard/customers');
    } catch (error) {
      console.error('Error submitting form:', error);
      setErrors({ submit: 'Failed to create customer' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    router.push('/dashboard/customers');
  };

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-slate-600">
        <button
          onClick={handleCancel}
          className="text-blue-600 hover:text-blue-700 font-medium"
        >
          Customers
        </button>
        <span>/</span>
        <span className="text-slate-900 font-medium">New Customer</span>
      </div>

      {/* Page Header */}
      <div>
        <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-slate-900">Create New Customer</h1>
        <p className="text-slate-600 mt-2">Fill in the details below to add a new customer</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basic Information Section */}
        <Card>
          <CardHeader>
            <h2 className="text-xl font-bold text-slate-900">Basic Information</h2>
          </CardHeader>
          <CardBody className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Select
                label="Customer Type"
                name="customerType"
                value={formData.customerType}
                onChange={handleInputChange}
                error={errors.customerType}
                options={[
                  { value: 'COMPANY', label: 'Company' },
                  { value: 'INDIVIDUAL', label: 'Individual' },
                ]}
                required
              />
              <Select
                label="Division"
                name="division"
                value={formData.division}
                onChange={handleInputChange}
                error={errors.division}
                options={[
                  { value: 'CONSTRUCTION', label: 'Construction' },
                  { value: 'MEDICAL', label: 'Medical' },
                  { value: 'BOTH', label: 'Both' },
                ]}
                required
              />
            </div>

            <Input
              label="Company Name"
              name="companyName"
              value={formData.companyName}
              onChange={handleInputChange}
              error={errors.companyName}
              placeholder="e.g., ABC Trading Company"
              required
            />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Input
                label="First Name"
                name="firstName"
                value={formData.firstName}
                onChange={handleInputChange}
                error={errors.firstName}
                placeholder="e.g., John"
              />
              <Input
                label="Last Name"
                name="lastName"
                value={formData.lastName}
                onChange={handleInputChange}
                error={errors.lastName}
                placeholder="e.g., Doe"
              />
            </div>

            <Input
              label="Contact Person"
              name="contactPerson"
              value={formData.contactPerson}
              onChange={handleInputChange}
              error={errors.contactPerson}
              placeholder="Name of primary contact"
            />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Input
                label="Email"
                name="email"
                type="email"
                value={formData.email}
                onChange={handleInputChange}
                error={errors.email}
                placeholder="customer@example.com"
              />
              <Input
                label="Phone"
                name="phone"
                type="tel"
                value={formData.phone}
                onChange={handleInputChange}
                error={errors.phone}
                placeholder="+251911223344"
                required
              />
            </div>

            <Input
              label="TIN Number"
              name="tin"
              value={formData.tin}
              onChange={handleInputChange}
              error={errors.tin}
              placeholder="e.g., 011234567890"
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

            <Input
              label="City"
              name="city"
              value={formData.city}
              onChange={handleInputChange}
              error={errors.city}
              placeholder="e.g., Addis Ababa"
            />
          </CardBody>
        </Card>

        {/* Credit Information Section */}
        <Card>
          <CardHeader>
            <h2 className="text-xl font-bold text-slate-900">Credit Information</h2>
          </CardHeader>
          <CardBody className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Input
                label="Credit Limit (ETB)"
                name="creditLimit"
                value={formData.creditLimit}
                onChange={handleInputChange}
                error={errors.creditLimit}
                placeholder="0.00"
              />
              <Input
                label="Credit Term Days"
                name="creditTermDays"
                type="number"
                value={formData.creditTermDays}
                onChange={handleInputChange}
                error={errors.creditTermDays}
                placeholder="30"
              />
            </div>

            <div className="flex items-center gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  name="withholding"
                  checked={formData.withholding}
                  onChange={handleInputChange}
                  className="w-4 h-4 rounded border-gray-300"
                />
                <span className="text-slate-700 font-medium">Apply Withholding Tax</span>
              </label>
            </div>

            {formData.withholding && (
              <Input
                label="Withholding Tax Rate (%)"
                name="withholdRate"
                type="number"
                step="0.01"
                value={formData.withholdRate}
                onChange={handleInputChange}
                error={errors.withholdRate}
                placeholder="e.g., 2.5"
              />
            )}

            <Select
              label="Status"
              name="status"
              value={formData.status}
              onChange={handleInputChange}
              error={errors.status}
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
                Save Customer
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
