'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
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

  const [agreements, setAgreements] = useState<any[]>([]);
  const [loadingAgreements, setLoadingAgreements] = useState(false);
  const [requests, setRequests] = useState<any[]>([]);
  const [loadingRequests, setLoadingRequests] = useState(false);

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

  useEffect(() => {
    const fetchAgreements = async () => {
      if (!customerId) return;
      try {
        setLoadingAgreements(true);
        const res = await fetch(`/api/sales/agreements?customerId=${customerId}`);
        const result = await res.json();
        if (result.success) setAgreements(result.data || []);
      } catch (err) {
        console.error('Failed to fetch sales agreements:', err);
      } finally {
        setLoadingAgreements(false);
      }
    };

    const fetchRequests = async () => {
      if (!customerId) return;
      try {
        setLoadingRequests(true);
        const res = await fetch(`/api/medical/requests?customerId=${customerId}`);
        const result = await res.json();
        if (result.success) setRequests(result.data || []);
      } catch (err) {
        console.error('Failed to fetch medical requests:', err);
      } finally {
        setLoadingRequests(false);
      }
    };

    if (customerId) {
      fetchAgreements();
      fetchRequests();
    }
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

          {/* Sales Agreements */}
          <div className="border-t border-slate-200 pt-8">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-slate-900">Customer Sales Agreements</h3>
              <Link
                href={`/dashboard/sales/agreements/new?customerId=${customer.id}`}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium"
              >
                + New Agreement
              </Link>
            </div>
            {loadingAgreements ? (
              <p className="text-slate-500 text-sm">Loading agreements...</p>
            ) : agreements.length === 0 ? (
              <p className="text-slate-500 text-sm">No sales agreements found for this customer.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200">
                      <th className="px-4 py-2 text-left text-xs font-semibold text-slate-500 uppercase">Agreement No</th>
                      <th className="px-4 py-2 text-left text-xs font-semibold text-slate-500 uppercase">Division</th>
                      <th className="px-4 py-2 text-left text-xs font-semibold text-slate-500 uppercase">Total Amount</th>
                      <th className="px-4 py-2 text-left text-xs font-semibold text-slate-500 uppercase">Valid From</th>
                      <th className="px-4 py-2 text-left text-xs font-semibold text-slate-500 uppercase">Valid To</th>
                      <th className="px-4 py-2 text-left text-xs font-semibold text-slate-500 uppercase">Status</th>
                      <th className="px-4 py-2 text-left text-xs font-semibold text-slate-500 uppercase">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {agreements.map((a: any) => (
                      <tr key={a.id} className="border-b border-slate-100 hover:bg-slate-50">
                        <td className="px-4 py-2 text-slate-900 font-medium">{a.agreementNo}</td>
                        <td className="px-4 py-2 text-slate-900">{a.division}</td>
                        <td className="px-4 py-2 text-slate-900">ETB {Number(a.totalAmount || 0).toLocaleString('en-US')}</td>
                        <td className="px-4 py-2 text-slate-900">{a.validFrom ? new Date(a.validFrom).toLocaleDateString() : '-'}</td>
                        <td className="px-4 py-2 text-slate-900">{a.validTo ? new Date(a.validTo).toLocaleDateString() : '-'}</td>
                        <td className="px-4 py-2">
                          <Badge status={a.status === 'Active' || a.status === 'Approved' ? 'Active' : a.status === 'Rejected' || a.status === 'Void' ? 'Rejected' : 'Pending'}>
                            {a.status}
                          </Badge>
                        </td>
                        <td className="px-4 py-2">
                          <Link href={`/dashboard/sales/agreements/${a.id}`} className="text-blue-600 hover:underline text-sm font-medium">View</Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Medical Purchase Requests */}
          <div className="border-t border-slate-200 pt-8">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-slate-900">Medical Purchase Requests</h3>
              <Link
                href={`/dashboard/medical/requests/new`}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium"
              >
                + New Medical Request
              </Link>
            </div>
            {loadingRequests ? (
              <p className="text-slate-500 text-sm">Loading requests...</p>
            ) : requests.length === 0 ? (
              <p className="text-slate-500 text-sm">No medical requests found for this customer.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200">
                      <th className="px-4 py-2 text-left text-xs font-semibold text-slate-500 uppercase">Request No</th>
                      <th className="px-4 py-2 text-left text-xs font-semibold text-slate-500 uppercase">Priority</th>
                      <th className="px-4 py-2 text-left text-xs font-semibold text-slate-500 uppercase">Date</th>
                      <th className="px-4 py-2 text-left text-xs font-semibold text-slate-500 uppercase">Status</th>
                      <th className="px-4 py-2 text-left text-xs font-semibold text-slate-500 uppercase">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {requests.map((r: any) => (
                      <tr key={r.id} className="border-b border-slate-100 hover:bg-slate-50">
                        <td className="px-4 py-2 text-slate-900 font-medium">{r.requestNo}</td>
                        <td className="px-4 py-2 text-slate-900">{r.priority || 'Normal'}</td>
                        <td className="px-4 py-2 text-slate-900">{r.requestDate ? new Date(r.requestDate).toLocaleDateString() : '-'}</td>
                        <td className="px-4 py-2">
                          <Badge status={r.status === 'Approved' ? 'Active' : r.status === 'Cancelled' ? 'Rejected' : 'Pending'}>
                            {r.status}
                          </Badge>
                        </td>
                        <td className="px-4 py-2">
                          <Link href={`/dashboard/medical/requests/${r.id}`} className="text-blue-600 hover:underline text-sm font-medium">View</Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </CardBody>
      </Card>
    </div>
  );
}

