'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ExternalLink } from 'lucide-react';
import { Card, CardBody, CardHeader, Button, Badge, Input, Select } from '@/components/ui';
import { Table } from '@/components/ui';
import type { ColumnDef } from '@/components/ui';
import {
  SourceReferenceBadgeList,
  SourceModuleBadge,
} from '@/components/finance/SourceReferenceLink';
import { getPayeeLink } from '@/lib/source-reference-helper';

interface PaymentVoucher {
  id: string;
  voucherNo: string;
  voucherType: 'PAYMENT' | 'RECEIPT' | 'REFUND';
  sourceModule: string;
  sourceId?: string;
  sourceRef?: string;
  payeeType?: string;
  payeeId?: string;
  payeeName: string;
  amount: number;
  paymentMethod: 'cash' | 'bank_transfer' | 'check';
  status: 'Draft' | 'Pending_Approval' | 'Approved' | 'Posted' | 'Rejected';
  createdAt: string;
  voucherDate: string;
}

export default function VouchersPage() {
  const router = useRouter();
  const [vouchers, setVouchers] = useState<PaymentVoucher[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [pagination, setPagination] = useState({ pages: 1, total: 0 });
  const [voucherTypeFilter, setVoucherTypeFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const pageSize = 10;

  useEffect(() => {
    fetchVouchers();
  }, [currentPage, voucherTypeFilter, statusFilter, searchTerm]);

  const fetchVouchers = async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: pageSize.toString(),
      });

      if (voucherTypeFilter) params.append('voucherType', voucherTypeFilter);
      if (statusFilter) params.append('status', statusFilter);
      if (searchTerm) params.append('search', searchTerm);

      const response = await fetch(`/api/finance/vouchers?${params}`);
      if (!response.ok) throw new Error('Failed to fetch vouchers');

      const result = await response.json();
      setVouchers(result.data || []);
      setPagination(result.pagination || { pages: 1, total: 0 });
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string, voucherNo: string) => {
    if (!confirm(`Are you sure you want to delete voucher "${voucherNo}"?`)) return;
    try {
      const res = await fetch(`/api/finance/vouchers/${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (res.ok && data.success) {
        alert('Voucher deleted successfully');
        fetchVouchers();
      } else {
        alert(data.error || 'Failed to delete voucher');
      }
    } catch {
      alert('Error deleting voucher');
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Draft':
        return 'Draft';
      case 'Pending_Approval':
        return 'Pending';
      case 'Approved':
        return 'Approved';
      case 'Posted':
        return 'Active';
      case 'Rejected':
        return 'Rejected';
      default:
        return status;
    }
  };

  const getBadgeColor = (type: string) => {
    switch (type) {
      case 'PAYMENT':
        return '#007AFF';
      case 'RECEIPT':
        return '#34C759';
      case 'REFUND':
        return '#FF9500';
      default:
        return '#8E8E93';
    }
  };

  const columns: ColumnDef<PaymentVoucher>[] = [
    { header: 'Voucher No', accessor: 'voucherNo', sortable: true },
    {
      header: 'Type',
      accessor: 'voucherType',
      render: (type) => {
        const statusMap: Record<string, any> = {
          'PAYMENT': 'InProgress',
          'RECEIPT': 'Approved',
          'REFUND': 'Pending'
        };
        return (
          <Badge status={statusMap[type] || 'Pending'}>
            {type}
          </Badge>
        );
      },
    },
    { header: 'Source', accessor: 'sourceModule' },
    { header: 'Payee', accessor: 'payeeName' },
    {
      header: 'Amount',
      accessor: 'amount',
      render: (amount) => <span className="font-semibold">{formatCurrency(Number(amount))}</span>,
    },
    { header: 'Method', accessor: 'paymentMethod' },
    {
      header: 'Status',
      accessor: 'status',
      render: (status) => <Badge status={getStatusColor(status)}>{status}</Badge>,
    },
    {
      header: 'Date',
      accessor: 'voucherDate',
      render: (date) => {
        try {
          return new Date(date).toLocaleDateString();
        } catch {
          return 'N/A';
        }
      },
    },
    {
      header: 'Actions',
      accessor: 'id',
      render: (id, row) => (
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="secondary"
            onClick={() => router.push(`/dashboard/finance/vouchers/${id}`)}
          >
            View
          </Button>
          <Button
            size="sm"
            variant="danger"
            onClick={() => handleDelete(String(id), row.voucherNo)}
          >
            Delete
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex flex-wrap gap-3 items-center justify-between">
        <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-[#1D1D1F]">Payment Vouchers</h1>
        <Link href="/dashboard/finance/vouchers/new">
          <Button variant="primary" size="lg">
            + New Voucher
          </Button>
        </Link>
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-2 overflow-x-auto pb-2">
        <Button
          variant={voucherTypeFilter === '' ? 'primary' : 'secondary'}
          size="sm"
          onClick={() => {
            setVoucherTypeFilter('');
            setCurrentPage(1);
          }}
        >
          All
        </Button>
        <Button
          variant={voucherTypeFilter === 'PAYMENT' ? 'primary' : 'secondary'}
          size="sm"
          onClick={() => {
            setVoucherTypeFilter('PAYMENT');
            setCurrentPage(1);
          }}
        >
          Payment
        </Button>
        <Button
          variant={voucherTypeFilter === 'RECEIPT' ? 'primary' : 'secondary'}
          size="sm"
          onClick={() => {
            setVoucherTypeFilter('RECEIPT');
            setCurrentPage(1);
          }}
        >
          Receipt
        </Button>
        <Button
          variant={voucherTypeFilter === 'REFUND' ? 'primary' : 'secondary'}
          size="sm"
          onClick={() => {
            setVoucherTypeFilter('REFUND');
            setCurrentPage(1);
          }}
        >
          Refund
        </Button>
      </div>

      {/* Search and Status Filter */}
      <Card>
        <CardBody>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Input
              placeholder="Search by voucher no or payee..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
            />
            <Select
              options={[
                { value: '', label: 'All Statuses' },
                { value: 'Draft', label: 'Draft' },
                { value: 'Pending_Approval', label: 'Pending Approval' },
                { value: 'Approved', label: 'Approved' },
                { value: 'Posted', label: 'Posted' },
                { value: 'Rejected', label: 'Rejected' },
              ]}
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setCurrentPage(1);
              }}
            />
            <div className="flex items-center justify-end">
              <span className="text-sm text-[#86868B]">
                {loading ? 'Loading...' : `${vouchers.length} of ${pagination.total} vouchers`}
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
              <div className="text-[#86868B]">Loading vouchers...</div>
            </div>
          ) : vouchers.length === 0 ? (
            <div className="flex justify-center items-center h-64">
              <div className="text-[#86868B]">No vouchers found</div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-[#D2D2D7]">
                    {columns.map((col) => (
                      <th
                        key={String(col.accessor)}
                        className="px-4 py-3 text-left text-sm font-semibold text-[#86868B]"
                      >
                        {col.header}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {vouchers.map((voucher) => (
                    <tr
                      key={voucher.id}
                      className="border-b border-[#F5F5F7] hover:bg-[#F5F5F7]/50 cursor-pointer transition-colors"
                      onClick={() => router.push(`/dashboard/finance/vouchers/${voucher.id}`)}
                    >
                      <td className="px-4 py-3 text-sm text-[#1D1D1F]">{voucher.voucherNo}</td>
                      <td className="px-4 py-3 text-sm">
                        {(() => {
                          const statusMap: Record<string, any> = {
                            'PAYMENT': 'InProgress',
                            'RECEIPT': 'Approved',
                            'REFUND': 'Pending'
                          };
                          return (
                            <Badge status={statusMap[voucher.voucherType] || 'Pending'}>
                              {voucher.voucherType}
                            </Badge>
                          );
                        })()}
                      </td>
                      <td className="px-4 py-3 text-sm" onClick={(e) => e.stopPropagation()}>
                        <div className="flex flex-col gap-1 items-start">
                          <SourceModuleBadge sourceModule={voucher.sourceModule} />
                          {voucher.sourceRef && (
                            <SourceReferenceBadgeList
                              sourceModule={voucher.sourceModule}
                              sourceId={voucher.sourceId}
                              sourceRef={voucher.sourceRef}
                              size="sm"
                            />
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm text-[#1D1D1F]" onClick={(e) => e.stopPropagation()}>
                        {(() => {
                          const payeeUrl = getPayeeLink(voucher.payeeType, voucher.payeeId);
                          if (payeeUrl) {
                            return (
                              <Link
                                href={payeeUrl}
                                className="font-medium text-blue-600 hover:text-blue-800 hover:underline inline-flex items-center gap-1 group"
                                title={`View ${voucher.payeeName}`}
                              >
                                <span>{voucher.payeeName}</span>
                                <ExternalLink className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                              </Link>
                            );
                          }
                          return <span>{voucher.payeeName}</span>;
                        })()}
                      </td>
                      <td className="px-4 py-3 text-sm font-semibold text-[#1D1D1F]">
                        {formatCurrency(voucher.amount)}
                      </td>
                      <td className="px-4 py-3 text-sm text-[#1D1D1F]">{voucher.paymentMethod}</td>
                      <td className="px-4 py-3 text-sm">
                        <Badge status={getStatusColor(voucher.status)}>{voucher.status}</Badge>
                      </td>
                      <td className="px-4 py-3 text-sm text-[#86868B]">
                        {(() => {
                          try {
                            return new Date(voucher.voucherDate).toLocaleDateString();
                          } catch {
                            return 'N/A';
                          }
                        })()}
                      </td>
                      <td className="px-4 py-3 text-sm" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center gap-2">
                          <Button
                            size="sm"
                            variant="secondary"
                            onClick={() => router.push(`/dashboard/finance/vouchers/${voucher.id}`)}
                          >
                            View
                          </Button>
                          <Button
                            size="sm"
                            variant="danger"
                            onClick={() => handleDelete(voucher.id, voucher.voucherNo)}
                          >
                            Delete
                          </Button>
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
