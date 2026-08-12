'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Card, CardHeader, CardBody, CardFooter, Button, Input, Select, Modal } from '@/components/ui';
import { useI18n } from '@/lib/i18n';
// Documents are now uploaded on the delivery detail page

interface FormData {
  agreementId: string;
  customerId: string;
  selectedCustomerAgreementId: string;
  supplierId: string;
  selectedSupplierAgreementId: string;
  transporterId: string;
  truckId: string;
  itemId: string;
  loadedVolume: string;
  deliveredVolume: string;
  driverName: string;
  transportRate: string;
  aggregateValue: string;
  dispatchDate: string;
}

interface Customer {
  customerId: string;
  companyName: string;
  agreementNo: string;
  phone?: string;
  tin?: string; 
  withholding?: boolean;
  withholdRate?: number;
  creditLimit?: number;
  creditTermDays?: number;
  agreementId?: string;
  agreementStatus?: string;
  division?: string;
  validFrom?: string;
  validTo?: string;
  totalAmount?: number;
  items?: any[];
  terms?: string;
}

interface Supplier {
  id: string;
  companyName: string;
  code: string;
  category?: string;
  // New fields for agreement info
  agreementId?: string;
  agreementNo?: string;
  agreementStatus?: string;
  totalAmount?: number;
  displayName?: string;
}

interface Item {
  id: string;
  name: string;
  code: string;
  unit: string;
  category?: string;
}

interface Truck {
  id: string;
  plateNo: string;
  truckType?: string;
  capacity?: number;
  capacityUnit?: string;
}

interface Transporter {
  id: string;
  companyName: string;
  code: string;
  driverName?: string;
  trucks?: Truck[];
}

interface AgreementMaterialItem {
  id: string;
  itemId: string;
  transportRate: number;
  aggregateValue: number;
  item?: { id: string; name: string; code: string; unit?: string };
}

interface Agreement {
  id: string;
  agreementNo: string;
  supplierId?: string;
  supplier?: { id: string; companyName: string; code: string };
  transporter: {
    id: string;
    companyName: string;
    code: string;
    driverName?: string;
    trucks?: Truck[];
  };
  pricePerUnit?: number;
  aggregateValue?: number;
  loadingSite?: string;
  offloadingSite?: string;
  agreementItems?: AgreementMaterialItem[];
}

export default function NewAggregateDispatch() {
  const { t } = useI18n();
  const [formData, setFormData] = useState<FormData>({
    agreementId: '',
    customerId: '',
    selectedCustomerAgreementId: '',
    supplierId: '',
    selectedSupplierAgreementId: '',
    transporterId: '',
    truckId: '',
    itemId: '',
    loadedVolume: '',
    deliveredVolume: '',
    driverName: '',
    transportRate: '',
    aggregateValue: '',
    dispatchDate: new Date().toISOString().split('T')[0],
  });

  const [showDeliveryModal, setShowDeliveryModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loadingData, setLoadingData] = useState(false);
  // Document attachments are now on the delivery detail page

  const [agreements, setAgreements] = useState<Agreement[]>([]);
  const [selectedAgreement, setSelectedAgreement] = useState<Agreement | null>(null);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [transporters, setTransporters] = useState<Transporter[]>([]);
  const [trucks, setTrucks] = useState<Truck[]>([]);
  const [items, setItems] = useState<Item[]>([]);
  const [filteredItems, setFilteredItems] = useState<Item[]>([]);
  // Map: "supplierId_itemId" → aggregate value (unitPrice) from supplier agreements
  const [supplierItemPrices, setSupplierItemPrices] = useState<Map<string, number>>(new Map());
  // Map: customerId → Set of itemIds from their AGGREGATE agreements
  const [customerAgreementItems, setCustomerAgreementItems] = useState<Map<string, Set<string>>>(new Map());
  // Map: supplierId → Set of itemIds from their AGGREGATE supplier agreements
  const [supplierAgreementItems, setSupplierAgreementItems] = useState<Map<string, Set<string>>>(new Map());

  // Agreement validation
  const [customerHasAgreement, setCustomerHasAgreement] = useState<boolean | null>(null);
  const [supplierHasAgreement, setSupplierHasAgreement] = useState<boolean | null>(null);
  const [checkingAgreements, setCheckingAgreements] = useState(false);

  // Debug function to check what customers are being fetched
  const debugCustomerData = async () => {
    try {
      console.log('=== DEBUGGING CUSTOMER DATA ===');
      
      // Use the dedicated debug endpoint
      const debugResponse = await fetch('/api/debug/aggregate-customers');
      const debugData = await debugResponse.json();
      
      if (debugData.success) {
        const debug = debugData.debug;
        console.log('Total customers in database:', debug.totalCustomers);
        console.log('Total AGGREGATE agreements:', debug.totalAggregateAgreements);
        console.log('Unique customers with AGGREGATE agreements:', debug.uniqueAggregateCustomers);
        console.log('ALL customer-agreement entries:', debug.allAggregateCustomersEntries);
        console.log('AGGREGATE agreements:', debug.aggregateAgreements);
        console.log('Unique AGGREGATE customers:', debug.uniqueAggregateCustomers);
        console.log('ALL AGGREGATE customer entries:', debug.allAggregateCustomers);
        
        alert(`Debug Results:
Total customers: ${debug.totalCustomers}
AGGREGATE agreements: ${debug.totalAggregateAgreements}  
Unique AGGREGATE customers: ${debug.uniqueAggregateCustomers}
ALL customer-agreement entries: ${debug.allAggregateCustomersEntries}

Check console for detailed breakdown.`);
      } else {
        alert('Debug failed: ' + debugData.error);
      }
    } catch (error) {
      console.error('Debug failed:', error);
      alert('Debug failed: ' + error);
    }
  };

  // Fetch all data on mount
  useEffect(() => {
    const fetchData = async () => {
      setLoadingData(true);
      try {
        const [customersRes, suppliersRes, agreementsRes, transportersRes, itemsRes, custAgreementsRes] =
          await Promise.all([
            fetch('/api/sales/agreements/customers?division=AGGREGATE&status=Active'),
            fetch('/api/supplier-agreements/all?status=Active'),
            fetch('/api/transporters/agreements?status=Active&limit=1000'),
            fetch('/api/transporters?status=Active&limit=1000'),
            fetch('/api/items?limit=1000'),
            fetch('/api/sales/agreements?status=Active&division=AGGREGATE&limit=1000'),
          ]);

        // First: Fetch and store DB items with proper Item Names
        const dbItemMap = new Map<string, any>();
        const itemMap = new Map<string, Item>();

        if (itemsRes.ok) {
          const itemsData = await itemsRes.json();
          (itemsData.data || []).forEach((dbItem: any) => {
            if (dbItem.id) {
              dbItemMap.set(dbItem.id, dbItem);
              itemMap.set(dbItem.id, {
                id: dbItem.id,
                name: dbItem.name || 'Unknown',
                code: dbItem.code || '',
                unit: dbItem.unit || 'm3',
                category: dbItem.category || 'regular',
              });
            }
          });
        }

        if (customersRes.ok) {
          const d = await customersRes.json();
          console.log('Customers API Response:', d);
          console.log('Customers count:', d.data?.length || 0);
          setCustomers(d.data || []);
        } else {
          console.error('Customers API failed:', customersRes.status, customersRes.statusText);
        }

        if (suppliersRes.ok) {
          const d = await suppliersRes.json();
          console.log('Suppliers API Response:', d);
          console.log('Suppliers count:', d.data?.length || 0);
          
          // Process all active supplier agreements (show each agreement separately)
          const allSuppliers: Supplier[] = [];
          // Key: "agreementId_itemId" → unitPrice 
          const priceMap = new Map<string, number>();
          const suppItemsMap = new Map<string, Set<string>>();
          
          console.log('=== SUPPLIER AGREEMENTS DEBUG ===');
          console.log('Total supplier agreements received:', d.data?.length || 0);
          
          (d.data || []).forEach((agr: any, index: number) => {
            const suppId = agr.supplier?.id || agr.supplierId;
            
            console.log(`Agreement ${index + 1}:`, {
              id: agr.id,
              agreementNo: agr.agreementNo,
              supplierId: suppId,
              supplierName: agr.supplier?.companyName,
              status: agr.status,
              totalAmount: agr.totalAmount
            });
            
            if (agr.supplier) {
              allSuppliers.push({
                id: suppId,
                companyName: agr.supplier.companyName,
                code: agr.supplier.code || '',
                category: agr.supplier.category,
                agreementId: agr.id,
                agreementNo: agr.agreementNo,
                agreementStatus: agr.status,
                totalAmount: agr.totalAmount,
                displayName: `${agr.supplier.companyName} — ${agr.agreementNo}`,
              });
            }
            // Extract items + unitPrice from agreement items JSON
            try {
              const agrItems = typeof agr.items === 'string' ? JSON.parse(agr.items) : (agr.items || []);
              console.log(`Agreement ${agr.agreementNo} items:`, agrItems);
              
              agrItems.forEach((ai: any) => {
                const targetItemId = ai.itemId || ai.id;
                if (targetItemId) {
                  if (!suppItemsMap.has(suppId)) {
                    suppItemsMap.set(suppId, new Set());
                  }
                  suppItemsMap.get(suppId)!.add(targetItemId);

                  const dbItem = dbItemMap.get(targetItemId);
                  const itemName = dbItem?.name || ai.itemName || ai.name || ai.description || targetItemId;

                  if (!itemMap.has(targetItemId) || itemMap.get(targetItemId)?.name === 'Unknown') {
                    itemMap.set(targetItemId, {
                      id: targetItemId,
                      name: itemName,
                      code: dbItem?.code || ai.itemCode || '',
                      unit: dbItem?.unit || ai.unit || 'm3',
                      category: dbItem?.category || ai.type || 'regular',
                    });
                  }

                  // Store price per agreement+item combo
                  const itemPrice = ai.unitPrice ?? ai.amount ?? ai.price;
                  const priceKey = `${agr.id}_${targetItemId}`;
                  if (itemPrice !== undefined && itemPrice !== null && !priceMap.has(priceKey)) {
                    priceMap.set(priceKey, parseFloat(itemPrice));
                    console.log(`Stored price: ${priceKey} = ${itemPrice}`);
                  }
                }
              });
            } catch (e) { 
              console.log(`Failed to parse items for agreement ${agr.agreementNo}:`, e);
            }
          });
          
          console.log('Final price map:', Object.fromEntries(priceMap));
          console.log('=== END SUPPLIER DEBUG ===');
          
          setSuppliers(allSuppliers);
          setSupplierItemPrices(priceMap);
          setSupplierAgreementItems(suppItemsMap);

          // Also extract items from AGGREGATE customer agreements (e.g. "Aggregate 01")
          // And build customerId → Set<itemId> map to filter items per customer
          const custItemsMap = new Map<string, Set<string>>();
          if (custAgreementsRes.ok) {
            const custAgrData = await custAgreementsRes.json();
            (custAgrData.data || []).forEach((agr: any) => {
              const custId = agr.customerId;
              try {
                const agrItems = typeof agr.items === 'string' ? JSON.parse(agr.items) : (agr.items || []);
                agrItems.forEach((ai: any) => {
                  const targetItemId = ai.itemId || (ai.id && dbItemMap.has(ai.id) ? ai.id : null);
                  if (targetItemId && dbItemMap.has(targetItemId)) {
                    // Track which items belong to which customer
                    if (!custItemsMap.has(custId)) {
                      custItemsMap.set(custId, new Set());
                    }
                    custItemsMap.get(custId)!.add(targetItemId);

                    const dbItem = dbItemMap.get(targetItemId);
                    if (dbItem && (!itemMap.has(targetItemId) || itemMap.get(targetItemId)?.name === 'Unknown')) {
                      itemMap.set(targetItemId, {
                        id: targetItemId,
                        name: dbItem.name || ai.itemName || ai.name || ai.description || targetItemId,
                        code: dbItem.code || ai.itemCode || '',
                        unit: dbItem.unit || ai.unit || 'm3',
                        category: dbItem.category || ai.type || 'regular',
                      });
                    }
                  }
                });
              } catch { /* ignore */ }
            });
          }
          setCustomerAgreementItems(custItemsMap);
          setItems(Array.from(itemMap.values()));
        }
        if (agreementsRes.ok) {
          const d = await agreementsRes.json();
          setAgreements(d.data || []);
        }
        if (transportersRes.ok) {
          const d = await transportersRes.json();
          setTransporters(d.data || []);
        }
      } catch (error) {
        console.error('Error fetching data:', error);
      } finally {
        setLoadingData(false);
      }
    };

    fetchData();
  }, []);

  // Check if customer has an active agreement when customer changes
  useEffect(() => {
    if (!formData.customerId) {
      setCustomerHasAgreement(null);
      return;
    }
    // If customer is in our loaded active customers list, they have an active agreement
    if (customers.some(c => c.customerId === formData.customerId || c.agreementId === formData.selectedCustomerAgreementId)) {
      setCustomerHasAgreement(true);
      return;
    }
    const checkCustomerAgreement = async () => {
      try {
        const res = await fetch(`/api/sales/agreements?customerId=${formData.customerId}&status=Active&division=AGGREGATE&limit=1`);
        const data = await res.json();
        setCustomerHasAgreement(data.success && Boolean(data.data && data.data.length > 0));
      } catch {
        setCustomerHasAgreement(null);
      }
    };
    checkCustomerAgreement();
  }, [formData.customerId, formData.selectedCustomerAgreementId, customers]);

  // Check if supplier has an active agreement when supplier changes
  useEffect(() => {
    if (!formData.supplierId) {
      setSupplierHasAgreement(null);
      return;
    }
    // If supplier is in our loaded active suppliers list, they have an active agreement
    if (suppliers.some(s => s.id === formData.supplierId || s.agreementId === formData.selectedSupplierAgreementId)) {
      setSupplierHasAgreement(true);
      return;
    }
    const checkSupplierAgreement = async () => {
      try {
        const res = await fetch(`/api/supplier-agreements?supplierId=${formData.supplierId}&status=Active&limit=1`);
        const data = await res.json();
        setSupplierHasAgreement(data.success && Boolean(data.data && data.data.length > 0));
      } catch {
        setSupplierHasAgreement(null);
      }
    };
    checkSupplierAgreement();
  }, [formData.supplierId, formData.selectedSupplierAgreementId, suppliers]);

  // Handle agreement selection — auto-populate everything
  const handleAgreementChange = (value: string) => {
    const agreement = agreements.find((a) => a.id === value) || null;
    setSelectedAgreement(agreement);

    if (agreement?.transporter) {
      // Set trucks from the agreement's transporter
      setTrucks(agreement.transporter.trucks || []);

      // Reset item; user will pick from agreement items
      // aggregateValue will be auto-populated when an item is selected from agreement
      setFormData((prev) => ({
        ...prev,
        agreementId: value,
        transporterId: agreement.transporter.id,
        supplierId: agreement.supplierId || prev.supplierId,
        truckId: '',
        itemId: '',
        transportRate: agreement.pricePerUnit?.toString() || prev.transportRate,
        aggregateValue: '', // Will be set when item is selected
        driverName: agreement.transporter.driverName || '',
      }));
    } else {
      setFormData((prev) => ({
        ...prev,
        agreementId: value,
      }));
    }
  };

  // When an item is selected — if the agreement has a matching agreementItem,
  // pull its transport rate + aggregate value automatically
  const handleItemChangeWithAgreementLookup = (value: string) => {
    let newTransportRate: string | null = null;
    let newAggregateValue: string | null = null;

    console.log('=== ITEM SELECTION DEBUG ===');
    console.log('Selected item ID:', value);
    console.log('Selected supplier agreement ID:', formData.selectedSupplierAgreementId);
    console.log('Available supplier item prices:', Object.fromEntries(supplierItemPrices));

    // 1. Try transporter agreement items first (has both transportRate + aggregateValue)
    // 1. Fetch aggregateValue from Supplier Agreement first
    const suppPriceKey = `${formData.selectedSupplierAgreementId}_${value}`;
    console.log('Looking for supplier price key:', suppPriceKey);
    if (supplierItemPrices.has(suppPriceKey)) {
      newAggregateValue = supplierItemPrices.get(suppPriceKey)!.toString();
      console.log('Found aggregate value from supplier agreement:', newAggregateValue);
    } else {
      console.log('No aggregate value found for key in supplier agreements:', suppPriceKey);
    }

    // 2. Fetch transportRate (and aggregateValue fallback if needed) from transporter agreement items
    if (selectedAgreement && selectedAgreement.agreementItems) {
      const matched = selectedAgreement.agreementItems.find((ai) => ai.itemId === value);
      if (matched) {
        newTransportRate = matched.transportRate.toString();
        if (!newAggregateValue && matched.aggregateValue) {
          newAggregateValue = matched.aggregateValue.toString();
        }
        console.log('Found in transporter agreement:', { newTransportRate, newAggregateValue });
      }
    }

    console.log('Final values:', { newTransportRate, newAggregateValue });
    console.log('=== END DEBUG ===');

    setFormData((prev) => ({
      ...prev,
      itemId: value,
      ...(newTransportRate ? { transportRate: newTransportRate } : {}),
      ...(newAggregateValue ? { aggregateValue: newAggregateValue } : { aggregateValue: '' }),
    }));
  };

  // When transporter changes manually (no agreement), fetch their trucks
  const handleTransporterChange = async (transporterId: string) => {
    setFormData((prev) => ({ ...prev, transporterId, truckId: '' }));
    setTrucks([]);

    if (transporterId) {
      try {
        const res = await fetch(`/api/transporters/${transporterId}`);
        if (res.ok) {
          const data = await res.json();
          setTrucks(data.data?.trucks || []);
          // Also set driver name if available
          if (data.data?.driverName) {
            setFormData((prev) => ({ ...prev, driverName: data.data.driverName }));
          }
        }
      } catch (err) {
        console.error('Error fetching trucks:', err);
      }
    }
  };

  // Filter items based on:
  // 1. Customer's agreement items (only show items from the selected customer agreement with Customer Agreement Item Name)
  // 2. Supplier's agreement items (only show items the selected supplier has in their agreement)
  // 3. Transporter agreement items (if selected, intersect further)
  useEffect(() => {
    let availableItems: Item[] = [];

    // Step 1: Require Customer Agreement selection first
    if (formData.selectedCustomerAgreementId) {
      const selectedCust = customers.find(c => c.agreementId === formData.selectedCustomerAgreementId);
      if (selectedCust && selectedCust.items && selectedCust.items.length > 0) {
        const custItems: Item[] = [];
        const seenIds = new Set<string>();

        selectedCust.items.forEach((ai: any) => {
          const targetItemId = ai.itemId || ai.id;
          if (targetItemId && !seenIds.has(targetItemId)) {
            seenIds.add(targetItemId);
            const dbItem = items.find((i) => i.id === targetItemId);
            // Prioritize Item table name column (dbItem.name)
            const itemName = dbItem?.name || ai.itemName || ai.name || ai.description || targetItemId;
            custItems.push({
              id: targetItemId,
              name: itemName,
              code: dbItem?.code || ai.itemCode || '',
              unit: dbItem?.unit || ai.unit || 'm3',
              category: dbItem?.category || ai.type || 'regular',
            });
          }
        });

        if (custItems.length > 0) {
          availableItems = custItems;
        } else {
          const custItemIds = new Set(selectedCust.items.map((ai: any) => ai.itemId || ai.id).filter(Boolean));
          availableItems = items.filter((i) => custItemIds.has(i.id));
        }
      } else if (formData.customerId && customerAgreementItems.has(formData.customerId)) {
        const custItemIds = customerAgreementItems.get(formData.customerId)!;
        availableItems = items.filter((i) => custItemIds.has(i.id));
      } else {
        // Fallback if agreement items couldn't be parsed
        availableItems = items;
      }
    } else {
      // No customer agreement selected -> item selection not available yet
      availableItems = [];
    }

    // Step 2: If supplier is selected, filter to only their agreement items
    if (formData.supplierId && supplierAgreementItems.has(formData.supplierId) && availableItems.length > 0) {
      const suppItemIds = supplierAgreementItems.get(formData.supplierId)!;
      const suppFiltered = availableItems.filter((i) => suppItemIds.has(i.id));
      if (suppFiltered.length > 0) {
        availableItems = suppFiltered;
      }
    }

    // Step 3: If transporter agreement has specific items, intersect with those
    if (selectedAgreement && selectedAgreement.agreementItems && selectedAgreement.agreementItems.length > 0 && availableItems.length > 0) {
      const agrItemIds = new Set(selectedAgreement.agreementItems.map((ai) => ai.itemId));
      const fromAgreement = availableItems.filter((i) => agrItemIds.has(i.id));
      if (fromAgreement.length > 0) {
        availableItems = fromAgreement;
      }
    }

    setFilteredItems(availableItems);

    // Reset item selection if current item is no longer in the filtered list
    if (formData.itemId && !availableItems.find((item) => item.id === formData.itemId)) {
      setFormData((prev) => ({ ...prev, itemId: '', aggregateValue: '' }));
    }
  }, [formData.customerId, formData.selectedCustomerAgreementId, formData.supplierId, suppliers, items, selectedAgreement, customers, customerAgreementItems, supplierAgreementItems]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  // Get currently selected truck's capacity (if any)
  const getSelectedTruckCapacity = (): number => {
    if (!formData.truckId) return 0;
    const truck = trucks.find((t) => t.id === formData.truckId);
    return truck?.capacity ? parseFloat(String(truck.capacity)) : 0;
  };

  const calculateValues = () => {
    const loaded = parseFloat(formData.loadedVolume || '0');
    const rate = parseFloat(formData.transportRate || '0');
    const truckCapacity = getSelectedTruckCapacity();

    // Cap the billable volume at the truck's capacity
    // If loaded > capacity, use capacity; otherwise use loaded
    const billableVolume =
      truckCapacity > 0 && loaded > truckCapacity ? truckCapacity : loaded;

    return {
      grossFee: (billableVolume * rate).toFixed(2),
      billableVolume: billableVolume.toFixed(2),
      truckCapacity,
      loaded,
      isCapped: truckCapacity > 0 && loaded > truckCapacity,
    };
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (
      !formData.customerId ||
      !formData.supplierId ||
      !formData.transporterId ||
      !formData.truckId ||
      !formData.itemId ||
      !formData.loadedVolume ||
      !formData.transportRate ||
      !formData.aggregateValue
    ) {
      alert('Please fill in all required fields');
      return;
    }

    // Validate that both customer and supplier have active agreements
    if (customerHasAgreement === false) {
      alert('Cannot create dispatch: The selected customer does not have an active Sales Agreement. Please create a Sales Agreement first.');
      return;
    }
    if (supplierHasAgreement === false) {
      alert('Cannot create dispatch: The selected supplier does not have an active Supplier Agreement. Please create a Supplier Agreement first.');
      return;
    }

    setIsSubmitting(true);

    try {
      const res = await fetch('/api/aggregate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          agreementId: formData.agreementId || null,
          customerId: formData.customerId,
          supplierId: formData.supplierId,
          transporterId: formData.transporterId,
          truckId: formData.truckId,
          itemId: formData.itemId,
          loadedVolume: parseFloat(formData.loadedVolume),
          driverName: formData.driverName || null,
          transportRate: parseFloat(formData.transportRate),
          aggregateValue: parseFloat(formData.aggregateValue),
          dispatchDate: formData.dispatchDate || undefined,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setShowDeliveryModal(true);
      } else {
        alert(data.error || 'Failed to create delivery');
      }
    } catch {
      alert('Failed to create delivery');
    }
    setIsSubmitting(false);
  };

  const { truckCapacity, isCapped, billableVolume, loaded } = calculateValues();

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/dashboard/aggregate"
          className="text-blue-600 hover:text-blue-800 text-sm font-medium"
        >
          ← Back to Aggregate Operations
        </Link>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mt-4">New Aggregate Dispatch</h1>
            <p className="text-gray-600 mt-1">Create a new stone/aggregate dispatch order</p>
          </div>
          <button 
            onClick={debugCustomerData}
            className="px-3 py-1 bg-orange-100 text-orange-800 rounded text-sm hover:bg-orange-200"
            type="button"
          >
            🐛 Debug Customers
          </button>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Dispatch Details — first */}
        <Card>
          <CardHeader>
            <h2 className="text-lg font-semibold text-gray-900">Dispatch Details</h2>
          </CardHeader>
          <CardBody>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Customer *
                </label>
                <select
                  name="customerId"
                  required
                  value={formData.selectedCustomerAgreementId}
                  onChange={(e) => {
                    const selectedAgrId = e.target.value;
                    const selectedCustomer = customers.find(c => c.agreementId === selectedAgrId);
                    if (selectedCustomer) {
                      setFormData(prev => ({
                        ...prev,
                        customerId: selectedCustomer.customerId,
                        selectedCustomerAgreementId: selectedAgrId,
                        itemId: '',
                        aggregateValue: '',
                      }));
                    } else {
                      setFormData(prev => ({
                        ...prev,
                        customerId: '',
                        selectedCustomerAgreementId: '',
                        itemId: '',
                        aggregateValue: '',
                      }));
                    }
                  }}
                  disabled={loadingData}
                  className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 border px-3 py-2"
                >
                  <option value="">Select Customer</option>
                  {customers.length === 0 && !loadingData && (
                    <option value="" disabled>No customers with active sales agreements found</option>
                  )}
                  {customers.map((customer) => (
                    <option key={`${customer.customerId}-${customer.agreementId}`} value={customer.agreementId}>
                      {customer.companyName}
                    </option>
                  ))}
                </select>
                {formData.customerId && customerHasAgreement === false && (
                  <p className="text-red-600 text-xs mt-1 font-medium">
                    No active Sales Agreement found for this customer. A Sales Agreement is required before creating a dispatch.
                  </p>
                )}
                {formData.customerId && customerHasAgreement === true && (
                  <p className="text-green-600 text-xs mt-1">Active agreement found</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Supplier *
                </label>
                <select
                  name="supplierId"
                  required
                  value={formData.selectedSupplierAgreementId}  // Use agreement ID for matching
                  onChange={(e) => {
                    const selectedAgreementId = e.target.value;
                    const selectedSupplier = suppliers.find(s => s.agreementId === selectedAgreementId);
                    if (selectedSupplier) {
                      const suppPriceKey = `${selectedAgreementId}_${formData.itemId}`;
                      const suppPrice = formData.itemId && supplierItemPrices.has(suppPriceKey)
                        ? supplierItemPrices.get(suppPriceKey)!.toString()
                        : null;

                      setFormData(prev => ({
                        ...prev,
                        supplierId: selectedSupplier.id,  // Store the actual supplier ID
                        selectedSupplierAgreementId: selectedAgreementId,  // Store the agreement ID for price lookup
                        ...(suppPrice !== null ? { aggregateValue: suppPrice } : {}),
                      }));
                    } else {
                      setFormData(prev => ({
                        ...prev,
                        supplierId: '',
                        selectedSupplierAgreementId: '',
                        aggregateValue: '',
                      }));
                    }
                  }}
                  disabled={loadingData}
                  className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 border px-3 py-2"
                >
                  <option value="">Select Supplier</option>
                  {suppliers.map((supplier, index) => (
                    <option key={`${supplier.id}_${supplier.agreementId}_${index}`} value={supplier.agreementId}>
                      {supplier.displayName || `${supplier.companyName} — ${supplier.agreementNo}`}
                    </option>
                  ))}
                </select>
                {formData.supplierId && supplierHasAgreement === false && (
                  <p className="text-red-600 text-xs mt-1 font-medium">
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Transporter *
                </label>
                <select
                  name="transporterId"
                  required
                  value={formData.transporterId}
                  onChange={(e) => handleTransporterChange(e.target.value)}
                  disabled={loadingData}
                  className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 border px-3 py-2"
                >
                  <option value="">Select Transporter</option>
                  {transporters.map((tr) => (
                    <option key={tr.id} value={tr.id}>
                      {tr.companyName} ({tr.code})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Truck *</label>
                <select
                  name="truckId"
                  required
                  value={formData.truckId}
                  onChange={handleInputChange}
                  disabled={!formData.transporterId || trucks.length === 0}
                  className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 border px-3 py-2"
                >
                  <option value="">Select Truck</option>
                  {trucks.map((truck) => (
                    <option key={truck.id} value={truck.id}>
                      {truck.plateNo} {truck.truckType ? `(${truck.truckType})` : ''}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Item *</label>
                <select
                  name="itemId"
                  required
                  value={formData.itemId}
                  onChange={(e) => handleItemChangeWithAgreementLookup(e.target.value)}
                  disabled={loadingData || !formData.selectedCustomerAgreementId}
                  className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 border px-3 py-2 disabled:bg-gray-100 disabled:text-gray-500 cursor-pointer disabled:cursor-not-allowed"
                >
                  <option value="">
                    {!formData.selectedCustomerAgreementId ? 'Select Customer Agreement First' : 'Select Item'}
                  </option>
                  {filteredItems.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Dispatch Date *</label>
                <input
                  type="date"
                  name="dispatchDate"
                  value={formData.dispatchDate}
                  onChange={handleInputChange}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <Input
                label="Driver Name"
                name="driverName"
                value={formData.driverName}
                onChange={handleInputChange}
                placeholder="Driver name"
              />
            </div>
          </CardBody>
        </Card>

        {/* Agreement Selection */}
        <Card>
          <CardHeader>
            <h2 className="text-lg font-semibold text-gray-900">Agreement</h2>
          </CardHeader>
          <CardBody>
            <Select
              label="Select Transport Agreement"
              name="agreementId"
              value={formData.agreementId}
              onChange={(e) => handleAgreementChange(e.target.value)}
              options={[
                { value: '', label: 'Select agreement (optional)' },
                ...agreements.map((a) => ({
                  value: a.id,
                  label: `${a.agreementNo} - ${a.transporter?.companyName || 'N/A'}`,
                })),
              ]}
            />
          </CardBody>
        </Card>

        {/* Auto-populated from Agreement */}
        {selectedAgreement && (
          <Card>
            <CardHeader>
              <h2 className="text-lg font-semibold text-gray-900">
                Agreement Details (Auto-populated)
              </h2>
            </CardHeader>
            <CardBody className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <p className="text-sm text-slate-600 mb-1">Transporter</p>
                  <p className="text-gray-900 font-medium">
                    {selectedAgreement.transporter?.companyName || '-'}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-slate-600 mb-1">Supplier</p>
                  <p className="text-gray-900 font-medium">
                    {selectedAgreement.supplier?.companyName || '-'}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-slate-600 mb-1">Driver Name</p>
                  <p className="text-gray-900 font-medium">
                    {formData.driverName || '-'}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-slate-600 mb-1">Loading Site (Origin)</p>
                  <p className="text-gray-900 font-medium">
                    {selectedAgreement.loadingSite || '-'}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-slate-600 mb-1">Offloading Site (Destination)</p>
                  <p className="text-gray-900 font-medium">
                    {selectedAgreement.offloadingSite || '-'}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-slate-600 mb-1">Available Trucks</p>
                  <p className="text-gray-900 font-medium">
                    {trucks.length} truck(s)
                    {trucks.length > 0 && (
                      <span className="text-sm text-gray-500 ml-2">
                        ({trucks.map((t) => t.plateNo).join(', ')})
                      </span>
                    )}
                  </p>
                </div>
                {selectedAgreement.agreementItems && selectedAgreement.agreementItems.length > 0 && (
                  <div className="md:col-span-2">
                    <p className="text-sm text-slate-600 mb-2">Materials in this Agreement</p>
                    <div className="bg-slate-50 p-3 rounded-md">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="text-left text-slate-500">
                            <th className="pb-2">Material</th>
                            <th className="pb-2">Transport Rate</th>
                            <th className="pb-2">Aggregate Value</th>
                          </tr>
                        </thead>
                        <tbody>
                          {selectedAgreement.agreementItems.map((ai) => (
                            <tr key={ai.id} className="border-t border-slate-200">
                              <td className="py-1">
                                {ai.item?.name || ai.itemId}
                                {ai.item?.code ? ` (${ai.item.code})` : ''}
                              </td>
                              <td className="py-1">{ai.transportRate.toLocaleString('en-US')} ETB/m³</td>
                              <td className="py-1">{ai.aggregateValue.toLocaleString('en-US')} ETB/m³</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    <p className="text-xs text-slate-500 mt-2">
                      Transport Rate + Aggregate Value will auto-populate when you pick a material below.
                    </p>
                  </div>
                )}
              </div>
            </CardBody>
          </Card>
        )}

        {/* Volume and Rate Details */}
        <Card>
          <CardHeader>
            <h2 className="text-lg font-semibold text-gray-900">Volume & Rate Details</h2>
          </CardHeader>
          <CardBody>
            {truckCapacity > 0 && (
              <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-md text-sm text-blue-800">
                Selected truck capacity: <strong>{truckCapacity} m³</strong>. Net payment will never exceed this capacity × transport rate.
              </div>
            )}
            {isCapped && (
              <div className="mb-4 p-3 bg-orange-50 border border-orange-200 rounded-md text-sm text-orange-800">
                ⚠️ Loaded volume ({loaded} m³) exceeds truck capacity ({truckCapacity} m³). Billable volume capped at {billableVolume} m³.
              </div>
            )}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Input
                label="Loaded Volume (m³) *"
                name="loadedVolume"
                type="number"
                value={formData.loadedVolume}
                onChange={handleInputChange}
                placeholder="0"
                step="0.01"
                required
              />
              <div>
                <Input
                  label={
                    selectedAgreement
                      ? 'Transport Rate (ETB/m³) — from agreement (editable)'
                      : 'Transport Rate (ETB/m³) *'
                  }
                  name="transportRate"
                  type="number"
                  value={formData.transportRate}
                  onChange={handleInputChange}
                  placeholder="0"
                  step="0.01"
                  required
                />
                {selectedAgreement && (
                  <p className="text-xs text-blue-600 mt-1">Pre-filled from agreement. You can adjust if needed.</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Aggregate Value (ETB/m³) *</label>
                <input
                  type="number"
                  name="aggregateValue"
                  value={formData.aggregateValue}
                  readOnly
                  placeholder="Select supplier and item to auto-fill"
                  step="0.01"
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-slate-50 text-slate-700 cursor-not-allowed"
                />
                <p className="text-xs text-slate-500 mt-1">Auto-filled from supplier agreement — not editable</p>
                {!formData.aggregateValue && formData.itemId && formData.selectedSupplierAgreementId && (
                  <p className="text-xs text-amber-600 mt-1">No aggregate value found in supplier agreement for this item. Please check the supplier agreement items.</p>
                )}
                {formData.aggregateValue && (
                  <p className="text-xs text-green-600 mt-1">✓ Value loaded from supplier agreement</p>
                )}
              </div>
            </div>
          </CardBody>
        </Card>

        {/* Submit Button */}
        <Card>
          <CardFooter>
            <div className="flex gap-4">
              <Button
                type="submit"
                variant="primary"
                size="lg"
                isLoading={isSubmitting}
              >
                Create Dispatch
              </Button>
              <Button
                type="button"
                variant="outline"
                size="lg"
                onClick={() => window.history.back()}
              >
                Cancel
              </Button>
            </div>
          </CardFooter>
        </Card>
      </form>

      {/* Success Modal */}
      {showDeliveryModal && (
        <Modal
          isOpen={showDeliveryModal}
          onClose={() => {
            setShowDeliveryModal(false);
            window.location.href = '/dashboard/aggregate';
          }}
          title="Dispatch Created Successfully"
        >
          <p>The aggregate dispatch has been created successfully.</p>
          <div className="mt-6 flex gap-4">
            <Button
              variant="primary"
              onClick={() => {
                window.location.href = '/dashboard/aggregate';
              }}
            >
              View Dispatches
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                window.location.href = '/dashboard/aggregate/new';
              }}
            >
              Create Another
            </Button>
          </div>
        </Modal>
      )}
    </div>
  );
}
