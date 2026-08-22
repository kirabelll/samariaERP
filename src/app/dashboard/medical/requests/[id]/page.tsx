'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { Card, CardHeader, CardBody, Button, Badge } from '@/components/ui';

interface MedicalRequestItem {
  itemId: string;
  itemName?: string;
  drugName?: string;
  itemCode?: string;
  genericName?: string;
  strength?: string;
  unit?: string;
  qty: number;
  batchPref?: string;
  notes?: string;
}

interface MedicalRequestData {
  requestNo: string;
  customerId: string;
  customer?: {
    companyName: string;
    code: string;
  };
  items: string | MedicalRequestItem[];
  parsedItems?: MedicalRequestItem[];
  priority: string;
  status: string;
  requestDate: string;
  notes?: string;
}

const fieldLabels: Record<string, string> = {
  requestNo: 'Request Number',
  customerId: 'Supplier / Partner ID',
  companyName: 'Supplier',
  items: 'Requested Items',
  priority: 'Priority',
  status: 'Status',
  requestDate: 'Request Date',
  notes: 'Notes',
};

export default function MedicalRequestDetailPage() {
  const router = useRouter();
  const params = useParams();
  const recordId = params?.id as string;

  const [data, setData] = useState<MedicalRequestData | null>(null);
  const [parsedItems, setParsedItems] = useState<MedicalRequestItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const response = await fetch(`/api/medical/requests/${recordId}`);
        const result = await response.json();

        if (!response.ok || !result.success) {
          throw new Error(result.error || 'Failed to fetch record');
        }

        setData(result.data);

        if (result.data.parsedItems && Array.isArray(result.data.parsedItems)) {
          setParsedItems(result.data.parsedItems);
        } else if (result.data.items) {
          try {
            const items = typeof result.data.items === 'string' 
              ? JSON.parse(result.data.items) 
              : result.data.items;
            setParsedItems(Array.isArray(items) ? items : []);
          } catch {
            setParsedItems([]);
          }
        }
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
    router.push(`/dashboard/medical/requests/${recordId}/edit`);
  };

  const handleBack = () => {
    router.push(`/dashboard/medical/requests`);
  };

  const getPriorityStatus = (priority?: string) => {
    switch (priority) {
      case 'Urgent':
        return 'Rejected';
      case 'High':
        return 'InProgress';
      case 'Normal':
        return 'Pending';
      case 'Low':
        return 'Draft';
      default:
        return 'Draft';
    }
  };

  const getRequestStatus = (status?: string) => {
    switch (status) {
      case 'Submitted':
        return 'Pending';
      case 'Quoted':
        return 'InProgress';
      case 'Approved':
        return 'Approved';
      case 'Dispatched':
        return 'InProgress';
      case 'Delivered':
        return 'Approved';
      case 'Cancelled':
        return 'Cancelled';
      default:
        return 'Draft';
    }
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
          Medical Requests
        </button>
        <span>/</span>
        <span className="text-slate-900 font-medium">{data.requestNo}</span>
      </div>

      {/* Page Header */}
      <div>
        <h1 className="text-3xl font-bold text-slate-900">{data.requestNo}</h1>
        <p className="text-slate-600 mt-1">Medical Request Details</p>
      </div>

      {/* Details Card */}
      <Card>
        <CardHeader className="flex items-center justify-between">
          <h2 className="text-2xl font-bold text-slate-900">Request Information</h2>
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
          {/* Request Information Section */}
          <div>
            <h3 className="text-lg font-semibold text-slate-900 mb-4">Request Info</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                  {fieldLabels.requestNo}
                </label>
                <p className="text-lg font-medium text-slate-900 mt-1">{data.requestNo}</p>
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                  {fieldLabels.priority}
                </label>
                <div className="mt-1">
                  <Badge status={getPriorityStatus(data.priority)}>
                    {data.priority || 'N/A'}
                  </Badge>
                </div>
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                  {fieldLabels.status}
                </label>
                <div className="mt-1">
                  <Badge status={getRequestStatus(data.status)}>
                    {data.status || 'N/A'}
                  </Badge>
                </div>
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                  {fieldLabels.requestDate}
                </label>
                <p className="text-lg font-medium text-slate-900 mt-1">{formatDate(data.requestDate)}</p>
              </div>
              {data.notes && (
                <div className="md:col-span-2">
                  <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                    {fieldLabels.notes}
                  </label>
                  <p className="text-lg font-medium text-slate-900 mt-1">{data.notes}</p>
                </div>
              )}
            </div>
          </div>

          {/* Supplier Section */}
          <div>
            <h3 className="text-lg font-semibold text-slate-900 mb-4">Supplier</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                  {fieldLabels.companyName}
                </label>
                <p className="text-lg font-medium text-slate-900 mt-1">
                  {data.customer?.companyName || 'N/A'}
                </p>
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                  Supplier Code
                </label>
                <p className="text-lg font-medium text-slate-900 mt-1">
                  {data.customer?.code || 'N/A'}
                </p>
              </div>
            </div>
          </div>

          {/* Items Section */}
          {parsedItems.length > 0 && (
            <div>
              <h3 className="text-lg font-semibold text-slate-900 mb-4">Requested Items</h3>
              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="bg-slate-100">
                      <th className="border border-slate-200 px-4 py-2 text-left text-sm font-semibold text-slate-900">Item Name</th>
                      <th className="border border-slate-200 px-4 py-2 text-left text-sm font-semibold text-slate-900">Quantity</th>
                      <th className="border border-slate-200 px-4 py-2 text-left text-sm font-semibold text-slate-900">Batch Preference</th>
                      <th className="border border-slate-200 px-4 py-2 text-left text-sm font-semibold text-slate-900">Notes</th>
                    </tr>
                  </thead>
                  <tbody>
                    {parsedItems.map((item, index) => {
                      const itemName = item.itemName || item.drugName || item.itemId || 'N/A';
                      const subDetails = [
                        item.itemCode && `Code: ${item.itemCode}`,
                        item.genericName,
                        item.strength,
                      ].filter(Boolean).join(' • ');

                      return (
                        <tr key={index} className="hover:bg-slate-50">
                          <td className="border border-slate-200 px-4 py-2 text-slate-900">
                            <div className="font-medium text-slate-900">{itemName}</div>
                            {subDetails && (
                              <div className="text-xs text-slate-500 mt-0.5">{subDetails}</div>
                            )}
                          </td>
                          <td className="border border-slate-200 px-4 py-2 text-slate-900">
                            {item.qty} {item.unit || ''}
                          </td>
                          <td className="border border-slate-200 px-4 py-2 text-slate-900">{item.batchPref || 'N/A'}</td>
                          <td className="border border-slate-200 px-4 py-2 text-slate-900">{item.notes || 'N/A'}</td>
                        </tr>
                      );
                    })}
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
