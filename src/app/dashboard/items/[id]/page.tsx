'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { Card, CardHeader, CardBody, Button, Badge } from '@/components/ui';

interface ItemData {
  code: string;
  name: string;
  nameAmharic?: string;
  category?: string;
  unit?: string;
  itemType?: string;
  division?: string;
  status?: string;
  batchTracked?: boolean;
  expiryTracked?: boolean;
  manufacturer?: string;
  genericName?: string;
  strength?: string;
  dosageForm?: string;
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

export default function ItemDetailPage() {
  const router = useRouter();
  const params = useParams();
  const recordId = params?.id as string;

  const [data, setData] = useState<ItemData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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

  const handleEdit = () => {
    router.push(`/dashboard/items/${recordId}/edit`);
  };

  const handleBack = () => {
    router.push(`/dashboard/items`);
  };

  const getStatusValue = (status?: string) => {
    switch (status) {
      case 'Active':
        return 'Active';
      case 'Inactive':
        return 'Rejected';
      default:
        return 'Draft';
    }
  };

  const renderFieldValue = (field: string, value: any) => {
    if (value === undefined || value === null) return 'N/A';
    if (typeof value === 'boolean') return value ? 'Yes' : 'No';
    return String(value);
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

  const isMedical = data.itemType === 'medical' || data.division === 'MEDICAL' || data.division === 'BOTH';

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-slate-600">
        <button
          onClick={handleBack}
          className="text-blue-600 hover:text-blue-800 font-medium"
        >
          Items
        </button>
        <span>/</span>
        <span className="text-slate-900 font-medium">{data.name}</span>
      </div>

      {/* Page Header */}
      <div>
        <h1 className="text-3xl font-bold text-slate-900">{data.name}</h1>
        {data.nameAmharic && <p className="text-slate-600 mt-1">{data.nameAmharic}</p>}
      </div>

      {/* Details Card */}
      <Card>
        <CardHeader className="flex items-center justify-between">
          <h2 className="text-2xl font-bold text-slate-900">Item Details</h2>
          <div className="flex gap-3">
            <Button variant="primary" size="lg" onClick={handleEdit}>
              Edit
            </Button>
            <Button variant="outline" size="lg" onClick={handleBack}>
              Back
            </Button>
          </div>
        </CardHeader>

        <CardBody className="space-y-8">
          {/* Basic Information Section */}
          <div>
            <h3 className="text-lg font-semibold text-slate-900 mb-4">Basic Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                  {fieldLabels.code}
                </label>
                <p className="text-lg font-medium text-slate-900 mt-1">{data.code}</p>
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                  {fieldLabels.name}
                </label>
                <p className="text-lg font-medium text-slate-900 mt-1">{data.name}</p>
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                  {fieldLabels.category}
                </label>
                <p className="text-lg font-medium text-slate-900 mt-1">{data.category || 'N/A'}</p>
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                  {fieldLabels.unit}
                </label>
                <p className="text-lg font-medium text-slate-900 mt-1">{data.unit || 'N/A'}</p>
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                  {fieldLabels.itemType}
                </label>
                <p className="text-lg font-medium text-slate-900 mt-1">{data.itemType || 'N/A'}</p>
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                  {fieldLabels.division}
                </label>
                <p className="text-lg font-medium text-slate-900 mt-1">{data.division || 'N/A'}</p>
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                  {fieldLabels.status}
                </label>
                <div className="mt-1">
                  <Badge status={getStatusValue(data.status)}>
                    {data.status || 'N/A'}
                  </Badge>
                </div>
              </div>
            </div>
          </div>

          {/* Medical Information Section (if applicable) */}
          {isMedical && (
            <div>
              <h3 className="text-lg font-semibold text-slate-900 mb-4">Medical Information</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                    {fieldLabels.batchTracked}
                  </label>
                  <p className="text-lg font-medium text-slate-900 mt-1">
                    {renderFieldValue('batchTracked', data.batchTracked)}
                  </p>
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                    {fieldLabels.expiryTracked}
                  </label>
                  <p className="text-lg font-medium text-slate-900 mt-1">
                    {renderFieldValue('expiryTracked', data.expiryTracked)}
                  </p>
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                    {fieldLabels.manufacturer}
                  </label>
                  <p className="text-lg font-medium text-slate-900 mt-1">{data.manufacturer || 'N/A'}</p>
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                    {fieldLabels.genericName}
                  </label>
                  <p className="text-lg font-medium text-slate-900 mt-1">{data.genericName || 'N/A'}</p>
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                    {fieldLabels.strength}
                  </label>
                  <p className="text-lg font-medium text-slate-900 mt-1">{data.strength || 'N/A'}</p>
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                    {fieldLabels.dosageForm}
                  </label>
                  <p className="text-lg font-medium text-slate-900 mt-1">{data.dosageForm || 'N/A'}</p>
                </div>
              </div>
            </div>
          )}
        </CardBody>
      </Card>
    </div>
  );
}
