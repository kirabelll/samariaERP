'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Card, CardHeader, CardBody, Button, Badge, Select, Table } from '@/components/ui';
import { useI18n } from '@/lib/i18n';
import { useRouter } from 'next/navigation';

interface StockAdjustment {
  id: string;
  adjustmentNo: string;
  itemId: string;
  batchId: string | null;
  warehouse: string;
  adjustmentType: string;
  previousQty: number;
  newQty: number;
  difference: number;
  reason: string;
  approvedBy: string | null;
  adjustedBy: string | null;
  adjustmentDate: string;
  createdAt: string;
}

interface ApiResponse {
  success: boolean;
  data: StockAdjustment[];
  pagination?: {
    total: number;
    page: number;
    limit: number;
    pages: number;
  };
}

export default function StockAdjustments() {
  const { t } = useI18n();
  const router = useRouter();
  const [adjustments, setAdjustments] = useState<StockAdjustment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [adjustmentTypeFilter, setAdjustmentTypeFilter] = useState('');

  useEffect(() => {
    fetchAdjustments();
  }, []);

  const fetchAdjustments = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch('/api/medical/stock-adjustments');

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }

      const result: ApiResponse = await response.json();
      const items = result.data || [];
      setAdjustments(items);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch stock adjustments');
      setAdjustments([]);
    } finally {
      setLoading(false);
    }
  };

  const filteredAdjustments = adjustments.filter((adj) => {
    if (adjustmentTypeFilter && adj.adjustmentType !== adjustmentTypeFilter) return false;
    return true;
  });

  const totalReduced = filteredAdjustments
    .filter((a) => a.difference < 0)
    .reduce((sum, a) => sum + Math.abs(a.difference), 0);

  const totalIncreased = filteredAdjustments
    .filter((a) => a.difference > 0)
    .reduce((sum, a) => sum + a.difference, 0);

  const getTypeBadge = (type: string) => {
    const badgeConfig: Record<string, { status: string; label: string }> = {
      PHYSICAL_COUNT: { status: 'InProgress', label: 'Physical Count' },
      DAMAGE: { status: 'Rejected', label: 'Damage' },
      EXPIRY: { status: 'Rejected', label: 'Expiry' },
      RETURN: { status: 'Completed', label: 'Return' },
      TRANSFER: { status: 'InProgress', label: 'Transfer' },
      WRITE_OFF: { status: 'Rejected', label: 'Write-off' },
    };
    const config = badgeConfig[type] || { status: 'Pending', label: type };
    return <Badge status={config.status}>{config.label}</Badge>;
  };

  const formatDate = (dateString: string) => {
    try {
      return new Date(dateString).toLocaleDateString();
    } catch {
      return dateString;
    }
  };

  const columns = [
    { header: 'Adjustment No', accessor: 'adjustmentNo' as const },
    { header: 'Item ID', accessor: 'itemId' as const },
    { header: 'Warehouse', accessor: 'warehouse' as const },
    {
      header: 'Type',
      accessor: 'adjustmentType' as const,
      render: (type: string) => getTypeBadge(type),
    },
    {
      header: 'Previous Qty',
      accessor: 'previousQty' as const,
      render: (val: number) => val.toLocaleString('en-US'),
    },
    {
      header: 'New Qty',
      accessor: 'newQty' as const,
      render: (val: number) => val.toLocaleString('en-US'),
    },
    {
      header: 'Difference',
      accessor: 'difference' as const,
      render: (val: number) => (
        <span style={{ color: val < 0 ? '#FF3B30' : '#34C759', fontWeight: 600 }}>
          {val > 0 ? '+' : ''}{val.toLocaleString('en-US')}
        </span>
      ),
    },
    { header: 'Reason', accessor: 'reason' as const },
    {
      header: 'Date',
      accessor: 'adjustmentDate' as const,
      render: (val: string) => formatDate(val),
    },
  ];

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <Link
            href="/dashboard/medical"
            className="text-blue-600 hover:text-blue-800 text-sm font-medium"
          >
            &larr; Back to Medical Operations
          </Link>
          <h1 className="text-3xl font-bold text-gray-900 mt-4">Stock Adjustments</h1>
          <p className="text-gray-600 mt-1">Medical stock adjustment records</p>
        </div>
        <Card>
          <CardBody className="text-center">
            <p className="text-gray-600">Loading stock adjustments...</p>
          </CardBody>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div>
          <Link
            href="/dashboard/medical"
            className="text-blue-600 hover:text-blue-800 text-sm font-medium"
          >
            &larr; Back to Medical Operations
          </Link>
          <h1 className="text-3xl font-bold text-gray-900 mt-4">Stock Adjustments</h1>
          <p className="text-gray-600 mt-1">Medical stock adjustment records</p>
        </div>
        <Card>
          <CardBody className="text-center">
            <p className="text-red-600">Error: {error}</p>
            <Button variant="outline" className="mt-3" onClick={fetchAdjustments}>
              Retry
            </Button>
          </CardBody>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <Link
            href="/dashboard/medical"
            className="text-blue-600 hover:text-blue-800 text-sm font-medium"
          >
            &larr; Back to Medical Operations
          </Link>
          <h1 className="text-3xl font-bold text-gray-900 mt-4">Stock Adjustments</h1>
          <p className="text-gray-600 mt-1">Medical stock adjustment records</p>
        </div>
        <Button
          variant="primary"
          size="lg"
          onClick={() => router.push('/dashboard/medical/stock-adjustments/new')}
        >
          + New Adjustment
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardBody className="text-center">
            <p className="text-4xl font-bold" style={{ color: '#007AFF' }}>
              {filteredAdjustments.length}
            </p>
            <p className="text-sm text-gray-600 mt-1">Total Adjustments</p>
          </CardBody>
        </Card>
        <Card>
          <CardBody className="text-center">
            <p className="text-4xl font-bold" style={{ color: '#FF3B30' }}>
              {totalReduced.toLocaleString('en-US')}
            </p>
            <p className="text-sm text-gray-600 mt-1">Total Qty Reduced</p>
          </CardBody>
        </Card>
        <Card>
          <CardBody className="text-center">
            <p className="text-4xl font-bold" style={{ color: '#34C759' }}>
              {totalIncreased.toLocaleString('en-US')}
            </p>
            <p className="text-sm text-gray-600 mt-1">Total Qty Increased</p>
          </CardBody>
        </Card>
      </div>

      {/* Filter */}
      <Card>
        <CardBody>
          <Select
            label="Filter by Adjustment Type"
            value={adjustmentTypeFilter}
            onChange={(e) => setAdjustmentTypeFilter(e.target.value)}
            options={[
              { label: 'All Types', value: '' },
              { label: 'Physical Count', value: 'PHYSICAL_COUNT' },
              { label: 'Damage', value: 'DAMAGE' },
              { label: 'Expiry', value: 'EXPIRY' },
              { label: 'Return', value: 'RETURN' },
              { label: 'Transfer', value: 'TRANSFER' },
              { label: 'Write-off', value: 'WRITE_OFF' },
            ]}
          />
        </CardBody>
      </Card>

      {/* Table */}
      <Card>
        <CardHeader>
          <h2 className="text-lg font-semibold text-gray-900">
            Adjustments ({filteredAdjustments.length})
          </h2>
        </CardHeader>
        <CardBody>
          <Table data={filteredAdjustments} columns={columns} emptyMessage="No adjustments found" />
        </CardBody>
      </Card>
    </div>
  );
}
