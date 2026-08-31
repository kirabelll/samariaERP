'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardHeader, CardBody, Button, Input } from '@/components/ui';

interface OrderItem {
  id: number;
  item: string;
  itemId: string;
  qty: number;
  unit: string;
  unitPrice: number;
  total: number;
  batchNo?: string;
  expiryDate?: string;
}

interface CustomerOption {
  customerId: string;
  companyName: string;
  phone?: string;
  tin?: string;
  agreementNo?: string;
  agreementId?: string;
  division?: string;
  licenseNo?: string;
  licenseExpiry?: string;
  licenseType?: string;
  medicalApproved?: boolean;
  licenseStatus?: 'Valid' | 'Expired' | 'N/A';
}

interface SystemItem {
  id: string;
  name: string;
  code: string;
  unitPrice?: number;
  unit?: string | { name: string };
  category?: string;
  division?: string;
  currentStock?: number;
  totalStock?: number;
}

interface MedicalBatch {
  id: string;
  itemId: string;
  batchNo: string;
  expiryDate: string;
  quantity: number;
  status: string;
}

const DIVISIONS = [
  { value: 'CONSTRUCTION', label: 'Construction' },
  { value: 'CEMENT', label: 'Cement' },
  { value: 'AGGREGATE', label: 'Aggregate' },
  { value: 'MEDICAL', label: 'Medical (Licensed)' },
  { value: 'GENERAL', label: 'General' },
];

export default function NewSalesOrderPage() {
  const router = useRouter();
  const [division, setDivision] = useState<string>('CONSTRUCTION');
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>('');
  const [items, setItems] = useState<OrderItem[]>([
    { id: 1, item: '', itemId: '', qty: 1, unit: '', unitPrice: 0, total: 0, batchNo: '', expiryDate: '' },
  ]);

  const [customers, setCustomers] = useState<CustomerOption[]>([]);
  const [systemItems, setSystemItems] = useState<SystemItem[]>([]);
  const [medicalBatches, setMedicalBatches] = useState<MedicalBatch[]>([]);
  const [loadingCustomers, setLoadingCustomers] = useState<boolean>(true);
  const [loadingItems, setLoadingItems] = useState<boolean>(false);
  const [submitting, setSubmitting] = useState<boolean>(false);

  const isMedical = division === 'MEDICAL';

  // Fetch customers, items, and batch availability whenever division changes
  useEffect(() => {
    let isCancelled = false;

    async function loadDivisionData() {
      setLoadingCustomers(true);
      setLoadingItems(true);
      setSelectedCustomerId(''); // Reset customer selection on division switch

      try {
        if (division === 'MEDICAL') {
          // Fetch licensed medical customers & active batches
          const [custRes, batchRes] = await Promise.all([
            fetch('/api/customers?division=MEDICAL&limit=500').then((r) => r.json()).catch(() => ({ success: false, data: [] })),
            fetch('/api/medical/batches?limit=1000').then((r) => r.json()).catch(() => ({ success: false, data: [] })),
          ]);

          if (!isCancelled && custRes.success && Array.isArray(custRes.data)) {
            const medicalCustomers: CustomerOption[] = custRes.data.map((c: any) => {
              const hasExpiry = Boolean(c.licenseExpiry);
              const isExpired = hasExpiry ? new Date(c.licenseExpiry) < new Date() : false;
              const licenseStatus: 'Valid' | 'Expired' | 'N/A' = !c.licenseNo
                ? 'N/A'
                : isExpired
                ? 'Expired'
                : 'Valid';

              return {
                customerId: c.id,
                companyName: c.companyName || `${c.firstName || ''} ${c.lastName || ''}`.trim() || c.code,
                phone: c.phone || '',
                tin: c.tin || '',
                division: c.division || 'MEDICAL',
                licenseNo: c.licenseNo || '',
                licenseExpiry: c.licenseExpiry || '',
                licenseType: c.licenseType || 'Pharmacy / Healthcare',
                medicalApproved: Boolean(c.medicalApproved),
                licenseStatus,
              };
            });

            setCustomers(medicalCustomers);
          }

          if (!isCancelled && batchRes.success && Array.isArray(batchRes.data)) {
            setMedicalBatches(batchRes.data);
          }
        } else {
          setMedicalBatches([]);
          // For other divisions: Fetch agreement customers + general customers for that division
          const agreementUrl = division
            ? `/api/sales/agreements/customers?division=${division}`
            : '/api/sales/agreements/customers';
          const generalUrl = division
            ? `/api/customers?division=${division}&limit=500`
            : '/api/customers?limit=500';

          const [agreementRes, generalRes] = await Promise.all([
            fetch(agreementUrl).then((r) => r.json()).catch(() => ({ success: false, data: [] })),
            fetch(generalUrl).then((r) => r.json()).catch(() => ({ success: false, data: [] })),
          ]);

          if (!isCancelled) {
            const customerMap = new Map<string, CustomerOption>();

            // Add agreement customers first
            if (agreementRes.success && Array.isArray(agreementRes.data)) {
              agreementRes.data.forEach((agr: any) => {
                if (agr.customerId) {
                  customerMap.set(agr.customerId, {
                    customerId: agr.customerId,
                    companyName: agr.companyName,
                    phone: agr.phone,
                    tin: agr.tin,
                    agreementNo: agr.agreementNo,
                    agreementId: agr.agreementId,
                    division: agr.division,
                    licenseNo: agr.licenseNo,
                    licenseExpiry: agr.licenseExpiry,
                    licenseType: agr.licenseType,
                    medicalApproved: agr.medicalApproved,
                  });
                }
              });
            }

            // Merge general customers for this division if not already added
            if (generalRes.success && Array.isArray(generalRes.data)) {
              generalRes.data.forEach((c: any) => {
                if (!customerMap.has(c.id)) {
                  customerMap.set(c.id, {
                    customerId: c.id,
                    companyName: c.companyName || `${c.firstName || ''} ${c.lastName || ''}`.trim() || c.code,
                    phone: c.phone || '',
                    tin: c.tin || '',
                    division: c.division,
                    licenseNo: c.licenseNo,
                    licenseExpiry: c.licenseExpiry,
                    licenseType: c.licenseType,
                    medicalApproved: c.medicalApproved,
                  });
                }
              });
            }

            setCustomers(Array.from(customerMap.values()));
          }
        }

        // Fetch division-filtered items with stock
        const itemsUrl = division ? `/api/items?division=${division}&limit=500` : '/api/items?limit=500';
        const itemsRes = await fetch(itemsUrl);
        const itemsData = await itemsRes.json();
        if (!isCancelled && itemsData.success) {
          setSystemItems(itemsData.data || []);
        }
      } catch (err) {
        console.error('Error fetching division data:', err);
      } finally {
        if (!isCancelled) {
          setLoadingCustomers(false);
          setLoadingItems(false);
        }
      }
    }

    loadDivisionData();

    return () => {
      isCancelled = true;
    };
  }, [division]);

  // Find currently selected customer details
  const selectedCustomer = useMemo(() => {
    return customers.find((c) => c.customerId === selectedCustomerId) || null;
  }, [customers, selectedCustomerId]);

  const handleAddItem = () => {
    const newId = Math.max(...items.map((i) => i.id), 0) + 1;
    setItems([...items, { id: newId, item: '', itemId: '', qty: 1, unit: '', unitPrice: 0, total: 0, batchNo: '', expiryDate: '' }]);
  };

  const handleRemoveItem = (id: number) => {
    if (items.length <= 1) return;
    setItems(items.filter((i) => i.id !== id));
  };

  const handleItemChange = (id: number, field: string, value: any) => {
    setItems(
      items.map((item) => {
        if (item.id === id) {
          const updated = { ...item, [field]: value };

          // If selecting from catalog, auto-fill price, unit, and batch
          if (field === 'itemId' && value) {
            const catalogItem = systemItems.find((si) => si.id === value);
            if (catalogItem) {
              updated.item = catalogItem.name;
              updated.unitPrice = catalogItem.unitPrice || 0;
              const unitName = typeof catalogItem.unit === 'object' && catalogItem.unit !== null
                ? (catalogItem.unit as any).name
                : typeof catalogItem.unit === 'string'
                ? catalogItem.unit
                : '';
              updated.unit = unitName || updated.unit || 'pcs';

              // Auto-detect first available batch for medical items
              if (isMedical) {
                const itemBatches = medicalBatches.filter(
                  (b) => b.itemId === value && (b.status === 'Available' || Number(b.quantity) > 0)
                );
                if (itemBatches.length > 0) {
                  updated.batchNo = itemBatches[0].batchNo;
                  updated.expiryDate = itemBatches[0].expiryDate ? itemBatches[0].expiryDate.split('T')[0] : '';
                }
              }
            }
          }

          if (field === 'batchNo') {
            // When user picks a batch, update expiry date from batches list
            const matchedBatch = medicalBatches.find((b) => b.batchNo === value && b.itemId === item.itemId);
            if (matchedBatch?.expiryDate) {
              updated.expiryDate = matchedBatch.expiryDate.split('T')[0];
            }
          }

          if (field === 'qty' || field === 'unitPrice') {
            const qty = field === 'qty' ? Number(value) || 0 : item.qty;
            const unitPrice = field === 'unitPrice' ? Number(value) || 0 : item.unitPrice;
            updated.total = qty * unitPrice;
          }
          return updated;
        }
        return item;
      })
    );
  };

  const totalAmount = items.reduce((sum, item) => sum + item.total, 0);

  const handleSave = async () => {
    if (!selectedCustomerId) {
      alert('Please select a customer.');
      return;
    }
    if (items.some((i) => !i.item && !i.itemId)) {
      alert('Please fill in all order items.');
      return;
    }

    if (division === 'MEDICAL' && selectedCustomer?.licenseStatus === 'Expired') {
      const confirmExpired = confirm(
        'Warning: This customer\'s medical license is EXPIRED. Are you sure you want to proceed with this medical order?'
      );
      if (!confirmExpired) return;
    }

    const payloadItems = items.map((i) => {
      const catalogItem = systemItems.find((si) => si.id === i.itemId);
      const name = i.item || catalogItem?.name || 'Unnamed Item';
      const code = catalogItem?.code || '';
      const unit = i.unit || (typeof catalogItem?.unit === 'string' ? catalogItem.unit : (catalogItem?.unit as any)?.name) || '';
      return {
        id: i.id,
        itemId: i.itemId || null,
        name,
        item: name,
        itemName: name,
        code,
        itemCode: code,
        unit,
        qty: Number(i.qty) || 1,
        quantity: Number(i.qty) || 1,
        unitPrice: Number(i.unitPrice) || 0,
        total: Number(i.total) || 0,
        batchNo: i.batchNo || null,
        expiryDate: i.expiryDate || null,
      };
    });

    setSubmitting(true);
    try {
      const res = await fetch('/api/sales/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerId: selectedCustomerId,
          items: payloadItems,
          totalAmount,
          division: division || 'CONSTRUCTION',
          status: 'Pending',
        }),
      });
      const d = await res.json();
      if (!d.success) {
        alert(d.error || 'Failed to save sales order');
        return;
      }
      alert('Sales Order created successfully!');
      router.push('/dashboard/sales/orders');
    } catch {
      alert('Failed to save sales order');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancel = () => {
    router.push('/dashboard/sales/orders');
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto p-4 sm:p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Create Sales Order</h1>
          <p className="text-sm text-gray-500 mt-1">
            Generate and submit a sales order with batch tracking, stock availability, and verified customer licensing.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleCancel}>Cancel</Button>
          <Button variant="primary" onClick={handleSave} disabled={submitting}>
            {submitting ? 'Saving Order...' : 'Save Order'}
          </Button>
        </div>
      </div>

      {/* Division & Customer Details */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">1. Order Header & Customer Selection</h2>
            <span className="text-xs bg-blue-50 text-blue-700 px-2.5 py-1 rounded-full font-medium">
              Division-Specific Verification
            </span>
          </div>
        </CardHeader>
        <CardBody className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Division Selector */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Business Division <span className="text-red-500">*</span>
              </label>
              <select
                value={division}
                onChange={(e) => setDivision(e.target.value)}
                className="block w-full rounded-lg border border-gray-300 shadow-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-200 px-3.5 py-2.5 bg-white text-gray-900 font-medium"
              >
                {DIVISIONS.map((d) => (
                  <option key={d.value} value={d.value}>
                    {d.label}
                  </option>
                ))}
              </select>
              <p className="text-xs text-gray-500 mt-1.5">
                {division === 'MEDICAL'
                  ? '🏥 Medical division fetches licensed healthcare providers and pharmaceutical batch inventory.'
                  : `📦 Fetching agreement and registered customers for ${division} division.`}
              </p>
            </div>

            {/* Customer Selector */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                {division === 'MEDICAL' ? 'Licensed Medical Customer' : 'Customer'}{' '}
                <span className="text-red-500">*</span>
              </label>
              <select
                value={selectedCustomerId}
                onChange={(e) => setSelectedCustomerId(e.target.value)}
                disabled={loadingCustomers}
                className="block w-full rounded-lg border border-gray-300 shadow-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-200 px-3.5 py-2.5 bg-white text-gray-900 font-medium disabled:bg-gray-100"
              >
                <option value="">
                  {loadingCustomers
                    ? 'Loading customers...'
                    : division === 'MEDICAL'
                    ? '-- Select Licensed Medical Customer --'
                    : '-- Select Customer --'}
                </option>
                {customers.map((c) => {
                  let label = c.companyName;
                  if (division === 'MEDICAL') {
                    const lic = c.licenseNo ? `License: ${c.licenseNo}` : 'No License';
                    const statusText = c.licenseStatus === 'Expired' ? '⚠️ EXPIRED' : c.licenseStatus === 'Valid' ? '✓ Valid' : '';
                    label = `${c.companyName} [${lic}${statusText ? ` - ${statusText}` : ''}]`;
                  } else if (c.agreementNo) {
                    label = `${c.companyName} — Agreement #${c.agreementNo}`;
                  }
                  return (
                    <option key={c.customerId} value={c.customerId}>
                      {label}
                    </option>
                  );
                })}
              </select>

              {customers.length === 0 && !loadingCustomers && (
                <p className="text-xs text-amber-600 mt-1.5 font-medium">
                  {division === 'MEDICAL'
                    ? 'No licensed medical customers found in the system.'
                    : `No customers found for ${division} division.`}
                </p>
              )}
            </div>
          </div>

          {/* Selected Customer Details Banner */}
          {selectedCustomer && (
            <div className={`p-4 rounded-xl border transition-all ${
              division === 'MEDICAL'
                ? selectedCustomer.licenseStatus === 'Expired'
                  ? 'bg-red-50 border-red-200'
                  : 'bg-emerald-50 border-emerald-200'
                : 'bg-slate-50 border-slate-200'
            }`}>
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-gray-900 text-base">{selectedCustomer.companyName}</h3>
                    {division === 'MEDICAL' && (
                      <span
                        className={`text-xs px-2.5 py-0.5 rounded-full font-semibold ${
                          selectedCustomer.licenseStatus === 'Valid'
                            ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                            : selectedCustomer.licenseStatus === 'Expired'
                            ? 'bg-red-100 text-red-800 border border-red-300'
                            : 'bg-gray-100 text-gray-700'
                        }`}
                      >
                        {selectedCustomer.licenseStatus === 'Valid' ? '✓ License Active' : '✕ License Expired'}
                      </span>
                    )}
                    {selectedCustomer.agreementNo && (
                      <span className="text-xs bg-blue-100 text-blue-800 border border-blue-200 px-2 py-0.5 rounded-md font-medium">
                        Agrmt #{selectedCustomer.agreementNo}
                      </span>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-x-6 gap-y-1 text-xs text-gray-600 mt-1.5">
                    {selectedCustomer.phone && <span>📞 Phone: <strong>{selectedCustomer.phone}</strong></span>}
                    {selectedCustomer.tin && <span>📄 TIN: <strong>{selectedCustomer.tin}</strong></span>}
                    {selectedCustomer.licenseNo && <span>🏷️ License No: <strong>{selectedCustomer.licenseNo}</strong></span>}
                    {selectedCustomer.licenseType && <span>🏥 Type: <strong>{selectedCustomer.licenseType}</strong></span>}
                    {selectedCustomer.licenseExpiry && (
                      <span className={selectedCustomer.licenseStatus === 'Expired' ? 'text-red-700 font-bold' : ''}>
                        📅 Expiry: <strong>{new Date(selectedCustomer.licenseExpiry).toLocaleDateString()}</strong>
                      </span>
                    )}
                  </div>
                </div>

                {division === 'MEDICAL' && selectedCustomer.licenseStatus === 'Expired' && (
                  <div className="text-xs bg-red-100 text-red-700 font-semibold px-3 py-1.5 rounded-lg border border-red-200">
                    ⚠️ Expired Medical License
                  </div>
                )}
              </div>
            </div>
          )}
        </CardBody>
      </Card>

      {/* Items Section with Batch Numbers & Stock Availability */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">2. Order Items</h2>
              <p className="text-xs text-gray-500 mt-0.5">
                {isMedical
                  ? `Medical batch tracking active (${medicalBatches.length} batch records indexed)`
                  : `Catalog filtered by ${division} division (${systemItems.length} products available)`}
              </p>
            </div>
            <Button variant="secondary" size="sm" onClick={handleAddItem}>
              + Add Item
            </Button>
          </div>
        </CardHeader>
        <CardBody className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200 text-xs font-semibold text-gray-600 uppercase tracking-wider text-left">
                  <th className="py-3 px-4 w-[35%]">Item Description</th>
                  {isMedical && (
                    <>
                      <th className="py-3 px-3 w-[20%]">Batch Number</th>
                      <th className="py-3 px-3 w-[15%]">Expiry Date</th>
                    </>
                  )}
                  <th className="py-3 px-3 w-[12%]">Qty</th>
                  <th className="py-3 px-3 w-[10%]">Unit</th>
                  <th className="py-3 px-3 w-[13%]">Unit Price (ETB)</th>
                  <th className="py-3 px-4 w-[15%] text-right">Total (ETB)</th>
                  <th className="py-3 px-3 w-[5%] text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {items.map((item) => {
                  const availableItemBatches = medicalBatches.filter((b) => b.itemId === item.itemId);
                  const selectedMaster = systemItems.find((m) => m.id === item.itemId);
                  const matchedBatch = medicalBatches.find(
                    (b) => b.itemId === item.itemId && b.batchNo === item.batchNo
                  );

                  const availableStock = isMedical && matchedBatch
                    ? Number(matchedBatch.quantity)
                    : selectedMaster?.currentStock != null
                    ? Number(selectedMaster.currentStock)
                    : null;

                  const remainingStock = availableStock != null ? availableStock - (Number(item.qty) || 0) : null;

                  return (
                    <tr key={item.id} className="hover:bg-gray-50/50 transition-colors">
                      {/* Item Selector / Name */}
                      <td className="py-3 px-4">
                        {systemItems.length > 0 ? (
                          <div className="space-y-1.5">
                            <select
                              value={item.itemId}
                              onChange={(e) => handleItemChange(item.id, 'itemId', e.target.value)}
                              className="w-full rounded-md border border-gray-300 shadow-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 px-2.5 py-1.5 text-sm bg-white"
                            >
                              <option value="">-- Select from {division} catalog --</option>
                              {systemItems.map((si) => (
                                <option key={si.id} value={si.id}>
                                  {si.code ? `[${si.code}] ` : ''}{si.name}
                                  {si.currentStock != null ? ` (Stock: ${si.currentStock})` : ''}
                                </option>
                              ))}
                            </select>
                            {!item.itemId && (
                              <Input
                                placeholder="Or type custom item name"
                                value={item.item}
                                onChange={(e) => handleItemChange(item.id, 'item', e.target.value)}
                                className="text-xs"
                              />
                            )}

                            {availableStock != null && (
                              <div className="flex flex-wrap items-center gap-2 text-[11px] pt-0.5">
                                <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 font-medium">
                                  📦 Available: <b className="text-slate-900">{availableStock}</b> {item.unit}
                                </span>
                                {remainingStock != null && (
                                  <span
                                    className={`px-2 py-0.5 rounded font-medium ${
                                      remainingStock < 0
                                        ? 'bg-red-50 text-red-700 font-bold border border-red-200'
                                        : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                    }`}
                                  >
                                    📊 Remaining: <b>{remainingStock}</b> {item.unit}
                                    {remainingStock < 0 && ' (Low Stock)'}
                                  </span>
                                )}
                              </div>
                            )}
                          </div>
                        ) : (
                          <Input
                            placeholder="Enter item description"
                            value={item.item}
                            onChange={(e) => handleItemChange(item.id, 'item', e.target.value)}
                          />
                        )}
                      </td>

                      {/* Batch Number (Medical) */}
                      {isMedical && (
                        <td className="py-3 px-3">
                          {availableItemBatches.length > 0 ? (
                            <div className="space-y-1">
                              <select
                                value={item.batchNo || ''}
                                onChange={(e) => handleItemChange(item.id, 'batchNo', e.target.value)}
                                className="w-full rounded-md border border-gray-300 shadow-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 px-2 py-1.5 text-xs bg-white font-mono"
                              >
                                <option value="">-- Select Batch --</option>
                                {availableItemBatches.map((b) => (
                                  <option key={b.id} value={b.batchNo}>
                                    {b.batchNo} (Qty: {b.quantity}, Exp: {b.expiryDate ? b.expiryDate.split('T')[0] : 'N/A'})
                                  </option>
                                ))}
                              </select>
                              <Input
                                placeholder="Or custom batch no"
                                value={item.batchNo || ''}
                                onChange={(e) => handleItemChange(item.id, 'batchNo', e.target.value)}
                                className="text-xs font-mono"
                              />
                            </div>
                          ) : (
                            <Input
                              placeholder="Batch Number"
                              value={item.batchNo || ''}
                              onChange={(e) => handleItemChange(item.id, 'batchNo', e.target.value)}
                              className="text-xs font-mono"
                            />
                          )}
                        </td>
                      )}

                      {/* Expiry Date (Medical) */}
                      {isMedical && (
                        <td className="py-3 px-3">
                          <input
                            type="date"
                            value={item.expiryDate || ''}
                            onChange={(e) => handleItemChange(item.id, 'expiryDate', e.target.value)}
                            className="w-full rounded-md border border-gray-300 shadow-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 px-2 py-1.5 text-xs"
                          />
                          {item.expiryDate && new Date(item.expiryDate) < new Date() && (
                            <span className="text-[10px] text-red-600 font-bold block mt-0.5">⚠️ Expired</span>
                          )}
                        </td>
                      )}

                      {/* Quantity */}
                      <td className="py-3 px-3">
                        <input
                          type="number"
                          min="0.01"
                          step="any"
                          value={item.qty}
                          onChange={(e) => handleItemChange(item.id, 'qty', e.target.value)}
                          className={`w-full rounded-md border shadow-sm focus:ring-1 px-2.5 py-1.5 text-sm ${
                            remainingStock != null && remainingStock < 0
                              ? 'border-red-400 focus:border-red-500 focus:ring-red-500 bg-red-50/40 text-red-900 font-semibold'
                              : 'border-gray-300 focus:border-blue-500 focus:ring-blue-500'
                          }`}
                        />
                      </td>

                      {/* Unit */}
                      <td className="py-3 px-3">
                        <input
                          type="text"
                          placeholder="e.g. pcs, box"
                          value={item.unit}
                          onChange={(e) => handleItemChange(item.id, 'unit', e.target.value)}
                          className="w-full rounded-md border border-gray-300 shadow-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 px-2.5 py-1.5 text-sm"
                        />
                      </td>

                      {/* Unit Price */}
                      <td className="py-3 px-3">
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          value={item.unitPrice}
                          onChange={(e) => handleItemChange(item.id, 'unitPrice', e.target.value)}
                          className="w-full rounded-md border border-gray-300 shadow-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 px-2.5 py-1.5 text-sm"
                        />
                      </td>

                      {/* Total */}
                      <td className="py-3 px-4 text-right font-semibold text-gray-900 text-sm">
                        ETB {item.total.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>

                      {/* Remove Line */}
                      <td className="py-3 px-3 text-center">
                        <button
                          type="button"
                          onClick={() => handleRemoveItem(item.id)}
                          disabled={items.length <= 1}
                          className="text-gray-400 hover:text-red-600 disabled:opacity-30 transition-colors p-1"
                          title="Remove item"
                        >
                          ✕
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="p-4 bg-gray-50 border-t border-gray-200 flex flex-col sm:flex-row justify-between items-center gap-4">
            <Button variant="secondary" size="sm" onClick={handleAddItem}>
              + Add Another Line
            </Button>
            <div className="text-right">
              <span className="text-xs text-gray-500 uppercase tracking-wider block font-semibold">Total Order Amount</span>
              <span className="text-xl sm:text-2xl font-mono font-bold text-gray-900">
                ETB {totalAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>
          </div>
        </CardBody>
      </Card>
    </div>
  );
}
