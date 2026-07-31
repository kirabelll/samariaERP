'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardHeader, CardBody, CardFooter, Button, Input, Select } from '@/components/ui';

interface FormData {
  name: string;
  location: string;
  phone: string;
  contactPerson: string;
  factoryType: string;
  usesCoupons: boolean;
  weighbridgeRequired: boolean;
  status: 'Active' | 'Inactive';
}

interface FormErrors {
  [key: string]: string;
}

export default function NewFactoryPage() {
  const router = useRouter();
  const [formData, setFormData] = useState<FormData>({
    name: '',
    location: '',
    phone: '',
    contactPerson: '',
    factoryType: '',
    usesCoupons: false,
    weighbridgeRequired: false,
    status: 'Active',
  });

  const [errors, setErrors] = useState<FormErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Factory name is required';
    }
    if (!formData.location.trim()) {
      newErrors.location = 'Location is required';
    }
    if (!formData.phone.trim()) {
      newErrors.phone = 'Phone is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value, type } = e.target;
    const checked = (e.target as HTMLInputElement).checked;

    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
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
      const res = await fetch('/api/factories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name,
          factoryType: formData.factoryType || 'General',
          location: formData.location,
          phone: formData.phone,
          contactPerson: formData.contactPerson,
          useCoupons: formData.usesCoupons,
          weighbridgeReq: formData.weighbridgeRequired,
          status: formData.status,
        }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error || 'Failed to create factory');
      alert('Factory created successfully!');
      router.push('/dashboard/factories');
    } catch (error) {
      console.error('Error submitting form:', error);
      setErrors({ submit: 'Failed to create factory' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    router.push('/dashboard/factories');
  };

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-slate-600">
        <button
          onClick={handleCancel}
          className="text-blue-600 hover:text-blue-700 font-medium"
        >
          Factories
        </button>
        <span>/</span>
        <span className="text-slate-900 font-medium">New Factory</span>
      </div>

      {/* Page Header */}
      <div>
        <h1 className="text-3xl font-bold text-slate-900">Create New Factory</h1>
        <p className="text-slate-600 mt-2">Fill in the details below to add a new factory</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basic Information Section */}
        <Card>
          <CardHeader>
            <h2 className="text-xl font-bold text-slate-900">Basic Information</h2>
          </CardHeader>
          <CardBody className="space-y-6">
            <Input
              label="Factory Name"
              name="name"
              value={formData.name}
              onChange={handleInputChange}
              error={errors.name}
              placeholder="e.g., Addis Cement Factory"
              required
            />

            <Input
              label="Location"
              name="location"
              value={formData.location}
              onChange={handleInputChange}
              error={errors.location}
              placeholder="e.g., Addis Ababa, Bole"
              required
            />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
              <Input
                label="Contact Person"
                name="contactPerson"
                value={formData.contactPerson}
                onChange={handleInputChange}
                placeholder="e.g., Ali Ahmed"
              />
            </div>

            <Input
              label="Factory Type"
              name="factoryType"
              value={formData.factoryType}
              onChange={handleInputChange}
              placeholder="e.g., Cement, Aggregate"
            />
          </CardBody>
        </Card>

        {/* Operations Section */}
        <Card>
          <CardHeader>
            <h2 className="text-xl font-bold text-slate-900">Operations</h2>
          </CardHeader>
          <CardBody className="space-y-6">
            <div className="space-y-4">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  name="usesCoupons"
                  checked={formData.usesCoupons}
                  onChange={handleInputChange}
                  className="w-4 h-4 text-blue-600 rounded"
                />
                <span className="ml-3 text-slate-900 font-medium">Uses Coupons</span>
              </label>

              <label className="flex items-center">
                <input
                  type="checkbox"
                  name="weighbridgeRequired"
                  checked={formData.weighbridgeRequired}
                  onChange={handleInputChange}
                  className="w-4 h-4 text-blue-600 rounded"
                />
                <span className="ml-3 text-slate-900 font-medium">Weighbridge Required</span>
              </label>
            </div>
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
                Save Factory
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
