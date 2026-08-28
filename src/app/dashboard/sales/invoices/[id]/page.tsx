'use client';

import React, { useState, useEffect } from 'react';
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

  const handleEdit = () => {
    router.push(`/dashboard/sales/invoices/${recordId}/edit`);
  };

  const handleRecordPayment = () => {
    if (data?.customerId && recordId) {
      router.push(`/dashboard/sales/payments/new?invoiceId=${recordId}&customerId=${data.customerId}`);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm(`Are you sure you want to delete invoice ${data?.invoiceNo}? This action cannot be undone.`)) {
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
      router.push('/dashboard/sales/invoices');
    } catch (err: any) {
      alert(err.message || 'Failed to delete invoice');
    } finally {
      setDeleting(false);
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
          </div>
          <div className="flex gap-3">
            {data.status !== 'Paid' && data.status !== 'Cancelled' && (
              <Button variant="primary" size="lg" onClick={handleRecordPayment}>
                Record Payment
              </Button>
            )}
            <Button variant="outline" size="lg" onClick={handleEdit}>
              Edit
            </Button>
            <Button
              variant="outline"
              size="lg"
              onClick={handleDelete}
              isLoading={deleting}
              className="border-red-300 text-red-600 hover:bg-red-50 hover:border-red-400 font-semibold"
            >
              Delete
            </Button>
            <Button variant="outline" size="lg" onClick={handleBack}>
              Back
            </Button>
          </div>
        </CardHeader>

        <CardBody className="space-y-8">
          {/* Invoice Information */}
          <div>
            <h3 className="text-lg font-semibold text-slate-900 mb-4">Invoice Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <div>
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Invoice No</label>
                <p className="text-lg font-medium text-slate-900 mt-1">{data.invoiceNo}</p>
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

          {/* Invoice Items */}
          {data.items && (
            <div className="border-t border-slate-200 pt-8">
              <h3 className="text-lg font-semibold text-slate-900 mb-4">Invoice Line Items</h3>
              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="bg-slate-100 border-b border-slate-300">
                      <th className="px-4 py-2.5 text-left text-sm font-semibold text-slate-900">#</th>
                      <th className="px-4 py-2.5 text-left text-sm font-semibold text-slate-900">Item Description</th>
                      <th className="px-4 py-2.5 text-right text-sm font-semibold text-slate-900">Quantity</th>
                      <th className="px-4 py-2.5 text-right text-sm font-semibold text-slate-900">Unit</th>
                      <th className="px-4 py-2.5 text-right text-sm font-semibold text-slate-900">Unit Price (ETB)</th>
                      <th className="px-4 py-2.5 text-right text-sm font-semibold text-slate-900">Line Total (ETB)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(() => {
                      try {
                        const items = typeof data.items === 'string' ? JSON.parse(data.items) : data.items;
                        if (!Array.isArray(items) || items.length === 0) {
                          return (
                            <tr>
                              <td colSpan={6} className="px-4 py-4 text-center text-slate-400">
                                No line items found.
                              </td>
                            </tr>
                          );
                        }
                        return items.map((item: any, idx: number) => {
                          const itemName = item.name || item.itemName || item.item || item.itemId || `Item ${idx + 1}`;
                          const qty = Number(item.qty || item.quantity || 0);
                          const unit = item.unit || (data.division === 'CEMENT' ? 'tons' : data.division === 'AGGREGATE' ? 'm³' : 'pcs');
                          const unitPrice = Number(item.unitPrice || item.price || 0);
                          const total = item.total != null ? Number(item.total) : qty * unitPrice;

                          return (
                            <tr key={idx} className="border-b border-slate-200 hover:bg-slate-50">
                              <td className="px-4 py-3 text-slate-400 font-mono text-xs">{idx + 1}</td>
                              <td className="px-4 py-3 font-medium text-slate-900">
                                <div>
                                  <span>{itemName}</span>
                                  {item.batchNo && (
                                    <span className="ml-2 px-2 py-0.5 bg-purple-50 text-purple-700 text-xs font-semibold rounded border border-purple-200">
                                      Batch: {item.batchNo}
                                    </span>
                                  )}
                                  {item.expiryDate && (
                                    <span className="ml-2 text-xs text-slate-500">
                                      (Exp: {new Date(item.expiryDate).toLocaleDateString()})
                                    </span>
                                  )}
                                  {item.dispatchNo && (
                                    <span className="ml-2 text-xs text-blue-600 font-medium">
                                      [Dispatch: {item.dispatchNo}]
                                    </span>
                                  )}
                                  {item.liftingNo && (
                                    <span className="ml-2 text-xs text-purple-600 font-medium">
                                      [Lifting: {item.liftingNo}]
                                    </span>
                                  )}
                                </div>
                              </td>
                              <td className="px-4 py-3 text-right text-slate-900 font-semibold">
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
                        });
                      } catch {
                        return (
                          <tr>
                            <td colSpan={6} className="px-4 py-3 text-slate-600">
                              Unable to parse items
                            </td>
                          </tr>
                        );
                      }
                    })()}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Related Cement Liftings */}
          {((data.cementLiftings && data.cementLiftings.length > 0) || data.cementLifting) && (
            <div className="border-t border-slate-200 pt-8">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-lg font-semibold text-slate-900">Associated Cement Liftings</h3>
                  <p className="text-sm text-slate-600 mt-0.5">
                    Weighbridge tickets, quantities, factory sources, and driver details for this invoice
                  </p>
                </div>
                <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-100 text-blue-800">
                  {(data.cementLiftings || (data.cementLifting ? [data.cementLifting] : [])).length} Ticket(s)
                </span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-slate-100 border-b border-slate-300">
                      <th className="px-3 py-2 text-left font-semibold text-slate-900">Lifting No</th>
                      <th className="px-3 py-2 text-left font-semibold text-slate-900">Factory / Supplier</th>
                      <th className="px-3 py-2 text-left font-semibold text-slate-900">Coupon</th>
                      <th className="px-3 py-2 text-left font-semibold text-slate-900">Driver & Truck</th>
                      <th className="px-3 py-2 text-right font-semibold text-slate-900">Factory Wt (Tons)</th>
                      <th className="px-3 py-2 text-right font-semibold text-slate-900">Site Wt (Tons)</th>
                      <th className="px-3 py-2 text-right font-semibold text-slate-900">Shortage (Tons)</th>
                      <th className="px-3 py-2 text-left font-semibold text-slate-900">Date</th>
                      <th className="px-3 py-2 text-left font-semibold text-slate-900">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(data.cementLiftings || (data.cementLifting ? [data.cementLifting] : [])).map((lifting: any) => (
                      <tr key={lifting.id} className="border-b border-slate-200 hover:bg-slate-50">
                        <td className="px-3 py-3 font-medium">
                          <button
                            onClick={() => router.push(`/dashboard/cement/liftings/${lifting.id}`)}
                            className="text-blue-600 hover:underline font-mono"
                          >
                            {lifting.liftingNo}
                          </button>
                        </td>
                        <td className="px-3 py-3 text-slate-900">
                          {lifting.factory?.name || lifting.purchase?.factory?.name || '—'}
                        </td>
                        <td className="px-3 py-3 text-slate-700 font-mono text-xs">
                          {lifting.coupon?.couponNo || (lifting as any).couponNo || '—'}
                        </td>
                        <td className="px-3 py-3 text-slate-900">
                          <div>
                            <span className="font-medium">{lifting.driverName || lifting.truck?.driverName || '—'}</span>
                            {(lifting.truckPlateNo || lifting.truck?.plateNo) && (
                              <span className="block text-xs text-slate-500 font-mono">
                                {lifting.truckPlateNo || lifting.truck?.plateNo}
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-3 py-3 text-right text-slate-900 font-bold">
                          {Number(lifting.factoryWeight || 0).toFixed(2)}
                        </td>
                        <td className="px-3 py-3 text-right text-slate-900">
                          {lifting.buyerWeighbridgeQty != null ? Number(lifting.buyerWeighbridgeQty).toFixed(2) : '—'}
                        </td>
                        <td className="px-3 py-3 text-right text-orange-600 font-semibold">
                          {lifting.shortageQty != null ? Number(lifting.shortageQty).toFixed(2) : '0.00'}
                        </td>
                        <td className="px-3 py-3 text-slate-900">
                          {lifting.liftingDate ? formatDate(lifting.liftingDate) : '—'}
                        </td>
                        <td className="px-3 py-3">
                          <Badge status={lifting.status}>{lifting.status}</Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="bg-slate-50 font-bold border-t border-slate-300">
                      <td className="px-3 py-3 text-slate-900" colSpan={4}>
                        Total Cement Quantity
                      </td>
                      <td className="px-3 py-3 text-right text-slate-900">
                        {(data.cementLiftings || (data.cementLifting ? [data.cementLifting] : []))
                          .reduce((sum: number, l: any) => sum + (Number(l.factoryWeight) || 0), 0)
                          .toFixed(2)}{' '}
                        Tons
                      </td>
                      <td className="px-3 py-3 text-right text-slate-900">
                        {(data.cementLiftings || (data.cementLifting ? [data.cementLifting] : []))
                          .reduce((sum: number, l: any) => sum + (Number(l.buyerWeighbridgeQty) || 0), 0)
                          .toFixed(2)}{' '}
                        Tons
                      </td>
                      <td className="px-3 py-3 text-right text-orange-600">
                        {(data.cementLiftings || (data.cementLifting ? [data.cementLifting] : []))
                          .reduce((sum: number, l: any) => sum + (Number(l.shortageQty) || 0), 0)
                          .toFixed(2)}{' '}
                        Tons
                      </td>
                      <td className="px-3 py-3" colSpan={2}></td>
                    </tr>
                  </tfoot>
                </table>
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
                        <td className="px-3 py-3"><Badge status={dispatch.status}>{dispatch.status}</Badge></td>
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
