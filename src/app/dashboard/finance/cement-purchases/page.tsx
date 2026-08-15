'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Card, CardBody, CardHeader, Button, Input, Badge } from '@/components/ui';
import { FileCheck, CheckCircle, XCircle, Clock, ShieldCheck, AlertTriangle, Banknote, Trash2 } from 'lucide-react';

interface CementPurchase {
  id: string;
  purchaseNo: string;
  cementType: string;
  quantityTons: number;
  unitPrice: number;
  totalAmount: number;
  paidAmount: number;
  paymentStatus: string;
  paymentRef: string | null;
  status: string;
  createdAt: string;
  factory?: { name: string };
}

export default function FinanceCementPurchasesPage() {
  const [purchases, setPurchases] = useState<CementPurchase[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'Pending' | 'all' | 'Checked' | 'Approved' | 'Active'>('Pending');
  const [search, setSearch] = useState('');
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [rejectModal, setRejectModal] = useState<{ id: string; purchaseNo: string } | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [deleteModal, setDeleteModal] = useState<CementPurchase | null>(null);
  const [deleting, setDeleting] = useState(false);

  const handleDelete = async () => {
    if (!deleteModal) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/cement/purchases/${deleteModal.id}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        setDeleteModal(null);
        fetchPurchases();
      } else {
        alert(data.error || 'Failed to delete purchase');
      }
    } catch {
      alert('Failed to delete purchase');
    } finally {
      setDeleting(false);
    }
  };


  const fetchPurchases = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/cement/purchases?limit=100${filter !== 'all' ? `&status=${filter}` : ''}`);
      const json = await res.json();
      if (json.success) {
        let data = (json.data || []).map((p: any) => ({
          ...p,
          quantityTons: Number(p.quantityTons),
          unitPrice: Number(p.unitPrice),
          totalAmount: Number(p.totalAmount),
          paidAmount: Number(p.paidAmount || 0),
        }));
        if (search) {
          const s = search.toLowerCase();
          data = data.filter((p: CementPurchase) =>
            p.purchaseNo.toLowerCase().includes(s) ||
            p.factory?.name?.toLowerCase().includes(s) ||
            p.cementType.toLowerCase().includes(s)
          );
        }
        setPurchases(data);
      }
    } catch (err) {
      console.error(err);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchPurchases();
  }, [filter]);

  const handleAction = async (purchaseId: string, action: string, notes?: string) => {
    setActionLoading(`${purchaseId}-${action}`);
    try {
      const res = await fetch(`/api/cement/purchases/${purchaseId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, notes }),
      });
      const data = await res.json();
      if (data.success) {
        fetchPurchases();
        setRejectModal(null);
        setRejectReason('');
      } else {
        alert(data.error || `Failed to ${action} purchase`);
      }
    } catch {
      alert(`Failed to ${action} purchase`);
    }
    setActionLoading(null);
  };

  const fmt = (val: number) =>
    `ETB ${val.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  const pendingCount = purchases.filter(p => p.status === 'Pending').length;

  const statusIcon = (status: string) => {
    switch (status) {
      case 'Pending': return <Clock className="w-4 h-4 text-amber-500" />;
      case 'Checked': return <FileCheck className="w-4 h-4 text-blue-500" />;
      case 'Approved': return <ShieldCheck className="w-4 h-4 text-indigo-500" />;
      case 'Active': return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'Rejected': return <XCircle className="w-4 h-4 text-red-500" />;
      default: return <Clock className="w-4 h-4 text-slate-400" />;
    }
  };

  const filtered = search
    ? purchases.filter(p => {
        const s = search.toLowerCase();
        return p.purchaseNo.toLowerCase().includes(s) ||
          p.factory?.name?.toLowerCase().includes(s) ||
          p.cementType.toLowerCase().includes(s);
      })
    : purchases;

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex flex-wrap gap-3 items-center justify-between">
        <div>
          <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900 flex items-center gap-2">
            <FileCheck className="w-7 h-7 text-[#007AFF]" />
            Cement Purchase Review
          </h1>
          <p className="text-sm text-slate-500 mt-1">Finance verification of cement purchases</p>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardBody>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Input
              placeholder="Search by purchase no, factory..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <div className="flex gap-2 flex-wrap">
              {([
                { key: 'Pending', label: 'Pending' },
                { key: 'Checked', label: 'Checked' },
                { key: 'Approved', label: 'Approved' },
                { key: 'Active', label: 'Active' },
                { key: 'all', label: 'All' },
              ] as const).map((f) => (
                <button
                  key={f.key}
                  onClick={() => setFilter(f.key)}
                  className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    filter === f.key
                      ? 'bg-[#007AFF] text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>
          <div className="mt-3 text-sm text-gray-600">
            {loading ? 'Loading...' : `${filtered.length} purchases`}
          </div>
        </CardBody>
      </Card>

      {/* Purchase List */}
      {loading ? (
        <Card><CardBody className="py-12 text-center text-slate-500">Loading purchases...</CardBody></Card>
      ) : filtered.length === 0 ? (
        <Card><CardBody className="py-12 text-center text-slate-500">No purchases found</CardBody></Card>
      ) : (
        <div className="space-y-3">
          {filtered.map((purchase) => (
            <Card key={purchase.id} className={
              purchase.status === 'Pending' ? 'border-l-4 border-l-amber-400' :
              purchase.status === 'Checked' ? 'border-l-4 border-l-blue-400' :
              purchase.status === 'Approved' ? 'border-l-4 border-l-indigo-400' :
              purchase.status === 'Active' ? 'border-l-4 border-l-green-400' :
              purchase.status === 'Rejected' ? 'border-l-4 border-l-red-400' : ''
            }>
              <CardBody className="py-4">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  {/* Left: Purchase info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      {statusIcon(purchase.status)}
                      <span className="font-bold text-[#1D1D1F]">{purchase.purchaseNo}</span>
                      <Badge status={purchase.status as any}>{purchase.status}</Badge>
                      {purchase.paymentRef === 'CREDIT' && (
                        <span className="text-xs font-semibold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full flex items-center gap-1">
                          <AlertTriangle className="w-3 h-3" /> Credit
                        </span>
                      )}
                    </div>
                    <div className="mt-2 grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                      <div>
                        <span className="text-slate-500">Factory:</span>{' '}
                        <span className="font-medium">{purchase.factory?.name || '—'}</span>
                      </div>
                      <div>
                        <span className="text-slate-500">Type:</span>{' '}
                        <span className="font-medium">{purchase.cementType}</span>
                      </div>
                      <div>
                        <span className="text-slate-500">Quantity:</span>{' '}
                        <span className="font-medium">{purchase.quantityTons.toLocaleString('en-US')} QT</span>
                      </div>
                      <div>
                        <span className="text-slate-500">Date:</span>{' '}
                        <span className="font-medium">{new Date(purchase.createdAt).toLocaleDateString()}</span>
                      </div>
                    </div>
                    <div className="mt-2 flex gap-4 text-sm">
                      <div>
                        <span className="text-slate-500">Total:</span>{' '}
                        <span className="font-bold text-[#1D1D1F]">{fmt(purchase.totalAmount)}</span>
                      </div>
                      <div>
                        <span className="text-slate-500">Paid:</span>{' '}
                        <span className="font-medium text-green-700">{fmt(purchase.paidAmount)}</span>
                      </div>
                      <div>
                        <span className="text-slate-500">Payment:</span>{' '}
                        <Badge status={purchase.paymentStatus === 'Paid' ? 'Active' : purchase.paymentStatus === 'Partial' ? 'Pending' : 'Lifted' as any}>
                          {purchase.paymentStatus || 'Unpaid'}
                        </Badge>
                      </div>
                    </div>
                  </div>

                  {/* Right: Actions */}
                  <div className="flex gap-2 shrink-0">
                    {purchase.status === 'Pending' && (
                      <>
                        <Button
                          variant="primary"
                          size="sm"
                          onClick={() => handleAction(purchase.id, 'check')}
                          disabled={actionLoading === `${purchase.id}-check`}
                          className="bg-blue-600 hover:bg-blue-700"
                        >
                          {actionLoading === `${purchase.id}-check` ? 'Checking...' : (
                            <><FileCheck className="w-4 h-4 mr-1" /> Finance Check</>
                          )}
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setRejectModal({ id: purchase.id, purchaseNo: purchase.purchaseNo })}
                          className="text-red-600 border-red-300 hover:bg-red-50"
                        >
                          <XCircle className="w-4 h-4 mr-1" /> Reject
                        </Button>
                      </>
                    )}
                    {purchase.status === 'Checked' && (
                      <Button
                        variant="primary"
                        size="sm"
                        onClick={() => handleAction(purchase.id, 'approve')}
                        disabled={actionLoading === `${purchase.id}-approve`}
                        className="bg-green-600 hover:bg-green-700"
                      >
                        {actionLoading === `${purchase.id}-approve` ? 'Approving...' : (
                          <><ShieldCheck className="w-4 h-4 mr-1" /> Approve</>
                        )}
                      </Button>
                    )}
                    <Link href={`/dashboard/cement/purchases/${purchase.id}`}>
                      <Button variant="outline" size="sm">Details</Button>
                    </Link>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setDeleteModal(purchase)}
                      className="text-red-600 border-red-300 hover:bg-red-50"
                    >
                      <Trash2 className="w-4 h-4 mr-1" /> Delete
                    </Button>
                  </div>
                </div>
              </CardBody>
            </Card>
          ))}
        </div>
      )}

      {/* Reject Modal */}
      {rejectModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md mx-4 space-y-4">
            <h3 className="text-lg font-semibold text-[#1D1D1F]">Reject {rejectModal.purchaseNo}</h3>
            <p className="text-sm text-slate-600">Please provide a reason for rejecting this purchase.</p>
            <textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              className="w-full border border-slate-300 rounded-xl p-3 text-sm focus:border-red-500 focus:ring-2 focus:ring-red-500/20"
              rows={3}
              placeholder="Reason for rejection..."
            />
            <div className="flex gap-3 justify-end">
              <Button variant="outline" onClick={() => { setRejectModal(null); setRejectReason(''); }}>
                Cancel
              </Button>
              <Button
                variant="primary"
                onClick={() => handleAction(rejectModal.id, 'reject', rejectReason)}
                disabled={actionLoading === `${rejectModal.id}-reject`}
                className="bg-red-600 hover:bg-red-700"
              >
                {actionLoading === `${rejectModal.id}-reject` ? 'Rejecting...' : 'Confirm Reject'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Modal */}
      {deleteModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md mx-4 space-y-4">
            <h3 className="text-lg font-semibold text-[#1D1D1F]">Delete Purchase</h3>
            <p className="text-sm text-slate-600">
              Are you sure you want to delete purchase <strong className="text-slate-900">{deleteModal.purchaseNo}</strong>? This action cannot be undone.
            </p>
            <div className="flex gap-3 justify-end">
              <Button variant="outline" onClick={() => setDeleteModal(null)} disabled={deleting}>
                Cancel
              </Button>
              <Button
                variant="primary"
                onClick={handleDelete}
                isLoading={deleting}
                className="bg-red-600 hover:bg-red-700 text-white"
              >
                Delete
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
