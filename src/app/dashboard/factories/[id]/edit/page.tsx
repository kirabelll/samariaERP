'use client';
import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import Card, { CardHeader, CardBody, CardFooter } from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import { Input, Select, Textarea } from '@/components/ui/Input';

interface Factory {
  id: string;
  name: string;
  code: string;
  factoryType: string;
  suppliedMaterial: string;
  location: string;
  phone: string;
  contactPerson: string;
  useCoupons: boolean;
  weighbridgeReq: boolean;
  terms: string;
  status: string;
  createdAt: string;
}

interface FormErrors {
  name?: string;
  factoryType?: string;
}

export default function FactoryEditPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  const [factory, setFactory] = useState<Factory | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [errors, setErrors] = useState<FormErrors>({});

  const [formData, setFormData] = useState({
    name: '',
    factoryType: '',
    suppliedMaterial: '',
    location: '',
    phone: '',
    contactPerson: '',
    useCoupons: false,
    weighbridgeReq: false,
    terms: '',
    status: 'Active',
  });

  useEffect(() => {
    const fetchFactory = async () => {
      try {
        setLoading(true);
        const response = await fetch(`/api/factories/${id}`);

        if (!response.ok) {
          if (response.status === 404) {
            setError('Factory not found');
          } else {
            setError('Failed to load factory details');
          }
          return;
        }

        const result = await response.json();
        const factoryData = result.data;
        setFactory(factoryData);
        setFormData({
          name: factoryData.name || '',
          factoryType: factoryData.factoryType || '',
          suppliedMaterial: factoryData.suppliedMaterial || '',
          location: factoryData.location || '',
          phone: factoryData.phone || '',
          contactPerson: factoryData.contactPerson || '',
          useCoupons: factoryData.useCoupons || false,
          weighbridgeReq: factoryData.weighbridgeReq ?? true,
          terms: factoryData.terms || '',
          status: factoryData.status || 'Active',
        });
        setError(null);
      } catch (err) {
        setError('Failed to load factory details');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchFactory();
  }, [id]);

  const validateForm = () => {
    const newErrors: FormErrors = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Factory name is required';
    }

    if (!formData.factoryType.trim()) {
      newErrors.factoryType = 'Factory type is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value, type } = e.target;

    if (type === 'checkbox') {
      const checked = (e.target as HTMLInputElement).checked;
      setFormData((prev) => ({
        ...prev,
        [name]: checked,
      }));
    } else {
      setFormData((prev) => ({
        ...prev,
        [name]: value,
      }));
    }

    // Clear error for this field when user starts typing
    if (errors[name as keyof FormErrors]) {
      setErrors((prev) => ({
        ...prev,
        [name]: undefined,
      }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    try {
      setSubmitting(true);
      const response = await fetch(`/api/factories/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        throw new Error('Failed to update factory');
      }

      alert('Factory updated successfully!');
      router.push(`/dashboard/factories/${id}`);
    } catch (err) {
      console.error(err);
      alert('Failed to update factory');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <Link href="/dashboard/factories" className="text-blue-600 hover:text-blue-800 text-sm font-medium">
            ← Back to Factories
          </Link>
        </div>
        <Card>
          <CardBody className="flex items-center justify-center py-12">
            <div className="flex flex-col items-center gap-3">
              <svg className="animate-spin h-8 w-8 text-blue-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              <p className="text-slate-600">Loading factory details...</p>
            </div>
          </CardBody>
        </Card>
      </div>
    );
  }

  if (error || !factory) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <Link href="/dashboard/factories" className="text-blue-600 hover:text-blue-800 text-sm font-medium">
            ← Back to Factories
          </Link>
        </div>
        <Card>
          <CardBody className="py-12">
            <div className="text-center">
              <p className="text-lg font-medium text-red-600 mb-4">{error || 'Factory not found'}</p>
              <Link href="/dashboard/factories" className="text-blue-600 hover:text-blue-800 font-medium">
                Return to Factories List
              </Link>
            </div>
          </CardBody>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link href={`/dashboard/factories/${id}`} className="text-blue-600 hover:text-blue-800 text-sm font-medium">
          ← Back to Details
        </Link>
        <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-slate-900">Edit {factory.name}</h1>
      </div>

      <Card>
        <CardHeader>
          <h2 className="text-lg font-semibold text-slate-900">Factory Details</h2>
        </CardHeader>

        <form onSubmit={handleSubmit}>
          <CardBody className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Name */}
              <Input
                label="Factory Name"
                name="name"
                value={formData.name}
                onChange={handleInputChange}
                required
                error={errors.name}
                placeholder="Enter factory name"
              />

              {/* Factory Type */}
              <Select
                label="Factory Type"
                name="factoryType"
                value={formData.factoryType}
                onChange={handleInputChange}
                required
                error={errors.factoryType}
                options={[
                  { value: '', label: 'Select factory type' },
                  { value: 'cement', label: 'Cement' },
                  { value: 'aggregate', label: 'Aggregate' },
                  { value: 'sand', label: 'Sand' },
                  { value: 'mixed', label: 'Mixed' },
                ]}
              />

              {/* Supplied Material */}
              <Input
                label="Supplied Material"
                name="suppliedMaterial"
                value={formData.suppliedMaterial}
                onChange={handleInputChange}
                placeholder="Enter supplied material"
              />

              {/* Location */}
              <Input
                label="Location"
                name="location"
                value={formData.location}
                onChange={handleInputChange}
                placeholder="Enter location"
              />

              {/* Phone */}
              <Input
                label="Phone"
                name="phone"
                type="tel"
                value={formData.phone}
                onChange={handleInputChange}
                placeholder="Enter phone number"
              />

              {/* Contact Person */}
              <Input
                label="Contact Person"
                name="contactPerson"
                value={formData.contactPerson}
                onChange={handleInputChange}
                placeholder="Enter contact person name"
              />

              {/* Status */}
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
            </div>

            {/* Checkboxes */}
            <div className="border-t border-slate-200 pt-6 space-y-4">
              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id="useCoupons"
                  name="useCoupons"
                  checked={formData.useCoupons}
                  onChange={handleInputChange}
                  className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <label htmlFor="useCoupons" className="text-sm font-medium text-slate-700">
                  Uses Coupons
                </label>
              </div>

              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id="weighbridgeReq"
                  name="weighbridgeReq"
                  checked={formData.weighbridgeReq}
                  onChange={handleInputChange}
                  className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <label htmlFor="weighbridgeReq" className="text-sm font-medium text-slate-700">
                  Weighbridge Required
                </label>
              </div>
            </div>

            {/* Terms */}
            <div className="border-t border-slate-200 pt-6">
              <Textarea
                label="Terms"
                name="terms"
                value={formData.terms}
                onChange={handleInputChange}
                placeholder="Enter terms and conditions"
              />
            </div>
          </CardBody>

          <CardFooter className="flex gap-3 justify-end">
            <Link href={`/dashboard/factories/${id}`}>
              <Button variant="secondary">Cancel</Button>
            </Link>
            <Button type="submit" variant="primary" isLoading={submitting}>
              {submitting ? 'Saving...' : 'Save Changes'}
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
