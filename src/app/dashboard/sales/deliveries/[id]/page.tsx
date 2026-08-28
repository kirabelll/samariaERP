'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { Card, CardHeader, CardBody, Button, Badge } from '@/components/ui';

export default function DeliveryDetailPage() {
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
        const response = await fetch(`/api/sales/deliveries/${recordId}`);
        const result = await response.json();

        if (!response.ok || !result.success) {
          throw new Error(result.error || 'Failed to fetch delivery record');
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

  const handleBack = () => {
    router.push(`/dashboard/sales/deliveries`);
  };

  const handleDelete = async () => {
    if (!window.confirm(`Are you sure you want to delete delivery ${data?.deliveryNo}? This will also restore the inventory items to stock.`)) {
      return;
    }
    setDeleting(true);
    try {
      const response = await fetch(`/api/sales/deliveries/${recordId}`, {
        method: 'DELETE',
      });
      const result = await response.json();
      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Failed to delete delivery');
      }
      alert('Delivery deleted and stock restored successfully.');
      router.push('/dashboard/sales/deliveries');
    } catch (err: any) {
      alert(err.message || 'Failed to delete delivery');
    } finally {
      setDeleting(false);
    }
  };

  const parsedItems = React.useMemo(() => {
    if (!data?.items) return [];
    try {
      if (typeof data.items === 'string') {
        return JSON.parse(data.items);
      }
      if (Array.isArray(data.items)) return data.items;
      return [];
    } catch {
      return [];
    }
  }, [data?.items]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600 mx-auto"></div>
          <p className="text-slate-600 text-sm">Loading delivery details...</p>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="space-y-6 max-w-5xl mx-auto p-4">
        <button onClick={handleBack} className="text-blue-600 hover:text-blue-800 font-medium text-sm">
          ← Back to Deliveries
        </button>
        <Card>
          <CardBody>
            <p className="text-red-600">{error || 'Record not found'}</p>
          </CardBody>
        </Card>
      </div>
    );
  }

  const isMedical = data.division === 'MEDICAL';

  return (
    <div className="space-y-6 max-w-6xl mx-auto p-4 sm:p-6">
      {/* Header & Navigation */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs text-slate-500 mb-1">
            <Link href="/dashboard/sales/deliveries" className="hover:underline">
              Deliveries
            </Link>
            <span>/</span>
            <span className="text-slate-800 font-medium">{data.deliveryNo || 'Details'}</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 flex items-center gap-3">
            <span>Delivery: {data.deliveryNo}</span>
            <Badge status={(data.status || 'Pending') as any}>{data.status || 'Pending'}</Badge>
          </h1>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="md"
            onClick={handleDelete}
            isLoading={deleting}
            className="border-red-300 text-red-600 hover:bg-red-50 hover:border-red-400 font-semibold"
          >
            Delete Delivery
          </Button>
          <Button variant="outline" size="md" onClick={handleBack}>
            ← Back
          </Button>
        </div>
      </div>

      {/* Overview Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardBody className="space-y-3">
            <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Customer Information</span>
            <div>
              <p className="text-lg font-bold text-gray-900">
                {data.customer?.companyName || data.customer?.name || data.customerId || '—'}
              </p>
              {data.customer?.phone && (
                <p className="text-xs text-gray-500 mt-0.5">📞 {data.customer.phone}</p>
              )}
              {data.customer?.tin && (
                <p className="text-xs text-gray-500 mt-0.5">TIN: {data.customer.tin}</p>
              )}
            </div>
          </CardBody>
        </Card>

        <Card>
          <CardBody className="space-y-3">
            <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Dispatch & Transport</span>
            <div className="space-y-1">
              <p className="text-sm font-medium text-gray-900">
                <span className="text-gray-500">Driver:</span> {data.driverName || (isMedical ? 'Direct Release / Store Issue' : 'Self-Transport')}
              </p>
              <p className="text-sm font-medium text-gray-900">
                <span className="text-gray-500">Truck / Plate:</span> {data.truckPlateNo || 'N/A'}
              </p>
              <p className="text-xs text-gray-500">
                Division: <span className="font-semibold text-gray-700">{data.division}</span>
              </p>
            </div>
          </CardBody>
        </Card>

        <Card>
          <CardBody className="space-y-3">
            <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Order & Schedule</span>
            <div className="space-y-1">
              <p className="text-sm font-medium text-gray-900">
                <span className="text-gray-500">Date:</span> {data.deliveryDate ? new Date(data.deliveryDate).toLocaleDateString() : '—'}
              </p>
              {data.salesOrder ? (
                <p className="text-sm font-medium text-blue-600">
                  <span className="text-gray-500">Sales Order:</span>{' '}
                  <Link href={`/dashboard/sales/orders/${data.salesOrder.id}`} className="hover:underline">
                    {data.salesOrder.orderNo}
                  </Link>
                </p>
              ) : (
                <p className="text-sm text-gray-500">Direct Delivery (No SO)</p>
              )}
            </div>
          </CardBody>
        </Card>
      </div>

      {/* Dispatched Line Items Table */}
      <Card>
        <CardHeader>
          <h2 className="text-lg font-semibold text-gray-900">Dispatched Line Items ({parsedItems.length})</h2>
        </CardHeader>
        <CardBody className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200 text-xs font-semibold text-gray-600 uppercase tracking-wider text-left">
                  <th className="py-3 px-4">#</th>
                  <th className="py-3 px-4">Item Name / Description</th>
                  {isMedical && (
                    <>
                      <th className="py-3 px-4">Batch Number</th>
                      <th className="py-3 px-4">Expiry Date</th>
                    </>
                  )}
                  <th className="py-3 px-4">Quantity</th>
                  <th className="py-3 px-4">Unit</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-sm">
                {parsedItems.length > 0 ? (
                  parsedItems.map((item: any, idx: number) => (
                    <tr key={idx} className="hover:bg-gray-50/50">
                      <td className="py-3 px-4 text-gray-400 font-mono">{idx + 1}</td>
                      <td className="py-3 px-4 font-medium text-gray-900">{item.itemName || item.name || 'Item'}</td>
                      {isMedical && (
                        <>
                          <td className="py-3 px-4 font-mono text-xs">
                            {item.batchNo ? (
                              <span className="px-2 py-0.5 bg-purple-50 text-purple-700 font-semibold rounded border border-purple-200">
                                {item.batchNo}
                              </span>
                            ) : (
                              <span className="text-gray-400">—</span>
                            )}
                          </td>
                          <td className="py-3 px-4 text-xs">
                            {item.expiryDate ? (
                              <span className={new Date(item.expiryDate) < new Date() ? 'text-red-600 font-bold' : 'text-gray-700'}>
                                {new Date(item.expiryDate).toLocaleDateString()}
                              </span>
                            ) : (
                              <span className="text-gray-400">—</span>
                            )}
                          </td>
                        </>
                      )}
                      <td className="py-3 px-4 font-bold text-gray-900">
                        {Number(item.qty || item.quantity || 0).toLocaleString('en-US')}
                      </td>
                      <td className="py-3 px-4 text-gray-600">{item.unit || 'pcs'}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={isMedical ? 6 : 4} className="py-8 text-center text-gray-400">
                      No line items recorded.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardBody>
      </Card>
    </div>
  );
}
