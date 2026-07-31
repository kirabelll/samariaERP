'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Card, CardHeader, CardBody, Button } from '@/components/ui';
import { ChevronLeft, ChevronRight, Plus, Eye, Trash2 } from 'lucide-react';

interface SupplierPayment {
  id: string;
  paymentNo: string;
  supplierId: string;
  supplier: {
    companyName: string;
  };
  purchaseOrderId?: string | null;
  purchaseOrder?: {
    orderNo: string;
  } | null;
  amount: number;
  paymentMethod: string;
  bankName?: string | null;
  status: string;
  paymentDate: string;
}

export default function SupplierPaymentsPage() {
  const router = useRouter();
  const [payments, setPayments] = useState<SupplierPayment[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0, pages: 1 });

  const fetchPayments = async (page = 1) => {
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: pagination.limit.toString(),
      });

      if (search) params.append('search', search);
      if (statusFilter) params.append('status', statusFilter);

      const response = await fetch(`/api/purchasing/payments?${params}`);
      const data = await response.json();

      if (data.success) {
        setPayments(data.data || []);
        setPagination({
          page: data.pagination.page,
          limit: data.pagination.limit,
          total: data.pagination.total,
          pages: data.pagination.pages,
        });
      } else {
        setPayments([]);
      }
    } catch (error) {
      console.error('Error fetching payments:', error);
      setPayments([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPayments(pagination.page);
  }, []);

  const handleSearch = () => {
    setPagination({ ...pagination, page: 1 });
    fetchPayments(1);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this payment?')) return;

    try {
      const response = await fetch(`/api/purchasing/payments/${id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        fetchPayments(pagination.page);
        alert('Payment deleted successfully');
      } else {
        alert('Failed to delete payment');
      }
    } catch (error) {
      console.error('Error deleting payment:', error);
      alert('Error deleting payment');
    }
  };

  const statusColor = (status: string) => {
    switch (status) {
      case 'Pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'Approved':
        return 'bg-blue-100 text-blue-800';
      case 'Paid':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const methodLabel = (method: string) => {
    const methods: { [key: string]: string } = {
      cash: 'Cash',
      bank_transfer: 'Bank Transfer',
      check: 'Check',
    };
    return methods[method] || method;
  };

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-slate-600">
        <Link href="/dashboard" className="text-blue-600 hover:text-blue-800">
          Dashboard
        </Link>
        <span>/</span>
        <span className="text-slate-900 font-medium">Supplier Payments</span>
      </div>

      {/* Page Header */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Supplier Payments</h1>
          <p className="text-slate-600 mt-2">Manage supplier payment records</p>
        </div>
        <Link href="/dashboard/purchasing/payments/new">
          <Button variant="primary" size="lg" className="flex items-center gap-2">
            <Plus className="w-5 h-5" />
            New Payment
          </Button>
        </Link>
      </div>

      {/* Filters */}
      <Card>
        <CardBody className="flex gap-3">
          <input
            type="text"
            placeholder="Search by payment no or supplier..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="flex-1 px-4 py-2.5 rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-4 py-2.5 rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="">All Status</option>
            <option value="Pending">Pending</option>
            <option value="Approved">Approved</option>
            <option value="Paid">Paid</option>
          </select>
          <Button variant="primary" onClick={handleSearch}>
            Search
          </Button>
        </CardBody>
      </Card>

      {/* Payments Table */}
      <Card>
        <CardBody>
          {loading ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
              <p className="text-slate-600 mt-4">Loading payments...</p>
            </div>
          ) : payments.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-slate-600">No supplier payments found</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-3 px-4 text-sm font-semibold text-slate-900">Payment No</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-slate-900">Supplier</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-slate-900">PO No</th>
                    <th className="text-right py-3 px-4 text-sm font-semibold text-slate-900">Amount (ETB)</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-slate-900">Method</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-slate-900">Bank</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-slate-900">Status</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-slate-900">Date</th>
                    <th className="text-center py-3 px-4 text-sm font-semibold text-slate-900">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {payments.map((payment) => (
                    <tr key={payment.id} className="border-b hover:bg-slate-50 transition-colors">
                      <td className="py-3 px-4">
                        <span className="font-medium text-slate-900">{payment.paymentNo}</span>
                      </td>
                      <td className="py-3 px-4 text-slate-700">{payment.supplier.companyName}</td>
                      <td className="py-3 px-4 text-slate-700">{payment.purchaseOrder?.orderNo || '-'}</td>
                      <td className="py-3 px-4 text-right font-medium text-slate-900">
                        {payment.amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                      <td className="py-3 px-4 text-slate-700">{methodLabel(payment.paymentMethod)}</td>
                      <td className="py-3 px-4 text-slate-700">{payment.bankName || '-'}</td>
                      <td className="py-3 px-4">
                        <div className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${statusColor(payment.status)}`}>
                          {payment.status}
                        </div>
                      </td>
                      <td className="py-3 px-4 text-slate-700 text-sm">
                        {new Date(payment.paymentDate).toLocaleDateString()}
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex gap-2 justify-center">
                          <button
                            onClick={() => router.push(`/dashboard/purchasing/payments/${payment.id}`)}
                            className="p-2 hover:bg-blue-100 rounded-lg transition-colors"
                            title="View"
                          >
                            <Eye className="w-4 h-4 text-blue-600" />
                          </button>
                          <button
                            onClick={() => handleDelete(payment.id)}
                            className="p-2 hover:bg-red-100 rounded-lg transition-colors"
                            title="Delete"
                          >
                            <Trash2 className="w-4 h-4 text-red-600" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardBody>
      </Card>

      {/* Pagination */}
      {!loading && pagination.pages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-slate-600">
            Showing {payments.length > 0 ? (pagination.page - 1) * pagination.limit + 1 : 0} to{' '}
            {Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total} results
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => fetchPayments(pagination.page - 1)}
              disabled={pagination.page === 1}
              className="p-2 rounded-lg border border-slate-300 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <div className="flex gap-1">
              {Array.from({ length: pagination.pages }, (_, i) => i + 1).map((page) => (
                <button
                  key={page}
                  onClick={() => fetchPayments(page)}
                  className={`px-3 py-2 rounded-lg text-sm font-medium ${
                    pagination.page === page
                      ? 'bg-blue-600 text-white'
                      : 'border border-slate-300 hover:bg-slate-50'
                  }`}
                >
                  {page}
                </button>
              ))}
            </div>
            <button
              onClick={() => fetchPayments(pagination.page + 1)}
              disabled={pagination.page === pagination.pages}
              className="p-2 rounded-lg border border-slate-300 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
