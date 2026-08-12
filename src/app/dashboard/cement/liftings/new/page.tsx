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

  // Form fields
  const [purchaseId, setPurchaseId] = useState('');
  const [customerId, setCustomerId] = useState('');
  const [truckId, setTruckId] = useState('');
  const [factoryWeighbridgeRef, setFactoryWeighbridgeRef] = useState('');
  const [factoryWeight, setFactoryWeight] = useState('');
  const [couponId, setCouponId] = useState('');
  const [liftingDate, setLiftingDate] = useState(new Date().toISOString().split('T')[0]);

  // Derived from selection
  const selectedPurchase = purchases.find(p => p.id === purchaseId);
  const selectedTruck = trucks.find(t => t.id === truckId);

  useEffect(() => {
    // Fetch active cement purchases
    fetch('/api/cement/purchases?limit=100')
      .then(r => r.json())
      .then(json => {
        if (json.success) {
          // Only show Active purchases (approved AND paid) that have balance
          const available = (json.data || []).filter((p: Purchase) =>
            p.status === 'Active' && p.balanceRemaining > 0
          );
          setPurchases(available);
        }
      })
      .catch(console.error);

    // Fetch customers from sales agreements (only customers with active CEMENT agreements)
    fetch('/api/sales/agreements/customers?division=CEMENT&status=Active')
      .then(r => r.json())
      .then(json => {
        if (json.success) {
          setCustomers((json.data || []).map((c: any) => ({
            value: c.customerId,
            label: `${c.companyName} — ${c.agreementNo}`,
          })));
        }
      })
      .catch(console.error);

    // Fetch transporters to get trucks
    fetch('/api/transporters?limit=100')
      .then(r => r.json())
      .then(json => {
        if (json.success) {
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
      .catch(console.error);
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

  const selectedCoupon = coupons.find(c => c.id === couponId);

  const handleSave = async () => {
    if (!purchaseId || !customerId || !truckId || !factoryWeighbridgeRef || !factoryWeight) {
      alert('Please fill in all required fields (Purchase, Customer, Truck, Weighbridge Ref, Factory Weight)');
      return;
    }

    if (!selectedPurchase) {
      alert('Please select a valid purchase');
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch('/api/cement/liftings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          purchaseId,
          factoryId: selectedPurchase.factoryId,
          truckId,
          customerId,
          factoryWeighbridgeRef,
          factoryWeight: parseFloat(factoryWeight),
          couponId: couponId || null,
          liftingDate,
        }),
      });
      const data = await res.json();
      if (data.success) {
        // Upload weighbridge documents
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
            {purchases.length === 0 && (
              <p className="text-amber-600 text-xs mt-1">No active purchases found. Create a purchase first.</p>
            )}
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
              <label className="block text-sm font-medium text-slate-700 mb-1">Customer *</label>
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
            {trucks.length === 0 && (
              <p className="text-amber-600 text-xs mt-1">Loading trucks from transporter records...</p>
            )}
          </div>

          {selectedTruck && (
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
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Factory Weighbridge Ref *
                <span className="text-red-500 ml-1">(Mandatory)</span>
              </label>
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
            <label className="block text-sm font-medium text-slate-700 mb-1">Coupon (Optional)</label>
            <select
              value={couponId}
              onChange={(e) => setCouponId(e.target.value)}
              className="block w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
              disabled={!purchaseId}
            >
              <option value="">{!purchaseId ? 'Select a purchase first' : 'No coupon / Skip'}</option>
              {coupons.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.couponNo}{c.tonnage ? ` — ${c.tonnage} QT` : ''} ({c.status})
                </option>
              ))}
            </select>
            {loadingCoupons && (
              <p className="text-blue-600 text-xs mt-1">Loading coupons...</p>
            )}
            {purchaseId && !loadingCoupons && coupons.length === 0 && (
              <p className="text-slate-500 text-xs mt-1">No available coupons for this purchase. You can register coupons in the Coupons page.</p>
            )}
          </div>

          {/* Weighbridge Document Upload */}
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
            <div className="flex justify-between">
              <span className="text-slate-600">Purchase:</span>
              <span className="font-medium">{selectedPurchase?.purchaseNo || '—'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-600">Factory:</span>
              <span className="font-medium">{selectedPurchase?.factory?.name || '—'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-600">Customer:</span>
              <span className="font-medium">{customers.find(c => c.value === customerId)?.label || '—'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-600">Truck:</span>
              <span className="font-medium">{selectedTruck?.plateNo || '—'} {selectedTruck ? `(${selectedTruck.driverName})` : ''}</span>
            </div>
            <div className="flex justify-between border-t pt-2">
              <span className="text-slate-900 font-semibold">Factory Weight:</span>
              <span className="font-bold text-slate-900">{factoryWeight ? `${factoryWeight} QT` : '—'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-600">Weighbridge Ref:</span>
              <span className="font-medium">{factoryWeighbridgeRef || '—'}</span>
            </div>
            {selectedCoupon && (
              <div className="flex justify-between">
                <span className="text-slate-600">Coupon:</span>
                <span className="font-medium">{selectedCoupon.couponNo}</span>
              </div>
            )}
            {weighbridgeFiles.length > 0 && (
              <div className="flex justify-between">
                <span className="text-slate-600">Documents:</span>
                <span className="font-medium text-green-600">{weighbridgeFiles.length} file(s) attached</span>
              </div>
            )}
          </div>
        </CardBody>
      </Card>

      {/* Actions */}
      <div className="flex gap-3">
        <Button variant="primary" size="lg" onClick={handleSave} isLoading={submitting} className="flex-1">
          Save Lifting Record
        </Button>
        <Button variant="outline" size="lg" onClick={() => router.push('/dashboard/cement')} className="flex-1">
          Cancel
        </Button>
      </div>
    </div>
  );
}
