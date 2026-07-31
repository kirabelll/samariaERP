'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { Card, CardHeader, CardBody, Button, Badge } from '@/components/ui';

interface AgreementItem {
  type: 'regular' | 'service';
  itemId?: string;
  itemName?: string;
  itemCode?: string;
  qty?: number;
  unit?: string;
  unitPrice?: number;
  amount?: number;
  description?: string;
}

interface SupplierAgreementData {
  id: string;
  agreementNo: string;
  supplierId: string;
  supplier?: {
    name: string;
    code: string;
  };
  division: string;
  items: string;
  totalAmount: number;
  validFrom: string;
  validTo: string;
  terms?: string;
  status: string;
}

const APPROVAL_ROLES = ['FINANCE', 'MANAGER', 'ADMIN'];

export default function SupplierAgreementDetailPage() {
  const router = useRouter();
  const params = useParams();
  const { data: session } = useSession();
  const userRole = (session?.user as any)?.role || '';
  const userName = (session?.user as any)?.name || (session?.user as any)?.firstName || '';
  const canApprove = APPROVAL_ROLES.includes(userRole);
  const recordId = params?.id as string;

  const [data, setData] = useState<SupplierAgreementData | null>(null);
  const [parsedItems, setParsedItems] = useState<AgreementItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updatingStatus, setUpdatingStatus] = useState(false);

  const fetchData = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/supplier-agreements/${recordId}`);
      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Failed to fetch record');
      }

      setData(result.data);

      if (result.data.items) {
        try {
          const items =
            typeof result.data.items === 'string'
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

  useEffect(() => {
    if (recordId) {
      fetchData();
    }
  }, [recordId]);

  const handleStatusChange = async (newStatus: string) => {
    const actionLabel = newStatus === 'Active' ? 'activate' : newStatus === 'Rejected' ? 'reject' : `change the status to "${newStatus}"`;
    if (!confirm(`Are you sure you want to ${actionLabel} this agreement?`)) return;

    setUpdatingStatus(true);
    try {
      const res = await fetch(`/api/supplier-agreements/${recordId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: newStatus,
          activatedByRole: userRole,
          activatedByName: userName,
        }),
      });
      const result = await res.json();
      if (result.success) {
        setData((prev) => (prev ? { ...prev, status: newStatus } : prev));
      } else {
        alert(result.error || 'Failed to update status');
      }
    } catch {
      alert('Failed to update status');
    } finally {
      setUpdatingStatus(false);
    }
  };

  const handleEdit = () => {
    router.push(`/dashboard/supplier-agreements/${recordId}/edit`);
  };

  const handleBack = () => {
    router.push(`/dashboard/supplier-agreements`);
  };

  const getBadgeStatus = (status?: string) => {
    switch (status) {
      case 'Active':
        return 'Active';
      case 'Draft':
        return 'Draft';
      case 'Rejected':
        return 'Rejected';
      case 'Expired':
        return 'Rejected';
      case 'Cancelled':
        return 'Rejected';
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

  const formatCurrency = (value?: number) => {
    if (value === undefined || value === null) return 'N/A';
    return value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
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
          Supplier Agreements
        </button>
        <span>/</span>
        <span className="text-slate-900 font-medium">{data.agreementNo}</span>
      </div>

      {/* Page Header */}
      <div>
        <h1 className="text-3xl font-bold text-slate-900">{data.agreementNo}</h1>
        <p className="text-slate-600 mt-1">Supplier Agreement Details</p>
      </div>

      {/* Details Card */}
      <Card>
        <CardHeader className="flex items-center justify-between">
          <h2 className="text-2xl font-bold text-slate-900">Agreement Information</h2>
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
          {/* Agreement Info */}
          <div>
            <h3 className="text-lg font-semibold text-slate-900 mb-4">Agreement Info</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                  Agreement Number
                </label>
                <p className="text-lg font-medium text-slate-900 mt-1">{data.agreementNo}</p>
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                  Division
                </label>
                <p className="text-lg font-medium text-slate-900 mt-1">{data.division || 'N/A'}</p>
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                  Valid From
                </label>
                <p className="text-lg font-medium text-slate-900 mt-1">
                  {formatDate(data.validFrom)}
                </p>
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                  Valid To
                </label>
                <p className="text-lg font-medium text-slate-900 mt-1">
                  {formatDate(data.validTo)}
                </p>
              </div>
              <div className="bg-blue-100 p-4 rounded-lg">
                <label className="text-xs font-semibold text-slate-700 uppercase tracking-wide">
                  Total Amount
                </label>
                <p className="text-xl font-bold text-blue-900 mt-1">
                  {formatCurrency(data.totalAmount)} ETB
                </p>
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                  Status
                </label>
                <div className="mt-1">
                  <Badge status={getBadgeStatus(data.status)}>{data.status || 'N/A'}</Badge>
                </div>
              </div>
              {data.terms && (
                <div className="md:col-span-2">
                  <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                    Terms
                  </label>
                  <p className="text-lg font-medium text-slate-900 mt-1">{data.terms}</p>
                </div>
              )}
            </div>
          </div>

          {/* Status Progression */}
          <div>
            <h3 className="text-lg font-semibold text-slate-900 mb-4">Approval Workflow</h3>
            <div className="flex items-center gap-2 mb-6">
              {['Draft', 'Active'].map((step, idx) => {
                const isCurrentOrPast =
                  step === 'Draft' ||
                  (step === 'Active' && data.status === 'Active');
                const isCurrent = step === data.status;
                const isRejected = data.status === 'Rejected' && step === 'Draft';
                return (
                  <React.Fragment key={step}>
                    {idx > 0 && (
                      <div className={`flex-1 h-1 rounded ${isCurrentOrPast ? 'bg-green-500' : data.status === 'Rejected' ? 'bg-red-300' : 'bg-slate-200'}`} />
                    )}
                    <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium ${
                      isCurrent ? 'bg-blue-100 text-blue-800 ring-2 ring-blue-400' :
                      isRejected ? 'bg-red-100 text-red-800 ring-2 ring-red-400' :
                      isCurrentOrPast ? 'bg-green-100 text-green-800' :
                      'bg-slate-100 text-slate-500'
                    }`}>
                      {isCurrentOrPast && step !== data.status && <span>&#10003;</span>}
                      {step}
                    </div>
                  </React.Fragment>
                );
              })}
              {data.status === 'Rejected' && (
                <>
                  <div className="flex-1 h-1 rounded bg-red-300" />
                  <div className="flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium bg-red-100 text-red-800 ring-2 ring-red-400">
                    Rejected
                  </div>
                </>
              )}
            </div>

            {/* Role-based info message */}
            {data.status === 'Draft' && !canApprove && (
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mb-4 text-sm text-amber-800">
                This agreement is pending approval by Finance, Manager, or Admin.
              </div>
            )}
            {data.status === 'Rejected' && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4 text-sm text-red-800">
                This agreement has been rejected. It can be revised and resubmitted.
              </div>
            )}
          </div>

          {/* Status Actions */}
          <div>
            <h3 className="text-lg font-semibold text-slate-900 mb-4">Actions</h3>
            <div className="flex flex-wrap gap-3">
              {data.status === 'Draft' && canApprove && (
                <>
                  <Button
                    variant="primary"
                    size="md"
                    onClick={() => handleStatusChange('Active')}
                    isLoading={updatingStatus}
                  >
                    Activate Agreement
                  </Button>
                  <Button
                    variant="outline"
                    size="md"
                    onClick={() => handleStatusChange('Rejected')}
                    isLoading={updatingStatus}
                    className="text-red-600 border-red-300 hover:bg-red-50"
                  >
                    Reject Agreement
                  </Button>
                </>
              )}
              {data.status === 'Draft' && (
                <Button
                  variant="outline"
                  size="md"
                  onClick={() => handleStatusChange('Cancelled')}
                  isLoading={updatingStatus}
                >
                  Cancel Agreement
                </Button>
              )}
              {data.status === 'Active' && (
                <>
                  <Button
                    variant="outline"
                    size="md"
                    onClick={() => handleStatusChange('Expired')}
                    isLoading={updatingStatus}
                  >
                    Mark as Expired
                  </Button>
                  <Button
                    variant="outline"
                    size="md"
                    onClick={() => handleStatusChange('Cancelled')}
                    isLoading={updatingStatus}
                  >
                    Cancel Agreement
                  </Button>
                </>
              )}
              {(data.status === 'Expired' || data.status === 'Cancelled') && canApprove && (
                <Button
                  variant="primary"
                  size="md"
                  onClick={() => handleStatusChange('Active')}
                  isLoading={updatingStatus}
                >
                  Reactivate Agreement
                </Button>
              )}
            </div>
          </div>

          {/* Supplier Section */}
          <div>
            <h3 className="text-lg font-semibold text-slate-900 mb-4">Supplier</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                  Supplier
                </label>
                <p className="text-lg font-medium text-slate-900 mt-1">
                  {data.supplier?.companyName || 'N/A'}
                </p>
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                  Supplier Code
                </label>
                <p className="text-lg font-medium text-slate-900 mt-1">
                  {data.supplier?.code || 'N/A'}
                </p>
              </div>
            </div>
          </div>

          {/* Sites Section */}
          {((data as any).loadingSite || (data as any).offloadingSite) && (
            <div>
              <h3 className="text-lg font-semibold text-slate-900 mb-4">Sites</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <label className="text-xs font-semibold text-green-700 uppercase tracking-wide">
                    Loading Site (Origin)
                  </label>
                  <p className="text-lg font-medium text-slate-900 mt-1">
                    {(data as any).loadingSite || 'Not specified'}
                  </p>
                </div>
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <label className="text-xs font-semibold text-blue-700 uppercase tracking-wide">
                    Offloading Site (Destination)
                  </label>
                  <p className="text-lg font-medium text-slate-900 mt-1">
                    {(data as any).offloadingSite || 'Not specified'}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Items Section */}
          {parsedItems.length > 0 && (
            <div>
              <h3 className="text-lg font-semibold text-slate-900 mb-4">Agreement Items & Services</h3>
              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="bg-slate-100">
                      <th className="border border-slate-200 px-4 py-2 text-left text-sm font-semibold text-slate-900">
                        Type
                      </th>
                      <th className="border border-slate-200 px-4 py-2 text-left text-sm font-semibold text-slate-900">
                        Item / Description
                      </th>
                      <th className="border border-slate-200 px-4 py-2 text-left text-sm font-semibold text-slate-900">
                        Qty
                      </th>
                      <th className="border border-slate-200 px-4 py-2 text-left text-sm font-semibold text-slate-900">
                        Unit
                      </th>
                      <th className="border border-slate-200 px-4 py-2 text-right text-sm font-semibold text-slate-900">
                        Unit Price / Amount
                      </th>
                      <th className="border border-slate-200 px-4 py-2 text-right text-sm font-semibold text-slate-900">
                        Total
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {parsedItems.map((item, index) => (
                      <tr key={index} className="hover:bg-slate-50">
                        <td className="border border-slate-200 px-4 py-2 text-slate-900 text-sm">
                          {item.type === 'regular' ? 'Item' : 'Service'}
                        </td>
                        <td className="border border-slate-200 px-4 py-2 text-slate-900">
                          {item.type === 'regular'
                            ? item.itemName || item.itemId || '-'
                            : item.description || '-'}
                        </td>
                        <td className="border border-slate-200 px-4 py-2 text-slate-900">
                          {item.type === 'regular' ? item.qty || '-' : '-'}
                        </td>
                        <td className="border border-slate-200 px-4 py-2 text-slate-900">
                          {item.type === 'regular' ? item.unit || '-' : '-'}
                        </td>
                        <td className="border border-slate-200 px-4 py-2 text-right text-slate-900">
                          {item.type === 'regular'
                            ? formatCurrency(item.unitPrice)
                            : formatCurrency(item.amount)}
                        </td>
                        <td className="border border-slate-200 px-4 py-2 text-right text-slate-900 font-medium">
                          {formatCurrency(item.amount)}
                        </td>
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
