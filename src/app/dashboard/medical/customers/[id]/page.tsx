'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { Card, CardHeader, CardBody, Button, Badge } from '@/components/ui';

interface MedicalCustomer {
  id: string;
  code: string;
  customerType: string;
  companyName: string;
  tin?: string;
  phone: string;
  email?: string;
  contactPerson?: string;
  location?: string;
  withholding: boolean;
  withholdRate: number;
  creditLimit: number;
  creditTermDays: number;
  status: string;
  division: string;
  licenseNo?: string;
  licenseExpiry?: string;
  licenseType?: string;
  medicalApproved: boolean;
  createdAt: string;
}

export default function MedicalCustomerDetailPage() {
  const router = useRouter();
  const params = useParams();
  const customerId = params?.id as string;

  const [customer, setCustomer] = useState<MedicalCustomer | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchCustomer = async () => {
      try {
        setLoading(true);
        const response = await fetch(`/api/customers/${customerId}`);
        const result = await response.json();
        if (!response.ok || !result.success) throw new Error(result.error || 'Failed to fetch customer');
        setCustomer(result.data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred');
      } finally {
        setLoading(false);
      }
    };
    if (customerId) fetchCustomer();
  }, [customerId]);

  const handleEdit = () => router.push(`/dashboard/medical/customers/${customerId}/edit`);
  const handleBack = () => router.push('/dashboard/medical/customers');

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

  if (error || !customer) {
    return (
      <div className="space-y-6">
        <button onClick={handleBack} className="text-blue-600 hover:text-blue-800 font-medium">&larr; Back to Medical Customers</button>
        <Card><CardBody><p className="text-red-600">{error || 'Customer not found'}</p></CardBody></Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 text-sm text-slate-600">
        <button onClick={handleBack} className="text-blue-600 hover:text-blue-800 font-medium">Medical Customers</button>
        <span>/</span>
        <span className="text-slate-900 font-medium">{customer.companyName}</span>
      </div>

      <div>
        <h1 className="text-3xl font-bold text-slate-900">{customer.companyName}</h1>
        <p className="text-slate-600 mt-2">Customer Code: {customer.code}</p>
      </div>

      <Card>
        <CardHeader className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-slate-900">{customer.companyName}</h2>
            <div className="flex gap-2 mt-2">
              <Badge status={customer.status === 'Active' ? 'Active' : 'Rejected'}>{customer.status}</Badge>
              <Badge status={customer.medicalApproved ? 'Approved' : 'Pending'}>
                {customer.medicalApproved ? 'Medical Approved' : 'Pending Approval'}
              </Badge>
            </div>
          </div>
          <div className="flex gap-3">
            <Button variant="primary" size="lg" onClick={handleEdit}>Edit</Button>
            <Button variant="outline" size="lg" onClick={handleBack}>Back</Button>
          </div>
        </CardHeader>

        <CardBody className="space-y-8">
          <div>
            <h3 className="text-lg font-semibold text-slate-900 mb-4">Basic Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Customer Code</label>
                <p className="text-lg font-medium text-slate-900 mt-1">{customer.code}</p>
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Customer Type</label>
                <p className="text-lg font-medium text-slate-900 mt-1">{customer.customerType}</p>
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Division</label>
                <p className="text-lg font-medium text-slate-900 mt-1">{customer.division}</p>
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">TIN</label>
                <p className="text-lg font-medium text-slate-900 mt-1">{customer.tin || 'N/A'}</p>
              </div>
            </div>
          </div>

          <div className="border-t border-slate-200 pt-8">
            <h3 className="text-lg font-semibold text-slate-900 mb-4">Medical License</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">License Number</label>
                <p className="text-lg font-medium text-slate-900 mt-1">{customer.licenseNo || 'N/A'}</p>
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">License Type</label>
                <p className="text-lg font-medium text-slate-900 mt-1">{customer.licenseType || 'N/A'}</p>
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">License Expiry</label>
                <p className="text-lg font-medium text-slate-900 mt-1">
                  {customer.licenseExpiry ? new Date(customer.licenseExpiry).toLocaleDateString() : 'N/A'}
                </p>
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Medical Approved</label>
                <p className="text-lg font-medium text-slate-900 mt-1">{customer.medicalApproved ? 'Yes' : 'No'}</p>
              </div>
            </div>
          </div>

          <div className="border-t border-slate-200 pt-8">
            <h3 className="text-lg font-semibold text-slate-900 mb-4">Contact Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Phone</label>
                <p className="text-lg font-medium text-slate-900 mt-1">{customer.phone}</p>
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Email</label>
                <p className="text-lg font-medium text-slate-900 mt-1">{customer.email || 'N/A'}</p>
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Contact Person</label>
                <p className="text-lg font-medium text-slate-900 mt-1">{customer.contactPerson || 'N/A'}</p>
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Location</label>
                <p className="text-lg font-medium text-slate-900 mt-1">{customer.location || 'N/A'}</p>
              </div>
            </div>
          </div>

          <div className="border-t border-slate-200 pt-8">
            <h3 className="text-lg font-semibold text-slate-900 mb-4">Financial Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Credit Limit</label>
                <p className="text-lg font-medium text-slate-900 mt-1">{customer.creditLimit?.toLocaleString('en-US')} ETB</p>
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Credit Terms</label>
                <p className="text-lg font-medium text-slate-900 mt-1">{customer.creditTermDays} days</p>
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Withholding</label>
                <p className="text-lg font-medium text-slate-900 mt-1">{customer.withholding ? 'Yes (' + customer.withholdRate + '%)' : 'No'}</p>
              </div>
            </div>
          </div>
        </CardBody>
      </Card>
    </div>
  );
}
