'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import {
  Package,
  ArrowLeft,
  Building2,
  Calendar,
  DollarSign,
  FileText,
  User,
  CheckCircle,
  Truck,
} from 'lucide-react';
import { Card, CardHeader, CardBody, Button, Badge } from '@/components/ui';

export default function GoodsReceiveDetailPage() {
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
        const response = await fetch(`/api/purchasing/grv/${recordId}`);
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

  const handleBack = () => {
    router.push(`/dashboard/purchasing/grv`);
  };

  const handleDelete = async (permanent: boolean = false) => {
    const isInactive = data?.status === 'Inactive' || data?.status === 'Cancelled';
    const isPermanent = permanent || isInactive;
    const confirmPrompt = isPermanent
      ? `Are you sure you want to PERMANENTLY delete GRV "${data?.grvNo}" from the database?\n\nThis will reverse the inventory stock balances and CANNOT be undone.`
      : `Are you sure you want to deactivate/delete GRV "${data?.grvNo}"?\n\nThis will reverse the added inventory stock balances.`;

    if (!window.confirm(confirmPrompt)) {
      return;
    }

    setDeleting(true);
    try {
      const url = isPermanent ? `/api/purchasing/grv/${recordId}?permanent=true` : `/api/purchasing/grv/${recordId}`;
      const res = await fetch(url, { method: 'DELETE' });
      const result = await res.json();
      if (!res.ok || !result.success) {
        throw new Error(result.error || 'Failed to delete GRV');
      }
      alert(result.message || (result.permanent ? 'GRV permanently purged from database.' : 'GRV marked as Inactive.'));
      router.push('/dashboard/purchasing/grv');
    } catch (err: any) {
      alert(err.message || 'Failed to delete GRV');
    } finally {
      setDeleting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="text-slate-600 text-sm">Loading Goods Received Voucher...</p>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="space-y-6 max-w-5xl mx-auto">
        <button
          onClick={handleBack}
          className="text-blue-600 hover:text-blue-800 font-medium text-sm flex items-center gap-1.5"
        >
          <ArrowLeft className="w-4 h-4" /> Back to GRV List
        </button>
        <Card>
          <CardBody className="p-6">
            <p className="text-red-600 font-medium">{error || 'Record not found'}</p>
          </CardBody>
        </Card>
      </div>
    );
  }

  // Parse items safely
  let itemsList: any[] = [];
  try {
    itemsList = typeof data.items === 'string' ? JSON.parse(data.items) : (data.items || []);
  } catch (e) {
    itemsList = [];
  }

  const supplierName = data.supplier?.companyName || data.purchaseOrder?.supplier?.companyName || 'N/A';
  const totalQty = itemsList.reduce((sum, item) => sum + Number(item.receivedQty || item.quantity || item.qty || 0), 0);

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-16">
      {/* Header Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs text-slate-500 mb-1">
            <Link href="/dashboard/purchasing/grv" className="hover:text-blue-600">
              Purchasing
            </Link>
            <span>/</span>
            <Link href="/dashboard/purchasing/grv" className="hover:text-blue-600">
              Goods Received Vouchers
            </Link>
            <span>/</span>
            <span className="text-slate-900 font-semibold">{data.grvNo}</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <FileText className="w-6 h-6 text-blue-600" />
            {data.grvNo}
          </h1>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleBack} icon={<ArrowLeft className="w-4 h-4" />}>
            Back
          </Button>
          <Badge status={data.status === 'Received' ? 'Confirmed' : (data.status as any)}>
            {data.status}
          </Badge>
          {data.status === 'Inactive' || data.status === 'Cancelled' ? (
            <Button
              variant="danger"
              size="sm"
              isLoading={deleting}
              onClick={() => handleDelete(true)}
            >
              Delete Permanently
            </Button>
          ) : (
            <>
              <Button
                variant="outline"
                size="sm"
                className="border-red-200 text-red-600 hover:bg-red-50 hover:border-red-300"
                isLoading={deleting}
                onClick={() => handleDelete(false)}
              >
                Deactivate GRV
              </Button>
              <Button
                variant="danger"
                size="sm"
                isLoading={deleting}
                onClick={() => handleDelete(true)}
              >
                Delete Permanently
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-white border border-gray-200">
          <CardBody className="p-4 flex items-center gap-3">
            <div className="p-2.5 bg-blue-50 text-blue-600 rounded-xl">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs text-gray-500 font-medium">Supplier</p>
              <p className="text-sm font-bold text-gray-900 truncate max-w-[180px]">{supplierName}</p>
            </div>
          </CardBody>
        </Card>

        <Card className="bg-white border border-gray-200">
          <CardBody className="p-4 flex items-center gap-3">
            <div className="p-2.5 bg-emerald-50 text-emerald-600 rounded-xl">
              <DollarSign className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs text-gray-500 font-medium">Total Amount</p>
              <p className="text-sm font-bold text-gray-900">
                ETB {Number(data.totalAmount || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </p>
            </div>
          </CardBody>
        </Card>

        <Card className="bg-white border border-gray-200">
          <CardBody className="p-4 flex items-center gap-3">
            <div className="p-2.5 bg-amber-50 text-amber-600 rounded-xl">
              <Package className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs text-gray-500 font-medium">Total Received Units</p>
              <p className="text-sm font-bold text-gray-900">{totalQty.toLocaleString()} units</p>
            </div>
          </CardBody>
        </Card>

        <Card className="bg-white border border-gray-200">
          <CardBody className="p-4 flex items-center gap-3">
            <div className="p-2.5 bg-purple-50 text-purple-600 rounded-xl">
              <Calendar className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs text-gray-500 font-medium">Received Date</p>
              <p className="text-sm font-bold text-gray-900">
                {data.receivedDate ? new Date(data.receivedDate).toLocaleDateString() : 'N/A'}
              </p>
            </div>
          </CardBody>
        </Card>
      </div>

      {/* Details Meta */}
      <Card className="bg-white border border-gray-200 shadow-xs">
        <CardHeader className="border-b border-gray-100 bg-gray-50/50 pb-3">
          <h2 className="text-sm font-semibold text-gray-900 uppercase tracking-wider">Voucher Details</h2>
        </CardHeader>
        <CardBody className="p-4 sm:p-6 grid grid-cols-1 md:grid-cols-3 gap-5 text-sm">
          <div>
            <span className="text-xs text-gray-500 uppercase tracking-wider font-semibold block">GRV Number</span>
            <span className="font-mono font-bold text-gray-900">{data.grvNo}</span>
          </div>
          <div>
            <span className="text-xs text-gray-500 uppercase tracking-wider font-semibold block">Purchase Order Ref</span>
            <span className="font-medium text-gray-900">{data.purchaseOrder?.poNo || 'Direct / None'}</span>
          </div>
          <div>
            <span className="text-xs text-gray-500 uppercase tracking-wider font-semibold block">Received By</span>
            <span className="font-medium text-gray-900">{data.receivedBy || 'Store Officer'}</span>
          </div>
        </CardBody>
      </Card>

      {/* Items Table */}
      <Card className="bg-white border border-gray-200 shadow-xs overflow-hidden">
        <CardHeader className="border-b border-gray-100 bg-gray-50/50 pb-3">
          <h2 className="text-sm font-semibold text-gray-900 uppercase tracking-wider">
            Received Line Items ({itemsList.length})
          </h2>
        </CardHeader>
        <CardBody className="p-0">
          {itemsList.length === 0 ? (
            <div className="p-8 text-center text-xs text-gray-500">No items recorded in this voucher.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-gray-50 border-b border-gray-200 text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  <tr>
                    <th className="px-4 py-3 w-10 text-center">#</th>
                    <th className="px-4 py-3 min-w-[200px]">Item Description</th>
                    <th className="px-4 py-3 min-w-[120px]">Ordered Qty</th>
                    <th className="px-4 py-3 min-w-[120px]">Received Qty</th>
                    <th className="px-4 py-3 min-w-[130px]">Unit Cost (ETB)</th>
                    <th className="px-4 py-3 min-w-[140px]">Batch Number</th>
                    <th className="px-4 py-3 min-w-[120px]">Condition</th>
                    <th className="px-4 py-3 min-w-[130px] text-right">Subtotal (ETB)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {itemsList.map((item, idx) => {
                    const recQty = Number(item.receivedQty !== undefined ? item.receivedQty : (item.quantity !== undefined ? item.quantity : (item.qty || 0)));
                    const ordQty = Number(item.orderedQty || recQty);
                    const cost = Number(item.costPrice || item.unitPrice || item.unitCost || 0);
                    const subtotal = recQty * cost;

                    return (
                      <tr key={idx} className="hover:bg-gray-50/50">
                        <td className="px-4 py-3 text-center font-mono text-xs text-gray-400">{idx + 1}</td>
                        <td className="px-4 py-3">
                          <div className="font-semibold text-gray-900 text-xs">{item.name || item.item || item.itemName || 'Item'}</div>
                          {item.code && (
                            <span className="text-[10px] font-mono text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded">
                              {item.code}
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 font-mono text-xs">{ordQty.toLocaleString()}</td>
                        <td className="px-4 py-3 font-mono text-xs font-bold text-blue-600">
                          {recQty.toLocaleString()} {item.unit || ''}
                        </td>
                        <td className="px-4 py-3 font-mono text-xs">
                          ETB {cost.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                        </td>
                        <td className="px-4 py-3 font-mono text-xs">
                          {item.batchNo || '-'}
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={`text-[11px] px-2 py-0.5 rounded-full font-semibold ${
                              item.condition === 'Damaged' || item.condition === 'Defective'
                                ? 'bg-red-100 text-red-700'
                                : 'bg-emerald-100 text-emerald-800'
                            }`}
                          >
                            {item.condition || 'Good'}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right font-mono font-semibold text-gray-900 text-xs">
                          ETB {subtotal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardBody>
      </Card>
    </div>
  );
}
