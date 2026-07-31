'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { Card, CardHeader, CardBody, Button, Badge } from '@/components/ui';

const statusColors: Record<string, string> = {
  Draft: 'bg-gray-100 text-gray-700',
  Pending_Approval: 'bg-yellow-100 text-yellow-800',
  Approved: 'bg-green-100 text-green-800',
  Rejected: 'bg-red-100 text-red-800',
  Cancelled: 'bg-gray-200 text-gray-500',
  Completed: 'bg-blue-100 text-blue-800',
};

export default function PurchaseOrderDetailPage() {
  const router = useRouter();
  const params = useParams();
  const { data: session } = useSession();
  const userId = (session?.user as any)?.id || '';
  const recordId = params?.id as string;

  const [data, setData] = useState<any>(null);
  const [approvals, setApprovals] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchData = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/purchasing/orders/${recordId}`);
      const result = await response.json();
      if (!response.ok || !result.success) throw new Error(result.error || 'Failed to fetch');
      setData(result.data);
      setApprovals(Array.isArray(result.approvals) ? result.approvals : []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (recordId) fetchData();
  }, [recordId]);

  const handleSubmitForApproval = async () => {
    if (!confirm('Submit this Purchase Order for approval?')) return;
    setActionLoading(true);
    try {
      const res = await fetch(`/api/purchasing/orders/${recordId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'Pending_Approval', submittedBy: userId }),
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error || 'Failed to submit');
      alert('Submitted for approval! Relevant approvers have been notified.');
      fetchData();
    } catch (err: any) {
      alert(err.message || 'Failed to submit for approval');
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="space-y-6 p-6">
        <button onClick={() => router.push('/dashboard/purchasing/orders')} className="text-blue-600 font-medium">
          ← Back to Purchase Orders
        </button>
        <Card><CardBody><p className="text-red-600">{error || 'Record not found'}</p></CardBody></Card>
      </div>
    );
  }

  let items: any[] = [];
  try {
    const parsed = typeof data.items === 'string' ? JSON.parse(data.items) : data.items;
    items = Array.isArray(parsed) ? parsed : [];
  } catch { items = []; }

  return (
    <div className="space-y-6 p-6" style={{ background: '#F5F5F7' }}>
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm" style={{ color: '#666' }}>
        <button onClick={() => router.push('/dashboard/purchasing/orders')} className="font-medium" style={{ color: '#007AFF' }}>
          Purchase Orders
        </button>
        <span>/</span>
        <span className="font-medium" style={{ color: '#1D1D1F' }}>{data.poNo}</span>
      </div>

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold" style={{ color: '#1D1D1F' }}>{data.poNo}</h1>
          <p className="text-sm mt-1" style={{ color: '#666' }}>
            {data.supplier?.companyName || 'Unknown Supplier'}
          </p>
        </div>
        <div className="flex gap-3">
          {data.status === 'Draft' && (
            <Button
              onClick={handleSubmitForApproval}
              disabled={actionLoading}
              style={{ background: '#007AFF', color: 'white' }}
              className="rounded-2xl px-6"
            >
              {actionLoading ? 'Submitting...' : 'Submit for Approval'}
            </Button>
          )}
          {data.status === 'Draft' && (
            <Button variant="outline" className="rounded-2xl" onClick={() => router.push(`/dashboard/purchasing/orders/${recordId}/edit`)}>
              Edit
            </Button>
          )}
          <Button variant="outline" className="rounded-2xl" onClick={() => router.push('/dashboard/purchasing/orders')}>
            Back
          </Button>
        </div>
      </div>

      {/* Details */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Info */}
        <div className="lg:col-span-2 space-y-6">
          <Card className="rounded-2xl">
            <CardBody className="p-6">
              <h3 className="text-lg font-bold mb-4" style={{ color: '#1D1D1F' }}>Order Details</h3>
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <label className="text-xs font-semibold uppercase" style={{ color: '#999' }}>PO Number</label>
                  <p className="text-lg font-medium mt-1" style={{ color: '#1D1D1F' }}>{data.poNo}</p>
                </div>
                <div>
                  <label className="text-xs font-semibold uppercase" style={{ color: '#999' }}>Supplier</label>
                  <p className="text-lg font-medium mt-1" style={{ color: '#1D1D1F' }}>{data.supplier?.companyName || data.supplierId}</p>
                </div>
                <div>
                  <label className="text-xs font-semibold uppercase" style={{ color: '#999' }}>Total Amount</label>
                  <p className="text-lg font-bold mt-1" style={{ color: '#1D1D1F' }}>
                    {Number(data.totalAmount || 0).toLocaleString('en-US')} ETB
                  </p>
                </div>
                <div>
                  <label className="text-xs font-semibold uppercase" style={{ color: '#999' }}>Status</label>
                  <div className="mt-2">
                    <span className={`px-3 py-1 rounded-full text-sm font-medium ${statusColors[data.status] || 'bg-gray-100'}`}>
                      {data.status?.replace(/_/g, ' ')}
                    </span>
                  </div>
                </div>
                <div>
                  <label className="text-xs font-semibold uppercase" style={{ color: '#999' }}>Request Type</label>
                  <p className="text-base font-medium mt-1" style={{ color: '#1D1D1F' }}>{data.requestType || 'N/A'}</p>
                </div>
                <div>
                  <label className="text-xs font-semibold uppercase" style={{ color: '#999' }}>Created</label>
                  <p className="text-base font-medium mt-1" style={{ color: '#1D1D1F' }}>
                    {data.createdAt ? new Date(data.createdAt).toLocaleDateString() : 'N/A'}
                  </p>
                </div>
              </div>
            </CardBody>
          </Card>

          {/* Items */}
          {items.length > 0 && (
            <Card className="rounded-2xl">
              <CardBody className="p-6">
                <h3 className="text-lg font-bold mb-4" style={{ color: '#1D1D1F' }}>Items</h3>
                <table className="w-full text-sm">
                  <thead>
                    <tr style={{ background: '#F5F5F7', borderBottom: '1px solid #E5E5EA' }}>
                      <th className="px-4 py-2 text-left font-semibold">Item</th>
                      <th className="px-4 py-2 text-right font-semibold">Qty</th>
                      <th className="px-4 py-2 text-right font-semibold">Unit Price</th>
                      <th className="px-4 py-2 text-right font-semibold">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((item: any, idx: number) => (
                      <tr key={idx} className="border-b" style={{ borderColor: '#E5E5EA' }}>
                        <td className="px-4 py-2">{item.name || item.itemName || item.description || `Item ${idx + 1}`}</td>
                        <td className="px-4 py-2 text-right">{item.quantity || item.qty || '-'}</td>
                        <td className="px-4 py-2 text-right">{Number(item.unitPrice || item.price || 0).toLocaleString('en-US')}</td>
                        <td className="px-4 py-2 text-right font-medium">
                          {Number((item.quantity || item.qty || 0) * (item.unitPrice || item.price || 0)).toLocaleString('en-US')}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </CardBody>
            </Card>
          )}
        </div>

        {/* Sidebar: Approval Status */}
        <div className="space-y-6">
          <Card className="rounded-2xl">
            <CardBody className="p-6">
              <h3 className="text-lg font-bold mb-4" style={{ color: '#1D1D1F' }}>Approval Status</h3>
              {approvals.length === 0 ? (
                <div className="text-center py-4">
                  <p className="text-sm" style={{ color: '#999' }}>
                    {data.status === 'Draft' ? 'Not yet submitted for approval' : 'No approval history'}
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {approvals.map((a: any, idx: number) => (
                    <div key={idx} className="flex items-start gap-3">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${
                        a.status === 'APPROVED' ? 'bg-green-500 text-white'
                        : a.status === 'REJECTED' ? 'bg-red-500 text-white'
                        : a.status === 'PENDING' ? 'bg-yellow-400 text-yellow-900'
                        : 'bg-gray-200 text-gray-500'
                      }`}>
                        {a.status === 'APPROVED' ? '✓' : a.status === 'REJECTED' ? '✗' : a.level}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold" style={{ color: '#1D1D1F' }}>
                          Level {a.level}: {a.notes?.split('—')[0]?.trim() || `Level ${a.level}`}
                        </p>
                        <p className="text-xs" style={{ color: '#666' }}>
                          {a.status === 'APPROVED' && a.approver
                            ? `Approved by ${a.approver.firstName} ${a.approver.lastName}`
                            : a.status === 'REJECTED' && a.approver
                            ? `Rejected by ${a.approver.firstName} ${a.approver.lastName}`
                            : a.status === 'PENDING'
                            ? 'Awaiting approval...'
                            : a.status}
                        </p>
                        {a.resolvedAt && (
                          <p className="text-xs" style={{ color: '#999' }}>
                            {new Date(a.resolvedAt).toLocaleDateString()}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardBody>
          </Card>

          {/* Status Guide */}
          <Card className="rounded-2xl">
            <CardBody className="p-6">
              <h3 className="text-sm font-bold mb-3" style={{ color: '#1D1D1F' }}>Workflow</h3>
              <div className="space-y-2 text-xs" style={{ color: '#666' }}>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-gray-300"></div> Draft
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-yellow-400"></div> Pending Approval
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-green-500"></div> Approved
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-blue-500"></div> Completed
                </div>
              </div>
            </CardBody>
          </Card>
        </div>
      </div>
    </div>
  );
}
