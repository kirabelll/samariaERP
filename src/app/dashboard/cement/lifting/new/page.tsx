'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardHeader, CardBody, Button, Input } from '@/components/ui';
import FileUpload from '@/components/ui/FileUpload';
import { uploadDocument } from '@/lib/upload-helper';

interface Purchase {
  id: string;
  purchaseNo: string;
  factoryId: string;
  factory?: { id: string; name: string };
  cementType: string;
  quantityTons: number;
  balanceRemaining: number;
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
}

export default function NewCementLiftingPage() {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [weighbridgeFiles, setWeighbridgeFiles] = useState<File[]>([]);

  // Data sources
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [customers, setCustomers] = useState<{ value: string; label: string }[]>([]);
  const [trucks, setTrucks] = useState<TruckOption[]>([]);
  const [coupons, setCoupons] = useState<CouponOption[]>([]);
  const [loadingCoupons, setLoadingCoupons] = useState(false);
  const [loadingData, setLoadingData] = useState(true);

  // Form fields
  const [purchaseId, setPurchaseId] = useState('');
  const [customerId, setCustomerId] = useState('');
  const [truckId, setTruckId] = useState('');
  const [factoryWeighbridgeRef, setFactoryWeighbridgeRef] = useState('');
  const [factoryWeight, setFactoryWeight] = useState('');
  const [couponId, setCouponId] = useState('');
  const [padNumber, setPadNumber] = useState('');
  const [deliveryNoteNo, setDeliveryNoteNo] = useState('');
  const [liftingDate, setLiftingDate] = useState(new Date().toISOString().split('T')[0]);

  // Agreement validation
  const [customerHasActiveAgreement, setCustomerHasActiveAgreement] = useState(true);
  const [checkingAgreement, setCheckingAgreement] = useState(false);

  // Credit limit state
  const [creditInfo, setCreditInfo] = useState<{
    creditLimit: number;
    totalOutstanding: number;
    overLimit: boolean;
  } | null>(null);
  const [loadingCredit, setLoadingCredit] = useState(false);
  const [overrideCreditLimit, setOverrideCreditLimit] = useState(false);

  // Self-transport fields
  const [isSelfTransport, setIsSelfTransport] = useState(false);
  const [selfPlateNo, setSelfPlateNo] = useState('');
  const [selfDriverName, setSelfDriverName] = useState('');

  // Derived from selection
  const selectedPurchase = purchases.find(p => p.id === purchaseId);
  const selectedTruck = trucks.find(t => t.id === truckId);

  useEffect(() => {
    let loaded = 0;
    const checkDone = () => { loaded++; if (loaded >= 3) setLoadingData(false); };

    // Only show Active purchases (approved AND paid) that have balance
    fetch('/api/cement/purchases?limit=100')
      .then(r => r.json())
      .then(json => {
        if (json.success) {
          const available = (json.data || []).filter((p: Purchase) =>
            p.status === 'Active' && p.balanceRemaining > 0
          );
          setPurchases(available);
        }
      })
      .catch(console.error)
      .finally(checkDone);

    // Fetch customers from sales agreements (only active CEMENT division agreements)
    fetch('/api/sales/agreements/customers?division=CEMENT&status=Active')
      .then(r => r.json())
      .then(json => {
        if (json.success && json.data) {
          const customerList = (json.data || [])
            .map((c: any) => ({
              value: c.customerId,
              label: `${c.companyName} — ${c.agreementNo}`,
            }))
            .filter((c: any) => c.label);
          setCustomers(customerList);
        }
      })
      .catch(console.error)
      .finally(checkDone);

    // Fetch transporters to get trucks
    fetch('/api/transporters?limit=200')
      .then(r => r.json())
      .then(json => {
        if (json.success && json.data) {
          const allTrucks: TruckOption[] = [];
          (json.data || []).forEach((t: any) => {
            if (t.trucks && Array.isArray(t.trucks)) {
              t.trucks.forEach((truck: any) => {
                if (truck.status === 'Active' || !truck.status) {
                  allTrucks.push({
                    id: truck.id,
                    plateNo: truck.plateNo,
                    driverName: truck.driverName || 'No driver assigned',
                    transporterName: t.companyName || t.name || 'Unknown',
                  });
                }
              });
            }
          });
          setTrucks(allTrucks);
        }
      })
      .catch(console.error)
      .finally(checkDone);
  }, []);

  // Fetch available coupons when purchase changes
  useEffect(() => {
    if (!purchaseId) {
      setCoupons([]);
      setCouponId('');
      return;
    }
    const selectedP = purchases.find(p => p.id === purchaseId);
    if (!selectedP) return;

    setLoadingCoupons(true);
    setCouponId('');
    fetch(`/api/cement/coupons?factoryId=${selectedP.factoryId}&limit=200`)
      .then(r => r.json())
      .then(json => {
        if (json.success && json.data) {
          const usableStatuses = ['COLLECTED', 'IN_CUSTODY', 'HANDED_OVER'];
          const available = (json.data || [])
            .filter((c: any) => usableStatuses.includes(c.status) && c.purchaseId === purchaseId)
            .map((c: any) => ({
              id: c.id,
              couponNo: c.couponNo,
              tonnage: c.tonnage,
              status: c.status,
            }));
          setCoupons(available);
        }
      })
      .catch(console.error)
      .finally(() => setLoadingCoupons(false));
  }, [purchaseId, purchases]);

  // Check if the selected customer has an Active CEMENT sales agreement
  useEffect(() => {
    if (!customerId) {
      setCustomerHasActiveAgreement(true);
      setCheckingAgreement(false);
      return;
    }
    setCheckingAgreement(true);
    fetch(`/api/sales/agreements?customerId=${customerId}&status=Active&division=CEMENT&limit=1`)
      .then(r => r.json())
      .then(json => {
        if (json.success) {
          setCustomerHasActiveAgreement((json.data || []).length > 0);
        } else {
          setCustomerHasActiveAgreement(false);
        }
      })
      .catch(() => {
        setCustomerHasActiveAgreement(false);
      })
      .finally(() => setCheckingAgreement(false));
  }, [customerId]);

  // Check credit limit when customer changes
  useEffect(() => {
    if (!customerId) {
      setCreditInfo(null);
      setOverrideCreditLimit(false);
      return;
    }
    setLoadingCredit(true);
    setOverrideCreditLimit(false);
    fetch(`/api/finance/customer-history?search=`)
      .then(r => r.json())
      .then(json => {
        if (json.success && json.data) {
          const customer = json.data.find((c: any) => c.id === customerId);
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
      .catch(() => setCreditInfo(null))
      .finally(() => setLoadingCredit(false));
  }, [customerId]);

  const selectedCoupon = coupons.find(c => c.id === couponId);

  const fmt = (val: number) =>
    `ETB ${val.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  const handleSave = async () => {
    if (!purchaseId || !customerId || !factoryWeighbridgeRef || !factoryWeight) {
      alert('Please fill in all required fields (Purchase, Customer, Weighbridge Ref, Factory Weight)');
      return;
    }

    if (!customerHasActiveAgreement) {
      alert('Cannot create lifting: the selected customer has no active sales agreement.');
      return;
    }

    if (!isSelfTransport && !truckId) {
      alert('Please select a truck or enable Self Transport');
      return;
    }

    if (!selectedPurchase) {
      alert('Please select a valid purchase');
      return;
    }

    // STRICT: if coupons exist for this purchase, one MUST be selected
    if (coupons.length > 0 && !couponId) {
      alert('This purchase has available coupons. You MUST select a coupon before recording a lifting.');
      return;
    }

    setSubmitting(true);
    try {
      const payload: any = {
        purchaseId,
        factoryId: selectedPurchase.factoryId,
        customerId,
        factoryWeighbridgeRef,
        factoryWeight: parseFloat(factoryWeight),
        couponId: couponId || null,
        padNumber: padNumber.trim() || null,
        deliveryNoteNo: deliveryNoteNo.trim() || null,
        liftingDate,
        ...(overrideCreditLimit ? { overrideCreditLimit: true } : {}),
      };

      if (isSelfTransport) {
        payload.selfTransport = true;
        payload.selfPlateNo = selfPlateNo;
        payload.selfDriverName = selfDriverName || 'Self';
      } else {
        payload.truckId = truckId;
      }

      const res = await fetch('/api/cement/liftings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (data.success) {
        if (weighbridgeFiles.length > 0) {
          const recordId = data.data?.id?.toString() || 'new';
          for (const file of weighbridgeFiles) {
            await uploadDocument(file, 'CEMENT', recordId, 'weighbridge');
          }
        }
        alert(`Cement Lifting ${data.data?.liftingNo || ''} saved successfully!`);
        router.push('/dashboard/cement');
      } else {
        alert(data.error || 'Failed to save lifting record');
      }
    } catch {
      alert('Failed to save lifting record');
    }
    setSubmitting(false);
  };

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <button
          onClick={() => router.push('/dashboard/cement')}
          className="text-blue-600 hover:text-blue-800 text-sm font-medium mb-2 block"
        >
          &larr; Back to Cement Operations
        </button>
        <h1 className="text-2xl sm:text-3xl font-bold text-[#1D1D1F]">New Cement Lifting</h1>
        <p className="text-slate-500 text-sm mt-1">Record a truck dispatch from the factory</p>
      </div>

      {/* Purchase Selection */}
      <Card>
        <CardHeader>
          <h2 className="text-lg font-semibold text-[#1D1D1F]">1. Select Cement Purchase</h2>
        </CardHeader>
        <CardBody className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Cement Purchase *</label>
            <select
              value={purchaseId}
              onChange={(e) => setPurchaseId(e.target.value)}
              className="block w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
              required
            >
              <option value="">Select a Purchase</option>
              {purchases.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.purchaseNo} — {p.factory?.name || 'Factory'} — {p.cementType} — Balance: {p.balanceRemaining?.toLocaleString('en-US')} QT
                </option>
              ))}
            </select>
            {!loadingData && purchases.length === 0 && (
              <p className="text-amber-600 text-xs mt-1">No active/approved purchases with remaining balance found.</p>
            )}
            {loadingData && <p className="text-blue-600 text-xs mt-1">Loading purchases...</p>}
          </div>

          {selectedPurchase && (
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                <div>
                  <span className="text-blue-600 font-medium block">Factory</span>
                  <span className="text-slate-900">{selectedPurchase.factory?.name || '—'}</span>
                </div>
                <div>
                  <span className="text-blue-600 font-medium block">Cement Type</span>
                  <span className="text-slate-900">{selectedPurchase.cementType}</span>
                </div>
                <div>
                  <span className="text-blue-600 font-medium block">Total Quantity</span>
                  <span className="text-slate-900">{selectedPurchase.quantityTons?.toLocaleString('en-US')} QT</span>
                </div>
                <div>
                  <span className="text-blue-600 font-medium block">Remaining Balance</span>
                  <span className="text-slate-900 font-bold">{selectedPurchase.balanceRemaining?.toLocaleString('en-US')} QT</span>
                </div>
              </div>
            </div>
          )}
        </CardBody>
      </Card>

      {/* Customer & Truck */}
      <Card>
        <CardHeader>
          <h2 className="text-lg font-semibold text-[#1D1D1F]">2. Customer & Truck</h2>
        </CardHeader>
        <CardBody className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Customer (Cement Sales Agreement) *</label>
              <select
                value={customerId}
                onChange={(e) => setCustomerId(e.target.value)}
                className="block w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                required
              >
                <option value="">Select Customer (Cement Agreement)</option>
                {customers.map((c) => (
                  <option key={c.value} value={c.value}>{c.label}</option>
                ))}
              </select>
              {!loadingData && customers.length === 0 && (
                <p className="text-amber-600 text-xs mt-1">No customers with active Cement division sales agreements found.</p>
              )}
              {checkingAgreement && (
                <p className="text-blue-600 text-xs mt-1">Checking Cement agreement status...</p>
              )}
              {customerId && !checkingAgreement && !customerHasActiveAgreement && (
                <div className="bg-red-50 border border-red-300 rounded-lg px-3 py-2 mt-2 text-sm text-red-700 font-medium">
                  This customer does not have an Active Cement division sales agreement. Lifting cannot be created.
                </div>
              )}
              {loadingCredit && customerId && (
                <p className="text-blue-600 text-xs mt-1">Checking credit status...</p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Lifting Date</label>
              <input
                type="date"
                value={liftingDate}
                onChange={(e) => setLiftingDate(e.target.value)}
                className="block w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
              />
            </div>
          </div>

          {/* Credit Limit Warning */}
          {creditInfo && creditInfo.overLimit && (
            <div className="bg-red-50 border-2 border-red-300 rounded-xl p-4 space-y-3">
              <div className="flex items-start gap-2">
                <svg className="w-5 h-5 text-red-600 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
                </svg>
                <div className="text-sm">
                  <p className="font-bold text-red-700">Credit Limit Exceeded</p>
                  <p className="text-red-600 mt-1">
                    Credit Limit: <strong>{fmt(creditInfo.creditLimit)}</strong>
                    <span className="mx-2">|</span>
                    Current Outstanding: <strong>{fmt(creditInfo.totalOutstanding)}</strong>
                    <span className="mx-2">|</span>
                    Over by: <strong>{fmt(creditInfo.totalOutstanding - creditInfo.creditLimit)}</strong>
                  </p>
                </div>
              </div>
              <label className="flex items-center gap-3 cursor-pointer bg-white rounded-lg px-3 py-2 border border-red-200">
                <input
                  type="checkbox"
                  checked={overrideCreditLimit}
                  onChange={(e) => setOverrideCreditLimit(e.target.checked)}
                  className="w-5 h-5 rounded border-red-300 text-red-600 focus:ring-red-500"
                />
                <div>
                  <span className="text-sm font-semibold text-red-700">Manager Override - Proceed despite credit limit</span>
                  <p className="text-xs text-red-500">Check this box only with manager approval to bypass the credit limit check.</p>
                </div>
              </label>
            </div>
          )}

          {/* Credit info (within limit) */}
          {creditInfo && !creditInfo.overLimit && (
            <div className="bg-green-50 border border-green-200 rounded-xl px-4 py-2 text-sm text-green-800">
              Credit Limit: <strong>{fmt(creditInfo.creditLimit)}</strong>
              <span className="mx-2">|</span>
              Outstanding: <strong>{fmt(creditInfo.totalOutstanding)}</strong>
              <span className="mx-2">|</span>
              Available: <strong>{fmt(creditInfo.creditLimit - creditInfo.totalOutstanding)}</strong>
            </div>
          )}

          {/* Self-Transport Toggle */}
          <label className="flex items-center gap-3 cursor-pointer bg-slate-50 rounded-xl px-4 py-3 border border-slate-200 hover:border-blue-300 transition-colors">
            <input
              type="checkbox"
              checked={isSelfTransport}
              onChange={(e) => {
                setIsSelfTransport(e.target.checked);
                if (e.target.checked) setTruckId('');
                else { setSelfPlateNo(''); setSelfDriverName(''); }
              }}
              className="w-5 h-5 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
            />
            <div>
              <span className="text-sm font-medium text-slate-700">Customer Self Transport</span>
              <p className="text-xs text-slate-500">The customer is using their own truck (no transport agreement needed)</p>
            </div>
          </label>

          {/* Transporter Truck Selection */}
          {!isSelfTransport && (
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Truck (Plate & Driver) *</label>
              <select
                value={truckId}
                onChange={(e) => setTruckId(e.target.value)}
                className="block w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                required
              >
                <option value="">Select Truck</option>
                {trucks.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.plateNo} — Driver: {t.driverName} ({t.transporterName})
                  </option>
                ))}
              </select>
              {!loadingData && trucks.length === 0 && (
                <p className="text-amber-600 text-xs mt-1">No trucks found. Add trucks under Transporters module first.</p>
              )}
            </div>
          )}

          {/* Self-Transport Info */}
          {isSelfTransport && (
            <div className="bg-green-50 border border-green-200 rounded-xl p-3 text-sm">
              <span className="text-green-700 font-medium">Self Transport selected</span>
              <span className="text-slate-600"> — Customer will use their own truck. No transporter agreement required.</span>
            </div>
          )}

          {!isSelfTransport && selectedTruck && (
            <div className="bg-green-50 border border-green-200 rounded-xl p-3 text-sm">
              <span className="text-green-700 font-medium">Selected: </span>
              <span className="text-slate-900">Plate: {selectedTruck.plateNo} | Driver: {selectedTruck.driverName} | Transporter: {selectedTruck.transporterName}</span>
            </div>
          )}
        </CardBody>
      </Card>

      {/* Weighbridge & Weight */}
      <Card>
        <CardHeader>
          <h2 className="text-lg font-semibold text-[#1D1D1F]">3. Weighbridge & Weight</h2>
        </CardHeader>
        <CardBody className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Factory Weighbridge Ref *</label>
              <Input
                placeholder="e.g., DNG-WB-20260504-001"
                value={factoryWeighbridgeRef}
                onChange={(e) => setFactoryWeighbridgeRef(e.target.value)}
                required
              />
              <p className="text-xs text-slate-500 mt-1">Factory-issued weighbridge ticket number</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Factory Weight (QT) *</label>
              <input
                type="number"
                min="0.01"
                step="0.01"
                value={factoryWeight}
                onChange={(e) => setFactoryWeight(e.target.value)}
                className="block w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                placeholder="e.g., 200"
                required
              />
              <p className="text-xs text-slate-500 mt-1">Weight as measured at factory weighbridge</p>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Coupon {coupons.length > 0 ? <span className="text-red-500">* (Required)</span> : '(Optional)'}
            </label>
            <select
              value={couponId}
              onChange={(e) => setCouponId(e.target.value)}
              className={`block w-full rounded-xl border px-3 py-2.5 text-sm focus:ring-2 ${
                coupons.length > 0 && !couponId
                  ? 'border-red-400 focus:border-red-500 focus:ring-red-500/20'
                  : 'border-slate-300 focus:border-blue-500 focus:ring-blue-500/20'
              }`}
              disabled={!purchaseId}
              required={coupons.length > 0}
            >
              <option value="">{!purchaseId ? 'Select a purchase first' : coupons.length > 0 ? '— Select a coupon (required) —' : 'No coupon / Skip'}</option>
              {coupons.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.couponNo}{c.tonnage ? ` — ${c.tonnage} QT` : ''} ({c.status})
                </option>
              ))}
            </select>
            {loadingCoupons && <p className="text-blue-600 text-xs mt-1">Loading coupons...</p>}
            {purchaseId && !loadingCoupons && coupons.length === 0 && (
              <p className="text-slate-500 text-xs mt-1">No available coupons for this purchase. Lifting can proceed without a coupon.</p>
            )}
            {coupons.length > 0 && !couponId && (
              <div className="bg-red-50 border border-red-200 rounded-lg px-3 py-2 mt-2 text-sm text-red-700 font-medium">
                This purchase has {coupons.length} available coupon(s). You must select one to proceed.
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Delivery Pad / POD Number (Pad #)</label>
              <Input
                placeholder="e.g., PAD-2026-001 (Optional)"
                value={padNumber}
                onChange={(e) => setPadNumber(e.target.value)}
              />
              <p className="text-xs text-slate-500 mt-1">Delivery pad or proof of delivery receipt number</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Delivery Note / GRN No.</label>
              <Input
                placeholder="e.g., DN-2026-0504 (Optional)"
                value={deliveryNoteNo}
                onChange={(e) => setDeliveryNoteNo(e.target.value)}
              />
              <p className="text-xs text-slate-500 mt-1">Delivery note / goods receive note number</p>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Weighbridge Ticket Photo</label>
            <FileUpload
              onFilesSelected={(files) => setWeighbridgeFiles(files)}
              label="Upload Weighbridge Ticket"
              maxFiles={2}
              maxFileSize={10 * 1024 * 1024}
              acceptedFileTypes={['image/*', 'application/pdf']}
              helperText="Photo or scan of the weighbridge ticket (max 10MB)"
            />
          </div>
        </CardBody>
      </Card>

      {/* Summary */}
      <Card>
        <CardHeader>
          <h2 className="text-lg font-semibold text-[#1D1D1F]">Summary</h2>
        </CardHeader>
        <CardBody>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between"><span className="text-slate-600">Purchase:</span><span className="font-medium">{selectedPurchase?.purchaseNo || '—'}</span></div>
            <div className="flex justify-between"><span className="text-slate-600">Factory:</span><span className="font-medium">{selectedPurchase?.factory?.name || '—'}</span></div>
            <div className="flex justify-between"><span className="text-slate-600">Customer:</span><span className="font-medium">{customers.find(c => c.value === customerId)?.label || '—'}</span></div>
            <div className="flex justify-between">
              <span className="text-slate-600">Truck:</span>
              <span className="font-medium">
                {isSelfTransport
                  ? 'Customer Self Transport'
                  : selectedTruck ? `${selectedTruck.plateNo} (${selectedTruck.driverName})` : '—'
                }
              </span>
            </div>
            <div className="flex justify-between border-t pt-2"><span className="text-slate-900 font-semibold">Factory Weight:</span><span className="font-bold text-slate-900">{factoryWeight ? `${factoryWeight} QT` : '—'}</span></div>
            <div className="flex justify-between"><span className="text-slate-600">Weighbridge Ref:</span><span className="font-medium">{factoryWeighbridgeRef || '—'}</span></div>
            {selectedCoupon && (
              <div className="flex justify-between"><span className="text-slate-600">Coupon:</span><span className="font-medium">{selectedCoupon.couponNo}</span></div>
            )}
          </div>
        </CardBody>
      </Card>

      {/* Actions */}
      <div className="flex gap-3">
        <Button
          variant="primary"
          size="lg"
          onClick={handleSave}
          isLoading={submitting}
          disabled={submitting || (customerId !== '' && !customerHasActiveAgreement)}
          className={`flex-1 ${customerId && !customerHasActiveAgreement ? 'opacity-50 cursor-not-allowed' : ''}`}
        >
          Save Lifting Record
        </Button>
        <Button variant="outline" size="lg" onClick={() => router.push('/dashboard/cement')} className="flex-1">
          Cancel
        </Button>
      </div>
    </div>
  );
}
