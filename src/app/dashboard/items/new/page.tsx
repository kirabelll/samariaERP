'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardHeader, CardBody, CardFooter, Button, Input } from '@/components/ui';

interface FormData {
  name: string;
  nameAmharic: string;
  category: string;
  unit: string;
  itemType: string;
  division: string;
  batchTracked: boolean;
  expiryTracked: boolean;
  manufacturer: string;
  genericName: string;
  strength: string;
  dosageForm: string;
  status: string;
}

interface FormErrors {
  [key: string]: string;
}

export default function NewItemPage() {
  const router = useRouter();
  const [formData, setFormData] = useState<FormData>({
    name: '',
    nameAmharic: '',
    category: '',
    unit: '',
    itemType: 'sales',
    division: 'CONSTRUCTION',
    batchTracked: false,
    expiryTracked: false,
    manufacturer: '',
    genericName: '',
    strength: '',
    dosageForm: '',
    status: 'Active',
  });

  const [errors, setErrors] = useState<FormErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isMedicalDivision = formData.division === 'MEDICAL' || formData.division === 'BOTH';

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Item name is required';
    }
    if (!formData.category) {
      newErrors.category = 'Category is required';
    }
    if (!formData.unit) {
      newErrors.unit = 'Unit is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
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
      const res = await fetch('/api/items', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error || 'Failed to create item');
      alert('Item created successfully!');
      router.push('/dashboard/items');
    } catch (error) {
      console.error('Error submitting form:', error);
      setErrors({ submit: 'Failed to create item' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    router.push('/dashboard/items');
  };

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-slate-600">
        <button
          onClick={handleCancel}
          className="text-blue-600 hover:text-blue-700 font-medium"
        >
          Items
        </button>
        <span>/</span>
        <span className="text-slate-900 font-medium">New Item</span>
      </div>

      {/* Page Header */}
      <div>
        <h1 className="text-3xl font-bold text-slate-900">Create New Item</h1>
        <p className="text-slate-600 mt-2">Fill in the details below to add a new item</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basic Information Section */}
        <Card>
          <CardHeader>
            <h2 className="text-xl font-bold text-slate-900">Basic Information</h2>
          </CardHeader>
          <CardBody className="space-y-6">
            <Input
              label="Item Name"
              name="name"
              value={formData.name}
              onChange={handleInputChange}
              error={errors.name}
              placeholder="e.g., Portland Cement"
              required
            />

            <Input
              label="Item Name (Amharic)"
              name="nameAmharic"
              value={formData.nameAmharic}
              onChange={handleInputChange}
              placeholder="እንደገና ስም በአማርኛ"
            />

            <div>
              <label className="block text-sm font-medium text-slate-900 mb-3">
                Item Code
              </label>
              <input
                type="text"
                disabled
                value="Auto-generated"
                className="w-full px-4 py-2 border border-slate-300 rounded-lg bg-slate-100 text-slate-600 text-sm"
              />
            </div>
          </CardBody>
        </Card>

        {/* Category & Unit Section */}
        <Card>
          <CardHeader>
            <h2 className="text-xl font-bold text-slate-900">Category & Unit</h2>
          </CardHeader>
          <CardBody className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-slate-900 mb-3">
                  Category {errors.category && <span className="text-red-500">*</span>}
                </label>
                <select
                  name="category"
                  value={formData.category}
                  onChange={handleInputChange}
                  className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900 ${
                    errors.category ? 'border-red-500' : 'border-slate-300'
                  }`}
                >
                  <option value="">Select Category</option>
                  <option value="Construction Material">Construction Material</option>
                  <option value="Medical Supply">Medical Supply</option>
                  <option value="General">General</option>
                  <option value="Spare Part">Spare Part</option>
                </select>
                {errors.category && (
                  <p className="text-red-500 text-sm mt-1">{errors.category}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-900 mb-3">
                  Unit {errors.unit && <span className="text-red-500">*</span>}
                </label>
                <select
                  name="unit"
                  value={formData.unit}
                  onChange={handleInputChange}
                  className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900 ${
                    errors.unit ? 'border-red-500' : 'border-slate-300'
                  }`}
                >
                  <option value="">Select Unit</option>
                  <option value="pcs">pcs (Piece)</option>
                  <option value="kg">kg (Kilogram)</option>
                  <option value="m3">m3 (Cubic Meter)</option>
                  <option value="liter">liter</option>
                  <option value="box">box</option>
                  <option value="bag">bag</option>
                  <option value="ton">ton</option>
                  <option value="roll">roll</option>
                  <option value="sheet">sheet</option>
                </select>
                {errors.unit && (
                  <p className="text-red-500 text-sm mt-1">{errors.unit}</p>
                )}
              </div>
            </div>
          </CardBody>
        </Card>

        {/* Type & Division Section */}
        <Card>
          <CardHeader>
            <h2 className="text-xl font-bold text-slate-900">Type & Division</h2>
          </CardHeader>
          <CardBody className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-slate-900 mb-3">
                  Item Type
                </label>
                <select
                  name="itemType"
                  value={formData.itemType}
                  onChange={handleInputChange}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900"
                >
                  <option value="sales">Sales</option>
                  <option value="purchase">Purchase</option>
                  <option value="both">Both</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-900 mb-3">
                  Division
                </label>
                <select
                  name="division"
                  value={formData.division}
                  onChange={handleInputChange}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900"
                >
                  <option value="CONSTRUCTION">Construction</option>
                  <option value="MEDICAL">Medical</option>
                  <option value="BOTH">Both</option>
                </select>
              </div>
            </div>
          </CardBody>
        </Card>

        {/* Medical Fields Section */}
        {isMedicalDivision && (
          <Card>
            <CardHeader>
              <h2 className="text-xl font-bold text-slate-900">Medical Information</h2>
            </CardHeader>
            <CardBody className="space-y-6">
              <Input
                label="Manufacturer"
                name="manufacturer"
                value={formData.manufacturer}
                onChange={handleInputChange}
                placeholder="e.g., Pharma Ltd"
              />

              <Input
                label="Generic Name"
                name="genericName"
                value={formData.genericName}
                onChange={handleInputChange}
                placeholder="e.g., Paracetamol"
              />

              <Input
                label="Strength"
                name="strength"
                value={formData.strength}
                onChange={handleInputChange}
                placeholder="e.g., 500mg"
              />

              <Input
                label="Dosage Form"
                name="dosageForm"
                value={formData.dosageForm}
                onChange={handleInputChange}
                placeholder="e.g., Tablet, Syrup"
              />

              <div className="space-y-3">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    name="batchTracked"
                    checked={formData.batchTracked}
                    onChange={handleInputChange}
                    className="w-4 h-4 text-blue-600 rounded"
                  />
                  <span className="ml-3 text-slate-900 font-medium">Batch Tracked</span>
                </label>

                <label className="flex items-center">
                  <input
                    type="checkbox"
                    name="expiryTracked"
                    checked={formData.expiryTracked}
                    onChange={handleInputChange}
                    className="w-4 h-4 text-blue-600 rounded"
                  />
                  <span className="ml-3 text-slate-900 font-medium">Expiry Tracked</span>
                </label>
              </div>
            </CardBody>
          </Card>
        )}

        {/* Status Section */}
        <Card>
          <CardHeader>
            <h2 className="text-xl font-bold text-slate-900">Status</h2>
          </CardHeader>
          <CardBody className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-slate-900 mb-3">
                Status
              </label>
              <select
                name="status"
                value={formData.status}
                onChange={handleInputChange}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900"
              >
                <option value="Active">Active</option>
                <option value="Inactive">Inactive</option>
              </select>
            </div>
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
                Save Item
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
