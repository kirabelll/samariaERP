'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Card, CardHeader, CardBody, Button, Badge } from '@/components/ui';
import { useRouter } from 'next/navigation';
import { Plus, Eye, ChevronLeft, ChevronRight, Trash2 } from 'lucide-react';

interface StoreIssue {
  id: string;
  issueNo: string;
  customerId: string;
  customer?: {
    companyName: string;
    code: string;
    licenseNo?: string;
  };
  items: string;
  totalAmount: number;
  issuedBy?: string;
  status: string;
  createdAt: string;
}

export default function MedicalStoreIssues() {
  const router = useRouter();
  const [issues, setIssues] = useState<StoreIssue[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0, pages: 1 });

  const fetchIssues = async (page = 1) => {
    try {
      setLoading(true);
      const params = new URLSearchParams({ page: page.toString(), limit: '20' });
      if (statusFilter) params.append('status', statusFilter);

      const response = await fetch(`/api/medical/store-issues?${params}`);
      const data = await response.json();

      if (data.success) {
        setIssues(data.data || []);
        if (data.pagination) {
          setPagination(data.pagination);
        }
      } else {
        setIssues([]);
      }
    } catch (error) {
      console.error('Error fetching store issues:', error);
      setIssues([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchIssues();
  }, [statusFilter]);

  const getItemsCount = (items: string): number => {
    try {
      const parsed = typeof items === 'string' ? JSON.parse(items) : items;
      return Array.isArray(parsed) ? parsed.length : 0;
    } catch {
      return 0;
    }
  };

  const statusColor = (status: string) => {
    switch (status) {
      case 'Draft':
        return 'bg-[#86868B]/10 text-[#86868B]';
      case 'Issued':
      case 'Pending':
        return 'bg-[#FF9500]/10 text-[#C93400]';
      case 'Delivered':
        return 'bg-[#34C759]/10 text-[#248A3D]';
      case 'Cancelled':
        return 'bg-[#FF3B30]/10 text-[#D70015]';
      default:
        return 'bg-[#007AFF]/10 text-[#0055D4]';
    }
  };

  const totalIssues = pagination.total;
  const deliveredCount = issues.filter(i => i.status === 'Delivered').length;
  const draftCount = issues.filter(i => i.status === 'Draft').length;

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-[#86868B]">
        <Link href="/dashboard" className="text-[#007AFF] hover:text-[#0055D4]">Dashboard</Link>
        <span>/</span>
        <Link href="/dashboard/medical" className="text-[#007AFF] hover:text-[#0055D4]">Medical</Link>
        <span>/</span>
        <span className="text-[#1D1D1F] font-medium">Store Issues</span>
      </div>

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-[#1D1D1F]">Store Issues</h1>
          <p className="text-[#86868B] mt-1">Medical store issue records</p>
        </div>
        <Link href="/dashboard/medical/store-issues/new">
          <Button variant="primary" size="lg" className="flex items-center gap-2">
            <Plus className="w-5 h-5" />
            New Issue
          </Button>
        </Link>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="rounded-2xl">
          <CardBody className="text-center">
            <p className="text-4xl font-bold text-[#007AFF]">{totalIssues}</p>
            <p className="text-sm text-[#86868B] mt-1">Total Issues</p>
          </CardBody>
        </Card>
        <Card className="rounded-2xl">
          <CardBody className="text-center">
            <p className="text-4xl font-bold text-[#34C759]">{deliveredCount}</p>
            <p className="text-sm text-[#86868B] mt-1">Delivered</p>
          </CardBody>
        </Card>
        <Card className="rounded-2xl">
          <CardBody className="text-center">
            <p className="text-4xl font-bold text-[#FF9500]">{draftCount}</p>
            <p className="text-sm text-[#86868B] mt-1">Drafts</p>
          </CardBody>
        </Card>
      </div>

      {/* Filters */}
      <Card className="rounded-2xl">
        <CardBody className="flex gap-3">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-4 py-2.5 rounded-xl border border-[#D2D2D7] focus:ring-2 focus:ring-[#007AFF] focus:border-transparent bg-white"
          >
            <option value="">All Status</option>
            <option value="Draft">Draft</option>
            <option value="Issued">Issued</option>
            <option value="Delivered">Delivered</option>
            <option value="Cancelled">Cancelled</option>
          </select>
        </CardBody>
      </Card>

      {/* Table */}
      <Card className="rounded-2xl">
        <CardHeader>
          <h2 className="text-lg font-semibold text-[#1D1D1F]">Store Issues List</h2>
        </CardHeader>
        <CardBody>
          {loading ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#007AFF] mx-auto"></div>
              <p className="text-[#86868B] mt-4">Loading store issues...</p>
            </div>
          ) : issues.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-[#86868B]">No store issues found</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-[#D2D2D7]">
                    <th className="text-left py-3 px-4 text-sm font-semibold text-[#86868B]">Issue No</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-[#86868B]">Customer</th>
                    <th className="text-right py-3 px-4 text-sm font-semibold text-[#86868B]">Items</th>
                    <th className="text-right py-3 px-4 text-sm font-semibold text-[#86868B]">Amount (ETB)</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-[#86868B]">Issued By</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-[#86868B]">Status</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-[#86868B]">Date</th>
                    <th className="text-center py-3 px-4 text-sm font-semibold text-[#86868B]">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {issues.map((issue) => (
                    <tr key={issue.id} className="border-b border-[#F5F5F7] hover:bg-[#F5F5F7]/50 transition-colors">
                      <td className="py-3 px-4 font-medium text-[#1D1D1F]">{issue.issueNo}</td>
                      <td className="py-3 px-4">
                        <div>
                          <p className="font-medium text-[#1D1D1F]">{issue.customer?.companyName || '-'}</p>
                          {issue.customer?.licenseNo && (
                            <p className="text-xs text-[#86868B]">License: {issue.customer.licenseNo}</p>
                          )}
                        </div>
                      </td>
                      <td className="py-3 px-4 text-right text-[#1D1D1F]">{getItemsCount(issue.items)}</td>
                      <td className="py-3 px-4 text-right font-medium text-[#1D1D1F]">
                        {(issue.totalAmount ?? 0).toLocaleString('en-US')}
                      </td>
                      <td className="py-3 px-4 text-[#86868B]">{issue.issuedBy || '-'}</td>
                      <td className="py-3 px-4">
                        <span className={`inline-block px-3 py-1 rounded-full text-xs font-semibold ${statusColor(issue.status)}`}>
                          {issue.status}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-sm text-[#86868B]">
                        {new Date(issue.createdAt).toLocaleDateString()}
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex gap-2 justify-center">
                          <button
                            onClick={() => router.push(`/dashboard/medical/store-issues/${issue.id}`)}
                            className="p-2 hover:bg-[#007AFF]/10 rounded-lg transition-colors"
                            title="View"
                          >
                            <Eye className="w-4 h-4 text-[#007AFF]" />
                          </button>
                          <button
                            onClick={async () => {
                              if (
                                !window.confirm(
                                  `Are you sure you want to delete Store Issue "${issue.issueNo}"?\n\nThis will restore the deducted inventory batches back to available stock.`
                                )
                              ) {
                                return;
                              }
                              try {
                                const res = await fetch(`/api/medical/store-issues/${issue.id}`, { method: 'DELETE' });
                                const result = await res.json();
                                if (!res.ok || !result.success) {
                                  throw new Error(result.error || 'Failed to delete store issue');
                                }
                                alert(result.message || 'Store issue deleted successfully and batch quantities restored.');
                                fetchIssues(pagination.page);
                              } catch (err: any) {
                                alert(err.message || 'Failed to delete store issue');
                              }
                            }}
                            className="p-2 hover:bg-red-50 text-red-600 rounded-lg transition-colors"
                            title="Delete"
                          >
                            <Trash2 className="w-4 h-4" />
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
          <p className="text-sm text-[#86868B]">
            Showing {(pagination.page - 1) * pagination.limit + 1} to{' '}
            {Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total}
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => fetchIssues(pagination.page - 1)}
              disabled={pagination.page === 1}
              className="p-2 rounded-lg border border-[#D2D2D7] hover:bg-[#F5F5F7] disabled:opacity-50"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <button
              onClick={() => fetchIssues(pagination.page + 1)}
              disabled={pagination.page === pagination.pages}
              className="p-2 rounded-lg border border-[#D2D2D7] hover:bg-[#F5F5F7] disabled:opacity-50"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
