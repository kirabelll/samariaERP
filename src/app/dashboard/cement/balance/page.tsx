'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Card, CardHeader, CardBody, Button, Badge, Table } from '@/components/ui';
import { useI18n } from '@/lib/i18n';

interface CementBalanceItem {
  id: string;
  purchaseId: string;
  factoryId: string;
  initialQty: number;
  liftedQty: number;
  remainingQty: number;
  lastUpdated: string;
  purchase?: {
    purchaseNo: string;
    cementType?: string;
    unitPrice?: number;
    status?: string;
  };
  factory?: {
    name: string;
  };
}

interface ApiResponse {
  success: boolean;
  data: CementBalanceItem[];
  pagination?: {
    total: number;
    page: number;
    limit: number;
    pages: number;
  };
}

export default function FactoryCementBalance() {
  const { t } = useI18n();
  const [balances, setBalances] = useState<CementBalanceItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchBalances = async () => {
      try {
        setLoading(true);
        setError(null);
        const response = await fetch('/api/cement/balance');

        if (!response.ok) throw new Error(`API error: ${response.status}`);

        const result: ApiResponse = await response.json();
        const items = result.data || [];
        setBalances(items);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch balance data');
        setBalances([]);
      } finally {
        setLoading(false);
      }
    };

    fetchBalances();
  }, []);

  const getUtilization = (lifted: number, initial: number) => {
    if (!initial || initial <= 0) return 0;
    return Math.round((lifted / initial) * 100);
  };

  const getStatusColor = (remaining: number, initial: number) => {
    if (!initial || initial <= 0) return '#86868B';
    const percentage = (remaining / initial) * 100;
    if (percentage > 50) return '#34C759';
    if (percentage >= 10) return '#FFCC00';
    return '#FF3B30';
  };

  const getStatusBadge = (remaining: number, initial: number) => {
    if (!initial || initial <= 0) return <Badge status="Pending">N/A</Badge>;
    const percentage = (remaining / initial) * 100;
    if (percentage > 50) return <Badge status="Completed">High Stock</Badge>;
    if (percentage >= 10) return <Badge status="InProgress">Medium Stock</Badge>;
    if (percentage > 0) return <Badge status="Rejected">Low Stock</Badge>;
    return <Badge status="Rejected">Exhausted</Badge>;
  };

  const formatDate = (dateString: string) => {
    try {
      const d = new Date(dateString);
      return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    } catch { return dateString; }
  };

  const totalBalance = balances.reduce((sum, b) => sum + b.remainingQty, 0);
  const totalInitial = balances.reduce((sum, b) => sum + b.initialQty, 0);
  const totalLifted = balances.reduce((sum, b) => sum + b.liftedQty, 0);

  const columns = [
    {
      header: 'Factory',
      accessor: 'factoryName' as const,
      render: (_val: any, row: CementBalanceItem) => (
        <span className="font-medium text-gray-900">{row.factory?.name || 'Unknown'}</span>
      ),
    },
    {
      header: 'Purchase',
      accessor: 'purchaseNo' as const,
      render: (_val: any, row: CementBalanceItem) => row.purchase?.purchaseNo ? (
        <Link href={`/dashboard/cement/purchases/${row.purchaseId}`} className="text-blue-600 hover:underline text-sm font-medium">
          {row.purchase.purchaseNo}
        </Link>
      ) : '-',
    },
    {
      header: 'Cement Type',
      accessor: 'cementType' as const,
      render: (_val: any, row: CementBalanceItem) => (
        <span className="text-sm">{row.purchase?.cementType || '-'}</span>
      ),
    },
    {
      header: 'Initial (tons)',
      accessor: 'initialQty' as const,
      render: (val: number) => (val ?? 0).toLocaleString('en-US'),
    },
    {
      header: 'Lifted (tons)',
      accessor: 'liftedQty' as const,
      render: (val: number) => (val ?? 0).toLocaleString('en-US'),
    },
    {
      header: 'Remaining (tons)',
      accessor: 'remainingQty' as const,
      render: (val: number, row: CementBalanceItem) => (
        <div className="flex items-center gap-2">
          <span className="font-semibold" style={{ color: getStatusColor(val, row.initialQty) }}>
            {(val ?? 0).toLocaleString('en-US')}
          </span>
          {getStatusBadge(val ?? 0, row.initialQty ?? 0)}
        </div>
      ),
    },
    {
      header: 'Utilization',
      accessor: 'utilization' as const,
      render: (_val: any, row: CementBalanceItem) => {
        const pct = getUtilization(row.liftedQty, row.initialQty);
        return (
          <div className="flex items-center gap-2 min-w-[100px]">
            <div className="flex-1 bg-gray-200 rounded-full h-2">
              <div
                className="h-2 rounded-full transition-all"
                style={{
                  width: `${Math.min(pct, 100)}%`,
                  backgroundColor: pct > 90 ? '#FF3B30' : pct > 50 ? '#FFCC00' : '#34C759',
                }}
              />
            </div>
            <span className="text-xs font-medium text-gray-600 w-10 text-right">{pct}%</span>
          </div>
        );
      },
    },
    {
      header: 'Last Updated',
      accessor: 'lastUpdated' as const,
      render: (val: string) => <span className="text-xs text-gray-500">{formatDate(val)}</span>,
    },
  ];

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <Link href="/dashboard/cement" className="text-blue-600 hover:text-blue-800 text-sm font-medium">
            &larr; Back to Cement Operations
          </Link>
          <h1 className="text-3xl font-bold text-gray-900 mt-4">Factory Cement Balance</h1>
          <p className="text-gray-600 mt-1">Monitor remaining cement stock across factories</p>
        </div>
        <Card><CardBody className="text-center"><p className="text-gray-600">Loading balance data...</p></CardBody></Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div>
          <Link href="/dashboard/cement" className="text-blue-600 hover:text-blue-800 text-sm font-medium">
            &larr; Back to Cement Operations
          </Link>
          <h1 className="text-3xl font-bold text-gray-900 mt-4">Factory Cement Balance</h1>
          <p className="text-gray-600 mt-1">Monitor remaining cement stock across factories</p>
        </div>
        <Card><CardBody className="text-center"><p className="text-red-600">Error: {error}</p></CardBody></Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <Link href="/dashboard/cement" className="text-blue-600 hover:text-blue-800 text-sm font-medium">
          &larr; Back to Cement Operations
        </Link>
        <h1 className="text-3xl font-bold text-gray-900 mt-4">Factory Cement Balance</h1>
        <p className="text-gray-600 mt-1">Monitor remaining cement stock across factories</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardBody className="text-center">
            <p className="text-4xl font-bold" style={{ color: '#007AFF' }}>
              {(totalBalance ?? 0).toLocaleString('en-US')}
            </p>
            <p className="text-sm text-gray-600 mt-1">Total Remaining (tons)</p>
          </CardBody>
        </Card>
        <Card>
          <CardBody className="text-center">
            <p className="text-4xl font-bold" style={{ color: '#34C759' }}>
              {(totalInitial ?? 0).toLocaleString('en-US')}
            </p>
            <p className="text-sm text-gray-600 mt-1">Total Purchased (tons)</p>
          </CardBody>
        </Card>
        <Card>
          <CardBody className="text-center">
            <p className="text-4xl font-bold" style={{ color: '#FF9500' }}>
              {(totalLifted ?? 0).toLocaleString('en-US')}
            </p>
            <p className="text-sm text-gray-600 mt-1">Total Lifted (tons)</p>
          </CardBody>
        </Card>
      </div>

      {/* Factory Cards */}
      {balances.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {balances.map((balance) => {
            const pct = getUtilization(balance.liftedQty, balance.initialQty);
            return (
              <Card key={balance.id}>
                <CardBody>
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <p className="font-semibold text-gray-900">{balance.factory?.name || 'Unknown Factory'}</p>
                      {balance.purchase?.purchaseNo && (
                        <Link
                          href={`/dashboard/cement/purchases/${balance.purchaseId}`}
                          className="text-xs text-blue-600 hover:underline"
                        >
                          {balance.purchase.purchaseNo}
                        </Link>
                      )}
                    </div>
                    {getStatusBadge(balance.remainingQty, balance.initialQty)}
                  </div>

                  {balance.purchase?.cementType && (
                    <p className="text-xs text-gray-500 mb-3">{balance.purchase.cementType}</p>
                  )}

                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">Remaining:</span>
                      <span className="font-bold" style={{ color: getStatusColor(balance.remainingQty, balance.initialQty) }}>
                        {balance.remainingQty.toLocaleString('en-US')} tons
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2.5">
                      <div
                        className="h-2.5 rounded-full transition-all"
                        style={{
                          width: `${Math.max(100 - pct, 0)}%`,
                          backgroundColor: getStatusColor(balance.remainingQty, balance.initialQty),
                        }}
                      />
                    </div>
                    <div className="flex justify-between text-xs text-gray-500">
                      <span>Lifted: {balance.liftedQty.toLocaleString('en-US')}t ({pct}%)</span>
                      <span>of {balance.initialQty.toLocaleString('en-US')}t</span>
                    </div>
                    <p className="text-[10px] text-gray-400 mt-1">
                      Updated: {formatDate(balance.lastUpdated)}
                    </p>
                  </div>
                </CardBody>
              </Card>
            );
          })}
        </div>
      )}

      {/* Full Table */}
      <Card>
        <CardHeader>
          <h2 className="text-lg font-semibold text-gray-900">Detailed Balance Register</h2>
        </CardHeader>
        <CardBody>
          <Table data={balances} columns={columns} emptyMessage="No balance records found. Balances are auto-created when liftings are marked as Delivered." />
        </CardBody>
      </Card>
    </div>
  );
}
