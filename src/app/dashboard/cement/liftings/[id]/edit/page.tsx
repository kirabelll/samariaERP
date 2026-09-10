'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { Card, CardHeader, CardBody, Button, Input, Badge } from '@/components/ui';
import { ConfirmDialog } from '@/components/ui/Modal';
import { 
  ChevronLeft, 
  Loader, 
  Truck, 
  Factory, 
  Weight, 
  FileText, 
  Receipt, 
  User, 
  CreditCard, 
  AlertTriangle, 
  Trash2, 
  CheckCircle,
  Save,
  Calendar,
  Hash,
  FileCheck,
  ExternalLink
} from 'lucide-react';

interface Purchase {
  id: string;
  purchaseNo: string;
  factoryId: string;
  factory?: { id: string; name: string };
  cementType: string;
  quantityTons: number;
  balanceRemaining: number;
  unitPrice: number;
  status: string;
}

interface TruckOption {
  id: string;
  plateNo: string;
  driverName: string;
  transporterName: string;
}

interface CouponOption {
  id: string;
  couponNo: string;
  tonnage: number | null;
  status: string;
  purchaseId?: string;
  factoryId?: string;
}

interface CementLifting {
  id: string;
  liftingNo: string;
  purchaseId: string;
  factoryId: string;
  truckId: string;
  customerId: string;
  factoryWeighbridgeRef: string;
  factoryWeight: number;
  buyerWeighbridgeQty?: number | null;
  shortageQty?: number | null;
  shortagePenalty?: number | null;
  couponId?: string | null;
  deliveryNoteNo?: string | null;
  padNumber?: string | null;
  notes?: string | null;
  liftingDate: string;
  status: string;
  registeredBy?: string | null;
  customerUnitPrice?: number;
  customerAgreementPrice?: number;
  customerAgreementNo?: string;
  purchase?: Purchase;
  factory?: { id: string; name: string };
  truck?: { id: string; plateNo: string; driverName?: string };
  customer?: { id: string; companyName: string; phone?: string; tin?: string };
  coupon?: { id: string; couponNo: string; status?: string; tonnage?: number };
}

export default function EditCementLiftingPage() {
  const router = useRouter();
  const params = useParams();
  const id = params?.id as string;

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Data sources
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [customers, setCustomers] = useState<{ value: string; label: string }[]>([]);
  const [trucks, setTrucks] = useState<TruckOption[]>([]);
  const [coupons, setCoupons] = useState<CouponOption[]>([]);
  const [loadingCoupons, setLoadingCoupons] = useState(false);

  // Original lifting record
  const [originalLifting, setOriginalLifting] = useState<CementLifting | null>(null);

  // Form State
  const [formData, setFormData] = useState({
    purchaseId: '',
    factoryId: '',
    customerId: '',
    truckId: '',
    factoryWeighbridgeRef: '',
    factoryWeight: '',
    buyerWeighbridgeQty: '',
    couponId: '',
    deliveryNoteNo: '',
    notes: '',
    liftingDate: '',
    status: 'Lifted',
  });

  // Self-Transport Toggle
  const [isSelfTransport, setIsSelfTransport] = useState(false);
  const [selfPlateNo, setSelfPlateNo] = useState('');
  const [selfDriverName, setSelfDriverName] = useState('');

  // Agreement validation
  const [customerHasActiveAgreement, setCustomerHasActiveAgreement] = useState(true);
  const [checkingAgreement, setCheckingAgreement] = useState(false);

  // Credit info
  const [creditInfo, setCreditInfo] = useState<{
    creditLimit: number;
    totalOutstanding: number;
    overLimit: boolean;
  } | null>(null);

  // Derived selections
  const selectedPurchase = purchases.find(p => p.id === formData.purchaseId) || originalLifting?.purchase;
  const selectedTruck = trucks.find(t => t.id === formData.truckId) || (originalLifting?.truck ? {
    id: originalLifting.truck.id,
    plateNo: originalLifting.truck.plateNo,
    driverName: originalLifting.truck.driverName || 'No driver assigned',
    transporterName: 'Assigned Transporter'
  } : undefined);
  const selectedCoupon = coupons.find(c => c.id === formData.couponId) || originalLifting?.coupon;

  // Load initial data
  useEffect(() => {
    if (!id) return;

    const loadAll = async () => {
      setLoading(true);
      setError(null);
      try {
        const [liftingRes, purchasesRes, customersRes, transportersRes, couponsRes] = await Promise.all([
          fetch(`/api/cement/liftings/${id}`),
          fetch('/api/cement/purchases?limit=100'),
          fetch('/api/sales/agreements/customers?division=CEMENT&status=Active'),
          fetch('/api/transporters?limit=200'),
          fetch('/api/cement/coupons?limit=300'),
        ]);

        const liftingData = await liftingRes.json();
        if (!liftingRes.ok || !liftingData.success) {
          throw new Error(liftingData.error || 'Failed to load cement lifting');
        }

        const lifting: CementLifting = liftingData.data;
        setOriginalLifting(lifting);

        // Purchases
        if (purchasesRes.ok) {
          const pJson = await purchasesRes.json();
          if (pJson.success && pJson.data) {
            setPurchases(pJson.data);
          }
        }

        // Customers
        if (customersRes.ok) {
          const cJson = await customersRes.json();
          if (cJson.success && cJson.data) {
            const list = (cJson.data || []).map((c: any) => ({
              value: c.customerId,
              label: `${c.companyName} — ${c.agreementNo}`,
            }));
            // Ensure lifting's current customer is included even if agreement is older
            if (lifting.customerId && !list.some((item: any) => item.value === lifting.customerId)) {
              list.push({
                value: lifting.customerId,
                label: lifting.customer?.companyName || 'Current Customer',
              });
            }
            setCustomers(list);
          }
        }

        // Transporters & Trucks
        if (transportersRes.ok) {
          const tJson = await transportersRes.json();
          if (tJson.success && tJson.data) {
            const allTrucks: TruckOption[] = [];
            (tJson.data || []).forEach((t: any) => {
              if (t.trucks && Array.isArray(t.trucks)) {
                t.trucks.forEach((truck: any) => {
                  allTrucks.push({
                    id: truck.id,
                    plateNo: truck.plateNo,
                    driverName: truck.driverName || 'No driver assigned',
                    transporterName: t.companyName || t.name || 'Unknown',
                  });
                });
              }
            });
            setTrucks(allTrucks);
          }
        }

        // Coupons
        if (couponsRes.ok) {
          const cJson = await couponsRes.json();
          if (cJson.success && cJson.data) {
            const usableStatuses = ['COLLECTED', 'IN_CUSTODY', 'HANDED_OVER', 'USED'];
            const allCoupons = (cJson.data || [])
              .filter((c: any) => usableStatuses.includes(c.status))
              .map((c: any) => ({
                id: c.id,
                couponNo: c.couponNo,
                tonnage: c.tonnage,
                status: c.status,
                purchaseId: c.purchaseId,
                factoryId: c.factoryId,
              }));
            setCoupons(allCoupons);
          }
        }

        // Populate Form
        setFormData({
          purchaseId: lifting.purchaseId || '',
          factoryId: lifting.factoryId || '',
          customerId: lifting.customerId || '',
          truckId: lifting.truckId || '',
          factoryWeighbridgeRef: lifting.factoryWeighbridgeRef || '',
          factoryWeight: lifting.factoryWeight ? String(lifting.factoryWeight) : '',
          buyerWeighbridgeQty: lifting.buyerWeighbridgeQty != null ? String(lifting.buyerWeighbridgeQty) : '',
          couponId: lifting.couponId || '',
          deliveryNoteNo: lifting.deliveryNoteNo || '',
          notes: lifting.notes || '',
          liftingDate: lifting.liftingDate ? new Date(lifting.liftingDate).toISOString().split('T')[0] : '',
          status: lifting.status || 'Lifted',
        });

      } catch (err: any) {
        setError(err.message || 'Error loading lifting record');
      } finally {
        setLoading(false);
      }
    };

    loadAll();
  }, [id]);

  // Check customer active agreement when customer changes
  useEffect(() => {
    if (!formData.customerId) {
      setCustomerHasActiveAgreement(true);
      return;
    }
    setCheckingAgreement(true);
    fetch(`/api/sales/agreements?customerId=${formData.customerId}&status=Active&division=CEMENT&limit=1`)
      .then(r => r.json())
      .then(json => {
        if (json.success) {
          setCustomerHasActiveAgreement((json.data || []).length > 0);
        } else {
          setCustomerHasActiveAgreement(false);
        }
      })
      .catch(() => setCustomerHasActiveAgreement(true))
      .finally(() => setCheckingAgreement(false));
  }, [formData.customerId]);

  // Check customer credit limit
  useEffect(() => {
    if (!formData.customerId) {
      setCreditInfo(null);
      return;
    }
    fetch('/api/finance/customer-history?search=')
      .then(r => r.json())
      .then(json => {
        if (json.success && json.data) {
          const customer = json.data.find((c: any) => c.id === formData.customerId);
          if (customer && customer.creditLimit > 0) {
            const overLimit = customer.totalOutstanding > customer.creditLimit;
            setCreditInfo({
              creditLimit: customer.creditLimit,
              totalOutstanding: customer.totalOutstanding,
              overLimit,
            });
          } else {
            setCreditInfo(null);
          }
        }
      })
      .catch(() => setCreditInfo(null));
  }, [formData.customerId]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    if (name === 'purchaseId') {
      const selected = purchases.find(p => p.id === value);
      setFormData(prev => ({
        ...prev,
        purchaseId: value,
        factoryId: selected?.factoryId || prev.factoryId,
        couponId: '', // Reset coupon when purchase changes
      }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  // Shortage calculations
  const calculateShortage = () => {
    const fw = parseFloat(formData.factoryWeight) || 0;
    const bw = formData.buyerWeighbridgeQty !== '' ? parseFloat(formData.buyerWeighbridgeQty) : null;
    if (bw === null || isNaN(bw)) return null;
    const shortage = fw - bw;
    const shortagePct = fw > 0 ? (shortage / fw) * 100 : 0;
    const unitPrice = originalLifting?.customerUnitPrice || originalLifting?.purchase?.unitPrice || selectedPurchase?.unitPrice || 0;
    const penaltyAmount = shortage > 0 ? shortage * unitPrice : 0;

    return {
      shortage,
      shortagePct,
      penaltyAmount,
      unitPrice,
    };
  };

  const shortageDetails = calculateShortage();

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.purchaseId || !formData.customerId || !formData.factoryWeighbridgeRef || !formData.factoryWeight) {
      alert('Please fill in all required fields (Purchase, Customer, Weighbridge Ref, Factory Weight)');
      return;
    }

    if (!isSelfTransport && !formData.truckId) {
      alert('Please select a truck or enable Customer Self Transport');
      return;
    }

    setSubmitting(true);
    try {
      const payload: any = {
        purchaseId: formData.purchaseId,
        factoryId: formData.factoryId || selectedPurchase?.factoryId,
        customerId: formData.customerId,
        factoryWeighbridgeRef: formData.factoryWeighbridgeRef.trim(),
        factoryWeight: parseFloat(formData.factoryWeight),
        buyerWeighbridgeQty: formData.buyerWeighbridgeQty !== '' ? parseFloat(formData.buyerWeighbridgeQty) : null,
        couponId: formData.couponId || null,
        deliveryNoteNo: formData.deliveryNoteNo?.trim() || null,
        notes: formData.notes?.trim() || null,
        liftingDate: formData.liftingDate,
        status: formData.status,
      };

      if (isSelfTransport) {
        payload.selfTransport = true;
        payload.selfPlateNo = selfPlateNo;
        payload.selfDriverName = selfDriverName || 'Self';
      } else {
        payload.truckId = formData.truckId;
      }

      const res = await fetch(`/api/cement/liftings/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const json = await res.json();
      if (res.ok && json.success) {
        alert(`Cement Lifting ${json.data?.liftingNo || originalLifting?.liftingNo} updated successfully!`);
        router.push(`/dashboard/cement/liftings/${id}`);
      } else {
        alert(json.error || 'Failed to update cement lifting');
      }
    } catch (err: any) {
      alert('Error updating cement lifting: ' + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      const res = await fetch(`/api/cement/liftings/${id}`, {
        method: 'DELETE',
      });
      const json = await res.json();
      if (res.ok && json.success) {
        alert('Cement lifting deleted successfully');
        setShowDeleteModal(false);
        router.push('/dashboard/cement?tab=liftings');
      } else {
        alert(json.error || 'Failed to delete cement lifting');
      }
    } catch (err: any) {
      alert('Error deleting lifting: ' + err.message);
    } finally {
      setDeleting(false);
    }
  };

  const statusColor = (status: string) => {
    switch (status) {
      case 'Delivered': return 'bg-[#34C759]/10 text-[#248A3D] border-[#34C759]/30';
      case 'Verified': return 'bg-[#007AFF]/10 text-[#0055D4] border-[#007AFF]/30';
      case 'Lifted': return 'bg-[#FF9500]/10 text-[#D97706] border-[#FF9500]/30';
      case 'Cancelled': return 'bg-[#FF3B30]/10 text-[#D70015] border-[#FF3B30]/30';
      default: return 'bg-slate-100 text-slate-700 border-slate-300';
    }
  };

  if (loading) {
    return (
      <div className="space-y-6 max-w-5xl mx-auto py-8">
        <div className="flex items-center gap-2 text-sm text-[#86868B]">
          <Link href="/dashboard/cement?tab=liftings" className="text-[#007AFF] hover:text-[#0055D4]">Cement Liftings</Link>
          <span>/</span>
          <span>Edit</span>
        </div>
        <Card className="rounded-2xl">
          <CardBody className="py-16 text-center">
            <Loader className="w-8 h-8 animate-spin mx-auto text-[#007AFF] mb-4" />
            <p className="text-slate-600 font-medium">Loading lifting details for editing...</p>
          </CardBody>
        </Card>
      </div>
    );
  }

  if (error || !originalLifting) {
    return (
      <div className="space-y-6 max-w-5xl mx-auto py-8">
        <div className="flex items-center gap-2 text-sm text-[#86868B]">
          <Link href="/dashboard/cement?tab=liftings" className="text-[#007AFF] hover:text-[#0055D4]">Cement Liftings</Link>
          <span>/</span>
          <span>Error</span>
        </div>
        <Card className="rounded-2xl border-red-200">
          <CardBody className="py-12 text-center space-y-4">
            <p className="text-red-600 text-lg font-semibold">{error || 'Lifting not found'}</p>
            <Button variant="primary" onClick={() => router.push('/dashboard/cement?tab=liftings')}>
              Back to Cement Liftings
            </Button>
          </CardBody>
        </Card>
      </div>
    );
  }

  // Filter available coupons for selected purchase
  const availableCoupons = coupons.filter(c => 
    !formData.purchaseId || c.purchaseId === formData.purchaseId || c.id === originalLifting.couponId
  );

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-12">
      {/* Breadcrumb Navigation */}
      <div className="flex items-center gap-2 text-sm text-[#86868B]">
        <Link href="/dashboard" className="text-[#007AFF] hover:text-[#0055D4]">Dashboard</Link>
        <span>/</span>
        <Link href="/dashboard/cement?tab=liftings" className="text-[#007AFF] hover:text-[#0055D4]">Cement Liftings</Link>
        <span>/</span>
        <Link href={`/dashboard/cement/liftings/${id}`} className="text-[#007AFF] hover:text-[#0055D4]">
          {originalLifting.liftingNo}
        </Link>
        <span>/</span>
        <span className="text-[#1D1D1F] font-medium">Edit</span>
      </div>

      {/* Header */}
      <div className="flex flex-wrap justify-between items-start gap-4">
        <div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.push(`/dashboard/cement/liftings/${id}`)}
              className="p-1.5 rounded-xl hover:bg-slate-100 text-slate-600 transition-colors"
              title="Back to Details"
            >
              <ChevronLeft className="w-6 h-6" />
            </button>
            <h1 className="text-2xl sm:text-3xl font-bold text-[#1D1D1F]">
              Edit Cement Lifting
            </h1>
            <span className={`text-xs font-semibold px-2.5 py-1 rounded-full border ${statusColor(formData.status)}`}>
              {formData.status}
            </span>
          </div>
          <p className="text-slate-500 text-sm mt-1 ml-10">
            Reference: <strong className="text-slate-800 font-mono">{originalLifting.liftingNo}</strong>
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => router.push(`/dashboard/cement/liftings/${id}`)}
          >
            View Details
          </Button>
          <Button
            variant="danger"
            size="sm"
            onClick={() => setShowDeleteModal(true)}
          >
            <Trash2 className="w-4 h-4 mr-1.5" />
            Delete
          </Button>
        </div>
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        {/* Section 1: Purchase & Factory Selection */}
        <Card className="rounded-2xl overflow-hidden border border-slate-200/80 shadow-sm">
          <CardHeader className="bg-slate-50/80 border-b border-slate-200/80 py-3.5 px-6">
            <h2 className="text-base font-semibold text-slate-900 flex items-center gap-2">
              <Factory className="w-4 h-4 text-blue-600" />
              1. Cement Purchase Order & Factory
            </h2>
          </CardHeader>
          <CardBody className="p-6 space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                Cement Purchase Order *
              </label>
              <select
                name="purchaseId"
                value={formData.purchaseId}
                onChange={handleInputChange}
                className="block w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 bg-white"
                required
              >
                <option value="">Select a Purchase</option>
                {purchases.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.purchaseNo} — {p.factory?.name || 'Factory'} — {p.cementType} (Remaining: {p.balanceRemaining?.toLocaleString('en-US')} QT)
                  </option>
                ))}
              </select>
            </div>

            {selectedPurchase && (
              <div className="bg-blue-50/70 border border-blue-200/80 rounded-xl p-4">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div>
                    <span className="text-xs font-medium text-blue-600 block">Factory</span>
                    <span className="font-semibold text-slate-900">{selectedPurchase.factory?.name || '—'}</span>
                  </div>
                  <div>
                    <span className="text-xs font-medium text-blue-600 block">Cement Type</span>
                    <span className="font-semibold text-slate-900">{selectedPurchase.cementType}</span>
                  </div>
                  <div>
                    <span className="text-xs font-medium text-blue-600 block">Unit Cost</span>
                    <span className="font-semibold text-slate-900">ETB {Number(selectedPurchase.unitPrice || 0).toLocaleString('en-US')} / Ton</span>
                  </div>
                  <div>
                    <span className="text-xs font-medium text-blue-600 block">Purchase Balance</span>
                    <span className="font-bold text-blue-900">{selectedPurchase.balanceRemaining?.toLocaleString('en-US')} QT</span>
                  </div>
                </div>
              </div>
            )}
          </CardBody>
        </Card>

        {/* Section 2: Customer & Transportation */}
        <Card className="rounded-2xl overflow-hidden border border-slate-200/80 shadow-sm">
          <CardHeader className="bg-slate-50/80 border-b border-slate-200/80 py-3.5 px-6">
            <h2 className="text-base font-semibold text-slate-900 flex items-center gap-2">
              <User className="w-4 h-4 text-blue-600" />
              2. Customer & Transportation
            </h2>
          </CardHeader>
          <CardBody className="p-6 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                  Customer (Cement Agreement) *
                </label>
                <select
                  name="customerId"
                  value={formData.customerId}
                  onChange={handleInputChange}
                  className="block w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 bg-white"
                  required
                >
                  <option value="">Select Customer</option>
                  {customers.map((c) => (
                    <option key={c.value} value={c.value}>{c.label}</option>
                  ))}
                </select>
                {checkingAgreement && (
                  <p className="text-xs text-blue-600 mt-1">Checking active Cement agreement...</p>
                )}
                {formData.customerId && !checkingAgreement && !customerHasActiveAgreement && (
                  <p className="text-xs text-amber-600 mt-1 font-medium">
                    ⚠️ Note: Selected customer does not have an active Cement sales agreement.
                  </p>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                  Lifting Date *
                </label>
                <div className="relative">
                  <input
                    type="date"
                    name="liftingDate"
                    value={formData.liftingDate}
                    onChange={handleInputChange}
                    className="block w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                    required
                  />
                </div>
              </div>
            </div>

            {/* Credit Info Warning if over limit */}
            {creditInfo && creditInfo.overLimit && (
              <div className="bg-amber-50 border border-amber-300 rounded-xl p-3 text-xs text-amber-900 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                <span>
                  Credit limit exceeded for this customer (Limit: ETB {creditInfo.creditLimit.toLocaleString('en-US')}, Current Outstanding: ETB {creditInfo.totalOutstanding.toLocaleString('en-US')}).
                </span>
              </div>
            )}

            {/* Self-Transport Toggle */}
            <label className="flex items-center gap-3 cursor-pointer bg-slate-50 rounded-xl px-4 py-3 border border-slate-200 hover:border-blue-300 transition-colors">
              <input
                type="checkbox"
                checked={isSelfTransport}
                onChange={(e) => {
                  setIsSelfTransport(e.target.checked);
                  if (e.target.checked) setFormData(prev => ({ ...prev, truckId: '' }));
                }}
                className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
              />
              <div>
                <span className="text-sm font-medium text-slate-800">Customer Self-Transport</span>
                <p className="text-xs text-slate-500">The customer will haul the cement using their own truck</p>
              </div>
            </label>

            {/* Transporter Truck Selection */}
            {!isSelfTransport ? (
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                  Transporter Truck (Plate & Driver) *
                </label>
                <select
                  name="truckId"
                  value={formData.truckId}
                  onChange={handleInputChange}
                  className="block w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 bg-white"
                  required={!isSelfTransport}
                >
                  <option value="">Select Truck</option>
                  {trucks.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.plateNo} — Driver: {t.driverName} ({t.transporterName})
                    </option>
                  ))}
                </select>
                {selectedTruck && (
                  <p className="text-xs text-slate-500 mt-1.5">
                    Selected Plate: <strong className="text-slate-800">{selectedTruck.plateNo}</strong> | Driver: <strong className="text-slate-800">{selectedTruck.driverName}</strong>
                  </p>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-slate-50/50 p-4 rounded-xl border border-slate-200">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                    Self-Transport Plate No.
                  </label>
                  <Input
                    placeholder="e.g. 3-12345"
                    value={selfPlateNo}
                    onChange={(e) => setSelfPlateNo(e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                    Driver Name
                  </label>
                  <Input
                    placeholder="e.g. Abebe Kebede"
                    value={selfDriverName}
                    onChange={(e) => setSelfDriverName(e.target.value)}
                  />
                </div>
              </div>
            )}
          </CardBody>
        </Card>

        {/* Section 3: Weighbridge, Weights & Pad Number */}
        <Card className="rounded-2xl overflow-hidden border border-slate-200/80 shadow-sm">
          <CardHeader className="bg-slate-50/80 border-b border-slate-200/80 py-3.5 px-6 flex justify-between items-center">
            <div className="flex justify-between items-center w-full">
              <h2 className="text-base font-semibold text-slate-900 flex items-center gap-2">
                <Weight className="w-4 h-4 text-blue-600" />
                3. Weighbridge Measurements, Delivery Pad & Documents
              </h2>
              <Link
                href={`/dashboard/cement/weighbridge?liftingId=${id}&liftingNo=${encodeURIComponent(originalLifting.liftingNo)}`}
                target="_blank"
                className="text-xs text-blue-600 hover:text-blue-800 font-medium flex items-center gap-1 hover:underline"
              >
                View Linked Weighbridge Entries <ExternalLink className="w-3.5 h-3.5" />
              </Link>
            </div>
          </CardHeader>
          <CardBody className="p-6 space-y-5">
            {/* Weights row */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                  Factory Weighbridge Ref *
                </label>
                <Input
                  name="factoryWeighbridgeRef"
                  placeholder="e.g. WB-2026-0042"
                  value={formData.factoryWeighbridgeRef}
                  onChange={handleInputChange}
                  required
                />
                <p className="text-xs text-slate-500 mt-1">Ticket reference issued at factory weighbridge</p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                  Factory Weight (Tons / QT) *
                </label>
                <input
                  type="number"
                  name="factoryWeight"
                  step="0.01"
                  min="0.01"
                  placeholder="e.g. 40.00"
                  value={formData.factoryWeight}
                  onChange={handleInputChange}
                  className="block w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm font-semibold text-slate-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                  required
                />
                <p className="text-xs text-slate-500 mt-1">Dispatched weight from factory scale</p>
              </div>
            </div>

            {/* Buyer Weight & Shortage */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                  Buyer Delivered Weight (Tons / QT)
                </label>
                <input
                  type="number"
                  name="buyerWeighbridgeQty"
                  step="0.01"
                  min="0"
                  placeholder="e.g. 39.80 (leave blank if not yet weighed)"
                  value={formData.buyerWeighbridgeQty}
                  onChange={handleInputChange}
                  className="block w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm font-semibold text-emerald-800 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
                />
                <p className="text-xs text-slate-500 mt-1">Weight received at customer destination / buyer weighbridge</p>
              </div>

              {/* Shortage indicator */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                  Calculated Shortage
                </label>
                {shortageDetails ? (
                  <div className={`p-3 rounded-xl border text-sm flex items-center justify-between ${
                    shortageDetails.shortage > 0 
                      ? 'bg-red-50/80 border-red-200 text-red-900 font-medium' 
                      : 'bg-emerald-50/80 border-emerald-200 text-emerald-900 font-medium'
                  }`}>
                    <span>
                      {shortageDetails.shortage > 0 ? (
                        <>Shortage: <strong>{shortageDetails.shortage.toFixed(2)} Tons</strong> ({shortageDetails.shortagePct.toFixed(1)}%)</>
                      ) : (
                        <>No Shortage (Delivered &ge; Factory Weight)</>
                      )}
                    </span>
                    {shortageDetails.shortage > 0 && (
                      <span className="text-xs font-bold text-red-700 bg-red-100 px-2 py-1 rounded-lg">
                        Penalty: ETB {shortageDetails.penaltyAmount.toLocaleString('en-US')}
                      </span>
                    )}
                  </div>
                ) : (
                  <div className="p-3 rounded-xl border border-dashed border-slate-200 text-xs text-slate-400">
                    Enter buyer weight to calculate shortage
                  </div>
                )}
              </div>
            </div>

            {/* Delivery Note */}
            <div className="pt-2">
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                  Delivery Note / GRN No.
                </label>
                <Input
                  name="deliveryNoteNo"
                  placeholder="e.g. DN-2026-0504"
                  value={formData.deliveryNoteNo}
                  onChange={handleInputChange}
                />
                <p className="text-xs text-slate-500 mt-1">Official dispatch delivery note number</p>
              </div>
            </div>

            {/* Coupon Selection */}
            <div className="pt-2">
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                Linked Coupon (Optional)
              </label>
              <select
                name="couponId"
                value={formData.couponId}
                onChange={handleInputChange}
                disabled={loadingCoupons}
                className="w-full border border-slate-300 rounded-xl px-3.5 py-2.5 text-sm bg-white focus:ring-2 focus:ring-[#007AFF] outline-none"
              >
                <option value="">-- No Coupon Linked --</option>
                {availableCoupons.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.couponNo} ({c.tonnage ? `${c.tonnage} QT` : 'Standard'}) — {c.status}
                  </option>
                ))}
              </select>
              {loadingCoupons && (
                <p className="text-xs text-blue-600 mt-1">Loading available coupons...</p>
              )}
            </div>
          </CardBody>
        </Card>

        {/* Section 4: Status & Notes */}
        <Card className="rounded-2xl overflow-hidden border border-slate-200/80 shadow-sm">
          <CardHeader className="bg-slate-50/80 border-b border-slate-200/80 py-3.5 px-6">
            <h2 className="text-base font-semibold text-slate-900 flex items-center gap-2">
              <FileCheck className="w-4 h-4 text-blue-600" />
              4. Status & Notes
            </h2>
          </CardHeader>
          <CardBody className="p-6 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                  Lifting Status
                </label>
                <select
                  name="status"
                  value={formData.status}
                  onChange={handleInputChange}
                  className="block w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm font-semibold focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 bg-white"
                >
                  <option value="Lifted">Lifted (Dispatched from Factory)</option>
                  <option value="Delivered">Delivered (Arrived at Destination)</option>
                  <option value="Verified">Verified (Confirmed & Reconciled)</option>
                  <option value="Cancelled">Cancelled (Void)</option>
                </select>
                <p className="text-xs text-slate-500 mt-1">Change status as the delivery progresses</p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                  Remarks / Notes
                </label>
                <textarea
                  name="notes"
                  rows={2}
                  value={formData.notes}
                  onChange={handleInputChange}
                  placeholder="Optional delivery notes, condition on arrival, driver remarks..."
                  className="block w-full rounded-xl border border-slate-300 px-3.5 py-2 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none"
                />
              </div>
            </div>
          </CardBody>
        </Card>

        {/* Section 5: Financial Summary */}
        <Card className="rounded-2xl bg-gradient-to-br from-slate-900 to-slate-800 text-white shadow-md overflow-hidden">
          <CardBody className="p-6">
            <h3 className="text-sm font-semibold text-slate-300 uppercase tracking-wider mb-4">
              Financial Summary
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-center sm:text-left">
              <div>
                <span className="text-xs text-slate-400 block mb-1">Customer Unit Price</span>
                <span className="text-lg font-bold text-blue-300">
                  ETB {Number(originalLifting.customerUnitPrice || selectedPurchase?.unitPrice || 0).toLocaleString('en-US')}
                </span>
                {originalLifting.customerAgreementNo && (
                  <span className="text-[11px] text-slate-400 block">{originalLifting.customerAgreementNo}</span>
                )}
              </div>
              <div>
                <span className="text-xs text-slate-400 block mb-1">Factory Weight</span>
                <span className="text-lg font-bold text-white">
                  {formData.factoryWeight ? `${Number(formData.factoryWeight).toLocaleString('en-US')} QT` : '—'}
                </span>
              </div>
              <div>
                <span className="text-xs text-slate-400 block mb-1">Total Estimated Value</span>
                <span className="text-2xl font-black text-emerald-400">
                  ETB {(
                    (parseFloat(formData.factoryWeight) || 0) * 
                    Number(originalLifting.customerUnitPrice || selectedPurchase?.unitPrice || 0)
                  ).toLocaleString('en-US')}
                </span>
              </div>
            </div>
          </CardBody>
        </Card>

        {/* Actions Bar */}
        <div className="flex items-center gap-3 pt-4">
          <Button
            type="submit"
            variant="primary"
            size="lg"
            isLoading={submitting}
            disabled={submitting}
            className="flex-1 bg-[#007AFF] hover:bg-[#0055D4] text-white font-semibold py-3 rounded-xl shadow-sm"
          >
            <Save className="w-4 h-4 mr-2" />
            {submitting ? 'Saving Changes...' : 'Save Lifting Changes'}
          </Button>
          <Button
            type="button"
            variant="outline"
            size="lg"
            onClick={() => router.push(`/dashboard/cement/liftings/${id}`)}
            className="px-8 py-3 rounded-xl font-medium"
          >
            Cancel
          </Button>
        </div>
      </form>

      {/* Delete Confirmation Modal */}
      <ConfirmDialog
        isOpen={showDeleteModal}
        title="Delete Cement Lifting"
        message={`Are you sure you want to delete lifting ${originalLifting.liftingNo}? This will revert the purchase balance, unlink coupons, and remove associated penalties.`}
        confirmText="Delete Lifting"
        cancelText="Cancel"
        isDangerous
        isLoading={deleting}
        onConfirm={handleDelete}
        onClose={() => setShowDeleteModal(false)}
      />
    </div>
  );
}
