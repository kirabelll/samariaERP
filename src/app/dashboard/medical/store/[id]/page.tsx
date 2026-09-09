'use client';

import React, { useState, useEffect, useMemo } from 'react';
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
  ArrowUpRight,
  ArrowDownLeft,
  FileText,
  ClipboardList,
  History,
  TrendingDown,
  TrendingUp,
  PlusCircle,
  Printer,
  ShieldCheck,
  ShieldAlert,
  Search,
  ExternalLink,
  Info,
  RefreshCw,
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
  const [activeTab, setActiveTab] = useState<'deductions' | 'overview' | 'sales_orders' | 'grv' | 'adjustments' | 'batches'>('deductions');
  const [deleting, setDeleting] = useState(false);
  const [searchDeduction, setSearchDeduction] = useState('');

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
      setError(err.message || 'An error occurred while fetching batch details');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (recordId) {
      fetchData();
    }
  }, [recordId]);

  const handleDelete = async (permanent: boolean = false) => {
    const isInactive = data?.status === 'Inactive';
    const isPermanent = permanent || isInactive;
    const confirmPrompt = isPermanent
      ? `Are you sure you want to PERMANENTLY delete Batch "${data?.batchNo}" from the database?\n\nThis action CANNOT be undone.`
      : `Are you sure you want to deactivate/delete Batch "${data?.batchNo}"?\n\nIt will be marked as Inactive.`;

    if (!window.confirm(confirmPrompt)) {
      return;
    }

    setDeleting(true);
    try {
      const url = isPermanent ? `/api/medical/batches/${recordId}?permanent=true` : `/api/medical/batches/${recordId}`;
      const res = await fetch(url, { method: 'DELETE' });
      const result = await res.json();
      if (!res.ok || !result.success) {
        throw new Error(result.error || 'Failed to delete batch');
      }
      alert(result.message || (result.permanent ? 'Batch permanently purged from database.' : 'Batch marked as Inactive.'));
      router.push('/dashboard/medical/store');
    } catch (err: any) {
      alert(err.message || 'Failed to delete batch');
    } finally {
      setDeleting(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  // Expiry calculation
  const expiryDate = data?.expiryDate ? new Date(data.expiryDate) : null;
  const now = new Date();
  const threeMonths = new Date();
  threeMonths.setMonth(threeMonths.getMonth() + 3);

  const isExpired = expiryDate ? expiryDate < now : false;
  const isNearExpiry = expiryDate ? expiryDate < threeMonths && expiryDate >= now : false;

  const daysToExpiry = expiryDate
    ? Math.ceil((expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
    : null;

  const totalValuation = (Number(data?.quantity) || 0) * (Number(data?.costPrice) || 0);
  const recommendedPrice = data?.medicalPricing?.recommendedPrice || (data?.costPrice ? data.costPrice * 1.25 : 0);

  // Filtered store issues / sales deductions
  const filteredStoreIssues = useMemo(() => {
    if (!data?.storeIssues || !Array.isArray(data.storeIssues)) return [];
    if (!searchDeduction.trim()) return data.storeIssues;
    const q = searchDeduction.toLowerCase();
    return data.storeIssues.filter((issue: any) =>
      issue.issueNo?.toLowerCase().includes(q) ||
      issue.customer?.companyName?.toLowerCase().includes(q) ||
      issue.customer?.code?.toLowerCase().includes(q) ||
      issue.issuedBy?.toLowerCase().includes(q) ||
      issue.status?.toLowerCase().includes(q)
    );
  }, [data?.storeIssues, searchDeduction]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600 mx-auto"></div>
          <p className="text-sm font-medium text-gray-500">Loading medical store & sales deduction details...</p>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="space-y-6 max-w-4xl mx-auto py-8">
        <Link href="/dashboard/medical/store" className="text-blue-600 hover:text-blue-800 font-medium inline-flex items-center gap-1.5 text-sm">
          <ArrowLeft className="w-4 h-4" /> Back to Medical Store
        </Link>
        <Card className="p-6 bg-red-50 border border-red-200">
          <p className="text-red-700 font-medium">{error || 'Batch record not found'}</p>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16 px-2 sm:px-4">
      {/* Top Breadcrumbs & Action Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-gray-200 pb-4">
        <div>
          <div className="flex items-center gap-2 text-xs text-gray-500 mb-1.5">
            <Link href="/dashboard/medical/store" className="hover:text-blue-600 font-medium transition-colors">
              Medical Store
            </Link>
            <span>/</span>
            <span className="text-gray-400">Batch Details</span>
            <span>/</span>
            <span className="font-mono font-semibold text-gray-800">{data.batchNo}</span>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
              <Package className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2.5">
                <h1 className="text-2xl font-bold text-gray-900 tracking-tight">
                  {data.item?.name || 'Medical Product'}
                </h1>
                <Badge status={data.status as any}>{data.status}</Badge>
                {isExpired && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-red-100 text-red-700 border border-red-200">
                    <ShieldAlert className="w-3.5 h-3.5" /> EXPIRED
                  </span>
                )}
                {isNearExpiry && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-200">
                    <Clock className="w-3.5 h-3.5" /> NEAR EXPIRY
                  </span>
                )}
              </div>
              <p className="text-sm text-gray-500 mt-0.5">
                Batch No: <span className="font-mono font-bold text-gray-900">{data.batchNo}</span>
                {data.item?.code && <> • Code: <span className="font-mono text-gray-700">{data.item.code}</span></>}
                {data.item?.strength && <> • Strength: <span className="text-gray-700 font-medium">{data.item.strength}</span></>}
                {data.item?.dosageForm && <> • Form: <span className="text-gray-700 font-medium">{data.item.dosageForm}</span></>}
              </p>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          <Link href="/dashboard/medical/store">
            <Button variant="outline" size="sm" icon={<ArrowLeft className="w-4 h-4" />}>
              Store List
            </Button>
          </Link>

          <Link href={`/dashboard/medical/store-issues/new`}>
            <Button variant="primary" size="sm" icon={<TrendingDown className="w-4 h-4 text-white" />}>
              Issue / Deduct Stock
            </Button>
          </Link>

          <Button variant="outline" size="sm" icon={<Printer className="w-4 h-4" />} onClick={handlePrint}>
            Print Card
          </Button>

          <Link href={`/dashboard/medical/store/${recordId}/edit`}>
            <Button variant="outline" size="sm" icon={<Edit2 className="w-4 h-4" />}>
              Edit
            </Button>
          </Link>

          {data.status === 'Inactive' ? (
            <Button
              variant="danger"
              size="sm"
              isLoading={deleting}
              onClick={() => handleDelete(true)}
            >
              Delete Permanently
            </Button>
          ) : (
            <Button
              variant="outline"
              size="sm"
              className="border-red-200 text-red-600 hover:bg-red-50 hover:border-red-300"
              isLoading={deleting}
              onClick={() => handleDelete(false)}
            >
              Deactivate
            </Button>
          )}
        </div>
      </div>

      {/* KPI Metrics Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5">
        {/* Available Stock */}
        <Card className="p-4 bg-white border border-gray-200 border-l-4 border-l-blue-600 shadow-xs rounded-xl">
          <div className="flex items-center justify-between text-xs text-gray-500 font-medium uppercase tracking-wider">
            <span>Available Stock</span>
            <Package className="w-4 h-4 text-blue-600" />
          </div>
          <p className="text-2xl font-bold text-gray-900 mt-1 font-mono">
            {Number(data.quantity).toLocaleString('en-US')}{' '}
            <span className="text-xs font-normal text-gray-500">{data.item?.unit || 'units'}</span>
          </p>
          <p className="text-[11px] text-gray-500 mt-1">
            Total In Store: <span className="font-semibold text-gray-700">{data.stats?.totalWarehouseStock?.toLocaleString() || data.quantity}</span>
          </p>
        </Card>

        {/* Sales Deductions Qty */}
        <Card className="p-4 bg-white border border-gray-200 border-l-4 border-l-purple-600 shadow-xs rounded-xl">
          <div className="flex items-center justify-between text-xs text-gray-500 font-medium uppercase tracking-wider">
            <span>Sales Deductions</span>
            <TrendingDown className="w-4 h-4 text-purple-600" />
          </div>
          <p className="text-2xl font-bold text-purple-700 mt-1 font-mono">
            {Number(data.stats?.totalDeductedQty || 0).toLocaleString('en-US')}{' '}
            <span className="text-xs font-normal text-purple-600">{data.item?.unit || 'units'}</span>
          </p>
          <p className="text-[11px] text-purple-700/80 mt-1">
            Across <span className="font-semibold">{data.stats?.deductionsCount || 0}</span> Store Issues
          </p>
        </Card>

        {/* Unit Cost */}
        <Card className="p-4 bg-white border border-gray-200 border-l-4 border-l-indigo-600 shadow-xs rounded-xl">
          <div className="flex items-center justify-between text-xs text-gray-500 font-medium uppercase tracking-wider">
            <span>Unit Cost</span>
            <DollarSign className="w-4 h-4 text-indigo-600" />
          </div>
          <p className="text-2xl font-bold text-indigo-700 mt-1 font-mono">
            {formatCurrency(data.costPrice)}
          </p>
          <p className="text-[11px] text-gray-500 mt-1">
            Rec. Selling: <span className="font-semibold text-gray-700">{formatCurrency(recommendedPrice)}</span>
          </p>
        </Card>

        {/* Total Stock Valuation */}
        <Card className="p-4 bg-white border border-gray-200 border-l-4 border-l-emerald-600 shadow-xs rounded-xl">
          <div className="flex items-center justify-between text-xs text-gray-500 font-medium uppercase tracking-wider">
            <span>Stock Valuation</span>
            <DollarSign className="w-4 h-4 text-emerald-600" />
          </div>
          <p className="text-2xl font-bold text-emerald-700 mt-1 font-mono">
            {formatCurrency(totalValuation)}
          </p>
          <p className="text-[11px] text-gray-500 mt-1">
            Deducted Value: <span className="font-semibold text-purple-700">{formatCurrency(data.stats?.totalDeductedAmount || 0)}</span>
          </p>
        </Card>

        {/* Expiry Status */}
        <Card className={`p-4 bg-white border shadow-xs rounded-xl border-l-4 ${isExpired ? 'border-l-red-600' : isNearExpiry ? 'border-l-amber-500' : 'border-l-teal-600'} border-gray-200`}>
          <div className="flex items-center justify-between text-xs text-gray-500 font-medium uppercase tracking-wider">
            <span>Expiry Date</span>
            <Calendar className={`w-4 h-4 ${isExpired ? 'text-red-600' : isNearExpiry ? 'text-amber-500' : 'text-teal-600'}`} />
          </div>
          <p className={`text-xl font-bold mt-1 font-mono ${isExpired ? 'text-red-700' : isNearExpiry ? 'text-amber-700' : 'text-gray-900'}`}>
            {expiryDate ? expiryDate.toLocaleDateString('en-GB') : '-'}
          </p>
          <p className="text-[11px] mt-1 font-medium">
            {daysToExpiry !== null ? (
              daysToExpiry < 0 ? (
                <span className="text-red-600 font-bold">Expired {Math.abs(daysToExpiry)} days ago</span>
              ) : daysToExpiry <= 90 ? (
                <span className="text-amber-600 font-bold">{daysToExpiry} days remaining</span>
              ) : (
                <span className="text-teal-700">{daysToExpiry} days remaining</span>
              )
            ) : (
              <span className="text-gray-400">No date recorded</span>
            )}
          </p>
        </Card>
      </div>

      {/* Navigation Tabs */}
      <div className="flex items-center gap-1 border-b border-gray-200 overflow-x-auto pb-px">
        <button
          onClick={() => setActiveTab('deductions')}
          className={`flex items-center gap-2 py-2.5 px-4 font-medium text-sm rounded-t-lg transition-colors whitespace-nowrap border-b-2 ${
            activeTab === 'deductions'
              ? 'border-blue-600 text-blue-600 bg-blue-50/50 font-semibold'
              : 'border-transparent text-gray-600 hover:text-gray-900 hover:bg-gray-50'
          }`}
        >
          <TrendingDown className="w-4 h-4 text-purple-600" />
          <span>Sales Deductions & Store Issues</span>
          <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-purple-100 text-purple-700">
            {data.storeIssues?.length || 0}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('overview')}
          className={`flex items-center gap-2 py-2.5 px-4 font-medium text-sm rounded-t-lg transition-colors whitespace-nowrap border-b-2 ${
            activeTab === 'overview'
              ? 'border-blue-600 text-blue-600 bg-blue-50/50 font-semibold'
              : 'border-transparent text-gray-600 hover:text-gray-900 hover:bg-gray-50'
          }`}
        >
          <Info className="w-4 h-4 text-blue-600" />
          <span>Product & Batch Details</span>
        </button>

        <button
          onClick={() => setActiveTab('sales_orders')}
          className={`flex items-center gap-2 py-2.5 px-4 font-medium text-sm rounded-t-lg transition-colors whitespace-nowrap border-b-2 ${
            activeTab === 'sales_orders'
              ? 'border-blue-600 text-blue-600 bg-blue-50/50 font-semibold'
              : 'border-transparent text-gray-600 hover:text-gray-900 hover:bg-gray-50'
          }`}
        >
          <ClipboardList className="w-4 h-4 text-indigo-600" />
          <span>Sales Orders</span>
          <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-700">
            {data.salesOrders?.length || 0}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('grv')}
          className={`flex items-center gap-2 py-2.5 px-4 font-medium text-sm rounded-t-lg transition-colors whitespace-nowrap border-b-2 ${
            activeTab === 'grv'
              ? 'border-blue-600 text-blue-600 bg-blue-50/50 font-semibold'
              : 'border-transparent text-gray-600 hover:text-gray-900 hover:bg-gray-50'
          }`}
        >
          <ArrowDownLeft className="w-4 h-4 text-green-600" />
          <span>Goods Receipts (GRV)</span>
          <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-700">
            {data.goodsReceives?.length || 0}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('adjustments')}
          className={`flex items-center gap-2 py-2.5 px-4 font-medium text-sm rounded-t-lg transition-colors whitespace-nowrap border-b-2 ${
            activeTab === 'adjustments'
              ? 'border-blue-600 text-blue-600 bg-blue-50/50 font-semibold'
              : 'border-transparent text-gray-600 hover:text-gray-900 hover:bg-gray-50'
          }`}
        >
          <History className="w-4 h-4 text-amber-600" />
          <span>Stock Adjustments</span>
          <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-700">
            {data.stockAdjustments?.length || 0}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('batches')}
          className={`flex items-center gap-2 py-2.5 px-4 font-medium text-sm rounded-t-lg transition-colors whitespace-nowrap border-b-2 ${
            activeTab === 'batches'
              ? 'border-blue-600 text-blue-600 bg-blue-50/50 font-semibold'
              : 'border-transparent text-gray-600 hover:text-gray-900 hover:bg-gray-50'
          }`}
        >
          <Layers className="w-4 h-4 text-teal-600" />
          <span>All Batches (FEFO Queue)</span>
          <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-teal-100 text-teal-800">
            {(data.siblingBatches?.length || 0) + 1}
          </span>
        </button>
      </div>

      {/* TAB CONTENT */}

      {/* 1. SALES DEDUCTIONS & STORE ISSUES */}
      {activeTab === 'deductions' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-white p-4 rounded-xl border border-gray-200 shadow-xs">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-purple-50 text-purple-600 rounded-lg">
                <TrendingDown className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base font-bold text-gray-900">Sales & Store Deductions History</h2>
                <p className="text-xs text-gray-500">
                  Detailed audit of medical stock issued and deducted for customer sales and prescriptions
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2.5">
              <div className="relative">
                <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search issue no, customer..."
                  value={searchDeduction}
                  onChange={(e) => setSearchDeduction(e.target.value)}
                  className="pl-9 pr-3 py-1.5 text-xs bg-gray-50 border border-gray-200 rounded-lg w-56 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white"
                />
              </div>

              <Link href="/dashboard/medical/store-issues/new">
                <Button size="sm" variant="primary" icon={<PlusCircle className="w-4 h-4" />}>
                  New Store Issue
                </Button>
              </Link>
            </div>
          </div>

          {filteredStoreIssues.length === 0 ? (
            <Card className="p-12 text-center bg-white border border-gray-200 rounded-xl">
              <div className="w-12 h-12 rounded-full bg-purple-50 text-purple-500 flex items-center justify-center mx-auto mb-3">
                <TrendingDown className="w-6 h-6" />
              </div>
              <h3 className="text-base font-semibold text-gray-900">No Sales Deductions Recorded Yet</h3>
              <p className="text-sm text-gray-500 max-w-md mx-auto mt-1 mb-4">
                No store issues or stock deductions have been executed for Batch {data.batchNo} or this product yet.
              </p>
              <Link href="/dashboard/medical/store-issues/new">
                <Button size="sm" variant="primary" icon={<PlusCircle className="w-4 h-4" />}>
                  Create First Store Issue / Deduction
                </Button>
              </Link>
            </Card>
          ) : (
            <Card className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-xs">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-gray-50/80 border-b border-gray-200 text-xs text-gray-500 font-semibold uppercase tracking-wider">
                    <tr>
                      <th className="py-3 px-4">Issue No / Voucher</th>
                      <th className="py-3 px-4">Date & Time</th>
                      <th className="py-3 px-4">Customer / Facility</th>
                      <th className="py-3 px-4 text-right">Deducted Qty</th>
                      <th className="py-3 px-4 text-right">Unit Price</th>
                      <th className="py-3 px-4 text-right">Deducted Total</th>
                      <th className="py-3 px-4">Issued By</th>
                      <th className="py-3 px-4 text-center">Status</th>
                      <th className="py-3 px-4 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {filteredStoreIssues.map((issue: any) => {
                      const firstMatch = issue.matchedItems?.[0];
                      const unitPrice = firstMatch?.unitPrice || firstMatch?.price || (issue.totalDeductedQty ? issue.totalDeductedAmount / issue.totalDeductedQty : 0);

                      return (
                        <tr key={issue.id} className="hover:bg-blue-50/30 transition-colors">
                          <td className="py-3 px-4 font-mono font-bold text-blue-600">
                            <Link href={`/dashboard/medical/store-issues/${issue.id}`} className="hover:underline flex items-center gap-1">
                              {issue.issueNo}
                              <ExternalLink className="w-3 h-3 text-gray-400" />
                            </Link>
                          </td>
                          <td className="py-3 px-4 text-gray-600 whitespace-nowrap text-xs">
                            {issue.issuedDate ? new Date(issue.issuedDate).toLocaleString('en-GB', { dateStyle: 'medium', timeStyle: 'short' }) : '-'}
                          </td>
                          <td className="py-3 px-4">
                            <span className="font-semibold text-gray-900 block">
                              {issue.customer?.companyName || 'Unknown Customer'}
                            </span>
                            {issue.customer?.code && (
                              <span className="text-[11px] font-mono text-gray-500">
                                Code: {issue.customer.code}
                              </span>
                            )}
                          </td>
                          <td className="py-3 px-4 text-right font-mono font-bold text-purple-700">
                            {Number(issue.totalDeductedQty).toLocaleString()}{' '}
                            <span className="text-xs font-normal text-gray-500">{data.item?.unit || 'units'}</span>
                          </td>
                          <td className="py-3 px-4 text-right font-mono text-gray-700">
                            {formatCurrency(unitPrice)}
                          </td>
                          <td className="py-3 px-4 text-right font-mono font-bold text-gray-900">
                            {formatCurrency(issue.totalDeductedAmount)}
                          </td>
                          <td className="py-3 px-4 text-gray-600 text-xs">
                            {issue.issuedBy || 'Storekeeper'}
                          </td>
                          <td className="py-3 px-4 text-center">
                            <span className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-bold ${
                              issue.status === 'Delivered'
                                ? 'bg-green-100 text-green-800 border border-green-200'
                                : issue.status === 'Cancelled'
                                ? 'bg-red-100 text-red-800 border border-red-200'
                                : 'bg-blue-100 text-blue-800 border border-blue-200'
                            }`}>
                              {issue.status || 'Issued'}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-right">
                            <Link href={`/dashboard/medical/store-issues/${issue.id}`}>
                              <Button size="sm" variant="outline" icon={<ExternalLink className="w-3 h-3" />}>
                                View Receipt
                              </Button>
                            </Link>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot className="bg-gray-50 font-semibold text-gray-900 text-xs border-t border-gray-200">
                    <tr>
                      <td colSpan={3} className="py-3 px-4">
                        Total Deductions from This Product / Batch:
                      </td>
                      <td className="py-3 px-4 text-right font-mono text-purple-800 font-bold">
                        {data.stats?.totalDeductedQty?.toLocaleString()} {data.item?.unit || 'units'}
                      </td>
                      <td className="py-3 px-4 text-right">-</td>
                      <td className="py-3 px-4 text-right font-mono text-gray-900 font-bold">
                        {formatCurrency(data.stats?.totalDeductedAmount || 0)}
                      </td>
                      <td colSpan={3}></td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </Card>
          )}
        </div>
      )}

      {/* 2. OVERVIEW & PRODUCT DETAILS */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Product Information Card */}
          <Card className="bg-white border border-gray-200 shadow-xs rounded-xl overflow-hidden">
            <CardHeader className="border-b border-gray-100 bg-gray-50/50 p-4">
              <div className="flex items-center gap-2">
                <Building2 className="w-5 h-5 text-blue-600" />
                <h2 className="text-base font-bold text-gray-900">Product & Pharmaceutical Master</h2>
              </div>
            </CardHeader>
            <CardBody className="p-5 space-y-3.5 text-sm">
              <div className="flex justify-between py-1 border-b border-gray-100">
                <span className="text-gray-500">Item / Brand Name:</span>
                <span className="font-bold text-gray-900">{data.item?.name || '-'}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-gray-100">
                <span className="text-gray-500">Generic / Scientific Name:</span>
                <span className="font-semibold text-gray-800">{data.item?.genericName || '-'}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-gray-100">
                <span className="text-gray-500">Item Code (SKU):</span>
                <span className="font-mono font-bold text-blue-700">{data.item?.code || '-'}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-gray-100">
                <span className="text-gray-500">Dosage Form:</span>
                <span className="text-gray-800 font-medium">{data.item?.dosageForm || '-'}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-gray-100">
                <span className="text-gray-500">Strength / Concentration:</span>
                <span className="text-gray-800 font-medium">{data.item?.strength || '-'}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-gray-100">
                <span className="text-gray-500">Unit of Measurement:</span>
                <span className="text-gray-800 font-mono">{data.item?.unit || 'Units'}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-gray-100">
                <span className="text-gray-500">Manufacturer / Laboratory:</span>
                <span className="text-gray-800 font-medium">{data.item?.manufacturer || '-'}</span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-gray-500">Product Category:</span>
                <span className="text-gray-800 font-medium">{data.item?.category || 'Medical'}</span>
              </div>
            </CardBody>
          </Card>

          {/* Batch & Storage Card */}
          <Card className="bg-white border border-gray-200 shadow-xs rounded-xl overflow-hidden">
            <CardHeader className="border-b border-gray-100 bg-gray-50/50 p-4">
              <div className="flex items-center gap-2">
                <Warehouse className="w-5 h-5 text-indigo-600" />
                <h2 className="text-base font-bold text-gray-900">Batch & Storage Parameters</h2>
              </div>
            </CardHeader>
            <CardBody className="p-5 space-y-3.5 text-sm">
              <div className="flex justify-between py-1 border-b border-gray-100">
                <span className="text-gray-500">Batch Number:</span>
                <span className="font-mono font-bold text-gray-900 text-base">{data.batchNo}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-gray-100">
                <span className="text-gray-500">Expiry Date:</span>
                <span className={`font-semibold font-mono ${isExpired ? 'text-red-600 font-bold' : isNearExpiry ? 'text-amber-600 font-bold' : 'text-gray-900'}`}>
                  {expiryDate ? expiryDate.toLocaleDateString('en-GB') : '-'}
                  {daysToExpiry !== null && (
                    <span className="text-xs font-normal ml-2">
                      ({daysToExpiry < 0 ? `Expired ${Math.abs(daysToExpiry)} days ago` : `${daysToExpiry} days left`})
                    </span>
                  )}
                </span>
              </div>
              <div className="flex justify-between py-1 border-b border-gray-100">
                <span className="text-gray-500">Storage Warehouse:</span>
                <span className="font-semibold text-gray-900">{formatWarehouse(data.warehouse)}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-gray-100">
                <span className="text-gray-500">Batch Status:</span>
                <Badge status={data.status as any}>{data.status}</Badge>
              </div>
              <div className="flex justify-between py-1 border-b border-gray-100">
                <span className="text-gray-500">Intake / Received Date:</span>
                <span className="text-gray-800">
                  {data.receivedDate ? new Date(data.receivedDate).toLocaleDateString('en-GB') : '-'}
                </span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-gray-500">Stock Balance ID:</span>
                <span className="text-xs font-mono text-gray-600">{data.stockBalance?.id || data.id}</span>
              </div>
            </CardBody>
          </Card>

          {/* Supplier Info Card (if present) */}
          {data.supplier && (
            <Card className="bg-white border border-gray-200 shadow-xs rounded-xl overflow-hidden md:col-span-2">
              <CardHeader className="border-b border-gray-100 bg-gray-50/50 p-4">
                <div className="flex items-center gap-2">
                  <Truck className="w-5 h-5 text-blue-600" />
                  <h2 className="text-base font-bold text-gray-900">Procurement Supplier Information</h2>
                </div>
              </CardHeader>
              <CardBody className="p-5">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
                  <div>
                    <span className="text-gray-500 block text-xs">Supplier Company:</span>
                    <span className="font-bold text-gray-900">{data.supplier.companyName}</span>
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
      )}

      {/* 3. MEDICAL SALES ORDERS */}
      {activeTab === 'sales_orders' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between bg-white p-4 rounded-xl border border-gray-200 shadow-xs">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-indigo-50 text-indigo-600 rounded-lg">
                <ClipboardList className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base font-bold text-gray-900">Medical Sales Orders for this Product</h2>
                <p className="text-xs text-gray-500">Commercial orders requiring stock fulfillment from medical inventory</p>
              </div>
            </div>
          </div>

          {!data.salesOrders || data.salesOrders.length === 0 ? (
            <Card className="p-12 text-center bg-white border border-gray-200 rounded-xl">
              <ClipboardList className="w-10 h-10 text-gray-400 mx-auto mb-2" />
              <p className="text-sm font-medium text-gray-600">No medical sales orders found for this item.</p>
            </Card>
          ) : (
            <Card className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-xs">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-gray-50 border-b border-gray-200 text-xs text-gray-500 font-semibold uppercase">
                    <tr>
                      <th className="py-3 px-4">Order No</th>
                      <th className="py-3 px-4">Date</th>
                      <th className="py-3 px-4">Customer</th>
                      <th className="py-3 px-4 text-right">Ordered Qty</th>
                      <th className="py-3 px-4 text-right">Total ETB</th>
                      <th className="py-3 px-4 text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {data.salesOrders.map((order: any) => (
                      <tr key={order.id} className="hover:bg-gray-50/60">
                        <td className="py-3 px-4 font-mono font-bold text-blue-600">
                          <Link href={`/dashboard/sales/orders/${order.id}`} className="hover:underline">
                            {order.orderNo}
                          </Link>
                        </td>
                        <td className="py-3 px-4 text-gray-600 text-xs">
                          {order.orderDate ? new Date(order.orderDate).toLocaleDateString('en-GB') : '-'}
                        </td>
                        <td className="py-3 px-4 font-medium text-gray-900">
                          {order.customer?.companyName || 'Customer'}
                        </td>
                        <td className="py-3 px-4 text-right font-mono font-semibold text-gray-900">
                          {order.orderQty?.toLocaleString()} {data.item?.unit || 'units'}
                        </td>
                        <td className="py-3 px-4 text-right font-mono font-bold text-gray-900">
                          {formatCurrency(order.orderTotal)}
                        </td>
                        <td className="py-3 px-4 text-center">
                          <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-gray-100 text-gray-800">
                            {order.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          )}
        </div>
      )}

      {/* 4. GOODS RECEIPTS (GRV) */}
      {activeTab === 'grv' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between bg-white p-4 rounded-xl border border-gray-200 shadow-xs">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-green-50 text-green-600 rounded-lg">
                <ArrowDownLeft className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base font-bold text-gray-900">Goods Receive Vouchers (Inward Receipts)</h2>
                <p className="text-xs text-gray-500">Warehouse intake vouchers that supplied this medical batch</p>
              </div>
            </div>
          </div>

          {!data.goodsReceives || data.goodsReceives.length === 0 ? (
            <Card className="p-12 text-center bg-white border border-gray-200 rounded-xl">
              <ArrowDownLeft className="w-10 h-10 text-gray-400 mx-auto mb-2" />
              <p className="text-sm font-medium text-gray-600">No linked GRV intake vouchers found.</p>
            </Card>
          ) : (
            <Card className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-xs">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-gray-50 border-b border-gray-200 text-xs text-gray-500 font-semibold uppercase">
                    <tr>
                      <th className="py-3 px-4">GRV No</th>
                      <th className="py-3 px-4">Received Date</th>
                      <th className="py-3 px-4">Supplier</th>
                      <th className="py-3 px-4">PO Ref</th>
                      <th className="py-3 px-4 text-right">Received Qty</th>
                      <th className="py-3 px-4 text-right">Unit Cost</th>
                      <th className="py-3 px-4 text-right">Total Cost</th>
                      <th className="py-3 px-4">Received By</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {data.goodsReceives.map((grv: any) => (
                      <tr key={grv.id} className="hover:bg-gray-50/60">
                        <td className="py-3 px-4 font-mono font-bold text-green-700">
                          {grv.grvNo}
                        </td>
                        <td className="py-3 px-4 text-gray-600 text-xs">
                          {grv.receivedDate ? new Date(grv.receivedDate).toLocaleDateString('en-GB') : '-'}
                        </td>
                        <td className="py-3 px-4 font-medium text-gray-900">
                          {grv.supplier?.companyName || '-'}
                        </td>
                        <td className="py-3 px-4 font-mono text-xs text-gray-600">
                          {grv.purchaseOrder?.poNo || '-'}
                        </td>
                        <td className="py-3 px-4 text-right font-mono font-bold text-gray-900">
                          {grv.receivedQty?.toLocaleString()} {data.item?.unit || 'units'}
                        </td>
                        <td className="py-3 px-4 text-right font-mono text-gray-700">
                          {formatCurrency(grv.unitCost)}
                        </td>
                        <td className="py-3 px-4 text-right font-mono font-bold text-gray-900">
                          {formatCurrency(grv.totalCost)}
                        </td>
                        <td className="py-3 px-4 text-gray-600 text-xs">
                          {grv.receivedBy || 'Storekeeper'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          )}
        </div>
      )}

      {/* 5. STOCK ADJUSTMENTS */}
      {activeTab === 'adjustments' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between bg-white p-4 rounded-xl border border-gray-200 shadow-xs">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-amber-50 text-amber-600 rounded-lg">
                <History className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base font-bold text-gray-900">Inventory Adjustments & Corrections</h2>
                <p className="text-xs text-gray-500">Physical counts, damage write-offs, returns, and reconciliations</p>
              </div>
            </div>
          </div>

          {!data.stockAdjustments || data.stockAdjustments.length === 0 ? (
            <Card className="p-12 text-center bg-white border border-gray-200 rounded-xl">
              <History className="w-10 h-10 text-gray-400 mx-auto mb-2" />
              <p className="text-sm font-medium text-gray-600">No stock adjustments recorded for this batch.</p>
            </Card>
          ) : (
            <Card className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-xs">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-gray-50 border-b border-gray-200 text-xs text-gray-500 font-semibold uppercase">
                    <tr>
                      <th className="py-3 px-4">Adjustment No</th>
                      <th className="py-3 px-4">Date</th>
                      <th className="py-3 px-4">Type</th>
                      <th className="py-3 px-4 text-right">Previous Qty</th>
                      <th className="py-3 px-4 text-right">New Qty</th>
                      <th className="py-3 px-4 text-right">Difference</th>
                      <th className="py-3 px-4">Reason / Notes</th>
                      <th className="py-3 px-4">Adjusted By</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {data.stockAdjustments.map((adj: any) => (
                      <tr key={adj.id} className="hover:bg-gray-50/60">
                        <td className="py-3 px-4 font-mono font-bold text-gray-900">
                          {adj.adjustmentNo}
                        </td>
                        <td className="py-3 px-4 text-gray-600 text-xs">
                          {adj.adjustmentDate ? new Date(adj.adjustmentDate).toLocaleDateString('en-GB') : '-'}
                        </td>
                        <td className="py-3 px-4">
                          <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-gray-100 text-gray-800">
                            {adj.adjustmentType}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right font-mono text-gray-700">
                          {adj.previousQty?.toLocaleString()}
                        </td>
                        <td className="py-3 px-4 text-right font-mono font-bold text-gray-900">
                          {adj.newQty?.toLocaleString()}
                        </td>
                        <td className="py-3 px-4 text-right font-mono font-bold">
                          <span className={adj.difference >= 0 ? 'text-green-600' : 'text-red-600'}>
                            {adj.difference > 0 ? `+${adj.difference}` : adj.difference}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-gray-700 text-xs">
                          {adj.reason || '-'}
                        </td>
                        <td className="py-3 px-4 text-gray-600 text-xs">
                          {adj.adjustedBy || '-'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          )}
        </div>
      )}

      {/* 6. ALL BATCHES (FEFO QUEUE) */}
      {activeTab === 'batches' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between bg-white p-4 rounded-xl border border-gray-200 shadow-xs">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-teal-50 text-teal-600 rounded-lg">
                <Layers className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base font-bold text-gray-900">All Batches for {data.item?.name} (FEFO Order)</h2>
                <p className="text-xs text-gray-500">First-Expiry First-Out queue across all batches for this product</p>
              </div>
            </div>
          </div>

          <Card className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-gray-50 border-b border-gray-200 text-xs text-gray-500 font-semibold uppercase">
                  <tr>
                    <th className="py-3 px-4">Batch Number</th>
                    <th className="py-3 px-4">Warehouse</th>
                    <th className="py-3 px-4">Expiry Date</th>
                    <th className="py-3 px-4 text-right">Available Qty</th>
                    <th className="py-3 px-4 text-right">Unit Cost</th>
                    <th className="py-3 px-4 text-center">Status</th>
                    <th className="py-3 px-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {/* Current Batch Row */}
                  <tr className="bg-blue-50/40 font-medium">
                    <td className="py-3 px-4 font-mono font-bold text-blue-700 flex items-center gap-2">
                      <span>{data.batchNo}</span>
                      <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-blue-600 text-white uppercase">Current</span>
                    </td>
                    <td className="py-3 px-4 text-gray-700">{formatWarehouse(data.warehouse)}</td>
                    <td className="py-3 px-4 font-mono text-gray-900">{expiryDate ? expiryDate.toLocaleDateString('en-GB') : '-'}</td>
                    <td className="py-3 px-4 text-right font-mono font-bold text-blue-700">{Number(data.quantity).toLocaleString()} {data.item?.unit || 'units'}</td>
                    <td className="py-3 px-4 text-right font-mono text-gray-700">{formatCurrency(data.costPrice)}</td>
                    <td className="py-3 px-4 text-center"><Badge status={data.status as any}>{data.status}</Badge></td>
                    <td className="py-3 px-4 text-right text-xs text-gray-400">Viewing</td>
                  </tr>

                  {/* Sibling Batches */}
                  {data.siblingBatches?.map((sibling: any) => {
                    const sibExpiry = sibling.expiryDate ? new Date(sibling.expiryDate) : null;
                    return (
                      <tr key={sibling.id} className="hover:bg-gray-50/60">
                        <td className="py-3 px-4 font-mono font-bold text-gray-900">
                          <Link href={`/dashboard/medical/store/${sibling.id}`} className="hover:text-blue-600 hover:underline">
                            {sibling.batchNo}
                          </Link>
                        </td>
                        <td className="py-3 px-4 text-gray-600">{formatWarehouse(sibling.warehouse)}</td>
                        <td className="py-3 px-4 font-mono text-gray-700">{sibExpiry ? sibExpiry.toLocaleDateString('en-GB') : '-'}</td>
                        <td className="py-3 px-4 text-right font-mono font-semibold text-gray-900">{Number(sibling.quantity).toLocaleString()} {data.item?.unit || 'units'}</td>
                        <td className="py-3 px-4 text-right font-mono text-gray-700">{formatCurrency(sibling.costPrice)}</td>
                        <td className="py-3 px-4 text-center"><Badge status={sibling.status as any}>{sibling.status}</Badge></td>
                        <td className="py-3 px-4 text-right">
                          <Link href={`/dashboard/medical/store/${sibling.id}`}>
                            <Button size="sm" variant="outline" icon={<ExternalLink className="w-3 h-3" />}>
                              View
                            </Button>
                          </Link>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
