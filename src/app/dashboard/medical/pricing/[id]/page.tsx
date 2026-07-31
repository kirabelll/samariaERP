'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { Card, CardHeader, CardBody, Button } from '@/components/ui';

interface MedicalPricingData {
  id: string;
  itemId: string;
  manufacturerPrice: number;
  freight: number;
  insurance: number;
  customs: number;
  inlandTransport: number;
  bankCost: number;
  warehouseCost: number;
  handlingCost: number;
  wastageAllowance: number;
  otherCosts: number;
  totalCost: number;
  marginPercent: number;
  recommendedPrice: number;
  approvedPrice?: number;
  approvedBy?: string;
  effectiveDate: string;
}

const fieldLabels: Record<string, string> = {
  itemId: 'Item ID',
  manufacturerPrice: 'Manufacturer Price',
  freight: 'Freight',
  insurance: 'Insurance',
  customs: 'Customs',
  inlandTransport: 'Inland Transport',
  bankCost: 'Bank Cost',
  warehouseCost: 'Warehouse Cost',
  handlingCost: 'Handling Cost',
  wastageAllowance: 'Wastage Allowance',
  otherCosts: 'Other Costs',
  totalCost: 'Total Cost',
  marginPercent: 'Margin %',
  recommendedPrice: 'Recommended Price',
  approvedPrice: 'Approved Price',
  approvedBy: 'Approved By',
  effectiveDate: 'Effective Date',
};

export default function MedicalPricingDetailPage() {
  const router = useRouter();
  const params = useParams();
  const recordId = params?.id as string;

  const [data, setData] = useState<MedicalPricingData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const response = await fetch(`/api/medical/pricing/${recordId}`);
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
    router.push(`/dashboard/medical/pricing/${recordId}/edit`);
  };

  const handleBack = () => {
    router.push(`/dashboard/medical/pricing`);
  };

  const formatCurrency = (value?: number) => {
    if (value === undefined || value === null) return 'N/A';
    return value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  const formatDate = (date?: string) => {
    if (!date) return 'N/A';
    try {
      return new Date(date).toLocaleDateString();
    } catch {
      return date;
    }
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

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-slate-600">
        <button
          onClick={handleBack}
          className="text-blue-600 hover:text-blue-800 font-medium"
        >
          Medical Pricing
        </button>
        <span>/</span>
        <span className="text-slate-900 font-medium">{data.itemId}</span>
      </div>

      {/* Page Header */}
      <div>
        <h1 className="text-3xl font-bold text-slate-900">Medical Pricing</h1>
        <p className="text-slate-600 mt-1">Item: {data.itemId}</p>
      </div>

      {/* Details Card */}
      <Card>
        <CardHeader className="flex items-center justify-between">
          <h2 className="text-2xl font-bold text-slate-900">Pricing Details</h2>
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
          {/* Item Info Section */}
          <div>
            <h3 className="text-lg font-semibold text-slate-900 mb-4">Item Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                  {fieldLabels.itemId}
                </label>
                <p className="text-lg font-medium text-slate-900 mt-1">{data.itemId}</p>
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                  {fieldLabels.effectiveDate}
                </label>
                <p className="text-lg font-medium text-slate-900 mt-1">{formatDate(data.effectiveDate)}</p>
              </div>
            </div>
          </div>

          {/* Cost Breakdown Section */}
          <div>
            <h3 className="text-lg font-semibold text-slate-900 mb-4">Cost Breakdown</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                  {fieldLabels.manufacturerPrice}
                </label>
                <p className="text-lg font-medium text-slate-900 mt-1">{formatCurrency(data.manufacturerPrice)}</p>
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                  {fieldLabels.freight}
                </label>
                <p className="text-lg font-medium text-slate-900 mt-1">{formatCurrency(data.freight)}</p>
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                  {fieldLabels.insurance}
                </label>
                <p className="text-lg font-medium text-slate-900 mt-1">{formatCurrency(data.insurance)}</p>
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                  {fieldLabels.customs}
                </label>
                <p className="text-lg font-medium text-slate-900 mt-1">{formatCurrency(data.customs)}</p>
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                  {fieldLabels.inlandTransport}
                </label>
                <p className="text-lg font-medium text-slate-900 mt-1">{formatCurrency(data.inlandTransport)}</p>
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                  {fieldLabels.bankCost}
                </label>
                <p className="text-lg font-medium text-slate-900 mt-1">{formatCurrency(data.bankCost)}</p>
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                  {fieldLabels.warehouseCost}
                </label>
                <p className="text-lg font-medium text-slate-900 mt-1">{formatCurrency(data.warehouseCost)}</p>
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                  {fieldLabels.handlingCost}
                </label>
                <p className="text-lg font-medium text-slate-900 mt-1">{formatCurrency(data.handlingCost)}</p>
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                  {fieldLabels.wastageAllowance}
                </label>
                <p className="text-lg font-medium text-slate-900 mt-1">{formatCurrency(data.wastageAllowance)}</p>
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                  {fieldLabels.otherCosts}
                </label>
                <p className="text-lg font-medium text-slate-900 mt-1">{formatCurrency(data.otherCosts)}</p>
              </div>
            </div>
          </div>

          {/* Pricing Section */}
          <div>
            <h3 className="text-lg font-semibold text-slate-900 mb-4">Pricing</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="md:col-span-2 bg-slate-100 p-4 rounded-lg">
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                  {fieldLabels.totalCost}
                </label>
                <p className="text-2xl font-bold text-slate-900 mt-1">{formatCurrency(data.totalCost)}</p>
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                  {fieldLabels.marginPercent}
                </label>
                <p className="text-lg font-medium text-slate-900 mt-1">{data.marginPercent.toFixed(2)}%</p>
              </div>
              <div className="bg-blue-100 p-4 rounded-lg">
                <label className="text-xs font-semibold text-slate-700 uppercase tracking-wide">
                  {fieldLabels.recommendedPrice}
                </label>
                <p className="text-xl font-bold text-blue-900 mt-1">{formatCurrency(data.recommendedPrice)}</p>
              </div>
              {data.approvedPrice && (
                <div className="bg-green-100 p-4 rounded-lg">
                  <label className="text-xs font-semibold text-slate-700 uppercase tracking-wide">
                    {fieldLabels.approvedPrice}
                  </label>
                  <p className="text-xl font-bold text-green-900 mt-1">{formatCurrency(data.approvedPrice)}</p>
                </div>
              )}
              {data.approvedBy && (
                <div>
                  <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                    {fieldLabels.approvedBy}
                  </label>
                  <p className="text-lg font-medium text-slate-900 mt-1">{data.approvedBy}</p>
                </div>
              )}
            </div>
          </div>
        </CardBody>
      </Card>
    </div>
  );
}
