'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Card, CardHeader, CardBody, Button, Input, Select } from '@/components/ui';

interface Supplier {
  id: string;
  code: string;
  supplierType: string;
  companyName?: string;
  firstName?: string;
  lastName?: string;
  tin: string;
  phone: string;
  email: string;
  contactPerson: string;
  location: string;
  category: string;
  withholding: boolean;
  withholdRate: number;
  status: 'Active' | 'Inactive';
}

export default function SupplierEditPage() {
  const params = useParams();
  const router = useRouter();
  const supplierId = params.id as string;

  const [supplier, setSupplier] = useState<Supplier | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    companyName: '',
    supplierType: '',
    tin: '',
    phone: '',
    email: '',
    contactPerson: '',
    location: '',
    category: '',
    withholding: false,
    withholdRate: 0,
    status: 'Active' as 'Active' | 'Inactive',
  });

  useEffect(() => {
    const fetchSupplier = async () => {
      try {
        setLoading(true);
        const response = await fetch(`/api/suppliers/${supplierId}`);
        const result = await response.json();

        if (!response.ok || !result.success) {
          throw new Error(result.message || 'Failed to fetch supplier');
        }

        setSupplier(result.data);
        setFormData({
          companyName: result.data.companyName || '',
          supplierType: result.data.supplierType,
          tin: result.data.tin,
          phone: result.data.phone,
          email: result.data.email,
          contactPerson: result.data.contactPerson,
          location: result.data.location,
          category: result.data.category,
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

    if (supplierId) {
      fetchSupplier();
    }
  }, [supplierId]);

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
      const response = await fetch(`/api/suppliers/${supplierId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.message || 'Failed to update supplier');
      }

      alert('Supplier updated successfully!');
      router.push(`/dashboard/suppliers/${supplierId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      alert(err instanceof Error ? err.message : 'Failed to update supplier');
    } finally {
      setSubmitting(false);
    }
  };

  const handleBack = () => {
    router.push(`/dashboard/suppliers/${supplierId}`);
  };

  const getSupplierName = (supplier: Supplier) => {
    if (supplier.companyName) {
      return supplier.companyName;
    }
    return `${supplier.firstName || ''} ${supplier.lastName || ''}`.trim() || 'N/A';
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

  if (error || !supplier) {
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
            <p className="text-red-600">{error || 'Supplier not found'}</p>
          </CardBody>
        </Card>
      </div>
    );
  }

  const supplierName = getSupplierName(supplier);

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-slate-600">
        <button onClick={handleBack} className="text-blue-600 hover:text-blue-800 font-medium">
          ← Back to {supplierName}
        </button>
      </div>

      {/* Page Header */}
      <div>
        <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-slate-900">
          Edit {supplierName}
        </h1>
      </div>

      {/* Edit Form */}
      <Card>
        <CardHeader>
          <h2 className="text-2xl font-bold text-slate-900">Update Supplier Information</h2>
        </CardHeader>

        <CardBody>
          <form onSubmit={handleSubmit} className="space-y-8">
            {/* Basic Information */}
            <div>
              <h3 className="text-lg font-semibold text-slate-900 mb-4">Basic Information</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
                    Supplier Type
                  </label>
                  <Input
                    type="text"
                    name="supplierType"
                    value={formData.supplierType}
                    onChange={handleChange}
                    placeholder="Supplier Type"
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
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Category
                  </label>
                  <Input
                    type="text"
                    name="category"
                    value={formData.category}
                    onChange={handleChange}
                    placeholder="Category"
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
