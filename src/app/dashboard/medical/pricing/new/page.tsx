'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Card, CardHeader, CardBody, Button, Input } from '@/components/ui';

export default function NewMedicalPricingPage() {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    itemId: '',
    manufacturerPrice: '',
    freight: '',
    insurance: '',
    customs: '',
    inlandTransport: '',
    bankCost: '',
    warehouseCost: '',
    handlingCost: '',
    wastageAllowance: '',
    otherCosts: '',
    marginPercent: '25',
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const totalCost = [
    'manufacturerPrice', 'freight', 'insurance', 'customs', 'inlandTransport',
    'bankCost', 'warehouseCost', 'handlingCost', 'wastageAllowance', 'otherCosts'
  ].reduce((sum, key) => sum + (parseFloat((formData as any)[key]) || 0), 0);

  const margin = (parseFloat(formData.marginPercent) || 0) / 100;
  const recommendedPrice = totalCost * (1 + margin);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.itemId) { alert('Please enter an Item ID'); return; }
    setSubmitting(true);
    try {
      const res = await fetch('/api/medical/pricing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          itemId: formData.itemId,
          manufacturerPrice: parseFloat(formData.manufacturerPrice) || 0,
          freight: parseFloat(formData.freight) || 0,
          insurance: parseFloat(formData.insurance) || 0,
          customs: parseFloat(formData.customs) || 0,
          inlandTransport: parseFloat(formData.inlandTransport) || 0,
          bankCost: parseFloat(formData.bankCost) || 0,
          warehouseCost: parseFloat(formData.warehouseCost) || 0,
          handlingCost: parseFloat(formData.handlingCost) || 0,
          wastageAllowance: parseFloat(formData.wastageAllowance) || 0,
          otherCosts: parseFloat(formData.otherCosts) || 0,
          marginPercent: parseFloat(formData.marginPercent) || 0,
        }),
      });
      const data = await res.json();
      if (data.success) {
        alert('Pricing created successfully!');
        router.push('/dashboard/medical/pricing');
      } else {
        alert(data.error || 'Failed to create pricing');
      }
    } catch {
      alert('Failed to create pricing');
    }
    setSubmitting(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 text-sm text-slate-500">
        <Link href="/dashboard/medical/pricing" className="text-blue-600 hover:text-blue-800">Medical Pricing</Link>
        <span>/</span><span>New Pricing</span>
      </div>
      <h1 className="text-2xl font-bold text-slate-900">New Medical Item Pricing</h1>

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card>
          <CardHeader><h2 className="text-lg font-semibold text-gray-900">Item Selection</h2></CardHeader>
          <CardBody>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Item ID *</label>
              <input name="itemId" value={formData.itemId} onChange={handleChange} required placeholder="Enter medical item ID" className="w-full px-4 py-2.5 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
            </div>
          </CardBody>
        </Card>

        <Card>
          <CardHeader><h2 className="text-lg font-semibold text-gray-900">Cost Components (ETB)</h2></CardHeader>
          <CardBody>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {[
                { name: 'manufacturerPrice', label: 'Manufacturer Price' },
                { name: 'freight', label: 'Freight' },
                { name: 'insurance', label: 'Insurance' },
                { name: 'customs', label: 'Customs Duty' },
                { name: 'inlandTransport', label: 'Inland Transport' },
                { name: 'bankCost', label: 'Bank Cost' },
                { name: 'warehouseCost', label: 'Warehouse Cost' },
                { name: 'handlingCost', label: 'Handling Cost' },
                { name: 'wastageAllowance', label: 'Wastage Allowance' },
                { name: 'otherCosts', label: 'Other Costs' },
              ].map((field) => (
                <div key={field.name}>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{field.label}</label>
                  <input name={field.name} type="number" step="0.01" value={(formData as any)[field.name]} onChange={handleChange} placeholder="0.00" className="w-full px-3 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
                </div>
              ))}
            </div>
          </CardBody>
        </Card>

        <Card>
          <CardHeader><h2 className="text-lg font-semibold text-gray-900">Margin & Pricing</h2></CardHeader>
          <CardBody>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Margin %</label>
                <input name="marginPercent" type="number" step="0.1" value={formData.marginPercent} onChange={handleChange} className="w-full px-3 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
              </div>
              <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                <p className="text-xs text-gray-600 mb-1">Total Cost</p>
                <p className="text-xl font-bold text-gray-900">{totalCost.toLocaleString('en-US')} ETB</p>
              </div>
              <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                <p className="text-xs text-gray-600 mb-1">Recommended Price</p>
                <p className="text-xl font-bold text-green-700">{recommendedPrice.toLocaleString('en-US')} ETB</p>
              </div>
            </div>
          </CardBody>
        </Card>

        <div className="flex gap-3 justify-end">
          <Link href="/dashboard/medical/pricing"><Button variant="outline" size="lg">Cancel</Button></Link>
          <Button variant="primary" size="lg" type="submit" isLoading={submitting}>Save Pricing</Button>
        </div>
      </form>
    </div>
  );
}
