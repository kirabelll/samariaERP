'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { Card, CardBody, CardHeader, Badge, Button, Input, ConfirmDialog, Modal } from '@/components/ui';
import { ChevronLeft, Loader, Truck, Factory, Weight, FileText, Receipt, User, CreditCard, AlertTriangle, Trash2, CheckCircle } from 'lucide-react';

interface CementLifting {
  id: string;
  liftingNo: string;
  purchaseId: string;
  purchase?: {
    purchaseNo: string;
    cementType: string;
    unitPrice: number;
    factory?: { name: string };
  };
  factory?: { name: string };
  truck?: { plateNo: string; driverName?: string };
  customer?: { id: string; companyName: string; phone?: string; tin?: string };
  factoryWeighbridgeRef: string;
  factoryWeight: number;
  buyerWeighbridgeQty?: number;
  shortageQty?: number;
  shortagePenalty?: number;
  couponId?: string;
  coupon?: {
    id: string;
    couponNo: string;
    status?: string;
    tonnage?: number;
  };
  deliveryNoteNo?: string;
  notes?: string;
  liftingDate: string;
  status: string;
  registeredBy?: string;
  createdAt?: string;
  customerUnitPrice?: number;
  customerAgreementPrice?: number;
  customerAgreementNo?: string;
  invoices?: Array<{
    id: string;
    invoiceNo: string;
    totalAmount: number;
    status: string; 
    invoiceDate: string;
  }>;
}

export default function CementLiftingDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [lifting, setLifting] = useState<CementLifting | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [transitioning, setTransitioning] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Buyer weighbridge data
  const [buyerWbEntries, setBuyerWbEntries] = useState<Array<{ weighbridgeNo: string; netWeight: number; verified: boolean; weighbridgeDate: string }>>([]);
  const [buyerWbTotal, setBuyerWbTotal] = useState<number>(0);
  const [manualBuyerQty, setManualBuyerQty] = useState<string>('');
  const [manualDeliveryNoteNo, setManualDeliveryNoteNo] = useState<string>('');
  const [manualDeliveryNotes, setManualDeliveryNotes] = useState<string>('');
  const [showDeliveryPanel, setShowDeliveryPanel] = useState<boolean>(false);

  // Manual Buyer Weighbridge Entry Modal state
  const [showWbModal, setShowWbModal] = useState(false);
  const [modalGrossWeight, setModalGrossWeight] = useState('');
  const [modalTareWeight, setModalTareWeight] = useState('');
  const [modalOperatorName, setModalOperatorName] = useState('');
  const [submittingWb, setSubmittingWb] = useState(false);

  const handleDelete = async () => {
    try {
      setDeleting(true);
      const res = await fetch(`/api/cement/liftings/${id}`, {
        method: 'DELETE',
      });
      const result = await res.json();
      if (result.success) {
        setShowDeleteModal(false);
        router.push('/dashboard/cement?tab=liftings');
      } else {
        alert(result.error || 'Failed to delete lifting');
      }
    } catch (err) {
      alert('Error deleting lifting');
    } finally {
      setDeleting(false);
    }
  };

  const fetchBuyerWeighbridge = async () => {
    try {
      const res = await fetch(`/api/cement/weighbridge?weighbridgeType=BUYER&limit=100`);
      const result = await res.json();
      if (result.success && Array.isArray(result.data)) {
        // Filter for entries linked to this lifting
        const linked = result.data.filter((e: any) => e.liftingId === id);
        setBuyerWbEntries(linked.map((e: any) => ({
          weighbridgeNo: e.weighbridgeNo,
          netWeight: Number(e.netWeight) || 0,
          verified: e.verified,
          weighbridgeDate: e.weighbridgeDate || e.createdAt,
        })));
        const verifiedTotal = linked
          .filter((e: any) => e.verified)
          .reduce((sum: number, e: any) => sum + (Number(e.netWeight) || 0), 0);
        setBuyerWbTotal(verifiedTotal);
        if (verifiedTotal > 0 && !manualBuyerQty) {
          setManualBuyerQty(String(verifiedTotal / 1000 > 10 ? (verifiedTotal / 1000).toFixed(3) : verifiedTotal));
        }
      }
    } catch (err) {
      console.error('Failed to fetch buyer weighbridge entries:', err);
    }
  };

  const fetchLifting = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/cement/liftings/${id}`);
      const data = await res.json();
      if (data.success && data.data) {
        setLifting(data.data);
        if (data.data.factoryWeight && !manualBuyerQty) {
          setManualBuyerQty(String(data.data.buyerWeighbridgeQty || data.data.factoryWeight));
        }
        if (data.data.deliveryNoteNo && !manualDeliveryNoteNo) {
          setManualDeliveryNoteNo(data.data.deliveryNoteNo);
        }
      } else {
        setError(data.error || 'Failed to load lifting');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!id) return;
    fetchLifting();
    fetchBuyerWeighbridge();
  }, [id]);

  const handleAddBuyerWeighbridge = async () => {
    const gross = parseFloat(modalGrossWeight);
    const tare = parseFloat(modalTareWeight);
    if (!gross || gross <= 0 || isNaN(tare) || tare < 0) {
      alert('Please enter valid Gross and Tare weights (kg).');
      return;
    }
    const netKg = gross - tare;
    if (netKg <= 0) {
      alert('Gross weight must be greater than Tare weight.');
      return;
    }

    setSubmittingWb(true);
    try {
      const res = await fetch('/api/cement/weighbridge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          weighbridgeType: 'BUYER',
          liftingId: id,
          truckPlateNo: lifting?.truck?.plateNo || 'N/A',
          grossWeight: gross,
          tareWeight: tare,
          operatorName: modalOperatorName || null,
        }),
      });
      const json = await res.json();
      if (json.success) {
        alert(`Buyer weighbridge entry created! Net Weight: ${netKg.toLocaleString('en-US')} kg`);
        setShowWbModal(false);
        setModalGrossWeight('');
        setModalTareWeight('');
        setModalOperatorName('');
        await fetchLifting();
        await fetchBuyerWeighbridge();
      } else {
        alert(json.error || 'Failed to create weighbridge entry');
      }
    } catch (err) {
      alert('Error creating weighbridge entry');
    } finally {
      setSubmittingWb(false);
    }
  };

  const handleMarkDelivered = async () => {
    const buyerQty = parseFloat(manualBuyerQty);
    if (!buyerQty || buyerQty <= 0) {
      alert('Please enter the buyer weighbridge quantity in tons before marking as Delivered.');
      return;
    }
    const shortage = (lifting?.factoryWeight || 0) - buyerQty;
    const shortageMsg = shortage > 0
      ? `\n\nShortage: ${shortage.toFixed(2)} tons (${((shortage / (lifting?.factoryWeight || 1)) * 100).toFixed(1)}%)\nA penalty will be auto-created.`
      : '';

    if (!confirm(`Mark as Delivered?\n\nFactory Weight: ${lifting?.factoryWeight} tons\nBuyer Weight: ${buyerQty} tons${shortageMsg}\n\nThis will update the cement balance and purchase records.`)) return;

    try {
      setTransitioning(true);
      const res = await fetch(`/api/cement/liftings/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: 'Delivered',
          buyerWeighbridgeQty: buyerQty,
          deliveryNoteNo: manualDeliveryNoteNo.trim() || undefined,
          notes: manualDeliveryNotes.trim() || undefined,
        }),
      });
      const result = await res.json();
      if (result.success) {
        alert(`Delivery confirmed!${result.balance ? ' Balance updated.' : ''}${shortage > 0 ? ` Shortage penalty created for ${shortage.toFixed(2)} tons.` : ''}`);
        setShowDeliveryPanel(false);
        await fetchLifting();
      } else {
        alert(result.error || 'Failed to update status');
      }
    } catch (err) {
      alert('Error updating status');
    } finally {
      setTransitioning(false);
    }
  };

  const handleStatusTransition = async (newStatus: string) => {
    if (newStatus === 'Delivered') {
      setShowDeliveryPanel(true);
      return;
    }

    const messages: Record<string, string> = {
      Verified: 'Mark this lifting as Verified? This confirms the delivery is complete and correct.',
    };
    if (!confirm(messages[newStatus] || `Change status to ${newStatus}?`)) return;

    try {
      setTransitioning(true);
      const res = await fetch(`/api/cement/liftings/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
      const result = await res.json();
      if (result.success) {
        alert(`Lifting status updated to ${newStatus}`);
        await fetchLifting();
      } else {
        alert(result.error || 'Failed to update status');
      }
    } catch (err) {
      alert('Error updating status');
    } finally {
      setTransitioning(false);
    }
  };

  const statusColor = (status: string) => {
    switch (status) {
      case 'Delivered': return 'bg-[#34C759]/10 text-[#248A3D]';
      case 'Verified': return 'bg-[#007AFF]/10 text-[#0055D4]';
      case 'Lifted': return 'bg-[#FF9500]/10 text-[#D97706]';
      case 'Cancelled': return 'bg-[#FF3B30]/10 text-[#D70015]';
      default: return 'bg-[#007AFF]/10 text-[#0055D4]';
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-2">
          <Link href="/dashboard/cement?tab=liftings" className="text-[#007AFF] hover:text-[#0055D4]">
            <ChevronLeft className="w-5 h-5" />
          </Link>
          <Link href="/dashboard/cement?tab=liftings" className="text-[#007AFF] hover:text-[#0055D4]">
            Cement Liftings
          </Link>
        </div>
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <Loader className="w-8 h-8 animate-spin mx-auto text-[#007AFF] mb-4" />
            <p className="text-[#86868B]">Loading lifting details...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error || !lifting) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-2">
          <Link href="/dashboard/cement?tab=liftings" className="text-[#007AFF] hover:text-[#0055D4]">
            <ChevronLeft className="w-5 h-5" />
          </Link>
          <Link href="/dashboard/cement?tab=liftings" className="text-[#007AFF] hover:text-[#0055D4]">
            Cement Liftings
          </Link>
        </div>
        <Card className="rounded-2xl">
          <CardBody className="text-center py-12">
            <p className="text-red-600 text-lg font-medium mb-4">{error || 'Lifting not found'}</p>
            <Link href="/dashboard/cement?tab=liftings">
              <Button variant="primary">Back to Liftings</Button>
            </Link>
          </CardBody>
        </Card>
      </div>
    );
  }

  const effectiveUnitPrice = lifting.customerUnitPrice || lifting.customerAgreementPrice || lifting.purchase?.unitPrice || 0;
  const totalValue = lifting.factoryWeight * effectiveUnitPrice;
  const invoices = lifting.invoices || [];
  const hasInvoice = invoices.length > 0;
  const invoiceTotal = invoices.reduce((sum, inv) => sum + Number(inv.totalAmount), 0);

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-[#86868B]">
        <Link href="/dashboard" className="text-[#007AFF] hover:text-[#0055D4]">Dashboard</Link>
        <span>/</span>
        <Link href="/dashboard/cement?tab=liftings" className="text-[#007AFF] hover:text-[#0055D4]">Cement Liftings</Link>
        <span>/</span>
        <span className="text-[#1D1D1F] font-medium">{lifting.liftingNo}</span>
      </div>

      {/* Header */}
      <div className="flex flex-wrap justify-between items-start gap-4">
        <div>
          <h1 className="text-3xl font-bold text-[#1D1D1F]">{lifting.liftingNo}</h1>
          <p className="text-[#86868B] mt-2">Cement lifting detail and weighbridge information</p>
        </div>
        <div className="flex gap-2 items-center flex-wrap">
          {hasInvoice ? (
            <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-[#34C759]/10 text-[#248A3D]">
              Invoiced
            </span>
          ) : (
            <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-[#FF9500]/10 text-[#D97706]">
              Not Invoiced
            </span>
          )}
          <Badge status={lifting.status as any} className={`text-base px-3 py-1 ${statusColor(lifting.status)}`}>
            {lifting.status}
          </Badge>

          {/* Status Transition Buttons */}
          {lifting.status !== 'Delivered' && lifting.status !== 'Verified' && (
            <Button
              variant="primary"
              size="sm"
              onClick={() => handleStatusTransition('Delivered')}
              disabled={transitioning}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-medium shadow-sm"
            >
              <CheckCircle className="w-4 h-4 mr-1.5" />
              {transitioning ? 'Updating...' : 'Mark as Delivered'}
            </Button>
          )}
          {lifting.status === 'Delivered' && (
            <Button
              variant="primary"
              size="sm"
              onClick={() => handleStatusTransition('Verified')}
              disabled={transitioning}
              className="bg-[#34C759] hover:bg-[#248A3D]"
            >
              <CheckCircle className="w-4 h-4 mr-1.5" />
              {transitioning ? 'Updating...' : 'Mark as Verified'}
            </Button>
          )}
          <Button
            variant="danger"
            size="sm"
            onClick={() => setShowDeleteModal(true)}
          >
            <Trash2 className="w-4 h-4 mr-1" />
            Delete
          </Button>
        </div>
      </div>

      {/* Delivery Panel — shows when user clicks "Mark as Delivered" or opens delivery form */}
      {(showDeliveryPanel || (lifting.status !== 'Delivered' && lifting.status !== 'Verified')) && (
        <Card className="rounded-2xl border-2 border-emerald-500/30 shadow-sm overflow-hidden">
          <CardHeader className="bg-emerald-50/60 border-b border-emerald-100 py-3.5 flex items-center justify-between">
            <h2 className="text-lg font-bold text-emerald-900 flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-emerald-600" />
              Confirm Delivery Form — Cement Lifting #{lifting.liftingNo}
            </h2>
            <span className="text-xs bg-emerald-100 text-emerald-800 font-semibold px-2.5 py-1 rounded-full">
              Status: {lifting.status}
            </span>
          </CardHeader>
          <CardBody className="p-6 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Left: Linked Buyer Weighbridge Entries */}
              <div className="space-y-3">
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Linked Buyer Weighbridge Entries</p>
                {buyerWbEntries.length > 0 ? (
                  <div className="space-y-2">
                    {buyerWbEntries.map((e, i) => (
                      <div key={i} className="flex justify-between items-center text-sm p-3 rounded-lg bg-slate-50 border border-slate-200">
                        <div>
                          <span className="font-semibold text-slate-900">{e.weighbridgeNo}</span>
                          <p className="text-xs text-slate-500">{new Date(e.weighbridgeDate).toLocaleDateString()}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-800">{(e.netWeight / 1000 > 10 ? e.netWeight / 1000 : e.netWeight).toFixed(2)} Tons</span>
                          {e.verified ? (
                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-semibold">Verified</span>
                          ) : (
                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 font-semibold">Pending</span>
                          )}
                        </div>
                      </div>
                    ))}
                    <div className="flex justify-between items-center text-sm p-3 rounded-lg bg-blue-50 border border-blue-200">
                      <span className="font-semibold text-blue-900">Verified Total (Weighbridge)</span>
                      <span className="font-bold text-blue-900 text-base">{(buyerWbTotal / 1000 > 10 ? buyerWbTotal / 1000 : buyerWbTotal).toFixed(2)} Tons</span>
                    </div>
                  </div>
                ) : (
                  <div className="p-4 bg-slate-50 border border-dashed border-slate-300 rounded-xl text-center space-y-2">
                    <p className="text-xs text-slate-500">No buyer weighbridge entry linked to this lifting yet.</p>
                    <Button variant="outline" size="sm" onClick={() => setShowWbModal(true)} className="text-xs">
                      + Record Buyer Weighbridge
                    </Button>
                  </div>
                )}
              </div>

              {/* Right: Delivery Form Fields */}
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1">Factory Weight</label>
                    <div className="p-3 bg-slate-100 rounded-lg font-bold text-xl text-slate-900">
                      {Number(lifting.factoryWeight).toFixed(2)} <span className="text-sm font-normal text-slate-500">Tons</span>
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1">Buyer Delivered Weight (Tons) *</label>
                    <input
                      type="number"
                      step="0.001"
                      className="w-full p-3 border border-slate-300 rounded-lg text-xl font-bold text-emerald-800 focus:ring-2 focus:ring-emerald-500 outline-none"
                      placeholder="e.g. 40.00"
                      value={manualBuyerQty}
                      onChange={(e) => setManualBuyerQty(e.target.value)}
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1">Delivery Note / GRN No.</label>
                  <input
                    type="text"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
                    placeholder="e.g. DN-2026-001"
                    value={manualDeliveryNoteNo}
                    onChange={(e) => setManualDeliveryNoteNo(e.target.value)}
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1">Delivery Notes / Remarks</label>
                  <input
                    type="text"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
                    placeholder="Optional remarks or arrival condition..."
                    value={manualDeliveryNotes}
                    onChange={(e) => setManualDeliveryNotes(e.target.value)}
                  />
                </div>

                {manualBuyerQty && parseFloat(manualBuyerQty) > 0 && (() => {
                  const shortage = lifting.factoryWeight - parseFloat(manualBuyerQty);
                  const pct = lifting.factoryWeight > 0 ? ((shortage / lifting.factoryWeight) * 100).toFixed(1) : '0';
                  if (shortage > 0) {
                    return (
                      <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-800 flex items-center gap-2">
                        <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
                        <span>Shortage detected: <strong>{shortage.toFixed(2)} Tons ({pct}%)</strong>. Confirming delivery will automatically create a shortage penalty.</span>
                      </div>
                    );
                  }
                  return (
                    <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-xs text-emerald-800">
                      Exact match or no shortage. Delivered quantity matches dispatch weight.
                    </div>
                  );
                })()}

                <div className="flex justify-end gap-2 pt-2">
                  {showDeliveryPanel && (
                    <Button variant="secondary" size="lg" onClick={() => setShowDeliveryPanel(false)}>
                      Cancel
                    </Button>
                  )}
                  <Button
                    variant="primary"
                    size="lg"
                    onClick={handleMarkDelivered}
                    disabled={transitioning}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold px-6 shadow-sm"
                  >
                    <CheckCircle className="w-4 h-4 mr-2" />
                    {transitioning ? 'Processing...' : 'Confirm & Complete Delivery'}
                  </Button>
                </div>
              </div>
            </div>
          </CardBody>
        </Card>
      )}

      {/* Main Details */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Lifting Information */}
        <Card className="rounded-2xl lg:col-span-2">
          <CardHeader>
            <h2 className="text-lg font-semibold text-[#1D1D1F]">Lifting Information</h2>
          </CardHeader>
          <CardBody className="space-y-6">
            <div className="grid grid-cols-2 gap-6">
              <div>
                <p className="text-xs font-medium text-[#86868B] uppercase tracking-wider mb-2">Purchase Order</p>
                <Link href={`/dashboard/cement/purchases/${lifting.purchaseId}`} className="text-[#007AFF] hover:text-[#0055D4] font-semibold text-lg">
                  {lifting.purchase?.purchaseNo || '—'}
                </Link>
              </div>
              <div>
                <p className="text-xs font-medium text-[#86868B] uppercase tracking-wider mb-2">Cement Type</p>
                <p className="text-lg font-semibold text-[#1D1D1F]">{lifting.purchase?.cementType || '—'}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-6">
              <div>
                <p className="text-xs font-medium text-[#86868B] uppercase tracking-wider mb-2">Factory</p>
                <p className="text-lg font-semibold text-[#1D1D1F] flex items-center gap-2">
                  <Factory className="w-4 h-4 text-[#86868B]" />
                  {lifting.factory?.name || lifting.purchase?.factory?.name || '—'}
                </p>
              </div>
              <div>
                <p className="text-xs font-medium text-[#86868B] uppercase tracking-wider mb-2">Customer</p>
                <p className="text-lg font-semibold text-[#1D1D1F] flex items-center gap-2">
                  <User className="w-4 h-4 text-[#86868B]" />
                  {lifting.customer?.companyName || '—'}
                </p>
                {lifting.customer?.phone && (
                  <p className="text-sm text-[#86868B] mt-1">{lifting.customer.phone}</p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-6">
              <div>
                <p className="text-xs font-medium text-[#86868B] uppercase tracking-wider mb-2">Truck</p>
                <p className="text-lg font-semibold text-[#1D1D1F] flex items-center gap-2">
                  <Truck className="w-4 h-4 text-[#86868B]" />
                  {lifting.truck?.plateNo || '—'}
                </p>
                {lifting.truck?.driverName && (
                  <p className="text-sm text-[#86868B] mt-1">Driver: {lifting.truck.driverName}</p>
                )}
              </div>
              <div>
                <p className="text-xs font-medium text-[#86868B] uppercase tracking-wider mb-2">Lifting Date</p>
                <p className="text-lg font-semibold text-[#1D1D1F]">
                  {new Date(lifting.liftingDate).toLocaleDateString('en-US', {
                    weekday: 'short', year: 'numeric', month: 'short', day: 'numeric',
                  })}
                </p>
              </div>
            </div>

            {lifting.coupon && (
              <div>
                <p className="text-xs font-medium text-[#86868B] uppercase tracking-wider mb-2">Coupon</p>
                <p className="text-lg font-semibold text-[#1D1D1F] flex items-center gap-2">
                  <FileText className="w-4 h-4 text-[#86868B]" />
                  {lifting.coupon.couponNo}
                  {lifting.coupon.status && (
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                      lifting.coupon.status === 'USED' ? 'bg-[#34C759]/10 text-[#248A3D]' :
                      'bg-[#FF9500]/10 text-[#D97706]'
                    }`}>
                      {lifting.coupon.status}
                    </span>
                  )}
                </p>
                {lifting.coupon.tonnage && (
                  <p className="text-sm text-[#86868B] mt-1">Tonnage: {lifting.coupon.tonnage} QT</p>
                )}
              </div>
            )}

            {lifting.deliveryNoteNo && (
              <div>
                <p className="text-xs font-medium text-[#86868B] uppercase tracking-wider mb-2">Delivery Note No</p>
                <p className="text-lg font-semibold text-[#1D1D1F] flex items-center gap-2">
                  <FileText className="w-4 h-4 text-[#86868B]" />
                  {lifting.deliveryNoteNo}
                </p>
              </div>
            )}
          </CardBody>
        </Card>

        {/* Right Column */}
        <div className="space-y-4">
          {/* Weighbridge */}
          <Card className="rounded-2xl">
            <CardHeader>
              <h3 className="text-lg font-semibold text-[#1D1D1F] flex items-center gap-2">
                <Weight className="w-5 h-5" />
                Weighbridge
              </h3>
            </CardHeader>
            <CardBody className="space-y-4">
              <div>
                <p className="text-xs font-medium text-[#86868B] uppercase tracking-wider mb-1">Factory Weighbridge Ref</p>
                <p className="text-sm font-semibold text-[#1D1D1F]">{lifting.factoryWeighbridgeRef}</p>
              </div>
              <div>
                <p className="text-xs font-medium text-[#86868B] uppercase tracking-wider mb-1">Factory Weight</p>
                <p className="text-3xl font-bold text-[#007AFF]">{Number(lifting.factoryWeight || 0).toLocaleString('en-US')} Tons</p>
              </div>
              {lifting.buyerWeighbridgeQty != null && lifting.buyerWeighbridgeQty > 0 && (
                <div>
                  <p className="text-xs font-medium text-[#86868B] uppercase tracking-wider mb-1">Buyer Weighbridge</p>
                  <p className="text-2xl font-bold text-[#1D1D1F]">{Number(lifting.buyerWeighbridgeQty).toLocaleString('en-US')} Tons</p>
                </div>
              )}
              {lifting.shortageQty != null && lifting.shortageQty > 0 && (
                <div className="border-t pt-3">
                  <p className="text-xs font-medium text-red-500 uppercase tracking-wider mb-1">Shortage</p>
                  <p className="text-xl font-bold text-red-600">{Number(lifting.shortageQty).toLocaleString('en-US')} Tons</p>
                  {lifting.shortagePenalty != null && lifting.shortagePenalty > 0 && (
                    <p className="text-sm text-red-500 mt-1">Penalty: ETB {Number(lifting.shortagePenalty).toLocaleString('en-US')}</p>
                  )}
                  <Link href="/dashboard/cement/penalties" className="text-xs text-[#007AFF] hover:underline mt-1 block">
                    View Penalties →
                  </Link>
                </div>
              )}
              <div className="border-t pt-3 space-y-2">
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => setShowWbModal(true)}
                  className="w-full"
                >
                  + Record Buyer Weighbridge Entry
                </Button>
                <Link href="/dashboard/cement/weighbridge" className="text-xs text-[#007AFF] hover:underline font-medium block">
                  View Weighbridge Register →
                </Link>
              </div>
            </CardBody>
          </Card>

          {/* Value */}
          <Card className="rounded-2xl">
            <CardHeader>
              <h3 className="text-lg font-semibold text-[#1D1D1F]">Value</h3>
            </CardHeader>
            <CardBody className="space-y-3">
              <div>
                <p className="text-xs font-medium text-[#86868B] uppercase tracking-wider mb-1">
                  Customer Agreement Unit Price
                </p>
                <p className="text-lg font-bold text-[#007AFF]">
                  ETB {effectiveUnitPrice.toLocaleString('en-US')} / Ton
                </p>
                {lifting.customerAgreementNo && (
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Agreement: {lifting.customerAgreementNo}
                  </p>
                )}
              </div>
              {lifting.purchase?.unitPrice && (
                <div>
                  <p className="text-xs font-medium text-[#86868B] uppercase tracking-wider mb-1">
                    Factory Purchase Cost
                  </p>
                  <p className="text-sm text-slate-600 font-medium">
                    ETB {Number(lifting.purchase.unitPrice).toLocaleString('en-US')} / Ton
                  </p>
                </div>
              )}
              <div className="border-t pt-3">
                <p className="text-xs font-medium text-[#86868B] uppercase tracking-wider mb-1">Total Customer Value</p>
                <p className="text-2xl font-bold text-[#34C759]">ETB {totalValue.toLocaleString('en-US')}</p>
              </div>
            </CardBody>
          </Card>

          {/* Invoice Status */}
          <Card className="rounded-2xl">
            <CardHeader>
              <h3 className="text-lg font-semibold text-[#1D1D1F] flex items-center gap-2">
                <Receipt className="w-5 h-5" />
                Invoice Status
              </h3>
            </CardHeader>
            <CardBody>
              {hasInvoice ? (
                <div className="space-y-3">
                  {invoices.map((inv) => (
                    <div key={inv.id} className="flex items-center justify-between">
                      <div>
                        <Link
                          href={`/dashboard/sales/invoices/${inv.id}`}
                          className="text-[#007AFF] hover:text-[#0055D4] font-semibold text-sm"
                        >
                          {inv.invoiceNo}
                        </Link>
                        <p className="text-xs text-[#86868B] mt-0.5">
                          {new Date(inv.invoiceDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-semibold text-[#1D1D1F]">ETB {Number(inv.totalAmount).toLocaleString('en-US')}</p>
                        <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                          inv.status === 'Paid' ? 'bg-[#34C759]/10 text-[#248A3D]' :
                          inv.status === 'Partial' ? 'bg-[#FF9500]/10 text-[#D97706]' :
                          'bg-[#FF3B30]/10 text-[#D70015]'
                        }`}>{inv.status}</span>
                      </div>
                    </div>
                  ))}
                  <div className="border-t pt-2 flex justify-between text-sm">
                    <span className="text-[#86868B]">Total Invoiced</span>
                    <span className="font-bold text-[#1D1D1F]">ETB {invoiceTotal.toLocaleString('en-US')}</span>
                  </div>
                </div>
              ) : (
                <div className="text-center py-3">
                  <CreditCard className="w-8 h-8 mx-auto text-[#86868B] mb-2" />
                  <p className="text-sm text-[#86868B]">No invoice created yet</p>
                  <p className="text-xs text-[#86868B] mt-1">Invoices are created by the Finance team</p>
                </div>
              )}
            </CardBody>
          </Card>

          {/* Created */}
          <Card className="rounded-2xl">
            <CardHeader>
              <h3 className="text-lg font-semibold text-[#1D1D1F]">Created</h3>
            </CardHeader>
            <CardBody>
              <p className="text-sm text-[#1D1D1F]">
                {new Date(lifting.createdAt).toLocaleDateString('en-US', {
                  weekday: 'short', year: 'numeric', month: 'short', day: 'numeric',
                })}
              </p>
              <p className="text-xs text-[#86868B] mt-1">
                {new Date(lifting.createdAt).toLocaleTimeString('en-US', {
                  hour: '2-digit', minute: '2-digit',
                })}
              </p>
              {lifting.registeredBy && (
                <p className="text-xs text-[#86868B] mt-2">By: {lifting.registeredBy}</p>
              )}
            </CardBody>
          </Card>
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-3 flex-wrap">
        <Link href="/dashboard/cement?tab=liftings" className="flex-1 min-w-[140px]">
          <Button variant="outline" size="lg" className="w-full">Back to Liftings</Button>
        </Link>
        <Link href={`/dashboard/cement/purchases/${lifting.purchaseId}`} className="flex-1 min-w-[140px]">
          <Button variant="secondary" size="lg" className="w-full">View Purchase</Button>
        </Link>
        {hasInvoice && invoices[0] && (
          <Link href={`/dashboard/sales/invoices/${invoices[0].id}`} className="flex-1 min-w-[140px]">
            <Button variant="primary" size="lg" className="w-full">View Invoice</Button>
          </Link>
        )}
        <Button
          variant="danger"
          size="lg"
          className="flex-1 min-w-[140px]"
          onClick={() => setShowDeleteModal(true)}
        >
          Delete Lifting
        </Button>
      </div>

      <ConfirmDialog
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        onConfirm={handleDelete}
        title="Delete Cement Lifting"
        message={`Are you sure you want to delete lifting "${lifting.liftingNo}"? This action will revert factory balance and coupon status if applicable.`}
        confirmText="Delete"
        cancelText="Cancel"
        isDangerous={true}
        isLoading={deleting}
      />

      {/* Record Buyer Weighbridge Entry Modal */}
      <Modal
        isOpen={showWbModal}
        onClose={() => setShowWbModal(false)}
        title="Record Buyer Weighbridge Entry"
        body={
          <div className="space-y-4">
            <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg text-xs text-blue-800">
              <p className="font-semibold mb-1">Lifting: {lifting?.liftingNo}</p>
              <p>Truck: {lifting?.truck?.plateNo || 'N/A'} | Factory Weight: {lifting?.factoryWeight} tons</p>
            </div>
            <Input
              label="Gross Weight (kg) *"
              type="number"
              placeholder="e.g. 40000"
              value={modalGrossWeight}
              onChange={(e) => setModalGrossWeight(e.target.value)}
            />
            <Input
              label="Tare Weight (kg) *"
              type="number"
              placeholder="e.g. 10000"
              value={modalTareWeight}
              onChange={(e) => setModalTareWeight(e.target.value)}
            />
            {modalGrossWeight && modalTareWeight && (
              <div className="p-3 bg-gray-100 rounded-lg text-sm font-semibold text-gray-900">
                Net Weight: {(parseFloat(modalGrossWeight) - parseFloat(modalTareWeight)).toLocaleString('en-US')} kg ({((parseFloat(modalGrossWeight) - parseFloat(modalTareWeight)) / 1000).toFixed(2)} tons)
              </div>
            )}
            <Input
              label="Operator Name"
              placeholder="Enter operator name"
              value={modalOperatorName}
              onChange={(e) => setModalOperatorName(e.target.value)}
            />
          </div>
        }
        footer={
          <div className="flex gap-3">
            <Button variant="secondary" onClick={() => setShowWbModal(false)}>
              Cancel
            </Button>
            <Button variant="primary" onClick={handleAddBuyerWeighbridge} disabled={submittingWb}>
              {submittingWb ? 'Saving...' : 'Save Weighbridge Entry & Deliver'}
            </Button>
          </div>
        }
      />
    </div>
  );
}
