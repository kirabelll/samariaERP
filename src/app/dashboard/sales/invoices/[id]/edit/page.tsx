'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { Card, CardHeader, CardBody, CardFooter, Button, Input, Select } from '@/components/ui';

export default function SalesInvoiceEditEditPage() {
  const router = useRouter();
  const params = useParams();
  const recordId = params?.id as string;

  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState<any>({});

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const response = await fetch(`/api/sales/invoices/${recordId}`);
        const result = await response.json();

        if (!response.ok || !result.success) {
          throw new Error(result.error || 'Failed to fetch record');
        }

        setData(result.data);
        setFormData(result.data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred');
      } finally {
        setLoading(false);
      }
    };

    if (recordId) {
      fetchData();
    }
  }, [recordId]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    const checked = (e.target as HTMLInputElement).checked;

    setFormData((prev: any) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : type === 'number' ? parseFloat(value) : value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSubmitting(true);
      const response = await fetch(`/api/sales/invoices/${recordId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Failed to update record');
      }

      alert('Record updated successfully!');
      router.push(`/dashboard/sales/invoices/${recordId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      alert(err instanceof Error ? err.message : 'Failed to update record');
    } finally {
      setSubmitting(false);
    }
  };

  const handleBack = () => {
    router.push(`/dashboard/sales/invoices/${recordId}`);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="text-slate-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="space-y-6">
        <button
          onClick={handleBack}
          className="text-blue-600 hover:text-blue-800 font-medium"
        >
          ← Back
        </button>
        <Card>
          <CardBody>
            <p className="text-red-600">{error || 'Record not found'}</p>
          </CardBody>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-slate-600">
        <button onClick={handleBack} className="text-blue-600 hover:text-blue-800 font-medium">
          ← Back
        </button>
      </div>

      {/* Page Header */}
      <div>
        <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-slate-900">
          Edit Record
        </h1>
      </div>

      {/* Edit Form */}
      <Card>
        <CardHeader>
          <h2 className="text-2xl font-bold text-slate-900">Update Record Information</h2>
        </CardHeader>

        <CardBody>
          <form onSubmit={handleSubmit} className="space-y-8">
            {/* Form Fields */}
            <div>
              <h3 className="text-lg font-semibold text-slate-900 mb-4">Information</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {["invoiceNo","customerId","salesOrderId","division","subtotal","vatRate","vatAmount","withholding","totalAmount","status","dueDate"].map((field) => (
                  <div key={field}>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      {field.replace(/([A-Z])/g, ' $1').trim()}
                    </label>
                    <Input
                      type="text"
                      name={field}
                      value={formData[field] !== undefined ? String(formData[field]) : ''}
                      onChange={handleChange}
                      placeholder={field}
                    />
                  </div>
                ))}
              </div>
            </div>

            {/* Form Actions */}
            <div className="border-t border-slate-200 pt-8 flex gap-3 justify-end">
              <Button variant="outline" onClick={handleBack} disabled={submitting}>
                Cancel
              </Button>
              <Button variant="primary" type="submit" disabled={submitting}>
                {submitting ? 'Saving...' : 'Save Changes'}
              </Button>
            </div>
          </form>
        </CardBody>
      </Card>
    </div>
  );
}
