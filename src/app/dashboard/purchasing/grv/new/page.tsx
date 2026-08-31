'use client';

import React, { useState, useEffect, useMemo } from 'react';
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
  Search,
  ChevronDown,
  X,
  Check,
  Plus,
  Trash2,
  RefreshCw,
  Sparkles,
  FileText,
  ClipboardList,
} from 'lucide-react';
import { Card, CardHeader, CardBody, Button, Input } from '@/components/ui';

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

interface PurchaseOrderOption {
  id: string;
  poNo: string;
  supplierId: string;
  totalAmount: number;
  status: string;
  items?: string;
  supplier?: { companyName: string };
}

interface GRVLineItem {
  id: string; // unique row key
  itemId: string;
  item: ItemOption;
  orderedQty: string;
  receivedQty: string;
  costPrice: string;
  batchNo: string;
  expiryDate: string;
  condition: 'Good' | 'Damaged' | 'Defective';
  warehouse: string;
}

const DIVISIONS = [
  { value: 'CONSTRUCTION', label: 'Construction' },
  { value: 'MEDICAL', label: 'Medical & Pharma' },
  { value: 'CEMENT', label: 'Cement' },
  { value: 'AGGREGATE', label: 'Aggregate' },
  { value: 'GENERAL', label: 'General Merchandise' },
  { value: 'BOTH', label: 'Both / Cross-Division' },
];

export default function NewGoodsReceivedVoucherPage() {
  const router = useRouter();

  // Division Filter
  const [division, setDivision] = useState('CONSTRUCTION');

  // Intake Header State
  const [warehouse, setWarehouse] = useState('main');
  const [supplierId, setSupplierId] = useState('');
  const [purchaseOrderId, setPurchaseOrderId] = useState('');
  const [receivedDate, setReceivedDate] = useState(new Date().toISOString().split('T')[0]);
  const [defaultExpiry, setDefaultExpiry] = useState('');
  const [receivedBy, setReceivedBy] = useState('');

  // Multi-item GRV Lines
  const [items, setItems] = useState<GRVLineItem[]>([]);

  // Catalogs and Dropdown States
  const [catalogItems, setCatalogItems] = useState<ItemOption[]>([]);
  const [suppliers, setSuppliers] = useState<SupplierOption[]>([]);
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrderOption[]>([]);
  const [loadingItems, setLoadingItems] = useState(false);
  const [loadingSuppliers, setLoadingSuppliers] = useState(false);
  const [loadingPOs, setLoadingPOs] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Search & Catalog Picker States
  const [itemSearch, setItemSearch] = useState('');
  const [supplierSearch, setSupplierSearch] = useState('');
  const [isSupplierDropdownOpen, setIsSupplierDropdownOpen] = useState(false);
  const [selectedCatalogIds, setSelectedCatalogIds] = useState<Set<string>>(new Set());

  // Fetch Items filtered by selected Division
  useEffect(() => {
    async function fetchItems() {
      try {
        setLoadingItems(true);
        const params = new URLSearchParams({ limit: '500' });
        if (division && division !== 'BOTH') {
          params.append('division', division);
        }

        const res = await fetch(`/api/items?${params.toString()}`);
        const json = await res.json();
        if (json.success && Array.isArray(json.data)) {
          setCatalogItems(json.data);
        } else {
          setCatalogItems([]);
        }
      } catch (err) {
        console.error('Error fetching items:', err);
        setCatalogItems([]);
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
        const res = await fetch('/api/suppliers?limit=500');
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

  // Fetch Purchase Orders
  useEffect(() => {
    async function fetchPOs() {
      try {
        setLoadingPOs(true);
        const res = await fetch('/api/purchasing/orders?limit=200');
        const json = await res.json();
        if (json.success && Array.isArray(json.data)) {
          setPurchaseOrders(json.data);
        } else {
          setPurchaseOrders([]);
        }
      } catch (err) {
        console.error('Error fetching POs:', err);
        setPurchaseOrders([]);
      } finally {
        setLoadingPOs(false);
      }
    }

    fetchPOs();
  }, []);

  // Filter suppliers based on division relevance
  const filteredSuppliers = useMemo(() => {
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

  // Filter items by search term
  const filteredCatalogItems = useMemo(() => {
    if (!itemSearch.trim()) return catalogItems;
    const q = itemSearch.toLowerCase();
    return catalogItems.filter(
      (item) =>
        item.name.toLowerCase().includes(q) ||
        item.code.toLowerCase().includes(q) ||
        (item.genericName && item.genericName.toLowerCase().includes(q)) ||
        (item.category && item.category.toLowerCase().includes(q)) ||
        (item.manufacturer && item.manufacturer.toLowerCase().includes(q)) ||
        (item.strength && item.strength.toLowerCase().includes(q))
    );
  }, [catalogItems, itemSearch]);

  // Filter suppliers by search term
  const searchedSuppliers = useMemo(() => {
    if (!supplierSearch.trim()) return filteredSuppliers;
    const q = supplierSearch.toLowerCase();
    return filteredSuppliers.filter(
      (s) =>
        s.companyName.toLowerCase().includes(q) ||
        s.code.toLowerCase().includes(q) ||
        (s.category && s.category.toLowerCase().includes(q)) ||
        (s.tin && s.tin.toLowerCase().includes(q))
    );
  }, [filteredSuppliers, supplierSearch]);

  const selectedSupplier = suppliers.find((s) => s.id === supplierId);

  // When PO is selected, auto-fill supplier and items if matching
  const handlePOSelect = (poId: string) => {
    setPurchaseOrderId(poId);
    if (!poId) return;

    const po = purchaseOrders.find((p) => p.id === poId);
    if (po) {
      if (po.supplierId && !supplierId) {
        setSupplierId(po.supplierId);
      }
      try {
        const poItems = typeof po.items === 'string' ? JSON.parse(po.items) : po.items;
        if (Array.isArray(poItems) && poItems.length > 0 && items.length === 0) {
          const newLines: GRVLineItem[] = poItems.map((pi: any) => {
            const matchedCatalog = catalogItems.find((ci) => ci.id === pi.itemId || ci.name === (pi.itemName || pi.item));
            const dummyItem: ItemOption = matchedCatalog || {
              id: pi.itemId || `temp-${Math.random()}`,
              name: pi.itemName || pi.item || 'PO Item',
              code: pi.code || pi.itemCode || 'PO-ITEM',
              category: 'General',
              unit: pi.unit || 'pcs',
              division: division,
            };

            return {
              id: `${dummyItem.id}-${Date.now()}-${Math.random()}`,
              itemId: dummyItem.id,
              item: dummyItem,
              orderedQty: String(pi.qty || pi.quantity || 1),
              receivedQty: String(pi.qty || pi.quantity || 1),
              costPrice: String(pi.unitPrice || pi.price || 0),
              batchNo: generateBatchNo(dummyItem),
              expiryDate: defaultExpiry || '',
              condition: 'Good',
              warehouse: warehouse,
            };
          });
          setItems(newLines);
        }
      } catch (err) {
        console.warn('Could not parse PO items:', err);
      }
    }
  };

  // Helper to generate batch number for an item
  const generateBatchNo = (item: ItemOption) => {
    const d = new Date();
    const yr = d.getFullYear();
    const mo = String(d.getMonth() + 1).padStart(2, '0');
    const rnd = Math.floor(1000 + Math.random() * 9000);
    const prefix = item.code ? item.code.replace(/[^a-zA-Z0-9]/g, '').slice(0, 6) : 'GRV';
    return `${prefix}-${yr}${mo}-${rnd}`;
  };

  // Add single item to intake lines
  const handleAddItem = (item: ItemOption) => {
    const defaultDate = defaultExpiry || (() => {
      const d = new Date();
      d.setFullYear(d.getFullYear() + 2);
      return d.toISOString().slice(0, 10);
    })();

    const newLine: GRVLineItem = {
      id: `${item.id}-${Date.now()}-${Math.random()}`,
      itemId: item.id,
      item,
      orderedQty: '1',
      receivedQty: '1',
      costPrice: '0',
      batchNo: generateBatchNo(item),
      expiryDate: item.batchTracked || division === 'MEDICAL' ? defaultDate : '',
      condition: 'Good',
      warehouse: warehouse,
    };

    setItems((prev) => [...prev, newLine]);
  };

  // Add multiple checked items from catalog
  const handleAddSelectedFromCatalog = () => {
    const defaultDate = defaultExpiry || (() => {
      const d = new Date();
      d.setFullYear(d.getFullYear() + 2);
      return d.toISOString().slice(0, 10);
    })();

    const itemsToAdd = catalogItems.filter((it) => selectedCatalogIds.has(it.id));
    const newLines: GRVLineItem[] = itemsToAdd.map((item) => ({
      id: `${item.id}-${Date.now()}-${Math.random()}`,
      itemId: item.id,
      item,
      orderedQty: '1',
      receivedQty: '1',
      costPrice: '0',
      batchNo: generateBatchNo(item),
      expiryDate: item.batchTracked || division === 'MEDICAL' ? defaultDate : '',
      condition: 'Good',
      warehouse: warehouse,
    }));

    setItems((prev) => [...prev, ...newLines]);
    setSelectedCatalogIds(new Set());
  };

  // Toggle selection in catalog
  const toggleCatalogSelect = (id: string) => {
    setSelectedCatalogIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleSelectAllFilteredCatalog = () => {
    if (filteredCatalogItems.every((it) => selectedCatalogIds.has(it.id))) {
      setSelectedCatalogIds(new Set());
    } else {
      setSelectedCatalogIds(new Set(filteredCatalogItems.map((it) => it.id)));
    }
  };

  // Update a line item field
  const handleUpdateLine = (id: string, field: keyof GRVLineItem, value: any) => {
    setItems((prev) =>
      prev.map((line) => (line.id === id ? { ...line, [field]: value } : line))
    );
  };

  // Auto-generate batch numbers for all lines
  const handleAutoBatchAll = () => {
    setItems((prev) =>
      prev.map((line) => ({
        ...line,
        batchNo: generateBatchNo(line.item),
      }))
    );
  };

  // Remove a line item
  const handleRemoveLine = (id: string) => {
    setItems((prev) => prev.filter((line) => line.id !== id));
  };

  // Clear all lines
  const handleClearAllLines = () => {
    setItems([]);
  };

  // Calculated totals
  const totalReceivedQuantity = useMemo(() => {
    return items.reduce((sum, line) => sum + (parseFloat(line.receivedQty) || 0), 0);
  }, [items]);

  const totalValuation = useMemo(() => {
    return items.reduce((sum, line) => {
      const q = parseFloat(line.receivedQty) || 0;
      const c = parseFloat(line.costPrice) || 0;
      return sum + q * c;
    }, 0);
  }, [items]);

  // Form Submit
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!supplierId) {
      setErrorMsg('Please select a supplier for this Goods Received Voucher');
      return;
    }

    if (items.length === 0) {
      setErrorMsg('Please select and add at least one item to receive into stock');
      return;
    }

    // Validate line items
    for (let i = 0; i < items.length; i++) {
      const line = items[i];
      const recQty = parseFloat(line.receivedQty);
      if (isNaN(recQty) || recQty <= 0) {
        setErrorMsg(`Row ${i + 1} (${line.item.name}): Received quantity must be greater than 0`);
        return;
      }
      const cost = parseFloat(line.costPrice);
      if (isNaN(cost) || cost < 0) {
        setErrorMsg(`Row ${i + 1} (${line.item.name}): Unit cost must be 0 or higher`);
        return;
      }
    }

    setSubmitting(true);
    try {
      const payload = {
        supplierId,
        purchaseOrderId: purchaseOrderId || null,
        warehouse,
        division,
        receivedDate,
        receivedBy: receivedBy || null,
        totalAmount: totalValuation,
        status: 'Received',
        items: items.map((line) => ({
          itemId: line.itemId,
          item: line.item.name,
          name: line.item.name,
          code: line.item.code,
          unit: line.item.unit,
          orderedQty: parseFloat(line.orderedQty) || 0,
          receivedQty: parseFloat(line.receivedQty) || 0,
          quantity: parseFloat(line.receivedQty) || 0,
          costPrice: parseFloat(line.costPrice) || 0,
          unitPrice: parseFloat(line.costPrice) || 0,
          batchNo: line.batchNo ? line.batchNo.trim() : null,
          expiryDate: line.expiryDate || null,
          condition: line.condition || 'Good',
          warehouse: line.warehouse || warehouse,
        })),
      };

      const response = await fetch('/api/purchasing/grv', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const json = await response.json();

      if (!response.ok || !json.success) {
        throw new Error(json.error || 'Failed to create Goods Received Voucher');
      }

      alert('Goods Received Voucher saved successfully and inventory stock balances updated!');
      router.push('/dashboard/purchasing/grv');
    } catch (err: any) {
      setErrorMsg(err.message || 'Error occurred while saving GRV');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900 flex items-center gap-2.5">
            <Package className="w-6 h-6 text-blue-600" />
            New Goods Received Voucher (GRV)
          </h1>
          <p className="text-xs sm:text-sm text-gray-600 mt-1">
            Receive items into inventory, automatically update stock balances, track batches, and calculate valuations.
          </p>
        </div>

        <Link href="/dashboard/purchasing/grv">
          <Button variant="secondary" icon={<ArrowLeft className="w-4 h-4" />}>
            Back to GRV List
          </Button>
        </Link>
      </div>

      {errorMsg && (
        <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-800 text-sm flex items-start gap-3 shadow-xs animate-fadeIn">
          <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="font-semibold">Unable to Save Goods Received Voucher</p>
            <p className="text-xs sm:text-sm mt-0.5">{errorMsg}</p>
          </div>
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-6">
        {/* Section 1: Header Parameters */}
        <Card className="bg-white border border-gray-200 shadow-xs">
          <CardHeader className="border-b border-gray-100 bg-gray-50/50 pb-3">
            <div className="flex items-center gap-2">
              <Layers className="w-5 h-5 text-blue-600" />
              <h2 className="text-base font-semibold text-gray-900">
                1. Division, Supplier & Storage Setup
              </h2>
            </div>
          </CardHeader>
          <CardBody className="p-4 sm:p-6 space-y-5">
            {/* Division Selector */}
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
                      onClick={() => {
                        setDivision(div.value);
                        setSelectedCatalogIds(new Set());
                      }}
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
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              {/* Supplier Searchable Selector */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-bold uppercase tracking-wider text-gray-700">
                    Select Supplier *
                  </label>
                  <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-gray-100 text-gray-700 border border-gray-200">
                    {loadingSuppliers ? 'Loading...' : `${filteredSuppliers.length} available`}
                  </span>
                </div>

                {selectedSupplier ? (
                  <div className="p-3 bg-gray-50 rounded-xl border border-gray-200 shadow-2xs space-y-1">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="font-bold text-sm text-gray-900">{selectedSupplier.companyName}</span>
                          <span className="px-1.5 py-0.5 text-[10px] font-mono bg-gray-200 text-gray-800 rounded">
                            {selectedSupplier.code}
                          </span>
                        </div>
                        <p className="text-xs text-gray-600 mt-0.5">
                          {selectedSupplier.category || 'Supplier'} {selectedSupplier.phone ? `• ${selectedSupplier.phone}` : ''}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setSupplierId('');
                          setSupplierSearch('');
                          setIsSupplierDropdownOpen(true);
                        }}
                        className="px-2 py-1 text-xs font-semibold bg-white text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-100 transition-colors"
                      >
                        Change
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="relative">
                    <div className="relative">
                      <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        placeholder="Search supplier by name, code, TIN..."
                        value={supplierSearch}
                        onChange={(e) => {
                          setSupplierSearch(e.target.value);
                          setIsSupplierDropdownOpen(true);
                        }}
                        onFocus={() => setIsSupplierDropdownOpen(true)}
                        className="w-full pl-9 pr-8 py-2 text-sm border border-gray-300 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-2xs"
                      />
                      {supplierSearch && (
                        <button
                          type="button"
                          onClick={() => setSupplierSearch('')}
                          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>

                    {isSupplierDropdownOpen && (
                      <div className="mt-1.5 border border-gray-200 rounded-xl bg-white shadow-lg max-h-56 overflow-y-auto divide-y divide-gray-100 z-20 absolute left-0 right-0">
                        {loadingSuppliers ? (
                          <div className="p-3 text-center text-xs text-gray-500">Loading suppliers...</div>
                        ) : searchedSuppliers.length === 0 ? (
                          <div className="p-3 text-center text-xs text-gray-600">No suppliers found.</div>
                        ) : (
                          searchedSuppliers.map((s) => (
                            <button
                              key={s.id}
                              type="button"
                              onClick={() => {
                                setSupplierId(s.id);
                                setIsSupplierDropdownOpen(false);
                                setSupplierSearch('');
                              }}
                              className="w-full text-left p-2.5 hover:bg-gray-50 transition-colors flex items-center justify-between text-xs"
                            >
                              <div>
                                <span className="font-semibold text-gray-900">{s.companyName}</span>
                                <span className="ml-1.5 text-[10px] font-mono text-gray-500">({s.code})</span>
                              </div>
                              <span className="text-[10px] text-gray-500">{s.category || ''}</span>
                            </button>
                          ))
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Warehouse */}
              <div className="space-y-2">
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-700">
                  Target Warehouse *
                </label>
                <select
                  value={warehouse}
                  onChange={(e) => setWarehouse(e.target.value)}
                  className="w-full h-10 rounded-xl border border-gray-300 bg-white px-3 py-1.5 text-sm shadow-2xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                >
                  <option value="main">Main Warehouse / Central Store</option>
                  <option value="medical_store">Medical Store (Main Pharmacy)</option>
                  <option value="site_store">Site Store / Project Warehouse</option>
                  <option value="cement_depot">Cement Depot</option>
                </select>
              </div>

              {/* Purchase Order Link (Optional) */}
              <div className="space-y-2">
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-700">
                  Linked Purchase Order (Optional)
                </label>
                <select
                  value={purchaseOrderId}
                  onChange={(e) => handlePOSelect(e.target.value)}
                  className="w-full h-10 rounded-xl border border-gray-300 bg-white px-3 py-1.5 text-sm shadow-2xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">-- No PO / Direct Intake --</option>
                  {purchaseOrders.map((po) => (
                    <option key={po.id} value={po.id}>
                      {po.poNo} {po.supplier?.companyName ? `(${po.supplier.companyName})` : ''} - ETB {po.totalAmount.toLocaleString()}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Row 2: Dates & Received By */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5 pt-2">
              <div className="space-y-2">
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-700">
                  Received Date *
                </label>
                <input
                  type="date"
                  value={receivedDate}
                  onChange={(e) => setReceivedDate(e.target.value)}
                  className="w-full h-10 rounded-xl border border-gray-300 bg-white px-3 py-1.5 text-sm shadow-2xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              <div className="space-y-2">
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-700">
                  Received By / Officer
                </label>
                <input
                  type="text"
                  placeholder="Storekeeper / Receiver Name"
                  value={receivedBy}
                  onChange={(e) => setReceivedBy(e.target.value)}
                  className="w-full h-10 rounded-xl border border-gray-300 bg-white px-3 py-1.5 text-sm shadow-2xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="space-y-2">
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-700">
                  Default Expiry Date Preset
                </label>
                <input
                  type="date"
                  value={defaultExpiry}
                  onChange={(e) => {
                    setDefaultExpiry(e.target.value);
                    if (e.target.value) {
                      setItems((prev) =>
                        prev.map((l) => (!l.expiryDate ? { ...l, expiryDate: e.target.value } : l))
                      );
                    }
                  }}
                  className="w-full h-10 rounded-xl border border-gray-300 bg-white px-3 py-1.5 text-sm shadow-2xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          </CardBody>
        </Card>

        {/* Section 2: Multi-Item Picker / Search & Add from Catalog */}
        <Card className="bg-white border border-gray-200 shadow-xs">
          <CardHeader className="border-b border-gray-100 bg-gray-50/50 pb-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <Search className="w-5 h-5 text-blue-600" />
                <h2 className="text-base font-semibold text-gray-900">
                  2. Search & Select Items to Receive into Stock ({catalogItems.length} in {division})
                </h2>
              </div>

              {selectedCatalogIds.size > 0 && (
                <Button
                  type="button"
                  size="sm"
                  onClick={handleAddSelectedFromCatalog}
                  icon={<Plus className="w-3.5 h-3.5" />}
                >
                  Add ({selectedCatalogIds.size}) Selected Items to GRV
                </Button>
              )}
            </div>
          </CardHeader>
          <CardBody className="p-4 sm:p-6 space-y-4">
            {/* Search filter bar */}
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="relative flex-1 min-w-[260px]">
                <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder={`Search ${division} catalog by item name, code, generic name, category...`}
                  value={itemSearch}
                  onChange={(e) => setItemSearch(e.target.value)}
                  className="w-full pl-9 pr-8 py-2 text-sm border border-gray-300 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-2xs"
                />
                {itemSearch && (
                  <button
                    type="button"
                    onClick={() => setItemSearch('')}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleSelectAllFilteredCatalog}
                  className="text-xs font-semibold text-blue-600 hover:text-blue-700 underline"
                >
                  {filteredCatalogItems.length > 0 && filteredCatalogItems.every((it) => selectedCatalogIds.has(it.id))
                    ? 'Deselect All'
                    : 'Select All Filtered'}
                </button>
                <span className="text-xs text-gray-500">
                  ({filteredCatalogItems.length} matching)
                </span>
              </div>
            </div>

            {/* Catalog List */}
            <div className="border border-gray-200 rounded-xl overflow-hidden bg-white max-h-72 overflow-y-auto divide-y divide-gray-100">
              {loadingItems ? (
                <div className="p-6 text-center text-xs text-gray-500">Loading catalog items...</div>
              ) : filteredCatalogItems.length === 0 ? (
                <div className="p-6 text-center space-y-2">
                  <p className="text-xs text-gray-600">
                    No items found matching &quot;{itemSearch}&quot; in {division} division.
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      setDivision('BOTH');
                      setItemSearch('');
                    }}
                    className="text-xs font-semibold text-blue-600 hover:underline"
                  >
                    Switch to Cross-Division Catalog
                  </button>
                </div>
              ) : (
                filteredCatalogItems.map((item) => {
                  const isChecked = selectedCatalogIds.has(item.id);
                  const alreadyAddedCount = items.filter((l) => l.itemId === item.id).length;

                  return (
                    <div
                      key={item.id}
                      className={`p-3 flex flex-wrap sm:flex-nowrap items-center justify-between gap-3 transition-colors ${
                        isChecked ? 'bg-blue-50/70' : 'hover:bg-gray-50'
                      }`}
                    >
                      <label className="flex items-center gap-3 cursor-pointer flex-1 min-w-0">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => toggleCatalogSelect(item.id)}
                          className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 shrink-0"
                        />
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-1.5">
                            <span className="font-semibold text-sm text-gray-900">{item.name}</span>
                            <span className="px-1.5 py-0.5 text-[10px] font-mono font-semibold bg-gray-100 text-gray-700 rounded">
                              {item.code}
                            </span>
                            {alreadyAddedCount > 0 && (
                              <span className="px-1.5 py-0.5 text-[10px] font-bold bg-green-100 text-green-800 rounded">
                                {alreadyAddedCount} in GRV
                              </span>
                            )}
                          </div>
                          <div className="flex flex-wrap items-center gap-2 mt-0.5 text-xs text-gray-500">
                            {item.genericName && <span>Gen: <strong className="text-gray-700">{item.genericName}</strong></span>}
                            {item.category && <span>• Cat: {item.category}</span>}
                            {item.strength && <span>• {item.strength}</span>}
                            {item.manufacturer && <span>• Mfg: {item.manufacturer}</span>}
                          </div>
                        </div>
                      </label>

                      <div className="flex items-center gap-3 shrink-0">
                        <span className="px-2 py-0.5 text-xs font-mono font-bold bg-blue-50 text-blue-700 rounded border border-blue-200">
                          {item.unit}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleAddItem(item)}
                          className="px-2.5 py-1 text-xs font-semibold bg-blue-600 text-white rounded-lg hover:bg-blue-700 shadow-2xs transition-colors flex items-center gap-1"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>+ Add Line</span>
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </CardBody>
        </Card>

        {/* Section 3: GRV Intake Items Table */}
        <Card className="bg-white border border-gray-200 shadow-xs overflow-hidden">
          <CardHeader className="border-b border-gray-100 bg-gray-50/50 pb-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <Building2 className="w-5 h-5 text-blue-600" />
                <h2 className="text-base font-semibold text-gray-900">
                  3. Received Items & Inventory Details ({items.length} Items)
                </h2>
              </div>

              {items.length > 0 && (
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleAutoBatchAll}
                    icon={<Sparkles className="w-3.5 h-3.5 text-blue-600" />}
                  >
                    Auto-Generate All Batch Nos
                  </Button>
                  <button
                    type="button"
                    onClick={handleClearAllLines}
                    className="text-xs font-semibold text-red-600 hover:text-red-700 underline px-2"
                  >
                    Clear All
                  </button>
                </div>
              )}
            </div>
          </CardHeader>
          <CardBody className="p-0">
            {items.length === 0 ? (
              <div className="p-12 text-center space-y-3">
                <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 mx-auto flex items-center justify-center">
                  <Package className="w-6 h-6" />
                </div>
                <h3 className="font-semibold text-sm text-gray-900">No items added to GRV yet</h3>
                <p className="text-xs text-gray-500 max-w-md mx-auto">
                  Search and check items in the catalog above, then click <strong>&quot;+ Add Line&quot;</strong> or <strong>&quot;Add Selected Items&quot;</strong> to configure received quantities, unit costs, batches, and conditions.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-gray-50 border-b border-gray-200 text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    <tr>
                      <th className="px-3 py-3 w-10 text-center">#</th>
                      <th className="px-3 py-3 min-w-[200px]">Item Details</th>
                      <th className="px-3 py-3 min-w-[100px]">Ordered Qty</th>
                      <th className="px-3 py-3 min-w-[110px]">Received Qty *</th>
                      <th className="px-3 py-3 min-w-[120px]">Unit Cost (ETB)</th>
                      <th className="px-3 py-3 min-w-[160px]">Batch Number</th>
                      <th className="px-3 py-3 min-w-[140px]">Expiry Date</th>
                      <th className="px-3 py-3 min-w-[110px]">Condition</th>
                      <th className="px-3 py-3 min-w-[130px] text-right">Subtotal (ETB)</th>
                      <th className="px-3 py-3 w-14 text-center">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {items.map((line, idx) => {
                      const lineQty = parseFloat(line.receivedQty) || 0;
                      const lineCost = parseFloat(line.costPrice) || 0;
                      const lineSubtotal = lineQty * lineCost;

                      return (
                        <tr key={line.id} className="hover:bg-gray-50/50 transition-colors">
                          <td className="px-3 py-3 text-center text-xs font-mono text-gray-400">
                            {idx + 1}
                          </td>
                          <td className="px-3 py-3">
                            <div className="font-semibold text-gray-900 text-xs">{line.item.name}</div>
                            <div className="flex items-center gap-1.5 mt-0.5">
                              <span className="px-1.5 py-0.5 text-[10px] font-mono bg-gray-100 text-gray-600 rounded">
                                {line.item.code}
                              </span>
                              <span className="text-[10px] text-blue-600 font-medium">
                                ({line.item.unit})
                              </span>
                            </div>
                          </td>
                          <td className="px-3 py-3">
                            <input
                              type="number"
                              min="0"
                              value={line.orderedQty}
                              onChange={(e) => handleUpdateLine(line.id, 'orderedQty', e.target.value)}
                              className="w-20 px-2 py-1 text-xs border border-gray-300 rounded-lg focus:ring-1 focus:ring-blue-500 font-mono"
                            />
                          </td>
                          <td className="px-3 py-3">
                            <input
                              type="number"
                              min="0.01"
                              step="any"
                              value={line.receivedQty}
                              onChange={(e) => handleUpdateLine(line.id, 'receivedQty', e.target.value)}
                              className="w-24 px-2 py-1 text-xs font-bold border border-blue-300 bg-blue-50/30 rounded-lg focus:ring-1 focus:ring-blue-500 font-mono"
                              required
                            />
                          </td>
                          <td className="px-3 py-3">
                            <input
                              type="number"
                              min="0"
                              step="any"
                              placeholder="0.00"
                              value={line.costPrice}
                              onChange={(e) => handleUpdateLine(line.id, 'costPrice', e.target.value)}
                              className="w-28 px-2 py-1 text-xs border border-gray-300 rounded-lg focus:ring-1 focus:ring-blue-500 font-mono"
                            />
                          </td>
                          <td className="px-3 py-3">
                            <div className="flex items-center gap-1">
                              <input
                                type="text"
                                placeholder="Batch / Lot #"
                                value={line.batchNo}
                                onChange={(e) => handleUpdateLine(line.id, 'batchNo', e.target.value)}
                                className="w-full px-2 py-1 text-xs border border-gray-300 rounded-lg focus:ring-1 focus:ring-blue-500 font-mono"
                              />
                              <button
                                type="button"
                                onClick={() => handleUpdateLine(line.id, 'batchNo', generateBatchNo(line.item))}
                                title="Regenerate Batch No"
                                className="p-1 text-gray-400 hover:text-blue-600 rounded"
                              >
                                <Sparkles className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                          <td className="px-3 py-3">
                            <input
                              type="date"
                              value={line.expiryDate}
                              onChange={(e) => handleUpdateLine(line.id, 'expiryDate', e.target.value)}
                              className="w-full px-2 py-1 text-xs border border-gray-300 rounded-lg focus:ring-1 focus:ring-blue-500"
                            />
                          </td>
                          <td className="px-3 py-3">
                            <select
                              value={line.condition}
                              onChange={(e) => handleUpdateLine(line.id, 'condition', e.target.value as any)}
                              className="w-full px-2 py-1 text-xs border border-gray-300 rounded-lg focus:ring-1 focus:ring-blue-500 bg-white"
                            >
                              <option value="Good">Good</option>
                              <option value="Damaged">Damaged</option>
                              <option value="Defective">Defective</option>
                            </select>
                          </td>
                          <td className="px-3 py-3 text-right font-mono font-semibold text-gray-900 text-xs">
                            {lineSubtotal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </td>
                          <td className="px-3 py-3 text-center">
                            <button
                              type="button"
                              onClick={() => handleRemoveLine(line.id)}
                              className="p-1 text-gray-400 hover:text-red-600 transition-colors"
                              title="Remove item"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {/* Summary metrics footer */}
            {items.length > 0 && (
              <div className="p-4 bg-gray-50/80 border-t border-gray-200 flex flex-wrap items-center justify-between gap-4">
                <div className="flex flex-wrap items-center gap-6 text-xs text-gray-600">
                  <div>
                    Total Items: <strong className="text-gray-900 font-bold">{items.length} lines</strong>
                  </div>
                  <div>
                    Total Received Quantity: <strong className="text-gray-900 font-bold">{totalReceivedQuantity.toLocaleString()} units</strong>
                  </div>
                  <div>
                    Target Warehouse: <strong className="text-blue-700 font-bold">{warehouse}</strong>
                  </div>
                </div>

                <div className="text-right">
                  <span className="text-xs text-gray-500 uppercase tracking-wider font-semibold block">
                    Total GRV Valuation (ETB)
                  </span>
                  <span className="text-xl sm:text-2xl font-black text-gray-900">
                    ETB {totalValuation.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>
              </div>
            )}
          </CardBody>
        </Card>

        {/* Action Buttons */}
        <div className="flex flex-wrap justify-end gap-3 pt-2">
          <Link href="/dashboard/purchasing/grv">
            <Button variant="outline" size="lg" type="button">
              Cancel
            </Button>
          </Link>
          <Button
            variant="primary"
            size="lg"
            type="submit"
            disabled={submitting || items.length === 0}
            icon={<CheckCircle className="w-4 h-4" />}
          >
            {submitting ? 'Saving GRV & Updating Stock...' : 'Save Goods Received Voucher'}
          </Button>
        </div>
      </form>
    </div>
  );
}
