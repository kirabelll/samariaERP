'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { Card, CardHeader, CardBody, Button, Badge } from '@/components/ui';
import Link from 'next/link';

interface BankAccount {
  id: string;
  accountNumber: string;
  bankName: string;
  accountHolder: string;
}

interface Supplier {
  id: string;
  code: string;
  supplierType: string;
  companyName?: string;
  firstName?: string;
  lastName?: string;
  tin: string;
  phone: string;
  email: string;
  contactPerson: string;
  location: string;
  category: string;
  withholding: boolean;
  withholdRate: number;
  status: 'Active' | 'Inactive';
  bankAccounts?: BankAccount[];
}

export default function SupplierDetails() {
  const router = useRouter();
  const params = useParams();
  const supplierId = params?.id as string;

  const [supplier, setSupplier] = useState<Supplier | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [vouchers, setVouchers] = useState<any[]>([]);

  useEffect(() => {
    const fetchSupplier = async () => {
      try {
        setLoading(true);
        const response = await fetch(`/api/suppliers/${supplierId}`);
        const result = await response.json();

        if (!response.ok || !result.success) {
          throw new Error(result.message || 'Failed to fetch supplier');
        }

        setSupplier(result.data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred');
      } finally {
        setLoading(false);
      }
    };

    if (supplierId) {
      fetchSupplier();
    }
  }, [supplierId]);

  useEffect(() => {
    const fetchVouchers = async () => {
      if (!supplier) return;
      try {
        const name = supplier.companyName || `${supplier.firstName || ''} ${supplier.lastName || ''}`.trim();
        const res = await fetch(`/api/finance/vouchers?payeeName=${encodeURIComponent(name || '')}&limit=5`);
        const result = await res.json();
        if (result.success) setVouchers(result.data || []);
      } catch {}
    };
    fetchVouchers();
  }, [supplier]);

  const handleEdit = () => {
    router.push(`/dashboard/suppliers/${supplierId}/edit`);
  };

  const handleBack = () => {
    router.push('/dashboard/suppliers');
  };

  const getSupplierName = (supplier: Supplier) => {
    if (supplier.companyName) {
      return supplier.companyName;
    }
    return `${supplier.firstName || ''} ${supplier.lastName || ''}`.trim() || 'N/A';
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

  if (error || !supplier) {
    return (
      <div className="space-y-6">
        <button
          onClick={handleBack}
          className="text-blue-600 hover:text-blue-800 font-medium"
        >
          ← Back to Suppliers
        </button>
        <Card>
          <CardBody>
            <p className="text-red-600">{error || 'Supplier not found'}</p>
          </CardBody>
        </Card>
      </div>
    );
  }

  const supplierName = getSupplierName(supplier);

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-slate-600">
        <button
          onClick={handleBack}
          className="text-blue-600 hover:text-blue-800 font-medium"
        >
          Suppliers
        </button>
        <span>/</span>
        <span className="text-slate-900 font-medium">{supplierName}</span>
      </div>

      {/* Page Header */}
      <div>
        <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-slate-900">
          {supplierName}
        </h1>
        <p className="text-slate-600 mt-2">Supplier ID: {supplier.code}</p>
      </div>

      {/* Supplier Info Card */}
      <Card>
        <CardHeader className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-slate-900">{supplierName}</h2>
            <Badge
              status={supplier.status === 'Active' ? 'Active' : 'Rejected'}
              className="mt-2"
            >
              {supplier.status}
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
                  Supplier Type
                </label>
                <p className="text-lg font-medium text-slate-900 mt-1">
                  {supplier.supplierType || 'N/A'}
                </p>
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                  Category
                </label>
                <p className="text-lg font-medium text-slate-900 mt-1">
                  {supplier.category || 'N/A'}
                </p>
              </div>
              {supplier.companyName && (
                <div>
                  <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                    Company Name
                  </label>
                  <p className="text-lg font-medium text-slate-900 mt-1">
                    {supplier.companyName}
                  </p>
                </div>
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
                <p className="text-lg font-medium text-slate-900 mt-1">{supplier.email}</p>
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                  Phone
                </label>
                <p className="text-lg font-medium text-slate-900 mt-1">{supplier.phone}</p>
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                  Contact Person
                </label>
                <p className="text-lg font-medium text-slate-900 mt-1">
                  {supplier.contactPerson || 'N/A'}
                </p>
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                  Location
                </label>
                <p className="text-lg font-medium text-slate-900 mt-1">
                  {supplier.location || 'N/A'}
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
                <p className="text-lg font-medium text-slate-900 mt-1">{supplier.tin}</p>
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                  Withholding
                </label>
                <p className="text-lg font-medium text-slate-900 mt-1">
                  {supplier.withholding ? 'Yes' : 'No'}
                </p>
              </div>
              {supplier.withholding && (
                <div>
                  <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                    Withhold Rate
                  </label>
                  <p className="text-lg font-medium text-slate-900 mt-1">
                    {supplier.withholdRate}%
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Bank Accounts */}
          {supplier.bankAccounts && supplier.bankAccounts.length > 0 && (
            <div className="border-t border-slate-200 pt-8">
              <h3 className="text-lg font-semibold text-slate-900 mb-4">Bank Accounts</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-200">
                      <th className="px-4 py-2 text-left text-xs font-semibold text-slate-500 uppercase">
                        Bank Name
                      </th>
                      <th className="px-4 py-2 text-left text-xs font-semibold text-slate-500 uppercase">
                        Account Number
                      </th>
                      <th className="px-4 py-2 text-left text-xs font-semibold text-slate-500 uppercase">
                        Account Holder
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {supplier.bankAccounts.map((account) => (
                      <tr key={account.id} className="border-b border-slate-100">
                        <td className="px-4 py-2 text-slate-900">{account.bankName}</td>
                        <td className="px-4 py-2 text-slate-900">{account.accountNumber}</td>
                        <td className="px-4 py-2 text-slate-900">{account.accountHolder}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Recent Vouchers */}
          <div className="border-t border-slate-200 pt-8">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-slate-900">Recent Vouchers</h3>
              <Link
                href={`/dashboard/finance/vouchers/new?payeeType=SUPPLIER&payeeId=${supplier.id}&payeeName=${encodeURIComponent(supplierName)}`}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium"
              >
                + Create Voucher
              </Link>
            </div>
            {vouchers.length === 0 ? (
              <p className="text-slate-500 text-sm">No vouchers found for this supplier.</p>
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
