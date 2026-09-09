'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { Card, CardHeader, CardBody, CardFooter, Button, Input } from '@/components/ui';
import { ConfirmDialog } from '@/components/ui/Modal';
import { Building2, FileText, CheckCircle2, AlertCircle } from 'lucide-react';

interface Customer {
  id?: string;
  customerId?: string;
  companyName: string;
  code?: string;
  agreementId?: string;
}

interface Supplier {
  id: string;
  companyName: string;
  code: string;
  agreementId?: string;
  displayName?: string;
}

interface CustomerAgreement {
  id: string;
  agreementNo: string;
  customerId: string;
  status: string;
  validFrom: string;
  validTo: string;
  offloadingSite?: string | null;
  totalAmount?: number;
  items?: any;
  customer?: {
    id: string;
    companyName: string;
    code?: string;
  };
}

interface SupplierAgreement {
  id: string;
  agreementNo: string;
  supplierId: string;
  status: string;
  validFrom: string;
  validTo: string;
  loadingSite?: string | null;
  offloadingSite?: string | null;
  totalAmount?: number;
  items?: any;
  supplier?: {
    id: string;
    companyName: string;
    code?: string;
  };
}

interface Transporter {
  id: string;
  companyName: string;
  code: string;
  trucks?: Truck[];
}

interface Truck {
  id: string;
  plateNo: string;
  capacity?: number;
  truckType?: string;
}

interface Item {
  id: string;
  name: string;
  code: string;
  unit: string;
}

const parseItemPrice = (ai: any): number => {
  const unitPrice = Number(ai.unitPrice ?? ai.pricePerUnit ?? ai.price ?? 0);
  const qty = Number(ai.qty ?? ai.quantity ?? 1);
  const totalAmt = Number(ai.totalAmount ?? ai.amount ?? 0);
  if (unitPrice > 0) return unitPrice;
  if (totalAmt > 0 && qty > 0) {
    if (ai.priceType === 'incl' || ai.vatIncluded === true || ai.priceType === 'inclusive') {
      return (totalAmt / 1.15) / qty;
    }
    return totalAmt / qty;
  }
  return 0;
};

export default function EditAggregateDispatchPage() {
  const router = useRouter();
  const params = useParams();
  const id = params?.id as string;

  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      const res = await fetch(`/api/aggregate/${id}?permanent=true`, {
        method: 'DELETE',
      });
      const result = await res.json();
      if (res.ok && result.success) {
        alert('Aggregate dispatch deleted successfully');
        router.push('/dashboard/aggregate');
      } else {
        alert(result.error || 'Failed to delete aggregate dispatch');
      }
    } catch (err: any) {
      alert('Error deleting dispatch: ' + err.message);
    } finally {
      setIsDeleting(false);
      setShowDeleteModal(false);
    }
  };

  // Reference options
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [customerAgreements, setCustomerAgreements] = useState<CustomerAgreement[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [supplierAgreements, setSupplierAgreements] = useState<SupplierAgreement[]>([]);
  const [transporters, setTransporters] = useState<Transporter[]>([]);
  const [trucks, setTrucks] = useState<Truck[]>([]);
  const [items, setItems] = useState<Item[]>([]);
  const [filteredItems, setFilteredItems] = useState<Item[]>([]);

  // Map: key (agreementId/customerId) → Set of item IDs
  const [customerAgreementItems, setCustomerAgreementItems] = useState<Map<string, Set<string>>>(new Map());
  // Map: `${agreementId}_${itemId}` / `${agrId}_${name}` / `${custId}_${itemId}` → unit price
  const [customerAgreementPrices, setCustomerAgreementPrices] = useState<Map<string, number>>(new Map());

  // Map: key (agreementId/supplierId) → Set of item IDs
  const [supplierAgreementItems, setSupplierAgreementItems] = useState<Map<string, Set<string>>>(new Map());
  // Map: `${agreementId}_${itemId}` / `${agrId}_${name}` / `${suppId}_${itemId}` → unit price
  const [supplierAgreementPrices, setSupplierAgreementPrices] = useState<Map<string, number>>(new Map());

  // Form state
  const [formData, setFormData] = useState({
    dispatchNo: '',
    customerId: '',
    selectedCustomerAgreementId: '',
    supplierId: '',
    selectedSupplierAgreementId: '',
    transporterId: '',
    truckId: '',
    itemId: '',
    driverName: '',
    padNumber: '',
    loadedVolume: '',
    deliveredVolume: '',
    transportRate: '',
    aggregateValue: '', // Supplier rate
    customerPrice: '',  // Customer rate
    status: 'Dispatched',
    dispatchDate: '',
    deliveryDate: '',
  });

  useEffect(() => {
    if (!id) return;

    const fetchAllData = async () => {
      setLoading(true);
      try {
        const [
          deliveryRes,
          customersRes,
          suppliersRes,
          transportersRes,
          itemsRes,
          custAgreementsRes,
          suppAgreementsRes,
        ] = await Promise.all([
          fetch(`/api/aggregate/${id}`),
          fetch('/api/customers?limit=1000'),
          fetch('/api/suppliers?limit=1000'),
          fetch('/api/transporters?status=Active&limit=1000'),
          fetch('/api/items?limit=1000'),
          fetch('/api/sales/agreements?status=Active&division=AGGREGATE&limit=1000'),
          fetch('/api/supplier-agreements/all?status=Active'),
        ]);

        const deliveryData = await deliveryRes.json();
        if (!deliveryRes.ok || !deliveryData.success) {
          setError(deliveryData.error || 'Failed to load aggregate delivery');
          setLoading(false);
          return;
        }

        const delivery = deliveryData.data;

        if (customersRes.ok) {
          const cData = await customersRes.json();
          setCustomers(cData.data || []);
        }
        if (suppliersRes.ok) {
          const sData = await suppliersRes.json();
          setSuppliers(sData.data || []);
        }
        if (transportersRes.ok) {
          const tData = await transportersRes.json();
          setTransporters(tData.data || []);
          const currentTransporter = (tData.data || []).find((t: Transporter) => t.id === delivery.transporterId);
          setTrucks(currentTransporter?.trucks || []);
        }

        // Database items map
        const dbItemMap = new Map<string, Item>();
        const dbItemsList: Item[] = [];
        if (itemsRes.ok) {
          const iData = await itemsRes.json();
          (iData.data || []).forEach((i: Item) => {
            dbItemMap.set(i.id, i);
            dbItemsList.push(i);
          });
        }
        setItems(dbItemsList);

        // Parse customer agreements and price mappings
        const rawCustAgreements: CustomerAgreement[] = [];
        const custItemsMap = new Map<string, Set<string>>();
        const custPricesMap = new Map<string, number>();

        if (custAgreementsRes.ok) {
          const custAgrData = await custAgreementsRes.json();
          (custAgrData.data || []).forEach((agr: any) => {
            rawCustAgreements.push(agr);
            const custId = agr.customerId || agr.customer?.id;
            const agrId = agr.id;
            try {
              const agrItems = typeof agr.items === 'string' ? JSON.parse(agr.items) : (agr.items || []);
              agrItems.forEach((ai: any) => {
                const rawId = ai.itemId || ai.id;
                const rawName = ai.itemName || ai.name || ai.description || '';
                let dbItem = rawId ? dbItemMap.get(rawId) : null;
                if (!dbItem && rawName) {
                  dbItem = dbItemsList.find((i) => i.name.toLowerCase() === rawName.toLowerCase()) || null;
                }

                const targetItemId = dbItem?.id || rawId;
                const targetItemName = (dbItem?.name || rawName).toLowerCase();
                const price = parseItemPrice(ai);

                if (targetItemId) {
                  if (custId) {
                    if (!custItemsMap.has(custId)) custItemsMap.set(custId, new Set());
                    custItemsMap.get(custId)!.add(targetItemId);
                  }
                  if (agrId) {
                    if (!custItemsMap.has(agrId)) custItemsMap.set(agrId, new Set());
                    custItemsMap.get(agrId)!.add(targetItemId);
                  }

                  if (price > 0) {
                    if (agrId) {
                      custPricesMap.set(`${agrId}_${targetItemId}`, price);
                      if (targetItemName) custPricesMap.set(`${agrId}_${targetItemName}`, price);
                    }
                    if (custId) {
                      if (!custPricesMap.has(`${custId}_${targetItemId}`)) custPricesMap.set(`${custId}_${targetItemId}`, price);
                      if (targetItemName && !custPricesMap.has(`${custId}_${targetItemName}`)) custPricesMap.set(`${custId}_${targetItemName}`, price);
                    }
                  }
                }
              });
            } catch { /* ignore */ }
          });
        }
        setCustomerAgreements(rawCustAgreements);
        setCustomerAgreementItems(custItemsMap);
        setCustomerAgreementPrices(custPricesMap);

        // Parse supplier agreements and price mappings
        const rawSuppAgreements: SupplierAgreement[] = [];
        const suppItemsMap = new Map<string, Set<string>>();
        const suppPricesMap = new Map<string, number>();

        if (suppAgreementsRes.ok) {
          const suppAgrData = await suppAgreementsRes.json();
          (suppAgrData.data || []).forEach((agr: any) => {
            rawSuppAgreements.push(agr);
            const suppId = agr.supplierId || agr.supplier?.id;
            const agrId = agr.id;
            try {
              const agrItems = typeof agr.items === 'string' ? JSON.parse(agr.items) : (agr.items || []);
              agrItems.forEach((ai: any) => {
                const rawId = ai.itemId || ai.id;
                const rawName = ai.itemName || ai.name || ai.description || '';
                let dbItem = rawId ? dbItemMap.get(rawId) : null;
                if (!dbItem && rawName) {
                  dbItem = dbItemsList.find((i) => i.name.toLowerCase() === rawName.toLowerCase()) || null;
                }

                const targetItemId = dbItem?.id || rawId;
                const targetItemName = (dbItem?.name || rawName).toLowerCase();
                const price = parseItemPrice(ai);

                if (targetItemId) {
                  if (suppId) {
                    if (!suppItemsMap.has(suppId)) suppItemsMap.set(suppId, new Set());
                    suppItemsMap.get(suppId)!.add(targetItemId);
                  }
                  if (agrId) {
                    if (!suppItemsMap.has(agrId)) suppItemsMap.set(agrId, new Set());
                    suppItemsMap.get(agrId)!.add(targetItemId);
                  }

                  if (price > 0) {
                    if (agrId) {
                      suppPricesMap.set(`${agrId}_${targetItemId}`, price);
                      if (targetItemName) suppPricesMap.set(`${agrId}_${targetItemName}`, price);
                    }
                    if (suppId) {
                      if (!suppPricesMap.has(`${suppId}_${targetItemId}`)) suppPricesMap.set(`${suppId}_${targetItemId}`, price);
                      if (targetItemName && !suppPricesMap.has(`${suppId}_${targetItemName}`)) suppPricesMap.set(`${suppId}_${targetItemName}`, price);
                    }
                  }
                }
              });
            } catch { /* ignore */ }
          });
        }
        setSupplierAgreements(rawSuppAgreements);
        setSupplierAgreementItems(suppItemsMap);
        setSupplierAgreementPrices(suppPricesMap);

        // Determine initial customer agreement and supplier agreement IDs
        const initCustAgrId = delivery.customerAgreement?.id || 
          (rawCustAgreements.find((a) => a.customerId === delivery.customerId)?.id || '');

        const initSuppAgrId = delivery.supplierAgreement?.id || 
          (rawSuppAgreements.find((a) => a.supplierId === delivery.supplierId)?.id || '');

        // Determine initial prices
        let initialCustPrice = '';
        if (delivery.customerPrice != null) {
          initialCustPrice = String(delivery.customerPrice);
        } else if (initCustAgrId && delivery.itemId && custPricesMap.has(`${initCustAgrId}_${delivery.itemId}`)) {
          initialCustPrice = String(custPricesMap.get(`${initCustAgrId}_${delivery.itemId}`));
        } else if (delivery.customerId && delivery.itemId && custPricesMap.has(`${delivery.customerId}_${delivery.itemId}`)) {
          initialCustPrice = String(custPricesMap.get(`${delivery.customerId}_${delivery.itemId}`));
        } else if (delivery.aggregateValue != null) {
          initialCustPrice = String(delivery.aggregateValue);
        }

        let initialSuppPrice = '';
        if (delivery.aggregateValue != null && Number(delivery.aggregateValue) > 0) {
          initialSuppPrice = String(delivery.aggregateValue);
        } else if (initSuppAgrId && delivery.itemId && suppPricesMap.has(`${initSuppAgrId}_${delivery.itemId}`)) {
          initialSuppPrice = String(suppPricesMap.get(`${initSuppAgrId}_${delivery.itemId}`));
        } else if (delivery.supplierId && delivery.itemId && suppPricesMap.has(`${delivery.supplierId}_${delivery.itemId}`)) {
          initialSuppPrice = String(suppPricesMap.get(`${delivery.supplierId}_${delivery.itemId}`));
        } else if (delivery.supplierPrice != null) {
          initialSuppPrice = String(delivery.supplierPrice);
        }

        setFormData({
          dispatchNo: delivery.dispatchNo || '',
          customerId: delivery.customerId || '',
          selectedCustomerAgreementId: initCustAgrId,
          supplierId: delivery.supplierId || '',
          selectedSupplierAgreementId: initSuppAgrId,
          transporterId: delivery.transporterId || '',
          truckId: delivery.truckId || '',
          itemId: delivery.itemId || '',
          driverName: delivery.driverName || '',
          padNumber: delivery.padNumber || '',
          loadedVolume: delivery.loadedVolume != null ? String(delivery.loadedVolume) : '',
          deliveredVolume: delivery.deliveredVolume != null ? String(delivery.deliveredVolume) : '',
          transportRate: delivery.transportRate != null ? String(delivery.transportRate) : '',
          aggregateValue: initialSuppPrice,
          customerPrice: initialCustPrice,
          status: delivery.status || 'Dispatched',
          dispatchDate: delivery.dispatchDate ? new Date(delivery.dispatchDate).toISOString().split('T')[0] : '',
          deliveryDate: delivery.deliveryDate ? new Date(delivery.deliveryDate).toISOString().split('T')[0] : '',
        });

      } catch (err: any) {
        console.error('Error loading data for edit:', err);
        setError('Error loading delivery details: ' + err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchAllData();
  }, [id]);

  // Dynamically filter items list based on selected customer/agreement & supplier/agreement
  useEffect(() => {
    let available = [...items];

    // Filter by customer agreement items
    const custKey = formData.selectedCustomerAgreementId || formData.customerId;
    if (custKey && customerAgreementItems.has(custKey)) {
      const custItemIds = customerAgreementItems.get(custKey)!;
      const filteredByCust = available.filter(
        (i) => custItemIds.has(i.id) || i.id === formData.itemId
      );
      if (filteredByCust.length > 0) {
        available = filteredByCust;
      }
    }

    // Intersect with supplier agreement items
    const suppKey = formData.selectedSupplierAgreementId || formData.supplierId;
    if (suppKey && supplierAgreementItems.has(suppKey)) {
      const suppItemIds = supplierAgreementItems.get(suppKey)!;
      const filteredBySupp = available.filter(
        (i) => suppItemIds.has(i.id) || i.id === formData.itemId
      );
      if (filteredBySupp.length > 0) {
        available = filteredBySupp;
      }
    }

    setFilteredItems(available);
  }, [
    formData.customerId,
    formData.selectedCustomerAgreementId,
    formData.supplierId,
    formData.selectedSupplierAgreementId,
    formData.itemId,
    items,
    customerAgreementItems,
    supplierAgreementItems,
  ]);

  // Helper to get Customer Unit Price
  const lookupCustomerPrice = (custId: string, agrId: string, targetItemId: string): number | undefined => {
    if (!targetItemId) return undefined;
    const dbItem = items.find((i) => i.id === targetItemId);
    const itemName = dbItem?.name ? dbItem.name.toLowerCase() : '';

    if (agrId && customerAgreementPrices.has(`${agrId}_${targetItemId}`)) {
      return customerAgreementPrices.get(`${agrId}_${targetItemId}`);
    }
    if (agrId && itemName && customerAgreementPrices.has(`${agrId}_${itemName}`)) {
      return customerAgreementPrices.get(`${agrId}_${itemName}`);
    }
    if (custId && customerAgreementPrices.has(`${custId}_${targetItemId}`)) {
      return customerAgreementPrices.get(`${custId}_${targetItemId}`);
    }
    if (custId && itemName && customerAgreementPrices.has(`${custId}_${itemName}`)) {
      return customerAgreementPrices.get(`${custId}_${itemName}`);
    }
    return undefined;
  };

  // Helper to get Supplier Unit Price
  const lookupSupplierPrice = (suppId: string, agrId: string, targetItemId: string): number | undefined => {
    if (!targetItemId) return undefined;
    const dbItem = items.find((i) => i.id === targetItemId);
    const itemName = dbItem?.name ? dbItem.name.toLowerCase() : '';

    if (agrId && supplierAgreementPrices.has(`${agrId}_${targetItemId}`)) {
      return supplierAgreementPrices.get(`${agrId}_${targetItemId}`);
    }
    if (agrId && itemName && supplierAgreementPrices.has(`${agrId}_${itemName}`)) {
      return supplierAgreementPrices.get(`${agrId}_${itemName}`);
    }
    if (suppId && supplierAgreementPrices.has(`${suppId}_${targetItemId}`)) {
      return supplierAgreementPrices.get(`${suppId}_${targetItemId}`);
    }
    if (suppId && itemName && supplierAgreementPrices.has(`${suppId}_${itemName}`)) {
      return supplierAgreementPrices.get(`${suppId}_${itemName}`);
    }
    return undefined;
  };

  // Helper to extract first item ID from customer agreement
  const getFirstItemFromCustAgr = (agrId: string): string => {
    if (!agrId) return '';
    const itemIds = customerAgreementItems.get(agrId);
    if (itemIds && itemIds.size > 0) {
      return Array.from(itemIds)[0];
    }
    return '';
  };

  // Helper to extract first item ID from supplier agreement
  const getFirstItemFromSuppAgr = (agrId: string): string => {
    if (!agrId) return '';
    const itemIds = supplierAgreementItems.get(agrId);
    if (itemIds && itemIds.size > 0) {
      return Array.from(itemIds)[0];
    }
    return '';
  };

  // When Customer is changed
  const handleCustomerChange = (newCustId: string) => {
    const matchingAgreements = customerAgreements.filter((a) => a.customerId === newCustId);
    const newSelectedAgrId = matchingAgreements.length > 0 ? matchingAgreements[0].id : '';

    // Check if current item exists in new customer agreement
    let targetItemId = formData.itemId;
    const custAgrItems = newSelectedAgrId ? customerAgreementItems.get(newSelectedAgrId) : customerAgreementItems.get(newCustId);
    if ((!targetItemId || (custAgrItems && !custAgrItems.has(targetItemId))) && custAgrItems && custAgrItems.size > 0) {
      targetItemId = Array.from(custAgrItems)[0];
    }

    const autoCustPrice = lookupCustomerPrice(newCustId, newSelectedAgrId, targetItemId);
    const autoSuppPrice = lookupSupplierPrice(formData.supplierId, formData.selectedSupplierAgreementId, targetItemId);

    setFormData((prev) => ({
      ...prev,
      customerId: newCustId,
      selectedCustomerAgreementId: newSelectedAgrId,
      itemId: targetItemId,
      customerPrice: autoCustPrice !== undefined ? String(autoCustPrice) : prev.customerPrice,
      aggregateValue: autoSuppPrice !== undefined ? String(autoSuppPrice) : prev.aggregateValue,
    }));
  };

  // When Customer Agreement is changed
  const handleCustomerAgreementChange = (newAgrId: string) => {
    const agr = customerAgreements.find((a) => a.id === newAgrId);
    const custId = agr?.customerId || formData.customerId;

    let targetItemId = formData.itemId;
    const agrItemIds = customerAgreementItems.get(newAgrId);
    if ((!targetItemId || (agrItemIds && !agrItemIds.has(targetItemId))) && agrItemIds && agrItemIds.size > 0) {
      targetItemId = Array.from(agrItemIds)[0];
    }

    const autoCustPrice = lookupCustomerPrice(custId, newAgrId, targetItemId);
    const autoSuppPrice = lookupSupplierPrice(formData.supplierId, formData.selectedSupplierAgreementId, targetItemId);

    setFormData((prev) => ({
      ...prev,
      customerId: custId,
      selectedCustomerAgreementId: newAgrId,
      itemId: targetItemId,
      customerPrice: autoCustPrice !== undefined ? String(autoCustPrice) : prev.customerPrice,
      aggregateValue: autoSuppPrice !== undefined ? String(autoSuppPrice) : prev.aggregateValue,
    }));
  };

  // When Supplier is changed
  const handleSupplierChange = (newSuppId: string) => {
    const matchingAgreements = supplierAgreements.filter((a) => a.supplierId === newSuppId);
    const newSelectedAgrId = matchingAgreements.length > 0 ? matchingAgreements[0].id : '';

    let targetItemId = formData.itemId;
    const suppAgrItems = newSelectedAgrId ? supplierAgreementItems.get(newSelectedAgrId) : supplierAgreementItems.get(newSuppId);
    if ((!targetItemId || (suppAgrItems && !suppAgrItems.has(targetItemId))) && suppAgrItems && suppAgrItems.size > 0) {
      targetItemId = Array.from(suppAgrItems)[0];
    }

    const autoSuppPrice = lookupSupplierPrice(newSuppId, newSelectedAgrId, targetItemId);
    const autoCustPrice = lookupCustomerPrice(formData.customerId, formData.selectedCustomerAgreementId, targetItemId);

    setFormData((prev) => ({
      ...prev,
      supplierId: newSuppId,
      selectedSupplierAgreementId: newSelectedAgrId,
      itemId: targetItemId,
      aggregateValue: autoSuppPrice !== undefined ? String(autoSuppPrice) : prev.aggregateValue,
      customerPrice: autoCustPrice !== undefined ? String(autoCustPrice) : prev.customerPrice,
    }));
  };

  // When Supplier Agreement is changed
  const handleSupplierAgreementChange = (newAgrId: string) => {
    const agr = supplierAgreements.find((a) => a.id === newAgrId);
    const suppId = agr?.supplierId || formData.supplierId;

    let targetItemId = formData.itemId;
    const agrItemIds = supplierAgreementItems.get(newAgrId);
    if ((!targetItemId || (agrItemIds && !agrItemIds.has(targetItemId))) && agrItemIds && agrItemIds.size > 0) {
      targetItemId = Array.from(agrItemIds)[0];
    }

    const autoSuppPrice = lookupSupplierPrice(suppId, newAgrId, targetItemId);
    const autoCustPrice = lookupCustomerPrice(formData.customerId, formData.selectedCustomerAgreementId, targetItemId);

    setFormData((prev) => ({
      ...prev,
      supplierId: suppId,
      selectedSupplierAgreementId: newAgrId,
      itemId: targetItemId,
      aggregateValue: autoSuppPrice !== undefined ? String(autoSuppPrice) : prev.aggregateValue,
      customerPrice: autoCustPrice !== undefined ? String(autoCustPrice) : prev.customerPrice,
    }));
  };

  // When Item is changed
  const handleItemChange = (selectedItemId: string) => {
    const autoCustPrice = lookupCustomerPrice(
      formData.customerId,
      formData.selectedCustomerAgreementId,
      selectedItemId
    );
    const autoSuppPrice = lookupSupplierPrice(
      formData.supplierId,
      formData.selectedSupplierAgreementId,
      selectedItemId
    );

    setFormData((prev) => ({
      ...prev,
      itemId: selectedItemId,
      customerPrice: autoCustPrice !== undefined ? String(autoCustPrice) : prev.customerPrice,
      aggregateValue: autoSuppPrice !== undefined ? String(autoSuppPrice) : prev.aggregateValue,
    }));
  };

  // When transporter changes, update available trucks
  const handleTransporterChange = (transporterId: string) => {
    const selectedTransporter = transporters.find((t) => t.id === transporterId);
    setTrucks(selectedTransporter?.trucks || []);
    setFormData((prev) => ({
      ...prev,
      transporterId,
      truckId: '',
    }));
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    if (name === 'customerId') {
      handleCustomerChange(value);
    } else if (name === 'selectedCustomerAgreementId') {
      handleCustomerAgreementChange(value);
    } else if (name === 'supplierId') {
      handleSupplierChange(value);
    } else if (name === 'selectedSupplierAgreementId') {
      handleSupplierAgreementChange(value);
    } else if (name === 'itemId') {
      handleItemChange(value);
    } else {
      setFormData((prev) => ({ ...prev, [name]: value }));
    }
  };

  // Filtered customer agreements for the selected customer
  const availableCustomerAgreements = formData.customerId
    ? customerAgreements.filter((a) => a.customerId === formData.customerId)
    : customerAgreements;

  // Filtered supplier agreements for the selected supplier
  const availableSupplierAgreements = formData.supplierId
    ? supplierAgreements.filter((a) => a.supplierId === formData.supplierId)
    : supplierAgreements;

  // Calculations
  const calculateValues = () => {
    const loaded = parseFloat(formData.loadedVolume) || 0;
    const delivered = formData.deliveredVolume !== '' ? parseFloat(formData.deliveredVolume) : null;
    const rate = parseFloat(formData.transportRate) || 0;
    const aggValue = parseFloat(formData.aggregateValue) || 0;
    const custValue = parseFloat(formData.customerPrice) || aggValue;

    const truck = trucks.find((t) => t.id === formData.truckId);
    const truckCapacity = truck?.capacity ? parseFloat(String(truck.capacity)) : 0;

    const billableVolume = (truckCapacity > 0 && loaded > truckCapacity) ? truckCapacity : loaded;
    const grossFee = billableVolume * rate;

    let shortageVolume = 0;
    let shortageDeduction = 0;

    if (delivered !== null) {
      shortageVolume = Math.max(0, loaded - delivered);
      shortageDeduction = shortageVolume * aggValue;
    }

    const netPayment = grossFee - shortageDeduction;
    const custReceivable = loaded * custValue;
    const suppPayable = (delivered !== null ? delivered : loaded) * aggValue;
    const netProfitAmount = custReceivable - suppPayable - grossFee;

    return {
      truckCapacity,
      billableVolume,
      grossFee,
      shortageVolume,
      shortageDeduction,
      netPayment,
      custReceivable,
      suppPayable,
      netProfitAmount,
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

    setIsSubmitting(true);

    try {
      const res = await fetch(`/api/aggregate/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerId: formData.customerId,
          supplierId: formData.supplierId,
          transporterId: formData.transporterId,
          truckId: formData.truckId,
          itemId: formData.itemId,
          driverName: formData.driverName || null,
          padNumber: formData.padNumber || null,
          loadedVolume: parseFloat(formData.loadedVolume),
          deliveredVolume: formData.deliveredVolume !== '' ? parseFloat(formData.deliveredVolume) : null,
          transportRate: parseFloat(formData.transportRate),
          aggregateValue: parseFloat(formData.aggregateValue),
          customerPrice: parseFloat(formData.customerPrice || formData.aggregateValue),
          status: formData.status,
          dispatchDate: formData.dispatchDate ? new Date(formData.dispatchDate).toISOString() : undefined,
          deliveryDate: formData.deliveryDate ? new Date(formData.deliveryDate).toISOString() : null,
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        alert('Aggregate dispatch updated successfully!');
        router.refresh();
        router.push(`/dashboard/aggregate/${id}`);
      } else {
        alert(data.error || 'Failed to update aggregate dispatch');
      }
    } catch (err: any) {
      alert('Failed to update dispatch: ' + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const {
    truckCapacity,
    billableVolume,
    grossFee,
    shortageVolume,
    shortageDeduction,
    netPayment,
    custReceivable,
    suppPayable,
    netProfitAmount,
  } = calculateValues();

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-2 text-sm text-slate-600">
          <button onClick={() => router.push('/dashboard/aggregate')} className="text-blue-600 hover:text-blue-700 font-medium">
            Aggregate Operations
          </button>
          <span>/</span>
          <span className="text-slate-900 font-medium">Edit Dispatch</span>
        </div>
        <Card>
          <CardBody>
            <div className="text-center py-8 text-slate-600">Loading delivery details for edit...</div>
          </CardBody>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-2 text-sm text-slate-600">
          <button onClick={() => router.push('/dashboard/aggregate')} className="text-blue-600 hover:text-blue-700 font-medium">
            Aggregate Operations
          </button>
          <span>/</span>
          <span className="text-slate-900 font-medium">Error</span>
        </div>
        <Card>
          <CardBody>
            <div className="text-center py-8 text-red-600">{error}</div>
          </CardBody>
        </Card>
      </div>
    );
  }

  const selectedCustAgreement = customerAgreements.find((a) => a.id === formData.selectedCustomerAgreementId);
  const selectedSuppAgreement = supplierAgreements.find((a) => a.id === formData.selectedSupplierAgreementId);

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-slate-600">
        <button onClick={() => router.push('/dashboard/aggregate')} className="text-blue-600 hover:text-blue-700 font-medium">
          Aggregate Operations
        </button>
        <span>/</span>
        <button onClick={() => router.push(`/dashboard/aggregate/${id}`)} className="text-blue-600 hover:text-blue-700 font-medium">
          {formData.dispatchNo}
        </button>
        <span>/</span>
        <span className="text-slate-900 font-medium">Edit</span>
      </div>

      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Edit Aggregate Dispatch</h1>
          <p className="text-slate-600 mt-1">Update details & agreements for dispatch {formData.dispatchNo}</p>
        </div>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit}>
        <Card>
          <CardHeader>
            <h2 className="text-lg font-semibold text-slate-900">Dispatch & Agreement Selection</h2>
          </CardHeader>
          <CardBody className="space-y-6">
            
            {/* Customer & Supplier Agreement Blocks */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              
              {/* Customer Side */}
              <div className="p-4 bg-emerald-50/40 border border-emerald-200 rounded-xl space-y-4">
                <div className="flex items-center gap-2 pb-2 border-b border-emerald-100">
                  <div className="p-1 rounded bg-emerald-600 text-white">
                    <Building2 className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-emerald-950">Customer & Sales Agreement</h3>
                    <p className="text-[11px] text-emerald-700">Select customer and agreement to pull customer unit price</p>
                  </div>
                </div>

                {/* Customer Dropdown */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Customer *</label>
                  <select
                    name="customerId"
                    required
                    value={formData.customerId}
                    onChange={handleInputChange}
                    className="block w-full rounded-md border-gray-300 shadow-sm focus:border-emerald-500 focus:ring-emerald-500 border px-3 py-2 text-sm bg-white"
                  >
                    <option value="">Select Customer</option>
                    {customers.map((c) => (
                      <option key={c.id || c.customerId} value={c.id || c.customerId}>
                        {c.companyName} {c.code ? `(${c.code})` : ''}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Customer Agreement Dropdown */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-semibold text-slate-700">Customer Sales Agreement</label>
                    {selectedCustAgreement && (
                      <span className="text-[10px] font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded">
                        {selectedCustAgreement.status || 'Active'}
                      </span>
                    )}
                  </div>
                  <select
                    name="selectedCustomerAgreementId"
                    value={formData.selectedCustomerAgreementId}
                    onChange={handleInputChange}
                    className="block w-full rounded-md border-gray-300 shadow-sm focus:border-emerald-500 focus:ring-emerald-500 border px-3 py-2 text-sm bg-white"
                  >
                    <option value="">
                      {availableCustomerAgreements.length === 0
                        ? 'No active sales agreements found'
                        : 'Select Customer Agreement'}
                    </option>
                    {availableCustomerAgreements.map((agr) => (
                      <option key={agr.id} value={agr.id}>
                        {agr.agreementNo} {agr.validFrom && agr.validTo ? `(${new Date(agr.validFrom).toLocaleDateString()} - ${new Date(agr.validTo).toLocaleDateString()})` : ''}
                      </option>
                    ))}
                  </select>
                  {selectedCustAgreement?.offloadingSite && (
                    <p className="text-[11px] text-emerald-800 mt-1 truncate">
                      Offloading Site: <span className="font-medium">{selectedCustAgreement.offloadingSite}</span>
                    </p>
                  )}
                </div>
              </div>

              {/* Supplier Side */}
              <div className="p-4 bg-amber-50/40 border border-amber-200 rounded-xl space-y-4">
                <div className="flex items-center gap-2 pb-2 border-b border-amber-100">
                  <div className="p-1 rounded bg-amber-600 text-white">
                    <Building2 className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-amber-950">Supplier & Purchase Agreement</h3>
                    <p className="text-[11px] text-amber-700">Select supplier and agreement to pull supplier unit price</p>
                  </div>
                </div>

                {/* Supplier Dropdown */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Supplier *</label>
                  <select
                    name="supplierId"
                    required
                    value={formData.supplierId}
                    onChange={handleInputChange}
                    className="block w-full rounded-md border-gray-300 shadow-sm focus:border-amber-500 focus:ring-amber-500 border px-3 py-2 text-sm bg-white"
                  >
                    <option value="">Select Supplier</option>
                    {suppliers.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.companyName} {s.code ? `(${s.code})` : ''}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Supplier Agreement Dropdown */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-semibold text-slate-700">Supplier Purchase Agreement</label>
                    {selectedSuppAgreement && (
                      <span className="text-[10px] font-bold text-amber-800 bg-amber-100 px-2 py-0.5 rounded">
                        {selectedSuppAgreement.status || 'Active'}
                      </span>
                    )}
                  </div>
                  <select
                    name="selectedSupplierAgreementId"
                    value={formData.selectedSupplierAgreementId}
                    onChange={handleInputChange}
                    className="block w-full rounded-md border-gray-300 shadow-sm focus:border-amber-500 focus:ring-amber-500 border px-3 py-2 text-sm bg-white"
                  >
                    <option value="">
                      {availableSupplierAgreements.length === 0
                        ? 'No active supplier agreements found'
                        : 'Select Supplier Agreement'}
                    </option>
                    {availableSupplierAgreements.map((agr) => (
                      <option key={agr.id} value={agr.id}>
                        {agr.agreementNo} {agr.loadingSite ? `(${agr.loadingSite})` : (agr.validFrom && agr.validTo ? `(${new Date(agr.validFrom).toLocaleDateString()} - ${new Date(agr.validTo).toLocaleDateString()})` : '')}
                      </option>
                    ))}
                  </select>
                  {selectedSuppAgreement?.loadingSite && (
                    <p className="text-[11px] text-amber-800 mt-1 truncate">
                      Loading/Quarry Site: <span className="font-medium">{selectedSuppAgreement.loadingSite}</span>
                    </p>
                  )}
                </div>
              </div>

            </div>

            {/* Logistics & Dispatch Info */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {/* Transporter */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Transporter *</label>
                <select
                  name="transporterId"
                  required
                  value={formData.transporterId}
                  onChange={(e) => handleTransporterChange(e.target.value)}
                  className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 border px-3 py-2 text-sm"
                >
                  <option value="">Select Transporter</option>
                  {transporters.map((tr) => (
                    <option key={tr.id} value={tr.id}>
                      {tr.companyName} ({tr.code})
                    </option>
                  ))}
                </select>
              </div>

              {/* Truck */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Truck *</label>
                <select
                  name="truckId"
                  required
                  value={formData.truckId}
                  onChange={handleInputChange}
                  disabled={!formData.transporterId || trucks.length === 0}
                  className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 border px-3 py-2 text-sm disabled:bg-gray-100"
                >
                  <option value="">Select Truck</option>
                  {trucks.map((truck) => (
                    <option key={truck.id} value={truck.id}>
                      {truck.plateNo} {truck.capacity ? `(Cap: ${truck.capacity} m³)` : ''}
                    </option>
                  ))}
                </select>
              </div>

              {/* Item */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Item *
                  {(formData.selectedCustomerAgreementId || formData.customerId) && (
                    <span className="ml-1 text-[11px] font-normal text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded border border-blue-200">
                      Contracted ({filteredItems.length})
                    </span>
                  )}
                </label>
                <select
                  name="itemId"
                  required
                  value={formData.itemId}
                  onChange={handleInputChange}
                  className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 border px-3 py-2 text-sm"
                >
                  <option value="">Select Item</option>
                  {filteredItems.map((i) => {
                    const custPrice = lookupCustomerPrice(formData.customerId, formData.selectedCustomerAgreementId, i.id);
                    const suppPrice = lookupSupplierPrice(formData.supplierId, formData.selectedSupplierAgreementId, i.id);
                    let priceHint = '';
                    if (custPrice !== undefined && suppPrice !== undefined) {
                      priceHint = ` — Cust: ${custPrice.toLocaleString()} ETB | Supp: ${suppPrice.toLocaleString()} ETB`;
                    } else if (custPrice !== undefined) {
                      priceHint = ` — Cust: ${custPrice.toLocaleString()} ETB`;
                    } else if (suppPrice !== undefined) {
                      priceHint = ` — Supp: ${suppPrice.toLocaleString()} ETB`;
                    }
                    return (
                      <option key={i.id} value={i.id}>
                        {i.name} ({i.unit}){priceHint}
                      </option>
                    );
                  })}
                </select>
              </div>

              {/* Status */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Status *</label>
                <select
                  name="status"
                  required
                  value={formData.status}
                  onChange={handleInputChange}
                  className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 border px-3 py-2 text-sm font-medium"
                >
                  <option value="Dispatched">Dispatched</option>
                  <option value="Delivered">Delivered</option>
                  <option value="Verified">Verified</option>
                  <option value="Settled">Settled</option>
                  <option value="Cancelled">Cancelled</option>
                </select>
              </div>
            </div>

            <hr className="border-gray-200 my-4" />

            {/* Dates & Reference Details */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div>
                <Input
                  label="Dispatch Date"
                  type="date"
                  name="dispatchDate"
                  value={formData.dispatchDate}
                  onChange={handleInputChange}
                />
              </div>
              <div>
                <Input
                  label="Delivery Date"
                  type="date"
                  name="deliveryDate"
                  value={formData.deliveryDate}
                  onChange={handleInputChange}
                />
              </div>
              <div>
                <Input
                  label="Driver Name"
                  name="driverName"
                  placeholder="Enter driver name"
                  value={formData.driverName}
                  onChange={handleInputChange}
                />
              </div>
              <div>
                <Input
                  label="Delivery Pad / Receipt Number (Mandatory for Verification)"
                  name="padNumber"
                  placeholder="e.g. PAD-9842"
                  value={formData.padNumber}
                  onChange={handleInputChange}
                />
              </div>
            </div>

            <hr className="border-gray-200 my-4" />

            {/* Volumes & Financial Rates */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
              <div>
                <Input
                  label="Loaded Volume (m³) *"
                  type="number"
                  step="0.01"
                  name="loadedVolume"
                  required
                  value={formData.loadedVolume}
                  onChange={handleInputChange}
                />
              </div>
              <div>
                <Input
                  label="Delivered Volume (m³)"
                  type="number"
                  step="0.01"
                  name="deliveredVolume"
                  placeholder="Optional until delivered"
                  value={formData.deliveredVolume}
                  onChange={handleInputChange}
                />
              </div>
              <div>
                <Input    
                  label="Transport Rate (ETB/m³) *"
                  type="number"
                  step="0.01"
                  name="transportRate"
                  required
                  value={formData.transportRate}
                  onChange={handleInputChange}
                />
              </div>
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-medium text-gray-700">Customer Value (ETB/m³) *</label>
                  <span className="text-[10px] text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded border border-blue-200 font-medium">
                    {formData.selectedCustomerAgreementId ? '✓ Synced from Sales Agr' : 'Per-Dispatch'}
                  </span>
                </div>
                <Input
                  type="number"
                  step="0.01"
                  name="customerPrice"
                  required
                  placeholder="Customer rate for this dispatch"
                  value={formData.customerPrice}
                  onChange={handleInputChange}
                />
              </div>
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-medium text-gray-700">Supplier Value (ETB/m³) *</label>
                  <span className="text-[10px] text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200 font-medium">
                    {formData.selectedSupplierAgreementId ? '✓ Synced from Supp Agr' : 'Per-Dispatch'}
                  </span>
                </div>
                <Input
                  type="number"
                  step="0.01"
                  name="aggregateValue"
                  required
                  placeholder="Supplier rate for this dispatch"
                  value={formData.aggregateValue}
                  onChange={handleInputChange}
                />
              </div>
            </div>

            {/* Live Financial Summary Box */}
            <div className="mt-6 bg-slate-50 border border-slate-200 rounded-xl p-5 space-y-4">
              <h3 className="text-xs font-semibold text-slate-700 uppercase tracking-wider">Live Financial Calculation Summary</h3>
              
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4 border-b border-slate-200 pb-4">
                <div className="bg-emerald-50 p-3 rounded-lg border border-emerald-200">
                  <span className="text-xs font-medium text-emerald-800 block mb-1">Customer Receivable:</span>
                  <span className="text-lg font-bold text-emerald-950">ETB {custReceivable.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
                  <span className="text-[11px] text-emerald-700 block mt-0.5">Loaded ({parseFloat(formData.loadedVolume || '0').toFixed(2)} m³) × {parseFloat(formData.customerPrice || '0').toFixed(2)} ETB</span>
                </div>
                <div className="bg-amber-50 p-3 rounded-lg border border-amber-200">
                  <span className="text-xs font-medium text-amber-800 block mb-1">Supplier Payable:</span>
                  <span className="text-lg font-bold text-amber-950">ETB {suppPayable.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
                  <span className="text-[11px] text-amber-700 block mt-0.5">Delivered × {parseFloat(formData.aggregateValue || '0').toFixed(2)} ETB</span>
                </div>
                <div className="bg-indigo-50 p-3 rounded-lg border border-indigo-200">
                  <span className="text-xs font-medium text-indigo-800 block mb-1">Net Profit Amount:</span>
                  <span className={`text-lg font-bold ${netProfitAmount >= 0 ? 'text-indigo-950' : 'text-red-600'}`}>
                    ETB {netProfitAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                  </span>
                  <span className="text-[11px] text-indigo-700 block mt-0.5">Receivable − Payable − Gross Truck Fee</span>
                </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs">
                <div>
                  <span className="text-slate-500 block">Gross Truck Fee:</span>
                  <span className="font-semibold text-slate-900 text-sm">ETB {grossFee.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
                  {truckCapacity > 0 && parseFloat(formData.loadedVolume) > truckCapacity && (
                    <span className="text-[10px] text-amber-600 block">(Capped: {truckCapacity} m³)</span>
                  )}
                </div>
                <div>
                  <span className="text-slate-500 block">Shortage Volume:</span>
                  <span className="font-semibold text-slate-900 text-sm">{shortageVolume.toFixed(2)} m³</span>
                </div>
                <div>
                  <span className="text-slate-500 block">Shortage Deduction:</span>
                  <span className="font-semibold text-red-600 text-sm">ETB {shortageDeduction.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
                </div>
                <div>
                  <span className="text-slate-500 block">Net Truck Payment:</span>
                  <span className="font-bold text-green-700 text-sm">ETB {netPayment.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
                </div>
              </div>
            </div>
          </CardBody>

          <CardFooter className="flex justify-between items-center border-t bg-slate-50 px-6 py-4">
            <Button
              type="button"
              variant="danger"
              onClick={() => setShowDeleteModal(true)}
              disabled={isSubmitting || isDeleting}
            >
              Delete Dispatch
            </Button>
            <div className="flex gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => router.push(`/dashboard/aggregate/${id}`)}
                disabled={isSubmitting || isDeleting}
              >
                Cancel
              </Button>
              <Button
                type="submit" 
                variant="primary"
                disabled={isSubmitting || isDeleting}
                isLoading={isSubmitting}
              >
                {isSubmitting ? 'Saving Changes...' : 'Save Changes'}
              </Button>
            </div>
          </CardFooter>
        </Card>
      </form>

      <ConfirmDialog
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        onConfirm={handleDelete}
        title="Delete Aggregate Dispatch"
        message={`Are you sure you want to permanently delete dispatch ${formData.dispatchNo}? This action cannot be undone.`}
        confirmText="Delete"
        cancelText="Cancel"
        isDangerous={true}
        isLoading={isDeleting}
      />
    </div>
  );
}
