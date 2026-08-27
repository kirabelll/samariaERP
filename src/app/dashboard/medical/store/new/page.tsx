'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Package,
  Layers,
  Building2,
  Calendar,
  DollarSign,
  Warehouse,
  Truck,
  ArrowLeft,
  CheckCircle,
  AlertCircle,
  Info,
} from 'lucide-react';
import { Card, CardHeader, CardBody, Button, Input, Select } from '@/components/ui';

interface ItemOption {
  id: string;
  code: string;
  name: string;
  category: string;
  unit: string;
  division: string;
  genericName?: string | null;
  strength?: string | null;
  dosageForm?: string | null;
  manufacturer?: string | null;
  batchTracked?: boolean;
}

interface SupplierOption {
  id: string;
  code: string;
  companyName: string;
  category?: string | null;
  phone?: string | null;
  tin?: string | null;
  location?: string | null;
}

const DIVISIONS = [
  { value: 'MEDICAL', label: 'Medical & Pharma' },
  { value: 'CONSTRUCTION', label: 'Construction' },
  { value: 'GENERAL', label: 'General Merchandise' },
  { value: 'BOTH', label: 'Both / Cross-Division' },
  { value: 'CEMENT', label: 'Cement' },
  { value: 'AGGREGATE', label: 'Aggregate' },
];

export default function NewMedicalBatchPage() {
  const router = useRouter();

  // Division Filter State
  const [division, setDivision] = useState('MEDICAL');

  // Form Fields
  const [itemId, setItemId] = useState('');
  const [batchNo, setBatchNo] = useState('');
  const [expiryDate, setExpiryDate] = useState('');
  const [quantity, setQuantity] = useState('');
  const [costPrice, setCostPrice] = useState('');
  const [warehouse, setWarehouse] = useState('medical_store');
  const [supplierId, setSupplierId] = useState('');
  const [status, setStatus] = useState('Available');

  // Data States
  const [items, setItems] = useState<ItemOption[]>([]);
  const [suppliers, setSuppliers] = useState<SupplierOption[]>([]);
  const [loadingItems, setLoadingItems] = useState(false);
  const [loadingSuppliers, setLoadingSuppliers] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Fetch Items filtered by selected Division
  useEffect(() => {
    async function fetchItems() {
      try {
        setLoadingItems(true);
        const params = new URLSearchParams({ limit: '200' });
        if (division) {
          params.append('division', division);
        }

        const res = await fetch(`/api/items?${params.toString()}`);
        const json = await res.json();
        if (json.success && Array.isArray(json.data)) {
          setItems(json.data);
          // If current itemId is not in the new filtered items list, reset it
          if (!json.data.some((item: ItemOption) => item.id === itemId)) {
            setItemId('');
          }
        } else {
          setItems([]);
        }
      } catch (err) {
        console.error('Error fetching items:', err);
        setItems([]);
      } finally {
        setLoadingItems(false);
      }
    }

    fetchItems();
  }, [division]);

  // Fetch Suppliers
  useEffect(() => {
    async function fetchSuppliers() {
      try {
        setLoadingSuppliers(true);
        const res = await fetch('/api/suppliers?limit=200');
        const json = await res.json();
        if (json.success && Array.isArray(json.data)) {
          setSuppliers(json.data);
        } else {
          setSuppliers([]);
        }
      } catch (err) {
        console.error('Error fetching suppliers:', err);
        setSuppliers([]);
      } finally {
        setLoadingSuppliers(false);
      }
    }

    fetchSuppliers();
  }, []);

  // Filter suppliers based on division relevance (e.g. Medical vs General/Construction)
  const filteredSuppliers = React.useMemo(() => {
    if (!suppliers.length) return [];
    if (division === 'MEDICAL') {
      const medSuppliers = suppliers.filter(
        (s) =>
          (s.category && s.category.toLowerCase().includes('med')) ||
          (s.category && s.category.toLowerCase().includes('pharma'))
      );
      return medSuppliers.length > 0 ? medSuppliers : suppliers;
    }
    return suppliers;
  }, [suppliers, division]);

  // Selected item and supplier metadata
  const selectedItem = items.find((item) => item.id === itemId);
  const selectedSupplier = suppliers.find((s) => s.id === supplierId);

  // Auto-generate batch number suggestion when item is chosen
  const handleAutoBatchNo = () => {
    const d = new Date();
    const yr = d.getFullYear();
    const mo = String(d.getMonth() + 1).padStart(2, '0');
    const rnd = Math.floor(1000 + Math.random() * 9000);
    const prefix = selectedItem ? selectedItem.code.replace(/[^a-zA-Z0-9]/g, '') : 'BAT';
    setBatchNo(`${prefix}-${yr}${mo}-${rnd}`);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!itemId) {
      setErrorMsg('Please select an item');
      return;
    }
    if (!batchNo.trim()) {
      setErrorMsg('Please enter a batch number');
      return;
    }
    if (!expiryDate) {
      setErrorMsg('Please select an expiry date');
      return;
    }
    if (!quantity || parseFloat(quantity) <= 0) {
      setErrorMsg('Please enter a valid quantity greater than 0');
      return;
    }
    if (!costPrice || parseFloat(costPrice) < 0) {
      setErrorMsg('Please enter a valid unit cost price');
      return;
    }
    if (!warehouse) {
      setErrorMsg('Please select a warehouse');
      return;
    }
    if (!supplierId) {
      setErrorMsg('Please select a supplier');
      return;
    }

    setSubmitting(true);
    try {
      const response = await fetch('/api/medical/batches', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          itemId,
          batchNo: batchNo.trim(),
          expiryDate,
          quantity: parseFloat(quantity),
          costPrice: parseFloat(costPrice),
          warehouse,
          status,
          supplierId,
        }),
      });

      const json = await response.json();

      if (!response.ok || !json.success) {
        throw new Error(json.error || 'Failed to save medical batch');
      }

      router.push('/dashboard/medical/store');
    } catch (error: any) {
      setErrorMsg(error.message || 'An unexpected error occurred while saving the batch');
    } finally {
      setSubmitting(false);
    }
  };

  const totalCost = (parseFloat(quantity) || 0) * (parseFloat(costPrice) || 0);

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs text-gray-500 mb-1">
            <Link href="/dashboard/medical/store" className="hover:text-blue-600">
              Medical Store
            </Link>
            <span>/</span>
            <span className="font-semibold text-gray-700">New Batch</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 flex items-center gap-2.5">
            <Package className="w-7 h-7 text-blue-600" />
            Receive New Medical Batch
          </h1>
          <p className="text-gray-600 text-xs sm:text-sm mt-1">
            Register incoming batch inventory filtered by Division with linked item and supplier
          </p>
        </div>

        <Link href="/dashboard/medical/store">
          <Button variant="outline" size="sm" icon={<ArrowLeft className="w-4 h-4" />}>
            Back to Store
          </Button>
        </Link>
      </div>

      {errorMsg && (
        <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-800 text-sm flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="font-semibold">Unable to Save Batch</p>
            <p className="text-xs sm:text-sm mt-0.5">{errorMsg}</p>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Division & Master Selection Card */}
        <Card className="bg-white border border-gray-200 shadow-xs">
          <CardHeader className="border-b border-gray-100 bg-gray-50/50 pb-3">
            <div className="flex items-center gap-2">
              <Layers className="w-5 h-5 text-blue-600" />
              <h2 className="text-base font-semibold text-gray-900">
                1. Division, Item & Supplier Selection
              </h2>
            </div>
          </CardHeader>
          <CardBody className="p-4 sm:p-6 space-y-5">
            {/* Division Selection Banner / Dropdown */}
            <div className="bg-blue-50/60 p-4 rounded-xl border border-blue-100 space-y-2">
              <label className="block text-xs font-bold uppercase tracking-wider text-blue-900">
                Operational Division *
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
                {DIVISIONS.map((div) => {
                  const active = division === div.value;
                  return (
                    <button
                      key={div.value}
                      type="button"
                      onClick={() => setDivision(div.value)}
                      className={`px-3 py-2 text-xs font-semibold rounded-lg border transition-all text-center ${
                        active
                          ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                          : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-100 hover:border-gray-300'
                      }`}
                    >
                      {div.label}
                    </button>
                  );
                })}
              </div>
              <p className="text-[11px] text-blue-700 mt-1">
                Selecting a division filters available products and items specific to {division}.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {/* Item Selector */}
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold uppercase tracking-wider text-gray-700">
                  Select Item / Drug ({division}) *
                </label>
                <select
                  value={itemId}
                  onChange={(e) => setItemId(e.target.value)}
                  disabled={loadingItems}
                  className="w-full h-10 rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm shadow-2xs focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
                  required
                >
                  <option value="">
                    {loadingItems
                      ? 'Loading items...'
                      : items.length === 0
                      ? `No items found in ${division} division`
                      : `-- Select ${division} Item (${items.length} available) --`}
                  </option>
                  {items.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.code} - {item.name} {item.strength ? `(${item.strength})` : ''} [{item.unit}]
                    </option>
                  ))}
                </select>

                {/* Selected Item Details Box */}
                {selectedItem && (
                  <div className="mt-2 p-3 bg-gray-50 rounded-lg border border-gray-200 text-xs space-y-1 text-gray-600">
                    <div className="flex justify-between">
                      <span className="font-medium text-gray-700">Generic Name:</span>
                      <span className="font-semibold text-gray-900">{selectedItem.genericName || '-'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="font-medium text-gray-700">Category / Dosage:</span>
                      <span>
                        {selectedItem.category} {selectedItem.dosageForm ? `• ${selectedItem.dosageForm}` : ''}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="font-medium text-gray-700">Standard Unit:</span>
                      <span className="font-mono font-bold text-blue-700">{selectedItem.unit}</span>
                    </div>
                    {selectedItem.manufacturer && (
                      <div className="flex justify-between">
                        <span className="font-medium text-gray-700">Manufacturer:</span>
                        <span>{selectedItem.manufacturer}</span>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Supplier Selector */}
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold uppercase tracking-wider text-gray-700">
                  Select Supplier *
                </label>
                <select
                  value={supplierId}
                  onChange={(e) => setSupplierId(e.target.value)}
                  disabled={loadingSuppliers}
                  className="w-full h-10 rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm shadow-2xs focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
                  required
                >
                  <option value="">
                    {loadingSuppliers
                      ? 'Loading suppliers...'
                      : `-- Select Supplier (${filteredSuppliers.length} available) --`}
                  </option>
                  {filteredSuppliers.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.code} - {s.companyName} {s.category ? `(${s.category})` : ''}
                    </option>
                  ))}
                </select>

                {/* Selected Supplier Details Box */}
                {selectedSupplier && (
                  <div className="mt-2 p-3 bg-gray-50 rounded-lg border border-gray-200 text-xs space-y-1 text-gray-600">
                    <div className="flex justify-between">
                      <span className="font-medium text-gray-700">Company:</span>
                      <span className="font-semibold text-gray-900">{selectedSupplier.companyName}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="font-medium text-gray-700">Category:</span>
                      <span>{selectedSupplier.category || 'General Supplier'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="font-medium text-gray-700">Phone / Location:</span>
                      <span>{selectedSupplier.phone || '-'} • {selectedSupplier.location || '-'}</span>
                    </div>
                    {selectedSupplier.tin && (
                      <div className="flex justify-between">
                        <span className="font-medium text-gray-700">TIN No:</span>
                        <span className="font-mono">{selectedSupplier.tin}</span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </CardBody>
        </Card>

        {/* Batch Specifications Card */}
        <Card className="bg-white border border-gray-200 shadow-xs">
          <CardHeader className="border-b border-gray-100 bg-gray-50/50 pb-3">
            <div className="flex items-center gap-2">
              <Building2 className="w-5 h-5 text-blue-600" />
              <h2 className="text-base font-semibold text-gray-900">
                2. Batch Details & Storage
              </h2>
            </div>
          </CardHeader>
          <CardBody className="p-4 sm:p-6 space-y-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {/* Batch Number */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-semibold uppercase tracking-wider text-gray-700">
                    Batch Number *
                  </label>
                  <button
                    type="button"
                    onClick={handleAutoBatchNo}
                    className="text-[11px] text-blue-600 hover:underline font-medium"
                  >
                    Auto-Generate
                  </button>
                </div>
                <Input
                  placeholder="e.g., BATCH-2026-001"
                  value={batchNo}
                  onChange={(e) => setBatchNo(e.target.value)}
                  required
                />
              </div>

              {/* Expiry Date */}
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold uppercase tracking-wider text-gray-700">
                  Expiry Date *
                </label>
                <input
                  type="date"
                  value={expiryDate}
                  onChange={(e) => setExpiryDate(e.target.value)}
                  className="w-full h-10 rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm shadow-2xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              {/* Status */}
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold uppercase tracking-wider text-gray-700">
                  Batch Status *
                </label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                  className="w-full h-10 rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm shadow-2xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="Available">Available (Active Store)</option>
                  <option value="Quarantine">Quarantine (Under Inspection)</option>
                  <option value="Reserved">Reserved</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {/* Quantity */}
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold uppercase tracking-wider text-gray-700">
                  Quantity Received ({selectedItem?.unit || 'Units'}) *
                </label>
                <input
                  type="number"
                  min="0.01"
                  step="0.01"
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                  className="w-full h-10 rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm shadow-2xs focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
                  placeholder="e.g., 500"
                  required
                />
              </div>

              {/* Unit Cost Price */}
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold uppercase tracking-wider text-gray-700">
                  Unit Cost Price (ETB) *
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={costPrice}
                  onChange={(e) => setCostPrice(e.target.value)}
                  className="w-full h-10 rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm shadow-2xs focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
                  placeholder="e.g., 125.50"
                  required
                />
              </div>

              {/* Warehouse */}
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold uppercase tracking-wider text-gray-700">
                  Target Warehouse / Storage *
                </label>
                <select
                  value={warehouse}
                  onChange={(e) => setWarehouse(e.target.value)}
                  className="w-full h-10 rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm shadow-2xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                >
                  <option value="medical_store">Medical Store (Main Pharmacy)</option>
                  <option value="quarantine">Quarantine Area</option>
                  <option value="central_warehouse">Central Warehouse</option>
                </select>
              </div>
            </div>
          </CardBody>
        </Card>

        {/* Cost Summary Card */}
        <Card className="bg-white border border-gray-200 shadow-xs">
          <CardHeader className="border-b border-gray-100 bg-gray-50/50 pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <DollarSign className="w-5 h-5 text-green-600" />
                <h2 className="text-base font-semibold text-gray-900">3. Financial Valuation Summary</h2>
              </div>
              <span className="text-xs text-gray-500 font-medium">Auto-Calculated</span>
            </div>
          </CardHeader>
          <CardBody className="p-4 sm:p-6">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-center">
              <div className="p-3 bg-gray-50 rounded-xl border border-gray-100">
                <p className="text-xs text-gray-500 font-medium uppercase tracking-wider">Total Quantity</p>
                <p className="text-xl font-bold text-gray-900 mt-1 font-mono">
                  {quantity ? `${parseFloat(quantity).toLocaleString('en-US')} ${selectedItem?.unit || 'units'}` : '0 units'}
                </p>
              </div>

              <div className="p-3 bg-gray-50 rounded-xl border border-gray-100">
                <p className="text-xs text-gray-500 font-medium uppercase tracking-wider">Unit Cost</p>
                <p className="text-xl font-bold text-blue-600 mt-1 font-mono">
                  {costPrice ? `ETB ${parseFloat(costPrice).toLocaleString('en-US', { minimumFractionDigits: 2 })}` : 'ETB 0.00'}
                </p>
              </div>

              <div className="p-3 bg-green-50/80 rounded-xl border border-green-200">
                <p className="text-xs text-green-800 font-medium uppercase tracking-wider">Total Batch Valuation</p>
                <p className="text-2xl font-bold text-green-700 mt-1 font-mono">
                  ETB {totalCost.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </p>
              </div>
            </div>
          </CardBody>
        </Card>

        {/* Form Actions */}
        <div className="flex flex-wrap items-center justify-end gap-3 pt-2">
          <Link href="/dashboard/medical/store">
            <Button variant="outline" size="md" type="button" disabled={submitting}>
              Cancel
            </Button>
          </Link>
          <Button
            variant="primary"
            size="md"
            type="submit"
            isLoading={submitting}
            icon={<CheckCircle className="w-4 h-4" />}
          >
            {submitting ? 'Saving Batch...' : 'Register Medical Batch'}
          </Button>
        </div>
      </form>
    </div>
  );
}
