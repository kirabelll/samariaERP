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

  const handleEdit = () => {
    router.push(`/dashboard/sales/invoices/${recordId}/edit`);
  };

  const handleRecordPayment = () => {
    if (data?.customerId && recordId) {
      router.push(`/dashboard/sales/payments/new?invoiceId=${recordId}&customerId=${data.customerId}`);
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
              <h3 className="text-lg font-semibold text-slate-900 mb-4">Invoice Items</h3>
              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="bg-slate-100 border-b border-slate-300">
                      <th className="px-4 py-2 text-left text-sm font-semibold text-slate-900">Item Name</th>
                      <th className="px-4 py-2 text-right text-sm font-semibold text-slate-900">Quantity</th>
                      <th className="px-4 py-2 text-right text-sm font-semibold text-slate-900">Unit</th>
                      <th className="px-4 py-2 text-right text-sm font-semibold text-slate-900">Unit Price</th>
                      <th className="px-4 py-2 text-right text-sm font-semibold text-slate-900">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(() => {
                      try {
                        const items = typeof data.items === 'string' ? JSON.parse(data.items) : data.items;
                        if (!Array.isArray(items)) return null;
                        return items.map((item: any, idx: number) => (
                          <tr key={idx} className="border-b border-slate-200 hover:bg-slate-50">
                            <td className="px-4 py-3 text-slate-900">{item.name || item.itemName || item.itemId || 'Unknown'}</td>
                            <td className="px-4 py-3 text-right text-slate-900">{item.qty || item.quantity || '-'}</td>
                            <td className="px-4 py-3 text-right text-slate-900">{item.unit || '-'}</td>
                            <td className="px-4 py-3 text-right text-slate-900">{item.unitPrice ? formatCurrency(Number(item.unitPrice)) : '-'}</td>
                            <td className="px-4 py-3 text-right text-slate-900 font-medium">
                              {item.total ? formatCurrency(Number(item.total)) : (item.qty && item.unitPrice ? formatCurrency(item.qty * item.unitPrice) : '-')}
                            </td>
                          </tr>
                        ));
                      } catch {
                        return <tr><td colSpan={5} className="px-4 py-3 text-slate-600">Unable to parse items</td></tr>;
                      }
                    })()}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Related Deliveries */}
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
                        <td className="px-4 py-3 text-blue-600 font-medium">{del.deliveryNo}</td>
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

          {/* Related Aggregate Dispatches */}
          {data.dispatches && data.dispatches.length > 0 && (
            <div className="border-t border-slate-200 pt-8">
              <h3 className="text-lg font-semibold text-slate-900 mb-4">Related Aggregate Dispatches</h3>
              <p className="text-sm text-slate-600 mb-3">
                Dispatches for this customer — showing delivery volumes and financial details
              </p>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-slate-100 border-b border-slate-300">
                      <th className="px-3 py-2 text-left font-semibold text-slate-900">Dispatch No</th>
                      <th className="px-3 py-2 text-right font-semibold text-slate-900">Loaded (m³)</th>
                      <th className="px-3 py-2 text-right font-semibold text-slate-900">Delivered (m³)</th>
                      <th className="px-3 py-2 text-right font-semibold text-slate-900">Shortage (m³)</th>
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
                            className="hover:underline"
                          >
                            {dispatch.dispatchNo}
                          </button>
                        </td>
                        <td className="px-3 py-3 text-right text-slate-900">{dispatch.loadedVolume?.toFixed(2) || '-'}</td>
                        <td className="px-3 py-3 text-right text-slate-900">{dispatch.deliveredVolume?.toFixed(2) || '-'}</td>
                        <td className="px-3 py-3 text-right text-orange-600">{dispatch.shortageVolume?.toFixed(2) || '0'}</td>
                        <td className="px-3 py-3 text-right text-slate-900">{dispatch.grossTruckFee ? formatCurrency(dispatch.grossTruckFee) : '-'}</td>
                        <td className="px-3 py-3 text-right text-red-600">
                          {dispatch.shortageDeduction ? `-${formatCurrency(dispatch.shortageDeduction)}` : '0'}
                        </td>
                        <td className="px-3 py-3 text-right text-green-600 font-medium">
                          {dispatch.netTruckPayment ? formatCurrency(dispatch.netTruckPayment) : '-'}
                        </td>
                        <td className="px-3 py-3 text-slate-900">{dispatch.dispatchDate ? formatDate(dispatch.dispatchDate) : '-'}</td>
                        <td className="px-3 py-3"><Badge status={dispatch.status}>{dispatch.status}</Badge></td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="bg-slate-50 font-medium">
                      <td className="px-3 py-3 text-slate-900">Totals</td>
                      <td className="px-3 py-3 text-right text-slate-900">
                        {data.dispatches.reduce((sum: number, d: any) => sum + (d.loadedVolume || 0), 0).toFixed(2)}
                      </td>
                      <td className="px-3 py-3 text-right text-slate-900">
                        {data.dispatches.reduce((sum: number, d: any) => sum + (d.deliveredVolume || 0), 0).toFixed(2)}
                      </td>
                      <td className="px-3 py-3 text-right text-orange-600">
                        {data.dispatches.reduce((sum: number, d: any) => sum + (d.shortageVolume || 0), 0).toFixed(2)}
                      </td>
                      <td className="px-3 py-3 text-right text-slate-900">
                        {formatCurrency(data.dispatches.reduce((sum: number, d: any) => sum + (d.grossTruckFee || 0), 0))}
                      </td>
                      <td className="px-3 py-3 text-right text-red-600">
                        -{formatCurrency(data.dispatches.reduce((sum: number, d: any) => sum + (d.shortageDeduction || 0), 0))}
                      </td>
                      <td className="px-3 py-3 text-right text-green-600">
                        {formatCurrency(data.dispatches.reduce((sum: number, d: any) => sum + (d.netTruckPayment || 0), 0))}
                      </td>
                      <td className="px-3 py-3" colSpan={2}></td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          )}
        </CardBody>
      </Card>
    </div>
  );
}
