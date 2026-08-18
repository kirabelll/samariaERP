'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Card, CardHeader, CardBody, Button, Input } from '@/components/ui';

interface InvoiceItem {
  id: number;
  item: string;
  qty: number;
  unitPrice: number;
  vat: number;
  total: number;
}

interface Customer {
  customerId?: string;
  id?: string;
  companyName: string;
  agreementNo?: string;
  code?: string;
  tin?: string;
  withholding?: boolean;
  withholdRate?: number;
  creditLimit?: number;
  division?: string;
}

interface Supplier {
  id: string;
  companyName: string;
  code?: string;
  tin?: string;
  phone?: string;
  category?: string;
  withholding?: boolean;
  withholdRate?: number;
}

interface AgreementItem {
  itemId?: string;
  itemName?: string;
  name?: string;
  qty?: number;
  quantity?: number;
  unit?: string;
  unitPrice?: number;
}

interface SalesAgreement {
  id: string;
  agreementNo: string;
  items: string;
  totalAmount: number;
  status: string;
  validFrom: string;
  validTo: string;
  customer?: Customer;
}

export default function NewInvoicePage() {
  const router = useRouter();
  const [division, setDivision] = useState<'CEMENT' | 'AGGREGATE' | 'CONSTRUCTION'>('CEMENT');
  const [partyType, setPartyType] = useState<'Customer' | 'Supplier'>('Customer');
  const [partyId, setPartyId] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [agreementId, setAgreementId] = useState('');
  const [liftingId, setLiftingId] = useState('');
  const [aggregateDispatchId, setAggregateDispatchId] = useState('');
  const [selectedDispatchIds, setSelectedDispatchIds] = useState<string[]>([]);
  const [selectedLiftingIds, setSelectedLiftingIds] = useState<string[]>([]);
  const [groupByCategory, setGroupByCategory] = useState(false);
  const [items, setItems] = useState<InvoiceItem[]>([]);
  const [saving, setSaving] = useState(false);
  const [applyWithholding, setApplyWithholding] = useState(false);

  // Data lists
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [agreements, setAgreements] = useState<SalesAgreement[]>([]);
  const [cementLiftings, setCementLiftings] = useState<any[]>([]);
  const [aggregateDispatches, setAggregateDispatches] = useState<any[]>([]);
  const [systemItems, setSystemItems] = useState<{ id: string; name: string; code: string }[]>([]);
  
  const [loadingCustomers, setLoadingCustomers] = useState(true);
  const [loadingSuppliers, setLoadingSuppliers] = useState(true);
  const [loadingAgreements, setLoadingAgreements] = useState(false);
  const [loadingLiftings, setLoadingLiftings] = useState(false);
  const [loadingDispatches, setLoadingDispatches] = useState(false);

  const selectedParty = partyType === 'Customer'
    ? customers.find((c) => (c.customerId || c.id) === partyId)
    : suppliers.find((s) => s.id === partyId);

  const selectedAgreement = agreements.find(a => a.id === agreementId);

  // Fetch customers and suppliers on mount
  useEffect(() => {
    const fetchCustomers = async () => {
      try {
        const res = await fetch('/api/sales/agreements/customers');
        const data = await res.json();
        if (data.success) {
          setCustomers(data.data || []);
        }
      } catch (err) {
        console.error('Failed to fetch customers:', err);
      } finally {
        setLoadingCustomers(false);
      }
    };

    const fetchSuppliers = async () => {
      try {
        const res = await fetch('/api/suppliers?limit=200');
        const data = await res.json();
        if (data.success) {
          setSuppliers(data.data || []);
        }
      } catch (err) {
        console.error('Failed to fetch suppliers:', err);
      } finally {
        setLoadingSuppliers(false);
      }
    };

    fetchCustomers();
    fetchSuppliers();

    // Fetch system items for name resolution
    fetch('/api/items?limit=500')
      .then((r) => r.json())
      .then((data) => {
        if (data.success) setSystemItems(data.data || []);
      })
      .catch(console.error);
  }, []);

  // Fetch agreements, cement liftings, or aggregate dispatches when party, division, or date range changes
  useEffect(() => {
    if (!partyId) {
      setAgreements([]);
      setCementLiftings([]);
      setAggregateDispatches([]);
      setAgreementId('');
      setLiftingId('');
      setAggregateDispatchId('');
      setSelectedDispatchIds([]);
      setSelectedLiftingIds([]);
      setItems([]);
      setApplyWithholding(false);
      return;
    }

    if (selectedParty?.withholding) {
      setApplyWithholding(true);
    } else {
      setApplyWithholding(false);
    }

    // Always fetch customer sales agreements when partyType is 'Customer' to get customer unit prices
    if (partyType === 'Customer') {
      const fetchAgreements = async () => {
        setLoadingAgreements(true);
        try {
          const res = await fetch(`/api/sales/agreements?customerId=${partyId}&limit=100`);
          const data = await res.json();
          if (data.success) {
            const activeAgreements = (data.data || []).filter(
              (a: SalesAgreement) =>
                a.status === 'Draft' || a.status === 'Active' || a.status === 'Approved'
            );
            setAgreements(activeAgreements);

            // Auto-select if division is CONSTRUCTION and only one agreement
            if (division === 'CONSTRUCTION' && activeAgreements.length === 1) {
              handleAgreementSelect(activeAgreements[0].id, activeAgreements);
            }

            // Re-update items if liftings or dispatches are already selected
            if (selectedLiftingIds.length > 0) {
              updateItemsFromLiftings(selectedLiftingIds, activeAgreements);
            } else if (selectedDispatchIds.length > 0) {
              updateItemsFromDispatches(selectedDispatchIds, activeAgreements);
            }
          }
        } catch (err) {
          console.error('Failed to fetch agreements:', err);
        } finally {
          setLoadingAgreements(false);
        }
      };
      fetchAgreements();
    } else {
      setAgreements([]);
    }

    if (division === 'CEMENT') {
      const fetchLiftings = async () => {
        setLoadingLiftings(true);
        try {
          const params = new URLSearchParams();
          if (partyType === 'Customer') params.append('customer', partyId);
          if (startDate) params.append('startDate', startDate);
          if (endDate) params.append('endDate', endDate);
          params.append('limit', '100');

          const res = await fetch(`/api/cement/liftings?${params.toString()}`);
          const data = await res.json();
          if (data.success) {
            const list = data.data || [];
            setCementLiftings(list);
            setSelectedLiftingIds([]);
            setItems([]);
          }
        } catch (err) {
          console.error('Failed to fetch cement liftings:', err);
        } finally {
          setLoadingLiftings(false);
        }
      };
      fetchLiftings();
    } else if (division === 'AGGREGATE') {
      const fetchDispatches = async () => {
        setLoadingDispatches(true);
        try {
          const params = new URLSearchParams();
          if (startDate) params.append('startDate', startDate);
          if (endDate) params.append('endDate', endDate);
          params.append('limit', '100');

          const res = await fetch(`/api/aggregate?${params.toString()}`);
          const data = await res.json();
          if (data.success) {
            const list = data.records || data.data || [];
            setAggregateDispatches(list);
            setSelectedDispatchIds([]);
            setItems([]);
          }
        } catch (err) {
          console.error('Failed to fetch aggregate dispatches:', err);
        } finally {
          setLoadingDispatches(false);
        }
      };
      fetchDispatches();
    }
  }, [partyId, partyType, division, startDate, endDate]);

  // Checkbox Selection Logic for Aggregate Dispatches
  const toggleDispatchSelect = (id: string) => {
    let updated: string[];
    if (selectedDispatchIds.includes(id)) {
      updated = selectedDispatchIds.filter((dId) => dId !== id);
    } else {
      updated = [...selectedDispatchIds, id];
    }
    setSelectedDispatchIds(updated);
    updateItemsFromDispatches(updated, undefined, groupByCategory);
  };

  const toggleAllDispatches = () => {
    if (selectedDispatchIds.length === aggregateDispatches.length) {
      setSelectedDispatchIds([]);
      updateItemsFromDispatches([], undefined, groupByCategory);
    } else {
      const allIds = aggregateDispatches.map((d) => d.id);
      setSelectedDispatchIds(allIds);
      updateItemsFromDispatches(allIds, undefined, groupByCategory);
    }
  };

  // Helper to identify and resolve exact item name from ID, code, system items, or agreements
  const resolveItemName = (itemIdOrName?: string, defaultCategory: string = 'Item'): string => {
    if (!itemIdOrName) return defaultCategory;
    const cleanKey = String(itemIdOrName).trim();
    if (!cleanKey) return defaultCategory;

    // 1. Match against systemItems registry by ID
    const foundById = systemItems.find(
      (si) => si.id && String(si.id).toLowerCase() === cleanKey.toLowerCase()
    );
    if (foundById) return foundById.name;

    // 2. Match against systemItems registry by Code
    const foundByCode = systemItems.find(
      (si) => si.code && String(si.code).toLowerCase() === cleanKey.toLowerCase()
    );
    if (foundByCode) return foundByCode.name;

    // 3. Match against loaded agreements
    for (const ag of agreements) {
      try {
        const parsed: AgreementItem[] = typeof ag.items === 'string' ? JSON.parse(ag.items) : (ag.items as any[] || []);
        const agMatch = parsed.find(
          (ai) =>
            (ai.itemId && String(ai.itemId).toLowerCase() === cleanKey.toLowerCase()) ||
            (ai.itemName && String(ai.itemName).toLowerCase().includes(cleanKey.toLowerCase()))
        );
        if (agMatch && (agMatch.itemName || agMatch.name)) {
          return agMatch.itemName || agMatch.name!;
        }
      } catch {}
    }

    return cleanKey;
  };

  // Helper to resolve unit price from customer's sales agreement
  const getCustomerAgreementUnitPrice = (
    agList: SalesAgreement[],
    itemSearchKey?: string,
    fallbackPrice: number = 0
  ): number => {
    if (!agList || agList.length === 0) return fallbackPrice;
    const key = String(itemSearchKey || '').trim().toLowerCase();

    for (const agreement of agList) {
      try {
        const parsedItems: AgreementItem[] =
          typeof agreement.items === 'string'
            ? JSON.parse(agreement.items)
            : (agreement.items as any[]) || [];

        if (Array.isArray(parsedItems) && parsedItems.length > 0) {
          if (key) {
            // 1. Exact match on itemId
            const exactItem = parsedItems.find(
              (i) => i.itemId && String(i.itemId).toLowerCase() === key
            );
            if (exactItem && Number(exactItem.unitPrice) > 0) {
              return Number(exactItem.unitPrice);
            }

            // 2. Substring match on itemName / name
            const nameItem = parsedItems.find((i) => {
              const itemName = String(i.itemName || i.name || '').toLowerCase();
              return itemName && (itemName.includes(key) || key.includes(itemName));
            });
            if (nameItem && Number(nameItem.unitPrice) > 0) {
              return Number(nameItem.unitPrice);
            }
          }

          // 3. Fallback to single item unitPrice in customer agreement if present
          if (parsedItems.length === 1 && Number(parsedItems[0].unitPrice) > 0) {
            return Number(parsedItems[0].unitPrice);
          }
        }
      } catch {}
    }

    return fallbackPrice;
  };

  const updateItemsFromDispatches = (dispatchIds: string[], agList?: SalesAgreement[], isGrouped?: boolean) => {
    const activeAgreements = agList || agreements;
    const shouldGroup = isGrouped !== undefined ? isGrouped : groupByCategory;
    const selected = aggregateDispatches.filter((d) => dispatchIds.includes(d.id));

    if (shouldGroup && selected.length > 0) {
      // Group dispatches by resolved item category / name
      const groupedMap = new Map<string, typeof selected>();
      selected.forEach((d) => {
        const resolvedName = resolveItemName(d.itemName || d.itemCategory || d.itemId || d.item?.name, 'Aggregate Delivery');
        const catKey = resolvedName.trim().toLowerCase();
        const existing = groupedMap.get(catKey) || [];
        groupedMap.set(catKey, [...existing, d]);
      });

      const invoiceItems: InvoiceItem[] = Array.from(groupedMap.values()).map((group, index) => {
        const first = group[0];
        const categoryName = resolveItemName(first.itemName || first.itemCategory || first.itemId || first.item?.name, 'Aggregate Delivery');
        const totalQty = group.reduce((sum, d) => sum + Number(d.deliveredVolume || d.loadedVolume || 1), 0);

        let unitPrice = getCustomerAgreementUnitPrice(
          activeAgreements,
          first.itemId || first.itemName,
          0
        );
        if (!unitPrice) {
          unitPrice = Number(first.aggregateValue || first.transportRate || 0);
        }

        const vat = 15;
        const subtotal = totalQty * unitPrice;
        const total = subtotal + subtotal * (vat / 100);

        const podList = Array.from(new Set(group.map((d) => d.padNumber || d.podNumber || d.dispatchNo).filter(Boolean)));
        const podHeader = podList.length > 0 ? `PODs #${podList.join(', #')}` : 'POD #N/A';
        const itemName = `${podHeader} — ${categoryName}`;

        return {
          id: index + 1,
          item: itemName,
          qty: Math.round(totalQty * 100) / 100,
          unitPrice,
          vat,
          total: Math.round(total * 100) / 100,
        };
      });
      setItems(invoiceItems);
    } else {
      // Individual dispatches with POD number FIRST: POD #1002 — Item Name
      const invoiceItems: InvoiceItem[] = selected.map((dispatch, index) => {
        const qty = Number(dispatch.deliveredVolume || dispatch.loadedVolume || 1);
        let unitPrice = getCustomerAgreementUnitPrice(
          activeAgreements,
          dispatch.itemId || dispatch.itemName,
          0
        );

        if (!unitPrice) {
          unitPrice = Number(dispatch.aggregateValue || dispatch.transportRate || 0);
        }

        const vat = 15;
        const subtotal = qty * unitPrice;
        const total = subtotal + subtotal * (vat / 100);

        const podHeader = dispatch.padNumber ? `POD #${dispatch.padNumber}` : (dispatch.podNumber ? `POD #${dispatch.podNumber}` : `POD #${dispatch.dispatchNo}`);
        const catName = resolveItemName(dispatch.itemName || dispatch.itemCategory || dispatch.itemId || dispatch.item?.name, 'Aggregate Delivery');
        const itemName = `${podHeader} — ${catName}`;

        return {
          id: index + 1,
          item: itemName,
          qty,
          unitPrice,
          vat,
          total: Math.round(total * 100) / 100,
        };
      });
      setItems(invoiceItems);
    }
  };

  // Checkbox Selection Logic for Cement Liftings
  const toggleLiftingSelect = (id: string) => {
    let updated: string[];
    if (selectedLiftingIds.includes(id)) {
      updated = selectedLiftingIds.filter((lId) => lId !== id);
    } else {
      updated = [...selectedLiftingIds, id];
    }
    setSelectedLiftingIds(updated);
    updateItemsFromLiftings(updated, undefined, groupByCategory);
  };

  const toggleAllLiftings = () => {
    if (selectedLiftingIds.length === cementLiftings.length) {
      setSelectedLiftingIds([]);
      updateItemsFromLiftings([], undefined, groupByCategory);
    } else {
      const allIds = cementLiftings.map((l) => l.id);
      setSelectedLiftingIds(allIds);
      updateItemsFromLiftings(allIds, undefined, groupByCategory);
    }
  };

  const updateItemsFromLiftings = (liftingIds: string[], agList?: SalesAgreement[], isGrouped?: boolean) => {
    const activeAgreements = agList || agreements;
    const shouldGroup = isGrouped !== undefined ? isGrouped : groupByCategory;
    const selected = cementLiftings.filter((l) => liftingIds.includes(l.id));

    if (shouldGroup && selected.length > 0) {
      // Group liftings by resolved item category / cementType
      const groupedMap = new Map<string, typeof selected>();
      selected.forEach((l) => {
        const resolvedName = resolveItemName(l.cementType || l.itemName || l.itemId, 'Cement');
        const catKey = resolvedName.trim().toLowerCase();
        const existing = groupedMap.get(catKey) || [];
        groupedMap.set(catKey, [...existing, l]);
      });

      const invoiceItems: InvoiceItem[] = Array.from(groupedMap.values()).map((group, index) => {
        const first = group[0];
        const cementType = resolveItemName(first.cementType || first.itemName || first.itemId, 'Cement');
        const factory = first.purchase?.factory?.name || first.factory?.name || 'Factory';
        const totalQty = group.reduce((sum, l) => sum + Number(l.factoryWeight || l.quantityTons || 1), 0);

        let unitPrice = getCustomerAgreementUnitPrice(
          activeAgreements,
          first.itemId || first.cementType,
          0
        );
        if (!unitPrice) {
          unitPrice = Number(first.unitPrice || first.customerUnitPrice || first.aggregateValue || 0);
        }

        const vat = 15;
        const subtotal = totalQty * unitPrice;
        const total = subtotal + subtotal * (vat / 100);

        const podList = Array.from(new Set(group.map((l) => l.padNumber || l.podNumber || l.liftingNo).filter(Boolean)));
        const podHeader = podList.length > 0 ? `PODs #${podList.join(', #')}` : 'POD #N/A';
        const itemName = `${podHeader} — ${cementType} Cement — ${factory}`;

        return {
          id: index + 1,
          item: itemName,
          qty: Math.round(totalQty * 100) / 100,
          unitPrice,
          vat,
          total: Math.round(total * 100) / 100,
        };
      });
      setItems(invoiceItems);
    } else {
      // Individual liftings with POD number FIRST: POD #1002 — Cement Type — Factory
      const invoiceItems: InvoiceItem[] = selected.map((lifting, index) => {
        const qty = Number(lifting.factoryWeight || lifting.quantityTons || 1);

        let unitPrice = getCustomerAgreementUnitPrice(
          activeAgreements,
          lifting.itemId || lifting.cementType,
          0
        );

        if (!unitPrice) {
          unitPrice = Number(lifting.unitPrice || lifting.customerUnitPrice || lifting.aggregateValue || 0);
        }

        const vat = 15;
        const subtotal = qty * unitPrice;
        const total = subtotal + subtotal * (vat / 100);

        const factory = lifting.purchase?.factory?.name || lifting.factory?.name || 'Factory';
        const podHeader = lifting.padNumber ? `POD #${lifting.padNumber}` : (lifting.podNumber ? `POD #${lifting.podNumber}` : `POD #${lifting.liftingNo}`);
        const cementType = resolveItemName(lifting.cementType || lifting.itemName || lifting.itemId, 'Cement');
        const itemName = `${podHeader} — ${cementType} Cement — ${factory}`;

        return {
          id: index + 1,
          item: itemName,
          qty,
          unitPrice,
          vat,
          total: Math.round(total * 100) / 100,
        };
      });
      setItems(invoiceItems);
    }
  };

  // Auto-populate items from selected agreement
  const handleAgreementSelect = (agId: string, agList?: SalesAgreement[]) => {
    setAgreementId(agId);
    if (!agId) {
      setItems([]);
      return;
    }

    const list = agList || agreements;
    const agreement = list.find((a) => a.id === agId);
    if (!agreement) return;

    try {
      const parsedItems: AgreementItem[] =
        typeof agreement.items === 'string'
          ? JSON.parse(agreement.items)
          : agreement.items;

      if (Array.isArray(parsedItems) && parsedItems.length > 0) {
        const invoiceItems: InvoiceItem[] = parsedItems.map((ai, index) => {
          const qty = ai.qty || ai.quantity || 1;
          const unitPrice = ai.unitPrice || 0;
          const vat = 15;
          const subtotal = qty * unitPrice;
          const total = subtotal + subtotal * (vat / 100);

          let itemName = ai.itemName || ai.name || '';
          if (!itemName && ai.itemId) {
            const found = systemItems.find(si => si.id === ai.itemId);
            itemName = found ? found.name : ai.itemId;
          }

          return {
            id: index + 1,
            item: itemName,
            qty,
            unitPrice,
            vat,
            total,
          };
        });
        setItems(invoiceItems);
      }
    } catch (err) {
      console.error('Failed to parse agreement items:', err);
    }
  };

  // Auto-populate items from selected cement lifting
  const handleLiftingSelect = (lId: string, list?: any[]) => {
    setLiftingId(lId);
    if (!lId) {
      setItems([]);
      return;
    }
    const liftingList = list || cementLiftings;
    const lifting = liftingList.find((l: any) => l.id === lId);
    if (!lifting) return;

    const qty = Number(lifting.factoryWeight || lifting.quantityTons || 1);
    let unitPrice = getCustomerAgreementUnitPrice(
      agreements,
      lifting.itemId || lifting.cementType,
      0
    );

    if (!unitPrice) {
      unitPrice = Number(lifting.unitPrice || lifting.customerUnitPrice || lifting.aggregateValue || 0);
    }

    const vat = 15;
    const subtotal = qty * unitPrice;
    const total = subtotal + subtotal * (vat / 100);
    const factory = lifting.purchase?.factory?.name || lifting.factory?.name || 'Factory';
    const podHeader = lifting.padNumber ? `POD #${lifting.padNumber}` : (lifting.podNumber ? `POD #${lifting.podNumber}` : `POD #${lifting.liftingNo}`);
    const cementType = resolveItemName(lifting.cementType || lifting.itemName || lifting.itemId, 'Cement');
    const itemName = `${podHeader} — ${cementType} Cement — ${factory} (${lifting.liftingNo})`;

    setItems([
      {
        id: 1,
        item: itemName,
        qty,
        unitPrice,
        vat,
        total: Math.round(total * 100) / 100,
      },
    ]);
  };

  // Auto-populate items from selected aggregate dispatch
  const handleDispatchSelect = (dId: string, list?: any[]) => {
    setAggregateDispatchId(dId);
    if (!dId) {
      setItems([]);
      return;
    }
    const dispatchList = list || aggregateDispatches;
    const dispatch = dispatchList.find((d: any) => d.id === dId);
    if (!dispatch) return;

    const qty = Number(dispatch.deliveredVolume || dispatch.loadedVolume || 1);
    let unitPrice = getCustomerAgreementUnitPrice(
      agreements,
      dispatch.itemId || dispatch.itemName,
      0
    );

    if (!unitPrice) {
      unitPrice = Number(dispatch.aggregateValue || dispatch.transportRate || 0);
    }

    const vat = 15;
    const subtotal = qty * unitPrice;
    const total = subtotal + subtotal * (vat / 100);
    const podHeader = dispatch.padNumber ? `POD #${dispatch.padNumber}` : (dispatch.podNumber ? `POD #${dispatch.podNumber}` : `POD #${dispatch.dispatchNo}`);
    const catName = resolveItemName(dispatch.itemName || dispatch.itemCategory || dispatch.itemId || dispatch.item?.name, 'Aggregate Delivery');
    const itemName = `${podHeader} — ${dispatch.dispatchNo} — ${catName}`;

    setItems([
      {
        id: 1,
        item: itemName,
        qty,
        unitPrice,
        vat,
        total: Math.round(total * 100) / 100,
      },
    ]);
  };

  const handleAddItem = () => {
    const newId = Math.max(...items.map((i) => i.id), 0) + 1;
    setItems([...items, { id: newId, item: '', qty: 1, unitPrice: 0, vat: 15, total: 0 }]);
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
          if (field === 'qty' || field === 'unitPrice' || field === 'vat') {
            const subtotal = updated.qty * updated.unitPrice;
            updated.total = subtotal + (subtotal * updated.vat) / 100;
          }
          return updated;
        }
        return item;
      })
    );
  };

  // Calculations
  const subtotal = items.reduce((sum, item) => sum + item.qty * item.unitPrice, 0);
  const totalVAT = items.reduce((sum, item) => {
    const itemSubtotal = item.qty * item.unitPrice;
    return sum + (itemSubtotal * item.vat) / 100;
  }, 0);
  const grossTotal = subtotal + totalVAT;
  const withholdRate = selectedParty?.withholdRate || 2;
  const withholdAmount = applyWithholding ? subtotal * (withholdRate / 100) : 0;
  const totalAmount = grossTotal - withholdAmount;

  const noAgreementExists = division === 'CONSTRUCTION' && partyType === 'Customer' && !loadingAgreements && partyId && agreements.length === 0;

  const handleSave = async () => {
    if (!partyId) {
      alert(`Please select a ${partyType}`);
      return;
    }

    if (division === 'CONSTRUCTION' && partyType === 'Customer' && !agreementId) {
      alert('Please select a customer agreement for Construction invoices.');
      return;
    }

    if (items.length === 0 || items.some((i) => !i.item)) {
      alert('Please ensure all invoice items have valid names');
      return;
    }

    setSaving(true);
    try {
      const res = await fetch('/api/sales/invoices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerId: partyId,
          salesOrderId: agreementId || undefined,
          liftingId: liftingId || undefined,
          division: division,
          items: JSON.stringify(items),
          subtotal,
          vatRate: 15,
          vatAmount: totalVAT,
          withholding: withholdAmount,
          totalAmount,
          dueDate: dueDate || undefined,
          status: 'Unpaid',
        }),
      });
      const d = await res.json();
      if (!d.success) {
        alert(d.error || 'Failed to save invoice');
        return;
      }
      router.push('/dashboard/sales/invoices');
    } catch {
      alert('Failed to save invoice');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6 max-w-5xl">
      <div>
        <Link
          href="/dashboard/sales/invoices"
          className="text-blue-600 hover:text-blue-800 text-sm font-medium"
        >
          &larr; Back to Invoices
        </Link>
        <h1 className="text-2xl sm:text-3xl font-bold text-[#1D1D1F] mt-4">New Invoice</h1>
        <p className="text-slate-500 text-sm mt-1">Create an invoice from cement liftings, aggregate dispatches, or sales agreements</p>
      </div>

      {/* Step 1: Customer / Supplier & Division Selection */}
      <Card>
        <CardHeader>
          <h2 className="text-lg font-semibold text-[#1D1D1F]">1. Customer / Supplier & Division Selection</h2>
        </CardHeader>
        <CardBody className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Party Type *</label>
              <select
                value={partyType}
                onChange={(e) => {
                  setPartyType(e.target.value as any);
                  setPartyId('');
                  setAgreementId('');
                  setLiftingId('');
                  setAggregateDispatchId('');
                  setItems([]);
                }}
                className="block w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm font-semibold focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
              >
                <option value="Customer">Customer</option>
                <option value="Supplier">Supplier</option>
              </select>
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-slate-700 mb-1">
                {partyType === 'Customer' ? 'Customer *' : 'Supplier *'}
              </label>
              <select
                value={partyId}
                onChange={(e) => {
                  setPartyId(e.target.value);
                  setAgreementId('');
                  setLiftingId('');
                  setAggregateDispatchId('');
                  setItems([]);
                }}
                disabled={partyType === 'Customer' ? loadingCustomers : loadingSuppliers}
                className="block w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
              >
                <option value="">Select {partyType}</option>
                {partyType === 'Customer'
                  ? customers.map((c) => (
                      <option key={c.customerId || c.id} value={c.customerId || c.id}>
                        {c.companyName} {c.agreementNo ? `— ${c.agreementNo}` : ''}
                      </option>
                    ))
                  : suppliers.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.companyName} {s.code ? `(${s.code})` : ''} {s.category ? `— ${s.category}` : ''}
                      </option>
                    ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Division / Dispatch Type *</label>
              <select
                value={division}
                onChange={(e) => {
                  setDivision(e.target.value as any);
                  setAgreementId('');
                  setLiftingId('');
                  setAggregateDispatchId('');
                  setItems([]);
                }}
                className="block w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm font-semibold text-blue-900 bg-blue-50/50 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
              >
                <option value="CEMENT">Cement (Liftings / Dispatches)</option>
                <option value="AGGREGATE">Aggregate (Dispatches)</option>
                <option value="CONSTRUCTION">Construction (Sales Agreements)</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Due Date</label>
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="block w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Filter Dispatch (From Date)</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="block w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Filter Dispatch (To Date)</label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="block w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
              />
            </div>
          </div>

          {/* Cement Lifting Checkbox Table */}
          {partyId && division === 'CEMENT' && (
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <label className="block text-sm font-semibold text-slate-900">
                  Select Cement Liftings ({selectedLiftingIds.length} selected)
                </label>
                {cementLiftings.length > 0 && (
                  <button
                    type="button"
                    onClick={toggleAllLiftings}
                    className="text-xs font-semibold text-blue-600 hover:text-blue-800"
                  >
                    {selectedLiftingIds.length === cementLiftings.length
                      ? 'Deselect All'
                      : 'Select All Liftings'}
                  </button>
                )}
              </div>

              {loadingLiftings ? (
                <p className="text-blue-600 text-sm">Loading cement liftings...</p>
              ) : cementLiftings.length === 0 ? (
                <div className="bg-amber-50 border border-amber-300 rounded-xl p-4">
                  <p className="text-amber-800 font-semibold text-sm">
                    No cement liftings found for this {partyType.toLowerCase()}.
                  </p>
                  <p className="text-amber-700 text-xs mt-1">
                    You can manually add invoice items below.
                  </p>
                </div>
              ) : (
                <div className="border border-slate-200 rounded-xl overflow-hidden max-h-72 overflow-y-auto">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-600 uppercase sticky top-0">
                      <tr>
                        <th className="py-2.5 px-3 w-10 text-center">
                          <input
                            type="checkbox"
                            checked={
                              cementLiftings.length > 0 &&
                              selectedLiftingIds.length === cementLiftings.length
                            }
                            onChange={toggleAllLiftings}
                            className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                          />
                        </th>
                        <th className="py-2.5 px-3">Lifting No</th>
                        <th className="py-2.5 px-3">Type</th>
                        <th className="py-2.5 px-3">Factory Weight (QT)</th>
                        <th className="py-2.5 px-3">Factory</th>
                        <th className="py-2.5 px-3">Date</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 bg-white">
                      {cementLiftings.map((l) => {
                        const isChecked = selectedLiftingIds.includes(l.id);
                        return (
                          <tr
                            key={l.id}
                            onClick={() => toggleLiftingSelect(l.id)}
                            className={`cursor-pointer hover:bg-blue-50/50 transition-colors ${
                              isChecked ? 'bg-blue-50/80 font-medium' : ''
                            }`}
                          >
                            <td className="py-2.5 px-3 text-center" onClick={(e) => e.stopPropagation()}>
                              <input
                                type="checkbox"
                                checked={isChecked}
                                onChange={() => toggleLiftingSelect(l.id)}
                                className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                              />
                            </td>
                            <td className="py-2.5 px-3 font-semibold text-slate-900">{l.liftingNo}</td>
                            <td className="py-2.5 px-3 text-slate-600">{l.cementType}</td>
                            <td className="py-2.5 px-3 text-slate-900 font-semibold">
                              {Number(l.factoryWeight || l.quantityTons || 0).toLocaleString('en-US')} QT
                            </td>
                            <td className="py-2.5 px-3 text-slate-600">
                              {l.purchase?.factory?.name || l.factory?.name || 'Factory'}
                            </td>
                            <td className="py-2.5 px-3 text-slate-500">
                              {new Date(l.liftingDate || l.createdAt).toLocaleDateString()}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* Aggregate Dispatch Checkbox Table */}
          {partyId && division === 'AGGREGATE' && (
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <label className="block text-sm font-semibold text-slate-900">
                  Select Aggregate Dispatches ({selectedDispatchIds.length} selected)
                </label>
                {aggregateDispatches.length > 0 && (
                  <button
                    type="button"
                    onClick={toggleAllDispatches}
                    className="text-xs font-semibold text-blue-600 hover:text-blue-800"
                  >
                    {selectedDispatchIds.length === aggregateDispatches.length
                      ? 'Deselect All'
                      : 'Select All Dispatches'}
                  </button>
                )}
              </div>

              {loadingDispatches ? (
                <p className="text-blue-600 text-sm">Loading aggregate dispatches...</p>
              ) : aggregateDispatches.length === 0 ? (
                <div className="bg-amber-50 border border-amber-300 rounded-xl p-4">
                  <p className="text-amber-800 font-semibold text-sm">
                    No aggregate dispatches found.
                  </p>
                  <p className="text-amber-700 text-xs mt-1">
                    You can manually add invoice items below.
                  </p>
                </div>
              ) : (
                <div className="border border-slate-200 rounded-xl overflow-hidden max-h-72 overflow-y-auto">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-600 uppercase sticky top-0">
                      <tr>
                        <th className="py-2.5 px-3 w-10 text-center">
                          <input
                            type="checkbox"
                            checked={
                              aggregateDispatches.length > 0 &&
                              selectedDispatchIds.length === aggregateDispatches.length
                            }
                            onChange={toggleAllDispatches}
                            className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                          />
                        </th>
                        <th className="py-2.5 px-3">Dispatch No</th>
                        <th className="py-2.5 px-3">Pad #</th>
                        <th className="py-2.5 px-3">Volume (m³)</th>
                        <th className="py-2.5 px-3">Date</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 bg-white">
                      {aggregateDispatches.map((d) => {
                        const isChecked = selectedDispatchIds.includes(d.id);
                        return (
                          <tr
                            key={d.id}
                            onClick={() => toggleDispatchSelect(d.id)}
                            className={`cursor-pointer hover:bg-blue-50/50 transition-colors ${
                              isChecked ? 'bg-blue-50/80 font-medium' : ''
                            }`}
                          >
                            <td className="py-2.5 px-3 text-center" onClick={(e) => e.stopPropagation()}>
                              <input
                                type="checkbox"
                                checked={isChecked}
                                onChange={() => toggleDispatchSelect(d.id)}
                                className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                              />
                            </td>
                            <td className="py-2.5 px-3 font-semibold text-slate-900">{d.dispatchNo}</td>
                            <td className="py-2.5 px-3 text-slate-600">Pad #{d.padNumber || 'N/A'}</td>
                            <td className="py-2.5 px-3 text-slate-900 font-semibold">
                              {Number(d.deliveredVolume || d.loadedVolume || 0).toLocaleString('en-US')} m³
                            </td>
                            <td className="py-2.5 px-3 text-slate-500">
                              {new Date(d.dispatchDate || d.createdAt).toLocaleDateString()}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* Agreement Selection (Construction) */}
          {partyId && division === 'CONSTRUCTION' && partyType === 'Customer' && (
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Customer Agreement *
              </label>
              {loadingAgreements ? (
                <p className="text-blue-600 text-sm">Loading agreements...</p>
              ) : noAgreementExists ? (
                <div className="bg-red-50 border border-red-300 rounded-xl p-4">
                  <p className="text-red-700 font-semibold text-sm">
                    No active agreement found for this customer.
                  </p>
                  <p className="text-red-600 text-xs mt-1">
                    You must create a Sales Agreement before generating a Construction invoice.
                  </p>
                  <Link
                    href="/dashboard/sales/agreements/new"
                    className="inline-block mt-3 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 text-sm font-medium"
                  >
                    + Create Agreement for this Customer
                  </Link>
                </div>
              ) : (
                <>
                  <select
                    value={agreementId}
                    onChange={(e) => handleAgreementSelect(e.target.value)}
                    className="block w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                    required
                  >
                    <option value="">Select Agreement</option>
                    {agreements.map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.agreementNo} — ETB {(a.totalAmount ?? 0).toLocaleString('en-US')} ({a.status}) — Valid: {new Date(a.validFrom).toLocaleDateString()} to {new Date(a.validTo).toLocaleDateString()}
                      </option>
                    ))}
                  </select>
                  <p className="mt-1 text-xs text-slate-500">
                    Selecting an agreement will auto-populate the invoice items and prices
                  </p>
                </>
              )}
            </div>
          )}

          {/* Party Info Panel */}
          {selectedParty && (
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                <div>
                  <span className="text-blue-600 font-medium block">{partyType}</span>
                  <span className="text-slate-900 font-semibold">{selectedParty.companyName}</span>
                </div>
                <div>
                  <span className="text-blue-600 font-medium block">TIN</span>
                  <span className="text-slate-900">{selectedParty.tin || '—'}</span>
                </div>
                <div>
                  <span className="text-blue-600 font-medium block">Withholding</span>
                  <span className="text-slate-900">
                    {selectedParty.withholding ? `Yes (${selectedParty.withholdRate || 2}%)` : 'No'}
                  </span>
                </div>
                <div>
                  <span className="text-blue-600 font-medium block">Division</span>
                  <span className="text-slate-900 font-semibold">{division}</span>
                </div>
              </div>
            </div>
          )}
        </CardBody>
      </Card>

      {/* Step 2: Items Table */}
      {partyId && (
        <Card>
          <CardHeader>
            <div className="flex flex-wrap justify-between items-center gap-3">
              <div>
                <h2 className="text-lg font-semibold text-[#1D1D1F]">2. Invoice Items</h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  POD numbers are displayed first on each item line. Toggle below to group and sum items by category.
                </p>
              </div>
              <div className="flex items-center gap-3">
                <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 cursor-pointer bg-blue-50/80 hover:bg-blue-100 text-blue-900 px-3 py-1.5 rounded-xl border border-blue-200 transition-all">
                  <input
                    type="checkbox"
                    checked={groupByCategory}
                    onChange={(e) => {
                      const checked = e.target.checked;
                      setGroupByCategory(checked);
                      if (selectedDispatchIds.length > 0) {
                        updateItemsFromDispatches(selectedDispatchIds, undefined, checked);
                      } else if (selectedLiftingIds.length > 0) {
                        updateItemsFromLiftings(selectedLiftingIds, undefined, checked);
                      }
                    }}
                    className="rounded text-blue-600 focus:ring-blue-500"
                  />
                  <span>Group & Sum Items by Category</span>
                </label>
                <Button variant="secondary" size="sm" onClick={handleAddItem}>
                  + Add Item
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardBody>
            {items.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-slate-500 text-sm">No items added yet.</p>
                <Button variant="outline" size="sm" onClick={handleAddItem} className="mt-3">
                  + Add Invoice Item
                </Button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-slate-200">
                      <th className="text-left py-2 px-2 text-xs font-semibold text-slate-500 uppercase">Item</th>
                      <th className="text-left py-2 px-2 text-xs font-semibold text-slate-500 uppercase">Qty</th>
                      <th className="text-left py-2 px-2 text-xs font-semibold text-slate-500 uppercase">Unit Price</th>
                      <th className="text-left py-2 px-2 text-xs font-semibold text-slate-500 uppercase">VAT %</th>
                      <th className="text-left py-2 px-2 text-xs font-semibold text-slate-500 uppercase">Total (incl. VAT)</th>
                      <th className="text-left py-2 px-2 text-xs font-semibold text-slate-500 uppercase">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((item) => (
                      <tr key={item.id} className="border-b border-slate-100">
                        <td className="py-3 px-2">
                          <Input
                            placeholder="Item name"
                            value={item.item}
                            onChange={(e) => handleItemChange(item.id, 'item', e.target.value)}
                          />
                        </td>
                        <td className="py-3 px-2">
                          <input
                            type="number"
                            min="0.01"
                            step="0.01"
                            value={item.qty}
                            onChange={(e) =>
                              handleItemChange(item.id, 'qty', parseFloat(e.target.value) || 0)
                            }
                            className="w-20 rounded-xl border border-slate-300 px-2 py-1.5 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                          />
                        </td>
                        <td className="py-3 px-2">
                          <input
                            type="number"
                            step="0.01"
                            value={item.unitPrice}
                            onChange={(e) =>
                              handleItemChange(item.id, 'unitPrice', parseFloat(e.target.value) || 0)
                            }
                            className="w-28 rounded-xl border border-slate-300 px-2 py-1.5 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                          />
                        </td>
                        <td className="py-3 px-2">
                          <input
                            type="number"
                            min="0"
                            max="100"
                            value={item.vat}
                            onChange={(e) =>
                              handleItemChange(item.id, 'vat', parseInt(e.target.value) || 0)
                            }
                            className="w-16 rounded-xl border border-slate-300 px-2 py-1.5 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                          />
                        </td>
                        <td className="py-3 px-2 text-sm font-medium text-slate-900">
                          ETB {(item.total ?? 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </td>
                        <td className="py-3 px-2">
                          <button
                            onClick={() => handleRemoveItem(item.id)}
                            className="text-red-500 hover:text-red-700 text-xs font-medium"
                          >
                            Remove
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardBody>
        </Card>
      )}

      {/* Step 3: VAT & Totals (only show when items exist) */}
      {partyId && items.length > 0 && (
        <Card>
          <CardHeader>
            <h2 className="text-lg font-semibold text-[#1D1D1F]">3. VAT & Totals</h2>
          </CardHeader>
          <CardBody>
            <div className="max-w-md ml-auto space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-slate-600">Subtotal (excl. VAT):</span>
                <span className="font-medium text-slate-900">
                  ETB {subtotal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>

              <div className="flex justify-between text-sm">
                <span className="text-slate-600">VAT (15%):</span>
                <span className="font-medium text-blue-600">
                  + ETB {totalVAT.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>

              <div className="flex justify-between text-sm border-t pt-2">
                <span className="text-slate-900 font-medium">Gross Total:</span>
                <span className="font-semibold text-slate-900">
                  ETB {grossTotal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>

              {/* Withholding Tax */}
              {selectedParty?.withholding && (
                <div className="border-t pt-3 space-y-2">
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={applyWithholding}
                      onChange={(e) => setApplyWithholding(e.target.checked)}
                      className="rounded border-slate-300"
                    />
                    <span className="text-slate-700">
                      Apply Withholding Tax ({withholdRate}%)
                    </span>
                  </label>
                  {applyWithholding && (
                    <div className="flex justify-between text-sm">
                      <span className="text-red-600">Withholding ({withholdRate}% of subtotal):</span>
                      <span className="font-medium text-red-600">
                        - ETB {withholdAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </span>
                    </div>
                  )}
                </div>
              )}

              <div className="border-t border-slate-900 pt-3">
                <div className="flex justify-between">
                  <span className="text-lg font-bold text-slate-900">Net Payable:</span>
                  <span className="text-2xl font-bold text-[#007AFF]">
                    ETB {totalAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>
              </div>

              {/* VAT Info Box */}
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 mt-4">
                <p className="text-xs text-amber-800 font-medium">VAT Note</p>
                <p className="text-xs text-amber-700 mt-1">
                  This invoice VAT of ETB {totalVAT.toLocaleString('en-US', { minimumFractionDigits: 2 })} will be recorded as
                  Output VAT for the current filing period. View VAT reports under Finance &rarr; VAT Management.
                </p>
              </div>
            </div>
          </CardBody>
        </Card>
      )}

      {/* Actions */}
      <div className="flex gap-3">
        <Button
          variant="primary"
          size="lg"
          onClick={handleSave}
          isLoading={saving}
          disabled={!partyId || items.length === 0 || noAgreementExists}
          className="flex-1"
        >
          {noAgreementExists ? 'Cannot Save — No Agreement' : 'Save Invoice'}
        </Button>
        <Button
          variant="outline"
          size="lg"
          onClick={() => router.push('/dashboard/sales/invoices')}
          className="flex-1"
        >
          Cancel
        </Button>
      </div>
    </div>
  );
}

