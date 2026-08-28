'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { Card, CardHeader, CardBody, Button, Badge } from '@/components/ui';

const statusColors: Record<string, string> = {
  Pending: 'bg-yellow-100 text-yellow-800',
  Pending_Approval: 'bg-orange-100 text-orange-800',
  Approved: 'bg-green-100 text-green-800',
  Confirmed: 'bg-green-100 text-green-800',
  InProgress: 'bg-blue-100 text-blue-800',
  Delivered: 'bg-indigo-100 text-indigo-800',
  Cancelled: 'bg-gray-200 text-gray-500',
  Rejected: 'bg-red-100 text-red-800',
};

export default function SalesOrderDetailPage() {
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
      const response = await fetch(`/api/sales/orders/${recordId}`);
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
    if (!confirm('Submit this Sales Order for approval?')) return;
    setActionLoading(true);
    try {
      const res = await fetch(`/api/sales/orders/${recordId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'Pending_Approval', submittedBy: userId }),
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error || 'Failed to submit');
      alert('Submitted for approval! Relevant approvers have been notified via Telegram.');
      fetchData();
    } catch (err: any) {
      alert(err.message || 'Failed to submit');
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
        <button onClick={() => router.push('/dashboard/sales/orders')} className="text-blue-600 font-medium">
          ← Back to Sales Orders
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
        <button onClick={() => router.push('/dashboard/sales/orders')} className="font-medium" style={{ color: '#007AFF' }}>
          Sales Orders
        </button>
        <span>/</span>
        <span className="font-medium" style={{ color: '#1D1D1F' }}>{data.orderNo}</span>
      </div>

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold" style={{ color: '#1D1D1F' }}>{data.orderNo}</h1>
          <p className="text-sm mt-1" style={{ color: '#666' }}>
            {data.customer?.companyName || `${data.customer?.firstName || ''} ${data.customer?.lastName || ''}`.trim() || 'Unknown Customer'}
            {data.division && <span className="ml-2 px-2 py-0.5 rounded-full text-xs bg-blue-50 text-blue-700">{data.division}</span>}
          </p>
        </div>
        <div className="flex gap-3">
          {data.status === 'Pending' && (
            <Button
              onClick={handleSubmitForApproval}
              disabled={actionLoading}
              style={{ background: '#007AFF', color: 'white' }}
              className="rounded-2xl px-6"
            >
              {actionLoading ? 'Submitting...' : 'Submit for Approval'}
            </Button>
          )}
          {(data.status === 'Pending' || data.status === 'Draft') && (
            <Button variant="outline" className="rounded-2xl" onClick={() => router.push(`/dashboard/sales/orders/${recordId}/edit`)}>
              Edit
            </Button>
          )}
          <Button variant="outline" className="rounded-2xl" onClick={() => router.push('/dashboard/sales/orders')}>
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
                  <label className="text-xs font-semibold uppercase" style={{ color: '#999' }}>Order No</label>
                  <p className="text-lg font-medium mt-1" style={{ color: '#1D1D1F' }}>{data.orderNo}</p>
                </div>
                <div>
                  <label className="text-xs font-semibold uppercase" style={{ color: '#999' }}>Customer</label>
                  <p className="text-lg font-medium mt-1" style={{ color: '#1D1D1F' }}>
                    {data.customer?.companyName || `${data.customer?.firstName || ''} ${data.customer?.lastName || ''}`.trim() || 'N/A'}
                  </p>
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
                  <label className="text-xs font-semibold uppercase" style={{ color: '#999' }}>Division</label>
                  <p className="text-base font-medium mt-1" style={{ color: '#1D1D1F' }}>{data.division || 'N/A'}</p>
                </div>
                <div>
                  <label className="text-xs font-semibold uppercase" style={{ color: '#999' }}>Order Date</label>
                  <p className="text-base font-medium mt-1" style={{ color: '#1D1D1F' }}>
                    {data.orderDate ? new Date(data.orderDate).toLocaleDateString() : 'N/A'}
                  </p>
                </div>
              </div>
            </CardBody>
          </Card>

          {/* Items Table */}
          {items.length > 0 && (
            <Card className="rounded-2xl">
              <CardBody className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-bold" style={{ color: '#1D1D1F' }}>Order Items</h3>
                  <span className="text-xs text-gray-500 font-medium">{items.length} item{items.length !== 1 ? 's' : ''}</span>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr style={{ background: '#F5F5F7', borderBottom: '1px solid #E5E5EA' }}>
                        <th className="px-4 py-2.5 text-left font-semibold text-gray-700">Item Name</th>
                        <th className="px-4 py-2.5 text-center font-semibold text-gray-700">Unit</th>
                        <th className="px-4 py-2.5 text-right font-semibold text-gray-700">Qty</th>
                        <th className="px-4 py-2.5 text-right font-semibold text-gray-700">Unit Price (ETB)</th>
                        <th className="px-4 py-2.5 text-right font-semibold text-gray-700">Total (ETB)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {items.map((item: any, idx: number) => {
                        const itemName = item.name || item.itemName || item.item || item.description || `Item ${idx + 1}`;
                        const itemCode = item.code || item.itemCode || '';
                        const unit = item.unit || 'pcs';
                        const qty = Number(item.qty || item.quantity || 0);
                        const unitPrice = Number(item.unitPrice || item.price || 0);
                        const lineTotal = Number(item.total || (qty * unitPrice));

                        return (
                          <tr key={idx} className="border-b hover:bg-gray-50/60 transition-colors" style={{ borderColor: '#E5E5EA' }}>
                            <td className="px-4 py-3">
                              <span className="font-semibold text-gray-900 block">{itemName}</span>
                              {itemCode && (
                                <span className="text-xs text-gray-400 font-mono block">Code: {itemCode}</span>
                              )}
                            </td>
                            <td className="px-4 py-3 text-center text-gray-600 font-medium">{unit}</td>
                            <td className="px-4 py-3 text-right font-medium text-gray-800">{qty.toLocaleString('en-US')}</td>
                            <td className="px-4 py-3 text-right text-gray-700">
                              {unitPrice.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </td>
                            <td className="px-4 py-3 text-right font-bold text-gray-900">
                              {lineTotal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                    <tfoot>
                      <tr className="bg-gray-50 font-bold border-t-2 border-gray-200">
                        <td colSpan={4} className="px-4 py-3 text-right text-gray-700 uppercase text-xs tracking-wider">
                          Total Amount:
                        </td>
                        <td className="px-4 py-3 text-right text-base text-gray-900">
                          ETB {Number(data.totalAmount || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </CardBody>
            </Card>
          )}
        </div>

        {/* Sidebar: Approval Status & Customer Details */}
        <div className="space-y-6">
          {/* Customer & License Info */}
          {data.customer && (
            <Card className="rounded-2xl">
              <CardBody className="p-6">
                <h3 className="text-lg font-bold mb-3" style={{ color: '#1D1D1F' }}>Customer Information</h3>
                <div className="space-y-2.5 text-sm">
                  <div>
                    <span className="text-xs uppercase font-semibold text-gray-400 block">Company / Name</span>
                    <span className="font-semibold text-gray-900">
                      {data.customer.companyName || `${data.customer.firstName || ''} ${data.customer.lastName || ''}`.trim()}
                    </span>
                  </div>
                  {data.customer.phone && (
                    <div>
                      <span className="text-xs uppercase font-semibold text-gray-400 block">Phone</span>
                      <span className="text-gray-700">{data.customer.phone}</span>
                    </div>
                  )}
                  {data.customer.tin && (
                    <div>
                      <span className="text-xs uppercase font-semibold text-gray-400 block">TIN</span>
                      <span className="text-gray-700">{data.customer.tin}</span>
                    </div>
                  )}
                  {data.customer.licenseNo && (
                    <div className="pt-2 border-t border-gray-100">
                      <span className="text-xs uppercase font-semibold text-blue-600 block">Medical License</span>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <span className="font-medium text-gray-800">{data.customer.licenseNo}</span>
                        {data.customer.licenseExpiry && (
                          <span
                            className={`text-xs px-2 py-0.5 rounded font-semibold ${
                              new Date(data.customer.licenseExpiry) < new Date()
                                ? 'bg-red-100 text-red-700'
                                : 'bg-green-100 text-green-700'
                            }`}
                          >
                            {new Date(data.customer.licenseExpiry) < new Date() ? 'Expired' : 'Valid'}
                          </span>
                        )}
                      </div>
                      {data.customer.licenseType && (
                        <span className="text-xs text-gray-500 block mt-0.5">{data.customer.licenseType}</span>
                      )}
                    </div>
                  )}
                </div>
              </CardBody>
            </Card>
          )}

          <Card className="rounded-2xl">
            <CardBody className="p-6">
              <h3 className="text-lg font-bold mb-4" style={{ color: '#1D1D1F' }}>Approval Status</h3>
              {approvals.length === 0 ? (
                <div className="text-center py-4">
                  <p className="text-sm" style={{ color: '#999' }}>
                    {data.status === 'Pending' ? 'Submit the order to start approval' : 'No approval history'}
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
                        <p className="text-sm font-semibold" style={{ color: '#1D1D1F' }}>Level {a.level}</p>
                        <p className="text-xs" style={{ color: '#666' }}>
                          {a.status === 'APPROVED' && a.approver
                            ? `Approved by ${a.approver.firstName} ${a.approver.lastName}`
                            : a.status === 'REJECTED' && a.approver
                            ? `Rejected by ${a.approver.firstName} ${a.approver.lastName}`
                            : a.status === 'PENDING'
                            ? 'Awaiting approval...'
                            : a.status}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardBody>
          </Card>

          <Card className="rounded-2xl">
            <CardBody className="p-6">
              <h3 className="text-sm font-bold mb-3" style={{ color: '#1D1D1F' }}>Workflow</h3>
              <div className="space-y-2 text-xs" style={{ color: '#666' }}>
                <div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-yellow-400"></div> Pending (New)</div>
                <div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-orange-400"></div> Pending Approval</div>
                <div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-green-500"></div> Approved</div>
                <div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-blue-500"></div> In Progress</div>
                <div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-indigo-500"></div> Delivered</div>
              </div>
            </CardBody>
          </Card>
        </div>
      </div>
    </div>
  );
}
