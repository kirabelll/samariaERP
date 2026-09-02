'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { Card, CardHeader, CardBody, CardFooter, Button, Input } from '@/components/ui';
import { ConfirmDialog } from '@/components/ui/Modal';

interface Customer { id: string; companyName: string; }
interface Item { id: string; code: string; name: string; unit: string; }
interface AgreementItemRow { id: number; itemId: string; qty: string; unit: string; unitPrice: string; priceType: 'excl' | 'incl'; }

export default function SalesAgreementEditPage() {
  const router = useRouter();
  const params = useParams();
  const recordId = params?.id as string;

  const [customers, setCustomers] = useState<Customer[]>([]);
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [agreementNo, setAgreementNo] = useState('');
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const handleDelete = async () => {
    setDeleting(true);
    try {
      const response = await fetch(`/api/sales/agreements/${recordId}?permanent=true`, {
        method: 'DELETE',
      });
      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Failed to delete agreement');
      }

      alert('Sales Agreement deleted successfully!');
      router.push('/dashboard/sales/agreements');
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to delete agreement');
    } finally {
      setDeleting(false);
      setShowDeleteModal(false);
    }
  };

  const [formData, setFormData] = useState({
    customerId: '',
    division: 'CONSTRUCTION',
    status: '',
    validFrom: '',
    validTo: '',
    terms: '',
  });

  const [offloadingSites, setOffloadingSites] = useState<string[]>(['']);

  const [agreementItems, setAgreementItems] = useState<AgreementItemRow[]>([
    { id: 1, itemId: '', qty: '', unit: '', unitPrice: '', priceType: 'excl' },
  ]);

  useEffect(() => {
    const fetchAll = async () => {
      try {
        const [recRes, custRes, itemRes] = await Promise.all([
          fetch(`/api/sales/agreements/${recordId}`),
          fetch('/api/customers'),
          fetch('/api/items?limit=1000'),
        ]);
        const recJson = await recRes.json();
        const custJson = await custRes.json();
        const itemJson = await itemRes.json();

        if (custJson.success) setCustomers(custJson.data || []);
        if (itemJson.success) setItems(itemJson.data || []);

        if (recJson.success && recJson.data) {
          const d = recJson.data;
          setAgreementNo(d.agreementNo || '');
          setFormData({
            customerId: d.customerId || '',
            division: d.division || 'CONSTRUCTION',
            status: d.status || 'Draft',
            validFrom: d.validFrom?.split('T')[0] || '',
            validTo: d.validTo?.split('T')[0] || '',
            terms: d.terms || '',
          });

          // Parse pipe-separated offloading sites
          if (d.offloadingSite) {
            setOffloadingSites(d.offloadingSite.split(' | ').map((s: string) => s.trim()).filter(Boolean));
          }

          // Parse items
          try {
            const parsed = typeof d.items === 'string' ? JSON.parse(d.items) : d.items;
            if (Array.isArray(parsed) && parsed.length > 0) {
              setAgreementItems(parsed.map((item: any, i: number) => ({
                id: i + 1,
                itemId: item.itemId || '',
                qty: item.qty?.toString() || '',
                unit: item.unit || '',
                unitPrice: item.unitPrice?.toString() || '',
                priceType: item.priceType || 'excl',
              })));
            }
          } catch { /* keep default */ }
        } else {
          setError(recJson.error || 'Failed to load agreement');
        }
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    if (recordId) fetchAll();
  }, [recordId]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleItemChange = (id: number, changes: Partial<AgreementItemRow>) => {
    setAgreementItems((prev) => prev.map((item) => item.id === id ? { ...item, ...changes } : item));
  };

  const handleAddItem = () => {
    const newId = Math.max(...agreementItems.map((i) => i.id), 0) + 1;
    setAgreementItems([...agreementItems, { id: newId, itemId: '', qty: '', unit: '', unitPrice: '', priceType: 'excl' }]);
  };

  const handleRemoveItem = (id: number) => {
    if (agreementItems.length > 1) setAgreementItems(agreementItems.filter((i) => i.id !== id));
  };

  const totalAmount = agreementItems.reduce((sum, item) => {
    const qty = parseFloat(item.qty) || 0;
    const price = parseFloat(item.unitPrice) || 0;
    if (item.priceType === 'incl') {
      const subtotal = qty * (price / 1.15);
      const vat = subtotal * 0.15;
      return sum + subtotal + vat;
    }
    return sum + qty * price;
  }, 0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.customerId || !formData.validFrom || !formData.validTo) {
      alert('Please fill in all required fields');
      return;
    }

    setSubmitting(true);
    try {
      const itemsData = agreementItems
        .filter((i) => i.itemId && i.qty && i.unitPrice)
        .map((i) => ({
          itemId: i.itemId,
          qty: parseFloat(i.qty),
          unit: i.unit,
          unitPrice: parseFloat(i.unitPrice),
          priceType: i.priceType,
        }));

      const res = await fetch(`/api/sales/agreements/${recordId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerId: formData.customerId,
          division: formData.division,
          status: formData.status,
          items: JSON.stringify(itemsData),
          totalAmount,
          validFrom: formData.validFrom,
          validTo: formData.validTo,
          terms: formData.terms,
          offloadingSite: offloadingSites.filter(s => s.trim()).join(' | ') || null,
        }),
      });
      const result = await res.json();
      if (!res.ok || !result.success) throw new Error(result.error || 'Failed to update');

      alert('Sales Agreement updated successfully!');
      router.push(`/dashboard/sales/agreements/${recordId}`);
    } catch (err: any) {
      alert(err.message || 'Failed to update');
    } finally {
      setSubmitting(false);
    }
  };

  const handleBack = () => router.push(`/dashboard/sales/agreements/${recordId}`);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <button onClick={handleBack} className="text-blue-600 hover:text-blue-800 font-medium">← Back</button>
        <Card><CardBody><p className="text-red-600">{error}</p></CardBody></Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <button onClick={handleBack} className="text-blue-600 hover:text-blue-800 text-sm font-medium">← Back</button>
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">Edit Sales Agreement</h1>
        <p className="text-slate-600 mt-1">{agreementNo}</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card>
          <CardHeader><h2 className="text-xl font-bold text-slate-900">Agreement Details</h2></CardHeader>
          <CardBody className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-slate-900 mb-2">Customer *</label>
                <select name="customerId" value={formData.customerId} onChange={handleChange}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900">
                  <option value="">Select Customer</option>
                  {customers.map((c) => <option key={c.id} value={c.id}>{c.companyName}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-900 mb-2">Division</label>
                <select name="division" value={formData.division} onChange={handleChange}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900">
                  <option value="CONSTRUCTION">Construction</option>
                  <option value="CEMENT">Cement</option>
                  <option value="AGGREGATE">Aggregate</option>
                  <option value="MEDICAL">Medical</option>
                  <option value="BOTH">Both</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-900 mb-2">Valid From *</label>
                <input type="date" name="validFrom" value={formData.validFrom} onChange={handleChange}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-900 mb-2">Valid To *</label>
                <input type="date" name="validTo" value={formData.validTo} onChange={handleChange}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-900 mb-2">Status</label>
                <select
                  name="status"
                  value={formData.status || ''}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900"
                >
                  <option value="Draft">Draft</option>
                  <option value="Active">Active</option>
                  <option value="Expired">Expired</option>
                  <option value="Cancelled">Cancelled</option>
                  <option value="Deactivated">Deactivated</option>
                  <option value="Void">Void</option>
                </select>
                {formData.status === 'Deactivated' && (
                  <p className="text-xs text-amber-700 font-medium mt-1">
                    ⚠️ This agreement is currently Deactivated. Select "Active" to reactivate it.
                  </p>
                )}
              </div>
            </div>

            <div>
              <div className="flex justify-between items-center mb-2">
                <label className="block text-sm font-medium text-slate-900">Offloading Sites (Destinations)</label>
                <button type="button" onClick={() => setOffloadingSites([...offloadingSites, ''])}
                  className="text-blue-600 hover:text-blue-800 text-sm font-medium">+ Add Site</button>
              </div>
              <div className="space-y-2">
                {offloadingSites.map((site, idx) => (
                  <div key={idx} className="flex gap-2">
                    <input type="text" value={site}
                      onChange={(e) => { const u = [...offloadingSites]; u[idx] = e.target.value; setOffloadingSites(u); }}
                      placeholder={`Destination ${idx + 1}`}
                      className="flex-1 px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900" />
                    {offloadingSites.length > 1 && (
                      <button type="button" onClick={() => setOffloadingSites(offloadingSites.filter((_, i) => i !== idx))}
                        className="text-red-500 hover:text-red-700 text-sm font-medium px-2">Remove</button>
                    )}
                  </div>
                ))}
              </div>
              <p className="text-xs text-slate-500 mt-1">Where goods will be delivered. Used in transport agreements.</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-900 mb-2">Terms</label>
              <textarea name="terms" value={formData.terms} onChange={handleChange} rows={3}
                placeholder="Agreement terms and conditions..."
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900" />
            </div>
          </CardBody>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-bold text-slate-900">Items</h2>
              <Button type="button" variant="secondary" size="sm" onClick={handleAddItem}>+ Add Item</Button>
            </div>
          </CardHeader>
          <CardBody>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-3 px-3 text-sm font-semibold text-slate-900 w-[30%]">Item</th>
                    <th className="text-left py-3 px-3 text-sm font-semibold text-slate-900 w-[10%]">Qty</th>
                    <th className="text-left py-3 px-3 text-sm font-semibold text-slate-900 w-[12%]">Unit</th>
                    <th className="text-left py-3 px-3 text-sm font-semibold text-slate-900 w-[14%]">Unit Price (ETB)</th>
                    <th className="text-left py-3 px-3 text-sm font-semibold text-slate-900 w-[16%]">Price Type</th>
                    <th className="text-left py-3 px-3 text-sm font-semibold text-slate-900 w-[10%]">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {agreementItems.map((item) => (
                    <tr key={item.id} className="border-b">
                      <td className="py-3 px-3">
                        <select value={item.itemId}
                          onChange={(e) => {
                            const sel = items.find((i) => i.id === e.target.value);
                            handleItemChange(item.id, { itemId: e.target.value, unit: sel?.unit || item.unit });
                          }}
                          className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm">
                          <option value="">Select Item</option>
                          {items.map((m) => <option key={m.id} value={m.id}>{m.code} - {m.name}</option>)}
                        </select>
                      </td>
                      <td className="py-3 px-3">
                        <input type="number" step="0.01" value={item.qty}
                          onChange={(e) => handleItemChange(item.id, { qty: e.target.value })}
                          className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm" />
                      </td>
                      <td className="py-3 px-3">
                        <select value={item.unit}
                          onChange={(e) => handleItemChange(item.id, { unit: e.target.value })}
                          className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900 text-sm">
                          <option value="">Select</option>
                          <option value="Ton">Ton</option>
                          <option value="QT">Quintal (QT)</option>
                          <option value="Kg">Kg</option>
                          <option value="Pieces">Pieces</option>
                        </select>
                      </td>
                      <td className="py-3 px-3">
                        <input type="number" step="0.01" value={item.unitPrice}
                          onChange={(e) => handleItemChange(item.id, { unitPrice: e.target.value })}
                          className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm" />
                      </td>
                      <td className="py-3 px-3">
                        <select value={item.priceType}
                          onChange={(e) => handleItemChange(item.id, { priceType: e.target.value as 'excl' | 'incl' })}
                          className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900 text-sm">
                          <option value="excl">Excl. VAT</option>
                          <option value="incl">Incl. VAT (15%)</option>
                        </select>
                      </td>
                      <td className="py-3 px-3">
                        <Button type="button" variant="outline" size="sm" onClick={() => handleRemoveItem(item.id)}
                          disabled={agreementItems.length === 1}>Remove</Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="mt-6 flex justify-end">
              <div className="text-lg font-semibold text-slate-900">Total: ETB {totalAmount.toFixed(2)}</div>
            </div>
          </CardBody>
        </Card>

        <Card>
          <CardFooter className="flex justify-between items-center">
            <Button
              type="button"
              variant="danger"
              size="lg"
              onClick={() => setShowDeleteModal(true)}
              disabled={submitting || deleting}
            >
              Delete Agreement
            </Button>
            <div className="flex gap-4">
              <Button type="submit" variant="primary" size="lg" isLoading={submitting} disabled={deleting}>
                Save Changes
              </Button>
              <Button type="button" variant="outline" size="lg" onClick={handleBack} disabled={submitting || deleting}>
                Cancel
              </Button>
            </div>
          </CardFooter>
        </Card>
      </form>

      <ConfirmDialog
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        onConfirm={handleDelete}
        title="Delete Sales Agreement"
        message={`Are you sure you want to permanently delete agreement ${agreementNo}? This action cannot be undone.`}
        confirmText="Delete"
        cancelText="Cancel"
        isDangerous={true}
        isLoading={deleting}
      />
    </div>
  );
}
