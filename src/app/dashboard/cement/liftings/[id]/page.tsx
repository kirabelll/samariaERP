'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { Card, CardBody, CardHeader, Badge, Button, Input, ConfirmDialog, Modal } from '@/components/ui';
import { ChevronLeft, Loader, Truck, Factory, Weight, FileText, Receipt, User, CreditCard, AlertTriangle, Trash2, CheckCircle, Edit, Scale, ExternalLink } from 'lucide-react';

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
  podNumber?: string;
  padNumber?: string;
  notes?: string;
  liftingDate: string;
  status: string;
  registeredBy?: string;
  createdAt?: string;
  customerUnitPrice?: number;
  customerAgreementPrice?: number;
  customerAgreementNo?: string;
  customerAgreementValidity?: {
    validFrom?: string;
    validTo?: string;
    isDateValid?: boolean;
  } | null;
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

  // Linked weighbridge data
  interface LinkedWbEntry {
    id: string;
    weighbridgeNo: string;
    weighbridgeType: string;
    netWeight: number;
    verified: boolean;
    weighbridgeDate: string;
    operatorName?: string;
  }
  const [linkedWbEntries, setLinkedWbEntries] = useState<LinkedWbEntry[]>([]);
  const [buyerWbEntries, setBuyerWbEntries] = useState<LinkedWbEntry[]>([]);
  const [buyerWbTotal, setBuyerWbTotal] = useState<number>(0);
  const [manualBuyerQty, setManualBuyerQty] = useState<string>('');
  const [manualDeliveryNoteNo, setManualDeliveryNoteNo] = useState<string>('');
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

  const fetchLinkedWeighbridge = async () => {
    try {
      const res = await fetch(`/api/cement/weighbridge?liftingId=${id}&limit=100`);
      const result = await res.json();
      if (result.success && Array.isArray(result.data)) {
        const allLinked: LinkedWbEntry[] = result.data.map((e: any) => ({
          id: e.id,
          weighbridgeNo: e.weighbridgeNo,
          weighbridgeType: e.weighbridgeType,
          netWeight: Number(e.netWeight) || 0,
          verified: e.verified,
          weighbridgeDate: e.weighbridgeDate || e.createdAt,
          operatorName: e.operatorName,
        }));
        setLinkedWbEntries(allLinked);

        const buyerOnly = allLinked.filter((e) => e.weighbridgeType === 'BUYER');
        setBuyerWbEntries(buyerOnly);

        const verifiedTotal = buyerOnly
          .filter((e) => e.verified)
          .reduce((sum: number, e) => sum + (Number(e.netWeight) || 0), 0);
        setBuyerWbTotal(verifiedTotal);
        if (verifiedTotal > 0 && !manualBuyerQty) {
          const totalQt = verifiedTotal > 1000 ? verifiedTotal / 100 : verifiedTotal;
          setManualBuyerQty(String(Number(totalQt.toFixed(2))));
        }
      }
    } catch (err) {
      console.error('Failed to fetch linked weighbridge entries:', err);
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
          const rawBw = data.data.buyerWeighbridgeQty;
          const defaultBw = rawBw != null
            ? (Number(rawBw) > 1000 ? Number(rawBw) / 100 : Number(rawBw))
            : data.data.factoryWeight;
          setManualBuyerQty(String(Number(Number(defaultBw).toFixed(2))));
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
    fetchLinkedWeighbridge();
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
        alert('Buyer weighbridge entry recorded successfully!');
        setShowWbModal(false);
        setModalGrossWeight('');
        setModalTareWeight('');
        setModalOperatorName('');
        await fetchLinkedWeighbridge();
        await fetchLifting();
      } else {
        alert(json.error || 'Failed to record weighbridge entry');
      }
    } catch {
      alert('Error recording weighbridge entry');
    } finally {
      setSubmittingWb(false);
    }
  };

  const handleMarkDelivered = async () => {
    const buyerQty = parseFloat(manualBuyerQty);
    if (!buyerQty || buyerQty <= 0) {
      alert('Please enter a valid delivered weight in Quintals (QT).');
      return;
    }

    const factoryW = lifting?.factoryWeight || 0;
    const shortage = factoryW - buyerQty;
    const shortageMsg = shortage > 0
      ? `\n\nShortage detected: ${shortage.toFixed(2)} QT (${factoryW > 0 ? ((shortage / factoryW) * 100).toFixed(1) : 0}%).\nA penalty will be automatically registered.`
      : '';

    if (!confirm(`Mark as Delivered?\n\nFactory Weight: ${lifting?.factoryWeight} QT (${(lifting?.factoryWeight / 10).toFixed(2)} Tons)\nBuyer Weight: ${buyerQty} QT (${(buyerQty / 10).toFixed(2)} Tons)${shortageMsg}\n\nThis will update the cement balance and purchase records.`)) return;

    try {
      setTransitioning(true);
      const res = await fetch(`/api/cement/liftings/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: 'Delivered',
          buyerWeighbridgeQty: buyerQty,
          deliveryNoteNo: manualDeliveryNoteNo.trim() || undefined,
        }),
      });
      const result = await res.json();
      if (result.success) {
        alert(`Delivery confirmed!${result.balance ? ' Balance updated.' : ''}${shortage > 0 ? ` Shortage penalty created for ${shortage.toFixed(2)} QT (${(shortage / 10).toFixed(2)} Tons).` : ''}`);
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

          {/* Edit Button */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => router.push(`/dashboard/cement/liftings/${id}/edit`)}
            className="font-medium"
          >
            <Edit className="w-4 h-4 mr-1.5 text-[#007AFF]" />
            Edit
          </Button>

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
                    {buyerWbEntries.map((e, i) => {
                      const netQt = e.netWeight > 1000 ? (e.netWeight / 100) : e.netWeight;
                      return (
                        <div key={i} className="flex justify-between items-center text-sm p-3 rounded-lg bg-slate-50 border border-slate-200">
                          <div>
                            <span className="font-semibold text-slate-900">{e.weighbridgeNo}</span>
                            <p className="text-xs text-slate-500">{new Date(e.weighbridgeDate).toLocaleDateString()}</p>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-slate-800">{netQt.toFixed(2)} QT <span className="text-xs text-slate-500 font-normal">({(netQt / 10).toFixed(2)} T)</span></span>
                            {e.verified ? (
                              <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-semibold">Verified</span>
                            ) : (
                              <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 font-semibold">Pending</span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                    {(() => {
                      const totalQt = buyerWbTotal > 1000 ? (buyerWbTotal / 100) : buyerWbTotal;
                      return (
                        <div className="flex justify-between items-center text-sm p-3 rounded-lg bg-blue-50 border border-blue-200">
                          <span className="font-semibold text-blue-900">Verified Total (Weighbridge)</span>
                          <span className="font-bold text-blue-900 text-base">{totalQt.toFixed(2)} QT <span className="text-xs text-blue-700 font-normal">({(totalQt / 10).toFixed(2)} Tons)</span></span>
                        </div>
                      );
                    })()}
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
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1">Factory Dispatched Weight</label>
                    <input
                      type="text"
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-slate-100 text-slate-600 font-semibold"
                      value={`${lifting.factoryWeight} QT (${(lifting.factoryWeight / 10).toFixed(2)} Tons)`}
                      disabled
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-emerald-900 uppercase tracking-wider mb-1">
                      Confirmed Buyer Weight (QT) *
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      className="w-full px-3 py-2 border-2 border-emerald-400 rounded-lg text-sm font-bold text-slate-900 focus:ring-2 focus:ring-emerald-500 outline-none bg-white"
                      placeholder="e.g. 400.00"
                      value={manualBuyerQty}
                      onChange={(e) => setManualBuyerQty(e.target.value)}
                      required
                    />
                    <p className="text-[11px] text-slate-500 mt-0.5">Enter weight in Quintals (10 QT = 1 Ton)</p>
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

                {manualBuyerQty && parseFloat(manualBuyerQty) > 0 && (() => {
                  const shortage = lifting.factoryWeight - parseFloat(manualBuyerQty);
                  const pct = lifting.factoryWeight > 0 ? ((shortage / lifting.factoryWeight) * 100).toFixed(1) : '0';
                  if (shortage > 0) {
                    return (
                      <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-800 flex items-center gap-2">
                        <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
                        <span>Shortage detected: <strong>{shortage.toFixed(2)} QT ({pct}%) / {(shortage / 10).toFixed(2)} Tons</strong>. Confirming delivery will automatically create a shortage penalty.</span>
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

            {(lifting.podNumber || lifting.padNumber) && (
              <div>
                <p className="text-xs font-medium text-[#86868B] uppercase tracking-wider mb-2">POD Number</p>
                <p className="text-lg font-semibold text-blue-600 flex items-center gap-2">
                  <Receipt className="w-4 h-4 text-blue-500" />
                  {lifting.podNumber || lifting.padNumber}
                </p>
              </div>
            )}

            {lifting.notes && (
              <div>
                <p className="text-xs font-medium text-[#86868B] uppercase tracking-wider mb-2">Notes</p>
                <p className="text-sm text-slate-700 bg-slate-50 p-2.5 rounded-lg border border-slate-200">
                  {lifting.notes}
                </p>
              </div>
            )}
          </CardBody>
        </Card>

        {/* Right Column */}
        <div className="space-y-4">
          {/* Weighbridge */}
          <Card className="rounded-2xl">
            <CardHeader className="flex justify-between items-center">
              <div className="flex justify-between items-center w-full">
                <h3 className="text-lg font-semibold text-[#1D1D1F] flex items-center gap-2">
                  <Scale className="w-5 h-5 text-[#007AFF]" />
                  Weighbridge
                </h3>
                {linkedWbEntries.length > 0 && (
                  <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
                    {linkedWbEntries.length} Linked
                  </span>
                )}
              </div>
            </CardHeader>
            <CardBody className="space-y-4">
              <div>
                <p className="text-xs font-medium text-[#86868B] uppercase tracking-wider mb-1">Factory Weighbridge Ref</p>
                <p className="text-sm font-semibold text-[#1D1D1F] font-mono">{lifting.factoryWeighbridgeRef}</p>
              </div>
              <div>
                <p className="text-xs font-medium text-[#86868B] uppercase tracking-wider mb-1">Factory Weight</p>
                <p className="text-3xl font-bold text-[#007AFF]">{Number(lifting.factoryWeight || 0).toLocaleString('en-US')} QT</p>
                <p className="text-xs text-slate-500 font-medium mt-0.5">({(Number(lifting.factoryWeight || 0) / 10).toFixed(2)} Tons)</p>
              </div>
              {lifting.buyerWeighbridgeQty != null && lifting.buyerWeighbridgeQty > 0 && (() => {
                const buyerQt = Number(lifting.buyerWeighbridgeQty) > 1000
                  ? Number(lifting.buyerWeighbridgeQty) / 100
                  : Number(lifting.buyerWeighbridgeQty);
                return (
                  <div>
                    <p className="text-xs font-medium text-[#86868B] uppercase tracking-wider mb-1">Buyer Weighbridge</p>
                    <p className="text-2xl font-bold text-[#1D1D1F]">{buyerQt.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 })} QT</p>
                    <p className="text-xs text-slate-500 font-medium mt-0.5">({(buyerQt / 10).toFixed(2)} Tons)</p>
                  </div>
                );
              })()}
              {lifting.shortageQty != null && lifting.shortageQty > 0 && (() => {
                const shortageQt = Number(lifting.shortageQty) > 1000
                  ? Number(lifting.shortageQty) / 100
                  : Number(lifting.shortageQty);
                return (
                  <div className="border-t pt-3">
                    <p className="text-xs font-medium text-red-500 uppercase tracking-wider mb-1">Shortage</p>
                    <p className="text-xl font-bold text-red-600">{shortageQt.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 })} QT</p>
                    <p className="text-xs text-red-500 font-medium mt-0.5">({(shortageQt / 10).toFixed(2)} Tons)</p>
                    {lifting.shortagePenalty != null && lifting.shortagePenalty > 0 && (
                      <p className="text-sm text-red-500 mt-1">Penalty: ETB {Number(lifting.shortagePenalty).toLocaleString('en-US')}</p>
                    )}
                    <Link href="/dashboard/cement/penalties" className="text-xs text-[#007AFF] hover:underline mt-1 block">
                      View Penalties →
                    </Link>
                  </div>
                );
              })()}

              {/* Linked Weighbridge Entries with Direct View Links */}
              {linkedWbEntries.length > 0 && (
                <div className="border-t pt-3 space-y-2">
                  <p className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
                    Linked Weighbridge Entries ({linkedWbEntries.length})
                  </p>
                  <div className="space-y-2">
                    {linkedWbEntries.map((wb) => {
                      const netQt = wb.netWeight > 1000 ? (wb.netWeight / 100) : wb.netWeight;
                      return (
                        <Link
                          key={wb.id}
                          href={`/dashboard/cement/weighbridge/${wb.id}`}
                          className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 hover:bg-blue-50/70 border border-slate-200 hover:border-blue-300 transition-all text-xs group"
                        >
                          <div className="space-y-0.5">
                            <div className="flex items-center gap-1.5">
                              <span className="font-bold text-slate-900 group-hover:text-blue-600 font-mono">
                                {wb.weighbridgeNo}
                              </span>
                              <span className={`text-[10px] px-1.5 py-0.5 rounded font-semibold ${
                                wb.weighbridgeType === 'BUYER' 
                                  ? 'bg-emerald-100 text-emerald-800' 
                                  : 'bg-blue-100 text-blue-800'
                              }`}>
                                {wb.weighbridgeType}
                              </span>
                            </div>
                            <p className="text-[11px] text-slate-500">
                              Net: <strong className="text-slate-800">{netQt.toFixed(2)} QT ({(netQt / 10).toFixed(2)} T)</strong> • {wb.verified ? 'Verified' : 'Pending'}
                            </p>
                          </div>
                          <span className="text-[#007AFF] font-semibold flex items-center gap-0.5 group-hover:translate-x-0.5 transition-transform text-xs">
                            View <ExternalLink className="w-3.5 h-3.5 ml-0.5" />
                          </span>
                        </Link>
                      );
                    })}
                  </div>
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
                <Link
                  href={`/dashboard/cement/weighbridge?liftingId=${id}&liftingNo=${encodeURIComponent(lifting.liftingNo)}`}
                  className="text-xs text-[#007AFF] hover:underline font-semibold block text-center pt-1"
                >
                  View in Weighbridge Register ({linkedWbEntries.length} Linked) →
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
                  ETB {effectiveUnitPrice.toLocaleString('en-US')} / QT
                </p>
                {lifting.customerAgreementNo && (
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Agreement: {lifting.customerAgreementNo}
                    {lifting.customerAgreementValidity?.validFrom && lifting.customerAgreementValidity?.validTo && (
                      <span className="block text-[10px] text-slate-400 mt-0.5">
                        Validity: {new Date(lifting.customerAgreementValidity.validFrom).toLocaleDateString()} → {new Date(lifting.customerAgreementValidity.validTo).toLocaleDateString()}
                        {lifting.customerAgreementValidity.isDateValid ? (
                          <span className="text-emerald-600 font-medium ml-1">✓ Valid</span>
                        ) : (
                          <span className="text-amber-600 font-medium ml-1">⚠ Outside lifting date</span>
                        )}
                      </span>
                    )}
                  </p>
                )}
              </div>
              {lifting.purchase?.unitPrice && (
                <div>
                  <p className="text-xs font-medium text-[#86868B] uppercase tracking-wider mb-1">
                    Factory Purchase Cost
                  </p>
                  <p className="text-sm text-slate-600 font-medium">
                    ETB {Number(lifting.purchase.unitPrice).toLocaleString('en-US')} / QT
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
              <p>Truck: {lifting?.truck?.plateNo || 'N/A'} | Factory Weight: {lifting?.factoryWeight} QT ({(Number(lifting?.factoryWeight || 0) / 10).toFixed(2)} Tons)</p>
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
                Net Weight: {(parseFloat(modalGrossWeight) - parseFloat(modalTareWeight)).toLocaleString('en-US')} kg ({(((parseFloat(modalGrossWeight) - parseFloat(modalTareWeight))) / 100).toFixed(2)} QT / {(((parseFloat(modalGrossWeight) - parseFloat(modalTareWeight))) / 1000).toFixed(2)} Tons)
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
