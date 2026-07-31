'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Card, CardHeader, CardBody, Button, Input, Badge, Table } from '@/components/ui';
import type { ColumnDef } from '@/components/ui';

interface Commission {
  id: string;
  salesperson: string;
  basis: string;
  ratePercent: number;
  productCategory: string;
  status: string;
  effectiveFrom: string;
  effectiveTo: string | null;
}

export default function SalesCommissionPage() {
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [commissions, setCommissions] = useState<Commission[]>([]);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    salespersonId: '',
    basis: 'invoiced',
    ratePercent: '',
    productCategory: '',
    effectiveFrom: new Date().toISOString().split('T')[0],
    effectiveTo: '',
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.salespersonId || !formData.ratePercent) {
      alert('Please fill in salesperson and rate');
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch('/api/sales/commissions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          ratePercent: parseFloat(formData.ratePercent),
          effectiveTo: formData.effectiveTo || null,
        }),
      });
      const data = await res.json();
      if (data.success) {
        alert('Commission rule created!');
        setShowForm(false);
        setFormData({ salespersonId: '', basis: 'invoiced', ratePercent: '', productCategory: '', effectiveFrom: new Date().toISOString().split('T')[0], effectiveTo: '' });
      } else {
        alert(data.error || 'Failed');
      }
    } catch {
      alert('Failed to create commission');
    }
    setSubmitting(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-gray-900">Sales Commission Tracking</h1>
        <Button variant="primary" size="lg" onClick={() => setShowForm(!showForm)}>
          {showForm ? 'Cancel' : '+ New Commission Rule'}
        </Button>
      </div>

      {showForm && (
        <Card>
          <CardHeader><h2 className="text-lg font-semibold text-gray-900">New Commission Rule</h2></CardHeader>
          <CardBody>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Salesperson ID *</label>
                  <input name="salespersonId" value={formData.salespersonId} onChange={handleChange} required placeholder="Employee ID" className="w-full px-3 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Commission Basis</label>
                  <select name="basis" value={formData.basis} onChange={handleChange} className="w-full px-3 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                    <option value="invoiced">On Invoice</option>
                    <option value="paid">On Payment</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Rate (%) *</label>
                  <input name="ratePercent" type="number" step="0.1" min="0" max="100" value={formData.ratePercent} onChange={handleChange} required placeholder="e.g., 5" className="w-full px-3 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Product Category</label>
                  <input name="productCategory" value={formData.productCategory} onChange={handleChange} placeholder="Optional - filter by category" className="w-full px-3 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Effective From</label>
                  <input name="effectiveFrom" type="date" value={formData.effectiveFrom} onChange={handleChange} className="w-full px-3 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Effective To</label>
                  <input name="effectiveTo" type="date" value={formData.effectiveTo} onChange={handleChange} className="w-full px-3 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
                </div>
              </div>
              <div className="flex justify-end">
                <Button variant="primary" type="submit" isLoading={submitting}>Save Commission Rule</Button>
              </div>
            </form>
          </CardBody>
        </Card>
      )}

      <Card>
        <CardBody>
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <h3 className="font-semibold text-yellow-800 mb-2">How Commission Tracking Works</h3>
            <div className="text-sm text-yellow-700 space-y-1">
              <p>Commission rules define the percentage a salesperson earns on their sales.</p>
              <p>Rules can be set per salesperson, per product category, and with effective date ranges.</p>
              <p>Commissions are calculated either when an invoice is issued (invoiced basis) or when payment is received (paid basis).</p>
              <p>Use the form above to create new commission rules for your sales team.</p>
            </div>
          </div>
        </CardBody>
      </Card>
    </div>
  );
}
