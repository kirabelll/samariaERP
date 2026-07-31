'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { Card, CardHeader, CardBody, Button, Badge } from '@/components/ui';
import Link from 'next/link';

interface Customer {
  id: string;
  code: string;
  customerType: 'COMPANY' | 'INDIVIDUAL';
  companyName?: string;
  firstName?: string;
  lastName?: string;
  tin: string;
  phone: string;
  email: string;
  contactPerson: string;
  location: string;
  creditLimit: number;
  creditTermDays: number;
  withholding: boolean;
  withholdRate: number;
  division: 'CONSTRUCTION' | 'MEDICAL' | 'BOTH';
  status: 'Active' | 'Inactive';
}

export default function CustomerDetails() {
  const router = useRouter();
  const params = useParams();
  const customerId = params?.id as string;

  const [customer, setCustomer] = useState<Customer | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [vouchers, setVouchers] = useState<any[]>([]);

  useEffect(() => {
    const fetchCustomer = async () => {
      try {
        setLoading(true);
        const response = await fetch(`/api/customers/${customerId}`);
        const result = await response.json();

        if (!response.ok || !result.success) {
          throw new Error(result.message || 'Failed to fetch customer');
        }

        setCustomer(result.data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred');
      } finally {
        setLoading(false);
      }
    };

    if (customerId) {
      fetchCustomer();
    }
  }, [customerId]);

  useEffect(() => {
    const fetchVouchers = async () => {
      if (!customer) return;
      try {
        const name = customer.customerType === 'COMPANY' ? customer.companyName : `${customer.firstName || ''} ${customer.lastName || ''}`.trim();
        const res = await fetch(`/api/finance/vouchers?payeeName=${encodeURIComponent(name || '')}&limit=5`);
        const result = await res.json();
        if (result.success) setVouchers(result.data || []);
      } catch {}
    };
    fetchVouchers();
  }, [customer]);

  const handleEdit = () => {
    router.push(`/dashboard/customers/${customerId}/edit`);
  };

  const handleBack = () => {
    router.push('/dashboard/customers');
  };

  const getCustomerName = (customer: Customer) => {
    if (customer.customerType === 'COMPANY') {
      return customer.companyName || 'N/A';
    }
    return `${customer.firstName || ''} ${customer.lastName || ''}`.trim() || 'N/A';
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

  if (error || !customer) {
    return (
      <div className="space-y-6">
        <button
          onClick={handleBack}
          className="text-blue-600 hover:text-blue-800 font-medium"
        >
          ← Back to Customers
        </button>
        <Card>
          <CardBody>
            <p className="text-red-600">{error || 'Customer not found'}</p>
          </CardBody>
        </Card>
      </div>
    );
  }

  const customerName = getCustomerName(customer);

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-slate-600">
        <button
          onClick={handleBack}
          className="text-blue-600 hover:text-blue-800 font-medium"
        >
          Customers
        </button>
        <span>/</span>
        <span className="text-slate-900 font-medium">{customerName}</span>
      </div>

      {/* Page Header */}
      <div>
        <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-slate-900">
          {customerName}
        </h1>
        <p className="text-slate-600 mt-2">Customer ID: {customer.code}</p>
      </div>

      {/* Customer Info Card */}
      <Card>
        <CardHeader className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-slate-900">{customerName}</h2>
            <Badge
              status={customer.status === 'Active' ? 'Active' : 'Rejected'}
              className="mt-2"
            >
              {customer.status}
            </Badge>
          </div>
          <div className="flex gap-3">
            <Button variant="primary" size="lg" onClick={handleEdit}>
              Edit
            </Button>
            <Button variant="outline" size="lg" onClick={handleBack}>
              Back
            </Button>
          </div>
        </CardHeader>

        <CardBody className="space-y-8">
          {/* Basic Information */}
          <div>
            <h3 className="text-lg font-semibold text-slate-900 mb-4">Basic Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                  Customer Type
                </label>
                <p className="text-lg font-medium text-slate-900 mt-1">
                  {customer.customerType}
                </p>
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                  Division
                </label>
                <p className="text-lg font-medium text-slate-900 mt-1">
                  {customer.division}
                </p>
              </div>
              {customer.customerType === 'COMPANY' && (
                <div>
                  <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                    Company Name
                  </label>
                  <p className="text-lg font-medium text-slate-900 mt-1">
                    {customer.companyName || 'N/A'}
                  </p>
                </div>
              )}
              {customer.customerType === 'INDIVIDUAL' && (
                <>
                  <div>
                    <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                      First Name
                    </label>
                    <p className="text-lg font-medium text-slate-900 mt-1">
                      {customer.firstName || 'N/A'}
                    </p>
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                      Last Name
                    </label>
                    <p className="text-lg font-medium text-slate-900 mt-1">
                      {customer.lastName || 'N/A'}
                    </p>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Contact Information */}
          <div className="border-t border-slate-200 pt-8">
            <h3 className="text-lg font-semibold text-slate-900 mb-4">Contact Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                  Email
                </label>
                <p className="text-lg font-medium text-slate-900 mt-1">{customer.email}</p>
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                  Phone
                </label>
                <p className="text-lg font-medium text-slate-900 mt-1">{customer.phone}</p>
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                  Contact Person
                </label>
                <p className="text-lg font-medium text-slate-900 mt-1">
                  {customer.contactPerson || 'N/A'}
                </p>
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                  Location
                </label>
                <p className="text-lg font-medium text-slate-900 mt-1">
                  {customer.location || 'N/A'}
                </p>
              </div>
            </div>
          </div>

          {/* Tax Information */}
          <div className="border-t border-slate-200 pt-8">
            <h3 className="text-lg font-semibold text-slate-900 mb-4">Tax Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                  TIN
                </label>
                <p className="text-lg font-medium text-slate-900 mt-1">{customer.tin}</p>
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                  Withholding
                </label>
                <p className="text-lg font-medium text-slate-900 mt-1">
                  {customer.withholding ? 'Yes' : 'No'}
                </p>
              </div>
              {customer.withholding && (
                <div>
                  <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                    Withhold Rate
                  </label>
                  <p className="text-lg font-medium text-slate-900 mt-1">
                    {customer.withholdRate}%
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Credit Information */}
          <div className="border-t border-slate-200 pt-8">
            <h3 className="text-lg font-semibold text-slate-900 mb-4">Credit Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-slate-50 rounded-lg p-4">
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                  Credit Limit
                </label>
                <p className="text-2xl font-bold text-slate-900 mt-1">
                  {customer.creditLimit.toLocaleString('en-US')}
                </p>
              </div>
              <div className="bg-slate-50 rounded-lg p-4">
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                  Credit Term (Days)
                </label>
                <p className="text-2xl font-bold text-slate-900 mt-1">
                  {customer.creditTermDays}
                </p>
              </div>
            </div>
          </div>

          {/* Recent Vouchers */}
          <div className="border-t border-slate-200 pt-8">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-slate-900">Recent Vouchers</h3>
              <Link
                href={`/dashboard/finance/vouchers/new?payeeType=CUSTOMER&payeeId=${customer.id}&payeeName=${encodeURIComponent(customerName)}`}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium"
              >
                + Create Voucher
              </Link>
            </div>
            {vouchers.length === 0 ? (
              <p className="text-slate-500 text-sm">No vouchers found for this customer.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-200">
                      <th className="px-4 py-2 text-left text-xs font-semibold text-slate-500 uppercase">Voucher No</th>
                      <th className="px-4 py-2 text-left text-xs font-semibold text-slate-500 uppercase">Type</th>
                      <th className="px-4 py-2 text-left text-xs font-semibold text-slate-500 uppercase">Amount</th>
                      <th className="px-4 py-2 text-left text-xs font-semibold text-slate-500 uppercase">Status</th>
                      <th className="px-4 py-2 text-left text-xs font-semibold text-slate-500 uppercase">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {vouchers.map((v: any) => (
                      <tr key={v.id} className="border-b border-slate-100">
                        <td className="px-4 py-2 text-slate-900">{v.voucherNo}</td>
                        <td className="px-4 py-2 text-slate-900">{v.voucherType}</td>
                        <td className="px-4 py-2 text-slate-900">ETB {Number(v.amount).toLocaleString('en-US')}</td>
                        <td className="px-4 py-2"><Badge status={v.status === 'Posted' || v.status === 'Approved' ? 'Active' : v.status === 'Rejected' || v.status === 'Cancelled' ? 'Rejected' : 'Draft'}>{v.status}</Badge></td>
                        <td className="px-4 py-2">
                          <Link href={`/dashboard/finance/vouchers/${v.id}`} className="text-blue-600 hover:underline text-sm">View</Link>
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
