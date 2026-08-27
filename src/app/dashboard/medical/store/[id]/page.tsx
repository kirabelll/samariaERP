'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import {
  Package,
  Building2,
  Calendar,
  Warehouse,
  DollarSign,
  AlertTriangle,
  ArrowLeft,
  Edit2,
  Truck,
  CheckCircle,
  Clock,
  Layers,
} from 'lucide-react';
import { Card, CardHeader, CardBody, Button, Badge } from '@/components/ui';

function formatWarehouse(warehouse?: string): string {
  if (!warehouse) return 'Medical Store';
  return warehouse
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
}

function formatCurrency(amount?: number) {
  if (!amount && amount !== 0) return '-';
  return `ETB ${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export default function MedicalBatchDetailPage() {
  const router = useRouter();
  const params = useParams();
  const recordId = params?.id as string;

  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const response = await fetch(`/api/medical/batches/${recordId}`);
        const result = await response.json();

        if (!response.ok || !result.success) {
          throw new Error(result.error || 'Failed to fetch batch record');
        }

        setData(result.data);
      } catch (err: any) {
        setError(err.message || 'An error occurred while fetching batch');
      } finally {
        setLoading(false);
      }
    };

    if (recordId) {
      fetchData();
    }
  }, [recordId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600 mx-auto"></div>
          <p className="text-sm text-gray-500">Loading batch details...</p>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="space-y-6 max-w-4xl mx-auto">
        <Link href="/dashboard/medical/store" className="text-blue-600 hover:text-blue-800 font-medium inline-flex items-center gap-1.5 text-sm">
          <ArrowLeft className="w-4 h-4" /> Back to Store
        </Link>
        <Card className="p-6 bg-red-50 border border-red-200">
          <p className="text-red-700 font-medium">{error || 'Batch record not found'}</p>
        </Card>
      </div>
    );
  }

  const expiryDate = data.expiryDate ? new Date(data.expiryDate) : null;
  const now = new Date();
  const threeMonths = new Date();
  threeMonths.setMonth(threeMonths.getMonth() + 3);

  const isExpired = expiryDate ? expiryDate < now : false;
  const isNearExpiry = expiryDate ? expiryDate < threeMonths && expiryDate >= now : false;

  const totalValuation = (Number(data.quantity) || 0) * (Number(data.costPrice) || 0);

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-12">
      {/* Breadcrumbs & Actions */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs text-gray-500 mb-1">
            <Link href="/dashboard/medical/store" className="hover:text-blue-600">
              Medical Store
            </Link>
            <span>/</span>
            <span className="font-semibold text-gray-700">{data.batchNo}</span>
          </div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 flex items-center gap-2.5">
              <Package className="w-7 h-7 text-blue-600" />
              Batch: {data.batchNo}
            </h1>
            <Badge status={data.status as any}>{data.status}</Badge>
            {isExpired && <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-red-100 text-red-700 border border-red-200">EXPIRED</span>}
            {isNearExpiry && <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-orange-100 text-orange-700 border border-orange-200">NEAR EXPIRY</span>}
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <Link href="/dashboard/medical/store">
            <Button variant="outline" size="sm" icon={<ArrowLeft className="w-4 h-4" />}>
              Back to Store
            </Button>
          </Link>
          <Link href={`/dashboard/medical/store/${recordId}/edit`}>
            <Button variant="primary" size="sm" icon={<Edit2 className="w-4 h-4" />}>
              Edit Batch
            </Button>
          </Link>
        </div>
      </div>

      {/* Metrics Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="p-4 bg-white border border-gray-200 border-l-4 border-l-blue-500 shadow-xs">
          <p className="text-xs text-gray-500 font-medium uppercase tracking-wider">Available Stock</p>
          <p className="text-2xl font-bold text-gray-900 mt-1 font-mono">
            {Number(data.quantity).toLocaleString('en-US')} <span className="text-sm font-normal text-gray-500">{data.item?.unit || 'units'}</span>
          </p>
        </Card>

        <Card className="p-4 bg-white border border-gray-200 border-l-4 border-l-indigo-500 shadow-xs">
          <p className="text-xs text-gray-500 font-medium uppercase tracking-wider">Unit Cost Price</p>
          <p className="text-2xl font-bold text-indigo-700 mt-1 font-mono">
            {formatCurrency(data.costPrice)}
          </p>
        </Card>

        <Card className="p-4 bg-white border border-gray-200 border-l-4 border-l-green-500 shadow-xs">
          <p className="text-xs text-gray-500 font-medium uppercase tracking-wider">Total Valuation</p>
          <p className="text-2xl font-bold text-green-700 mt-1 font-mono">
            {formatCurrency(totalValuation)}
          </p>
        </Card>
      </div>

      {/* 2-Column Main Info */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Product Information Card */}
        <Card className="bg-white border border-gray-200 shadow-xs">
          <CardHeader className="border-b border-gray-100 bg-gray-50/50 pb-3">
            <div className="flex items-center gap-2">
              <Building2 className="w-5 h-5 text-blue-600" />
              <h2 className="text-base font-semibold text-gray-900">Product & Drug Information</h2>
            </div>
          </CardHeader>
          <CardBody className="p-5 space-y-4 text-sm">
            <div className="flex justify-between py-1 border-b border-gray-100">
              <span className="text-gray-500">Item / Brand Name:</span>
              <span className="font-semibold text-gray-900">{data.item?.name || '-'}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-gray-100">
              <span className="text-gray-500">Generic Name:</span>
              <span className="font-semibold text-gray-800">{data.item?.genericName || '-'}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-gray-100">
              <span className="text-gray-500">Item Code:</span>
              <span className="font-mono text-gray-800">{data.item?.code || '-'}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-gray-100">
              <span className="text-gray-500">Strength & Dosage:</span>
              <span className="text-gray-800">
                {data.item?.strength || '-'} {data.item?.dosageForm ? `• ${data.item.dosageForm}` : ''}
              </span>
            </div>
            <div className="flex justify-between py-1 border-b border-gray-100">
              <span className="text-gray-500">Manufacturer:</span>
              <span className="text-gray-800">{data.item?.manufacturer || '-'}</span>
            </div>
            <div className="flex justify-between py-1">
              <span className="text-gray-500">Category:</span>
              <span className="text-gray-800">{data.item?.category || 'Medical'}</span>
            </div>
          </CardBody>
        </Card>

        {/* Batch & Storage Card */}
        <Card className="bg-white border border-gray-200 shadow-xs">
          <CardHeader className="border-b border-gray-100 bg-gray-50/50 pb-3">
            <div className="flex items-center gap-2">
              <Warehouse className="w-5 h-5 text-indigo-600" />
              <h2 className="text-base font-semibold text-gray-900">Batch & Storage Details</h2>
            </div>
          </CardHeader>
          <CardBody className="p-5 space-y-4 text-sm">
            <div className="flex justify-between py-1 border-b border-gray-100">
              <span className="text-gray-500">Batch Number:</span>
              <span className="font-mono font-bold text-gray-900">{data.batchNo}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-gray-100">
              <span className="text-gray-500">Expiry Date:</span>
              <span className={`font-semibold ${isExpired ? 'text-red-600' : isNearExpiry ? 'text-orange-600' : 'text-gray-900'}`}>
                {expiryDate ? expiryDate.toLocaleDateString() : '-'}
              </span>
            </div>
            <div className="flex justify-between py-1 border-b border-gray-100">
              <span className="text-gray-500">Target Warehouse:</span>
              <span className="font-medium text-gray-900">{formatWarehouse(data.warehouse)}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-gray-100">
              <span className="text-gray-500">Status:</span>
              <Badge status={data.status as any}>{data.status}</Badge>
            </div>
            <div className="flex justify-between py-1">
              <span className="text-gray-500">Received Date:</span>
              <span className="text-gray-800">
                {data.receivedDate ? new Date(data.receivedDate).toLocaleDateString() : '-'}
              </span>
            </div>
          </CardBody>
        </Card>
      </div>

      {/* Supplier Card (if present) */}
      {data.supplier && (
        <Card className="bg-white border border-gray-200 shadow-xs">
          <CardHeader className="border-b border-gray-100 bg-gray-50/50 pb-3">
            <div className="flex items-center gap-2">
              <Truck className="w-5 h-5 text-blue-600" />
              <h2 className="text-base font-semibold text-gray-900">Supplier Information</h2>
            </div>
          </CardHeader>
          <CardBody className="p-5">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
              <div>
                <span className="text-gray-500 block text-xs">Supplier Company:</span>
                <span className="font-semibold text-gray-900">{data.supplier.companyName}</span>
              </div>
              <div>
                <span className="text-gray-500 block text-xs">Contact Phone:</span>
                <span className="text-gray-800">{data.supplier.phone || '-'}</span>
              </div>
              <div>
                <span className="text-gray-500 block text-xs">TIN Number:</span>
                <span className="font-mono text-gray-800">{data.supplier.tin || '-'}</span>
              </div>
            </div>
          </CardBody>
        </Card>
      )}
    </div>
  );
}
