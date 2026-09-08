'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Card, CardHeader, CardBody, Button, Input, Badge } from '@/components/ui';

interface DeliveryItem {
  id: number;
  itemId: string;
  itemName: string;
  quantity: number;
  unit: string;
  batchNo?: string;
  expiryDate?: string;
}

interface Customer {
  customerId: string;
  companyName: string;
  agreementNo?: string;
  code?: string;
  phone?: string;
  licenseNo?: string;
}

interface Item {
  id: string;
  name: string;
  code: string;
  unit: string | { name: string };
  currentStock?: number;
  totalStock?: number;
  batchStock?: number;
}

interface MedicalBatch {
  id: string;
  itemId: string;
  batchNo: string;
  expiryDate: string;
  quantity: number;
  status: string;
}

interface RegisteredTruck {
  id: string;
  plateNo: string;
  driverName?: string;
  transporterName?: string;
}

interface SalesOrder {
  id: string;
  orderNo: string;
  customerId: string;
  division: string;
  items: string | any[];
  totalAmount: number;
  status: string;
  orderDate: string;
  customer?: {
    id: string;
    companyName: string;
    phone?: string;
  };
}

const DIVISIONS = [
  { value: 'CONSTRUCTION', label: 'Construction' },
  { value: 'CEMENT', label: 'Cement' },
  { value: 'AGGREGATE', label: 'Aggregate' },
  { value: 'MEDICAL', label: 'Medical (Licensed)' },
  { value: 'GENERAL', label: 'General' },
];

export default function NewDeliveryPage() {
  const router = useRouter();
  const [division, setDivision] = useState('CONSTRUCTION');
  const [isSelfTransport, setIsSelfTransport] = useState(false);
  const [customerId, setCustomerId] = useState('');
  const [salesOrderId, setSalesOrderId] = useState('');
  const [selectedTruckId, setSelectedTruckId] = useState('');
  const [driverName, setDriverName] = useState('');
  const [truckPlateNo, setTruckPlateNo] = useState('');
  const [deliveryDate, setDeliveryDate] = useState(new Date().toISOString().split('T')[0]);
  const [items, setItems] = useState<DeliveryItem[]>([
    { id: 1, itemId: '', itemName: '', quantity: 1, unit: 'pcs', batchNo: '', expiryDate: '' },
  ]);

  const [loading, setLoading] = useState(false);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [salesOrders, setSalesOrders] = useState<SalesOrder[]>([]);
  const [masterItems, setMasterItems] = useState<Item[]>([]);
  const [medicalBatches, setMedicalBatches] = useState<MedicalBatch[]>([]);
  const [registeredTrucks, setRegisteredTrucks] = useState<RegisteredTruck[]>([]);
  const [loadingCustomers, setLoadingCustomers] = useState(true);
  const [loadingOrders, setLoadingOrders] = useState(false);
  const [loadingItems, setLoadingItems] = useState(false);
  const [loadingTrucks, setLoadingTrucks] = useState(false);

  const isMedical = division === 'MEDICAL';

  // Fetch customers, sales orders, items, registered trucks, and batches
  useEffect(() => {
    let isCancelled = false;

    async function loadData() {
      setLoadingCustomers(true);
      setLoadingOrders(true);
      setLoadingItems(true);
      setLoadingTrucks(true);

      // Reset selections on division change
      setCustomerId('');
      setSalesOrderId('');
      setSelectedTruckId('');
      setItems([{ id: 1, itemId: '', itemName: '', quantity: 1, unit: 'pcs', batchNo: '', expiryDate: '' }]);

      try {
        // Fetch registered transporters/trucks for company delivery
        fetch('/api/transporters?limit=200')
          .then((r) => r.json())
          .then((tData) => {
            if (!isCancelled && tData.success && Array.isArray(tData.data)) {
              const allTrucks: RegisteredTruck[] = [];
              tData.data.forEach((trans: any) => {
                if (Array.isArray(trans.trucks)) {
                  trans.trucks.forEach((trk: any) => {
                    allTrucks.push({
                      id: trk.id,
                      plateNo: trk.plateNo,
                      driverName: trk.driverName || trans.driverName || '',
                      transporterName: trans.companyName,
                    });
                  });
                }
              });
              setRegisteredTrucks(allTrucks);
            }
          })
          .catch(() => {})
          .finally(() => {
            if (!isCancelled) setLoadingTrucks(false);
          });
        // 1. Fetch Customers based on division
        if (division === 'MEDICAL') {
          const [custRes, batchRes] = await Promise.all([
            fetch('/api/customers?division=MEDICAL&status=Active&limit=1000').then((r) => r.json()).catch(() => ({ success: false, data: [] })),
            fetch('/api/medical/batches?limit=1000').then((r) => r.json()).catch(() => ({ success: false, data: [] })),
          ]);

          if (!isCancelled && custRes.success && Array.isArray(custRes.data)) {
            setCustomers(
              custRes.data.map((c: any) => ({
                customerId: c.id,
                companyName: c.companyName || `${c.firstName || ''} ${c.lastName || ''}`.trim() || c.code,
                phone: c.phone,
                licenseNo: c.licenseNo,
                code: c.code,
              }))
            );
          }

          if (!isCancelled && batchRes.success && Array.isArray(batchRes.data)) {
            setMedicalBatches(batchRes.data);
          }
        } else {
          setMedicalBatches([]);
          const [agreementsRes, generalRes] = await Promise.all([
            fetch(`/api/sales/agreements/customers${division ? `?division=${division}` : ''}`).then((r) => r.json()).catch(() => ({ success: false, data: [] })),
            fetch(`/api/customers${division ? `?division=${division}&status=Active&limit=1000` : '?status=Active&limit=1000'}`).then((r) => r.json()).catch(() => ({ success: false, data: [] })),
          ]);

          if (!isCancelled) {
            const customerMap = new Map<string, Customer>();
            if (agreementsRes.success && Array.isArray(agreementsRes.data)) {
              agreementsRes.data.forEach((agr: any) => {
                if (agr.customerId) {
                  customerMap.set(agr.customerId, {
                    customerId: agr.customerId,
                    companyName: agr.companyName,
                    agreementNo: agr.agreementNo,
                    phone: agr.phone,
                  });
                }
              });
            }
            if (generalRes.success && Array.isArray(generalRes.data)) {
              generalRes.data.forEach((c: any) => {
                if (!customerMap.has(c.id)) {
                  customerMap.set(c.id, {
                    customerId: c.id,
                    companyName: c.companyName || `${c.firstName || ''} ${c.lastName || ''}`.trim() || c.code,
                    phone: c.phone,
                    code: c.code,
                  });
                }
              });
            }
            setCustomers(Array.from(customerMap.values()));
          }
        }

        // 2. Fetch Sales Orders for this division
        const ordersUrl = division ? `/api/sales/orders?division=${division}&limit=200` : '/api/sales/orders?limit=200';
        const ordersRes = await fetch(ordersUrl);
        const ordersData = await ordersRes.json();
        if (!isCancelled && ordersData.success && Array.isArray(ordersData.data)) {
          setSalesOrders(ordersData.data);
        }

        // 3. Fetch Master Items for this division
        const itemsUrl = division ? `/api/items?division=${division}&limit=500` : '/api/items?limit=500';
        const itemsRes = await fetch(itemsUrl);
        const itemsData = await itemsRes.json();
        if (!isCancelled && itemsData.success && Array.isArray(itemsData.data)) {
          setMasterItems(itemsData.data);
        }
      } catch (err) {
        console.error('Error fetching delivery creation data:', err);
      } finally {
        if (!isCancelled) {
          setLoadingCustomers(false);
          setLoadingOrders(false);
          setLoadingItems(false);
        }
      }
    }

    loadData();

    return () => {
      isCancelled = true;
    };
  }, [division]);

  // Filter available sales orders based on selected customer
  const availableSalesOrders = useMemo(() => {
    if (!customerId) return salesOrders;
    return salesOrders.filter((so) => so.customerId === customerId || so.customer?.id === customerId);
  }, [salesOrders, customerId]);

  // Handle Sales Order selection and auto-populate items (including batch & expiry)
  const handleSalesOrderChange = (soId: string) => {
    setSalesOrderId(soId);
    if (!soId) return;

    const selectedSO = salesOrders.find((so) => so.id === soId);
    if (selectedSO) {
      if (selectedSO.customerId && selectedSO.customerId !== customerId) {
        setCustomerId(selectedSO.customerId);
      }

      let orderItems: any[] = [];
      try {
        orderItems = typeof selectedSO.items === 'string' ? JSON.parse(selectedSO.items) : selectedSO.items;
      } catch {
        orderItems = [];
      }

      if (Array.isArray(orderItems) && orderItems.length > 0) {
        const mappedItems: DeliveryItem[] = orderItems.map((oi: any, idx: number) => {
          const itemMaster = masterItems.find(
            (mi) => mi.id === oi.itemId || mi.id === oi.id || mi.name?.toLowerCase() === (oi.name || oi.item || oi.itemName)?.toLowerCase()
          );
          const itemId = itemMaster?.id || oi.itemId || oi.id || '';
          const unit = oi.unit || (typeof itemMaster?.unit === 'string' ? itemMaster.unit : (itemMaster?.unit as any)?.name) || 'pcs';

          // Try to match active batch for medical items
          let matchedBatchNo = oi.batchNo || oi.batch || '';
          let matchedExpiryDate = oi.expiryDate || oi.expiry || '';

          if (isMedical && !matchedBatchNo && itemId) {
            const availableForThisItem = medicalBatches.filter(
              (b) => b.itemId === itemId && (b.status === 'Available' || Number(b.quantity) > 0)
            );
            if (availableForThisItem.length > 0) {
              matchedBatchNo = availableForThisItem[0].batchNo;
              matchedExpiryDate = availableForThisItem[0].expiryDate ? availableForThisItem[0].expiryDate.split('T')[0] : '';
            }
          }

          return {
            id: idx + 1,
            itemId: itemId,
            itemName: oi.name || oi.itemName || oi.item || itemMaster?.name || oi.description || 'Item ' + (idx + 1),
            quantity: Number(oi.qty || oi.quantity || 1),
            unit: unit,
            batchNo: matchedBatchNo,
            expiryDate: matchedExpiryDate ? matchedExpiryDate.split('T')[0] : '',
          };
        });
        setItems(mappedItems);
      }
    }
  };

  const handleAddItem = () => {
    const newId = Math.max(...items.map((i) => i.id), 0) + 1;
    setItems([...items, { id: newId, itemId: '', itemName: '', quantity: 1, unit: 'pcs', batchNo: '', expiryDate: '' }]);
  };

  const handleRemoveItem = (id: number) => {
    if (items.length <= 1) return;
    setItems(items.filter((i) => i.id !== id));
  };

  const handleItemChange = (id: number, field: string, value: any) => {
    setItems(
      items.map((item) => {
        if (item.id === id) {
          if (field === 'itemId') {
            const selectedItem = masterItems.find((i) => i.id === value);
            const unit =
              typeof selectedItem?.unit === 'object' && selectedItem?.unit !== null
                ? (selectedItem.unit as any).name
                : typeof selectedItem?.unit === 'string'
                ? selectedItem.unit
                : item.unit;

            // Auto-detect batch for selected medical item
            let autoBatchNo = item.batchNo || '';
            let autoExpiryDate = item.expiryDate || '';

            if (isMedical && value) {
              const itemBatches = medicalBatches.filter(
                (b) => b.itemId === value && (b.status === 'Available' || Number(b.quantity) > 0)
              );
              if (itemBatches.length > 0) {
                autoBatchNo = itemBatches[0].batchNo;
                autoExpiryDate = itemBatches[0].expiryDate ? itemBatches[0].expiryDate.split('T')[0] : '';
              }
            }

            return {
              ...item,
              itemId: value,
              itemName: selectedItem?.name || '',
              unit: unit || 'pcs',
              batchNo: autoBatchNo,
              expiryDate: autoExpiryDate,
            };
          }

          if (field === 'batchNo') {
            // When user picks a batch, automatically set expiry date if known
            const matchedBatch = medicalBatches.find((b) => b.batchNo === value && b.itemId === item.itemId);
            return {
              ...item,
              batchNo: value,
              expiryDate: matchedBatch?.expiryDate ? matchedBatch.expiryDate.split('T')[0] : item.expiryDate,
            };
          }

          return { ...item, [field]: value };
        }
        return item;
      })
    );
  };

  const handleSave = async () => {
    if (!customerId) {
      alert('Please select a customer.');
      return;
    }
    if (!deliveryDate) {
      alert('Please select a delivery date.');
      return;
    }

    // Driver & Truck plate validation: Required only when Transport Type is DELIVERY and division is NOT medical
    if (!isSelfTransport && !isMedical) {
      if (!driverName.trim() || !truckPlateNo.trim()) {
        alert('Please provide driver name and truck plate number for company dispatched delivery.');
        return;
      }
    }

    if (items.some((i) => (!i.itemId && !i.itemName) || i.quantity <= 0)) {
      alert('Please fill in valid items and positive quantities for delivery.');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/api/sales/deliveries', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerId,
          salesOrderId: salesOrderId || null,
          division,
          driverName: isSelfTransport
            ? 'Self-Transport (Customer Pickup)'
            : isMedical
            ? driverName || 'Direct Supply / Medical Store Issue'
            : driverName,
          truckPlateNo: isSelfTransport
            ? 'Customer Vehicle / Pickup'
            : isMedical
            ? truckPlateNo || null
            : truckPlateNo,
          deliveryDate,
          items: JSON.stringify(
            items.map((i) => ({
              itemId: i.itemId || null,
              itemName: i.itemName,
              qty: i.quantity,
              unit: i.unit,
              batchNo: i.batchNo || null,
              expiryDate: i.expiryDate || null,
            }))
          ),
        }),
      });

      const result = await response.json();
      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Failed to save delivery');
      }

      alert('Delivery created successfully!');
      router.push('/dashboard/sales/deliveries');
    } catch (error) {
      alert('Error: ' + (error instanceof Error ? error.message : 'Unknown error'));
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    router.push('/dashboard/sales/deliveries');
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto p-4 sm:p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">New Sales Delivery</h1>
          <p className="text-sm text-gray-500 mt-1">
            Dispatch items to customer by division with transport mode and batch/expiry tracking.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleCancel}>
            Cancel
          </Button>
          <Button variant="primary" onClick={handleSave} disabled={loading}>
            {loading ? 'Saving Delivery...' : 'Save & Dispatch Delivery'}
          </Button>
        </div>
      </div>

      {/* Delivery Header Card */}
      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-lg font-semibold text-gray-900">1. Delivery Header & Transport Setup</h2>
            <label className="inline-flex items-center gap-2.5 px-3.5 py-1.5 rounded-lg bg-gray-50 border border-gray-300 hover:bg-gray-100 cursor-pointer transition-colors select-none">
              <input
                type="checkbox"
                checked={isSelfTransport}
                onChange={(e) => {
                  setIsSelfTransport(e.target.checked);
                  if (e.target.checked) {
                    setSelectedTruckId('');
                  }
                }}
                className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 border-gray-300"
              />
              <span className="text-xs sm:text-sm font-semibold text-gray-800 flex items-center gap-1.5">
                <span>🏢</span> Self-Transport (Customer Pickup)
              </span>
            </label>
          </div>
        </CardHeader>
        <CardBody className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Division */}
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
                {isMedical
                  ? 'Medical supply release with regulatory batch & expiry verification.'
                  : `Logistics delivery for ${division} division.`}
              </p>
            </div>

            {/* Sales Order Selection */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Sales Order Reference (Optional)
              </label>
              <select
                value={salesOrderId}
                onChange={(e) => handleSalesOrderChange(e.target.value)}
                disabled={loadingOrders}
                className="block w-full rounded-lg border border-gray-300 shadow-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-200 px-3.5 py-2.5 bg-white text-gray-900 disabled:bg-gray-100"
              >
                <option value="">
                  {loadingOrders ? 'Loading sales orders...' : '-- Select Sales Order (Auto-fills items) --'}
                </option>
                {availableSalesOrders.map((so) => (
                  <option key={so.id} value={so.id}>
                    {so.orderNo} — {so.customer?.companyName || 'Customer'} (ETB {Number(so.totalAmount || 0).toLocaleString('en-US')})
                  </option>
                ))}
              </select>
              <p className="text-xs text-blue-600 mt-1.5 font-medium">
                💡 Auto-loads customer, line items, and batch/expiry data.
              </p>
            </div>

            {/* Delivery Date */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Delivery Date <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                value={deliveryDate}
                onChange={(e) => setDeliveryDate(e.target.value)}
                className="block w-full rounded-lg border border-gray-300 shadow-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-200 px-3.5 py-2.5 bg-white text-gray-900"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Customer Selection */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Customer <span className="text-red-500">*</span>
              </label>
              <select
                value={customerId}
                onChange={(e) => setCustomerId(e.target.value)}
                disabled={loadingCustomers}
                className="block w-full rounded-lg border border-gray-300 shadow-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-200 px-3.5 py-2.5 bg-white text-gray-900 disabled:bg-gray-100"
              >
                <option value="">
                  {loadingCustomers ? 'Loading customers...' : '-- Select Customer --'}
                </option>
                {customers.map((c) => {
                  let label = c.companyName;
                  if (isMedical && c.licenseNo) {
                    label = `${c.companyName} [License: ${c.licenseNo}]`;
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
            </div>

            {/* Transport Details Section */}
            {isSelfTransport ? (
              <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center gap-3">
                <span className="text-2xl">🏢</span>
                <div>
                  <h4 className="text-xs font-bold text-emerald-900">Self-Transport (Customer Pickup) Active</h4>
                  <p className="text-[11px] text-emerald-700 mt-0.5">
                    Customer is picking up directly from warehouse/plant. No company driver or truck registration required.
                  </p>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                {/* Registered Driver & Truck Dropdown Selector */}
                {registeredTrucks.length > 0 && (
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">
                      🚚 Quick-Select Registered Driver & Truck (Optional)
                    </label>
                    <select
                      value={selectedTruckId}
                      onChange={(e) => {
                        const trkId = e.target.value;
                        setSelectedTruckId(trkId);
                        const matched = registeredTrucks.find((t) => t.id === trkId);
                        if (matched) {
                          if (matched.driverName) setDriverName(matched.driverName);
                          if (matched.plateNo) setTruckPlateNo(matched.plateNo);
                        }
                      }}
                      className="block w-full rounded-lg border border-blue-200 bg-blue-50/50 shadow-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-200 px-3 py-2 text-xs text-gray-900 font-medium"
                    >
                      <option value="">-- Choose from Registered Drivers & Trucks --</option>
                      {registeredTrucks.map((trk) => (
                        <option key={trk.id} value={trk.id}>
                          {trk.driverName ? `${trk.driverName} — ` : ''}{trk.plateNo} ({trk.transporterName})
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">
                      Driver Name {!isMedical && <span className="text-red-500">*</span>}
                    </label>
                    <Input
                      placeholder="e.g., Abebe Kebede"
                      value={driverName}
                      onChange={(e) => setDriverName(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">
                      Truck Plate No {!isMedical && <span className="text-red-500">*</span>}
                    </label>
                    <Input
                      placeholder="e.g., 3-AA-12345"
                      value={truckPlateNo}
                      onChange={(e) => setTruckPlateNo(e.target.value)}
                    />
                  </div>
                </div>
              </div>
            )}
          </div>
        </CardBody>
      </Card>

      {/* Items Section */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">2. Delivery Items</h2>
              <p className="text-xs text-gray-500 mt-0.5">
                {isMedical
                  ? `Medical batch tracking active (${medicalBatches.length} batch records indexed)`
                  : `Catalog filtered for ${division} division (${masterItems.length} items)`}
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
                  <th className="py-3 px-3 w-[15%]">Quantity</th>
                  <th className="py-3 px-3 w-[10%]">Unit</th>
                  <th className="py-3 px-3 w-[5%] text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {items.map((item) => {
                  const availableItemBatches = medicalBatches.filter((b) => b.itemId === item.itemId);

                  return (
                    <tr key={item.id} className="hover:bg-gray-50/50 transition-colors">
                      {/* Item Selector / Name */}
                      <td className="py-3 px-4">
                        {masterItems.length > 0 ? (
                          <div className="space-y-1.5">
                            <select
                              value={item.itemId}
                              onChange={(e) => handleItemChange(item.id, 'itemId', e.target.value)}
                              disabled={loadingItems}
                              className="w-full rounded-md border border-gray-300 shadow-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 px-2.5 py-1.5 text-sm bg-white"
                            >
                              <option value="">-- Select from {division} catalog --</option>
                              {masterItems.map((masterItem) => (
                                <option key={masterItem.id} value={masterItem.id}>
                                  {masterItem.code ? `[${masterItem.code}] ` : ''}{masterItem.name}
                                </option>
                              ))}
                            </select>
                            {!item.itemId && (
                              <Input
                                placeholder="Or type custom item name"
                                value={item.itemName}
                                onChange={(e) => handleItemChange(item.id, 'itemName', e.target.value)}
                                className="text-xs"
                              />
                            )}
                          </div>
                        ) : (
                          <Input
                            placeholder="Enter item name"
                            value={item.itemName}
                            onChange={(e) => handleItemChange(item.id, 'itemName', e.target.value)}
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
                          value={item.quantity}
                          onChange={(e) => handleItemChange(item.id, 'quantity', parseFloat(e.target.value) || 0)}
                          className="w-full rounded-md border border-gray-300 shadow-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 px-2.5 py-1.5 text-sm"
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

                      {/* Remove Line Action */}
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
          <div className="p-4 bg-gray-50 border-t border-gray-200 flex justify-between items-center">
            <Button variant="secondary" size="sm" onClick={handleAddItem}>
              + Add Line
            </Button>
            <span className="text-xs text-gray-500 font-medium">
              Total {items.length} line item{items.length !== 1 ?   's' : ''}
            </span>
          </div>
        </CardBody>
      </Card>

      {/* Actions */}
      <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
        <Button variant="outline" size="lg" onClick={handleCancel}>
          Cancel
        </Button>
        <Button variant="primary" size="lg" onClick={handleSave} disabled={loading}>
          {loading ? 'Saving...' : 'Save & Dispatch Delivery'}
        </Button>
      </div>
    </div>
  );
}

