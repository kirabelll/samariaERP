'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardHeader, CardBody, CardFooter, Button, Input, Select } from '@/components/ui';
import { formatNumberInput, parseFormattedNumber } from '@/lib/utils';

interface DeliverySite {
  site: string;
  pricePerUnit: string;
}

interface AgreementDetails {
  loadingSite: string;
  offloadingSite: string;
  pricePerUnit: string;
  aggregateValue: string;
  unitType: string;
  amount: string;
  loadSize: string;
  associationServiceCharge: string;
  associationChargeEnabled: boolean;
}

interface Transporter {
  id: string;
  companyName: string;
  code: string;
  phone?: string;
  email?: string;
  driverName?: string;
  association?: { id: string; name: string };
  trucks?: Array<{ id: string; plateNo: string; truckType?: string }>;
}

interface SupplierAgreement {
  id: string;
  agreementNo: string;
  supplierId: string;
  supplier?: { companyName: string; code: string };
  items: string;
  totalAmount: number;
  validFrom: string;
  validTo: string;
  status: string;
  loadingSite?: string;
  offloadingSite?: string;
}

interface FormErrors {
  [key: string]: string;
}

export default function NewTransporterAgreementPage() {
  const router = useRouter();
  const [transporters, setTransporters] = useState<Transporter[]>([]);
  const [transporterId, setTransporterId] = useState('');
  const [selectedTransporter, setSelectedTransporter] = useState<Transporter | null>(null);
  const [productType, setProductType] = useState('');
  const [validFrom, setValidFrom] = useState('');
  const [validTo, setValidTo] = useState('');
  const [terms, setTerms] = useState('');

  // Supplier Agreement linking
  const [suppliers, setSuppliers] = useState<Array<{ id: string; companyName: string; code: string }>>([]);
  const [supplierId, setSupplierId] = useState('');
  const [supplierAgreements, setSupplierAgreements] = useState<SupplierAgreement[]>([]);
  const [selectedSupplierAgreementId, setSelectedSupplierAgreementId] = useState('');

  // Customer Agreement linking (for offloading site)
  const [customers, setCustomers] = useState<Array<{ id: string; companyName: string }>>([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState('');
  const [customerAgreements, setCustomerAgreements] = useState<Array<{ id: string; agreementNo: string; offloadingSite: string; customerName: string; status: string; validFrom: string; validTo: string }>>([]);
  const [selectedCustomerAgreementId, setSelectedCustomerAgreementId] = useState('');

  const [agreementDetails, setAgreementDetails] = useState<AgreementDetails>({
    loadingSite: '',
    offloadingSite: '',
    pricePerUnit: '',
    aggregateValue: '',
    unitType: 'm³',
    amount: '',
    loadSize: '',
    associationServiceCharge: '',
    associationChargeEnabled: false,
  });

  // Multiple delivery sites with different pricing
  const [deliverySites, setDeliverySites] = useState<DeliverySite[]>([]);

  const [errors, setErrors] = useState<FormErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Fetch transporters and suppliers on mount
  useEffect(() => {
    fetch('/api/transporters?limit=1000')
      .then((res) => res.json())
      .then((data) => {
        if (data.success) setTransporters(data.data);
      })
      .catch(console.error);

    fetch('/api/suppliers?limit=1000')
      .then((res) => res.json())
      .then((data) => {
        if (data.success) setSuppliers(data.data);
      })
      .catch(console.error);

    // Fetch active customers for offloading site selection
    fetch('/api/customers?status=Active&limit=1000')
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          const list = (data.data || []).sort((a: any, b: any) =>
            (a.companyName || '').localeCompare(b.companyName || '')
          );
          setCustomers(list);
        }
      })
      .catch(console.error);
  }, []);

  // When customer changes, fetch their sales agreements
  useEffect(() => {
    if (!selectedCustomerId) {
      setCustomerAgreements([]);
      setSelectedCustomerAgreementId('');
      return;
    }
    fetch(`/api/sales/agreements?customerId=${selectedCustomerId}&limit=50`)
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          setCustomerAgreements(
            (data.data || []).map((a: any) => ({
              id: a.id,
              agreementNo: a.agreementNo,
              offloadingSite: a.offloadingSite || '',
              customerName: a.customer?.companyName || '',
              status: a.status,
              validFrom: a.validFrom,
              validTo: a.validTo,
            }))
          );
        }
      })
      .catch(console.error);
  }, [selectedCustomerId]);

  // Parse offloading sites from selected customer agreement (pipe-separated)
  const customerOffloadingSites: string[] = (() => {
    if (!selectedCustomerAgreementId) return [];
    const ca = customerAgreements.find((a) => a.id === selectedCustomerAgreementId);
    if (!ca?.offloadingSite) return [];
    return ca.offloadingSite.split(' | ').map(s => s.trim()).filter(Boolean);
  })();

  // When customer agreement is selected with only one site, auto-populate
  useEffect(() => {
    if (!selectedCustomerAgreementId) return;
    const ca = customerAgreements.find((a) => a.id === selectedCustomerAgreementId);
    if (ca?.offloadingSite) {
      const sites = ca.offloadingSite.split(' | ').map(s => s.trim()).filter(Boolean);
      if (sites.length === 1) {
        setAgreementDetails((prev) => ({ ...prev, offloadingSite: sites[0] }));
      } else {
        // Multiple sites — clear so user picks from dropdown
        setAgreementDetails((prev) => ({ ...prev, offloadingSite: '' }));
      }
    }
  }, [selectedCustomerAgreementId]);

  // When supplier changes, fetch their agreements (all non-void)
  useEffect(() => {
    if (!supplierId) {
      setSupplierAgreements([]);
      setSelectedSupplierAgreementId('');
      return;
    }

    fetch(`/api/supplier-agreements?supplierId=${supplierId}&limit=100`)
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          setSupplierAgreements(data.data || []);
        }
      })
      .catch(console.error);
  }, [supplierId]);

  // When supplier agreement is selected, auto-populate loading and offloading sites
  useEffect(() => {
    if (!selectedSupplierAgreementId) return;

    const sa = supplierAgreements.find((a) => a.id === selectedSupplierAgreementId);
    if (sa) {
      const updates: Partial<AgreementDetails> = {};

      // Use the supplier agreement's loading site, fall back to supplier name
      if (sa.loadingSite) {
        updates.loadingSite = sa.loadingSite;
      } else if (sa.supplier?.companyName && !agreementDetails.loadingSite) {
        updates.loadingSite = sa.supplier.companyName;
      }

      // Use the supplier agreement's offloading site
      if (sa.offloadingSite && !agreementDetails.offloadingSite) {
        updates.offloadingSite = sa.offloadingSite;
      }

      if (Object.keys(updates).length > 0) {
        setAgreementDetails((prev) => ({ ...prev, ...updates }));
      }
    }
  }, [selectedSupplierAgreementId]);

  const handleTransporterChange = (value: string) => {
    setTransporterId(value);
    const transporter = transporters.find((t) => t.id === value) || null;
    setSelectedTransporter(transporter);
  };

  const handleDetailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setAgreementDetails((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  // Delivery sites management
  const addDeliverySite = () => {
    setDeliverySites([...deliverySites, { site: '', pricePerUnit: '' }]);
  };

  const removeDeliverySite = (index: number) => {
    setDeliverySites(deliverySites.filter((_, i) => i !== index));
  };

  const handleDeliverySiteChange = (index: number, field: keyof DeliverySite, value: string) => {
    const updated = [...deliverySites];
    updated[index][field] = value;
    setDeliverySites(updated);
  };

  const handleProductTypeChange = (value: string) => {
    setProductType(value);
  };

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};
    if (!transporterId) newErrors.transporterId = 'Select a transporter';
    if (!productType) newErrors.productType = 'Select a product type';
    if (!validFrom) newErrors.validFrom = 'Start date is required';
    if (!validTo) newErrors.validTo = 'End date is required';
    if (validFrom && validTo && new Date(validFrom) >= new Date(validTo)) {
      newErrors.validTo = 'End date must be after start date';
    }
    if (!agreementDetails.loadingSite.trim()) {
      newErrors.loadingSite = 'Loading site is required';
    }
    if (!agreementDetails.offloadingSite.trim() && deliverySites.length === 0) {
      newErrors.offloadingSite = 'At least one offloading site is required';
    }
    if (!agreementDetails.pricePerUnit) {
      newErrors.pricePerUnit = 'Transport rate (price per unit) is required';
    }

    // Validate delivery sites
    deliverySites.forEach((ds, i) => {
      if (!ds.site.trim()) newErrors[`deliverySite_${i}`] = 'Site name is required';
      if (!ds.pricePerUnit) newErrors[`deliveryPrice_${i}`] = 'Price is required';
    });

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    setIsSubmitting(true);
    try {
      const payload = {
        transporterId,
        supplierId: supplierId || null,
        supplierAgreementId: selectedSupplierAgreementId || null,
        productType,
        validFrom,
        validTo,
        terms: terms || null,
        loadingSite: agreementDetails.loadingSite || null,
        offloadingSite: agreementDetails.offloadingSite || null,
        deliverySites: deliverySites.length > 0
          ? deliverySites.map((ds) => ({
              site: ds.site,
              pricePerUnit: parseFormattedNumber(ds.pricePerUnit) || 0,
            }))
          : null,
        pricePerUnit: agreementDetails.pricePerUnit ? parseFormattedNumber(agreementDetails.pricePerUnit) : null,
        aggregateValue: agreementDetails.aggregateValue ? parseFormattedNumber(agreementDetails.aggregateValue) : null,
        unitType: agreementDetails.unitType || null,
        amount: agreementDetails.amount ? parseFormattedNumber(agreementDetails.amount) : null,
        loadSize: agreementDetails.loadSize ? parseFormattedNumber(agreementDetails.loadSize) : null,
        associationServiceCharge: agreementDetails.associationChargeEnabled && agreementDetails.associationServiceCharge
          ? parseFormattedNumber(agreementDetails.associationServiceCharge)
          : 0,
        associationChargeEnabled: agreementDetails.associationChargeEnabled,
      };

      const res = await fetch('/api/transporters/agreements', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error || 'Failed to create agreement');
      alert('Transport agreement created successfully!');
      router.push('/dashboard/transporters/agreements');
    } catch (error: any) {
      console.error('Error:', error);
      setErrors({ submit: error.message || 'Failed to create agreement' });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex items-center gap-2 text-sm text-slate-600">
        <button onClick={() => router.push('/dashboard/transporters/agreements')} className="text-blue-600 hover:text-blue-700 font-medium">
          Transport Agreements
        </button>
        <span>/</span>
        <span className="text-slate-900 font-medium">New Agreement</span>
      </div>

      <div>
        <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-slate-900">Create Transport Agreement</h1>
        <p className="text-slate-600 mt-2">Set up transport agreement with route details and pricing</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-6">
        {/* Transporter Selection */}
        <Card>
          <CardHeader>
            <h2 className="text-lg sm:text-xl font-bold text-slate-900">Select Transporter</h2>
          </CardHeader>
          <CardBody className="space-y-6">
            <Select
              label="Transporter"
              name="transporterId"
              value={transporterId}
              onChange={(e) => handleTransporterChange(e.target.value)}
              options={[
                { value: '', label: 'Select a transporter' },
                ...transporters.map((t) => ({
                  value: t.id,
                  label: `${t.code} - ${t.companyName}`,
                })),
              ]}
              error={errors.transporterId}
              required
            />
          </CardBody>
        </Card>

        {/* Auto-Pulled Transporter Information */}
        {selectedTransporter && (
          <Card>
            <CardHeader>
              <h2 className="text-lg sm:text-xl font-bold text-slate-900">Transporter Information</h2>
            </CardHeader>
            <CardBody className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <p className="text-sm text-slate-600 mb-1">Company Name</p>
                  <p className="text-slate-900 font-medium">{selectedTransporter.companyName}</p>
                </div>
                <div>
                  <p className="text-sm text-slate-600 mb-1">Code</p>
                  <p className="text-slate-900 font-medium">{selectedTransporter.code}</p>
                </div>
                <div>
                  <p className="text-sm text-slate-600 mb-1">Phone</p>
                  <p className="text-slate-900 font-medium">{selectedTransporter.phone || '-'}</p>
                </div>
                <div>
                  <p className="text-sm text-slate-600 mb-1">Email</p>
                  <p className="text-slate-900 font-medium">{selectedTransporter.email || '-'}</p>
                </div>
                {selectedTransporter.association && (
                  <div>
                    <p className="text-sm text-slate-600 mb-1">Association</p>
                    <p className="text-slate-900 font-medium">{selectedTransporter.association.name}</p>
                  </div>
                )}
                <div>
                  <p className="text-sm text-slate-600 mb-1">Driver Name</p>
                  <p className="text-slate-900 font-medium">{selectedTransporter.driverName || '-'}</p>
                </div>
              </div>

              {selectedTransporter.trucks && selectedTransporter.trucks.length > 0 && (
                <div>
                  <p className="text-sm text-slate-600 mb-3">Available Trucks</p>
                  <div className="flex flex-wrap gap-2">
                    {selectedTransporter.trucks.map((truck) => (
                      <span
                        key={truck.id}
                        className="px-3 py-1 bg-blue-100 text-blue-700 rounded text-sm font-medium"
                      >
                        {truck.plateNo} {truck.truckType ? `(${truck.truckType})` : ''}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </CardBody>
          </Card>
        )}

        {/* Agreement Details */}
        <Card>
          <CardHeader>
            <h2 className="text-lg sm:text-xl font-bold text-slate-900">Agreement Details</h2>
          </CardHeader>
          <CardBody className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Select
                label="Product Type"
                name="productType"
                value={productType}
                onChange={(e) => handleProductTypeChange(e.target.value)}
                options={[
                  { value: '', label: 'Select product type' },
                  { value: 'aggregate', label: 'Aggregate' },
                  { value: 'cement', label: 'Cement' },
                  { value: 'sand', label: 'Sand' },
                ]}
                error={errors.productType}
                required
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="text-sm font-medium text-slate-900 mb-2 block">Valid From</label>
                <input
                  type="date"
                  value={validFrom}
                  onChange={(e) => setValidFrom(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:border-blue-500"
                  required
                />
                {errors.validFrom && <p className="text-red-600 text-sm mt-1">{errors.validFrom}</p>}
              </div>
              <div>
                <label className="text-sm font-medium text-slate-900 mb-2 block">Valid To</label>
                <input
                  type="date"
                  value={validTo}
                  onChange={(e) => setValidTo(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:border-blue-500"
                  required
                />
                {errors.validTo && <p className="text-red-600 text-sm mt-1">{errors.validTo}</p>}
              </div>
            </div>

            <div>
              <label className="text-sm font-medium text-slate-900 mb-2 block">Terms</label>
              <textarea
                value={terms}
                onChange={(e) => setTerms(e.target.value)}
                placeholder="Enter any special terms or conditions"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:border-blue-500"
                rows={3}
              />
            </div>
          </CardBody>
        </Card>

        {/* Supplier & Supplier Agreement Selection (Loading Site) */}
        <Card>
          <CardHeader>
            <h2 className="text-lg sm:text-xl font-bold text-slate-900">Supplier & Source (Loading Site)</h2>
            <p className="text-sm text-slate-600 mt-1">
              Select the supplier this transporter picks up from. Loading site auto-populates from supplier agreement.
            </p>
          </CardHeader>
          <CardBody className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Supplier</label>
                <select
                  value={supplierId}
                  onChange={(e) => {
                    setSupplierId(e.target.value);
                    setSelectedSupplierAgreementId('');
                  }}
                  className="block w-full rounded-md border-slate-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 border px-3 py-2"
                >
                  <option value="">Select Supplier (Optional)</option>
                  {suppliers.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.companyName} ({s.code})
                    </option>
                  ))}
                </select>
              </div>

              {supplierId && (
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Supplier Agreement</label>
                  {supplierAgreements.length > 0 ? (
                    <>
                      <select
                        value={selectedSupplierAgreementId}
                        onChange={(e) => setSelectedSupplierAgreementId(e.target.value)}
                        className="block w-full rounded-md border-slate-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 border px-3 py-2"
                      >
                        <option value="">Select Agreement (Optional)</option>
                        {supplierAgreements.map((sa) => (
                          <option key={sa.id} value={sa.id}>
                            {sa.agreementNo} — {sa.status} (Valid: {new Date(sa.validFrom).toLocaleDateString()} - {new Date(sa.validTo).toLocaleDateString()})
                          </option>
                        ))}
                      </select>
                      <p className="text-xs text-slate-500 mt-1">Auto-populates loading site</p>
                    </>
                  ) : (
                    <p className="text-sm text-amber-600 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                      No supplier agreements found for this supplier.
                    </p>
                  )}
                </div>
              )}
            </div>
          </CardBody>
        </Card>

        {/* Customer Agreement Selection (Offloading Site) */}
        <Card>
          <CardHeader>
            <h2 className="text-lg sm:text-xl font-bold text-slate-900">Customer & Destination (Offloading Site)</h2>
            <p className="text-sm text-slate-600 mt-1">
              Select the customer and their agreement. The offloading site auto-populates from the customer&apos;s sales agreement.
            </p>
          </CardHeader>
          <CardBody className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Customer</label>
                <select
                  value={selectedCustomerId}
                  onChange={(e) => {
                    setSelectedCustomerId(e.target.value);
                    setSelectedCustomerAgreementId('');
                  }}
                  className="block w-full rounded-md border-slate-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 border px-3 py-2"
                >
                  <option value="">Select Customer</option>
                  {customers.map((c) => (
                    <option key={c.id} value={c.id}>{c.companyName}</option>
                  ))}
                </select>
              </div>

              {selectedCustomerId && (
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Customer Agreement</label>
                  {customerAgreements.length > 0 ? (
                    <>
                      <select
                        value={selectedCustomerAgreementId}
                        onChange={(e) => setSelectedCustomerAgreementId(e.target.value)}
                        className="block w-full rounded-md border-slate-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 border px-3 py-2"
                      >
                        <option value="">Select Agreement</option>
                        {customerAgreements.map((ca) => (
                          <option key={ca.id} value={ca.id}>
                            {ca.agreementNo} — {ca.status} (Valid: {new Date(ca.validFrom).toLocaleDateString()} - {new Date(ca.validTo).toLocaleDateString()})
                          </option>
                        ))}
                      </select>
                      <p className="text-xs text-slate-500 mt-1">Auto-populates offloading site from customer agreement</p>
                    </>
                  ) : (
                    <p className="text-sm text-amber-600 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                      No sales agreements found for this customer. Create one in Sales Agreements first.
                    </p>
                  )}
                </div>
              )}
            </div>

            {selectedCustomerAgreementId && agreementDetails.offloadingSite && (
              <div className="bg-green-50 border border-green-200 rounded-lg px-4 py-3 text-sm text-green-800">
                <strong>Offloading Site:</strong> {agreementDetails.offloadingSite} (from customer agreement)
              </div>
            )}
          </CardBody>
        </Card>

        {/* Routes & Delivery Sites */}
        <Card>
          <CardHeader>
            <h2 className="text-lg sm:text-xl font-bold text-slate-900">Routes & Delivery Sites</h2>
            <p className="text-sm text-slate-600 mt-1">
              Set the primary loading and offloading sites. Add additional delivery sites with different pricing if needed.
            </p>
          </CardHeader>
          <CardBody className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <Input
                  label="Loading Site (Origin)"
                  name="loadingSite"
                  value={agreementDetails.loadingSite}
                  onChange={handleDetailChange}
                  placeholder="e.g., Addis Ababa Quarry"
                  error={errors.loadingSite}
                  required
                />
                {selectedSupplierAgreementId && (
                  <p className="text-xs text-green-600 mt-1">Auto-populated from supplier agreement (editable)</p>
                )}
              </div>
              <div>
                <label className="text-sm font-medium text-slate-900 mb-2 block">
                  Primary Offloading Site (Destination)
                </label>
                {customerOffloadingSites.length > 1 ? (
                  <select
                    value={agreementDetails.offloadingSite}
                    onChange={(e) => setAgreementDetails({ ...agreementDetails, offloadingSite: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:border-blue-500"
                  >
                    <option value="">Select offloading site</option>
                    {customerOffloadingSites.map((site, i) => (
                      <option key={i} value={site}>{site}</option>
                    ))}
                  </select>
                ) : (
                  <Input
                    name="offloadingSite"
                    value={agreementDetails.offloadingSite}
                    onChange={handleDetailChange}
                    placeholder={selectedCustomerAgreementId ? 'Auto-populated from customer agreement' : 'Select a customer agreement above'}
                    error={errors.offloadingSite}
                  />
                )}
                {customerOffloadingSites.length > 1 && (
                  <p className="text-xs text-blue-600 mt-1">{customerOffloadingSites.length} offloading sites available from customer agreement</p>
                )}
                {customerOffloadingSites.length === 1 && agreementDetails.offloadingSite && (
                  <p className="text-xs text-green-600 mt-1">Auto-populated from customer agreement (editable)</p>
                )}
                {!selectedCustomerAgreementId && (
                  <p className="text-xs text-slate-500 mt-1">Select a customer and their agreement above to populate this</p>
                )}
              </div>
            </div>

            {/* Primary pricing */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Input
                label="Transport Rate (Price Per Unit)"
                name="pricePerUnit"
                type="number"
                value={agreementDetails.pricePerUnit}
                onChange={handleDetailChange}
                placeholder="e.g., 150 ETB"
                step="0.01"
                error={errors.pricePerUnit}
                required
              />
              <Select
                label="Unit Type"
                name="unitType"
                value={agreementDetails.unitType}
                onChange={(e) => setAgreementDetails({ ...agreementDetails, unitType: e.target.value })}
                options={[
                  { value: 'm³', label: 'm³' },
                  { value: 'kg', label: 'kg' },
                  { value: 'ton', label: 'ton' },
                  { value: 'trip', label: 'trip' },
                  { value: 'quintal', label: 'Quintal' },
                ]}
              />
              <Input
                label="Load Size"
                name="loadSize"
                type="number"
                value={agreementDetails.loadSize}
                onChange={handleDetailChange}
                placeholder="e.g., 10"
                step="0.01"
              />
            </div>

            {/* Additional Delivery Sites */}
            <div className="border-t border-slate-200 pt-6">
              <div className="flex justify-between items-center mb-4">
                <div>
                  <h3 className="text-sm font-semibold text-slate-900">Additional Delivery Sites</h3>
                  <p className="text-xs text-slate-500 mt-1">Add more destinations with different transport rates</p>
                </div>
                <Button type="button" variant="outline" size="sm" onClick={addDeliverySite}>
                  + Add Delivery Site
                </Button>
              </div>

              {deliverySites.length > 0 && (
                <div className="space-y-3">
                  {deliverySites.map((ds, index) => (
                    <div key={index} className="flex gap-4 items-end border border-slate-200 rounded-lg p-4">
                      <div className="flex-1">
                        <label className="text-sm font-medium text-slate-700 mb-1 block">Delivery Site</label>
                        <input
                          type="text"
                          value={ds.site}
                          onChange={(e) => handleDeliverySiteChange(index, 'site', e.target.value)}
                          placeholder="e.g., Warehouse, Megenagna"
                          className="w-full rounded-md border-slate-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 border px-3 py-2 text-sm"
                        />
                        {errors[`deliverySite_${index}`] && (
                          <p className="text-red-600 text-xs mt-1">{errors[`deliverySite_${index}`]}</p>
                        )}
                      </div>
                      <div className="w-48">
                        <label className="text-sm font-medium text-slate-700 mb-1 block">Price Per Unit (ETB)</label>
                        <input
                          type="number"
                          step="0.01"
                          value={ds.pricePerUnit}
                          onChange={(e) => handleDeliverySiteChange(index, 'pricePerUnit', e.target.value)}
                          placeholder="0"
                          className="w-full rounded-md border-slate-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 border px-3 py-2 text-sm"
                        />
                        {errors[`deliveryPrice_${index}`] && (
                          <p className="text-red-600 text-xs mt-1">{errors[`deliveryPrice_${index}`]}</p>
                        )}
                      </div>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => removeDeliverySite(index)}
                        className="text-red-600 border-red-300 hover:bg-red-50 mb-0.5"
                      >
                        Remove
                      </Button>
                    </div>
                  ))}
                </div>
              )}

              {deliverySites.length === 0 && (
                <p className="text-sm text-slate-500 italic">
                  No additional delivery sites. The primary offloading site above will be used.
                </p>
              )}
            </div>
          </CardBody>
        </Card>

        {/* Financial Details */}
        <Card>
          <CardHeader>
            <h2 className="text-lg sm:text-xl font-bold text-slate-900">Financial Details</h2>
          </CardHeader>
          <CardBody className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Input
                label="Total Agreement Amount (ETB)"
                name="amount"
                type="number"
                value={agreementDetails.amount}
                onChange={handleDetailChange}
                placeholder="e.g., 500,000"
                step="0.01"
              />
              <Input
                label="Default Aggregate Value per m³ (for shortage calc)"
                name="aggregateValue"
                type="number"
                value={agreementDetails.aggregateValue}
                onChange={handleDetailChange}
                placeholder="e.g., 500"
                step="0.01"
              />
            </div>

            {/* Association Service Charge - Percentage Based & Optional */}
            <div className="border-t border-slate-200 pt-6">
              <div className="flex items-center gap-3 mb-4">
                <input
                  type="checkbox"
                  id="associationChargeEnabled"
                  checked={agreementDetails.associationChargeEnabled}
                  onChange={(e) =>
                    setAgreementDetails((prev) => ({
                      ...prev,
                      associationChargeEnabled: e.target.checked,
                      associationServiceCharge: e.target.checked ? prev.associationServiceCharge : '',
                    }))
                  }
                  className="w-4 h-4 text-blue-600 border-slate-300 rounded focus:ring-blue-500"
                />
                <label htmlFor="associationChargeEnabled" className="text-sm font-medium text-slate-900">
                  Enable Association Service Charge
                </label>
              </div>

              {agreementDetails.associationChargeEnabled && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="text-sm font-medium text-slate-900 mb-2 block">
                      Association Charge Rate (%)
                    </label>
                    <div className="relative">
                      <input
                        type="number"
                        name="associationServiceCharge"
                        value={agreementDetails.associationServiceCharge}
                        onChange={handleDetailChange}
                        placeholder="e.g., 5"
                        step="0.01"
                        min="0"
                        max="100"
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:border-blue-500 pr-10"
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 font-medium">%</span>
                    </div>
                    <p className="text-xs text-slate-500 mt-1">
                      Percentage applied on total delivered quantity value
                    </p>
                  </div>
                  {agreementDetails.associationServiceCharge && agreementDetails.pricePerUnit && (
                    <div className="flex items-end">
                      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 w-full">
                        <p className="text-xs text-blue-600 font-medium uppercase mb-1">Example Calculation</p>
                        <p className="text-sm text-blue-900">
                          For 10 m³ at {agreementDetails.pricePerUnit} ETB/m³:
                          <br />
                          Gross = {(10 * parseFloat(agreementDetails.pricePerUnit || '0')).toLocaleString('en-US')} ETB
                          <br />
                          Association Charge ({agreementDetails.associationServiceCharge}%) = {((10 * parseFloat(agreementDetails.pricePerUnit || '0') * parseFloat(agreementDetails.associationServiceCharge || '0')) / 100).toLocaleString('en-US')} ETB
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </CardBody>
        </Card>

        {/* Submit Button */}
        <Card>
          <CardFooter>
            <div className="flex gap-4 w-full">
              <Button
                type="submit"
                variant="primary"
                size="lg"
                isLoading={isSubmitting}
              >
                Create Agreement
              </Button>
              <Button
                type="button"
                variant="outline"
                size="lg"
                onClick={() => router.push('/dashboard/transporters/agreements')}
              >
                Cancel
              </Button>
            </div>
          </CardFooter>
        </Card>

        {errors.submit && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">
            {errors.submit}
          </div>
        )}
      </form>
    </div>
  );
}
