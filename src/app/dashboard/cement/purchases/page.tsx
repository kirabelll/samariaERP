'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Card, CardBody, Button } from '@/components/ui';
import { Plus, Eye, ChevronLeft, ChevronRight } from 'lucide-react';

interface CementPurchase {
  id: string;
  purchaseNo: string;
  factoryId: string;
  factory?: {
    name: string;
  };
  cementType: string;
  quantityTons: number;
  unitPrice: number;
  totalAmount: number;
  balanceRemaining: number;
  status: string;
  paymentRef?: string;
  paymentDate?: string;
  createdAt: string;
}

export default function CementPurchasesPage() {
  const router = useRouter();
  const [purchases, setPurchases] = useState<CementPurchase[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0, pages: 1 });

  const fetchPurchases = async (page = 1) => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: page.toString(),
        limit: pagination.limit.toString(),
      });

      if (search) params.append('search', search);
      if (statusFilter) params.append('status', statusFilter);

      const response = await fetch(`/api/cement/purchases?${params}`);
      const data = await response.json();

      if (data.success) {
        setPurchases(data.data || []);
        if (data.pagination) {
          setPagination({
            page: data.pagination.page,
            limit: data.pagination.limit,
            total: data.pagination.total,
            pages: data.pagination.pages,
          });
        }
      } else {
        setPurchases([]);
      }
    } catch (error) {
      console.error('Error fetching cement purchases:', error);
      setPurchases([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPurchases();
  }, []);

  const handleSearch = () => {
    fetchPurchases(1);
  };

  const statusColor = (status: string) => {
    switch (status) {
      case 'Active':
        return 'bg-[#34C759]/10 text-[#248A3D]';
      case 'Exhausted':
        return 'bg-[#86868B]/10 text-[#86868B]';
      case 'Cancelled':
        return 'bg-[#FF3B30]/10 text-[#D70015]';
      default:
        return 'bg-[#007AFF]/10 text-[#0055D4]';
    }
  };

  // Summary stats
  const totalPurchases = purchases.length;
  const totalTons = purchases.reduce((sum, p) => sum + (p.quantityTons || 0), 0);
  const totalValue = purchases.reduce((sum, p) => sum + (p.totalAmount || 0), 0);
  const activePurchases = purchases.filter(p => p.status === 'Active').length;

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-[#86868B]">
        <Link href="/dashboard" className="text-[#007AFF] hover:text-[#0055D4]">
          Dashboard
        </Link>
        <span>/</span>
        <span className="text-[#1D1D1F] font-medium">Cement Purchases</span>
      </div>

      {/* Page Header */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold text-[#1D1D1F]">Cement Purchases</h1>
          <p className="text-[#86868B] mt-2">Manage cement purchase orders and balances</p>
        </div>
        <Link href="/dashboard/cement/purchases/new">
          <Button variant="primary" size="lg" className="flex items-center gap-2">
            <Plus className="w-5 h-5" />
            New Purchase
          </Button>
        </Link>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="rounded-2xl">
          <CardBody>
            <p className="text-xs font-medium text-[#86868B] uppercase tracking-wider mb-2">Total Purchases</p>
            <p className="text-3xl font-bold text-[#1D1D1F]">{pagination.total || totalPurchases}</p>
          </CardBody>
        </Card>
        <Card className="rounded-2xl">
          <CardBody>
            <p className="text-xs font-medium text-[#86868B] uppercase tracking-wider mb-2">Active</p>
            <p className="text-3xl font-bold text-[#34C759]">{activePurchases}</p>
          </CardBody>
        </Card>
        <Card className="rounded-2xl">
          <CardBody>
            <p className="text-xs font-medium text-[#86868B] uppercase tracking-wider mb-2">Total Quantity</p>
            <p className="text-3xl font-bold text-[#007AFF]">{(totalTons ?? 0).toLocaleString('en-US')} T</p>
          </CardBody>
        </Card>
        <Card className="rounded-2xl">
          <CardBody>
            <p className="text-xs font-medium text-[#86868B] uppercase tracking-wider mb-2">Total Value</p>
            <p className="text-3xl font-bold text-[#1D1D1F]">ETB {(totalValue ?? 0).toLocaleString('en-US')}</p>
          </CardBody>
        </Card>
      </div>

      {/* Filters */}
      <Card className="rounded-2xl">
        <CardBody className="flex gap-3">
          <input
            type="text"
            placeholder="Search by purchase no or factory..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            className="flex-1 px-4 py-2.5 rounded-xl border border-[#D2D2D7] focus:ring-2 focus:ring-[#007AFF] focus:border-transparent bg-white"
          />
          <select
            value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value); setTimeout(() => fetchPurchases(1), 0); }}
            className="px-4 py-2.5 rounded-xl border border-[#D2D2D7] focus:ring-2 focus:ring-[#007AFF] focus:border-transparent bg-white"
          >
            <option value="">All Status</option>
            <option value="Active">Active</option>
            <option value="Exhausted">Exhausted</option>
            <option value="Cancelled">Cancelled</option>
          </select>
          <Button variant="primary" onClick={handleSearch}>Search</Button>
        </CardBody>
      </Card>

      {/* Table */}
      <Card className="rounded-2xl">
        <CardBody>
          {loading ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#007AFF] mx-auto"></div>
              <p className="text-[#86868B] mt-4">Loading purchases...</p>
            </div>
          ) : purchases.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-[#86868B]">No cement purchases found</p>
              <Link href="/dashboard/cement/purchases/new">
                <Button variant="primary" className="mt-4">Create First Purchase</Button>
              </Link>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-[#D2D2D7]">
                    <th className="text-left py-3 px-4 text-sm font-semibold text-[#86868B]">Purchase No</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-[#86868B]">Factory</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-[#86868B]">Type</th>
                    <th className="text-right py-3 px-4 text-sm font-semibold text-[#86868B]">Qty (T)</th>
                    <th className="text-right py-3 px-4 text-sm font-semibold text-[#86868B]">Unit Price</th>
                    <th className="text-right py-3 px-4 text-sm font-semibold text-[#86868B]">Total (ETB)</th>
                    <th className="text-right py-3 px-4 text-sm font-semibold text-[#86868B]">Balance</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-[#86868B]">Status</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-[#86868B]">Date</th>
                    <th className="text-center py-3 px-4 text-sm font-semibold text-[#86868B]">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {purchases.map((purchase) => (
                    <tr key={purchase.id} className="border-b border-[#F5F5F7] hover:bg-[#F5F5F7]/50 transition-colors">
                      <td className="py-3 px-4">
                        <span className="font-medium text-[#1D1D1F]">{purchase.purchaseNo}</span>
                      </td>
                      <td className="py-3 px-4 text-[#1D1D1F]">{purchase.factory?.name || '-'}</td>
                      <td className="py-3 px-4 text-[#1D1D1F]">{purchase.cementType}</td>
                      <td className="py-3 px-4 text-right font-medium text-[#1D1D1F]">
                        {((purchase.quantityTons ?? 0) || 0).toLocaleString('en-US')}
                      </td>
                      <td className="py-3 px-4 text-right text-[#1D1D1F]">
                        {((purchase.unitPrice ?? 0) || 0).toLocaleString('en-US')}
                      </td>
                      <td className="py-3 px-4 text-right font-medium text-[#1D1D1F]">
                        {((purchase.totalAmount ?? 0) || 0).toLocaleString('en-US')}
                      </td>
                      <td className="py-3 px-4 text-right font-medium text-[#007AFF]">
                        {((purchase.balanceRemaining ?? 0) || 0).toLocaleString('en-US')} T
                      </td>
                      <td className="py-3 px-4">
                        <span className={`inline-block px-3 py-1 rounded-full text-xs font-semibold ${statusColor(purchase.status)}`}>
                          {purchase.status}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-sm text-[#86868B]">
                        {new Date(purchase.createdAt).toLocaleDateString()}
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex gap-2 justify-center">
                          <button
                            onClick={() => router.push(`/dashboard/cement/purchases/${purchase.id}`)}
                            className="p-2 hover:bg-[#007AFF]/10 rounded-lg transition-colors"
                            title="View"
                          >
                            <Eye className="w-4 h-4 text-[#007AFF]" />
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
            Showing {purchases.length > 0 ? (pagination.page - 1) * pagination.limit + 1 : 0} to{' '}
            {Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total} results
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => fetchPurchases(pagination.page - 1)}
              disabled={pagination.page === 1}
              className="p-2 rounded-lg border border-[#D2D2D7] hover:bg-[#F5F5F7] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <div className="flex gap-1">
              {Array.from({ length: Math.min(pagination.pages, 5) }, (_, i) => i + 1).map((page) => (
                <button
                  key={page}
                  onClick={() => fetchPurchases(page)}
                  className={`px-3 py-2 rounded-lg text-sm font-medium ${
                    pagination.page === page
                      ? 'bg-[#007AFF] text-white'
                      : 'border border-[#D2D2D7] hover:bg-[#F5F5F7]'
                  }`}
                >
                  {page}
                </button>
              ))}
            </div>
            <button
              onClick={() => fetchPurchases(pagination.page + 1)}
              disabled={pagination.page === pagination.pages}
              className="p-2 rounded-lg border border-[#D2D2D7] hover:bg-[#F5F5F7] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
