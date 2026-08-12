'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { Card, CardHeader, CardBody, CardFooter, Button, Input, Select } from '@/components/ui';
import { ConfirmDialog } from '@/components/ui/Modal';

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
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [transporters, setTransporters] = useState<Transporter[]>([]);
  const [trucks, setTrucks] = useState<Truck[]>([]);
  const [items, setItems] = useState<Item[]>([]);
  const [filteredItems, setFilteredItems] = useState<Item[]>([]);

  // Map: customerId → Set of itemIds from their AGGREGATE sales agreements
  const [customerAgreementItems, setCustomerAgreementItems] = useState<Map<string, Set<string>>>(new Map());
  // Map: supplierId → Set of itemIds from their AGGREGATE supplier agreements
  const [supplierAgreementItems, setSupplierAgreementItems] = useState<Map<string, Set<string>>>(new Map());

  // Form state
  const [formData, setFormData] = useState({
    dispatchNo: '',
    customerId: '',
    supplierId: '',
    transporterId: '',
    truckId: '',
    itemId: '',
    driverName: '',
    padNumber: '',
    loadedVolume: '',
    deliveredVolume: '',
    transportRate: '',
    aggregateValue: '',
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

        // Populate customers list
        if (customersRes.ok) {
          const custData = await customersRes.json();
          setCustomers(custData.data || []);
        }

        // Populate suppliers list
        if (suppliersRes.ok) {
          const suppData = await suppliersRes.json();
          setSuppliers(suppData.data || []);
        }

        // Populate transporters and trucks
        if (transportersRes.ok) {
          const transData = await transportersRes.json();
          const allTransporters: Transporter[] = transData.data || [];
          setTransporters(allTransporters);

          const selTransporter = allTransporters.find((t) => t.id === delivery.transporterId);
          if (selTransporter?.trucks) {
            setTrucks(selTransporter.trucks);
          }
        }

        // Populate items database map
        const dbItemMap = new Map<string, Item>();
        if (itemsRes.ok) {
          const itemData = await itemsRes.json();
          (itemData.data || []).forEach((dbItem: any) => {
            dbItemMap.set(dbItem.id, {
              id: dbItem.id,
              name: dbItem.name || 'Unknown',
              code: dbItem.code || '',
              unit: dbItem.unit || 'm3',
            });
          });
        }

        // Parse customer agreement items (customerId -> Set of itemIds from Item table)
        const custItemsMap = new Map<string, Set<string>>();
        if (custAgreementsRes.ok) {
          const custAgrData = await custAgreementsRes.json();
          (custAgrData.data || []).forEach((agr: any) => {
            const custId = agr.customerId || agr.customer?.id;
            if (!custId) return;
            try {
              const agrItems = typeof agr.items === 'string' ? JSON.parse(agr.items) : (agr.items || []);
              agrItems.forEach((ai: any) => {
                // Strictly use ai.itemId (or ai.id if it matches a valid Item.id in dbItemMap)
                const targetItemId = ai.itemId || (ai.id && dbItemMap.has(ai.id) ? ai.id : null);
                if (targetItemId && dbItemMap.has(targetItemId)) {
                  if (!custItemsMap.has(custId)) {
                    custItemsMap.set(custId, new Set());
                  }
                  custItemsMap.get(custId)!.add(targetItemId);
                }
              });
            } catch { /* ignore */ }
          });
        }
        setCustomerAgreementItems(custItemsMap);

        // Parse supplier agreement items (supplierId -> Set of itemIds from Item table)
        const suppItemsMap = new Map<string, Set<string>>();
        if (suppAgreementsRes.ok) {
          const suppAgrData = await suppAgreementsRes.json();
          (suppAgrData.data || []).forEach((agr: any) => {
            const suppId = agr.supplierId || agr.supplier?.id;
            if (!suppId) return;
            try {
              const agrItems = typeof agr.items === 'string' ? JSON.parse(agr.items) : (agr.items || []);
              agrItems.forEach((ai: any) => {
                const targetItemId = ai.itemId || (ai.id && dbItemMap.has(ai.id) ? ai.id : null);
                if (targetItemId && dbItemMap.has(targetItemId)) {
                  if (!suppItemsMap.has(suppId)) {
                    suppItemsMap.set(suppId, new Set());
                  }
                  suppItemsMap.get(suppId)!.add(targetItemId);
                }
              });
            } catch { /* ignore */ }
          });
        }
        setSupplierAgreementItems(suppItemsMap);

        // Final items list strictly contains items from the Item database table
        const allItemsList = Array.from(dbItemMap.values());
        setItems(allItemsList);

        // Pre-fill form values
        setFormData({
          dispatchNo: delivery.dispatchNo || '',
          customerId: delivery.customerId || '',
          supplierId: delivery.supplierId || '',
          transporterId: delivery.transporterId || '',
          truckId: delivery.truckId || '',
          itemId: delivery.itemId || '',
          driverName: delivery.driverName || '',
          padNumber: delivery.padNumber || '',
          loadedVolume: delivery.loadedVolume != null ? String(delivery.loadedVolume) : '',
          deliveredVolume: delivery.deliveredVolume != null ? String(delivery.deliveredVolume) : '',
          transportRate: delivery.transportRate != null ? String(delivery.transportRate) : '',
          aggregateValue: delivery.aggregateValue != null ? String(delivery.aggregateValue) : '',
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

  // Dynamically filter items list based on selected customer & supplier
  useEffect(() => {
    let available = [...items];

    // Filter by customer's agreement items if customer is selected and has agreement items
    if (formData.customerId && customerAgreementItems.has(formData.customerId)) {
      const custItemIds = customerAgreementItems.get(formData.customerId)!;
      const filteredByCust = available.filter(
        (i) => custItemIds.has(i.id) || i.id === formData.itemId
      );
      if (filteredByCust.length > 0) {
        available = filteredByCust;
      }
    }

    // Intersect with supplier's agreement items if supplier is selected
    if (formData.supplierId && supplierAgreementItems.has(formData.supplierId)) {
      const suppItemIds = supplierAgreementItems.get(formData.supplierId)!;
      const filteredBySupp = available.filter(
        (i) => suppItemIds.has(i.id) || i.id === formData.itemId
      );
      if (filteredBySupp.length > 0) {
        available = filteredBySupp;
      }
    }

    setFilteredItems(available);
  }, [formData.customerId, formData.supplierId, formData.itemId, items, customerAgreementItems, supplierAgreementItems]);

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
      const newCustItemIds = customerAgreementItems.get(value);
      setFormData((prev) => {
        const isItemValid = !prev.itemId || !newCustItemIds || newCustItemIds.has(prev.itemId);
        return {
          ...prev,
          customerId: value,
          itemId: isItemValid ? prev.itemId : '',
        };
      });
    } else {
      setFormData((prev) => ({ ...prev, [name]: value }));
    }
  };

  // Calculations
  const calculateValues = () => {
    const loaded = parseFloat(formData.loadedVolume) || 0;
    const delivered = formData.deliveredVolume !== '' ? parseFloat(formData.deliveredVolume) : null;
    const rate = parseFloat(formData.transportRate) || 0;
    const aggValue = parseFloat(formData.aggregateValue) || 0;

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

    return {
      truckCapacity,
      billableVolume,
      grossFee,
      shortageVolume,
      shortageDeduction,
      netPayment,
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
          status: formData.status,
          dispatchDate: formData.dispatchDate ? new Date(formData.dispatchDate).toISOString() : undefined,
          deliveryDate: formData.deliveryDate ? new Date(formData.deliveryDate).toISOString() : null,
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        alert('Aggregate dispatch updated successfully!');
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

  const { truckCapacity, billableVolume, grossFee, shortageVolume, shortageDeduction, netPayment } = calculateValues();

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
          <p className="text-slate-600 mt-1">Update details for dispatch {formData.dispatchNo}</p>
        </div>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit}>
        <Card>
          <CardHeader>
            <h2 className="text-lg font-semibold text-slate-900">Dispatch Details</h2>
          </CardHeader>
          <CardBody className="space-y-6">
            {/* Core Entity Selectors */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Customer */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Customer *</label>
                <select
                  name="customerId"
                  required
                  value={formData.customerId}
                  onChange={handleInputChange}
                  className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 border px-3 py-2"
                >
                  <option value="">Select Customer</option>
                  {customers.map((c) => (
                    <option key={c.id || c.customerId} value={c.id || c.customerId}>
                      {c.companyName} {c.code ? `(${c.code})` : ''}
                    </option>
                  ))}
                </select>
              </div>

              {/* Supplier */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Supplier *</label>
                <select
                  name="supplierId"
                  required
                  value={formData.supplierId}
                  onChange={handleInputChange}
                  className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 border px-3 py-2"
                >
                  <option value="">Select Supplier</option>
                  {suppliers.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.companyName} {s.code ? `(${s.code})` : ''}
                    </option>
                  ))}
                </select>
              </div>

              {/* Transporter */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Transporter *</label>
                <select
                  name="transporterId"
                  required
                  value={formData.transporterId}
                  onChange={(e) => handleTransporterChange(e.target.value)}
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

              {/* Truck */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Truck *</label>
                <select
                  name="truckId"
                  required
                  value={formData.truckId}
                  onChange={handleInputChange}
                  disabled={!formData.transporterId || trucks.length === 0}
                  className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 border px-3 py-2 disabled:bg-gray-100"
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
                  {formData.customerId && customerAgreementItems.has(formData.customerId) && (
                    <span className="ml-2 text-xs font-normal text-blue-600 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                      Filtered by customer agreement ({filteredItems.length})
                    </span>
                  )}
                </label>
                <select
                  name="itemId"
                  required
                  value={formData.itemId}
                  onChange={handleInputChange}
                  className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 border px-3 py-2"
                >
                  <option value="">Select Item</option>
                  {filteredItems.map((i) => (
                    <option key={i.id} value={i.id}>
                      {i.name} ({i.unit})
                    </option>
                  ))}
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
                  className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 border px-3 py-2 font-medium"
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
                  label="Pad Number"
                  name="padNumber"
                  placeholder="Enter pad number"
                  value={formData.padNumber}
                  onChange={handleInputChange}
                />
              </div>
            </div>

            <hr className="border-gray-200 my-4" />

            {/* Volumes & Financial Rates */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
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
                <Input
                  label="Aggregate Value (ETB/m³) *"
                  type="number"
                  step="0.01"
                  name="aggregateValue"
                  required
                  value={formData.aggregateValue}
                  onChange={handleInputChange}
                />
              </div>
            </div>

            {/* Live Financial Summary Box */}
            <div className="mt-6 bg-slate-50 border border-slate-200 rounded-xl p-5 space-y-3">
              <h3 className="text-sm font-semibold text-slate-800 uppercase tracking-wide">Live Financial Calculation Summary</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div>
                  <span className="text-slate-500 block">Gross Truck Fee:</span>
                  <span className="font-semibold text-slate-900">ETB {grossFee.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
                  {truckCapacity > 0 && parseFloat(formData.loadedVolume) > truckCapacity && (
                    <span className="text-xs text-amber-600 block">(Capped at truck cap: {truckCapacity} m³)</span>
                  )}
                </div>
                <div>
                  <span className="text-slate-500 block">Shortage Volume:</span>
                  <span className="font-semibold text-slate-900">{shortageVolume.toFixed(2)} m³</span>
                </div>
                <div>
                  <span className="text-slate-500 block">Shortage Deduction:</span>
                  <span className="font-semibold text-red-600">ETB {shortageDeduction.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
                </div>
                <div>
                  <span className="text-slate-500 block">Net Payment:</span>
                  <span className="font-bold text-green-700 text-base">ETB {netPayment.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
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
