'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardHeader, CardBody, CardFooter, Button, Input, Select } from '@/components/ui';

interface FormErrors {
  [key: string]: string;
}

interface Association {
  id: string;
  code: string;
  name: string;
  contactPerson?: string;
  phone?: string;
  email?: string;
  address?: string;
  status: string;
}

export default function EditTransportAssociationPage({
  params,
}: {
  params: { id: string };
}) {
  const router = useRouter();
  const [formData, setFormData] = useState<Partial<Association>>({});
  const [errors, setErrors] = useState<FormErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAssociation();
  }, [params.id]);

  const fetchAssociation = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/transport-associations/${params.id}`);
      const data = await res.json();
      if (data.success) {
        setFormData(data.data);
      } else {
        alert('Association not found');
        router.push('/dashboard/transporters/associations');
      }
    } catch (error) {
      console.error('Error fetching association:', error);
      alert('Error loading association');
      router.push('/dashboard/transporters/associations');
    } finally {
      setLoading(false);
    }
  };

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};
    if (!formData.name || !formData.name.trim()) {
      newErrors.name = 'Name is required';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    setIsSubmitting(true);
    try {
      const payload = {
        name: formData.name,
        contactPerson: formData.contactPerson || null,
        phone: formData.phone || null,
        email: formData.email || null,
        address: formData.address || null,
        status: formData.status || 'Active',
      };

      const res = await fetch(`/api/transport-associations/${params.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error || 'Failed to update association');
      alert('Transport association updated successfully!');
      router.push('/dashboard/transporters/associations');
    } catch (error) {
      console.error('Error submitting form:', error);
      setErrors({ submit: 'Failed to update association' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    router.push('/dashboard/transporters/associations');
  };

  if (loading) {
    return <div className="text-center py-8">Loading...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-slate-600">
        <button
          onClick={handleCancel}
          className="text-blue-600 hover:text-blue-700 font-medium"
        >
          Transport Associations
        </button>
        <span>/</span>
        <span className="text-slate-900 font-medium">Edit Association</span>
      </div>

      {/* Page Header */}
      <div>
        <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-slate-900">
          Edit Transport Association
        </h1>
        <p className="text-slate-600 mt-2">Update association details</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basic Information Section */}
        <Card>
          <CardHeader>
            <h2 className="text-xl sm:text-2xl lg:text-3xl font-bold text-slate-900">
              Association Information
            </h2>
          </CardHeader>
          <CardBody className="space-y-6">
            <div className="text-sm">
              <p className="text-slate-600">Code</p>
              <p className="text-slate-900 font-medium">{formData.code}</p>
            </div>

            <Input
              label="Association Name"
              name="name"
              value={formData.name || ''}
              onChange={handleInputChange}
              error={errors.name}
              placeholder="e.g., Addis Ababa Transport Association"
              required
            />

            <Input
              label="Contact Person"
              name="contactPerson"
              value={formData.contactPerson || ''}
              onChange={handleInputChange}
              placeholder="e.g., Ali Ahmed"
            />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Input
                label="Phone"
                name="phone"
                type="tel"
                value={formData.phone || ''}
                onChange={handleInputChange}
                placeholder="+251911223344"
              />
              <Input
                label="Email"
                name="email"
                type="email"
                value={formData.email || ''}
                onChange={handleInputChange}
                placeholder="contact@association.com"
              />
            </div>

            <Input
              label="Address"
              name="address"
              value={formData.address || ''}
              onChange={handleInputChange}
              placeholder="e.g., Addis Ababa, Bole"
            />

            <Select
              label="Status"
              name="status"
              value={formData.status || 'Active'}
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
                Update Association
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
