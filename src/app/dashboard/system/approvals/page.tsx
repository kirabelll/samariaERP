'use client';
import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { Card, CardHeader, CardBody, Button, Badge } from '@/components/ui';

interface ApprovalItem {
  id: string;
  module: string;
  moduleLabel: string;
  recordId: string;
  recordRef: string;
  linkPath: string;
  description: string;
  level: number;
  levelTitle: string;
  requiredLevels: number;
  amount: number;
  requestedBy: string;
  approvedBy: string | null;
  status: string;
  notes: string;
  requestedAt: string;
  resolvedAt: string | null;
  daysOpen: number;
  isOverdue: boolean;
}

type TabType = 'pending' | 'all' | 'my-requests';

const statusColors: Record<string, string> = {
  PENDING: 'bg-yellow-100 text-yellow-800',
  APPROVED: 'bg-green-100 text-green-800',
  REJECTED: 'bg-red-100 text-red-800',
  CANCELLED: 'bg-gray-100 text-gray-600',
};

const moduleColors: Record<string, string> = {
  PaymentVoucher: 'bg-purple-100 text-purple-800',
  PurchaseOrder: 'bg-blue-100 text-blue-800',
  SupplierPayment: 'bg-indigo-100 text-indigo-800',
  LeaveRequest: 'bg-teal-100 text-teal-800',
  EmployeeAdvance: 'bg-pink-100 text-pink-800',
  PayrollPeriod: 'bg-cyan-100 text-cyan-800',
  MedicalRequest: 'bg-emerald-100 text-emerald-800',
  SalesInvoice: 'bg-amber-100 text-amber-800',
  CementPurchase: 'bg-lime-100 text-lime-800',
};

export default function ApprovalsPage() {
  const router = useRouter();
  const { data: session } = useSession();
  const userRole = (session?.user as any)?.role || '';
  const canApprove = ['ADMIN', 'MANAGER', 'FINANCE', 'HR', 'PROCUREMENT', 'WAREHOUSE', 'MEDICAL_PHARMACIST', 'MEDICAL_DRUGGIST'].includes(userRole);

  const [activeTab, setActiveTab] = useState<TabType>('pending');
  const [data, setData] = useState<ApprovalItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [pendingCount, setPendingCount] = useState(0);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [selectedApproval, setSelectedApproval] = useState<ApprovalItem | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [filterModule, setFilterModule] = useState('');

  const fetchApprovals = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ tab: activeTab, limit: '100' });
      if (filterModule) params.set('module', filterModule);

      const res = await fetch(`/api/approvals?${params}`);
      if (!res.ok) throw new Error('Failed to fetch');
      const result = await res.json();
      setData(Array.isArray(result.data) ? result.data : []);
      setPendingCount(result.pendingCount || 0);
    } catch (err) {
      console.error('Error fetching approvals:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchApprovals();
  }, [activeTab, filterModule]);

  const handleApprove = async (approval: ApprovalItem) => {
    setActionLoading(approval.id);
    try {
      const res = await fetch(`/api/approvals/${approval.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'approve' }),
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error || 'Failed to approve');

      if (result.status === 'NEXT_LEVEL') {
        alert(`Approved! Escalated to Level ${result.nextLevel} for further approval.`);
      } else if (result.status === 'FULLY_APPROVED') {
        alert('Fully approved! The record status has been updated.');
      }
      fetchApprovals();
    } catch (err: any) {
      console.error('Error approving:', err);
      alert(err.message || 'Failed to approve');
    } finally {
      setActionLoading(null);
    }
  };

  const handleReject = async () => {
    if (!selectedApproval) return;
    setActionLoading(selectedApproval.id);
    try {
      const res = await fetch(`/api/approvals/${selectedApproval.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'reject', reason: rejectReason }),
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error || 'Failed to reject');

      setShowRejectModal(false);
      setRejectReason('');
      setSelectedApproval(null);
      fetchApprovals();
    } catch (err: any) {
      console.error('Error rejecting:', err);
      alert(err.message || 'Failed to reject');
    } finally {
      setActionLoading(null);
    }
  };

  const uniqueModules = [...new Set(data.map((d) => d.module))];

  return (
    <div className="space-y-6 p-6" style={{ background: '#F5F5F7' }}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold" style={{ color: '#1D1D1F' }}>
            Approvals
          </h1>
          <p className="text-sm mt-1" style={{ color: '#666' }}>
            Manage approval requests across all modules
          </p>
        </div>
        {pendingCount > 0 && (
          <div className="px-4 py-2 rounded-2xl text-sm font-bold" style={{ background: '#FF3B30', color: 'white' }}>
            {pendingCount} Pending
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-4 border-b" style={{ borderColor: '#E5E5EA' }}>
        {([
          { id: 'pending', label: 'Pending My Approvals' },
          { id: 'all', label: 'All Approvals' },
          { id: 'my-requests', label: 'My Requests' },
        ] as const).map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-3 font-semibold text-sm border-b-2 transition-colors ${
              activeTab === tab.id
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            {tab.label}
            {tab.id === 'pending' && pendingCount > 0 && (
              <span className="ml-2 px-2 py-0.5 text-xs rounded-full bg-red-100 text-red-700">
                {pendingCount}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Module Filter */}
      {data.length > 0 && (
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={() => setFilterModule('')}
            className={`px-3 py-1.5 text-xs rounded-full font-medium transition-colors ${
              filterModule === '' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            All Modules
          </button>
          {uniqueModules.map((mod) => (
            <button
              key={mod}
              onClick={() => setFilterModule(filterModule === mod ? '' : mod)}
              className={`px-3 py-1.5 text-xs rounded-full font-medium transition-colors ${
                filterModule === mod ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {data.find((d) => d.module === mod)?.moduleLabel || mod}
            </button>
          ))}
        </div>
      )}

      {/* Approval Cards */}
      {loading ? (
        <div className="text-center py-12 text-gray-500">Loading approvals...</div>
      ) : data.length === 0 ? (
        <Card className="rounded-2xl">
          <CardBody>
            <div className="text-center py-12">
              <div className="text-4xl mb-4">✅</div>
              <p className="text-lg font-semibold" style={{ color: '#1D1D1F' }}>
                {activeTab === 'pending' ? 'No pending approvals' : 'No approvals found'}
              </p>
              <p className="text-sm mt-1" style={{ color: '#666' }}>
                {activeTab === 'pending' ? "You're all caught up!" : 'Try a different filter or tab.'}
              </p>
            </div>
          </CardBody>
        </Card>
      ) : (
        <div className="space-y-4">
          {data.map((item) => (
            <Card key={item.id} className={`rounded-2xl overflow-hidden ${item.isOverdue ? 'ring-2 ring-red-300' : ''}`}>
              <CardBody className="p-5">
                <div className="flex items-start justify-between gap-4">
                  {/* Left: Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2 flex-wrap">
                      <span className={`px-2.5 py-0.5 text-xs rounded-full font-medium ${moduleColors[item.module] || 'bg-gray-100 text-gray-700'}`}>
                        {item.moduleLabel}
                      </span>
                      <span className={`px-2.5 py-0.5 text-xs rounded-full font-medium ${statusColors[item.status] || 'bg-gray-100'}`}>
                        {item.status}
                      </span>
                      {item.isOverdue && (
                        <span className="px-2.5 py-0.5 text-xs rounded-full font-medium bg-red-100 text-red-700">
                          Overdue ({item.daysOpen}d)
                        </span>
                      )}
                    </div>

                    <h3 className="font-bold text-base mb-1" style={{ color: '#1D1D1F' }}>
                      {item.description}
                    </h3>

                    <div className="flex flex-wrap gap-x-6 gap-y-1 text-sm" style={{ color: '#666' }}>
                      {item.recordRef && (
                        <span>
                          Ref:{' '}
                          {item.linkPath ? (
                            <button
                              onClick={() => router.push(item.linkPath)}
                              className="font-medium"
                              style={{ color: '#007AFF' }}
                            >
                              {item.recordRef}
                            </button>
                          ) : (
                            <span className="font-medium">{item.recordRef}</span>
                          )}
                        </span>
                      )}
                      {item.amount > 0 && (
                        <span>
                          Amount: <span className="font-semibold" style={{ color: '#1D1D1F' }}>{item.amount.toLocaleString('en-US')} ETB</span>
                        </span>
                      )}
                      <span>By: {item.requestedBy}</span>
                      <span>{new Date(item.requestedAt).toLocaleDateString()}</span>
                    </div>

                    {/* Approval Level Progress */}
                    <div className="mt-3 flex items-center gap-2">
                      {Array.from({ length: item.requiredLevels }, (_, i) => {
                        const levelNum = i + 1;
                        const isComplete = item.status === 'APPROVED' || (item.status === 'PENDING' && levelNum < item.level);
                        const isCurrent = item.status === 'PENDING' && levelNum === item.level;
                        const isRejected = item.status === 'REJECTED' && levelNum === item.level;

                        return (
                          <div key={levelNum} className="flex items-center gap-1">
                            <div
                              className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${
                                isComplete
                                  ? 'bg-green-500 text-white'
                                  : isCurrent
                                  ? 'bg-yellow-400 text-yellow-900 ring-2 ring-yellow-300'
                                  : isRejected
                                  ? 'bg-red-500 text-white'
                                  : 'bg-gray-200 text-gray-500'
                              }`}
                            >
                              {isComplete ? '✓' : isRejected ? '✗' : levelNum}
                            </div>
                            {levelNum < item.requiredLevels && (
                              <div className={`w-6 h-0.5 ${isComplete ? 'bg-green-400' : 'bg-gray-200'}`} />
                            )}
                          </div>
                        );
                      })}
                      <span className="text-xs ml-2" style={{ color: '#666' }}>
                        Level {item.level}/{item.requiredLevels} — {item.levelTitle}
                      </span>
                    </div>

                    {/* Notes */}
                    {item.notes && item.status !== 'PENDING' && (
                      <p className="mt-2 text-xs italic" style={{ color: '#888' }}>
                        {item.notes}
                      </p>
                    )}
                    {item.approvedBy && (
                      <p className="mt-1 text-xs" style={{ color: '#34C759' }}>
                        {item.status === 'APPROVED' ? 'Approved' : item.status === 'REJECTED' ? 'Rejected' : 'Resolved'} by {item.approvedBy}
                        {item.resolvedAt && ` on ${new Date(item.resolvedAt).toLocaleDateString()}`}
                      </p>
                    )}
                  </div>

                  {/* Right: Actions */}
                  {item.status === 'PENDING' && canApprove && (
                    <div className="flex flex-col gap-2 flex-shrink-0">
                      <Button
                        size="sm"
                        onClick={() => handleApprove(item)}
                        disabled={actionLoading === item.id}
                        style={{ background: '#34C759', color: 'white' }}
                        className="rounded-2xl px-5"
                      >
                        {actionLoading === item.id ? '...' : 'Approve'}
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => {
                          setSelectedApproval(item);
                          setShowRejectModal(true);
                        }}
                        disabled={actionLoading === item.id}
                        variant="danger"
                        className="rounded-2xl px-5"
                      >
                        Reject
                      </Button>
                    </div>
                  )}
                  {item.status === 'PENDING' && !canApprove && (
                    <div className="px-3 py-1.5 rounded-2xl text-xs font-medium bg-yellow-50 text-yellow-700">
                      Awaiting {item.levelTitle}
                    </div>
                  )}
                </div>
              </CardBody>
            </Card>
          ))}
        </div>
      )}

      {/* Reject Modal */}
      {showRejectModal && selectedApproval && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <Card className="rounded-2xl w-[440px]">
            <CardHeader className="bg-red-50 border-b border-red-100">
              <h2 className="text-lg font-bold text-red-800">Reject Approval</h2>
            </CardHeader>
            <CardBody className="space-y-4 p-5">
              <div className="text-sm" style={{ color: '#666' }}>
                <p className="font-semibold" style={{ color: '#1D1D1F' }}>
                  {selectedApproval.description}
                </p>
                {selectedApproval.amount > 0 && (
                  <p className="mt-1">Amount: {selectedApproval.amount.toLocaleString('en-US')} ETB</p>
                )}
              </div>
              <div>
                <label className="block text-sm font-semibold mb-2" style={{ color: '#1D1D1F' }}>
                  Reason for Rejection *
                </label>
                <textarea
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  placeholder="Enter the reason for rejection..."
                  className="w-full px-4 py-3 rounded-xl border text-sm"
                  style={{ borderColor: '#E5E5EA' }}
                  rows={4}
                />
              </div>
              <div className="flex gap-3">
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowRejectModal(false);
                    setRejectReason('');
                    setSelectedApproval(null);
                  }}
                  className="flex-1 rounded-2xl"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleReject}
                  disabled={!!actionLoading || !rejectReason.trim()}
                  variant="danger"
                  className="flex-1 rounded-2xl"
                >
                  {actionLoading ? 'Processing...' : 'Reject'}
                </Button>
              </div>
            </CardBody>
          </Card>
        </div>
      )}
    </div>
  );
}
