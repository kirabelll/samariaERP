'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Card, CardBody, CardHeader, Button, Badge, Input } from '@/components/ui';

interface CustomerDeposit {
  id: string;
  depositNo: string;
  customerName: string;
  amount: number;
  depositMethod: 'cash' | 'bank_transfer' | 'check';
  appliedAmount: number;
  unappliedAmount: number;
  status: 'Draft' | 'Confirmed' | 'Partial' | 'Fully_Applied';
  createdAt: string;
  customer: { companyName: string; code: string };
}

export default function DepositsPage() {
  const router = useRouter();
  const [deposits, setDeposits] = useState<CustomerDeposit[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [pagination, setPagination] = useState({ pages: 1, total: 0 });
  const [searchTerm, setSearchTerm] = useState('');
  const pageSize = 10;

  useEffect(() => {
    fetchDeposits();
  }, [currentPage, searchTerm]);

  const fetchDeposits = async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: pageSize.toString(),
      });

      if (searchTerm) params.append('search', searchTerm);

      const response = await fetch(`/api/finance/deposits?${params}`);
      if (!response.ok) throw new Error('Failed to fetch deposits');

      const result = await response.json();
      setDeposits(result.data || []);
      setPagination(result.pagination || { pages: 1, total: 0 });
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'ETB',
    }).format(amount);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Draft':
        return 'Draft';
      case 'Confirmed':
        return 'Approved';
      case 'Partial':
        return 'Pending';
      case 'Fully_Applied':
        return 'Active';
      default:
        return status;
    }
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex flex-wrap gap-3 items-center justify-between">
        <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-[#1D1D1F]">Customer Deposits</h1>
        <Link href="/dashboard/finance/deposits/new">
          <Button variant="primary" size="lg">
            + New Deposit
          </Button>
        </Link>
      </div>

      {/* Search */}
      <Card>
        <CardBody>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Input
              placeholder="Search by deposit no or customer..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
            />
            <div className="flex items-center justify-end">
              <span className="text-sm text-[#86868B]">
                {loading ? 'Loading...' : `${deposits.length} of ${pagination.total} deposits`}
              </span>
            </div>
          </div>
        </CardBody>
      </Card>

      {/* Table */}
      <Card>
        <CardBody>
          {error && (
            <div className="bg-[#FF3B30]/10 border border-[#FF3B30] rounded-xl p-4 mb-4 text-[#D70015]">
              Error: {error}
            </div>
          )}
          {loading ? (
            <div className="flex justify-center items-center h-64">
              <div className="text-[#86868B]">Loading deposits...</div>
            </div>
          ) : deposits.length === 0 ? (
            <div className="flex justify-center items-center h-64">
              <div className="text-[#86868B]">No deposits found</div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-[#D2D2D7]">
                    <th className="px-4 py-3 text-left text-sm font-semibold text-[#86868B]">
                      Deposit No
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-[#86868B]">
                      Customer
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-[#86868B]">
                      Amount
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-[#86868B]">
                      Method
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-[#86868B]">
                      Applied
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-[#86868B]">
                      Unapplied
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-[#86868B]">
                      Status
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-[#86868B]">
                      Date
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-[#86868B]">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {deposits.map((deposit) => (
                    <tr
                      key={deposit.id}
                      className="border-b border-[#F5F5F7] hover:bg-[#F5F5F7]/50 cursor-pointer transition-colors"
                      onClick={() => router.push(`/dashboard/finance/deposits/${deposit.id}`)}
                    >
                      <td className="px-4 py-3 text-sm font-semibold text-[#1D1D1F]">
                        {deposit.depositNo}
                      </td>
                      <td className="px-4 py-3 text-sm text-[#1D1D1F]">{deposit.customer?.companyName}</td>
                      <td className="px-4 py-3 text-sm font-semibold text-[#1D1D1F]">
                        {formatCurrency(deposit.amount)}
                      </td>
                      <td className="px-4 py-3 text-sm text-[#1D1D1F]">{deposit.depositMethod}</td>
                      <td className="px-4 py-3 text-sm text-[#34C759] font-semibold">
                        {formatCurrency(deposit.appliedAmount)}
                      </td>
                      <td className="px-4 py-3 text-sm text-[#FF9500] font-semibold">
                        {formatCurrency(deposit.unappliedAmount)}
                      </td>
                      <td className="px-4 py-3 text-sm">
                        <Badge status={getStatusColor(deposit.status)}>{deposit.status}</Badge>
                      </td>
                      <td className="px-4 py-3 text-sm text-[#86868B]">
                        {new Date(deposit.createdAt).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-3 text-sm" onClick={(e) => e.stopPropagation()}>
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => router.push(`/dashboard/finance/deposits/${deposit.id}`)}
                        >
                          View
                        </Button>
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
      {pagination.pages > 1 && (
        <Card>
          <CardBody>
            <div className="flex justify-center items-center gap-2">
              <Button
                variant="secondary"
                size="sm"
                disabled={currentPage === 1}
                onClick={() => setCurrentPage(currentPage - 1)}
              >
                Previous
              </Button>
              <span className="text-sm text-[#86868B]">
                Page {currentPage} of {pagination.pages}
              </span>
              <Button
                variant="secondary"
                size="sm"
                disabled={currentPage === pagination.pages}
                onClick={() => setCurrentPage(currentPage + 1)}
              >
                Next
              </Button>
            </div>
          </CardBody>
        </Card>
      )}
    </div>
  );
}
