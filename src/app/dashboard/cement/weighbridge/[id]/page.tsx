'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter, useParams } from 'next/navigation';
import { Card, CardHeader, CardBody, Button, Badge } from '@/components/ui';
import { ChevronLeft, Edit3, Trash2, CheckCircle, Scale, Truck, Calendar, User, FileText, ArrowLeft } from 'lucide-react';

interface WeighbridgeDetail {
  id: string;
  weighbridgeNo: string;
  weighbridgeType: 'FACTORY' | 'BUYER' | string;
  liftingId: string | null;
  liftingNo: string | null;
  truckPlateNo: string;
  grossWeight: number;
  tareWeight: number;
  netWeight: number;
  weighbridgeDate: string;
  operatorName: string | null;
  proofImage: string | null;
  verified: boolean;
  verifiedBy: string | null;
  createdAt: string;
  lifting?: {
    id: string;
    liftingNo: string;
    factoryWeight: number;
    buyerWeighbridgeQty: number | null;
    shortageQty: number | null;
    status: string;
    factory?: { name: string };
    truck?: { plateNo: string };
    customer?: { companyName: string; firstName?: string; lastName?: string };
    coupon?: { couponNo: string };
  } | null;
}

export default function WeighbridgeDetailPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;

  const [entry, setEntry] = useState<WeighbridgeDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [verifying, setVerifying] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [markingDelivered, setMarkingDelivered] = useState(false);

  const fetchEntry = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch(`/api/cement/weighbridge/${id}`);
      const json = await res.json();
      if (json.success && json.data) {
        setEntry(json.data);
      } else {
        setError(json.error || 'Failed to load weighbridge entry');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (id) {
      fetchEntry();
    }
  }, [id]);

  const handleVerify = async () => {
    if (!entry) return;
    if (!confirm('Verify this weighbridge entry? This confirms the weight measurement is correct.')) return;

    setVerifying(true);
    try {
      const res = await fetch(`/api/cement/weighbridge/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'verify' }),
      });
      const json = await res.json();
      if (json.success) {
        alert(json.message || 'Verified successfully');
        fetchEntry();
      } else {
        alert(json.error || 'Failed to verify entry');
      }
    } catch {
      alert('Error verifying entry');
    } finally {
      setVerifying(false);
    }
  };

  const handleMarkDelivered = async () => {
    if (!entry || !entry.lifting) return;
    if (!confirm(`Mark lifting ${entry.lifting.liftingNo} as Delivered using net weight (${(entry.netWeight / 1000).toFixed(2)} tons)?`)) return;

    setMarkingDelivered(true);
    try {
      const res = await fetch(`/api/cement/liftings/${entry.lifting.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'Delivered', buyerWeighbridgeQty: entry.netWeight / 1000 }),
      });
      const json = await res.json();
      if (json.success) {
        alert(`Lifting ${entry.lifting.liftingNo} marked as Delivered successfully!`);
        fetchEntry();
      } else {
        alert(json.error || 'Failed to mark as Delivered');
      }
    } catch {
      alert('Error marking lifting as Delivered');
    } finally {
      setMarkingDelivered(false);
    }
  };

  const handleDelete = async () => {
    if (!entry) return;
    if (!confirm(`Are you sure you want to delete weighbridge entry "${entry.weighbridgeNo}"? This action cannot be undone.`)) return;

    setDeleting(true);
    try {
      const res = await fetch(`/api/cement/weighbridge/${id}`, {
        method: 'DELETE',
      });
      const json = await res.json();
      if (json.success) {
        alert('Weighbridge entry deleted successfully');
        router.push('/dashboard/cement/weighbridge');
      } else {
        alert(json.error || 'Failed to delete weighbridge entry');
      }
    } catch {
      alert('Error deleting weighbridge entry');
    } finally {
      setDeleting(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-2">
          <Link href="/dashboard/cement/weighbridge" className="text-[#007AFF] hover:text-[#0055D4] flex items-center gap-1 text-sm font-medium">
            <ArrowLeft className="w-4 h-4" /> Back to Register
          </Link>
        </div>
        <Card className="rounded-2xl">
          <CardBody className="py-12 text-center text-slate-500">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#007AFF] mx-auto mb-3"></div>
            Loading weighbridge entry details...
          </CardBody>
        </Card>
      </div>
    );
  }

  if (error || !entry) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-2">
          <Link href="/dashboard/cement/weighbridge" className="text-[#007AFF] hover:text-[#0055D4] flex items-center gap-1 text-sm font-medium">
            <ArrowLeft className="w-4 h-4" /> Back to Register
          </Link>
        </div>
        <Card className="rounded-2xl">
          <CardBody className="py-12 text-center">
            <p className="text-red-600 font-semibold mb-4">{error || 'Weighbridge entry not found'}</p>
            <Link href="/dashboard/cement/weighbridge">
              <Button variant="outline">Back to Weighbridge Register</Button>
            </Link>
          </CardBody>
        </Card>
      </div>
    );
  }

  const customerName = entry.lifting?.customer
    ? (entry.lifting.customer.companyName || `${entry.lifting.customer.firstName || ''} ${entry.lifting.customer.lastName || ''}`.trim())
    : null;

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-[#86868B]">
        <Link href="/dashboard" className="text-[#007AFF] hover:text-[#0055D4]">Dashboard</Link>
        <span>/</span>
        <Link href="/dashboard/cement" className="text-[#007AFF] hover:text-[#0055D4]">Cement</Link>
        <span>/</span>
        <Link href="/dashboard/cement/weighbridge" className="text-[#007AFF] hover:text-[#0055D4]">Weighbridge</Link>
        <span>/</span>
        <span className="text-[#1D1D1F] font-medium">{entry.weighbridgeNo}</span>
      </div>

      {/* Header */}
      <div className="flex flex-wrap justify-between items-start gap-4">
        <div>
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-3xl font-bold text-[#1D1D1F] flex items-center gap-2">
              <Scale className="w-8 h-8 text-[#007AFF]" />
              {entry.weighbridgeNo}
            </h1>
            <span className={`px-3 py-1 rounded-full text-xs font-semibold uppercase ${
              entry.weighbridgeType === 'FACTORY' ? 'bg-blue-100 text-blue-800' : 'bg-purple-100 text-purple-800'
            }`}>
              {entry.weighbridgeType} Weighbridge
            </span>
            {entry.verified ? (
              <Badge status="Completed">Verified</Badge>
            ) : (
              <Badge status="Pending">Pending Verification</Badge>
            )}
          </div>
          <p className="text-[#86868B] mt-1 text-sm">Recorded on {new Date(entry.weighbridgeDate).toLocaleDateString()}</p>
        </div>

        <div className="flex gap-2 flex-wrap">
          {entry.weighbridgeType === 'BUYER' && entry.lifting && entry.lifting.status === 'Lifted' && (
            <Button
              variant="primary"
              onClick={handleMarkDelivered}
              isLoading={markingDelivered}
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              <CheckCircle className="w-4 h-4 mr-2" /> Mark Lifting as Delivered
            </Button>
          )}
          {!entry.verified && (
            <Button
              variant="primary"
              onClick={handleVerify}
              isLoading={verifying}
              className="bg-green-600 hover:bg-green-700 text-white"
            >
              <CheckCircle className="w-4 h-4 mr-2" /> Verify Entry
            </Button>
          )}
          <Link href={`/dashboard/cement/weighbridge/${id}/edit`}>
            <Button variant="outline">
              <Edit3 className="w-4 h-4 mr-2" /> Edit
            </Button>
          </Link>
          <Button variant="outline" onClick={handleDelete} isLoading={deleting} className="text-red-600 border-red-300 hover:bg-red-50">
            <Trash2 className="w-4 h-4 mr-2" /> Delete
          </Button>
          <Link href="/dashboard/cement/weighbridge">
            <Button variant="outline">Back to List</Button>
          </Link>
        </div>
      </div>

      {/* Weight Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="rounded-2xl border-l-4 border-l-blue-500">
          <CardBody>
            <p className="text-xs font-medium text-[#86868B] uppercase tracking-wider mb-1">Gross Weight</p>
            <p className="text-2xl font-bold text-[#1D1D1F]">
              {entry.grossWeight.toLocaleString('en-US')} <span className="text-sm font-normal text-slate-500">kg</span>
            </p>
          </CardBody>
        </Card>
        <Card className="rounded-2xl border-l-4 border-l-amber-500">
          <CardBody>
            <p className="text-xs font-medium text-[#86868B] uppercase tracking-wider mb-1">Tare Weight</p>
            <p className="text-2xl font-bold text-[#1D1D1F]">
              {entry.tareWeight.toLocaleString('en-US')} <span className="text-sm font-normal text-slate-500">kg</span>
            </p>
          </CardBody>
        </Card>
        <Card className="rounded-2xl border-l-4 border-l-green-500 bg-green-50/50">
          <CardBody>
            <p className="text-xs font-medium text-green-700 uppercase tracking-wider mb-1">Net Weight</p>
            <p className="text-2xl font-bold text-green-800">
              {entry.netWeight.toLocaleString('en-US')} <span className="text-sm font-normal text-green-600">kg</span>
            </p>
          </CardBody>
        </Card>
        <Card className="rounded-2xl border-l-4 border-l-purple-500 bg-purple-50/50">
          <CardBody>
            <p className="text-xs font-medium text-purple-700 uppercase tracking-wider mb-1">Net Weight (Tons)</p>
            <p className="text-2xl font-bold text-purple-800">
              {(entry.netWeight / 1000).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} <span className="text-sm font-normal text-purple-600">Tons</span>
            </p>
          </CardBody>
        </Card>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Entry Details */}
        <Card className="rounded-2xl lg:col-span-2">
          <CardHeader>
            <h2 className="text-lg font-semibold text-[#1D1D1F] flex items-center gap-2">
              <FileText className="w-5 h-5 text-[#007AFF]" /> Weighbridge Information
            </h2>
          </CardHeader>
          <CardBody className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div>
                <p className="text-xs font-medium text-[#86868B] uppercase tracking-wider mb-1">Weighbridge Number</p>
                <p className="text-base font-semibold text-[#1D1D1F]">{entry.weighbridgeNo}</p>
              </div>
              <div>
                <p className="text-xs font-medium text-[#86868B] uppercase tracking-wider mb-1">Weighbridge Type</p>
                <p className="text-base font-semibold text-[#1D1D1F]">{entry.weighbridgeType}</p>
              </div>
              <div>
                <p className="text-xs font-medium text-[#86868B] uppercase tracking-wider mb-1">Truck Plate Number</p>
                <p className="text-base font-semibold text-[#1D1D1F] flex items-center gap-2">
                  <Truck className="w-4 h-4 text-slate-500" /> {entry.truckPlateNo}
                </p>
              </div>
              <div>
                <p className="text-xs font-medium text-[#86868B] uppercase tracking-wider mb-1">Weighbridge Date</p>
                <p className="text-base font-semibold text-[#1D1D1F] flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-slate-500" /> {new Date(entry.weighbridgeDate).toLocaleString()}
                </p>
              </div>
              <div>
                <p className="text-xs font-medium text-[#86868B] uppercase tracking-wider mb-1">Operator Name</p>
                <p className="text-base font-semibold text-[#1D1D1F] flex items-center gap-2">
                  <User className="w-4 h-4 text-slate-500" /> {entry.operatorName || '—'}
                </p>
              </div>
              <div>
                <p className="text-xs font-medium text-[#86868B] uppercase tracking-wider mb-1">Created At</p>
                <p className="text-base font-semibold text-[#1D1D1F]">
                  {new Date(entry.createdAt).toLocaleString()}
                </p>
              </div>
            </div>

            {/* Verification status box */}
            <div className={`p-4 rounded-xl border ${
              entry.verified ? 'bg-green-50 border-green-200 text-green-800' : 'bg-amber-50 border-amber-200 text-amber-800'
            }`}>
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-semibold text-sm">
                    {entry.verified ? '✓ Verified Measurement' : '⏳ Pending Verification'}
                  </p>
                  {entry.verified && entry.verifiedBy && (
                    <p className="text-xs mt-1 opacity-80">Verified by: <span className="font-medium">{entry.verifiedBy}</span></p>
                  )}
                  {!entry.verified && (
                    <p className="text-xs mt-1 opacity-80">Measurement requires verification by Manager or Warehouse operator.</p>
                  )}
                </div>
                {!entry.verified && (
                  <Button size="sm" variant="primary" onClick={handleVerify} isLoading={verifying} className="bg-green-600 hover:bg-green-700 text-white">
                    Verify Now
                  </Button>
                )}
              </div>
            </div>
          </CardBody>
        </Card>

        {/* Linked Lifting Side Card */}
        <div className="space-y-4">
          <Card className="rounded-2xl">
            <CardHeader>
              <h3 className="text-lg font-semibold text-[#1D1D1F]">Linked Lifting</h3>
            </CardHeader>
            <CardBody>
              {entry.lifting ? (
                <div className="space-y-4">
                  <div>
                    <p className="text-xs font-medium text-[#86868B] uppercase tracking-wider mb-1">Lifting Number</p>
                    <Link href={`/dashboard/cement/liftings/${entry.lifting.id}`} className="text-base font-bold text-[#007AFF] hover:underline flex items-center gap-1">
                      {entry.lifting.liftingNo} &rarr;
                    </Link>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-[#86868B] uppercase tracking-wider mb-1">Factory</p>
                    <p className="text-sm font-semibold text-[#1D1D1F]">{entry.lifting.factory?.name || '—'}</p>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-[#86868B] uppercase tracking-wider mb-1">Customer</p>
                    <p className="text-sm font-semibold text-[#1D1D1F]">{customerName || '—'}</p>
                  </div>
                  {entry.lifting.coupon?.couponNo && (
                    <div>
                      <p className="text-xs font-medium text-[#86868B] uppercase tracking-wider mb-1">Coupon No</p>
                      <p className="text-sm font-bold text-purple-600">{entry.lifting.coupon.couponNo}</p>
                    </div>
                  )}
                  <div className="pt-2 border-t border-slate-100 grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <span className="text-slate-500">Factory Weight:</span>
                      <p className="font-semibold text-slate-900">{entry.lifting.factoryWeight} QT</p>
                    </div>
                    <div>
                      <span className="text-slate-500">Status:</span>
                      <p className="font-semibold text-slate-900">{entry.lifting.status}</p>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="py-6 text-center text-slate-400">
                  <p className="text-sm">No lifting linked to this weighbridge entry.</p>
                </div>
              )}
            </CardBody>
          </Card>
        </div>
      </div>
    </div>
  );
}
