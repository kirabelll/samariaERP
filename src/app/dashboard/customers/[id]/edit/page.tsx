'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Card, CardHeader, CardBody, Button, Input, Select } from '@/components/ui';

interface Customer {
  id: string;
  code: string;
  customerType: 'COMPANY' | 'INDIVIDUAL';
  companyName?: string;
  firstName?: string;
  lastName?: string;
  tin: string;
  phone: string;
  email: string;
  contactPerson: string;
  location: string;
  creditLimit: number;
  creditTermDays: number;
  withholding: boolean;
  withholdRate: number;
  division: 'CONSTRUCTION' | 'MEDICAL' | 'BOTH';
  status: 'Active' | 'Inactive';
}

export default function CustomerEditPage() {
  const params = useParams();
  const router = useRouter();
  const customerId = params.id as string;

  const [customer, setCustomer] = useState<Customer | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    companyName: '',
    customerType: 'COMPANY' as 'COMPANY' | 'INDIVIDUAL',
    email: '',
    phone: '',
    tin: '',
    contactPerson: '',
    location: '',
    division: 'CONSTRUCTION' as 'CONSTRUCTION' | 'MEDICAL' | 'BOTH',
    creditLimit: 0,
    creditTermDays: 0,
    withholding: false,
    withholdRate: 0,
    status: 'Active' as 'Active' | 'Inactive',
  });

  useEffect(() => {
    const fetchCustomer = async () => {
      try {
        setLoading(true);
        const response = await fetch(`/api/customers/${customerId}`);
        const result = await response.json();

        if (!response.ok || !result.success) {
          throw new Error(result.message || 'Failed to fetch customer');
        }

        setCustomer(result.data);
        setFormData({
          companyName: result.data.companyName || '',
          customerType: result.data.customerType,
          email: result.data.email,
          phone: result.data.phone,
          tin: result.data.tin,
          contactPerson: result.data.contactPerson,
          location: result.data.location,
          division: result.data.division,
          creditLimit: result.data.creditLimit,
          creditTermDays: result.data.creditTermDays,
          withholding: result.data.withholding,
          withholdRate: result.data.withholdRate,
          status: result.data.status,
        });
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred');
      } finally {
        setLoading(false);
      }
    };

    if (customerId) {
      fetchCustomer();
    }
  }, [customerId]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    const checked = (e.target as HTMLInputElement).checked;

    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : type === 'number' ? parseFloat(value) : value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSubmitting(true);
      const response = await fetch(`/api/customers/${customerId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.message || 'Failed to update customer');
      }

      alert('Customer updated successfully!');
      router.push(`/dashboard/customers/${customerId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      alert(err instanceof Error ? err.message : 'Failed to update customer');
    } finally {
      setSubmitting(false);
    }
  };

  const handleBack = () => {
    router.push(`/dashboard/customers/${customerId}`);
  };

  const getCustomerName = (customer: Customer) => {
    if (customer.customerType === 'COMPANY') {
      return customer.companyName || 'N/A';
    }
    return `${customer.firstName || ''} ${customer.lastName || ''}`.trim() || 'N/A';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="text-slate-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (error || !customer) {
    return (
      <div className="space-y-6">
        <button
          onClick={handleBack}
          className="text-blue-600 hover:text-blue-800 font-medium"
        >
          ← Back
        </button>
        <Card>
          <CardBody>
            <p className="text-red-600">{error || 'Customer not found'}</p>
          </CardBody>
        </Card>
      </div>
    );
  }

  const customerName = getCustomerName(customer);

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-slate-600">
        <button onClick={handleBack} className="text-blue-600 hover:text-blue-800 font-medium">
          ← Back to {customerName}
        </button>
      </div>

      {/* Page Header */}
      <div>
        <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-slate-900">
          Edit {customerName}
        </h1>
      </div>

      {/* Edit Form */}
      <Card>
        <CardHeader>
          <h2 className="text-2xl font-bold text-slate-900">Update Customer Information</h2>
        </CardHeader>

        <CardBody>
          <form onSubmit={handleSubmit} className="space-y-8">
            {/* Basic Information */}
            <div>
              <h3 className="text-lg font-semibold text-slate-900 mb-4">Basic Information</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Customer Type
                  </label>
                  <Select
                    name="customerType"
                    value={formData.customerType}
                    onChange={handleChange}
                    options={[
                      { value: 'COMPANY', label: 'Company' },
                      { value: 'INDIVIDUAL', label: 'Individual' },
                    ]}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Division
                  </label>
                  <Select
                    name="division"
                    value={formData.division}
                    onChange={handleChange}
                    options={[
                      { value: 'CONSTRUCTION', label: 'Construction' },
                      { value: 'MEDICAL', label: 'Medical' },
                      { value: 'BOTH', label: 'Both' },
                    ]}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Company Name
                  </label>
                  <Input
                    type="text"
                    name="companyName"
                    value={formData.companyName}
                    onChange={handleChange}
                    placeholder="Company Name"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    TIN
                  </label>
                  <Input
                    type="text"
                    name="tin"
                    value={formData.tin}
                    onChange={handleChange}
                    placeholder="TIN"
                  />
                </div>
              </div>
            </div>

            {/* Contact Information */}
            <div className="border-t border-slate-200 pt-8">
              <h3 className="text-lg font-semibold text-slate-900 mb-4">Contact Information</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Email</label>
                  <Input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    placeholder="Email"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Phone</label>
                  <Input
                    type="text"
                    name="phone"
                    value={formData.phone}
                    onChange={handleChange}
                    placeholder="Phone"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Contact Person
                  </label>
                  <Input
                    type="text"
                    name="contactPerson"
                    value={formData.contactPerson}
                    onChange={handleChange}
                    placeholder="Contact Person"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Location</label>
                  <Input
                    type="text"
                    name="location"
                    value={formData.location}
                    onChange={handleChange}
                    placeholder="Location"
                  />
                </div>
              </div>
            </div>

            {/* Credit Information */}
            <div className="border-t border-slate-200 pt-8">
              <h3 className="text-lg font-semibold text-slate-900 mb-4">Credit Information</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Credit Limit
                  </label>
                  <Input
                    type="number"
                    name="creditLimit"
                    value={formData.creditLimit}
                    onChange={handleChange}
                    placeholder="Credit Limit"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Credit Term (Days)
                  </label>
                  <Input
                    type="number"
                    name="creditTermDays"
                    value={formData.creditTermDays}
                    onChange={handleChange}
                    placeholder="Credit Term Days"
                  />
                </div>
              </div>
            </div>

            {/* Tax & Status */}
            <div className="border-t border-slate-200 pt-8">
              <h3 className="text-lg font-semibold text-slate-900 mb-4">Tax & Status</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    id="withholding"
                    name="withholding"
                    checked={formData.withholding}
                    onChange={handleChange}
                    className="w-4 h-4 border-slate-300 rounded"
                  />
                  <label htmlFor="withholding" className="text-sm font-medium text-slate-700">
                    Enable Withholding
                  </label>
                </div>
                {formData.withholding && (
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Withhold Rate (%)
                    </label>
                    <Input
                      type="number"
                      name="withholdRate"
                      value={formData.withholdRate}
                      onChange={handleChange}
                      placeholder="Withhold Rate"
                      step="0.01"
                    />
                  </div>
                )}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Status</label>
                  <Select
                    name="status"
                    value={formData.status}
                    onChange={handleChange}
                    options={[
                      { value: 'Active', label: 'Active' },
                      { value: 'Inactive', label: 'Inactive' },
                    ]}
                  />
                </div>
              </div>
            </div>

            {/* Form Actions */}
            <div className="border-t border-slate-200 pt-8 flex gap-3 justify-end">
              <Button variant="outline" onClick={handleBack} disabled={submitting}>
                Cancel
              </Button>
              <Button variant="primary" type="submit" disabled={submitting}>
                {submitting ? 'Saving...' : 'Save Changes'}
              </Button>
            </div>
          </form>
        </CardBody>
      </Card>
    </div>
  );
}
