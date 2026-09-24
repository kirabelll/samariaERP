'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { Card, CardHeader, CardBody, Button, Badge } from '@/components/ui';

export default function SalesInvoiceDetailPage() {
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
        const response = await fetch(`/api/sales/invoices/${recordId}`);
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

  const [deleting, setDeleting] = useState(false);
  const [permanentlyDeleting, setPermanentlyDeleting] = useState(false);

  const handleEdit = () => {
    router.push(`/dashboard/sales/invoices/${recordId}/edit`);
  };

  const handleRecordPayment = () => {
    if (data?.customerId && recordId) {
      router.push(`/dashboard/sales/payments/new?invoiceId=${recordId}&customerId=${data.customerId}`);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm(`Are you sure you want to deactivate invoice ${data?.invoiceNo}? This will set the status to inactive but preserve the record.`)) {
      return;
    }
    setDeleting(true);
    try {
      const response = await fetch(`/api/sales/invoices/${recordId}`, {
        method: 'DELETE',
      });
      const result = await response.json();
      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Failed to delete invoice');
      }
      // Refresh data to show updated status
      window.location.reload();
    } catch (err: any) {
      alert(err.message || 'Failed to delete invoice');
    } finally {
      setDeleting(false);
    }
  };

  const handlePermanentDelete = async () => {
    const confirmText = `DELETE ${data?.invoiceNo}`;
    const userInput = window.prompt(
      `⚠️ PERMANENT DELETION WARNING ⚠️\n\n` +
      `This will PERMANENTLY DELETE invoice ${data?.invoiceNo} and all associated data from the database. ` +
      `This action CANNOT be undone and will affect:\n\n` +
      `• Invoice record and all line items\n` +
      `• Payment records linked to this invoice\n` +
      `• Any references in reports and audit trails\n\n` +
      `Type exactly "${confirmText}" to confirm permanent deletion:`
    );

    if (userInput !== confirmText) {
      if (userInput !== null) {
        alert('Deletion cancelled. The confirmation text did not match.');
      }
      return;
    }

    setPermanentlyDeleting(true);
    try {
      const response = await fetch(`/api/sales/invoices/${recordId}?permanent=true`, {
        method: 'DELETE',
      });
      const result = await response.json();
      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Failed to permanently delete invoice');
      }
      alert(`Invoice ${data?.invoiceNo} has been permanently deleted from the database.`);
      router.push('/dashboard/sales/invoices');
    } catch (err: any) {
      alert(err.message || 'Failed to permanently delete invoice');
    } finally {
      setPermanentlyDeleting(false);
    }
  };

  const handleBack = () => {
    router.push(`/dashboard/sales/invoices`);
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const parsedItems: any[] = useMemo(() => {
    if (!data?.items) return [];
    try {
      const items = typeof data.items === 'string' ? JSON.parse(data.items) : data.items;
      return Array.isArray(items) ? items : [];
    } catch {
      return [];
    }
  }, [data?.items]);

  const { totalQty, totalLineSum, avgUnitPrice, itemSummaries, dominantUnit } = useMemo(() => {
    let tQty = 0;
    let tSum = 0;
    const unitCounts: Record<string, number> = {};
    const map = new Map<string, {
      name: string;
      unit: string;
      totalQty: number;
      sumTotal: number;
      unitPrices: Set<number>;
      count: number;
    }>();

    parsedItems.forEach((item, idx) => {
      const name = item.name || item.itemName || item.item || item.itemId || `Item ${idx + 1}`;
      const qty = Number(item.qty || item.quantity || 0);
      const unit = item.unit || (data?.division === 'CEMENT' ? 'tons' : data?.division === 'AGGREGATE' ? 'm³' : 'pcs');
      const unitPrice = Number(item.unitPrice || item.price || 0);
      const lineTotal = item.total != null ? Number(item.total) : qty * unitPrice;

      tQty += qty;
      tSum += lineTotal;
      unitCounts[unit] = (unitCounts[unit] || 0) + 1;

      const key = `${name}___${unit}`;
      if (!map.has(key)) {
        map.set(key, {
          name,
          unit,
          totalQty: 0,
          sumTotal: 0,
          unitPrices: new Set(),
          count: 0,
        });
      }
      const entry = map.get(key)!;
      entry.totalQty += qty;
      entry.sumTotal += lineTotal;
      entry.unitPrices.add(unitPrice);
      entry.count += 1;
    });

    const summaries = Array.from(map.values()).map(entry => {
      const avgPrice = entry.totalQty > 0 ? entry.sumTotal / entry.totalQty : (Array.from(entry.unitPrices)[0] || 0);
      return {
        ...entry,
        avgPrice,
      };
    });

    const dominant = Object.keys(unitCounts).sort((a, b) => unitCounts[b] - unitCounts[a])[0] || (data?.division === 'CEMENT' ? 'tons' : data?.division === 'AGGREGATE' ? 'm³' : 'pcs');
    const avgPrice = tQty > 0 ? tSum / tQty : 0;

    return {
      totalQty: tQty,
      totalLineSum: tSum,
      avgUnitPrice: avgPrice,
      itemSummaries: summaries,
      dominantUnit: dominant,
    };
  }, [parsedItems, data?.division]);

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
        <button onClick={handleBack} className="text-blue-600 hover:text-blue-800 font-medium">
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
        <button onClick={handleBack} className="text-blue-600 hover:text-blue-800 font-medium">
          Invoices
        </button>
        <span>/</span>
        <span className="text-slate-900 font-medium">{data.invoiceNo}</span>
      </div>

      {/* Page Header */}
      <div>
        <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-slate-900">
          Invoice {data.invoiceNo}
        </h1>
        <p className="text-slate-600 mt-1">
          Customer: {data.customer?.companyName || data.customerId}
        </p>
      </div>

      {/* Invoice Details Card */}
      <Card>
        <CardHeader className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h2 className="text-2xl font-bold text-slate-900">{data.invoiceNo}</h2>
            <Badge status={data.status}>{data.status}</Badge>
            {data.status === 'Inactive' && (
              <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-red-100 border border-red-300">
                <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></div>
                <span className="text-red-700 text-sm font-semibold">Inactive - Can be permanently deleted</span>
              </div>
            )}
          </div>
          <div className="flex gap-3">
            {data.status !== 'Paid' && data.status !== 'Cancelled' && data.status !== 'Inactive' && (
              <Button variant="primary" size="lg" onClick={handleRecordPayment}>
                Record Payment
              </Button>
            )}
            {data.status !== 'Inactive' && (
              <Button variant="outline" size="lg" onClick={handleEdit}>
                Edit
              </Button>
            )}
            {data.status === 'Inactive' ? (
              <Button
                variant="outline"
                size="lg"
                onClick={handlePermanentDelete}
                isLoading={permanentlyDeleting}
                className="border-red-500 text-red-700 hover:bg-red-50 hover:border-red-600 font-semibold"
              >
                {permanentlyDeleting ? 'Deleting Permanently...' : 'Delete Permanently'}
              </Button>
            ) : (
              <Button
                variant="outline"
                size="lg"
                onClick={handleDelete}
                isLoading={deleting}
                className="border-orange-300 text-orange-600 hover:bg-orange-50 hover:border-orange-400 font-semibold"
              >
                {deleting ? 'Deactivating...' : 'Deactivate'}
              </Button>
            )}
            <Button variant="outline" size="lg" onClick={handleBack}>
              Back
            </Button>
          </div>
        </CardHeader>

        <CardBody className="space-y-8">
          {/* Inactive Invoice Warning */}
          {data.status === 'Inactive' && (
            <div className="border border-red-300 rounded-lg bg-red-50 p-4">
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0">
                  <svg className="w-5 h-5 text-red-600 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="flex-1">
                  <h4 className="text-red-800 font-semibold text-sm">Inactive Invoice</h4>
                  <p className="text-red-700 text-sm mt-1">
                    This invoice has been deactivated and is excluded from active reports and calculations. 
                    You can permanently delete this invoice to remove it completely from the database, 
                    but this action cannot be undone.
                  </p>
                  <div className="mt-3 text-xs text-red-600">
                    <p><strong>Note:</strong> Permanent deletion will remove all associated payment records and references.</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Invoice Information */}
          <div>
            <h3 className="text-lg font-semibold text-slate-900 mb-4">Invoice Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <div>
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Invoice No</label>
                <p className="text-lg font-medium text-slate-900 mt-1">{data.invoiceNo}</p>
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">FS Number (Fiscal Receipt)</label>
                <p className="text-lg font-medium text-slate-900 mt-1">
                  {data.fsNo ? (
                    <span className="font-mono font-semibold text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                      {data.fsNo}
                    </span>
                  ) : (
                    <span className="text-slate-400 font-normal text-base">N/A</span>
                  )}
                </p>
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Customer</label>
                <p className="text-lg font-medium text-slate-900 mt-1">{data.customer?.companyName || 'N/A'}</p>
              </div>
              {data.salesOrder && (
                <div>
                  <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Sales Order</label>
                  <p className="text-lg font-medium text-slate-900 mt-1">{data.salesOrder.orderNo}</p>
                </div>
              )}
              <div>
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Division</label>
                <p className="text-lg font-medium text-slate-900 mt-1 capitalize">{data.division || 'N/A'}</p>
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Invoice Date</label>
                <p className="text-lg font-medium text-slate-900 mt-1">
                  {data.invoiceDate ? formatDate(data.invoiceDate) : 'N/A'}
                </p>
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Due Date</label>
                <p className="text-lg font-medium text-slate-900 mt-1">
                  {data.dueDate ? formatDate(data.dueDate) : 'N/A'}
                </p>
              </div>
            </div>
          </div>

          {/* Financial Summary */}
          <div className="border-t border-slate-200 pt-8">
            <h3 className="text-lg font-semibold text-slate-900 mb-4">Financial Summary</h3>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-6">
              <div>
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Subtotal</label>
                <p className="text-xl font-bold text-slate-900 mt-1">{formatCurrency(data.subtotal || 0)} ETB</p>
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">VAT ({data.vatRate || 15}%)</label>
                <p className="text-xl font-bold text-slate-900 mt-1">{formatCurrency(data.vatAmount || 0)} ETB</p>
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Withholding</label>
                <p className="text-xl font-bold text-orange-600 mt-1">-{formatCurrency(data.withholding || 0)} ETB</p>
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Total Amount</label>
                <p className="text-xl font-bold text-green-600 mt-1">{formatCurrency(data.totalAmount || 0)} ETB</p>
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Status</label>
                <div className="mt-1">
                  <Badge status={data.status}>{data.status}</Badge>
                </div>
              </div>
            </div>
          </div>

          {/* Invoice Items & Summary */}
          {parsedItems.length > 0 && (
            <div className="border-t border-slate-200 pt-8 space-y-6">
              {/* Header */}
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                <div>
                  <h3 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
                    <span>Items & Quantity Summary</span>
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-800">
                      {parsedItems.length} Line {parsedItems.length === 1 ? 'Item' : 'Items'}
                    </span>
                  </h3>
                  <p className="text-sm text-slate-600 mt-0.5">
                    Overview of invoiced items, total quantities, unit prices, and line totals
                  </p>
                </div>
              </div>

              {/* Items Summary KPI Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-200/80 rounded-xl p-4 shadow-sm">
                  <div className="flex items-center justify-between text-blue-700 text-xs font-semibold uppercase tracking-wider mb-1">
                    <span>Total Quantity</span>
                    <span className="px-2 py-0.5 rounded bg-blue-100 text-blue-800 text-[10px] font-mono lowercase">
                      {dominantUnit}
                    </span>
                  </div>
                  <div className="text-2xl font-bold text-blue-950 mt-1">
                    {totalQty.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 3 })}
                    <span className="text-sm font-medium text-blue-700 ml-1.5">{dominantUnit}</span>
                  </div>
                  <div className="text-xs text-blue-600/80 mt-1.5">
                    Across {parsedItems.length} line {parsedItems.length === 1 ? 'entry' : 'entries'}
                  </div>
                </div>

                <div className="bg-gradient-to-br from-purple-50 to-pink-50 border border-purple-200/80 rounded-xl p-4 shadow-sm">
                  <div className="text-purple-700 text-xs font-semibold uppercase tracking-wider mb-1">
                    {itemSummaries.length === 1 && itemSummaries[0]?.unitPrices.size === 1 ? 'Unit Price' : 'Avg Unit Price'}
                  </div>
                  <div className="text-2xl font-bold text-purple-950 mt-1 font-mono">
                    {formatCurrency(avgUnitPrice)}
                    <span className="text-sm font-medium text-purple-700 ml-1.5">ETB</span>
                  </div>
                  <div className="text-xs text-purple-600/80 mt-1.5">
                    {itemSummaries.length === 1 && itemSummaries[0]?.unitPrices.size === 1 ? 'Fixed unit rate' : 'Weighted average unit rate'}
                  </div>
                </div>

                <div className="bg-gradient-to-br from-emerald-50 to-teal-50 border border-emerald-200/80 rounded-xl p-4 shadow-sm">
                  <div className="text-emerald-700 text-xs font-semibold uppercase tracking-wider mb-1">
                    Sum Line Total
                  </div>
                  <div className="text-2xl font-bold text-emerald-950 mt-1 font-mono">
                    {formatCurrency(totalLineSum)}
                    <span className="text-sm font-medium text-emerald-700 ml-1.5">ETB</span>
                  </div>
                  <div className="text-xs text-emerald-600/80 mt-1.5">
                    Total before tax & deductions
                  </div>
                </div>

                <div className="bg-gradient-to-br from-slate-50 to-slate-100 border border-slate-200/80 rounded-xl p-4 shadow-sm">
                  <div className="text-slate-600 text-xs font-semibold uppercase tracking-wider mb-1">
                    Item Types
                  </div>
                  <div className="text-2xl font-bold text-slate-900 mt-1">
                    {itemSummaries.length}
                    <span className="text-sm font-medium text-slate-600 ml-1.5">
                      {itemSummaries.length === 1 ? 'Product' : 'Products'}
                    </span>
                  </div>
                  <div className="text-xs text-slate-500 mt-1.5">
                    {parsedItems.length} total invoice {parsedItems.length === 1 ? 'row' : 'rows'}
                  </div>
                </div>
              </div>

              {/* Grouped Items Summary Breakdown */}
              {itemSummaries.length > 0 && (
                <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
                  <div className="px-4 py-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                    <span className="font-semibold text-sm text-slate-800">
                      Item Summary Breakdown
                    </span>
                    <span className="text-xs text-slate-500">
                      Aggregated by product
                    </span>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="bg-slate-100/70 border-b border-slate-200 text-xs font-semibold text-slate-700 uppercase tracking-wider">
                          <th className="px-4 py-3 text-left">Item Description</th>
                          <th className="px-4 py-3 text-center">Lines</th>
                          <th className="px-4 py-3 text-right">Total Quantity</th>
                          <th className="px-4 py-3 text-right">Unit</th>
                          <th className="px-4 py-3 text-right">Unit Price (ETB)</th>
                          <th className="px-4 py-3 text-right">Sum Line Total (ETB)</th>
                          <th className="px-4 py-3 text-right">Share</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {itemSummaries.map((summary, idx) => {
                          const percent = totalLineSum > 0 ? (summary.sumTotal / totalLineSum) * 100 : 0;
                          return (
                            <tr key={idx} className="hover:bg-slate-50/60 transition-colors">
                              <td className="px-4 py-3.5 font-medium text-slate-900">
                                {summary.name}
                              </td>
                              <td className="px-4 py-3.5 text-center text-slate-600 text-xs">
                                <span className="px-2 py-0.5 rounded-full bg-slate-100 font-mono">
                                  {summary.count}
                                </span>
                              </td>
                              <td className="px-4 py-3.5 text-right font-semibold text-slate-900 font-mono">
                                {summary.totalQty.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 3 })}
                              </td>
                              <td className="px-4 py-3.5 text-right text-slate-600">
                                {summary.unit}
                              </td>
                              <td className="px-4 py-3.5 text-right font-mono text-slate-900">
                                {summary.unitPrices.size === 1
                                  ? formatCurrency(Array.from(summary.unitPrices)[0])
                                  : `${formatCurrency(summary.avgPrice)} (avg)`}
                              </td>
                              <td className="px-4 py-3.5 text-right font-bold font-mono text-slate-900">
                                {formatCurrency(summary.sumTotal)}
                              </td>
                              <td className="px-4 py-3.5 text-right text-xs font-semibold text-slate-500">
                                <div className="flex items-center justify-end gap-1.5">
                                  <div className="w-12 bg-slate-100 rounded-full h-1.5 overflow-hidden">
                                    <div
                                      className="bg-blue-600 h-full rounded-full"
                                      style={{ width: `${Math.min(100, Math.max(0, percent))}%` }}
                                    />
                                  </div>
                                  <span>{percent.toFixed(1)}%</span>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                      <tfoot>
                        <tr className="bg-slate-50 border-t-2 border-slate-300 font-semibold text-slate-900">
                          <td className="px-4 py-3 font-bold" colSpan={2}>
                            Total
                          </td>
                          <td className="px-4 py-3 text-right font-bold font-mono text-blue-900">
                            {totalQty.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 3 })}
                          </td>
                          <td className="px-4 py-3 text-right text-slate-600">
                            {dominantUnit}
                          </td>
                          <td className="px-4 py-3 text-right font-mono text-slate-700">
                            {formatCurrency(avgUnitPrice)}
                          </td>
                          <td className="px-4 py-3 text-right font-bold font-mono text-emerald-700">
                            {formatCurrency(totalLineSum)}
                          </td>
                          <td className="px-4 py-3 text-right font-bold text-xs text-slate-700">
                            100.0%
                          </td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                </div>
              )}

              {/* Detailed Line Items Table */}
              <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
                <div className="px-4 py-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                  <span className="font-semibold text-sm text-slate-800">
                    Detailed Line Items
                  </span>
                  <span className="text-xs text-slate-500">
                    All individual item rows & tickets
                  </span>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse text-sm">
                    <thead>
                      <tr className="bg-slate-100/70 border-b border-slate-200 text-xs font-semibold text-slate-700 uppercase tracking-wider">
                        <th className="px-4 py-3 text-left">#</th>
                        <th className="px-4 py-3 text-left">Item Description</th>
                        <th className="px-4 py-3 text-right">Quantity</th>
                        <th className="px-4 py-3 text-right">Unit</th>
                        <th className="px-4 py-3 text-right">Unit Price (ETB)</th>
                        <th className="px-4 py-3 text-right">Line Total (ETB)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {parsedItems.map((item: any, idx: number) => {
                        const itemName = item.name || item.itemName || item.item || item.itemId || `Item ${idx + 1}`;
                        const qty = Number(item.qty || item.quantity || 0);
                        const unit = item.unit || (data.division === 'CEMENT' ? 'tons' : data.division === 'AGGREGATE' ? 'm³' : 'pcs');
                        const unitPrice = Number(item.unitPrice || item.price || 0);
                        const total = item.total != null ? Number(item.total) : qty * unitPrice;

                        return (
                          <tr key={idx} className="hover:bg-slate-50/60 transition-colors">
                            <td className="px-4 py-3 text-slate-400 font-mono text-xs">{idx + 1}</td>
                            <td className="px-4 py-3 font-medium text-slate-900">
                              <div className="flex flex-wrap items-center gap-1.5">
                                <span>{itemName}</span>
                                {item.batchNo && (
                                  <span className="px-2 py-0.5 bg-purple-50 text-purple-700 text-xs font-semibold rounded border border-purple-200">
                                    Batch: {item.batchNo}
                                  </span>
                                )}
                                {item.expiryDate && (
                                  <span className="text-xs text-slate-500">
                                    (Exp: {new Date(item.expiryDate).toLocaleDateString()})
                                  </span>
                                )}
                                {item.dispatchNo && (
                                  <span className="text-xs text-blue-600 font-medium">
                                    [Dispatch: {item.dispatchNo}]
                                  </span>
                                )}
                                {item.liftingNo && (
                                  <span className="text-xs text-purple-600 font-medium">
                                    [Lifting: {item.liftingNo}]
                                  </span>
                                )}
                              </div>
                            </td>
                            <td className="px-4 py-3 text-right text-slate-900 font-semibold font-mono">
                              {qty.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 3 })}
                            </td>
                            <td className="px-4 py-3 text-right text-slate-600">{unit}</td>
                            <td className="px-4 py-3 text-right text-slate-900 font-mono">
                              {formatCurrency(unitPrice)}
                            </td>
                            <td className="px-4 py-3 text-right text-slate-900 font-bold font-mono">
                              {formatCurrency(total)}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                    <tfoot>
                      <tr className="bg-slate-50 border-t-2 border-slate-300 font-semibold">
                        <td className="px-4 py-3.5 text-slate-900 font-bold" colSpan={2}>
                          Total ({parsedItems.length} {parsedItems.length === 1 ? 'Line Item' : 'Line Items'})
                        </td>
                        <td className="px-4 py-3.5 text-right text-blue-900 font-bold font-mono">
                          {totalQty.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 3 })}
                        </td>
                        <td className="px-4 py-3.5 text-right text-slate-600">{dominantUnit}</td>
                        <td className="px-4 py-3.5 text-right text-slate-700 font-mono font-bold">
                          {formatCurrency(avgUnitPrice)}
                        </td>
                        <td className="px-4 py-3.5 text-right text-emerald-700 font-bold font-mono text-base">
                          {formatCurrency(totalLineSum)} ETB
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* Related Cement Liftings */}
          {((data.cementLiftings && data.cementLiftings.length > 0) || data.cementLifting) && (
            <div className="border-t border-slate-200 pt-8">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
                    <span>Associated Cement Liftings</span>
                    <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                  </h3>
                  <p className="text-sm text-slate-600 mt-1">
                    Weighbridge tickets, quantities, factory sources, and driver details for this invoice
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="px-3 py-1.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-800 border border-blue-200">
                    {(data.cementLiftings || (data.cementLifting ? [data.cementLifting] : [])).length} Lifting Ticket{(data.cementLiftings || (data.cementLifting ? [data.cementLifting] : [])).length === 1 ? '' : 's'}
                  </span>
                </div>
              </div>
              
              <div className="bg-white rounded-lg border border-slate-200 overflow-hidden shadow-sm">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-gradient-to-r from-slate-50 to-slate-100 border-b border-slate-200">
                        <th className="px-4 py-3.5 text-left font-semibold text-slate-700">Lifting No</th>
                        <th className="px-4 py-3.5 text-left font-semibold text-slate-700">Factory / Supplier</th>
                        <th className="px-4 py-3.5 text-left font-semibold text-slate-700">Coupon</th>
                        <th className="px-4 py-3.5 text-left font-semibold text-slate-700">Driver & Truck</th>
                        <th className="px-4 py-3.5 text-right font-semibold text-slate-700">Factory Wt (Tons)</th>
                        <th className="px-4 py-3.5 text-right font-semibold text-slate-700">Site Wt (Tons)</th>
                        <th className="px-4 py-3.5 text-right font-semibold text-slate-700">Shortage (Tons)</th>
                        <th className="px-4 py-3.5 text-left font-semibold text-slate-700">Date</th>
                        <th className="px-4 py-3.5 text-left font-semibold text-slate-700">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(data.cementLiftings || (data.cementLifting ? [data.cementLifting] : [])).map((lifting: any, index: number) => {
                        const factoryWeight = Number(lifting.factoryWeight || 0);
                        const siteWeight = lifting.buyerWeighbridgeQty != null ? 
                          (Number(lifting.buyerWeighbridgeQty) > 1000 ? 
                            Number(lifting.buyerWeighbridgeQty) / 100 : 
                            Number(lifting.buyerWeighbridgeQty)) : 0;
                        const shortage = lifting.shortageQty != null ? 
                          (Number(lifting.shortageQty) > 1000 ? 
                            Number(lifting.shortageQty) / 100 : 
                            Number(lifting.shortageQty)) : 0;
                        const hasShortage = shortage > 0;

                        return (
                          <tr key={lifting.id} className={`border-b border-slate-100 hover:bg-slate-50/50 transition-colors ${index % 2 === 0 ? 'bg-white' : 'bg-slate-25'}`}>
                            <td className="px-4 py-4">
                              <button
                                onClick={() => router.push(`/dashboard/cement/liftings/${lifting.id}`)}
                                className="text-blue-600 hover:text-blue-800 hover:underline font-mono font-semibold transition-colors"
                              >
                                {lifting.liftingNo}
                              </button>
                            </td>
                            <td className="px-4 py-4">
                              <div className="flex flex-col">
                                <span className="font-medium text-slate-900">
                                  {lifting.factory?.name || lifting.purchase?.factory?.name || 'Unknown Factory'}
                                </span>
                                {lifting.purchase?.cementType && (
                                  <span className="text-xs text-slate-500 mt-0.5">
                                    Type: {lifting.purchase.cementType}
                                  </span>
                                )}
                              </div>
                            </td>
                            <td className="px-4 py-4">
                              {lifting.coupon?.couponNo || (lifting as any).couponNo ? (
                                <div className="flex flex-col">
                                  <span className="font-mono text-xs font-semibold text-slate-700 bg-slate-100 px-2 py-1 rounded w-fit">
                                    {lifting.coupon?.couponNo || (lifting as any).couponNo}
                                  </span>
                                  {lifting.coupon?.tonnage && (
                                    <span className="text-xs text-slate-500 mt-1">
                                      {lifting.coupon.tonnage} tons
                                    </span>
                                  )}
                                </div>
                              ) : (
                                <span className="text-slate-400 text-sm">No Coupon</span>
                              )}
                            </td>
                            <td className="px-4 py-4">
                              <div className="flex flex-col">
                                <span className="font-medium text-slate-900">
                                  {lifting.driverName || lifting.truck?.driverName || 'Self Transport'}
                                </span>
                                {(lifting.truckPlateNo || lifting.truck?.plateNo) && (
                                  <span className="text-xs text-slate-500 font-mono mt-0.5 bg-slate-100 px-1.5 py-0.5 rounded w-fit">
                                    {lifting.truckPlateNo || lifting.truck?.plateNo}
                                  </span>
                                )}
                                {!lifting.driverName && !lifting.truck?.driverName && (
                                  <span className="text-xs text-blue-600 font-medium">SELF-TRANSPORT</span>
                                )}
                              </div>
                            </td>
                            <td className="px-4 py-4 text-right">
                              <div className="flex flex-col items-end">
                                <span className="text-slate-900 font-bold text-base">
                                  {factoryWeight.toFixed(2)}
                                </span>
                                <span className="text-xs text-slate-500">tons</span>
                              </div>
                            </td>
                            <td className="px-4 py-4 text-right">
                              <div className="flex flex-col items-end">
                                {siteWeight > 0 ? (
                                  <>
                                    <span className="text-slate-900 font-semibold text-base">
                                      {siteWeight.toFixed(2)}
                                    </span>
                                    <span className="text-xs text-slate-500">tons</span>
                                  </>
                                ) : (
                                  <span className="text-slate-400 text-sm">Not weighed</span>
                                )}
                              </div>
                            </td>
                            <td className="px-4 py-4 text-right">
                              <div className="flex flex-col items-end">
                                {hasShortage ? (
                                  <>
                                    <span className="text-orange-600 font-bold text-base">
                                      {shortage.toFixed(2)}
                                    </span>
                                    <span className="text-xs text-orange-500">shortage</span>
                                  </>
                                ) : (
                                  <div className="flex items-center gap-1">
                                    <span className="text-green-600 font-semibold">0.00</span>
                                    <div className="w-2 h-2 rounded-full bg-green-400"></div>
                                  </div>
                                )}
                              </div>
                            </td>
                            <td className="px-4 py-4">
                              <div className="flex flex-col">
                                <span className="text-slate-900 font-medium">
                                  {lifting.liftingDate ? formatDate(lifting.liftingDate) : 'No Date'}
                                </span>
                                <span className="text-xs text-slate-500">
                                  {lifting.liftingDate ? new Date(lifting.liftingDate).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }) : ''}
                                </span>
                              </div>
                            </td>
                            <td className="px-4 py-4">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-300">
                                  Invoiced
                                </span>
                                {lifting.status && lifting.status !== 'Invoiced' && (
                                  <span className="text-[11px] text-slate-500">({lifting.status})</span>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                    <tfoot>
                      <tr className="bg-gradient-to-r from-slate-100 to-slate-50 border-t-2 border-slate-300 font-semibold">
                        <td className="px-4 py-4 text-slate-900 font-bold" colSpan={4}>
                          <div className="flex items-center gap-2">
                            <span>Total Cement Quantity</span>
                            <div className="flex-1 h-px bg-slate-300"></div>
                          </div>
                        </td>
                        <td className="px-4 py-4 text-right">
                          <div className="flex flex-col items-end">
                            <span className="text-slate-900 font-bold text-lg">
                              {(data.cementLiftings || (data.cementLifting ? [data.cementLifting] : []))
                                .reduce((sum: number, l: any) => sum + (Number(l.factoryWeight) || 0), 0)
                                .toFixed(2)}
                            </span>
                            <span className="text-xs text-slate-600 font-medium">Factory Weight</span>
                          </div>
                        </td>
                        <td className="px-4 py-4 text-right">
                          <div className="flex flex-col items-end">
                            <span className="text-slate-900 font-bold text-lg">
                              {(data.cementLiftings || (data.cementLifting ? [data.cementLifting] : []))
                                .reduce((sum: number, l: any) => {
                                  const rawBw = Number(l.buyerWeighbridgeQty) || 0;
                                  return sum + (rawBw > 1000 ? rawBw / 100 : rawBw);
                                }, 0)
                                .toFixed(2)}
                            </span>
                            <span className="text-xs text-slate-600 font-medium">Site Weight</span>
                          </div>
                        </td>
                        <td className="px-4 py-4 text-right">
                          <div className="flex flex-col items-end">
                            <span className="text-orange-600 font-bold text-lg">
                              {(data.cementLiftings || (data.cementLifting ? [data.cementLifting] : []))
                                .reduce((sum: number, l: any) => {
                                  const rawSq = Number(l.shortageQty) || 0;
                                  return sum + (rawSq > 1000 ? rawSq / 100 : rawSq);
                                }, 0)
                                .toFixed(2)}
                            </span>
                            <span className="text-xs text-orange-600 font-medium">Total Shortage</span>
                          </div>
                        </td>
                        <td className="px-4 py-4" colSpan={2}>
                          <div className="text-right text-xs text-slate-500">
                            All weights in tons
                          </div>
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>
              
              {/* Summary Cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-3 h-3 rounded-full bg-blue-500"></div>
                    <span className="text-sm font-semibold text-blue-800">Factory Weighbridge</span>
                  </div>
                  <div className="text-2xl font-bold text-blue-900">
                    {(data.cementLiftings || (data.cementLifting ? [data.cementLifting] : []))
                      .reduce((sum: number, l: any) => sum + (Number(l.factoryWeight) || 0), 0)
                      .toFixed(2)} tons
                  </div>
                  <div className="text-xs text-blue-700 mt-1">Total loaded at factory</div>
                </div>
                
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-3 h-3 rounded-full bg-green-500"></div>
                    <span className="text-sm font-semibold text-green-800">Site Weighbridge</span>
                  </div>
                  <div className="text-2xl font-bold text-green-900">
                    {(data.cementLiftings || (data.cementLifting ? [data.cementLifting] : []))
                      .reduce((sum: number, l: any) => {
                        const rawBw = Number(l.buyerWeighbridgeQty) || 0;
                        return sum + (rawBw > 1000 ? rawBw / 100 : rawBw);
                      }, 0)
                      .toFixed(2)} tons
                  </div>
                  <div className="text-xs text-green-700 mt-1">Total delivered to site</div>
                </div>
                
                <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-3 h-3 rounded-full bg-orange-500"></div>
                    <span className="text-sm font-semibold text-orange-800">Total Shortage</span>
                  </div>
                  <div className="text-2xl font-bold text-orange-900">
                    {(data.cementLiftings || (data.cementLifting ? [data.cementLifting] : []))
                      .reduce((sum: number, l: any) => {
                        const rawSq = Number(l.shortageQty) || 0;
                        return sum + (rawSq > 1000 ? rawSq / 100 : rawSq);
                      }, 0)
                      .toFixed(2)} tons
                  </div>
                  <div className="text-xs text-orange-700 mt-1">Weight difference</div>
                </div>
              </div>
            </div>
          )}

          {/* Related Aggregate Dispatches */}
          {data.dispatches && data.dispatches.length > 0 && (
            <div className="border-t border-slate-200 pt-8">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-lg font-semibold text-slate-900">Associated Aggregate Dispatches</h3>
                  <p className="text-sm text-slate-600 mt-0.5">
                    Quarry dispatch tickets, transporter freight fees, delivered volumes, and shortage deductions
                  </p>
                </div>
                <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800">
                  {data.dispatches.length} Dispatch(es)
                </span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-slate-100 border-b border-slate-300">
                      <th className="px-3 py-2 text-left font-semibold text-slate-900">Dispatch No</th>
                      <th className="px-3 py-2 text-left font-semibold text-slate-900">Supplier / Quarry</th>
                      <th className="px-3 py-2 text-left font-semibold text-slate-900">Transporter & Driver</th>
                      <th className="px-3 py-2 text-right font-semibold text-slate-900">Loaded (m³)</th>
                      <th className="px-3 py-2 text-right font-semibold text-slate-900">Delivered (m³)</th>
                      <th className="px-3 py-2 text-right font-semibold text-slate-900">Shortage (m³)</th>
                      <th className="px-3 py-2 text-right font-semibold text-slate-900">Transport Rate</th>
                      <th className="px-3 py-2 text-right font-semibold text-slate-900">Gross Fee</th>
                      <th className="px-3 py-2 text-right font-semibold text-slate-900">Deduction</th>
                      <th className="px-3 py-2 text-right font-semibold text-slate-900">Net Payment</th>
                      <th className="px-3 py-2 text-left font-semibold text-slate-900">Date</th>
                      <th className="px-3 py-2 text-left font-semibold text-slate-900">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.dispatches.map((dispatch: any) => (
                      <tr key={dispatch.id} className="border-b border-slate-200 hover:bg-slate-50">
                        <td className="px-3 py-3 text-blue-600 font-medium">
                          <button
                            onClick={() => router.push(`/dashboard/aggregate/${dispatch.id}`)}
                            className="hover:underline font-mono"
                          >
                            {dispatch.dispatchNo}
                          </button>
                        </td>
                        <td className="px-3 py-3 text-slate-900">
                          {dispatch.supplier?.companyName || dispatch.supplier?.name || '—'}
                        </td>
                        <td className="px-3 py-3 text-slate-900">
                          <div>
                            <span className="font-medium">
                              {dispatch.driverName || dispatch.transporter?.driverName || dispatch.truck?.driverName || '—'}
                            </span>
                            {(dispatch.truck?.plateNo || dispatch.transporter?.companyName) && (
                              <span className="block text-xs text-slate-500 font-mono">
                                {dispatch.truck?.plateNo ? `[${dispatch.truck.plateNo}] ` : ''}
                                {dispatch.transporter?.companyName || ''}
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-3 py-3 text-right text-slate-900 font-semibold">{dispatch.loadedVolume?.toFixed(2) || '-'}</td>
                        <td className="px-3 py-3 text-right text-slate-900 font-bold">{dispatch.deliveredVolume?.toFixed(2) || '-'}</td>
                        <td className="px-3 py-3 text-right text-orange-600">{dispatch.shortageVolume?.toFixed(2) || '0.00'}</td>
                        <td className="px-3 py-3 text-right text-slate-700 font-mono">{dispatch.transportRate ? formatCurrency(dispatch.transportRate) : '—'}</td>
                        <td className="px-3 py-3 text-right text-slate-900 font-mono">{dispatch.grossTruckFee ? formatCurrency(dispatch.grossTruckFee) : '-'}</td>
                        <td className="px-3 py-3 text-right text-red-600 font-mono">
                          {dispatch.shortageDeduction ? `-${formatCurrency(dispatch.shortageDeduction)}` : '0.00'}
                        </td>
                        <td className="px-3 py-3 text-right text-green-600 font-medium font-mono">
                          {dispatch.netTruckPayment ? formatCurrency(dispatch.netTruckPayment) : '-'}
                        </td>
                        <td className="px-3 py-3 text-slate-900">{dispatch.dispatchDate ? formatDate(dispatch.dispatchDate) : '-'}</td>
                        <td className="px-3 py-3">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-300">
                              Invoiced
                            </span>
                            {dispatch.status && dispatch.status !== 'Invoiced' && (
                              <span className="text-[11px] text-slate-500">({dispatch.status})</span>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="bg-slate-50 font-bold border-t border-slate-300">
                      <td className="px-3 py-3 text-slate-900" colSpan={3}>
                        Aggregate Totals
                      </td>
                      <td className="px-3 py-3 text-right text-slate-900">
                        {data.dispatches.reduce((sum: number, d: any) => sum + (d.loadedVolume || 0), 0).toFixed(2)} m³
                      </td>
                      <td className="px-3 py-3 text-right text-slate-900">
                        {data.dispatches.reduce((sum: number, d: any) => sum + (d.deliveredVolume || 0), 0).toFixed(2)} m³
                      </td>
                      <td className="px-3 py-3 text-right text-orange-600">
                        {data.dispatches.reduce((sum: number, d: any) => sum + (d.shortageVolume || 0), 0).toFixed(2)} m³
                      </td>
                      <td className="px-3 py-3 text-right text-slate-500">—</td>
                      <td className="px-3 py-3 text-right text-slate-900 font-mono">
                        {formatCurrency(data.dispatches.reduce((sum: number, d: any) => sum + (d.grossTruckFee || 0), 0))}
                      </td>
                      <td className="px-3 py-3 text-right text-red-600 font-mono">
                        -{formatCurrency(data.dispatches.reduce((sum: number, d: any) => sum + (d.shortageDeduction || 0), 0))}
                      </td>
                      <td className="px-3 py-3 text-right text-green-600 font-mono">
                        {formatCurrency(data.dispatches.reduce((sum: number, d: any) => sum + (d.netTruckPayment || 0), 0))}
                      </td>
                      <td className="px-3 py-3" colSpan={2}></td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          )}

          {/* Related Deliveries (General / Construction) */}
          {data.deliveries && data.deliveries.length > 0 && (
            <div className="border-t border-slate-200 pt-8">
              <h3 className="text-lg font-semibold text-slate-900 mb-4">Related Deliveries</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-slate-100 border-b border-slate-300">
                      <th className="px-4 py-2 text-left font-semibold text-slate-900">Delivery No</th>
                      <th className="px-4 py-2 text-left font-semibold text-slate-900">Driver</th>
                      <th className="px-4 py-2 text-left font-semibold text-slate-900">Truck</th>
                      <th className="px-4 py-2 text-left font-semibold text-slate-900">Delivered To</th>
                      <th className="px-4 py-2 text-left font-semibold text-slate-900">Date</th>
                      <th className="px-4 py-2 text-left font-semibold text-slate-900">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.deliveries.map((del: any) => (
                      <tr key={del.id} className="border-b border-slate-200 hover:bg-slate-50">
                        <td className="px-4 py-3 text-blue-600 font-medium font-mono">{del.deliveryNo}</td>
                        <td className="px-4 py-3 text-slate-900">{del.driverName || '-'}</td>
                        <td className="px-4 py-3 text-slate-900">{del.truckPlateNo || '-'}</td>
                        <td className="px-4 py-3 text-slate-900">{del.deliveredTo || '-'}</td>
                        <td className="px-4 py-3 text-slate-900">{del.deliveryDate ? formatDate(del.deliveryDate) : '-'}</td>
                        <td className="px-4 py-3"><Badge status={del.status}>{del.status}</Badge></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </CardBody>
      </Card>
    </div>
  );
}
