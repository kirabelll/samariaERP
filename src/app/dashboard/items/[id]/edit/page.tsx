'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { Card, CardHeader, CardBody, CardFooter, Button, Input, Select } from '@/components/ui';
import { ConfirmDialog } from '@/components/ui/Modal';

interface ItemFormData {
  code: string;
  name: string;
  nameAmharic?: string;
  category?: string;
  unit?: string;
  itemType?: string;
  division?: string;
  batchTracked?: boolean;
  expiryTracked?: boolean;
  manufacturer?: string;
  genericName?: string;
  strength?: string;
  dosageForm?: string;
  status?: string;
}

const fieldLabels: Record<string, string> = {
  code: 'Item Code',
  name: 'Item Name',
  nameAmharic: 'Amharic Name',
  category: 'Category',
  unit: 'Unit',
  itemType: 'Item Type',
  division: 'Division',
  batchTracked: 'Batch Tracked',
  expiryTracked: 'Expiry Tracked',
  manufacturer: 'Manufacturer',
  genericName: 'Generic Name',
  strength: 'Strength',
  dosageForm: 'Dosage Form',
  status: 'Status',
};

const categories = [
  { value: 'Aggregate', label: 'Aggregate' },
  { value: 'Cement', label: 'Cement' },
  { value: 'Sand', label: 'Sand' },
  { value: 'Medical Drug', label: 'Medical Drug' },
  { value: 'PPE', label: 'PPE' },
  { value: 'Other', label: 'Other' },
];

const units = [
  { value: 'Bag', label: 'Bag' },
  { value: 'Ton', label: 'Ton' },
  { value: 'm³', label: 'm³' },
  { value: 'Piece', label: 'Piece' },
  { value: 'Tablet', label: 'Tablet' },
  { value: 'Bottle', label: 'Bottle' },
  { value: 'Box', label: 'Box' },
];

const itemTypes = [
  { value: 'sales', label: 'Sales' },
  { value: 'internal', label: 'Internal' },
  { value: 'medical', label: 'Medical' },
];

const divisions = [
  { value: 'CONSTRUCTION', label: 'Construction' },
  { value: 'MEDICAL', label: 'Medical' },
  { value: 'BOTH', label: 'Both' },
];

const statuses = [
  { value: 'Active', label: 'Active' },
  { value: 'Inactive', label: 'Inactive' },
];

export default function ItemEditPage() {
  const router = useRouter();
  const params = useParams();
  const recordId = params?.id as string;

  const [data, setData] = useState<ItemFormData | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const handleDelete = async () => {
    setDeleting(true);
    try {
      const response = await fetch(`/api/items/${recordId}?permanent=true`, {
        method: 'DELETE',
      });
      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Failed to delete item');
      }

      alert('Item deleted successfully!');
      router.push('/dashboard/items');
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to delete item');
    } finally {
      setDeleting(false);
      setShowDeleteModal(false);
    }
  };
  const [formData, setFormData] = useState<ItemFormData>({
    code: '',
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

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const response = await fetch(`/api/items/${recordId}`);
        const result = await response.json();

        if (!response.ok || !result.success) {
          throw new Error(result.error || 'Failed to fetch record');
        }

        setData(result.data);
        setFormData(result.data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred');
      } finally {
        setLoading(false);
      }
    };

    if (recordId) {
      fetchData();
    }
  }, [recordId]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    const checked = (e.target as HTMLInputElement).checked;

    setFormData((prev: ItemFormData) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSubmitting(true);
      const response = await fetch(`/api/items/${recordId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Failed to update record');
      }

      alert('Item updated successfully!');
      router.push(`/dashboard/items/${recordId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      alert(err instanceof Error ? err.message : 'Failed to update record');
    } finally {
      setSubmitting(false);
    }
  };

  const handleBack = () => {
    router.push(`/dashboard/items/${recordId}`);
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

  if (error || !data) {
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
            <p className="text-red-600">{error || 'Record not found'}</p>
          </CardBody>
        </Card>
      </div>
    );
  }

  const isMedical = formData.itemType === 'medical' || formData.division === 'MEDICAL' || formData.division === 'BOTH';

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-slate-600">
        <button onClick={handleBack} className="text-blue-600 hover:text-blue-800 font-medium">
          Items
        </button>
        <span>/</span>
        <button onClick={handleBack} className="text-blue-600 hover:text-blue-800 font-medium">
          {data.name}
        </button>
        <span>/</span>
        <span className="text-slate-900 font-medium">Edit</span>
      </div>

      {/* Page Header */}
      <div>
        <h1 className="text-3xl font-bold text-slate-900">Edit Item</h1>
        <p className="text-slate-600 mt-1">{data.name}</p>
      </div>

      {/* Edit Form */}
      <Card>
        <CardHeader>
          <h2 className="text-2xl font-bold text-slate-900">Update Item Information</h2>
        </CardHeader>

        <CardBody>
          <form onSubmit={handleSubmit} className="space-y-8">
            {/* Basic Information Section */}
            <div>
              <h3 className="text-lg font-semibold text-slate-900 mb-4">Basic Information</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    {fieldLabels.code}
                  </label>
                  <Input
                    type="text"
                    name="code"
                    value={formData.code || ''}
                    onChange={handleChange}
                    disabled
                    placeholder="Auto-generated"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    {fieldLabels.name}
                  </label>
                  <Input
                    type="text"
                    name="name"
                    value={formData.name || ''}
                    onChange={handleChange}
                    placeholder="Item name"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    {fieldLabels.nameAmharic}
                  </label>
                  <Input
                    type="text"
                    name="nameAmharic"
                    value={formData.nameAmharic || ''}
                    onChange={handleChange}
                    placeholder="የአሃድ ስም"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    {fieldLabels.category}
                  </label>
                  <Select
                    name="category"
                    value={formData.category || ''}
                    onChange={handleChange}
                    options={[{ value: '', label: 'Select category' }, ...categories]}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    {fieldLabels.unit}
                  </label>
                  <Select
                    name="unit"
                    value={formData.unit || ''}
                    onChange={handleChange}
                    options={[{ value: '', label: 'Select unit' }, ...units]}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    {fieldLabels.itemType}
                  </label>
                  <Select
                    name="itemType"
                    value={formData.itemType || 'sales'}
                    onChange={handleChange}
                    options={itemTypes}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    {fieldLabels.division}
                  </label>
                  <Select
                    name="division"
                    value={formData.division || 'CONSTRUCTION'}
                    onChange={handleChange}
                    options={divisions}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    {fieldLabels.status}
                  </label>
                  <Select
                    name="status"
                    value={formData.status || 'Active'}
                    onChange={handleChange}
                    options={statuses}
                  />
                </div>
              </div>
            </div>

            {/* Medical Information Section (if applicable) */}
            {isMedical && (
              <div>
                <h3 className="text-lg font-semibold text-slate-900 mb-4">Medical Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="md:col-span-2">
                    <div className="flex gap-6">
                      <label className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          name="batchTracked"
                          checked={formData.batchTracked || false}
                          onChange={handleChange}
                          className="w-4 h-4 rounded border-slate-300"
                        />
                        <span className="text-sm font-medium text-slate-700">{fieldLabels.batchTracked}</span>
                      </label>
                      <label className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          name="expiryTracked"
                          checked={formData.expiryTracked || false}
                          onChange={handleChange}
                          className="w-4 h-4 rounded border-slate-300"
                        />
                        <span className="text-sm font-medium text-slate-700">{fieldLabels.expiryTracked}</span>
                      </label>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      {fieldLabels.manufacturer}
                    </label>
                    <Input
                      type="text"
                      name="manufacturer"
                      value={formData.manufacturer || ''}
                      onChange={handleChange}
                      placeholder="Manufacturer name"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      {fieldLabels.genericName}
                    </label>
                    <Input
                      type="text"
                      name="genericName"
                      value={formData.genericName || ''}
                      onChange={handleChange}
                      placeholder="Generic name"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      {fieldLabels.strength}
                    </label>
                    <Input
                      type="text"
                      name="strength"
                      value={formData.strength || ''}
                      onChange={handleChange}
                      placeholder="e.g., 500mg"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      {fieldLabels.dosageForm}
                    </label>
                    <Input
                      type="text"
                      name="dosageForm"
                      value={formData.dosageForm || ''}
                      onChange={handleChange}
                      placeholder="e.g., Tablet, Injection"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Form Actions */}
            <div className="border-t border-slate-200 pt-8 flex justify-between items-center">
              <Button
                type="button"
                variant="danger"
                onClick={() => setShowDeleteModal(true)}
                disabled={submitting || deleting}
              >
                Delete Item
              </Button>
              <div className="flex gap-3">
                <Button variant="outline" onClick={handleBack} disabled={submitting || deleting}>
                  Cancel
                </Button>
                <Button variant="primary" type="submit" disabled={submitting || deleting}>
                  {submitting ? 'Saving...' : 'Save Changes'}
                </Button>
              </div>
            </div>
          </form>
        </CardBody>
      </Card>

      <ConfirmDialog
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        onConfirm={handleDelete}
        title="Delete Item"
        message={`Are you sure you want to permanently delete item "${formData.name}"? This action cannot be undone.`}
        confirmText="Delete"
        cancelText="Cancel"
        isDangerous={true}
        isLoading={deleting}
      />
    </div>
  );
}
