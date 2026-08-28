'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { Card, CardHeader, CardBody, Button, Badge } from '@/components/ui';
import { fetchDocuments } from '@/lib/upload-helper';

interface MedicalCustomer {
  id: string;
  code: string;
  customerType: string;
  companyName: string;
  firstName?: string;
  lastName?: string;
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
  approvedBy?: string;
  registeredBy?: string;
  createdAt: string;
  updatedAt?: string;
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
  const [documents, setDocuments] = useState<any[]>([]);
  const [loadingDocuments, setLoadingDocuments] = useState(false);
  const [salesOrders, setSalesOrders] = useState<any[]>([]);
  const [loadingSalesOrders, setLoadingSalesOrders] = useState(false);

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
    if (!customerId) return;

    // Fetch Agreements
    setLoadingAgreements(true);
    fetch(`/api/sales/agreements?customerId=${customerId}`)
      .then((r) => r.json())
      .then((d) => { if (d.success) setAgreements(d.data || []); })
      .catch(console.error)
      .finally(() => setLoadingAgreements(false));

    // Fetch Medical Requests
    setLoadingRequests(true);
    fetch(`/api/medical/requests?customerId=${customerId}`)
      .then((r) => r.json())
      .then((d) => { if (d.success) setRequests(d.data || []); })
      .catch(console.error)
      .finally(() => setLoadingRequests(false));

    // Fetch Documents
    setLoadingDocuments(true);
    fetchDocuments('MEDICAL', customerId)
      .then((docs) => setDocuments(docs || []))
      .catch(console.error)
      .finally(() => setLoadingDocuments(false));

    // Fetch Sales Orders
    setLoadingSalesOrders(true);
    fetch(`/api/sales/orders?limit=20`)
      .then((r) => r.json())
      .then((d) => {
        if (d.success && Array.isArray(d.data)) {
          const matched = d.data.filter((so: any) => so.customerId === customerId || so.customer?.id === customerId);
          setSalesOrders(matched);
        }
      })
      .catch(console.error)
      .finally(() => setLoadingSalesOrders(false));
  }, [customerId]);

  const handleEdit = () => router.push(`/dashboard/medical/customers/${customerId}/edit`);
  const handleBack = () => router.push('/dashboard/medical/customers');

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="text-slate-600">Loading licensed customer data...</p>
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

  // Calculate License Expiry Days
  const expiryDate = customer.licenseExpiry ? new Date(customer.licenseExpiry) : null;
  const isExpired = expiryDate ? expiryDate < new Date() : false;
  const daysRemaining = expiryDate
    ? Math.ceil((expiryDate.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))
    : null;

  return (
    <div className="space-y-6 max-w-7xl mx-auto p-4 sm:p-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-slate-500">
        <Link href="/dashboard/medical/customers" className="text-blue-600 hover:text-blue-800">Licensed Medical Customers</Link>
        <span>/</span>
        <span className="text-slate-900 font-medium">{customer.companyName}</span>
      </div>

      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">{customer.companyName}</h1>
            <Badge status={customer.status === 'Active' ? 'Active' : 'Rejected'}>{customer.status}</Badge>
            <span className={`text-xs px-2.5 py-1 rounded-full font-semibold border ${
              isExpired
                ? 'bg-red-50 text-red-700 border-red-200'
                : customer.licenseNo
                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                : 'bg-gray-100 text-gray-700 border-gray-200'
            }`}>
              {isExpired ? '⚠️ License Expired' : customer.licenseNo ? '✓ License Active' : 'No License Recorded'}
            </span>
          </div>
          <p className="text-sm text-slate-500 mt-1">
            Customer Code: <span className="font-mono font-semibold text-slate-800">{customer.code}</span> • Division: <span className="font-semibold text-blue-600">{customer.division}</span> • Registered: {new Date(customer.createdAt).toLocaleDateString()}
          </p>
        </div>
        <div className="flex gap-2.5">
          <Button variant="outline" size="md" onClick={handleBack}>&larr; Back</Button>
          <Button variant="secondary" size="md" onClick={handleEdit}>Edit Profile</Button>
          <Link href={`/dashboard/sales/orders/new`}>
            <Button variant="primary" size="md">+ New Order</Button>
          </Link>
        </div>
      </div>

      {/* License Warning Banner if Expired or Expiring Soon */}
      {isExpired && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-xl flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-2xl">⚠️</span>
            <div>
              <h4 className="text-sm font-bold text-red-900">Medical License Has Expired!</h4>
              <p className="text-xs text-red-700 mt-0.5">
                License #{customer.licenseNo} expired on {expiryDate?.toLocaleDateString()} ({Math.abs(daysRemaining || 0)} days ago). Regulated pharmaceutical supplies cannot be issued until renewed.
              </p>
            </div>
          </div>
          <Button size="sm" variant="primary" onClick={handleEdit}>Update License</Button>
        </div>
      )}

      {/* Main Grid Details */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column (2 Cols): Details Cards */}
        <div className="lg:col-span-2 space-y-6">
          {/* Medical License Details */}
          <Card className="rounded-2xl shadow-sm border border-slate-200">
            <CardHeader className="bg-slate-50/50 border-b border-slate-100 flex justify-between items-center py-4 px-6">
              <div className="flex items-center gap-2">
                <span className="text-lg">🏥</span>
                <h2 className="text-base font-bold text-slate-900">Medical Licensing & Regulatory Details</h2>
              </div>
              <Badge status={customer.medicalApproved ? 'Approved' : 'Pending'}>
                {customer.medicalApproved ? 'Medical Approved' : 'Pending Approval'}
              </Badge>
            </CardHeader>
            <CardBody className="p-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-100">
                  <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">License Number</label>
                  <p className="text-lg font-bold text-slate-900 mt-1 font-mono">{customer.licenseNo || 'N/A'}</p>
                </div>
                <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-100">
                  <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">License Facility Type</label>
                  <p className="text-lg font-semibold text-slate-900 mt-1">{customer.licenseType || 'Pharmacy / Healthcare'}</p>
                </div>
                <div className={`p-3.5 rounded-xl border ${isExpired ? 'bg-red-50/70 border-red-200' : 'bg-slate-50 border-slate-100'}`}>
                  <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">License Expiry Date</label>
                  <p className={`text-lg font-bold mt-1 ${isExpired ? 'text-red-700' : 'text-slate-900'}`}>
                    {expiryDate ? expiryDate.toLocaleDateString() : 'N/A'}
                  </p>
                  {daysRemaining !== null && (
                    <p className={`text-xs mt-0.5 font-medium ${isExpired ? 'text-red-600' : 'text-emerald-600'}`}>
                      {isExpired ? `Expired ${Math.abs(daysRemaining)} days ago` : `${daysRemaining} days remaining`}
                    </p>
                  )}
                </div>
                <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-100">
                  <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Regulatory Approval Status</label>
                  <p className="text-lg font-semibold text-slate-900 mt-1">
                    {customer.medicalApproved ? '✓ Fully Verified & Approved' : '⏳ Pending Medical Compliance'}
                  </p>
                </div>
              </div>
            </CardBody>
          </Card>

          {/* Basic & Contact Information */}
          <Card className="rounded-2xl shadow-sm border border-slate-200">
            <CardHeader className="bg-slate-50/50 border-b border-slate-100 py-4 px-6">
              <h2 className="text-base font-bold text-slate-900">Institution & Contact Profile</h2>
            </CardHeader>
            <CardBody className="p-6 space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div>
                  <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">Company / Institution</label>
                  <p className="text-base font-semibold text-slate-900 mt-1">{customer.companyName}</p>
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">Contact Person</label>
                  <p className="text-base font-medium text-slate-900 mt-1">{customer.contactPerson || 'N/A'}</p>
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">Phone Number</label>
                  <p className="text-base font-medium text-slate-900 mt-1 font-mono">{customer.phone}</p>
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">Email Address</label>
                  <p className="text-base font-medium text-slate-900 mt-1">{customer.email || 'N/A'}</p>
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">Tax Identification Number (TIN)</label>
                  <p className="text-base font-mono font-medium text-slate-900 mt-1">{customer.tin || 'N/A'}</p>
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">Physical Location / Address</label>
                  <p className="text-base font-medium text-slate-900 mt-1">{customer.location || 'N/A'}</p>
                </div>
              </div>
            </CardBody>
          </Card>

          {/* Sales Agreements Table */}
          <Card className="rounded-2xl shadow-sm border border-slate-200">
            <CardHeader className="bg-slate-50/50 border-b border-slate-100 flex items-center justify-between py-4 px-6">
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-slate-900">Sales Agreements</h3>
                <span className="text-xs bg-slate-200 text-slate-700 px-2 py-0.5 rounded-full font-medium">{agreements.length}</span>
              </div>
              <Link
                href={`/dashboard/sales/agreements/new?customerId=${customer.id}`}
                className="text-xs bg-blue-600 text-white px-3 py-1.5 rounded-lg hover:bg-blue-700 font-semibold transition-colors"
              >
                + New Agreement
              </Link>
            </CardHeader>
            <CardBody className="p-0">
              {loadingAgreements ? (
                <div className="p-6 text-center text-slate-500 text-sm">Loading agreements...</div>
              ) : agreements.length === 0 ? (
                <div className="p-6 text-center text-slate-400 text-sm">No sales agreements found for this customer.</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm border-collapse">
                    <thead>
                      <tr className="bg-slate-50/80 border-b border-slate-200 text-xs font-semibold text-slate-600 uppercase text-left">
                        <th className="px-4 py-3">Agreement No</th>
                        <th className="px-4 py-3">Division</th>
                        <th className="px-4 py-3">Total Amount</th>
                        <th className="px-4 py-3">Valid Period</th>
                        <th className="px-4 py-3">Status</th>
                        <th className="px-4 py-3 text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {agreements.map((a: any) => (
                        <tr key={a.id} className="hover:bg-slate-50/60 transition-colors">
                          <td className="px-4 py-3 font-semibold text-slate-900 font-mono">{a.agreementNo}</td>
                          <td className="px-4 py-3 text-slate-700">{a.division}</td>
                          <td className="px-4 py-3 text-slate-900 font-medium">ETB {Number(a.totalAmount || 0).toLocaleString('en-US')}</td>
                          <td className="px-4 py-3 text-slate-600 text-xs">
                            {a.validFrom ? new Date(a.validFrom).toLocaleDateString() : '-'} to {a.validTo ? new Date(a.validTo).toLocaleDateString() : '-'}
                          </td>
                          <td className="px-4 py-3">
                            <Badge status={a.status === 'Active' || a.status === 'Approved' ? 'Active' : 'Pending'}>
                              {a.status}
                            </Badge>
                          </td>
                          <td className="px-4 py-3 text-right">
                            <Link href={`/dashboard/sales/agreements/${a.id}`} className="text-blue-600 hover:underline text-xs font-semibold">View</Link>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardBody>
          </Card>

          {/* Related Sales Orders */}
          <Card className="rounded-2xl shadow-sm border border-slate-200">
            <CardHeader className="bg-slate-50/50 border-b border-slate-100 flex items-center justify-between py-4 px-6">
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-slate-900">Recent Sales Orders</h3>
                <span className="text-xs bg-slate-200 text-slate-700 px-2 py-0.5 rounded-full font-medium">{salesOrders.length}</span>
              </div>
              <Link
                href={`/dashboard/sales/orders/new`}
                className="text-xs bg-blue-600 text-white px-3 py-1.5 rounded-lg hover:bg-blue-700 font-semibold transition-colors"
              >
                + Create Order
              </Link>
            </CardHeader>
            <CardBody className="p-0">
              {loadingSalesOrders ? (
                <div className="p-6 text-center text-slate-500 text-sm">Loading sales orders...</div>
              ) : salesOrders.length === 0 ? (
                <div className="p-6 text-center text-slate-400 text-sm">No sales orders found for this customer.</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm border-collapse">
                    <thead>
                      <tr className="bg-slate-50/80 border-b border-slate-200 text-xs font-semibold text-slate-600 uppercase text-left">
                        <th className="px-4 py-3">Order No</th>
                        <th className="px-4 py-3">Date</th>
                        <th className="px-4 py-3">Total Amount</th>
                        <th className="px-4 py-3">Status</th>
                        <th className="px-4 py-3 text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {salesOrders.map((so: any) => (
                        <tr key={so.id} className="hover:bg-slate-50/60 transition-colors">
                          <td className="px-4 py-3 font-semibold text-slate-900 font-mono">{so.orderNo}</td>
                          <td className="px-4 py-3 text-slate-600 text-xs">{so.orderDate ? new Date(so.orderDate).toLocaleDateString() : '-'}</td>
                          <td className="px-4 py-3 text-slate-900 font-medium">ETB {Number(so.totalAmount || 0).toLocaleString('en-US')}</td>
                          <td className="px-4 py-3">
                            <Badge status={so.status === 'Delivered' || so.status === 'Approved' ? 'Active' : 'Pending'}>
                              {so.status}
                            </Badge>
                          </td>
                          <td className="px-4 py-3 text-right">
                            <Link href={`/dashboard/sales/orders/${so.id}`} className="text-blue-600 hover:underline text-xs font-semibold">View</Link>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardBody>
          </Card>
        </div>

        {/* Right Column: Financial & Document Sidebar */}
        <div className="space-y-6">
          {/* Financial Overview Card */}
          <Card className="rounded-2xl shadow-sm border border-slate-200">
            <CardHeader className="bg-slate-50/50 border-b border-slate-100 py-4 px-6">
              <h3 className="text-base font-bold text-slate-900">Financial Terms</h3>
            </CardHeader>
            <CardBody className="p-6 space-y-4">
              <div>
                <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">Credit Limit</label>
                <p className="text-xl font-bold text-slate-900 mt-1">
                  ETB {Number(customer.creditLimit || 0).toLocaleString('en-US')}
                </p>
              </div>
              <div className="pt-3 border-t border-slate-100">
                <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">Credit Terms</label>
                <p className="text-base font-semibold text-slate-800 mt-0.5">
                  {customer.creditTermDays ? `${customer.creditTermDays} Days` : 'Cash / Immediate'}
                </p>
              </div>
              <div className="pt-3 border-t border-slate-100">
                <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">Withholding Tax</label>
                <p className="text-base font-semibold text-slate-800 mt-0.5">
                  {customer.withholding ? `Applicable (${customer.withholdRate || 2}%)` : 'Not Applicable (0%)'}
                </p>
              </div>
            </CardBody>
          </Card>

          {/* Uploaded License Documents */}
          <Card className="rounded-2xl shadow-sm border border-slate-200">
            <CardHeader className="bg-slate-50/50 border-b border-slate-100 py-4 px-6 flex justify-between items-center">
              <h3 className="text-base font-bold text-slate-900">License Documents</h3>
              <span className="text-xs text-slate-500 font-medium">{documents.length} file{documents.length !== 1 ? 's' : ''}</span>
            </CardHeader>
            <CardBody className="p-6">
              {loadingDocuments ? (
                <p className="text-xs text-slate-400 text-center py-2">Loading documents...</p>
              ) : documents.length === 0 ? (
                <div className="text-center py-4 text-slate-400">
                  <span className="text-2xl block mb-1">📄</span>
                  <p className="text-xs">No license documents attached.</p>
                </div>
              ) : (
                <div className="space-y-2.5">
                  {documents.map((doc: any, i: number) => (
                    <div key={i} className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span className="text-lg">📄</span>
                        <div className="min-w-0">
                          <p className="text-xs font-semibold text-slate-800 truncate">{doc.fileName || doc.title || `Document ${i + 1}`}</p>
                          <p className="text-[10px] text-slate-400">{doc.docType || 'License'}</p>
                        </div>
                      </div>
                      {doc.filePath && (
                        <a
                          href={doc.filePath}
                          target="_blank"
                          rel="noreferrer"
                          className="text-xs font-semibold text-blue-600 hover:text-blue-800 ml-2 flex-shrink-0"
                        >
                          View
                        </a>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardBody>
          </Card>

          {/* Medical Purchase Requests */}
          <Card className="rounded-2xl shadow-sm border border-slate-200">
            <CardHeader className="bg-slate-50/50 border-b border-slate-100 py-4 px-6 flex justify-between items-center">
              <h3 className="text-base font-bold text-slate-900">Medical Requests</h3>
              <Link href={`/dashboard/medical/requests/new`} className="text-xs font-semibold text-blue-600 hover:underline">
                + New
              </Link>
            </CardHeader>
            <CardBody className="p-6">
              {loadingRequests ? (
                <p className="text-xs text-slate-400 text-center py-2">Loading requests...</p>
              ) : requests.length === 0 ? (
                <p className="text-xs text-slate-400 text-center py-2">No medical requests.</p>
              ) : (
                <div className="space-y-2">
                  {requests.map((r: any) => (
                    <div key={r.id} className="p-2.5 rounded-lg border border-slate-100 bg-slate-50 flex items-center justify-between text-xs">
                      <div>
                        <span className="font-semibold text-slate-900 block font-mono">{r.requestNo}</span>
                        <span className="text-[10px] text-slate-500">{r.requestDate ? new Date(r.requestDate).toLocaleDateString() : ''}</span>
                      </div>
                      <Badge status={r.status === 'Approved' ? 'Active' : 'Pending'}>{r.status}</Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardBody>
          </Card>
        </div>
      </div>
    </div>
  );
}


