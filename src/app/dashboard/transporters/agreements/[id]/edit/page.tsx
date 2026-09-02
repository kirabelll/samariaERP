'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { Card, CardHeader, CardBody, CardFooter, Button, Input, Select } from '@/components/ui';

interface Transporter {
  id: string;
  companyName: string;
  code: string;
}

interface Supplier {
  id: string;
  companyName: string;
  code: string;
}

interface SupplierAgreement {
  id: string;
  agreementNo: string;
  loadingSite?: string;
  offloadingSite?: string;
}

interface Item {
  id: string;
  name: string;
  code: string;
  unit: string;
}

interface AgreementItemForm {
  id?: string;
  itemId: string;
  transportRate: string;
  aggregateValue: string;
}

export default function TransporterAgreementEditPage() {
  const router = useRouter();
  const params = useParams();
  const recordId = params?.id as string;

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Lookups
  const [transporters, setTransporters] = useState<Transporter[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [supplierAgreements, setSupplierAgreements] = useState<SupplierAgreement[]>([]);
  const [items, setItems] = useState<Item[]>([]);

  // Original data for status transition rules
  const [originalStatus, setOriginalStatus] = useState<string>('');

  // Form State
  const [formData, setFormData] = useState({
    agreementNo: '',
    transporterId: '',
    supplierId: '',
    supplierAgreementId: '',
    productType: 'Aggregate',
    loadingSite: '',
    offloadingSite: '',
    pricePerUnit: '',
    aggregateValue: '',
    unitType: 'm³',
    amount: '',
    loadSize: '',
    associationServiceCharge: '',
    associationChargeEnabled: false,
    validFrom: '',
    validTo: '',
    terms: '',
    status: 'Draft',
  });

  const [agreementItems, setAgreementItems] = useState<AgreementItemForm[]>([]);

  // 1. Fetch Lookups (Transporters, Suppliers, Items)
  useEffect(() => {
    fetch('/api/transporters?limit=1000')
      .then((res) => res.json())
      .then((res) => { if (res.success) setTransporters(res.data || []); })
      .catch(console.error);

    fetch('/api/suppliers?limit=1000')
      .then((res) => res.json())
      .then((res) => { if (res.success) setSuppliers(res.data || []); })
      .catch(console.error);

    fetch('/api/items?limit=1000')
      .then((res) => res.json())
      .then((res) => { if (res.success) setItems(res.data || []); })
      .catch(console.error);
  }, []);

  // 2. Fetch Agreement Details
  useEffect(() => {
    if (!recordId) return;

    const fetchAgreement = async () => {
      try {
        setLoading(true);
        const response = await fetch(`/api/transporters/agreements/${recordId}`);
        const result = await response.json();

        if (!response.ok || !result.success) {
          throw new Error(result.error || 'Failed to fetch agreement record');
        }

        const data = result.data;
        setOriginalStatus(data.status || 'Draft');

        setFormData({
          agreementNo: data.agreementNo || '',
          transporterId: data.transporterId || '',
          supplierId: data.supplierId || '',
          supplierAgreementId: data.supplierAgreementId || '',
          productType: data.productType || 'Aggregate',
          loadingSite: data.loadingSite || '',
          offloadingSite: data.offloadingSite || '',
          pricePerUnit: data.pricePerUnit !== null && data.pricePerUnit !== undefined ? String(data.pricePerUnit) : '',
          aggregateValue: data.aggregateValue !== null && data.aggregateValue !== undefined ? String(data.aggregateValue) : '',
          unitType: data.unitType || 'm³',
          amount: data.amount !== null && data.amount !== undefined ? String(data.amount) : '',
          loadSize: data.loadSize !== null && data.loadSize !== undefined ? String(data.loadSize) : '',
          associationServiceCharge: data.associationServiceCharge !== null && data.associationServiceCharge !== undefined ? String(data.associationServiceCharge) : '',
          associationChargeEnabled: Boolean(data.associationChargeEnabled),
          validFrom: data.validFrom ? new Date(data.validFrom).toISOString().split('T')[0] : '',
          validTo: data.validTo ? new Date(data.validTo).toISOString().split('T')[0] : '',
          terms: data.terms || '',
          status: data.status || 'Draft',
        });

        // Set agreement items
        if (data.agreementItems && Array.isArray(data.agreementItems)) {
          setAgreementItems(
            data.agreementItems.map((ai: any) => ({
              id: ai.id,
              itemId: ai.itemId || '',
              transportRate: ai.transportRate !== undefined ? String(ai.transportRate) : '0',
              aggregateValue: ai.aggregateValue !== undefined ? String(ai.aggregateValue) : '0',
            }))
          );
        }

        // Fetch supplier agreements if supplier exists
        if (data.supplierId) {
          fetchSupplierAgreements(data.supplierId);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred loading agreement');
      } finally {
        setLoading(false);
      }
    };

    fetchAgreement();
  }, [recordId]);

  const fetchSupplierAgreements = (suppId: string) => {
    if (!suppId) {
      setSupplierAgreements([]);
      return;
    }
    fetch(`/api/supplier-agreements?supplierId=${suppId}&limit=100`)
      .then((res) => res.json())
      .then((data) => {
        if (data.success) setSupplierAgreements(data.data || []);
      })
      .catch(console.error);
  };

  const handleSupplierChange = (suppId: string) => {
    setFormData((prev) => ({ ...prev, supplierId: suppId, supplierAgreementId: '' }));
    fetchSupplierAgreements(suppId);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    const checked = (e.target as HTMLInputElement).checked;

    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  // Item Breakdown Rows Handlers
  const handleAddItemRow = () => {
    setAgreementItems((prev) => [
      ...prev,
      { itemId: '', transportRate: '', aggregateValue: '' },
    ]);
  };

  const handleRemoveItemRow = (index: number) => {
    setAgreementItems((prev) => prev.filter((_, i) => i !== index));
  };

  const handleItemRowChange = (index: number, field: keyof AgreementItemForm, value: string) => {
    setAgreementItems((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    try {
      const payload = {
        transporterId: formData.transporterId,
        supplierId: formData.supplierId || null,
        supplierAgreementId: formData.supplierAgreementId || null,
        productType: formData.productType,
        loadingSite: formData.loadingSite || null,
        offloadingSite: formData.offloadingSite || null,
        pricePerUnit: formData.pricePerUnit ? parseFloat(formData.pricePerUnit) : null,
        aggregateValue: formData.aggregateValue ? parseFloat(formData.aggregateValue) : null,
        unitType: formData.unitType || 'm³',
        amount: formData.amount ? parseFloat(formData.amount) : null,
        loadSize: formData.loadSize ? parseFloat(formData.loadSize) : null,
        associationServiceCharge: formData.associationServiceCharge ? parseFloat(formData.associationServiceCharge) : 0,
        associationChargeEnabled: Boolean(formData.associationChargeEnabled),
        validFrom: formData.validFrom ? new Date(formData.validFrom).toISOString() : null,
        validTo: formData.validTo ? new Date(formData.validTo).toISOString() : null,
        terms: formData.terms || null,
        status: formData.status,
        agreementItems: agreementItems
          .filter((ai) => ai.itemId)
          .map((ai) => ({
            itemId: ai.itemId,
            transportRate: parseFloat(ai.transportRate) || 0,
            aggregateValue: parseFloat(ai.aggregateValue) || 0,
          })),
      };

      const response = await fetch(`/api/transporters/agreements/${recordId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Failed to update agreement');
      }

      alert('Agreement updated successfully!');
      router.push(`/dashboard/transporters/agreements/${recordId}`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to update agreement';
      setError(msg);
      alert(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const handleBack = () => {
    router.push(`/dashboard/transporters/agreements/${recordId}`);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="text-slate-600">Loading agreement...</p>
        </div>
      </div>
    );
  }

  if (error && !formData.agreementNo) {
    return (
      <div className="space-y-6">
        <Button variant="outline" onClick={handleBack}>
          ← Back
        </Button>
        <Card>
          <CardBody>
            <p className="text-red-600">{error || 'Agreement not found'}</p>
          </CardBody>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-12">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <button onClick={handleBack} className="text-sm text-blue-600 hover:text-blue-800 font-medium mb-1 inline-block">
            ← Back to Agreement Details
          </button>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">
            Edit Transporter Agreement ({formData.agreementNo})
          </h1>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Section 1: Transporter & Agreement Header */}
        <Card>
          <CardHeader>
            <h2 className="text-lg font-semibold text-slate-900">Agreement Information</h2>
          </CardHeader>
          <CardBody className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Agreement No</label>
                <Input
                  name="agreementNo"
                  value={formData.agreementNo}
                  disabled
                  className="bg-slate-100 font-semibold"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Transporter *</label>
                <Select
                  name="transporterId"
                  value={formData.transporterId}
                  onChange={handleInputChange}
                  required
                  options={[
                    { value: '', label: '-- Select Transporter --' },
                    ...transporters.map((t) => ({
                      value: t.id,
                      label: `${t.companyName} (${t.code})`,
                    })),
                  ]}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Product Type *</label>
                <Select
                  name="productType"
                  value={formData.productType}
                  onChange={handleInputChange}
                  required
                  options={[
                    { value: 'Aggregate', label: 'Aggregate' },
                    { value: 'Cement', label: 'Cement' },
                    { value: 'Rebar', label: 'Rebar' },
                    { value: 'Fuel', label: 'Fuel' },
                    { value: 'Chemicals', label: 'Chemicals' },
                    { value: 'Goods', label: 'Goods / General' },
                  ]}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Status *</label>
                <select
                  name="status"
                  value={formData.status}
                  onChange={handleInputChange}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900"
                >
                  <option value="Draft">Draft</option>
                  <option value="Active">Active</option>
                  <option value="Expired">Expired</option>
                  <option value="Cancelled">Cancelled</option>
                  <option value="Deactivated">Deactivated</option>
                </select>
                {formData.status === 'Deactivated' && (
                  <p className="text-xs text-amber-600 font-medium mt-1">
                    ⚠️ This agreement is currently Deactivated. Select "Active" to reactivate it.
                  </p>
                )}
              </div>
            </div>
          </CardBody>
        </Card>

        {/* Section 2: Linked Supplier */}
        <Card>
          <CardHeader>
            <h2 className="text-lg font-semibold text-slate-900">Linked Supplier (Optional)</h2>
          </CardHeader>
          <CardBody className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Supplier</label>
                <Select
                  name="supplierId"
                  value={formData.supplierId}
                  onChange={(e) => handleSupplierChange(e.target.value)}
                  options={[
                    { value: '', label: '-- None (Direct Transporter) --' },
                    ...suppliers.map((s) => ({
                      value: s.id,
                      label: `${s.companyName} (${s.code})`,
                    })),
                  ]}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Supplier Agreement</label>
                <Select
                  name="supplierAgreementId"
                  value={formData.supplierAgreementId}
                  onChange={handleInputChange}
                  disabled={!formData.supplierId}
                  options={[
                    { value: '', label: '-- None --' },
                    ...supplierAgreements.map((sa) => ({
                      value: sa.id,
                      label: sa.agreementNo,
                    })),
                  ]}
                />
              </div>
            </div>
          </CardBody>
        </Card>

        {/* Section 3: Route & Pricing */}
        <Card>
          <CardHeader>
            <h2 className="text-lg font-semibold text-slate-900">Route & General Rates</h2>
          </CardHeader>
          <CardBody className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Loading Site (Origin)</label>
                <Input
                  name="loadingSite"
                  value={formData.loadingSite}
                  onChange={handleInputChange}
                  placeholder="e.g. Quarry / Plant Site"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Offloading Site (Destination)</label>
                <Input
                  name="offloadingSite"
                  value={formData.offloadingSite}
                  onChange={handleInputChange}
                  placeholder="e.g. Project Site / Customer Location"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Transport Rate (ETB / Unit)</label>
                <Input
                  type="number"
                  step="0.01"
                  name="pricePerUnit"
                  value={formData.pricePerUnit}
                  onChange={handleInputChange}
                  placeholder="0.00"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Aggregate Material Value (ETB / Unit)</label>
                <Input
                  type="number"
                  step="0.01"
                  name="aggregateValue"
                  value={formData.aggregateValue}
                  onChange={handleInputChange}
                  placeholder="0.00"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Unit Type</label>
                <Select
                  name="unitType"
                  value={formData.unitType}
                  onChange={handleInputChange}
                  options={[
                    { value: 'm³', label: 'm³ (Cubic Meter)' },
                    { value: 'ton', label: 'Ton' },
                    { value: 'trip', label: 'Trip' },
                    { value: 'bag', label: 'Bag' },
                    { value: 'kg', label: 'Kg' },
                  ]}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Truck Capacity / Load Size (m³)</label>
                <Input
                  type="number"
                  step="0.01"
                  name="loadSize"
                  value={formData.loadSize}
                  onChange={handleInputChange}
                  placeholder="e.g. 15.00"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Association Service Charge (ETB)</label>
                <Input
                  type="number"
                  step="0.01"
                  name="associationServiceCharge"
                  value={formData.associationServiceCharge}
                  onChange={handleInputChange}
                  placeholder="0.00"
                />
              </div>

              <div className="flex items-center pt-6">
                <label className="flex items-center gap-2 cursor-pointer text-sm font-medium text-slate-700">
                  <input
                    type="checkbox"
                    name="associationChargeEnabled"
                    checked={formData.associationChargeEnabled}
                    onChange={handleInputChange}
                    className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500 border-slate-300"
                  />
                  Deduct Association Service Charge automatically
                </label>
              </div>
            </div>
          </CardBody>
        </Card>

        {/* Section 4: Material Specific Rates Breakdown */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-slate-900">Material Specific Rates</h2>
              <p className="text-xs text-slate-500">Configure item-specific transport rate and aggregate material value for this agreement.</p>
            </div>
            <Button type="button" variant="outline" size="sm" onClick={handleAddItemRow}>
              + Add Material Rate
            </Button>
          </CardHeader>
          <CardBody>
            {agreementItems.length === 0 ? (
              <p className="text-sm text-slate-500 italic py-2">No material-specific rates configured. General rates above will be used.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-slate-100 text-left text-slate-700 border-b">
                      <th className="p-3">Material Item</th>
                      <th className="p-3">Transport Rate (ETB/m³)</th>
                      <th className="p-3">Aggregate Value (ETB/m³)</th>
                      <th className="p-3 text-center">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {agreementItems.map((item, index) => (
                      <tr key={index} className="hover:bg-slate-50">
                        <td className="p-3">
                          <Select
                            value={item.itemId}
                            onChange={(e) => handleItemRowChange(index, 'itemId', e.target.value)}
                            options={[
                              { value: '', label: '-- Select Material Item --' },
                              ...items.map((i) => ({
                                value: i.id,
                                label: `${i.name} (${i.code})`,
                              })),
                            ]}
                          />
                        </td>
                        <td className="p-3">
                          <Input
                            type="number"
                            step="0.01"
                            value={item.transportRate}
                            onChange={(e) => handleItemRowChange(index, 'transportRate', e.target.value)}
                            placeholder="0.00"
                          />
                        </td>
                        <td className="p-3">
                          <Input
                            type="number"
                            step="0.01"
                            value={item.aggregateValue}
                            onChange={(e) => handleItemRowChange(index, 'aggregateValue', e.target.value)}
                            placeholder="0.00"
                          />
                        </td>
                        <td className="p-3 text-center">
                          <Button
                            type="button"
                            variant="danger"
                            size="sm"
                            onClick={() => handleRemoveItemRow(index)}
                          >
                            Remove
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardBody>
        </Card>

        {/* Section 5: Validity & Terms */}
        <Card>
          <CardHeader>
            <h2 className="text-lg font-semibold text-slate-900">Validity & Terms</h2>
          </CardHeader>
          <CardBody className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Valid From *</label>
                <Input
                  type="date"
                  name="validFrom"
                  value={formData.validFrom}
                  onChange={handleInputChange}
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Valid To *</label>
                <Input
                  type="date"
                  name="validTo"
                  value={formData.validTo}
                  onChange={handleInputChange}
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Agreement Terms & Conditions</label>
              <textarea
                name="terms"
                rows={4}
                value={formData.terms}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900"
                placeholder="Enter specific payment terms, penalties, or conditions..."
              />
            </div>
          </CardBody>

          <CardFooter className="flex justify-between items-center bg-slate-50 border-t border-slate-200 px-6 py-4">
            <Button type="button" variant="outline" onClick={handleBack} disabled={submitting}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" disabled={submitting}>
              {submitting ? 'Saving Changes...' : 'Save Agreement Changes'}
            </Button>
          </CardFooter>
        </Card>
      </form>
    </div>
  );
}
