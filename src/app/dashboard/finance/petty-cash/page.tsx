'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Card, CardBody, CardHeader, Button, Badge, Input, Select } from '@/components/ui';

interface PettyCashRecord {
  id: string;
  voucherNo: string;
  type: string;
  cashierId: string | null;
  cashierName: string;
  amount: number;
  category: string | null;
  description: string | null;
  refNo: string | null;
  status: string;
  transactionDate: string;
  createdAt: string;
}

interface Summary {
  totalAllocated: number;
  totalExpenses: number;
  totalReturns: number;
  currentBalance: number;
}

export default function PettyCashPage() {
  const router = useRouter();
  const [records, setRecords] = useState<PettyCashRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [pagination, setPagination] = useState({ pages: 1, total: 0 });
  const [typeFilter, setTypeFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [summary, setSummary] = useState<Summary>({
    totalAllocated: 0,
    totalExpenses: 0,
    totalReturns: 0,
    currentBalance: 0,
  });
  const pageSize = 10;

  useEffect(() => {
    fetchRecords();
  }, [currentPage, typeFilter, statusFilter, searchTerm]);

  const fetchRecords = async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: pageSize.toString(),
      });

      if (typeFilter) params.append('type', typeFilter);
      if (statusFilter) params.append('status', statusFilter);
      if (searchTerm) params.append('search', searchTerm);

      const response = await fetch(`/api/finance/petty-cash?${params}`);
      if (!response.ok) throw new Error('Failed to fetch petty cash records');

      const result = await response.json();
      setRecords(result.data || []);
      setPagination(result.pagination || { pages: 1, total: 0 });
      if (result.summary) {
        setSummary(result.summary);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return amount.toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Pending':
        return 'Pending';
      case 'Approved':
        return 'Approved';
      case 'Posted':
        return 'Active';
      case 'Cancelled':
        return 'Rejected';
      default:
        return status;
    }
  };

  const getTypeBadge = (type: string) => {
    const statusMap: Record<string, string> = {
      'FUND_ALLOCATION': 'Approved',
      'EXPENSE': 'InProgress',
      'REPLENISHMENT': 'Pending',
      'RETURN': 'Draft',
    };
    const labelMap: Record<string, string> = {
      'FUND_ALLOCATION': 'Fund Allocation',
      'EXPENSE': 'Expense',
      'REPLENISHMENT': 'Replenishment',
      'RETURN': 'Return',
    };
    return (
      <Badge status={statusMap[type] || 'Pending'}>
        {labelMap[type] || type}
      </Badge>
    );
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex flex-wrap gap-3 items-center justify-between">
        <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-[#1D1D1F]">Petty Cash</h1>
        <Link href="/dashboard/finance/petty-cash/new">
          <Button variant="primary" size="lg">
            + New Transaction
          </Button>
        </Link>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardBody>
            <div className="text-center">
              <p className="text-sm text-[#86868B] mb-1">Total Fund Allocated</p>
              <p className="text-2xl font-bold text-[#34C759]">
                {formatCurrency(summary.totalAllocated)} <span className="text-sm font-normal">ETB</span>
              </p>
            </div>
          </CardBody>
        </Card>
        <Card>
          <CardBody>
            <div className="text-center">
              <p className="text-sm text-[#86868B] mb-1">Total Expenses</p>
              <p className="text-2xl font-bold text-[#FF3B30]">
                {formatCurrency(summary.totalExpenses)} <span className="text-sm font-normal">ETB</span>
              </p>
            </div>
          </CardBody>
        </Card>
        <Card>
          <CardBody>
            <div className="text-center">
              <p className="text-sm text-[#86868B] mb-1">Current Balance</p>
              <p className="text-2xl font-bold text-[#007AFF]">
                {formatCurrency(summary.currentBalance)} <span className="text-sm font-normal">ETB</span>
              </p>
            </div>
          </CardBody>
        </Card>
      </div>

      {/* Type Filter Tabs */}
      <div className="flex gap-2 overflow-x-auto pb-2">
        <Button
          variant={typeFilter === '' ? 'primary' : 'secondary'}
          size="sm"
          onClick={() => {
            setTypeFilter('');
            setCurrentPage(1);
          }}
        >
          All
        </Button>
        <Button
          variant={typeFilter === 'FUND_ALLOCATION' ? 'primary' : 'secondary'}
          size="sm"
          onClick={() => {
            setTypeFilter('FUND_ALLOCATION');
            setCurrentPage(1);
          }}
        >
          Fund Allocation
        </Button>
        <Button
          variant={typeFilter === 'EXPENSE' ? 'primary' : 'secondary'}
          size="sm"
          onClick={() => {
            setTypeFilter('EXPENSE');
            setCurrentPage(1);
          }}
        >
          Expense
        </Button>
        <Button
          variant={typeFilter === 'REPLENISHMENT' ? 'primary' : 'secondary'}
          size="sm"
          onClick={() => {
            setTypeFilter('REPLENISHMENT');
            setCurrentPage(1);
          }}
        >
          Replenishment
        </Button>
      </div>

      {/* Search and Status Filter */}
      <Card>
        <CardBody>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Input
              placeholder="Search by voucher no, cashier, or description..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
            />
            <Select
              options={[
                { value: '', label: 'All Statuses' },
                { value: 'Pending', label: 'Pending' },
                { value: 'Approved', label: 'Approved' },
                { value: 'Posted', label: 'Posted' },
              ]}
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setCurrentPage(1);
              }}
            />
            <div className="flex items-center justify-end">
              <span className="text-sm text-[#86868B]">
                {loading ? 'Loading...' : `${records.length} of ${pagination.total} records`}
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
              <div className="text-[#86868B]">Loading petty cash records...</div>
            </div>
          ) : records.length === 0 ? (
            <div className="flex justify-center items-center h-64">
              <div className="text-[#86868B]">No petty cash records found</div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-[#D2D2D7]">
                    <th className="px-4 py-3 text-left text-sm font-semibold text-[#86868B]">Voucher No</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-[#86868B]">Date</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-[#86868B]">Type</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-[#86868B]">Cashier</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-[#86868B]">Category</th>
                    <th className="px-4 py-3 text-right text-sm font-semibold text-[#86868B]">Amount</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-[#86868B]">Description</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-[#86868B]">Status</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-[#86868B]">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {records.map((record) => (
                    <tr
                      key={record.id}
                      className="border-b border-[#F5F5F7] hover:bg-[#F5F5F7]/50 cursor-pointer transition-colors"
                      onClick={() => router.push(`/dashboard/finance/petty-cash/${record.id}`)}
                    >
                      <td className="px-4 py-3 text-sm font-semibold text-[#1D1D1F]">
                        {record.voucherNo}
                      </td>
                      <td className="px-4 py-3 text-sm text-[#86868B]">
                        {new Date(record.transactionDate).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-3 text-sm">
                        {getTypeBadge(record.type)}
                      </td>
                      <td className="px-4 py-3 text-sm text-[#1D1D1F]">
                        {record.cashierName}
                      </td>
                      <td className="px-4 py-3 text-sm text-[#1D1D1F]">
                        {record.category || '-'}
                      </td>
                      <td className="px-4 py-3 text-sm font-semibold text-right text-[#1D1D1F]">
                        {formatCurrency(record.amount)} ETB
                      </td>
                      <td className="px-4 py-3 text-sm text-[#86868B] max-w-[200px] truncate">
                        {record.description || '-'}
                      </td>
                      <td className="px-4 py-3 text-sm">
                        <Badge status={getStatusColor(record.status)}>{record.status}</Badge>
                      </td>
                      <td className="px-4 py-3 text-sm" onClick={(e) => e.stopPropagation()}>
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => router.push(`/dashboard/finance/petty-cash/${record.id}`)}
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
