'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter, useParams } from 'next/navigation';
import { Card, CardHeader, CardBody, Button, Input, Select } from '@/components/ui';
import { ArrowLeft, Save, Scale } from 'lucide-react';

interface LiftingOption {
  id: string;
  liftingNo: string;
  factoryWeight: number;
  truckPlateNo: string;
  customerName: string;
  factoryName: string;
  status: string;
  couponNo?: string;
}

export default function EditWeighbridgePage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [liftings, setLiftings] = useState<LiftingOption[]>([]);
  const [weighbridgeNo, setWeighbridgeNo] = useState('');

  const [formData, setFormData] = useState({
    weighbridgeType: 'FACTORY' as 'FACTORY' | 'BUYER',
    liftingId: '',
    truckPlateNo: '',
    grossWeight: '',
    tareWeight: '',
    operatorName: '',
  });

  useEffect(() => {
    fetchLiftings();
    fetchEntry();
  }, [id]);

  const fetchLiftings = async () => {
    try {
      const res = await fetch('/api/cement/liftings?limit=200');
      const result = await res.json();
      if (result.success && Array.isArray(result.data)) {
        setLiftings(
          result.data.map((l: any) => ({
            id: l.id,
            liftingNo: l.liftingNo,
            factoryWeight: Number(l.factoryWeight) || 0,
            truckPlateNo: l.truck?.plateNo || '',
            customerName: l.customer?.companyName || `${l.customer?.firstName || ''} ${l.customer?.lastName || ''}`.trim() || '',
            factoryName: l.factory?.name || l.factory?.factoryName || '',
            status: l.status,
            couponNo: l.coupon?.couponNo || undefined,
          }))
        );
      }
    } catch (err) {
      console.error('Failed to fetch liftings:', err);
    }
  };

  const fetchEntry = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch(`/api/cement/weighbridge/${id}`);
      const json = await res.json();
      if (json.success && json.data) {
        const e = json.data;
        setWeighbridgeNo(e.weighbridgeNo);
        setFormData({
          weighbridgeType: e.weighbridgeType || 'FACTORY',
          liftingId: e.liftingId || '',
          truckPlateNo: e.truckPlateNo || '',
          grossWeight: e.grossWeight ? String(e.grossWeight) : '',
          tareWeight: e.tareWeight ? String(e.tareWeight) : '',
          operatorName: e.operatorName || '',
        });
      } else {
        setError(json.error || 'Failed to load weighbridge entry');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.truckPlateNo || !formData.grossWeight || !formData.tareWeight) {
      alert('Please fill all required fields');
      return;
    }

    try {
      setSubmitting(true);
      const payload = {
        weighbridgeType: formData.weighbridgeType,
        liftingId: formData.liftingId || null,
        truckPlateNo: formData.truckPlateNo,
        grossWeight: parseFloat(formData.grossWeight),
        tareWeight: parseFloat(formData.tareWeight),
        operatorName: formData.operatorName || null,
      };

      const res = await fetch(`/api/cement/weighbridge/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const json = await res.json();
      if (json.success) {
        alert('Weighbridge entry updated successfully');
        router.push(`/dashboard/cement/weighbridge/${id}`);
      } else {
        alert(json.error || 'Failed to update weighbridge entry');
      }
    } catch (err) {
      alert(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-2">
          <Link href="/dashboard/cement/weighbridge" className="text-[#007AFF] hover:text-[#0055D4] flex items-center gap-1 text-sm font-medium">
            <ArrowLeft className="w-4 h-4" /> Back to Register
          </Link>
        </div>
        <Card className="rounded-2xl">
          <CardBody className="py-12 text-center text-slate-500">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#007AFF] mx-auto mb-3"></div>
            Loading weighbridge entry...
          </CardBody>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-2">
          <Link href="/dashboard/cement/weighbridge" className="text-[#007AFF] hover:text-[#0055D4] flex items-center gap-1 text-sm font-medium">
            <ArrowLeft className="w-4 h-4" /> Back to Register
          </Link>
        </div>
        <Card className="rounded-2xl">
          <CardBody className="py-12 text-center text-red-600 font-medium">
            {error}
          </CardBody>
        </Card>
      </div>
    );
  }

  const grossVal = parseFloat(formData.grossWeight || '0');
  const tareVal = parseFloat(formData.tareWeight || '0');
  const netVal = grossVal - tareVal;

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-[#86868B]">
        <Link href="/dashboard" className="text-[#007AFF] hover:text-[#0055D4]">Dashboard</Link>
        <span>/</span>
        <Link href="/dashboard/cement/weighbridge" className="text-[#007AFF] hover:text-[#0055D4]">Weighbridge</Link>
        <span>/</span>
        <Link href={`/dashboard/cement/weighbridge/${id}`} className="text-[#007AFF] hover:text-[#0055D4]">{weighbridgeNo}</Link>
        <span>/</span>
        <span className="text-[#1D1D1F] font-medium">Edit</span>
      </div>

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-[#1D1D1F] flex items-center gap-2">
            <Scale className="w-8 h-8 text-[#007AFF]" />
            Edit Entry — {weighbridgeNo}
          </h1>
          <p className="text-[#86868B] mt-1 text-sm">Update weighbridge measurement details</p>
        </div>
        <Link href={`/dashboard/cement/weighbridge/${id}`}>
          <Button variant="outline">Cancel</Button>
        </Link>
      </div>

      {/* Edit Form */}
      <Card className="rounded-2xl">
        <CardHeader>
          <h2 className="text-lg font-semibold text-[#1D1D1F]">Entry Information</h2>
        </CardHeader>
        <CardBody>
          <form onSubmit={handleSubmit} className="space-y-4">
            <Select
              label="Type *"
              value={formData.weighbridgeType}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, weighbridgeType: e.target.value as 'FACTORY' | 'BUYER' }))
              }
              options={[
                { label: 'Factory', value: 'FACTORY' },
                { label: 'Buyer', value: 'BUYER' },
              ]}
            />

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Linked Lifting</label>
              <select
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                value={formData.liftingId}
                onChange={(e) => {
                  const selectedId = e.target.value;
                  const lifting = liftings.find((l) => l.id === selectedId);
                  if (lifting) {
                    setFormData((prev) => ({
                      ...prev,
                      liftingId: selectedId,
                      truckPlateNo: lifting.truckPlateNo || prev.truckPlateNo,
                    }));
                  } else {
                    setFormData((prev) => ({
                      ...prev,
                      liftingId: '',
                    }));
                  }
                }}
              >
                <option value="">-- Select Lifting (optional) --</option>
                {liftings.map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.liftingNo} — {l.factoryWeight} tons — {l.truckPlateNo} — {l.customerName || 'N/A'}{l.couponNo ? ` — Coupon: ${l.couponNo}` : ''} [{l.status}]
                  </option>
                ))}
              </select>
            </div>

            <Input
              label="Truck Plate Number *"
              placeholder="e.g., AA-123-AB"
              value={formData.truckPlateNo}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, truckPlateNo: e.target.value }))
              }
              required
            />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                label="Gross Weight (kg) *"
                type="number"
                placeholder="Enter gross weight"
                value={formData.grossWeight}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, grossWeight: e.target.value }))
                }
                required
              />

              <Input
                label="Tare Weight (kg) *"
                type="number"
                placeholder="Enter tare weight"
                value={formData.tareWeight}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, tareWeight: e.target.value }))
                }
                required
              />
            </div>

            <div className="p-4 rounded-xl bg-slate-100 border border-slate-200">
              <p className="text-sm font-semibold text-gray-900">
                Calculated Net Weight: <span className="text-[#007AFF] text-lg font-bold">{netVal.toLocaleString('en-US')} kg</span> ({ (netVal / 100).toFixed(2) } QT)
              </p>
            </div>

            <Input
              label="Operator Name"
              placeholder="Name of weighbridge operator"
              value={formData.operatorName}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, operatorName: e.target.value }))
              }
            />

            <div className="flex gap-3 justify-end pt-4 border-t border-slate-200">
              <Link href={`/dashboard/cement/weighbridge/${id}`}>
                <Button type="button" variant="outline">
                  Cancel
                </Button>
              </Link>
              <Button type="submit" variant="primary" isLoading={submitting}>
                <Save className="w-4 h-4 mr-2" /> Save Changes
              </Button>
            </div>
          </form>
        </CardBody>
      </Card>
    </div>
  );
}
