'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter, useParams } from 'next/navigation';
import { Card, CardHeader, CardBody, Button, Badge } from '@/components/ui';
import { Edit3, Trash2, CheckCircle, Scale, Truck, Calendar, User, FileText, ArrowLeft, AlertTriangle, Link as LinkIcon } from 'lucide-react';

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
    factoryWeighbridgeRef?: string;
    factoryWeight: number;
    buyerWeighbridgeQty: number | null;
    shortageQty: number | null;
    shortagePenalty?: number | null;
    deliveryNoteNo?: string | null;
    status: string;
    factory?: { name: string };
    truck?: { plateNo: string };
    customer?: { companyName: string; firstName?: string; lastName?: string };
    coupon?: { couponNo: string };
  } | null;
}

interface LiftingOption {
  id: string;
  liftingNo: string;
  factoryWeight: number;
  truckPlateNo: string;
  customerName: string;
  factoryName: string;
  status: string;
  couponNo?: string;
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

  // Lifting linking state
  const [liftings, setLiftings] = useState<LiftingOption[]>([]);
  const [selectedLiftingId, setSelectedLiftingId] = useState<string>('');
  const [linkingLifting, setLinkingLifting] = useState(false);

  // Delivery confirmation form state
  const [deliveryNoteNo, setDeliveryNoteNo] = useState('');
  const [deliveredQty, setDeliveredQty] = useState<string>('');
  const [deliveryNotes, setDeliveryNotes] = useState('');

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

  const fetchLiftings = async () => {
    try {
      const res = await fetch('/api/cement/liftings?limit=200');
      const result = await res.json();
      if (result.success && Array.isArray(result.data)) {
        setLiftings(
          result.data.map((l: any) => ({
            id: l.id,
            liftingNo: l.liftingNo,
            factoryWeight: Number(l.factoryWeight) || 0,
            truckPlateNo: l.truck?.plateNo || '',
            customerName: l.customer?.companyName || `${l.customer?.firstName || ''} ${l.customer?.lastName || ''}`.trim() || '',
            factoryName: l.factory?.name || l.factory?.factoryName || '',
            status: l.status,
            couponNo: l.coupon?.couponNo || undefined,
          }))
        );
      }
    } catch (err) {
      console.error('Failed to fetch liftings:', err);
    }
  };

  useEffect(() => {
    if (id) {
      fetchEntry();
      fetchLiftings();
    }
  }, [id]);

  useEffect(() => {
    if (entry) {
      if (!deliveredQty) {
        setDeliveredQty((entry.netWeight / 100).toFixed(2));
      }
      if (!deliveryNoteNo) {
        setDeliveryNoteNo(entry.lifting?.deliveryNoteNo || `DN-${entry.weighbridgeNo}`);
      }
      if (entry.liftingId) {
        setSelectedLiftingId(entry.liftingId);
      }
    }
  }, [entry]);

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

  const handleLinkLifting = async (targetLiftingId?: string) => {
    const liftIdToLink = targetLiftingId !== undefined ? targetLiftingId : selectedLiftingId;
    setLinkingLifting(true);
    try {
      const res = await fetch(`/api/cement/weighbridge/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ liftingId: liftIdToLink || null }),
      });
      const json = await res.json();
      if (json.success) {
        alert(liftIdToLink ? 'Lifting order linked to weighbridge entry successfully!' : 'Lifting order unlinked.');
        fetchEntry();
      } else {
        alert(json.error || 'Failed to update lifting link');
      }
    } catch {
      alert('Error updating lifting link');
    } finally {
      setLinkingLifting(false);
    }
  };

  const handleMarkDelivered = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!entry || !entry.lifting) {
      alert('Please link a lifting order first.');
      return;
    }

    const parsedQty = parseFloat(deliveredQty);
    if (isNaN(parsedQty) || parsedQty <= 0) {
      alert('Please enter a valid delivered weight in Quintals (QT).');
      return;
    }

    const factoryW = entry.lifting.factoryWeight || 0;
    const shortage = factoryW - parsedQty;

    const confirmMsg = shortage > 0
      ? `Confirm delivery for lifting ${entry.lifting.liftingNo}?\n\n` +
        `• Factory Weight: ${factoryW.toFixed(2)} QT (${(factoryW / 10).toFixed(2)} Tons)\n` +
        `• Delivered Weight: ${parsedQty.toFixed(2)} QT (${(parsedQty / 10).toFixed(2)} Tons)\n` +
        `• Shortage Detected: ${shortage.toFixed(2)} QT (${factoryW > 0 ? ((shortage / factoryW) * 100).toFixed(1) : 0}%)\n\n` +
        `A shortage penalty will be automatically registered.`
      : `Confirm delivery for lifting ${entry.lifting.liftingNo} with ${parsedQty.toFixed(2)} QT (${(parsedQty / 10).toFixed(2)} Tons) delivered?`;

    if (!confirm(confirmMsg)) return;

    setMarkingDelivered(true);
    try {
      const res = await fetch(`/api/cement/liftings/${entry.lifting.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: 'Delivered',
          buyerWeighbridgeQty: parsedQty,
          deliveryNoteNo: deliveryNoteNo.trim() || undefined,
          notes: deliveryNotes.trim() || undefined,
        }),
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

  const isLiftingDelivered = entry.lifting?.status === 'Delivered' || entry.lifting?.status === 'Verified';

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
          {entry.verified && entry.lifting && !isLiftingDelivered && (
            <Button
              variant="primary"
              onClick={() => handleMarkDelivered()}
              isLoading={markingDelivered}
              className="bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm"
            >
              <CheckCircle className="w-4 h-4 mr-2" /> Confirm Delivery
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
            <p className="text-xs font-medium text-purple-700 uppercase tracking-wider mb-1">Net Weight (Quintals)</p>
            <p className="text-2xl font-bold text-purple-800">
              {(entry.netWeight / 100).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} <span className="text-sm font-normal text-purple-600">QT</span>
            </p>
            <p className="text-xs text-purple-600 mt-0.5">({(entry.netWeight / 1000).toFixed(2)} Tons)</p>
          </CardBody>
        </Card>
      </div>

      {/* Delivery Confirmation & Weight Variance Section */}
      <Card className="rounded-2xl border-2 border-[#007AFF]/20 shadow-sm overflow-hidden">
        <CardHeader className="bg-slate-50/80 border-b border-slate-100 py-4 flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 text-[#007AFF] rounded-xl">
              <Truck className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-[#1D1D1F] flex items-center gap-2">
                Delivery Confirmation & Weight Variance
              </h2>
              <p className="text-xs text-[#86868B]">
                Compare before lifting (factory) weight with after lifting (destination) weighbridge measurement.
              </p>
            </div>
          </div>
          <div>
            {!entry.verified ? (
              <span className="px-3 py-1 bg-amber-100 text-amber-800 text-xs font-semibold rounded-full flex items-center gap-1">
                <AlertTriangle className="w-3.5 h-3.5" /> Verification Required
              </span>
            ) : !entry.lifting ? (
              <span className="px-3 py-1 bg-purple-100 text-purple-800 text-xs font-semibold rounded-full flex items-center gap-1">
                <LinkIcon className="w-3.5 h-3.5" /> Lifting Link Required
              </span>
            ) : isLiftingDelivered ? (
              <span className="px-3 py-1 bg-emerald-100 text-emerald-800 text-xs font-semibold rounded-full flex items-center gap-1">
                <CheckCircle className="w-3.5 h-3.5" /> Delivery Confirmed
              </span>
            ) : (
              <span className="px-3 py-1 bg-blue-100 text-[#007AFF] text-xs font-semibold rounded-full flex items-center gap-1">
                <Scale className="w-3.5 h-3.5" /> Ready for Delivery
              </span>
            )}
          </div>
        </CardHeader>

        <CardBody className="p-6 space-y-6">
          {!entry.lifting ? (
            /* Unlinked Lifting Box */
            <div className="p-5 bg-purple-50/60 rounded-xl border border-purple-200 space-y-4">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-purple-100 text-purple-700 rounded-lg shrink-0">
                  <FileText className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-purple-900">No Lifting Order Linked to this Weighbridge Entry</h3>
                  <p className="text-xs text-purple-700 mt-0.5">
                    Select an active lifting order below to link it to this weighbridge record and unlock the delivery confirmation form.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 items-end pt-2">
                <div className="md:col-span-2">
                  <label className="block text-xs font-semibold text-purple-900 mb-1">
                    Select Lifting Order *
                  </label>
                  <select
                    className="w-full px-3 py-2 border border-purple-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none"
                    value={selectedLiftingId}
                    onChange={(e) => setSelectedLiftingId(e.target.value)}
                  >
                    <option value="">-- Choose Lifting Order to Link --</option>
                    {liftings.map((l) => (
                      <option key={l.id} value={l.id}>
                        {l.liftingNo} — {l.factoryWeight} QT — Truck: {l.truckPlateNo || 'N/A'} — {l.customerName || 'N/A'} [{l.status}]
                      </option>
                    ))}
                  </select>
                </div>

                <Button
                  variant="primary"
                  onClick={() => handleLinkLifting()}
                  isLoading={linkingLifting}
                  disabled={!selectedLiftingId}
                  className="bg-purple-600 hover:bg-purple-700 text-white shadow-xs font-medium w-full"
                >
                  <LinkIcon className="w-4 h-4 mr-2" /> Link Lifting Order
                </Button>
              </div>
            </div>
          ) : (
            /* Linked Lifting: Weight Comparison & Delivery Form */
            (() => {
              const factoryW = entry.lifting.factoryWeight || 0; // QT
              const currentBuyerW = deliveredQty !== '' ? parseFloat(deliveredQty) || 0 : entry.netWeight / 100;
              const diffQT = currentBuyerW - factoryW;
              const shortageQT = factoryW > currentBuyerW ? factoryW - currentBuyerW : 0;
              const shortagePct = factoryW > 0 ? (shortageQT / factoryW) * 100 : 0;

              return (
                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-center">
                    {/* Before Lifting Card */}
                    <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 relative">
                      <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1 flex items-center justify-between">
                        <span>Before Lifting (Factory)</span>
                        <span className="bg-slate-200 text-slate-700 px-2 py-0.5 rounded text-[10px]">Dispatch</span>
                      </div>
                      <div className="text-2xl font-black text-slate-900">
                        {factoryW.toFixed(2)} <span className="text-sm font-normal text-slate-500">QT</span>
                      </div>
                      <div className="mt-2 text-xs text-slate-600 space-y-0.5">
                        <p>Ref: <span className="font-mono font-medium">{entry.lifting.factoryWeighbridgeRef || '—'}</span></p>
                        <p>Factory: <span className="font-medium">{entry.lifting.factory?.name || '—'}</span></p>
                        <p className="text-slate-400">({(factoryW / 10).toFixed(2)} Tons / {(factoryW * 100).toLocaleString()} kg)</p>
                      </div>
                    </div>

                    {/* Variance Indicator (Center) */}
                    <div className="p-4 rounded-xl border text-center flex flex-col items-center justify-center space-y-1 bg-white shadow-xs">
                      <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Weight Difference</span>
                      <div className={`text-xl font-bold ${
                        diffQT === 0
                          ? 'text-emerald-600'
                          : diffQT < 0
                          ? shortagePct > 2 ? 'text-red-600' : 'text-amber-600'
                          : 'text-blue-600'
                      }`}>
                        {diffQT > 0 ? `+${diffQT.toFixed(2)}` : diffQT.toFixed(2)} QT
                      </div>
                      <div className="text-xs text-slate-500">
                        {diffQT === 0 ? (
                          <span className="text-emerald-600 font-medium">Exact Match (0.00%)</span>
                        ) : diffQT < 0 ? (
                          <span className={`font-semibold ${shortagePct > 2 ? 'text-red-600' : 'text-amber-600'}`}>
                            Shortage: {shortageQT.toFixed(2)} QT ({shortagePct.toFixed(1)}%)
                          </span>
                        ) : (
                          <span className="text-blue-600 font-medium">Excess: +{diffQT.toFixed(2)} QT</span>
                        )}
                      </div>
                      <div className="text-[11px] text-slate-400">
                        {(diffQT * 100).toFixed(0)} kg difference ({(diffQT / 10).toFixed(2)} Tons)
                      </div>
                    </div>

                    {/* After Lifting Card */}
                    <div className="p-4 bg-blue-50/60 rounded-xl border border-blue-200 relative">
                      <div className="text-xs font-semibold text-blue-700 uppercase tracking-wider mb-1 flex items-center justify-between">
                        <span>After Lifting (Weighbridge)</span>
                        <span className="bg-blue-200 text-blue-800 px-2 py-0.5 rounded text-[10px]">Destination</span>
                      </div>
                      <div className="text-2xl font-black text-blue-900">
                        {currentBuyerW.toFixed(2)} <span className="text-sm font-normal text-blue-600">QT</span>
                      </div>
                      <div className="mt-2 text-xs text-blue-800/80 space-y-0.5">
                        <p>Weighbridge: <span className="font-mono font-medium">{entry.weighbridgeNo}</span></p>
                        <p>Plate: <span className="font-medium">{entry.truckPlateNo}</span></p>
                        <p className="text-blue-600/70">({(currentBuyerW / 10).toFixed(2)} Tons / {(currentBuyerW * 100).toLocaleString()} kg)</p>
                      </div>
                    </div>
                  </div>

                  {/* Form / Delivery Status Section */}
                  {!entry.verified ? (
                    <div className="p-4 bg-amber-50 rounded-xl border border-amber-200 flex items-center justify-between flex-wrap gap-4">
                      <div className="flex items-center gap-3">
                        <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" />
                        <div>
                          <p className="text-sm font-semibold text-amber-900">Verification Required to Confirm Delivery</p>
                          <p className="text-xs text-amber-700">Please verify this weighbridge measurement first to unlock delivery confirmation.</p>
                        </div>
                      </div>
                      <Button variant="primary" size="sm" onClick={handleVerify} isLoading={verifying} className="bg-green-600 hover:bg-green-700 text-white">
                        <CheckCircle className="w-4 h-4 mr-1.5" /> Verify Entry Now
                      </Button>
                    </div>
                  ) : isLiftingDelivered ? (
                    <div className="p-4 bg-emerald-50 rounded-xl border border-emerald-200 space-y-3">
                      <div className="flex items-center justify-between flex-wrap gap-2">
                        <div className="flex items-center gap-2 text-emerald-900 font-semibold text-sm">
                          <CheckCircle className="w-5 h-5 text-emerald-600" />
                          <span>Lifting Delivery Confirmed ({entry.lifting.status})</span>
                        </div>
                        {entry.lifting.deliveryNoteNo && (
                          <span className="text-xs bg-emerald-100 text-emerald-800 font-mono px-2.5 py-1 rounded-md">
                            DN #: {entry.lifting.deliveryNoteNo}
                          </span>
                        )}
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs text-emerald-800 pt-2 border-t border-emerald-200/60">
                        <div>
                          <span className="text-emerald-700/70 block">Factory Weight:</span>
                          <span className="font-semibold text-sm">{entry.lifting.factoryWeight} QT</span>
                        </div>
                        <div>
                          <span className="text-emerald-700/70 block">Delivered Weight:</span>
                          <span className="font-semibold text-sm">{entry.lifting.buyerWeighbridgeQty ?? (entry.netWeight / 100)} QT</span>
                        </div>
                        <div>
                          <span className="text-emerald-700/70 block">Calculated Shortage:</span>
                          <span className={`font-semibold text-sm ${entry.lifting.shortageQty && entry.lifting.shortageQty > 0 ? 'text-red-700' : 'text-emerald-900'}`}>
                            {entry.lifting.shortageQty && entry.lifting.shortageQty > 0 ? `${entry.lifting.shortageQty} QT` : 'None (0 QT)'}
                          </span>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <form onSubmit={handleMarkDelivered} className="p-5 bg-white rounded-xl border border-slate-200 space-y-4">
                      <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                        <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                          <FileText className="w-4 h-4 text-[#007AFF]" /> Deliver Confirmation Form
                        </h3>
                        <span className="text-xs text-slate-500">Lifting #{entry.lifting.liftingNo}</span>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                          <label className="block text-xs font-semibold text-slate-700 mb-1">
                            Delivery Note / GRN No.
                          </label>
                          <input
                            type="text"
                            className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-[#007AFF] focus:border-[#007AFF] outline-none"
                            placeholder="e.g. DN-2026-001"
                            value={deliveryNoteNo}
                            onChange={(e) => setDeliveryNoteNo(e.target.value)}
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-semibold text-slate-700 mb-1">
                            Confirmed Buyer Weight (QT)
                          </label>
                          <input
                            type="number"
                            step="0.01"
                            className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm font-semibold focus:ring-2 focus:ring-[#007AFF] focus:border-[#007AFF] outline-none"
                            value={deliveredQty}
                            onChange={(e) => setDeliveredQty(e.target.value)}
                            required
                          />
                          <p className="text-[11px] text-slate-400 mt-1">Measured net weight: {(entry.netWeight / 100).toFixed(2)} QT ({(entry.netWeight / 1000).toFixed(2)} Tons)</p>
                        </div>

                        <div>
                          <label className="block text-xs font-semibold text-slate-700 mb-1">
                            Delivery Notes / Remarks
                          </label>
                          <input
                            type="text"
                            className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-[#007AFF] focus:border-[#007AFF] outline-none"
                            placeholder="Optional notes or condition on arrival..."
                            value={deliveryNotes}
                            onChange={(e) => setDeliveryNotes(e.target.value)}
                          />
                        </div>
                      </div>

                      {shortagePct > 2 && (
                        <div className="p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-xs text-red-800">
                          <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
                          <span>
                            <strong>Warning:</strong> High shortage detected ({shortagePct.toFixed(1)}%). Confirming delivery will automatically log a shortage penalty for finance recovery.
                          </span>
                        </div>
                      )}

                      <div className="flex justify-end pt-2">
                        <Button
                          type="submit"
                          variant="primary"
                          isLoading={markingDelivered}
                          className="bg-emerald-600 hover:bg-emerald-700 text-white font-medium px-6 shadow-sm"
                        >
                          <CheckCircle className="w-4 h-4 mr-2" /> Confirm & Complete Delivery
                        </Button>
                      </div>
                    </form>
                  )}
                </div>
              );
            })()
          )}
        </CardBody>
      </Card>

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
                    <p className="text-xs mt-1 opacity-80">Measurement requires verification by Manager or Warehouse operator to unlock delivery form.</p>
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
            <CardHeader className="flex justify-between items-center">
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

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      if (confirm('Unlink this lifting order from the weighbridge entry?')) {
                        handleLinkLifting('');
                      }
                    }}
                    className="w-full text-xs text-slate-500 hover:text-slate-800"
                  >
                    Unlink / Change Lifting
                  </Button>
                </div>
              ) : (
                <div className="space-y-3 py-2">
                  <p className="text-xs text-slate-500">No lifting linked to this weighbridge entry yet.</p>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">Link to Lifting Order:</label>
                    <select
                      className="w-full border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs bg-white focus:ring-2 focus:ring-[#007AFF] outline-none"
                      value={selectedLiftingId}
                      onChange={(e) => setSelectedLiftingId(e.target.value)}
                    >
                      <option value="">-- Select Lifting --</option>
                      {liftings.map((l) => (
                        <option key={l.id} value={l.id}>
                          {l.liftingNo} ({l.factoryWeight}T - {l.customerName || 'N/A'})
                        </option>
                      ))}
                    </select>
                  </div>
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => handleLinkLifting()}
                    isLoading={linkingLifting}
                    disabled={!selectedLiftingId}
                    className="w-full bg-[#007AFF] text-white text-xs font-medium"
                  >
                    <LinkIcon className="w-3.5 h-3.5 mr-1.5" /> Link Lifting Order
                  </Button>
                </div>
              )}
            </CardBody>
          </Card>
        </div>
      </div>
    </div>
  );
}
